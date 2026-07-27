import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatCard } from "@/components/panel/stat-card";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TONE,
} from "@/lib/domain/labels";
import type { ApplicationStatus } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";
import { getPanelOverview, isApplicationWindowOpen } from "@/lib/queries/stats";
import { formatDateTime, formatShortDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Gösterge Paneli" };

export default async function DashboardPage() {
  const [overview, latestApplications, upcomingEvents] = await Promise.all([
    getPanelOverview(),
    prisma.application.findMany({
      orderBy: { submittedAt: "desc" },
      take: 6,
      include: { _count: { select: { members: true } } },
    }),
    prisma.event.findMany({
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: {
        _count: { select: { registrations: true } },
      },
    }),
  ]);

  const { statusCounts, settings } = overview;
  const windowOpen = isApplicationWindowOpen(settings);

  return (
    <>
      <PageHeader
        title="Gösterge Paneli"
        description="Başvuru, üyelik ve etkinlik sayıları tek bakışta."
        actions={
          <Badge tone={windowOpen ? "success" : "neutral"}>
            Başvurular {windowOpen ? "açık" : "kapalı"}
            {settings?.closesAt
              ? ` · ${formatShortDate(settings.closesAt)} kapanış`
              : ""}
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Toplam başvuru"
          value={statusCounts.total}
          icon={FileText}
          tone="accent"
          href="/panel/basvurular"
        />
        <StatCard
          label="Beklemede"
          value={statusCounts.PENDING}
          icon={Clock}
          tone="warning"
          hint="İnceleme bekleyen gruplar"
          href="/panel/basvurular?durum=PENDING"
        />
        <StatCard
          label="Onaylandı"
          value={statusCounts.APPROVED}
          icon={CheckCircle2}
          tone="success"
          href="/panel/basvurular?durum=APPROVED"
        />
        <StatCard
          label="Finale kalan"
          value={statusCounts.FINALIST}
          icon={Trophy}
          tone="accent"
          href="/panel/basvurular?durum=FINALIST"
        />
        <StatCard
          label="Elenen"
          value={statusCounts.REJECTED}
          icon={XCircle}
          tone="danger"
          href="/panel/basvurular?durum=REJECTED"
        />
        <StatCard
          label="Üye"
          value={overview.memberCount}
          icon={Users}
          tone="info"
          hint={`${overview.verifiedMemberCount} doğrulanmış`}
          href="/panel/uyeler"
        />
        <StatCard
          label="Yayındaki etkinlik"
          value={overview.publishedEventCount}
          icon={CalendarDays}
          tone="info"
          hint={`${overview.registrationCount} kayıt`}
          href="/panel/etkinlikler"
        />
        <StatCard
          label="Dağıtılan kupon"
          value={overview.issuedCouponCount}
          hint={`${overview.usedCouponCount} kullanıldı`}
          href="/panel/kuponlar"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader
            title="Son başvurular"
            description="En son gönderilen 6 grup başvurusu."
            action={
              <Link
                href="/panel/basvurular"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Tümünü gör
              </Link>
            }
          />
          <TableWrap>
            <Table className="min-w-[560px]">
              <thead>
                <tr>
                  <Th>Grup</Th>
                  <Th>Şehir</Th>
                  <Th>Üye</Th>
                  <Th>Durum</Th>
                  <Th>Tarih</Th>
                </tr>
              </thead>
              <tbody>
                {latestApplications.length === 0 ? (
                  <EmptyRow colSpan={5}>Henüz başvuru yok.</EmptyRow>
                ) : (
                  latestApplications.map((application) => {
                    const status = application.status as ApplicationStatus;
                    return (
                      <Tr key={application.id}>
                        <Td>
                          <Link
                            href={`/panel/basvurular/${application.id}`}
                            className="font-medium text-foreground hover:text-accent"
                          >
                            {application.groupName}
                          </Link>
                          <span className="block text-xs text-subtle">
                            {application.reference}
                          </span>
                        </Td>
                        <Td className="text-muted">{application.city}</Td>
                        <Td className="tabular-nums text-muted">
                          {application._count.members}
                        </Td>
                        <Td>
                          <Badge tone={APPLICATION_STATUS_TONE[status]}>
                            {APPLICATION_STATUS_LABEL[status]}
                          </Badge>
                        </Td>
                        <Td className="whitespace-nowrap text-muted">
                          {formatShortDate(application.submittedAt)}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader
            title="Yaklaşan etkinlikler"
            action={
              <Link
                href="/panel/etkinlikler"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                Tümünü gör
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                Planlanmış etkinlik yok.
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/panel/etkinlikler/${event.id}`}
                  className="block rounded-lg border border-line px-4 py-3 transition-colors hover:bg-surface-muted/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {event.title}
                    </p>
                    {!event.isPublished ? (
                      <Badge tone="neutral">Taslak</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {event.instructor} · {formatDateTime(event.startsAt)}
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    {event._count.registrations} kayıt
                    {event.capacity ? ` / ${event.capacity} kontenjan` : ""}
                  </p>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
