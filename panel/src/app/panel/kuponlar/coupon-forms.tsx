"use client";

import { useActionState } from "react";
import { CardBody, CardFooter } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { createCouponAction, issueCouponAction } from "@/lib/actions/coupons";
import { IDLE } from "@/lib/actions/types";
import { COUPON_TRIGGERS, DISCOUNT_TYPES } from "@/lib/domain/enums";
import { COUPON_TRIGGER_LABEL, DISCOUNT_TYPE_LABEL } from "@/lib/domain/labels";

export function CouponForm() {
  const [state, action] = useActionState(createCouponAction, IDLE);

  return (
    <form action={action}>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Kupon başlığı"
            htmlFor="title"
            required
            className="sm:col-span-2"
            error={state.fieldErrors?.title}
          >
            <Input
              id="title"
              name="title"
              placeholder="Zuhal Müzik %15 indirim"
              required
            />
          </Field>

          <Field
            label="Kod ön eki"
            htmlFor="codePrefix"
            required
            hint="Kodlar ZM-XXXXXX biçiminde üretilir."
            error={state.fieldErrors?.codePrefix}
          >
            <Input
              id="codePrefix"
              name="codePrefix"
              placeholder="ZM"
              required
              className="uppercase"
            />
          </Field>

          <Field label="Tetikleyici" htmlFor="trigger" required>
            <Select id="trigger" name="trigger" defaultValue="MANUAL">
              {COUPON_TRIGGERS.map((trigger) => (
                <option key={trigger} value={trigger}>
                  {COUPON_TRIGGER_LABEL[trigger]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="İndirim tipi" htmlFor="discountType" required>
            <Select id="discountType" name="discountType" defaultValue="PERCENT">
              {DISCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DISCOUNT_TYPE_LABEL[type]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="İndirim değeri"
            htmlFor="discountValue"
            required
            hint="Yüzde için 1-100, tutar için TL."
            error={state.fieldErrors?.discountValue}
          >
            <Input
              id="discountValue"
              name="discountValue"
              type="number"
              min={1}
              defaultValue={15}
              required
            />
          </Field>

          <Field
            label="Son geçerlilik"
            htmlFor="validUntil"
            hint="Boş bırakılırsa süresiz."
          >
            <Input id="validUntil" name="validUntil" type="date" />
          </Field>

          <Field
            label="Dağıtım limiti"
            htmlFor="issueLimit"
            hint="Boş bırakılırsa sınırsız."
          >
            <Input id="issueLimit" name="issueLimit" type="number" min={1} />
          </Field>

          <Field label="Açıklama" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" />
          </Field>
        </div>

        <FormMessage state={state} />
      </CardBody>
      <CardFooter>
        <SubmitButton size="sm">Kupon oluştur</SubmitButton>
      </CardFooter>
    </form>
  );
}

export function IssueCouponForm({
  coupons,
}: {
  coupons: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(issueCouponAction, IDLE);

  return (
    <form action={action}>
      <CardBody className="space-y-4">
        <Field label="Kupon" htmlFor="couponId" required>
          <Select id="couponId" name="couponId" required>
            {coupons.length === 0 ? (
              <option value="">Önce bir kupon oluşturun</option>
            ) : (
              coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.title}
                </option>
              ))
            )}
          </Select>
        </Field>

        <Field
          label="Üye e-postası"
          htmlFor="email"
          required
          error={state.fieldErrors?.email}
        >
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="uye@example.com"
            required
          />
        </Field>

        <FormMessage state={state} />
      </CardBody>
      <CardFooter>
        <SubmitButton size="sm" disabled={coupons.length === 0}>
          Kuponu tanımla
        </SubmitButton>
      </CardFooter>
    </form>
  );
}
