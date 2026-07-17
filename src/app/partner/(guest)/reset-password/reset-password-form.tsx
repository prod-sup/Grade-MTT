"use client";

import { useActionState } from "react";
import { resetPassword, type FormState } from "../actions";
import { GOLD_BUTTON } from "@/lib/ui/premium";

const initialState: FormState = {};

const inputCls =
  "rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#d4af37]/50 focus:bg-white/[0.06]";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">Nova senha</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">Confirmar nova senha</span>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`mt-2 px-4 py-2.5 disabled:opacity-60 ${GOLD_BUTTON}`}>
        {pending ? "Salvando…" : "Redefinir senha"}
      </button>
    </form>
  );
}
