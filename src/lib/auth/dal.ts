/**
 * Data Access Layer de autenticação/RBAC (Fase 3).
 * ---------------------------------------------------------------------------
 * IMPORTANTE (Next 16): a checagem de sessão NÃO deve morar no layout (layouts
 * não re-renderizam a cada navegação). Chame estes helpers em cada página/rota
 * e — obrigatoriamente — dentro de cada Server Action, pois Server Actions são
 * endpoints POST públicos: a UI desabilitada NÃO é fronteira de segurança.
 *
 * A sessão do cookie é sempre reconferida contra o banco (usuário existe e está
 * ativo, papel atual), evitando confiar num cookie possivelmente defasado.
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession } from "./session";

export const ROLES = { ADMIN: "ADMIN", OPERACIONAL: "OPERACIONAL" } as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function isAdmin(user: Pick<CurrentUser, "role"> | null | undefined): boolean {
  return user?.role === ROLES.ADMIN;
}

/** Usuário atual (ou null). Reconfere no banco se está ativo. Não redireciona. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Exige usuário autenticado; caso contrário redireciona para /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige papel ADMIN. OPERACIONAL autenticado é mandado ao painel (tem acesso de
 * leitura, mas não a esta ação/página de escrita). Não autenticado → /login.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/admin?erro=somente-admin");
  return user;
}
