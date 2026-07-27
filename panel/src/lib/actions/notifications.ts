"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/guard";
import {
  APPLICATION_STATUSES,
  NOTIFICATION_CHANNELS,
  type ApplicationStatus,
} from "@/lib/domain/enums";
import { addressFor, sendNotification } from "@/lib/notify/dispatch";
import { prisma } from "@/lib/prisma";
import { fail, fromZodError, ok, type ActionState } from "./types";

const PATH = "/panel/bildirimler";

const schema = z
  .object({
    channel: z.enum(NOTIFICATION_CHANNELS),
    audience: z.enum(["ALL_MEMBERS", "APPLICATION_STATUS", "EVENT_REGISTRANTS"]),
    applicationStatus: z.union([z.enum(APPLICATION_STATUSES), z.literal("")]),
    eventId: z.string(),
    subject: z.string().max(200).optional(),
    body: z.string().min(5, "Mesaj en az 5 karakter olmalı.").max(2000),
  })
  .refine(
    (data) => data.audience !== "APPLICATION_STATUS" || data.applicationStatus !== "",
    { message: "Başvuru durumu seçin.", path: ["applicationStatus"] },
  )
  .refine((data) => data.audience !== "EVENT_REGISTRANTS" || data.eventId !== "", {
    message: "Etkinlik seçin.",
    path: ["eventId"],
  });

type Target = { id: string; email: string; phone: string };

async function resolveRecipients(
  audience: "ALL_MEMBERS" | "APPLICATION_STATUS" | "EVENT_REGISTRANTS",
  applicationStatus: ApplicationStatus | "",
  eventId: string,
): Promise<Target[]> {
  const select = { id: true, email: true, phone: true } as const;

  if (audience === "ALL_MEMBERS") {
    return prisma.user.findMany({
      where: { role: "MEMBER", isActive: true },
      select,
    });
  }

  if (audience === "EVENT_REGISTRANTS") {
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, status: { in: ["REGISTERED", "ATTENDED"] } },
      select: { user: { select } },
    });
    return registrations.map((registration) => registration.user);
  }

  // Belirli durumdaki başvuruların iletişim sorumlusu + kayıtlı grup üyeleri.
  const applications = await prisma.application.findMany({
    where: { status: applicationStatus || undefined },
    select: {
      contactUser: { select },
      members: { select: { user: { select } } },
    },
  });

  const unique = new Map<string, Target>();
  for (const application of applications) {
    unique.set(application.contactUser.id, application.contactUser);
    for (const member of application.members) {
      if (member.user) unique.set(member.user.id, member.user);
    }
  }
  return [...unique.values()];
}

export async function sendBulkNotificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = schema.safeParse({
    channel: formData.get("channel"),
    audience: formData.get("audience"),
    applicationStatus: formData.get("applicationStatus") ?? "",
    eventId: formData.get("eventId") ?? "",
    subject: formData.get("subject") || undefined,
    body: formData.get("body"),
  });

  if (!parsed.success) return fromZodError(parsed.error);
  const { channel, audience, applicationStatus, eventId, subject, body } =
    parsed.data;

  const targets = await resolveRecipients(audience, applicationStatus, eventId);
  if (targets.length === 0) {
    return fail("Bu hedef kitlede alıcı bulunamadı.");
  }

  const result = await sendNotification({
    channel,
    subject: channel === "EMAIL" ? (subject ?? null) : null,
    body,
    audience,
    audienceFilter: { applicationStatus, eventId },
    recipients: targets.map((target) => ({
      userId: target.id,
      address: addressFor(channel, target),
    })),
    sentById: session.userId,
  });

  await recordAudit({
    actorId: session.userId,
    action: "notification.send",
    entity: "Notification",
    entityId: result.notificationId,
    meta: { audience, channel, sent: result.sent, failed: result.failed },
  });

  revalidatePath(PATH);

  return ok(
    result.failed > 0
      ? `${result.sent} gönderildi, ${result.failed} başarısız.`
      : `${result.sent} alıcıya gönderildi.`,
  );
}
