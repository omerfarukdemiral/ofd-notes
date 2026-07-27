import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import type { UserRole } from "@/lib/domain/enums";

export const SESSION_COOKIE = "mh_panel_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 saat

export type SessionPayload = {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET en az 32 karakter olmalı. .env dosyasını kontrol edin.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/**
 * Token'ı doğrular. Middleware (edge runtime) de bunu kullandığı için
 * yalnızca jose'a bağlı — Node API'si veya veritabanı çağrısı yok.
 */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.fullName !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "MEMBER")
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
