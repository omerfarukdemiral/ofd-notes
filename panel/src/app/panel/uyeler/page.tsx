import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/lib/domain/enums";
import { USER_ROLE_LABEL } from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { calculateAge, formatShortDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Üyeler" };

const PAGE_SIZE = 30;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const city = String(params.sehir ?? "").trim();
  const verified = String(params.dogrulama ?? "");
  const page = Math.max(1, Number.parseInt(String(params.sayfa ?? "1"), 10) || 1);

  const where: Prisma.UserWhereInput = {};
  if (city) where.city = city;
  if (verified === "verified") where.emailVerifiedAt = { not: null };
  if (verified === "pending") where.emailVerifiedAt = null;
  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const [users, total, cityRows] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: {
            eventRegistrations: true,
            coupons: true,
            contactApplications: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.findMany({
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Üyeler"
        description="Kayıtlı kullanıcılar, doğrulama durumları ve etkinlik/kupon özetleri."
      />

      <Card>
        <CardBody>
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Ara" htmlFor="q">
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Ad, e-posta veya telefon"
              />
            </Field>
            <Field label="Şehir" htmlFor="sehir">
              <Select id="sehir" name="sehir" defaultValue={city}>
                <option value="">Tümü</option>
                {cityRows.map((row) => (
                  <option key={row.city} value={row.city}>
                    {row.city}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Doğrulama" htmlFor="dogrulama">
              <Select id="dogrulama" name="dogrulama" defaultValue={verified}>
                <option value="">Tümü</option>
                <option value="verified">Doğrulanmış</option>
                <option value="pending">Bekleyen</option>
              </Select>
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">
                Filtrele
              </Button>
              <LinkButton href="/panel/uyeler" variant="ghost" size="sm">
                Temizle
              </LinkButton>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`${total} üye`}
          description={pageCount > 1 ? `Sayfa ${page} / ${pageCount}` : undefined}
        />
        <TableWrap>
          <Table className="min-w-[900px]">
            <thead>
              <tr>
                <Th>Ad Soyad</Th>
                <Th>İletişim</Th>
                <Th>Şehir</Th>
                <Th>Yaş</Th>
                <Th>Rol</Th>
                <Th>Doğrulama</Th>
                <Th>Etkinlik</Th>
                <Th>Kupon</Th>
                <Th>Kayıt</Th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <EmptyRow colSpan={9}>Eşleşen üye yok.</EmptyRow>
              ) : (
                users.map((user) => (
                  <Tr key={user.id}>
                    <Td>
                      <Link
                        href={`/panel/uyeler/${user.id}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {user.fullName}
                      </Link>
                      {user._count.contactApplications > 0 ? (
                        <span className="block text-xs text-subtle">
                          {user._count.contactApplications} başvuru sorumlusu
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      <span className="block text-[13px]">{user.email}</span>
                      <span className="block text-xs text-subtle">
                        {user.phone}
                      </span>
                    </Td>
                    <Td className="text-muted">{user.city}</Td>
                    <Td className="tabular-nums text-muted">
                      {calculateAge(user.birthDate) ?? "—"}
                    </Td>
                    <Td>
                      <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
                        {USER_ROLE_LABEL[user.role as UserRole] ?? user.role}
                      </Badge>
                    </Td>
                    <Td>
                      {user.emailVerifiedAt ? (
                        <Badge tone="success">Doğrulandı</Badge>
                      ) : (
                        <Badge tone="warning">Bekliyor</Badge>
                      )}
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {user._count.eventRegistrations}
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {user._count.coupons}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {formatShortDate(user.createdAt)}
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
