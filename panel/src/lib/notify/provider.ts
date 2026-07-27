import "server-only";

import type { NotificationChannel } from "@/lib/domain/enums";

export type OutboundMessage = {
  channel: NotificationChannel;
  to: string;
  subject?: string | null;
  body: string;
};

export type DeliveryResult =
  | { ok: true }
  | { ok: false; error: string };

export interface NotificationProvider {
  send(message: OutboundMessage): Promise<DeliveryResult>;
}

/**
 * FAZ 1'de gerçek bir e-posta/SMS sağlayıcısı bağlı değil. Bu uygulama
 * gönderimi log'a yazıp başarılı sayar; böylece bildirim akışı ve kayıtları
 * uçtan uca çalışır.
 *
 * Gerçek sağlayıcıya geçerken yalnızca bu dosyada yeni bir
 * NotificationProvider yazıp `getNotificationProvider` içinde seçmek yeterli
 * — çağıran taraf (dispatch.ts) değişmez.
 */
class ConsoleProvider implements NotificationProvider {
  async send(message: OutboundMessage): Promise<DeliveryResult> {
    console.info(
      `[bildirim:${message.channel}] → ${message.to}` +
        (message.subject ? ` · ${message.subject}` : ""),
    );
    return { ok: true };
  }
}

let cached: NotificationProvider | null = null;

export function getNotificationProvider(): NotificationProvider {
  cached ??= new ConsoleProvider();
  return cached;
}
