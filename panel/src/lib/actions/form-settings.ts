"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { FORM_FIELD_SCOPES, FORM_FIELD_TYPES } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { fail, fromZodError, ok, type ActionState } from "./types";

const PATH = "/panel/form-ayarlari";

function optionalDate(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? new Date(raw) : null;
}

// ---------------------------------------------------------------------------
// Genel başvuru ayarları
// ---------------------------------------------------------------------------

const settingsSchema = z
  .object({
    isOpen: z.boolean(),
    opensAt: z.date().nullable(),
    closesAt: z.date().nullable(),
    minMembers: z.coerce.number().int().min(1).max(50),
    maxMembers: z.coerce.number().int().min(1).max(50),
    demoRequired: z.boolean(),
  })
  .refine((data) => data.maxMembers >= data.minMembers, {
    message: "Maksimum üye sayısı minimumdan küçük olamaz.",
    path: ["maxMembers"],
  })
  .refine(
    (data) => !data.opensAt || !data.closesAt || data.closesAt > data.opensAt,
    { message: "Kapanış tarihi açılıştan sonra olmalı.", path: ["closesAt"] },
  );

export async function updateApplicationSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = settingsSchema.safeParse({
    isOpen: formData.get("isOpen") === "on",
    opensAt: optionalDate(formData.get("opensAt")),
    closesAt: optionalDate(formData.get("closesAt")),
    minMembers: formData.get("minMembers"),
    maxMembers: formData.get("maxMembers"),
    demoRequired: formData.get("demoRequired") === "on",
  });

  if (!parsed.success) return fromZodError(parsed.error);

  await prisma.applicationSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...parsed.data },
    update: parsed.data,
  });

  await recordAudit({
    actorId: session.userId,
    action: "applicationSettings.update",
    entity: "ApplicationSettings",
    entityId: "singleton",
    meta: parsed.data,
  });

  revalidatePath(PATH);
  revalidatePath("/panel");
  return ok("Başvuru ayarları kaydedildi.");
}

// ---------------------------------------------------------------------------
// Dinamik form alanları
// ---------------------------------------------------------------------------

const fieldSchema = z.object({
  label: z.string().min(2, "Alan adı en az 2 karakter olmalı."),
  type: z.enum(FORM_FIELD_TYPES),
  scope: z.enum(FORM_FIELD_SCOPES),
  helpText: z.string().max(300).optional(),
  required: z.boolean(),
  options: z.string().optional(),
});

export async function createFormFieldAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = fieldSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    scope: formData.get("scope"),
    helpText: formData.get("helpText") || undefined,
    required: formData.get("required") === "on",
    options: formData.get("options") || undefined,
  });

  if (!parsed.success) return fromZodError(parsed.error);
  const { label, type, scope, helpText, required, options } = parsed.data;

  // Seçim listesi seçildiyse en az bir seçenek şart, yoksa alan kullanılamaz.
  const optionList = (options ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (type === "SELECT" && optionList.length === 0) {
    return fail("Seçim listesi için en az bir seçenek girin.", {
      options: "Her satıra bir seçenek yazın.",
    });
  }

  const key = slugify(label);
  if (!key) {
    return fail("Alan adından geçerli bir anahtar üretilemedi.", {
      label: "Latin harf veya rakam içeren bir ad girin.",
    });
  }

  const existing = await prisma.applicationFormField.findUnique({
    where: { key },
  });
  if (existing) {
    return fail("Bu isimde bir alan zaten var.", {
      label: "Farklı bir alan adı seçin.",
    });
  }

  const last = await prisma.applicationFormField.findFirst({
    where: { scope },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const field = await prisma.applicationFormField.create({
    data: {
      key,
      label,
      type,
      scope,
      helpText: helpText ?? null,
      required,
      optionsJson: type === "SELECT" ? JSON.stringify(optionList) : null,
      order: (last?.order ?? 0) + 1,
    },
  });

  await recordAudit({
    actorId: session.userId,
    action: "formField.create",
    entity: "ApplicationFormField",
    entityId: field.id,
    meta: { key, type, scope },
  });

  revalidatePath(PATH);
  return ok(`"${label}" alanı eklendi.`);
}

export async function toggleFormFieldAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const field = await prisma.applicationFormField.findUnique({ where: { id } });
  if (!field) return;

  await prisma.applicationFormField.update({
    where: { id },
    data: { isActive: !field.isActive },
  });

  await recordAudit({
    actorId: session.userId,
    action: field.isActive ? "formField.disable" : "formField.enable",
    entity: "ApplicationFormField",
    entityId: id,
  });

  revalidatePath(PATH);
}

export async function deleteFormFieldAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const field = await prisma.applicationFormField.findUnique({ where: { id } });
  // Sistem alanları başvuru formunun iskeleti — silinirse form bozulur.
  if (!field || field.isSystem) return;

  await prisma.applicationFormField.delete({ where: { id } });
  await recordAudit({
    actorId: session.userId,
    action: "formField.delete",
    entity: "ApplicationFormField",
    entityId: id,
    meta: { key: field.key },
  });

  revalidatePath(PATH);
}

// ---------------------------------------------------------------------------
// Müzikal roller
// ---------------------------------------------------------------------------

export async function createMusicalRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) {
    return fail("Rol adı en az 2 karakter olmalı.", { name: "Geçersiz ad." });
  }

  const existing = await prisma.musicalRole.findUnique({ where: { name } });
  if (existing) {
    return fail("Bu rol zaten tanımlı.", { name: "Farklı bir ad girin." });
  }

  const last = await prisma.musicalRole.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const role = await prisma.musicalRole.create({
    data: { name, order: (last?.order ?? 0) + 1 },
  });

  await recordAudit({
    actorId: session.userId,
    action: "musicalRole.create",
    entity: "MusicalRole",
    entityId: role.id,
    meta: { name },
  });

  revalidatePath(PATH);
  return ok(`"${name}" rolü eklendi.`);
}

export async function toggleMusicalRoleAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const role = await prisma.musicalRole.findUnique({ where: { id } });
  if (!role) return;

  await prisma.musicalRole.update({
    where: { id },
    data: { isActive: !role.isActive },
  });

  await recordAudit({
    actorId: session.userId,
    action: role.isActive ? "musicalRole.disable" : "musicalRole.enable",
    entity: "MusicalRole",
    entityId: id,
  });

  revalidatePath(PATH);
}
