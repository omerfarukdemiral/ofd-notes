"use client";

import { useActionState, useState } from "react";
import { CardBody, CardFooter } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createFormFieldAction } from "@/lib/actions/form-settings";
import { IDLE } from "@/lib/actions/types";
import { FORM_FIELD_SCOPES, FORM_FIELD_TYPES } from "@/lib/domain/enums";
import {
  FORM_FIELD_SCOPE_LABEL,
  FORM_FIELD_TYPE_LABEL,
} from "@/lib/domain/labels";

export function FieldForm() {
  const [state, action] = useActionState(createFormFieldAction, IDLE);
  const [type, setType] = useState<string>("TEXT");

  return (
    <form action={action}>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Alan adı"
            htmlFor="label"
            required
            error={state.fieldErrors?.label}
          >
            <Input
              id="label"
              name="label"
              placeholder="Örn. Sahne deneyimi"
              required
            />
          </Field>

          <Field label="Alan tipi" htmlFor="type" required>
            <Select
              id="type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {FORM_FIELD_TYPES.map((fieldType) => (
                <option key={fieldType} value={fieldType}>
                  {FORM_FIELD_TYPE_LABEL[fieldType]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Kapsam"
            htmlFor="scope"
            hint="Grup geneli mi, her üye için ayrı mı sorulacak?"
          >
            <Select id="scope" name="scope" defaultValue="GROUP">
              {FORM_FIELD_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {FORM_FIELD_SCOPE_LABEL[scope]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Yardım metni" htmlFor="helpText">
            <Input
              id="helpText"
              name="helpText"
              placeholder="Form altında görünecek açıklama"
            />
          </Field>
        </div>

        {type === "SELECT" ? (
          <Field
            label="Seçenekler"
            htmlFor="options"
            hint="Her satıra bir seçenek yazın."
            error={state.fieldErrors?.options}
          >
            <Textarea id="options" name="options" placeholder={"Rock\nPop\nCaz"} />
          </Field>
        ) : null}

        <label className="flex items-center gap-3">
          <Checkbox name="required" />
          <span className="text-[13px]">Bu alan zorunlu olsun</span>
        </label>

        <FormMessage state={state} />
      </CardBody>
      <CardFooter>
        <SubmitButton size="sm" pendingLabel="Ekleniyor…">
          Alan ekle
        </SubmitButton>
      </CardFooter>
    </form>
  );
}
