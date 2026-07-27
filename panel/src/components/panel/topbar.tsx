import { LogOut } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { SessionPayload } from "@/lib/auth/session";

function initials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
    .join("");
}

export function Topbar({ session }: { session: SessionPayload }) {
  return (
    <header className="flex items-center justify-end gap-3 border-b border-line bg-surface px-5 py-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
        >
          {initials(session.fullName)}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-[13px] font-medium text-foreground">
            {session.fullName}
          </span>
          <span className="block text-[11px] text-subtle">{session.email}</span>
        </span>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[13px] text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <LogOut className="size-3.5" aria-hidden />
          Çıkış
        </button>
      </form>
    </header>
  );
}
