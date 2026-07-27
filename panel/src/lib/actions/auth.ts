"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie, destroySessionCookie } from "@/lib/auth/session";
import { fail, fromZodError, type ActionState } from "./types";

const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(1, "Şifre zorunlu."),
  next: z.string().optional(),
});

/** Kullanıcı adı sızdırmamak için tüm başarısız girişler aynı mesajı döner. */
const GENERIC_ERROR = "E-posta veya şifre hatalı.";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return fromZodError(parsed.error);
  }

  const { email, password, next } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    return fail(GENERIC_ERROR);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return fail(GENERIC_ERROR);
  }

  if (user.role !== "ADMIN") {
    return fail("Bu hesabın panele erişim yetkisi yok.");
  }

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: "ADMIN",
  });

  // Açık yönlendirme (open redirect) olmaması için yalnızca site içi yollar.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/panel";
  redirect(target);
}

export async function logoutAction() {
  await destroySessionCookie();
  redirect("/giris");
}
