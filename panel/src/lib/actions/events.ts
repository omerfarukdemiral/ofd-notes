"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import { EVENT_TYPES, REGISTRATION_STATUSES } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { fail, fromZodError, ok, type ActionState } from "./types";

const LIST_PATH = "/panel/etkinlikler";

const eventSchema = z.object({
  title: z.string().min(3, "Başlık en az 3 karakter olmalı."),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalı."),
  instructor: z.string().min(2, "Eğitmen adı zorunlu."),
  type: z.enum(EVENT_TYPES),
  startsAt: z.coerce.date("Geçerli bir tarih/saat girin."),
  durationMinutes: z.coerce.number().int().min(5).max(1440),
  coverImageUrl: z.union([z.url("Geçerli bir görsel adresi girin."), z.literal("")]),
  location: z.string().max(500).optional(),
  capacity: z.union([z.coerce.number().int().min(1).max(100_000), z.literal("")]),
  waitlistEnabled: z.boolean(),
  isPublished: z.boolean(),
});

function readEventForm(formData: FormData) {
  return eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    instructor: formData.get("instructor"),
    type: formData.get("type"),
    startsAt: formData.get("startsAt"),
    durationMinutes: formData.get("durationMinutes"),
    coverImageUrl: formData.get("coverImageUrl") ?? "",
    location: formData.get("location") || undefined,
    capacity: formData.get("capacity") === "" ? "" : formData.get("capacity"),
    waitlistEnabled: formData.get("waitlistEnabled") === "on",
    isPublished: formData.get("isPublished") === "on",
  });
}

/** Aynı isimli etkinlikler için slug'a sayı ekleyerek benzersizliği korur. */
async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "etkinlik";
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export async function createEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = readEventForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const data = parsed.data;
  const event = await prisma.event.create({
    data: {
      slug: await uniqueSlug(data.title),
      title: data.title,
      description: data.description,
      instructor: data.instructor,
      type: data.type,
      startsAt: data.startsAt,
      durationMinutes: data.durationMinutes,
      coverImageUrl: data.coverImageUrl || null,
      location: data.location ?? null,
      capacity: data.capacity === "" ? null : data.capacity,
      waitlistEnabled: data.waitlistEnabled,
      isPublished: data.isPublished,
    },
  });

  await recordAudit({
    actorId: session.userId,
    action: "event.create",
    entity: "Event",
    entityId: event.id,
    meta: { title: event.title },
  });

  revalidatePath(LIST_PATH);
  revalidatePath("/panel");
  redirect(`${LIST_PATH}/${event.id}`);
}

export async function updateEventAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Etkinlik bulunamadı.");

  const parsed = readEventForm(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const data = parsed.data;
  await prisma.event.update({
    where: { id },
    data: {
      slug: await uniqueSlug(data.title, id),
      title: data.title,
      description: data.description,
      instructor: data.instructor,
      type: data.type,
      startsAt: data.startsAt,
      durationMinutes: data.durationMinutes,
      coverImageUrl: data.coverImageUrl || null,
      location: data.location ?? null,
      capacity: data.capacity === "" ? null : data.capacity,
      waitlistEnabled: data.waitlistEnabled,
      isPublished: data.isPublished,
    },
  });

  await recordAudit({
    actorId: session.userId,
    action: "event.update",
    entity: "Event",
    entityId: id,
    meta: { title: data.title },
  });

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  return ok("Etkinlik güncellendi.");
}

export async function deleteEventAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return;

  await prisma.event.delete({ where: { id } });
  await recordAudit({
    actorId: session.userId,
    action: "event.delete",
    entity: "Event",
    entityId: id,
    meta: { title: event.title },
  });

  revalidatePath(LIST_PATH);
  revalidatePath("/panel");
  redirect(LIST_PATH);
}

export async function toggleEventPublishAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return;

  await prisma.event.update({
    where: { id },
    data: { isPublished: !event.isPublished },
  });

  await recordAudit({
    actorId: session.userId,
    action: event.isPublished ? "event.unpublish" : "event.publish",
    entity: "Event",
    entityId: id,
  });

  revalidatePath(LIST_PATH);
  revalidatePath(`${LIST_PATH}/${id}`);
  revalidatePath("/panel");
}

export async function updateRegistrationStatusAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("registrationId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !(REGISTRATION_STATUSES as readonly string[]).includes(status)) {
    return;
  }

  const registration = await prisma.eventRegistration.update({
    where: { id },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? new Date() : null,
    },
  });

  await recordAudit({
    actorId: session.userId,
    action: "eventRegistration.status.update",
    entity: "EventRegistration",
    entityId: id,
    meta: { status },
  });

  revalidatePath(`${LIST_PATH}/${registration.eventId}`);
}
