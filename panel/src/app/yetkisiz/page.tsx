import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Yetkisiz erişim" };

export default function UnauthorizedPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-danger-soft text-danger">
          <ShieldAlert className="size-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Bu sayfaya erişemezsiniz</h1>
        <p className="mt-2 text-sm text-muted">
          Yönetim paneli yalnızca admin yetkisine sahip hesaplara açık. Yetki
          gerektiğini düşünüyorsanız site yöneticisiyle iletişime geçin.
        </p>
        <LinkButton href="/giris" variant="secondary" className="mt-6">
          Giriş ekranına dön
        </LinkButton>
      </div>
    </main>
  );
}
