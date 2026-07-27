import "server-only";

import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "./session";

/**
 * Panel sayfa ve server action'larının giriş noktası.
 *
 * Middleware zaten /panel altını cookie doğrulamasıyla koruyor; buradaki
 * ikinci kontrol server action'lar için gerekli — action'lar middleware'den
 * geçmeyen ayrı bir POST yüzeyi oluşturuyor.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/giris");
  }
  if (session.role !== "ADMIN") {
    redirect("/yetkisiz");
  }
  return session;
}
