import type { Metadata } from "next";
import { Download } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatCard } from "@/components/panel/stat-card";
import { APPLICATION_STATUSES } from "@/lib/domain/enums";
import { APPLICATION_STATUS_LABEL } from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { getApplicationStatusCounts } from "@/lib/queries/stats";

export const metadata: Metadata = { title: "Raporlar" };

function percent(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export default async function ReportsPage() {
  const [statusCounts, cityGroups, roleRows, eventStats, couponStats] =
    await Promise.all([
      getApplicationStatusCounts(),
      prisma.application.groupBy({
        by: ["city"],
        _count: { _all: true },
        orderBy: { _count: { city: "desc" } },
        take: 15,
      }),
      prisma.musicalRole.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { members: true } } },
      }),
      prisma.event.findMany({
        orderBy: { startsAt: "desc" },
        include: {
          _count: {
            select: {
              registrations: {
                where: { status: { in: ["REGISTERED", "ATTENDED"] } },
              },
            },
          },
        },
      }),
      prisma.userCoupon.groupBy({
        by: ["couponId"],
        _count: { _all: true },
      }),
    ]);

  const totalIssued = couponStats.reduce((sum, row) => sum + row._count._all, 0);
  const totalRegistrations = eventStats.reduce(
    (sum, event) => sum + event._count.registrations,
    0,
  );

  return (
    <>
      <PageHeader
        title="Raporlar"
        description="Başvuru, şehir, rol ve etkinlik dağılımları."
        actions={
          <LinkButton
            href="/api/disa-aktar/basvurular"
            variant="secondary"
            size="sm"
            prefetch={false}
          >
            <Download className="size-4" aria-hidden />
            Tüm başvuruları indir
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Toplam başvuru" value={statusCounts.total} tone="accent" />
        <StatCard
          label="Onay oranı"
          value={percent(statusCounts.APPROVED, statusCounts.total)}
          hint={`${statusCounts.APPROVED} onaylı başvuru`}
        />
        <StatCard
          label="Etkinlik kaydı"
          value={totalRegistrations}
          hint={`${eventStats.length} etkinlik`}
        />
        <StatCard label="Dağıtılan kupon" value={totalIssued} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Başvuru durumları" />
          <CardBody className="space-y-3">
            {APPLICATION_STATUSES.map((status) => {
              const count = statusCounts[status];
              const ratio =
                statusCounts.total === 0
                  ? 0
                  : (count / statusCounts.total) * 100;
              return (
                <div key={status}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span>{APPLICATION_STATUS_LABEL[status]}</span>
                    <span className="tabular-nums text-muted">
                      {count} · {percent(count, statusCounts.total)}
                    </span>
                  </div>
                  <div
                    className="mt-1 h-2 overflow-hidden rounded-full bg-surface-muted"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Şehir dağılımı"
            description="En çok başvuru gelen 15 şehir."
          />
          <TableWrap>
            <Table className="min-w-[320px]">
              <thead>
                <tr>
                  <Th>Şehir</Th>
                  <Th className="text-right">Başvuru</Th>
                  <Th className="text-right">Pay</Th>
                </tr>
              </thead>
              <tbody>
                {cityGroups.length === 0 ? (
                  <EmptyRow colSpan={3}>Veri yok.</EmptyRow>
                ) : (
                  cityGroups.map((row) => (
                    <Tr key={row.city}>
                      <Td>{row.city}</Td>
                      <Td className="text-right tabular-nums text-muted">
                        {row._count._all}
                      </Td>
                      <Td className="text-right tabular-nums text-muted">
                        {percent(row._count._all, statusCounts.total)}
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader
            title="Müzikal rol dağılımı"
            description="Başvurulardaki üye rollerine göre."
          />
          <TableWrap>
            <Table className="min-w-[320px]">
              <thead>
                <tr>
                  <Th>Rol</Th>
                  <Th className="text-right">Üye</Th>
                </tr>
              </thead>
              <tbody>
                {roleRows.length === 0 ? (
                  <EmptyRow colSpan={2}>Tanımlı rol yok.</EmptyRow>
                ) : (
                  roleRows.map((role) => (
                    <Tr key={role.id}>
                      <Td>{role.name}</Td>
                      <Td className="text-right tabular-nums text-muted">
                        {role._count.members}
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader title="Etkinlik doluluk" />
          <TableWrap>
            <Table className="min-w-[420px]">
              <thead>
                <tr>
                  <Th>Etkinlik</Th>
                  <Th className="text-right">Kayıt</Th>
                  <Th className="text-right">Doluluk</Th>
                </tr>
              </thead>
              <tbody>
                {eventStats.length === 0 ? (
                  <EmptyRow colSpan={3}>Etkinlik yok.</EmptyRow>
                ) : (
                  eventStats.map((event) => (
                    <Tr key={event.id}>
                      <Td className="max-w-64 truncate">{event.title}</Td>
                      <Td className="text-right tabular-nums text-muted">
                        {event._count.registrations}
                      </Td>
                      <Td className="text-right tabular-nums text-muted">
                        {event.capacity
                          ? percent(event._count.registrations, event.capacity)
                          : "—"}
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      </div>
    </>
  );
}
