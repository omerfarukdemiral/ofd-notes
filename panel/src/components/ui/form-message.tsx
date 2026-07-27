import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/types";

export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg px-3 py-2 text-[13px]",
        state.status === "success"
          ? "bg-success-soft text-success"
          : "bg-danger-soft text-danger",
      )}
    >
      {state.message}
    </p>
  );
}
