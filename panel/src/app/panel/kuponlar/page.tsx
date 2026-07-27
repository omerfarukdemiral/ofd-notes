import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { toggleCouponAction } from "@/lib/actions/coupons";
import type { CouponTrigger, DiscountType } from "@/lib/domain/enums";
import { COUPON_TRIGGER_LABEL } from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { formatDate, formatShortDate } from "@/lib/utils";
import { CouponForm, IssueCouponForm } from "./coupon-forms";

export const metadata: Metadata = { title: "Kuponlar" };

function discountLabel(type: string, value: number) {
  return (type as DiscountType) === "PERCENT" ? `%${value}` : `${value} TL`;
}

export default async function CouponsPage() {
  const [coupons, issued] = await Promise.all([
    prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { issued: true } } },
    }),
    prisma.userCoupon.findMany({
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        coupon: { select: { title: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);

  const activeCoupons = coupons
    .filter((coupon) => coupon.isActive)
    .map((coupon) => ({ id: coupon.id, title: coupon.title }));

  return (
    <>
      <PageHeader
        title="Kuponlar"
        description="İndirim kuponlarını tanımlayın, üyelere dağıtın ve kullanım durumunu izleyin."
      />

      <Card>
        <CardHeader title={`${coupons.length} kupon tanımı`} />
        <TableWrap>
          <Table className="min-w-[860px]">
            <thead>
              <tr>
                <Th>Kupon</Th>
                <Th>Ön ek</Th>
                <Th>İndirim</Th>
                <Th>Tetikleyici</Th>
                <Th>Dağıtım</Th>
                <Th>Geçerlilik</Th>
                <Th>Durum</Th>
                <Th className="text-right">İşlem</Th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <EmptyRow colSpan={8}>Henüz kupon tanımlanmamış.</EmptyRow>
              ) : (
                coupons.map((coupon) => (
                  <Tr key={coupon.id}>
                    <Td>
                      <span className="font-medium">{coupon.title}</span>
                      {coupon.description ? (
                        <span className="block max-w-72 truncate text-xs text-subtle">
                          {coupon.description}
                        </span>
                      ) : null}
                    </Td>
                    <Td className="font-mono text-[13px] text-muted">
                      {coupon.codePrefix}
                    </Td>
                    <Td className="text-muted">
                      {discountLabel(coupon.discountType, coupon.discountValue)}
                    </Td>
                    <Td className="text-muted">
                      {COUPON_TRIGGER_LABEL[coupon.trigger as CouponTrigger] ??
                        coupon.trigger}
                    </Td>
                    <Td className="tabular-nums text-muted">
                      {coupon._count.issued}
                      {coupon.issueLimit ? ` / ${coupon.issueLimit}` : ""}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {coupon.validUntil
                        ? `${formatShortDate(coupon.validUntil)}'e kadar`
                        : "Süresiz"}
                    </Td>
                    <Td>
                      {coupon.isActive ? (
                        <Badge tone="success">Aktif</Badge>
                      ) : (
                        <Badge tone="neutral">Pasif</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <form action={toggleCouponAction}>
                        <input type="hidden" name="id" value={coupon.id} />
                        <Button type="submit" variant="secondary" size="sm">
                          {coupon.isActive ? "Pasife al" : "Aktifleştir"}
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

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Yeni kupon"
            description="Tetikleyici seçmek kuponun hangi olayda otomatik verileceğini belirler."
          />
          <CouponForm />
        </Card>

        <Card>
          <CardHeader
            title="Üyeye kupon tanımla"
            description="Elle tanımlanan kuponlar anında üyenin profilinde görünür."
          />
          <IssueCouponForm coupons={activeCoupons} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Son dağıtılan kuponlar"
          description="En yeni 50 kayıt."
        />
        <TableWrap>
          <Table className="min-w-[700px]">
            <thead>
              <tr>
                <Th>Kod</Th>
                <Th>Kupon</Th>
                <Th>Üye</Th>
                <Th>Verilme</Th>
                <Th>Kullanım</Th>
              </tr>
            </thead>
            <tbody>
              {issued.length === 0 ? (
                <EmptyRow colSpan={5}>Henüz kupon dağıtılmamış.</EmptyRow>
              ) : (
                issued.map((userCoupon) => (
                  <Tr key={userCoupon.id}>
                    <Td className="font-mono text-[13px]">{userCoupon.code}</Td>
                    <Td className="text-muted">{userCoupon.coupon.title}</Td>
                    <Td>
                      <Link
                        href={`/panel/uyeler/${userCoupon.user.id}`}
                        className="text-foreground hover:text-accent"
                      >
                        {userCoupon.user.fullName}
                      </Link>
                      <span className="block text-xs text-subtle">
                        {userCoupon.user.email}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-muted">
                      {formatShortDate(userCoupon.issuedAt)}
                    </Td>
                    <Td>
                      {userCoupon.usedAt ? (
                        <Badge tone="neutral">
                          {formatDate(userCoupon.usedAt)}
                        </Badge>
                      ) : (
                        <Badge tone="success">Kullanılmadı</Badge>
                      )}
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
