"use client";

import { useActionState } from "react";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateApplicationStatusAction } from "@/lib/actions/applications";
import { IDLE } from "@/lib/actions/types";
import { APPLICATION_STATUSES, NOTIFICATION_CHANNELS } from "@/lib/domain/enums";
import {
  APPLICATION_STATUS_LABEL,
  NOTIFICATION_CHANNEL_LABEL,
} from "@/lib/domain/labels";

export function StatusForm({
  applicationId,
  currentStatus,
  reviewNote,
}: {
  applicationId: string;
  currentStatus: string;
  reviewNote: string | null;
}) {
  const [state, action] = useActionState(updateApplicationStatusAction, IDLE);

  return (
    <Card>
      <CardHeader
        title="Başvuru durumu"
        description="Durumu değiştirin ve isterseniz gruba bildirim gönderin."
      />
      <form action={action}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <CardBody className="space-y-4">
          <Field label="Durum" htmlFor="status" required>
            <Select id="status" name="status" defaultValue={currentStatus}>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {APPLICATION_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Not / mesaj"
            htmlFor="note"
            hint="Doldurulursa bildirim metni olarak da kullanılır."
            error={state.fieldErrors?.note}
          >
            <Textarea
              id="note"
              name="note"
              defaultValue={reviewNote ?? ""}
              placeholder="Değerlendirme notu…"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bildirim" htmlFor="notify">
              <Select id="notify" name="notify" defaultValue="none">
                <option value="none">Gönderme</option>
                <option value="contact">Sadece iletişim sorumlusuna</option>
                <option value="all">Kayıtlı tüm grup üyelerine</option>
              </Select>
            </Field>
            <Field label="Kanal" htmlFor="channel">
              <Select id="channel" name="channel" defaultValue="EMAIL">
                {NOTIFICATION_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {NOTIFICATION_CHANNEL_LABEL[channel]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <FormMessage state={state} />
        </CardBody>
        <CardFooter>
          <SubmitButton size="sm">Durumu güncelle</SubmitButton>
        </CardFooter>
      </form>
    </Card>
  );
}
