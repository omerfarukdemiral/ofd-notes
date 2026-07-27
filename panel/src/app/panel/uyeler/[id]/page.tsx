import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type {
  ApplicationStatus,
  RegistrationStatus,
  UserRole,
} from "@/lib/domain/enums";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TONE,
  REGISTRATION_STATUS_LABEL,
  REGISTRATION_STATUS_TONE,
  USER_ROLE_LABEL,
} from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { calculateAge, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Üye detayı" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2 last:border-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      contactApplications: {
        orderBy: { submittedAt: "desc" },
        select: { id: true, groupName: true, reference: true, status: true },
      },
      applicationMembers: {
        include: {
          application: {
            select: { id: true, groupName: true, reference: true, status: true },
          },
        },
      },
      eventRegistrations: {
        orderBy: { registeredAt: "desc" },
        include: { event: { select: { id: true, title: true, startsAt: true } } },
      },
      coupons: {
        orderBy: { issuedAt: "desc" },
        include: { coupon: { select: { title: true } } },
      },
    },
  });

  if (!user) notFound();

  // Üye hem iletişim sorumlusu hem de grup üyesi olarak bağlı olabilir.
  const applications = new Map(
    [
      ...user.contactApplications,
      ...user.applicationMembers.map((member) => member.application),
    ].map((application) => [application.id, application]),
  );

  return (
    <>
      <Link
        href="/panel/uyeler"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Üyelere dön
      </Link>

      <PageHeader
        title={user.fullName}
        description={user.email}
        actions={
          <>
            <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
              {USER_ROLE_LABEL[user.role as UserRole] ?? user.role}
            </Badge>
            {user.emailVerifiedAt ? (
              <Badge tone="success">Doğrulandı</Badge>
            ) : (
              <Badge tone="warning">Doğrulama bekliyor</Badge>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader title="Üyelik bilgileri" />
          <CardBody>
            <dl>
              <Row label="Telefon">{user.phone}</Row>
              <Row label="Şehir">{user.city}</Row>
              <Row label="Doğum tarihi">
                {formatDate(user.birthDate)}
                {calculateAge(user.birthDate) !== null
                  ? ` (${calculateAge(user.birthDate)})`
                  : ""}
              </Row>
              <Row label="KVKK onayı">{formatDateTime(user.kvkkAcceptedAt)}</Row>
              <Row label="E-posta doğrulama">
                {formatDateTime(user.emailVerifiedAt)}
              </Row>
              <Row label="Telefon doğrulama">
                {formatDateTime(user.phoneVerifiedAt)}
              </Row>
              <Row label="Kayıt tarihi">{formatDateTime(user.createdAt)}</Row>
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title={`Başvurular (${applications.size})`} />
            <CardBody className="space-y-2">
              {applications.size === 0 ? (
                <p className="text-sm text-muted">Başvuru kaydı yok.</p>
              ) : (
                [...applications.values()].map((application) => (
                  <Link
                    key={application.id}
                    href={`/panel/basvurular/${application.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 transition-colors hover:bg-surface-muted/60"
                  >
                    <span>
                      <span className="block text-[13px] font-medium">
                        {application.groupName}
                      </span>
                      <span className="block text-xs text-subtle">
                        {application.reference}
                      </span>
                    </span>
                    <Badge
                      tone={
                        APPLICATION_STATUS_TONE[
                          application.status as ApplicationStatus
                        ]
                      }
                    >
                      {
                        APPLICATION_STATUS_LABEL[
                          application.status as ApplicationStatus
                        ]
                      }
                    </Badge>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={`Etkinlik kayıtları (${user.eventRegistrations.length})`}
            />
            <CardBody className="space-y-2">
              {user.eventRegistrations.length === 0 ? (
                <p className="text-sm text-muted">Etkinlik kaydı yok.</p>
              ) : (
                user.eventRegistrations.map((registration) => (
                  <Link
                    key={registration.id}
                    href={`/panel/etkinlikler/${registration.event.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5 transition-colors hover:bg-surface-muted/60"
                  >
                    <span>
                      <span className="block text-[13px] font-medium">
                        {registration.event.title}
                      </span>
                      <span className="block text-xs text-subtle">
                        {formatDateTime(registration.event.startsAt)}
                      </span>
                    </span>
                    <Badge
                      tone={
                        REGISTRATION_STATUS_TONE[
                          registration.status as RegistrationStatus
                        ]
                      }
                    >
                      {
                        REGISTRATION_STATUS_LABEL[
                          registration.status as RegistrationStatus
                        ]
                      }
                    </Badge>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={`Kuponlar (${user.coupons.length})`} />
            <CardBody className="space-y-2">
              {user.coupons.length === 0 ? (
                <p className="text-sm text-muted">Kupon tanımlı değil.</p>
              ) : (
                user.coupons.map((userCoupon) => (
                  <div
                    key={userCoupon.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-line px-4 py-2.5"
                  >
                    <span>
                      <span className="block text-[13px] font-medium">
                        {userCoupon.coupon.title}
                      </span>
                      <span className="block font-mono text-xs text-subtle">
                        {userCoupon.code}
                      </span>
                    </span>
                    <Badge tone={userCoupon.usedAt ? "neutral" : "success"}>
                      {userCoupon.usedAt
                        ? `Kullanıldı · ${formatDate(userCoupon.usedAt)}`
                        : "Kullanılabilir"}
                    </Badge>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
