import type { Metadata } from "next";
import { Music4 } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Giriş" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Music4 className="size-4.5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold">Müzik Hackathon</span>
            <span className="block text-xs text-subtle">Yönetim Paneli</span>
          </span>
        </div>

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs text-subtle">
          Yalnızca yönetici hesapları bu panele giriş yapabilir.
        </p>
      </div>
    </main>
  );
}
