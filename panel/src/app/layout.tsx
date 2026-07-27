import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Müzik Hackathon Yönetim Paneli",
    template: "%s · Müzik Hackathon Paneli",
  },
  description:
    "Müzik Hackathon başvuru, etkinlik, üye ve kupon yönetimi için admin paneli.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
