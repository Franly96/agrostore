"use client";

import { useActionState } from "react";
import { ProductForm, type ProductFormValues } from "@/components/agrostore";
import { FormAlert } from "@/components/form-alert";
import { type ActionState, idleState } from "@/src/lib/action-state";
import { type ProductField, validateProductDraft } from "@/src/lib/validation/product";

type State = ActionState<ProductField>;

export function ProductEditor({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  initialValues?: Partial<ProductFormValues>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, idleState as State);

  return (
    <div className="flex flex-col gap-4">
      {state.status === "error" && state.message ? <FormAlert>{state.message}</FormAlert> : null}
      <ProductForm
        title={null}
        submitLabel={submitLabel}
        initialValues={initialValues}
        action={formAction}
        pending={pending}
        validate={validateProductDraft}
        serverErrors={state.fieldErrors}
        className="max-w-none md:max-w-[560px]"
      />
    </div>
  );
}
