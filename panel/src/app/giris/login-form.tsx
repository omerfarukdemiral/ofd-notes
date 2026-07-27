"use client";

import { useActionState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "@/lib/actions/auth";
import { IDLE } from "@/lib/actions/types";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, IDLE);

  return (
    <Card>
      <CardBody>
        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />

          <Field
            label="E-posta"
            htmlFor="email"
            required
            error={state.fieldErrors?.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="admin@muzikhackathon.com"
              required
            />
          </Field>

          <Field
            label="Şifre"
            htmlFor="password"
            required
            error={state.fieldErrors?.password}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>

          <FormMessage state={state} />

          <SubmitButton className="w-full" pendingLabel="Giriş yapılıyor…">
            Giriş yap
          </SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
