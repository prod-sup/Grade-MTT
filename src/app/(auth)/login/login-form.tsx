"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";
import { BORDER_SUBTLE, GOLD_BUTTON, TEXT_BODY, TEXT_PRIMARY } from "@/lib/ui/premium";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>E-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          autoFocus
          className={`rounded-md border ${BORDER_SUBTLE} bg-gray-50 dark:bg-white/[0.04] px-3 py-2 outline-none transition-colors focus:border-gray-400 dark:focus:border-white/[0.2] ${TEXT_PRIMARY}`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className={`font-medium ${TEXT_BODY}`}>Senha</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={`rounded-md border ${BORDER_SUBTLE} bg-gray-50 dark:bg-white/[0.04] px-3 py-2 outline-none transition-colors focus:border-gray-400 dark:focus:border-white/[0.2] ${TEXT_PRIMARY}`}
        />
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`mt-2 px-4 py-2 disabled:opacity-60 ${GOLD_BUTTON}`}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
