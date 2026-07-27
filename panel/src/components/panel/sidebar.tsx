"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Music4, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavItemActive, NAV_GROUPS } from "./nav";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-muted hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/panel"
      className="flex items-center gap-2.5 border-b border-line px-5 py-4"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
        <Music4 className="size-4" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block whitespace-nowrap text-sm font-semibold text-foreground">
          Müzik Hackathon
        </span>
        <span className="block text-[11px] text-subtle">Yönetim Paneli</span>
      </span>
    </Link>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobil başlık çubuğu */}
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menüyü aç"
          className="grid size-9 place-items-center rounded-lg border border-line-strong text-muted"
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold">Müzik Hackathon Paneli</span>
      </div>

      {/* Masaüstü sabit kenar çubuğu */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <Brand />
        <NavList />
      </aside>

      {/* Mobil çekmece */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface">
            <div className="relative">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menüyü kapat"
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
