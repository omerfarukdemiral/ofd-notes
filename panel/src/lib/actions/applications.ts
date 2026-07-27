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
import { APPLICATION_STATUS_LABEL } from "@/lib/domain/labels";
import { addressFor, sendNotification } from "@/lib/notify/dispatch";
import { prisma } from "@/lib/prisma";
import { fail, fromZodError, ok, type ActionState } from "./types";

const statusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(APPLICATION_STATUSES),
  note: z.string().max(1000).optional(),
  notify: z.enum(["none", "contact", "all"]).default("none"),
  channel: z.enum(NOTIFICATION_CHANNELS).default("EMAIL"),
});

function defaultMessage(groupName: string, status: ApplicationStatus) {
  const label = APPLICATION_STATUS_LABEL[status];
  switch (status) {
    case "APPROVED":
      return `Merhaba, "${groupName}" grubunun Müzik Hackathon başvurusu onaylandı. Detaylar için profilinizi kontrol edin.`;
    case "REJECTED":
      return `Merhaba, "${groupName}" grubunun Müzik Hackathon başvurusu bu sefer değerlendirmeyi geçemedi. İlginiz için teşekkür ederiz.`;
    case "FINALIST":
      return `Tebrikler! "${groupName}" grubu Müzik Hackathon finaline kaldı. Final gecesi bilgileri profilinizde.`;
    default:
      return `"${groupName}" grubunun başvuru durumu güncellendi: ${label}.`;
  }
}

export async function updateApplicationStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = statusSchema.safeParse({
    applicationId: formData.get("applicationId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
    notify: formData.get("notify") || "none",
    channel: formData.get("channel") || "EMAIL",
  });

  if (!parsed.success) return fromZodError(parsed.error);
  const { applicationId, status, note, notify, channel } = parsed.data;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      contactUser: true,
      members: { include: { user: true } },
    },
  });

  if (!application) return fail("Başvuru bulunamadı.");

  const previousStatus = application.status as ApplicationStatus;

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status, reviewNote: note ?? application.reviewNote },
    }),
    prisma.applicationStatusLog.create({
      data: {
        applicationId,
        fromStatus: previousStatus,
        toStatus: status,
        note: note ?? null,
        changedById: session.userId,
      },
    }),
  ]);

  await recordAudit({
    actorId: session.userId,
    action: "application.status.update",
    entity: "Application",
    entityId: applicationId,
    meta: { from: previousStatus, to: status },
  });

  let notifyInfo = "";
  if (notify !== "none") {
    // Grubun tüm üyeleri seçildiyse, sistemde hesabı olan üyelere gönderilir;
    // hesabı olmayan form üyelerinin doğrulanmış adresi yok.
    const targets =
      notify === "contact"
        ? [application.contactUser]
        : [
            application.contactUser,
            ...application.members
              .map((member) => member.user)
              .filter((user) => user !== null),
          ];

    const unique = new Map(targets.map((user) => [user.id, user]));
    const recipients = [...unique.values()].map((user) => ({
      userId: user.id,
      address: addressFor(channel, user),
    }));

    const result = await sendNotification({
      channel,
      subject: `Müzik Hackathon başvuru durumu: ${APPLICATION_STATUS_LABEL[status]}`,
      body: note?.trim() || defaultMessage(application.groupName, status),
      audience: "APPLICATION_STATUS",
      audienceFilter: { applicationId, status, scope: notify },
      recipients,
      sentById: session.userId,
    });

    notifyInfo = ` ${result.sent} kişiye bildirim gönderildi.`;
  }

  revalidatePath("/panel/basvurular");
  revalidatePath(`/panel/basvurular/${applicationId}`);
  revalidatePath("/panel");

  return ok(
    `Durum "${APPLICATION_STATUS_LABEL[status]}" olarak güncellendi.${notifyInfo}`,
  );
}
