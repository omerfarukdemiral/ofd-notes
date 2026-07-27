"use client";

import { useActionState } from "react";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateApplicationSettingsAction } from "@/lib/actions/form-settings";
import { IDLE } from "@/lib/actions/types";
import { toDateTimeLocalValue } from "@/lib/utils";

type Settings = {
  isOpen: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  minMembers: number;
  maxMembers: number;
  demoRequired: boolean;
} | null;

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState(updateApplicationSettingsAction, IDLE);

  return (
    <Card>
      <CardHeader
        title="Başvuru penceresi"
        description="Formu açıp kapatın, tarih ve grup büyüklüğü sınırlarını belirleyin."
      />
      <form action={action}>
        <CardBody className="space-y-5">
          <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-muted/40 px-4 py-3">
            <Checkbox
              name="isOpen"
              defaultChecked={settings?.isOpen ?? false}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium">
                Başvurular açık
              </span>
              <span className="block text-xs text-muted">
                Kapalıyken üyeler başvuru formunu göremez.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Açılış tarihi"
              htmlFor="opensAt"
              hint="Boş bırakılırsa hemen açılır."
              error={state.fieldErrors?.opensAt}
            >
              <Input
                id="opensAt"
                name="opensAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(settings?.opensAt)}
              />
            </Field>

            <Field
              label="Kapanış tarihi"
              htmlFor="closesAt"
              hint="Bu tarih geçtiğinde form otomatik kapanır."
              error={state.fieldErrors?.closesAt}
            >
              <Input
                id="closesAt"
                name="closesAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(settings?.closesAt)}
              />
            </Field>

            <Field
              label="Minimum üye"
              htmlFor="minMembers"
              required
              error={state.fieldErrors?.minMembers}
            >
              <Input
                id="minMembers"
                name="minMembers"
                type="number"
                min={1}
                max={50}
                defaultValue={settings?.minMembers ?? 2}
                required
              />
            </Field>

            <Field
              label="Maksimum üye"
              htmlFor="maxMembers"
              required
              error={state.fieldErrors?.maxMembers}
            >
              <Input
                id="maxMembers"
                name="maxMembers"
                type="number"
                min={1}
                max={50}
                defaultValue={settings?.maxMembers ?? 6}
                required
              />
            </Field>
          </div>

          <label className="flex items-center gap-3">
            <Checkbox
              name="demoRequired"
              defaultChecked={settings?.demoRequired ?? true}
            />
            <span className="text-[13px]">Demo yüklemesi zorunlu olsun</span>
          </label>

          <FormMessage state={state} />
        </CardBody>
        <CardFooter>
          <SubmitButton size="sm">Ayarları kaydet</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
