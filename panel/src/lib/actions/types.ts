import type { ZodError } from "zod";

/** Tüm server action'ların ortak dönüş tipi — useActionState ile kullanılır. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const IDLE: ActionState = { status: "idle" };

export function ok(message?: string): ActionState {
  return { status: "success", message };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors };
}

/** Zod hatalarını alan başına tek mesaja indirger. */
export function fromZodError(error: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    fieldErrors[key] ??= issue.message;
  }
  return {
    status: "error",
    message: "Formda eksik veya hatalı alanlar var.",
    fieldErrors,
  };
}
