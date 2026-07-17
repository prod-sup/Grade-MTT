"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "../actions";
import { GOLD_BUTTON, TEXT_BODY, TEXT_PRIMARY } from "@/lib/ui/premium";

const initialState: FormState = {};

const inputCls =
  `rounded-xl border border-gray-300 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.04] px-3 py-2 ${TEXT_PRIMARY} outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#d4af37]/50 focus:bg-white dark:focus:bg-white/[0.06]`;

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>E-mail</span>
        <input type="email" name="email" required autoFocus className={inputCls} />
      </label>

      {state.message ? (
        <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {state.message}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`mt-2 px-4 py-2.5 disabled:opacity-60 ${GOLD_BUTTON}`}>
        {pending ? "Enviando…" : "Enviar link de redefinição"}
      </button>
    </form>
  );
}
