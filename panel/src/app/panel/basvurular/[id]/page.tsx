import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyRow, Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { ApplicationStatus } from "@/lib/domain/enums";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_STATUS_TONE,
  APPLICATION_TYPE_LABEL,
} from "@/lib/domain/labels";
import { prisma } from "@/lib/prisma";
import { calculateAge, formatDateTime, parseJson } from "@/lib/utils";
import { StatusForm } from "./status-form";

export const metadata: Metadata = { title: "Başvuru detayı" };

function DefinitionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line py-2 last:border-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="text-[13px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      contactUser: true,
      members: {
        include: { musicalRole: { select: { name: true } } },
        orderBy: [{ isContact: "desc" }, { fullName: "asc" }],
      },
      statusLogs: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { fullName: true } } },
      },
    },
  });

  if (!application) notFound();

  const status = application.status as ApplicationStatus;
  const extraFields = parseJson<Record<string, string>>(
    application.extraFieldsJson,
    {},
  );
  const extraEntries = Object.entries(extraFields);

  return (
    <>
      <Link
        href="/panel/basvurular"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Başvurulara dön
      </Link>

      <PageHeader
        title={application.groupName}
        description={`${application.reference} · ${formatDateTime(application.submittedAt)} tarihinde gönderildi`}
        actions={
          <Badge tone={APPLICATION_STATUS_TONE[status]}>
            {APPLICATION_STATUS_LABEL[status]}
          </Badge>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={`Grup üyeleri (${application.members.length})`} />
            <TableWrap>
              <Table className="min-w-[640px]">
                <thead>
                  <tr>
                    <Th>Ad Soyad</Th>
                    <Th>Yaş</Th>
                    <Th>Şehir</Th>
                    <Th>Rol</Th>
                    <Th>İletişim</Th>
                  </tr>
                </thead>
                <tbody>
                  {application.members.length === 0 ? (
                    <EmptyRow colSpan={5}>Üye kaydı yok.</EmptyRow>
                  ) : (
                    application.members.map((member) => (
                      <Tr key={member.id}>
                        <Td>
                          <span className="font-medium">{member.fullName}</span>
                          {member.isContact ? (
                            <Badge tone="info" className="ml-2">
                              İletişim
                            </Badge>
                          ) : null}
                        </Td>
                        <Td className="tabular-nums text-muted">
                          {calculateAge(member.birthDate) ?? "—"}
                        </Td>
                        <Td className="text-muted">{member.city}</Td>
                        <Td className="text-muted">
                          {member.musicalRole?.name ??
                            member.musicalRoleOther ??
                            "—"}
                        </Td>
                        <Td className="text-muted">
                          <span className="block text-xs">
                            {member.email ?? "—"}
                          </span>
                          <span className="block text-xs">
                            {member.phone ?? "—"}
                          </span>
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
              title="Demo"
              description="Panelden dinleyin veya indirin."
            />
            <CardBody className="space-y-3">
              {application.demoFileUrl ? (
                <div className="space-y-2">
                  <audio
                    controls
                    preload="none"
                    src={application.demoFileUrl}
                    className="w-full"
                  />
                  <a
                    href={application.demoFileUrl}
                    download
                    className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
                  >
                    <Download className="size-3.5" aria-hidden />
                    {application.demoFileName ?? "Demo dosyasını indir"}
                  </a>
                </div>
              ) : null}

              {application.demoLinkUrl ? (
                <a
                  href={application.demoLinkUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {application.demoLinkUrl}
                </a>
              ) : null}

              {!application.demoFileUrl && application.demoFileName ? (
                <p className="text-sm text-muted">
                  Yüklenen dosya:{" "}
                  <span className="font-mono">{application.demoFileName}</span>
                  <span className="mt-1 block text-xs text-subtle">
                    Dosya depolama henüz bağlı değil; oynatma ve indirme,
                    yükleme entegrasyonu tamamlanınca aktifleşir.
                  </span>
                </p>
              ) : null}

              {!application.demoFileUrl &&
              !application.demoFileName &&
              !application.demoLinkUrl ? (
                <p className="text-sm text-muted">Demo eklenmemiş.</p>
              ) : null}
            </CardBody>
          </Card>

          {extraEntries.length > 0 ? (
            <Card>
              <CardHeader
                title="Ek form alanları"
                description="Form Ayarları'nda tanımlanan alanların cevapları."
              />
              <CardBody>
                <dl>
                  {extraEntries.map(([key, value]) => (
                    <DefinitionRow key={key} label={key}>
                      {String(value) || "—"}
                    </DefinitionRow>
                  ))}
                </dl>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Durum geçmişi" />
            <CardBody>
              {application.statusLogs.length === 0 ? (
                <p className="text-sm text-muted">Henüz değişiklik yok.</p>
              ) : (
                <ol className="space-y-3">
                  {application.statusLogs.map((log) => (
                    <li
                      key={log.id}
                      className="border-l-2 border-line pl-3 text-[13px]"
                    >
                      <p className="text-foreground">
                        {log.fromStatus
                          ? `${APPLICATION_STATUS_LABEL[log.fromStatus as ApplicationStatus]} → `
                          : ""}
                        <strong>
                          {
                            APPLICATION_STATUS_LABEL[
                              log.toStatus as ApplicationStatus
                            ]
                          }
                        </strong>
                      </p>
                      <p className="text-xs text-subtle">
                        {formatDateTime(log.createdAt)}
                        {log.changedBy ? ` · ${log.changedBy.fullName}` : ""}
                      </p>
                      {log.note ? (
                        <p className="mt-1 text-muted">{log.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <StatusForm
            applicationId={application.id}
            currentStatus={application.status}
            reviewNote={application.reviewNote}
          />

          <Card>
            <CardHeader title="Başvuru bilgileri" />
            <CardBody>
              <dl>
                <DefinitionRow label="Referans">
                  {application.reference}
                </DefinitionRow>
                <DefinitionRow label="Tür">
                  {APPLICATION_TYPE_LABEL[
                    application.type as keyof typeof APPLICATION_TYPE_LABEL
                  ] ?? application.type}
                </DefinitionRow>
                <DefinitionRow label="Şehir">{application.city}</DefinitionRow>
                <DefinitionRow label="Üye sayısı">
                  {application.memberCount}
                </DefinitionRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="İletişim sorumlusu" />
            <CardBody>
              <dl>
                <DefinitionRow label="Ad Soyad">
                  <Link
                    href={`/panel/uyeler/${application.contactUser.id}`}
                    className="text-accent hover:underline"
                  >
                    {application.contactUser.fullName}
                  </Link>
                </DefinitionRow>
                <DefinitionRow label="E-posta">
                  {application.contactUser.email}
                </DefinitionRow>
                <DefinitionRow label="Telefon">
                  {application.contactUser.phone}
                </DefinitionRow>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-success" aria-hidden />
                  Yasal onaylar
                </span>
              }
              description="Onay kutularının işaretlendiği an — yasal kayıt."
            />
            <CardBody>
              <dl>
                <DefinitionRow label="KVKK Aydınlatma">
                  {formatDateTime(application.kvkkAcceptedAt)}
                </DefinitionRow>
                <DefinitionRow label="FSEK / Eser hakları">
                  {formatDateTime(application.fsekAcceptedAt)}
                </DefinitionRow>
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
