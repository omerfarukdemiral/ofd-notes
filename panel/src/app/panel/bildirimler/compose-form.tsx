"use client";

import { useActionState, useState } from "react";
import { CardBody, CardFooter } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendBulkNotificationAction } from "@/lib/actions/notifications";
import { IDLE } from "@/lib/actions/types";
import { APPLICATION_STATUSES, NOTIFICATION_CHANNELS } from "@/lib/domain/enums";
import {
  APPLICATION_STATUS_LABEL,
  NOTIFICATION_CHANNEL_LABEL,
} from "@/lib/domain/labels";

const AUDIENCES = [
  { value: "ALL_MEMBERS", label: "Tüm üyeler" },
  { value: "APPLICATION_STATUS", label: "Başvuru durumuna göre" },
  { value: "EVENT_REGISTRANTS", label: "Etkinlik katılımcıları" },
] as const;

export function ComposeForm({
  events,
}: {
  events: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(sendBulkNotificationAction, IDLE);
  const [audience, setAudience] = useState<string>("ALL_MEMBERS");
  const [channel, setChannel] = useState<string>("EMAIL");

  return (
    <form action={action}>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kanal" htmlFor="channel" required>
            <Select
              id="channel"
              name="channel"
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
            >
              {NOTIFICATION_CHANNELS.map((option) => (
                <option key={option} value={option}>
                  {NOTIFICATION_CHANNEL_LABEL[option]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Hedef kitle" htmlFor="audience" required>
            <Select
              id="audience"
              name="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
            >
              {AUDIENCES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {audience === "APPLICATION_STATUS" ? (
            <Field
              label="Başvuru durumu"
              htmlFor="applicationStatus"
              required
              error={state.fieldErrors?.applicationStatus}
            >
              <Select
                id="applicationStatus"
                name="applicationStatus"
                defaultValue="FINALIST"
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {APPLICATION_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="applicationStatus" value="" />
          )}

          {audience === "EVENT_REGISTRANTS" ? (
            <Field
              label="Etkinlik"
              htmlFor="eventId"
              required
              error={state.fieldErrors?.eventId}
            >
              <Select id="eventId" name="eventId" defaultValue="">
                <option value="">Seçin…</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="eventId" value="" />
          )}
        </div>

        {channel === "EMAIL" ? (
          <Field label="Konu" htmlFor="subject">
            <Input
              id="subject"
              name="subject"
              placeholder="Müzik Hackathon — final gecesi bilgilendirmesi"
            />
          </Field>
        ) : null}

        <Field
          label="Mesaj"
          htmlFor="body"
          required
          hint={
            channel === "SMS"
              ? "SMS kısa tutulmalı; uzun metinler birden fazla mesaj olarak faturalanır."
              : undefined
          }
          error={state.fieldErrors?.body}
        >
          <Textarea id="body" name="body" required className="min-h-32" />
        </Field>

        <FormMessage state={state} />
      </CardBody>
      <CardFooter>
        <SubmitButton size="sm" pendingLabel="Gönderiliyor…">
          Gönder
        </SubmitButton>
      </CardFooter>
    </form>
  );
}
