import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import {
  deleteEventAction,
  updateRegistrationStatusAction,
} from "@/lib/actions/events";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/domain/enums";
import {
  REGISTRATION_STATUS_LABEL,
  REGISTRATION_STATUS_TONE,
} from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Etkinlik detayı" };

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { registeredAt: "asc" },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
        },
      },
    },
  });

  if (!event) notFound();

  const activeCount = event.registrations.filter(
    (registration) => registration.status === "REGISTERED" || registration.status === "ATTENDED",
  ).length;

  return (
    <>
      <Link
        href="/panel/etkinlikler"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Etkinliklere dön
      </Link>

      <PageHeader
        title={event.title}
        description={`${event.instructor} · ${formatDateTime(event.startsAt)}`}
        actions={
          <>
            <Badge tone={event.isPublished ? "success" : "neutral"}>
              {event.isPublished ? "Yayında" : "Taslak"}
            </Badge>
            <form action={deleteEventAction}>
              <input type="hidden" name="id" value={event.id} />
              <Button type="submit" variant="danger" size="sm">
                Etkinliği sil
              </Button>
            </form>
          </>
        }
      />

      <Card>
        <CardHeader
          title={`Katılımcılar (${activeCount}${event.capacity ? ` / ${event.capacity}` : ""})`}
          description="Kim, ne zaman kayıt oldu."
        />
        <TableWrap>
          <Table className="min-w-[760px]">
            <thead>
              <tr>
                <Th>Üye</Th>
                <Th>E-posta</Th>
                <Th>Telefon</Th>
                <Th>Kayıt tarihi</Th>
                <Th>Durum</Th>
                <Th className="text-right">Değiştir</Th>
              </tr>
            </thead>
            <tbody>
              {event.registrations.length === 0 ? (
                <EmptyRow colSpan={6}>Henüz kayıt yok.</EmptyRow>
              ) : (
                event.registrations.map((registration) => {
                  const status = registration.status as RegistrationStatus;
                  return (
                    <Tr key={registration.id}>
                      <Td>
                        <Link
                          href={`/panel/uyeler/${registration.user.id}`}
                          className="font-medium text-foreground hover:text-accent"
                        >
                          {registration.user.fullName}
                        </Link>
                      </Td>
                      <Td className="text-muted">{registration.user.email}</Td>
                      <Td className="text-muted">{registration.user.phone}</Td>
                      <Td className="whitespace-nowrap text-muted">
                        {formatDateTime(registration.registeredAt)}
                      </Td>
                      <Td>
                        <Badge tone={REGISTRATION_STATUS_TONE[status]}>
                          {REGISTRATION_STATUS_LABEL[status]}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <form
                          action={updateRegistrationStatusAction}
                          className="inline-flex items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="registrationId"
                            value={registration.id}
                          />
                          <Select
                            name="status"
                            defaultValue={registration.status}
                            aria-label="Kayıt durumu"
                            className="h-8 w-40 py-0 text-[13px]"
                          >
                            {REGISTRATION_STATUSES.map((option) => (
                              <option key={option} value={option}>
                                {REGISTRATION_STATUS_LABEL[option]}
                              </option>
                            ))}
                          </Select>
                          <Button type="submit" variant="secondary" size="sm">
                            Uygula
                          </Button>
                        </form>
                      </Td>
                    </Tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader title="Etkinliği düzenle" />
        <EventForm
          submitLabel="Değişiklikleri kaydet"
          values={{
            id: event.id,
            title: event.title,
            description: event.description,
            instructor: event.instructor,
            type: event.type,
            startsAt: event.startsAt,
            durationMinutes: event.durationMinutes,
            coverImageUrl: event.coverImageUrl,
            location: event.location,
            capacity: event.capacity,
            waitlistEnabled: event.waitlistEnabled,
            isPublished: event.isPublished,
          }}
        />
      </Card>
    </>
  );
}
