import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth/session";
import type { ApplicationStatus } from "@/lib/domain/enums";
import {
  APPLICATION_STATUS_LABEL,
  APPLICATION_TYPE_LABEL,
} from "@/lib/domain/labels";
import {
  listApplicationsForExport,
  parseApplicationFilters,
} from "@/lib/queries/applications";
import { calculateAge, formatDateTime } from "@/lib/utils";

// exceljs Node API'lerine bağlı — edge runtime'da çalışmaz.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Bu yol middleware matcher'ının dışında; yetki kontrolü burada yapılmalı.
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const filters = parseApplicationFilters(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  const applications = await listApplicationsForExport(filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Müzik Hackathon Paneli";
  workbook.created = new Date();

  const groupSheet = workbook.addWorksheet("Gruplar");
  groupSheet.columns = [
    { header: "Referans", key: "reference", width: 16 },
    { header: "Grup Adı", key: "groupName", width: 28 },
    { header: "Tür", key: "type", width: 12 },
    { header: "Şehir", key: "city", width: 16 },
    { header: "Üye Sayısı", key: "memberCount", width: 12 },
    { header: "Durum", key: "status", width: 14 },
    { header: "İletişim Sorumlusu", key: "contactName", width: 24 },
    { header: "E-posta", key: "contactEmail", width: 28 },
    { header: "Telefon", key: "contactPhone", width: 18 },
    { header: "Demo Dosyası", key: "demoFile", width: 30 },
    { header: "Demo Linki", key: "demoLink", width: 36 },
    { header: "KVKK Onayı", key: "kvkk", width: 22 },
    { header: "FSEK Onayı", key: "fsek", width: 22 },
    { header: "Başvuru Tarihi", key: "submittedAt", width: 22 },
  ];

  const memberSheet = workbook.addWorksheet("Üyeler");
  memberSheet.columns = [
    { header: "Grup Referansı", key: "reference", width: 16 },
    { header: "Grup Adı", key: "groupName", width: 28 },
    { header: "Ad Soyad", key: "fullName", width: 24 },
    { header: "Yaş", key: "age", width: 8 },
    { header: "Şehir", key: "city", width: 16 },
    { header: "Rol", key: "role", width: 18 },
    { header: "E-posta", key: "email", width: 28 },
    { header: "Telefon", key: "phone", width: 18 },
    { header: "İletişim Sorumlusu", key: "isContact", width: 18 },
  ];

  for (const application of applications) {
    groupSheet.addRow({
      reference: application.reference,
      groupName: application.groupName,
      type:
        APPLICATION_TYPE_LABEL[
          application.type as keyof typeof APPLICATION_TYPE_LABEL
        ] ?? application.type,
      city: application.city,
      memberCount: application.memberCount,
      status:
        APPLICATION_STATUS_LABEL[application.status as ApplicationStatus] ??
        application.status,
      contactName: application.contactUser.fullName,
      contactEmail: application.contactUser.email,
      contactPhone: application.contactUser.phone,
      demoFile: application.demoFileName ?? "",
      demoLink: application.demoLinkUrl ?? "",
      kvkk: formatDateTime(application.kvkkAcceptedAt),
      fsek: formatDateTime(application.fsekAcceptedAt),
      submittedAt: formatDateTime(application.submittedAt),
    });

    for (const member of application.members) {
      memberSheet.addRow({
        reference: application.reference,
        groupName: application.groupName,
        fullName: member.fullName,
        age: calculateAge(member.birthDate) ?? "",
        city: member.city,
        role: member.musicalRole?.name ?? member.musicalRoleOther ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        isContact: member.isContact ? "Evet" : "Hayır",
      });
    }
  }

  for (const sheet of [groupSheet, memberSheet]) {
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columnCount },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="basvurular-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
