import type { Metadata } from "next";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type {
  NotificationAudience,
  NotificationChannel,
  NotificationStatus,
} from "@/lib/domain/enums";
import {
  NOTIFICATION_AUDIENCE_LABEL,
  NOTIFICATION_CHANNEL_LABEL,
  NOTIFICATION_STATUS_LABEL,
  NOTIFICATION_STATUS_TONE,
} from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { ComposeForm } from "./compose-form";

export const metadata: Metadata = { title: "Bildirimler" };

export default async function NotificationsPage() {
  const [events, notifications] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startsAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        sentBy: { select: { fullName: true } },
        _count: { select: { recipients: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Bildirimler"
        description="Üyelere toplu e-posta veya SMS gönderin, geçmiş gönderimleri izleyin."
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-line bg-info-soft/60 px-4 py-3 text-[13px] text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p>
          FAZ 1&apos;de gerçek e-posta/SMS sağlayıcısı bağlı değil. Gönderimler
          kayıt altına alınır ve sunucu log&apos;una yazılır; sağlayıcı
          entegrasyonu <code className="font-mono">src/lib/notify/provider.ts</code>{" "}
          dosyasından takılır.
        </p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader title="Yeni bildirim" />
        <ComposeForm events={events} />
      </Card>

      <Card>
        <CardHeader title="Gönderim geçmişi" description="En yeni 50 kayıt." />
        <TableWrap>
          <Table className="min-w-[860px]">
            <thead>
              <tr>
                <Th>Tarih</Th>
                <Th>Kanal</Th>
                <Th>Hedef kitle</Th>
                <Th>Konu / mesaj</Th>
                <Th>Alıcı</Th>
                <Th>Durum</Th>
                <Th>Gönderen</Th>
              </tr>
            </thead>
            <tbody>
              {notifications.length === 0 ? (
                <EmptyRow colSpan={7}>Henüz bildirim gönderilmemiş.</EmptyRow>
              ) : (
                notifications.map((notification) => (
                  <Tr key={notification.id}>
                    <Td className="whitespace-nowrap text-muted">
                      {formatDateTime(notification.sentAt ?? notification.createdAt)}
                    </Td>
                    <Td className="text-muted">
                      {NOTIFICATION_CHANNEL_LABEL[
                        notification.channel as NotificationChannel
                      ] ?? notification.channel}
                    </Td>
                    <Td className="text-muted">
                      {NOTIFICATION_AUDIENCE_LABEL[
                        notification.audience as NotificationAudience
                      ] ?? notification.audience}
                    </Td>
                    <Td className="max-w-80">
                      {notification.subject ? (
                        <span className="block truncate font-medium">
                          {notification.subject}
                        </span>
                      ) : null}
                      <span className="block truncate text-xs text-subtle">
                        {notification.body}
                      </span>
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {notification._count.recipients}
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          NOTIFICATION_STATUS_TONE[
                            notification.status as NotificationStatus
                          ]
                        }
                      >
                        {
                          NOTIFICATION_STATUS_LABEL[
                            notification.status as NotificationStatus
                          ]
                        }
                      </Badge>
                    </Td>
                    <Td className="text-muted">
                      {notification.sentBy?.fullName ?? "Sistem"}
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>
    </>
  );
}
