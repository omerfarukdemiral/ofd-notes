import type { Metadata } from "next";
import Link from "next/link";
import { Download, Music2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { ApplicationStatus } from "@/lib/domain/enums";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TONE,
  APPLICATION_TYPE_LABEL,
} from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import {
  getApplicationCities,
  listApplications,
  parseApplicationFilters,
} from "@/lib/queries/applications";
import { formatShortDate } from "@/lib/utils";
import { ApplicationFilters } from "./filters";

export const metadata: Metadata = { title: "Başvurular" };

type SearchParams = Record<string, string | string[] | undefined>;

function buildQueryString(params: SearchParams, overrides: SearchParams = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) search.set(key, single);
  }
  return search.toString();
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseApplicationFilters(params);
  const page = Math.max(1, Number.parseInt(String(params.sayfa ?? "1"), 10) || 1);

  const [{ items, total, pageCount }, cities, roles] = await Promise.all([
    listApplications(filters, page),
    getApplicationCities(),
    prisma.musicalRole.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const exportQuery = buildQueryString(params, { sayfa: undefined });

  return (
    <>
      <PageHeader
        title="Başvurular"
        description="Gelen grup başvurularını filtreleyin, inceleyin ve durumlarını güncelleyin."
        actions={
          <LinkButton
            href={`/api/disa-aktar/basvurular${exportQuery ? `?${exportQuery}` : ""}`}
            variant="secondary"
            size="sm"
            prefetch={false}
          >
            <Download className="size-4" aria-hidden />
            Excel indir
          </LinkButton>
        }
      />

      <Card>
        <CardBody>
          <ApplicationFilters
            values={{
              q: filters.q,
              durum: filters.status,
              sehir: filters.city,
              rol: filters.roleId,
              minUye: filters.minMembers?.toString() ?? "",
              maxUye: filters.maxMembers?.toString() ?? "",
            }}
            cities={cities}
            roles={roles}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`${total} başvuru`}
          description={
            pageCount > 1 ? `Sayfa ${page} / ${pageCount}` : undefined
          }
        />
        <TableWrap>
          <Table className="min-w-[880px]">
            <thead>
              <tr>
                <Th>Grup</Th>
                <Th>Tür</Th>
                <Th>Şehir</Th>
                <Th>Üye</Th>
                <Th>İletişim</Th>
                <Th>Demo</Th>
                <Th>Durum</Th>
                <Th>Tarih</Th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <EmptyRow colSpan={8}>
                  Bu filtrelerle eşleşen başvuru yok.
                </EmptyRow>
              ) : (
                items.map((application) => {
                  const status = application.status as ApplicationStatus;
                  const hasDemo = Boolean(
                    application.demoFileName ||
                      application.demoFileUrl ||
                      application.demoLinkUrl,
                  );
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
                      <Td className="text-muted">
                        {APPLICATION_TYPE_LABEL[
                          application.type as keyof typeof APPLICATION_TYPE_LABEL
                        ] ?? application.type}
                      </Td>
                      <Td className="text-muted">{application.city}</Td>
                      <Td className="tabular-nums text-muted">
                        {application.memberCount}
                      </Td>
                      <Td>
                        <span className="block text-[13px]">
                          {application.contactUser.fullName}
                        </span>
                        <span className="block text-xs text-subtle">
                          {application.contactUser.email}
                        </span>
                      </Td>
                      <Td>
                        {hasDemo ? (
                          <span className="inline-flex items-center gap-1 text-[13px] text-muted">
                            <Music2 className="size-3.5" aria-hidden />
                            Var
                          </span>
                        ) : (
                          <span className="text-[13px] text-subtle">Yok</span>
                        )}
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

        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <LinkButton
              href={`?${buildQueryString(params, { sayfa: String(page - 1) })}`}
              variant="secondary"
              size="sm"
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            >
              Önceki
            </LinkButton>
            <span className="text-[13px] text-muted">
              Sayfa {page} / {pageCount}
            </span>
            <LinkButton
              href={`?${buildQueryString(params, { sayfa: String(page + 1) })}`}
              variant="secondary"
              size="sm"
              aria-disabled={page >= pageCount}
              className={page >= pageCount ? "pointer-events-none opacity-50" : ""}
            >
              Sonraki
            </LinkButton>
          </div>
        ) : null}
      </Card>
    </>
  );
}
