import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/domain/enums";
import { prisma } from "@/lib/prisma";

export type ApplicationFilters = {
  q: string;
  status: ApplicationStatus | "";
  city: string;
  roleId: string;
  minMembers: number | null;
  maxMembers: number | null;
};

type RawParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function positiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseApplicationFilters(params: RawParams): ApplicationFilters {
  const status = single(params.durum);
  return {
    q: single(params.q),
    status: (APPLICATION_STATUSES as readonly string[]).includes(status)
      ? (status as ApplicationStatus)
      : "",
    city: single(params.sehir),
    roleId: single(params.rol),
    minMembers: positiveInt(single(params.minUye)),
    maxMembers: positiveInt(single(params.maxUye)),
  };
}

export function buildApplicationWhere(
  filters: ApplicationFilters,
): Prisma.ApplicationWhereInput {
  const where: Prisma.ApplicationWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.city) where.city = filters.city;
  if (filters.roleId) {
    where.members = { some: { musicalRoleId: filters.roleId } };
  }

  if (filters.minMembers !== null || filters.maxMembers !== null) {
    where.memberCount = {
      ...(filters.minMembers !== null ? { gte: filters.minMembers } : {}),
      ...(filters.maxMembers !== null ? { lte: filters.maxMembers } : {}),
    };
  }

  if (filters.q) {
    where.OR = [
      { groupName: { contains: filters.q } },
      { reference: { contains: filters.q } },
      { members: { some: { fullName: { contains: filters.q } } } },
    ];
  }

  return where;
}

/** Filtre formundaki şehir listesi — yalnızca başvurusu olan şehirler. */
export async function getApplicationCities() {
  const rows = await prisma.application.findMany({
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" },
  });
  return rows.map((row) => row.city);
}

export const APPLICATION_PAGE_SIZE = 25;

export async function listApplications(
  filters: ApplicationFilters,
  page: number,
) {
  const where = buildApplicationWhere(filters);
  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * APPLICATION_PAGE_SIZE,
      take: APPLICATION_PAGE_SIZE,
      include: {
        contactUser: { select: { fullName: true, email: true, phone: true } },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return { items, total, pageCount: Math.max(1, Math.ceil(total / APPLICATION_PAGE_SIZE)) };
}

/** Excel dışa aktarımı için tüm eşleşen kayıtlar, üye detaylarıyla. */
export async function listApplicationsForExport(filters: ApplicationFilters) {
  return prisma.application.findMany({
    where: buildApplicationWhere(filters),
    orderBy: { submittedAt: "desc" },
    include: {
      contactUser: { select: { fullName: true, email: true, phone: true } },
      members: {
        include: { musicalRole: { select: { name: true } } },
      },
    },
  });
}
