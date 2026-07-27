"use client";

import { useActionState } from "react";
import { CardBody, CardFooter } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createEventAction, updateEventAction } from "@/lib/actions/events";
import { IDLE } from "@/lib/actions/types";
import { EVENT_TYPES } from "@/lib/domain/enums";
import { EVENT_TYPE_LABEL } from "@/lib/domain/labels";
import { toDateTimeLocalValue } from "@/lib/utils";

export type EventFormValues = {
  id?: string;
  title: string;
  description: string;
  instructor: string;
  type: string;
  startsAt: Date | null;
  durationMinutes: number;
  coverImageUrl: string | null;
  location: string | null;
  capacity: number | null;
  waitlistEnabled: boolean;
  isPublished: boolean;
};

const EMPTY: EventFormValues = {
  title: "",
  description: "",
  instructor: "",
  type: "WEBINAR",
  startsAt: null,
  durationMinutes: 60,
  coverImageUrl: null,
  location: null,
  capacity: null,
  waitlistEnabled: true,
  isPublished: false,
};

export function EventForm({
  values = EMPTY,
  submitLabel = "Kaydet",
}: {
  values?: EventFormValues;
  submitLabel?: string;
}) {
  const isEdit = Boolean(values.id);
  const [state, action] = useActionState(
    isEdit ? updateEventAction : createEventAction,
    IDLE,
  );

  return (
    <form action={action}>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Etkinlik adı"
            htmlFor="title"
            required
            className="sm:col-span-2"
            error={state.fieldErrors?.title}
          >
            <Input
              id="title"
              name="title"
              defaultValue={values.title}
              placeholder="Örn. Stüdyoda Kayıt Teknikleri"
              required
            />
          </Field>

          <Field
            label="Eğitmen / konuşmacı"
            htmlFor="instructor"
            required
            error={state.fieldErrors?.instructor}
          >
            <Input
              id="instructor"
              name="instructor"
              defaultValue={values.instructor}
              required
            />
          </Field>

          <Field label="Tür" htmlFor="type" required>
            <Select id="type" name="type" defaultValue={values.type}>
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EVENT_TYPE_LABEL[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Tarih ve saat"
            htmlFor="startsAt"
            required
            error={state.fieldErrors?.startsAt}
          >
            <Input
              id="startsAt"
              name="startsAt"
              type="datetime-local"
              defaultValue={toDateTimeLocalValue(values.startsAt)}
              required
            />
          </Field>

          <Field
            label="Süre (dakika)"
            htmlFor="durationMinutes"
            required
            error={state.fieldErrors?.durationMinutes}
          >
            <Input
              id="durationMinutes"
              name="durationMinutes"
              type="number"
              min={5}
              max={1440}
              defaultValue={values.durationMinutes}
              required
            />
          </Field>

          <Field
            label="Kontenjan"
            htmlFor="capacity"
            hint="Boş bırakılırsa sınırsız."
            error={state.fieldErrors?.capacity}
          >
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={values.capacity ?? ""}
            />
          </Field>

          <Field
            label="Yayın linki / adres"
            htmlFor="location"
            hint="Webinar için yayın bağlantısı, atölye için fiziksel adres."
          >
            <Input
              id="location"
              name="location"
              defaultValue={values.location ?? ""}
            />
          </Field>

          <Field
            label="Kapak görseli (URL)"
            htmlFor="coverImageUrl"
            className="sm:col-span-2"
            error={state.fieldErrors?.coverImageUrl}
          >
            <Input
              id="coverImageUrl"
              name="coverImageUrl"
              type="url"
              defaultValue={values.coverImageUrl ?? ""}
              placeholder="https://…"
            />
          </Field>

          <Field
            label="Açıklama"
            htmlFor="description"
            required
            className="sm:col-span-2"
            hint="Kim anlatacak, hangi konu işlenecek?"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={values.description}
              required
            />
          </Field>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <Checkbox
              name="waitlistEnabled"
              defaultChecked={values.waitlistEnabled}
            />
            <span className="text-[13px]">
              Kontenjan dolduğunda bekleme listesi açılsın
            </span>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox name="isPublished" defaultChecked={values.isPublished} />
            <span className="text-[13px]">Sitede yayınla</span>
          </label>
        </div>

        <FormMessage state={state} />
      </CardBody>

      <CardFooter>
        <SubmitButton size="sm">{submitLabel}</SubmitButton>
      </CardFooter>
    </form>
  );
}
