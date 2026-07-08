"use client";

import { useActionState } from "react";
import { uploadSeries, type UploadState } from "./actions";

const initial: UploadState = {};

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadSeries, initial);

  return (
    <form action={action} className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Nome da série</span>
        <input
          name="seriesName"
          required
          placeholder="Ex.: SPS"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Arquivo Excel (formato Horizontal do export)
        </span>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-white dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900"
        />
      </label>

      {state.error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Processando…" : "Subir e analisar"}
      </button>
    </form>
  );
}
