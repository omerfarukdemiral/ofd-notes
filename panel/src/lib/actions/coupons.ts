"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { COUPON_TRIGGERS, DISCOUNT_TYPES } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { fail, fromZodError, ok, type ActionState } from "./types";

const PATH = "/panel/kuponlar";

/** Karışması kolay karakterler (0/O, 1/I) çıkarıldı — kupon elle yazılabilir. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}

const couponSchema = z
  .object({
    title: z.string().min(3, "Başlık en az 3 karakter olmalı."),
    description: z.string().max(500).optional(),
    codePrefix: z
      .string()
      .min(2, "Ön ek en az 2 karakter olmalı.")
      .max(12, "Ön ek en fazla 12 karakter olabilir.")
      .regex(/^[A-Za-z0-9-]+$/, "Yalnızca harf, rakam ve tire kullanın."),
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: z.coerce.number().int().min(1),
    trigger: z.enum(COUPON_TRIGGERS),
    validUntil: z.union([z.coerce.date(), z.literal("")]),
    issueLimit: z.union([z.coerce.number().int().min(1), z.literal("")]),
  })
  .refine(
    (data) => data.discountType !== "PERCENT" || data.discountValue <= 100,
    { message: "Yüzde indirim 100'den büyük olamaz.", path: ["discountValue"] },
  );

export async function createCouponAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = couponSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    codePrefix: formData.get("codePrefix"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    trigger: formData.get("trigger"),
    validUntil: formData.get("validUntil") === "" ? "" : formData.get("validUntil"),
    issueLimit: formData.get("issueLimit") === "" ? "" : formData.get("issueLimit"),
  });

  if (!parsed.success) return fromZodError(parsed.error);
  const data = parsed.data;

  const coupon = await prisma.coupon.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      codePrefix: data.codePrefix.toUpperCase(),
      discountType: data.discountType,
      discountValue: data.discountValue,
      trigger: data.trigger,
      validUntil: data.validUntil === "" ? null : data.validUntil,
      issueLimit: data.issueLimit === "" ? null : data.issueLimit,
    },
  });

  await recordAudit({
    actorId: session.userId,
    action: "coupon.create",
    entity: "Coupon",
    entityId: coupon.id,
    meta: { title: coupon.title },
  });

  revalidatePath(PATH);
  return ok(`"${coupon.title}" kuponu oluşturuldu.`);
}

export async function toggleCouponAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) return;

  await prisma.coupon.update({
    where: { id },
    data: { isActive: !coupon.isActive },
  });

  await recordAudit({
    actorId: session.userId,
    action: coupon.isActive ? "coupon.disable" : "coupon.enable",
    entity: "Coupon",
    entityId: id,
  });

  revalidatePath(PATH);
}

const issueSchema = z.object({
  couponId: z.string().min(1, "Kupon seçin."),
  email: z.email("Geçerli bir e-posta girin."),
});

export async function issueCouponAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = issueSchema.safeParse({
    couponId: formData.get("couponId"),
    email: formData.get("email"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const { couponId, email } = parsed.data;

  const [coupon, user] = await Promise.all([
    prisma.coupon.findUnique({
      where: { id: couponId },
      include: { _count: { select: { issued: true } } },
    }),
    prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } }),
  ]);

  if (!coupon) return fail("Kupon bulunamadı.");
  if (!coupon.isActive) return fail("Bu kupon pasif durumda.");
  if (!user) {
    return fail("Bu e-postayla kayıtlı üye yok.", {
      email: "Üye bulunamadı.",
    });
  }
  if (coupon.issueLimit !== null && coupon._count.issued >= coupon.issueLimit) {
    return fail("Bu kupon için tanımlı dağıtım limiti dolmuş.");
  }

  const existing = await prisma.userCoupon.findFirst({
    where: { couponId, userId: user.id },
  });
  if (existing) {
    return fail(`${user.fullName} bu kupona zaten sahip (${existing.code}).`);
  }

  // Kod çakışması pratikte çok düşük olasılıklı; yine de birkaç kez denenir.
  let code = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `${coupon.codePrefix}-${randomCode()}`;
    const clash = await prisma.userCoupon.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!clash) {
      code = candidate;
      break;
    }
  }
  if (!code) return fail("Benzersiz kupon kodu üretilemedi, tekrar deneyin.");

  await prisma.userCoupon.create({
    data: { couponId, userId: user.id, code, sourceType: "MANUAL" },
  });

  await recordAudit({
    actorId: session.userId,
    action: "coupon.issue",
    entity: "UserCoupon",
    entityId: code,
    meta: { couponId, userId: user.id },
  });

  revalidatePath(PATH);
  revalidatePath(`/panel/uyeler/${user.id}`);
  return ok(`${user.fullName} için ${code} kuponu tanımlandı.`);
}
