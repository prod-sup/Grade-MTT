"use client";

import { useActionState } from "react";
import { completeSignup, type FormState } from "../actions";
import { BORDER_SUBTLE, GOLD_BUTTON, TEXT_BODY, TEXT_PRIMARY, TEXT_SECONDARY } from "@/lib/ui/premium";

const initialState: FormState = {};

const inputCls =
  `rounded-xl border border-gray-300 dark:border-white/[0.1] bg-gray-50 dark:bg-white/[0.04] px-3 py-2 ${TEXT_PRIMARY} outline-none transition-colors placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#d4af37]/50 focus:bg-white dark:focus:bg-white/[0.06]`;

export function SignupForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(completeSignup, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>E-mail convidado</span>
        <p className={`rounded-xl border ${BORDER_SUBTLE} bg-gray-50 dark:bg-white/[0.02] px-3 py-2 ${TEXT_SECONDARY}`}>
          {email}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>Nome do responsável</span>
        <input name="contactName" required autoFocus className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>Clube / Liga / Agente</span>
        <input name="clubName" required className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>Senha</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>Confirmar senha</span>
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
        {pending ? "Criando conta…" : "Criar conta"}
      </button>
    </form>
  );
}
