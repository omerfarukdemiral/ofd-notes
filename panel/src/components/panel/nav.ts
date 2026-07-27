import {
  BellRing,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Settings2,
  Ticket,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Alt yollar da bu bağlantıyı aktif gösterir. */
  matchPrefix?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Genel",
    items: [{ href: "/panel", label: "Gösterge Paneli", icon: LayoutDashboard }],
  },
  {
    title: "Hackathon",
    items: [
      {
        href: "/panel/basvurular",
        label: "Başvurular",
        icon: FileText,
        matchPrefix: true,
      },
      { href: "/panel/form-ayarlari", label: "Form Ayarları", icon: Settings2 },
      {
        href: "/panel/etkinlikler",
        label: "Webinar & Atölye",
        icon: CalendarDays,
        matchPrefix: true,
      },
    ],
  },
  {
    title: "Topluluk",
    items: [
      { href: "/panel/uyeler", label: "Üyeler", icon: Users, matchPrefix: true },
      { href: "/panel/kuponlar", label: "Kuponlar", icon: Ticket },
      { href: "/panel/bildirimler", label: "Bildirimler", icon: BellRing },
    ],
  },
  {
    title: "Analiz",
    items: [
      { href: "/panel/raporlar", label: "Raporlar", icon: FileSpreadsheet },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}
