"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./button";

type Props = Omit<React.ComponentProps<typeof Button>, "type"> & {
  pendingLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "Kaydediliyor…",
  disabled,
  ...props
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
