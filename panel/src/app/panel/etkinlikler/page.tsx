import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { toggleEventPublishAction } from "@/lib/actions/events";
import type { EventType } from "@/lib/domain/enums";
import { EVENT_TYPE_LABEL } from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Webinar & Atölye" };

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      _count: {
        select: {
          registrations: { where: { status: { in: ["REGISTERED", "ATTENDED"] } } },
        },
      },
    },
  });

  const now = new Date();

  return (
    <>
      <PageHeader
        title="Webinar & Atölye"
        description="Etkinlik oluşturun, düzenleyin ve katılımcı listelerini görün."
        actions={
          <LinkButton href="/panel/etkinlikler/yeni" size="sm">
            <Plus className="size-4" aria-hidden />
            Yeni etkinlik
          </LinkButton>
        }
      />

      <Card>
        <CardHeader title={`${events.length} etkinlik`} />
        <TableWrap>
          <Table className="min-w-[860px]">
            <thead>
              <tr>
                <Th>Etkinlik</Th>
                <Th>Tür</Th>
                <Th>Eğitmen</Th>
                <Th>Tarih</Th>
                <Th>Kayıt</Th>
                <Th>Durum</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <EmptyRow colSpan={7}>
                  Henüz etkinlik oluşturulmamış.
                </EmptyRow>
              ) : (
                events.map((event) => (
                  <Tr key={event.id}>
                    <Td>
                      <Link
                        href={`/panel/etkinlikler/${event.id}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {event.title}
                      </Link>
                      {event.startsAt < now ? (
                        <span className="block text-xs text-subtle">
                          Geçmiş etkinlik
                        </span>
                      ) : null}
                    </Td>
                    <Td className="text-muted">
                      {EVENT_TYPE_LABEL[event.type as EventType] ?? event.type}
                    </Td>
                    <Td className="text-muted">{event.instructor}</Td>
                    <Td className="whitespace-nowrap text-muted">
                      {formatDateTime(event.startsAt)}
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {event._count.registrations}
                      {event.capacity ? ` / ${event.capacity}` : ""}
                    </Td>
                    <Td>
                      {event.isPublished ? (
                        <Badge tone="success">Yayında</Badge>
                      ) : (
                        <Badge tone="neutral">Taslak</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <form action={toggleEventPublishAction}>
                        <input type="hidden" name="id" value={event.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          {event.isPublished ? "Yayından kaldır" : "Yayınla"}
                        </Button>
                      </form>
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
