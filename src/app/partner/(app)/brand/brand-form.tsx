"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBrand } from "./actions";
import { GHOST_BUTTON, GOLD_BUTTON } from "@/lib/ui/premium";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB — guarda mínima, sem validação de dimensão.

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function BrandForm({
  currentLogoUrl,
  currentWatermarkUrl,
  currentPhoneText,
}: {
  currentLogoUrl: string | null;
  currentWatermarkUrl: string | null;
  currentPhoneText: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(currentWatermarkUrl);
  const [phoneText, setPhoneText] = useState(currentPhoneText);
  const logoDataUrlRef = useRef<string | undefined>(undefined);
  const watermarkDataUrlRef = useRef<string | undefined>(undefined);

  async function onFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "logo" | "watermark",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("Imagem muito grande — envie um PNG de até 2MB.");
      e.target.value = "";
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    if (kind === "logo") {
      logoDataUrlRef.current = dataUrl;
      setLogoPreview(dataUrl);
    } else {
      watermarkDataUrlRef.current = dataUrl;
      setWatermarkPreview(dataUrl);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await submitBrand({
        logoDataUrl: logoDataUrlRef.current,
        watermarkDataUrl: watermarkDataUrlRef.current,
        phoneText,
      });
      if (!res.ok) {
        setError(res.error ?? "Falha ao salvar.");
        return;
      }
      logoDataUrlRef.current = undefined;
      watermarkDataUrlRef.current = undefined;
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ImageField
          label="Logo"
          hint="PNG, até 2MB. Aparece no canto do flyer."
          preview={logoPreview}
          onChange={(e) => onFileChange(e, "logo")}
        />
        <ImageField
          label="Marca d'água"
          hint="PNG, até 2MB. Sobreposta em baixa opacidade no flyer inteiro."
          preview={watermarkPreview}
          onChange={(e) => onFileChange(e, "watermark")}
        />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-300">Telefone / ID do clube</span>
        <input
          value={phoneText}
          onChange={(e) => setPhoneText(e.target.value)}
          placeholder="Ex: (11) 99999-9999 · Clube #123"
          className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#d4af37]/50 focus:bg-white/[0.06]"
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Marca enviada para aprovação.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`self-start px-4 py-2.5 disabled:opacity-60 ${GOLD_BUTTON}`}
      >
        {pending ? "Enviando…" : "Enviar para aprovação"}
      </button>
    </form>
  );
}

function ImageField({
  label,
  hint,
  preview,
  onChange,
}: {
  label: string;
  hint: string;
  preview: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={`flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4`}>
      <span className="text-sm font-medium text-gray-300">{label}</span>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="h-20 w-full rounded-lg object-contain bg-black/30" />
      ) : (
        <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-white/[0.1] text-xs text-gray-500">
          Nenhuma imagem
        </div>
      )}
      <label className={`cursor-pointer self-start rounded-lg px-3 py-1.5 text-xs ${GHOST_BUTTON}`}>
        Escolher arquivo
        <input type="file" accept="image/png" className="hidden" onChange={onChange} />
      </label>
      <span className="text-xs text-gray-500">{hint}</span>
    </div>
  );
}
