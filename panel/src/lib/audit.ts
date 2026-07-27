import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Admin işlemlerini kayıt altına alır. Yasal/denetim gereksinimi için
 * (kim, ne zaman, neyi değiştirdi) tek yerden okunabilir olmalı.
 */
export async function recordAudit(entry: {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metaJson: entry.meta ? JSON.stringify(entry.meta) : null,
    },
  });
}
