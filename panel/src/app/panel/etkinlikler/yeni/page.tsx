import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "Yeni etkinlik" };

export default function NewEventPage() {
  return (
    <>
      <Link
        href="/panel/etkinlikler"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Etkinliklere dön
      </Link>

      <PageHeader
        title="Yeni etkinlik"
        description="Webinar veya atölye oluşturun. Taslak olarak kaydedip sonra yayınlayabilirsiniz."
      />

      <Card className="max-w-3xl">
        <CardHeader title="Etkinlik bilgileri" />
        <EventForm submitLabel="Etkinliği oluştur" />
      </Card>
    </>
  );
}
