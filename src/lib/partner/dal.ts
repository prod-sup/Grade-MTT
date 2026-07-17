/**
 * Data Access Layer do domínio Parceiro.
 * ---------------------------------------------------------------------------
 * Ao contrário do check-in do portal público (`src/lib/portal/dal.ts`, que
 * confia no payload do cookie sem reconferir o banco), aqui SEMPRE relemos
 * `PartnerAccount` — o status `active` pode ser desligado pelo admin a
 * qualquer momento e precisa refletir na próxima ação/página, igual ao
 * domínio de auth do backoffice (`src/lib/auth/dal.ts`).
 *
 * `requirePartner()` só olha `active`: o status de aprovação da marca
 * (`BrandSettings.status`) é independente — um parceiro com marca REJECTED
 * continua logado normalmente (só a geração de flyer com overlay é bloqueada
 * em outro ponto, não o acesso ao painel).
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readPartnerSession } from "./session";

export interface CurrentPartner {
  id: string;
  email: string;
  contactName: string;
  clubName: string;
}

/** Parceiro atual (ou null). Reconfere no banco se está ativo. Não redireciona. */
export async function getCurrentPartner(): Promise<CurrentPartner | null> {
  const session = await readPartnerSession();
  if (!session) return null;

  const partner = await prisma.partnerAccount.findUnique({ where: { id: session.pid } });
  if (!partner || !partner.active) return null;

  return {
    id: partner.id,
    email: partner.email,
    contactName: partner.contactName,
    clubName: partner.clubName,
  };
}

/** Exige parceiro autenticado; caso contrário redireciona para /partner/login. */
export async function requirePartner(): Promise<CurrentPartner> {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/partner/login");
  return partner;
}
