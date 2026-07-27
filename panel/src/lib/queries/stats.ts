import "server-only";

import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/domain/enums";

export type ApplicationStatusCounts = Record<ApplicationStatus, number> & {
  total: number;
};

export async function getApplicationStatusCounts(): Promise<ApplicationStatusCounts> {
  const grouped = await prisma.application.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    APPLICATION_STATUSES.map((status) => [status, 0]),
  ) as Record<ApplicationStatus, number>;

  let total = 0;
  for (const row of grouped) {
    const status = row.status as ApplicationStatus;
    if (status in counts) {
      counts[status] = row._count._all;
    }
    total += row._count._all;
  }

  return { ...counts, total };
}

export async function getPanelOverview() {
  const [
    statusCounts,
    memberCount,
    verifiedMemberCount,
    publishedEventCount,
    registrationCount,
    issuedCouponCount,
    usedCouponCount,
    settings,
  ] = await Promise.all([
    getApplicationStatusCounts(),
    prisma.user.count({ where: { role: "MEMBER" } }),
    prisma.user.count({
      where: { role: "MEMBER", emailVerifiedAt: { not: null } },
    }),
    prisma.event.count({ where: { isPublished: true } }),
    prisma.eventRegistration.count({
      where: { status: { in: ["REGISTERED", "ATTENDED"] } },
    }),
    prisma.userCoupon.count(),
    prisma.userCoupon.count({ where: { usedAt: { not: null } } }),
    prisma.applicationSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return {
    statusCounts,
    memberCount,
    verifiedMemberCount,
    publishedEventCount,
    registrationCount,
    issuedCouponCount,
    usedCouponCount,
    settings,
  };
}

/** Başvurular şu an fiilen açık mı — kapanış tarihi de dikkate alınır. */
export function isApplicationWindowOpen(
  settings: { isOpen: boolean; opensAt: Date | null; closesAt: Date | null } | null,
  now = new Date(),
) {
  if (!settings || !settings.isOpen) return false;
  if (settings.opensAt && now < settings.opensAt) return false;
  if (settings.closesAt && now > settings.closesAt) return false;
  return true;
}
