import "server-only";

import type {
  NotificationAudience,
  NotificationChannel,
} from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { getNotificationProvider } from "./provider";

export type Recipient = {
  userId: string;
  address: string;
};

export type CreateNotificationInput = {
  channel: NotificationChannel;
  subject?: string | null;
  body: string;
  audience: NotificationAudience;
  audienceFilter?: unknown;
  recipients: Recipient[];
  sentById?: string | null;
};

/**
 * Bildirimi kaydeder ve alıcılara gönderir.
 *
 * Gönderim şu an istek içinde sırayla yapılıyor. Alıcı sayısı büyüdüğünde
 * (binlerce üye) burası bir kuyruğa taşınmalı: kayıt QUEUED olarak oluşur,
 * arka plan işçisi NotificationRecipient satırlarını tüketir. Veri modeli
 * bunu şimdiden destekliyor.
 */
export async function sendNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      channel: input.channel,
      subject: input.subject ?? null,
      body: input.body,
      audience: input.audience,
      audienceFilterJson: input.audienceFilter
        ? JSON.stringify(input.audienceFilter)
        : null,
      status: "QUEUED",
      recipientCount: input.recipients.length,
      sentById: input.sentById ?? null,
      recipients: {
        create: input.recipients.map((recipient) => ({
          userId: recipient.userId,
          address: recipient.address,
        })),
      },
    },
    include: { recipients: true },
  });

  if (notification.recipients.length === 0) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return { notificationId: notification.id, sent: 0, failed: 0 };
  }

  const provider = getNotificationProvider();
  let sent = 0;
  let failed = 0;

  for (const recipient of notification.recipients) {
    const result = await provider.send({
      channel: input.channel,
      to: recipient.address,
      subject: input.subject,
      body: input.body,
    });

    if (result.ok) {
      sent += 1;
      await prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    } else {
      failed += 1;
      await prisma.notificationRecipient.update({
        where: { id: recipient.id },
        data: { status: "FAILED", error: result.error },
      });
    }
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: failed > 0 && sent === 0 ? "FAILED" : "SENT",
      sentAt: new Date(),
    },
  });

  return { notificationId: notification.id, sent, failed };
}

export function addressFor(
  channel: NotificationChannel,
  user: { email: string; phone: string },
) {
  return channel === "EMAIL" ? user.email : user.phone;
}
