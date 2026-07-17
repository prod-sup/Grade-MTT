"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveBrand,
  invitePartner,
  rejectBrand,
  resendInvite,
  togglePartnerActive,
} from "./actions";

export interface BrandRow {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  logoUrl: string | null;
  watermarkUrl: string | null;
  phoneText: string | null;
}

export interface PartnerRow {
  id: string;
  email: string;
  contactName: string;
  clubName: string;
  active: boolean;
  brand: BrandRow | null;
}

export interface InviteRow {
  id: string;
  email: string;
  expiresAt: string;
}

const STATUS_CLS: Record<BrandRow["status"], string> = {
  PENDING: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  REJECTED: "border-red-500/20 bg-red-500/10 text-red-400",
};

const STATUS_LABEL: Record<BrandRow["status"], string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};

export function PartnersManager({
  partners,
  invites,
}: {
  partners: PartnerRow[];
  invites: InviteRow[];
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <InviteForm onChanged={() => router.refresh()} />

      {invites.length > 0 ? (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Convites pendentes
          </h2>
          <div className="flex flex-col gap-2">
            {invites.map((inv) => (
              <InviteRowItem key={inv.id} invite={inv} onChanged={() => router.refresh()} />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Parceiros
        </h2>
        {partners.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-gray-500">
            Nenhum parceiro cadastrado ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {partners.map((p) => (
              <PartnerCard key={p.id} partner={p} onChanged={() => router.refresh()} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InviteForm({ onChanged }: { onChanged: () => void }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await invitePartner({ email });
      if (!res.ok) {
        setError(res.error ?? "Falha ao convidar.");
        return;
      }
      setEmail("");
      setSuccess(true);
      onChanged();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.08] bg-[#121316] px-3 py-3">
      <span className="text-sm text-gray-400">Convidar parceiro:</span>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@parceiro.com"
        className="min-w-[16rem] rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-white/[0.3]"
      />
      <button
        type="button"
        onClick={submit}
        disabled={pending || !email.trim()}
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Convidar"}
      </button>
      {success ? <span className="text-xs text-emerald-400">Convite enviado.</span> : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}

function InviteRowItem({ invite, onChanged }: { invite: InviteRow; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resend() {
    setError(null);
    startTransition(async () => {
      const res = await resendInvite(invite.id);
      if (!res.ok) setError(res.error ?? "Falha ao reenviar.");
      else onChanged();
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-sm">
      <span className="text-gray-300">{invite.email}</span>
      <span className="text-xs text-gray-500">
        expira em {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={pending}
        className="rounded border border-white/[0.12] px-2 py-1 text-xs text-gray-300 hover:border-white/[0.2] hover:bg-white/[0.05] disabled:opacity-50"
      >
        {pending ? "Reenviando…" : "Reenviar"}
      </button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}

function PartnerCard({ partner, onChanged }: { partner: PartnerRow; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const res = await togglePartnerActive(partner.id, !partner.active);
      if (!res.ok) setError(res.error ?? "Falha ao salvar.");
      else onChanged();
    });
  }

  function approve() {
    if (!partner.brand) return;
    setError(null);
    startTransition(async () => {
      const res = await approveBrand(partner.brand!.id);
      if (!res.ok) setError(res.error ?? "Falha ao aprovar.");
      else onChanged();
    });
  }

  function reject() {
    if (!partner.brand) return;
    setError(null);
    startTransition(async () => {
      const res = await rejectBrand(partner.brand!.id, note);
      if (!res.ok) {
        setError(res.error ?? "Falha ao recusar.");
        return;
      }
      setRejecting(false);
      setNote("");
      onChanged();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-[#121316] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-100">{partner.clubName}</p>
          <p className="text-xs text-gray-500">
            {partner.contactName} · {partner.email}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={partner.active}
            disabled={pending}
            onChange={toggleActive}
            className="h-3.5 w-3.5"
          />
          Ativo
        </label>
      </div>

      {partner.brand ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${STATUS_CLS[partner.brand.status]}`}
            >
              {STATUS_LABEL[partner.brand.status]}
            </span>
            {partner.brand.phoneText ? (
              <span className="text-xs text-gray-500">{partner.brand.phoneText}</span>
            ) : null}
          </div>

          <div className="flex gap-2">
            {partner.brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.brand.logoUrl}
                alt="Logo"
                className="h-12 w-12 rounded border border-white/[0.08] bg-black/30 object-contain"
              />
            ) : null}
            {partner.brand.watermarkUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner.brand.watermarkUrl}
                alt="Marca d'água"
                className="h-12 w-12 rounded border border-white/[0.08] bg-black/30 object-contain"
              />
            ) : null}
          </div>

          {partner.brand.status === "REJECTED" && partner.brand.reviewNote ? (
            <p className="text-xs text-red-400">Motivo: {partner.brand.reviewNote}</p>
          ) : null}

          {partner.brand.status === "PENDING" ? (
            rejecting ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Motivo da recusa"
                  className="rounded-lg border border-white/[0.12] bg-white/[0.03] px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-white/[0.3]"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={reject}
                    disabled={pending || !note.trim()}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Confirmar recusa
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejecting(false)}
                    className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs text-gray-300 hover:bg-white/[0.05]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={approve}
                  disabled={pending}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  disabled={pending}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Recusar
                </button>
              </div>
            )
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Ainda não enviou a marca.</p>
      )}

      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  );
}
