"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createMusicalRoleAction } from "@/lib/actions/form-settings";
import { IDLE } from "@/lib/actions/types";

export function RoleForm() {
  const [state, action] = useActionState(createMusicalRoleAction, IDLE);

  return (
    <form action={action} className="space-y-3">
      <div className="flex items-end gap-2">
        <Field
          label="Yeni müzikal rol"
          htmlFor="name"
          className="flex-1"
          error={state.fieldErrors?.name}
        >
          <Input id="name" name="name" placeholder="Örn. Klavye" required />
        </Field>
        <SubmitButton size="md" pendingLabel="Ekleniyor…">
          Ekle
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
