"use server";
/**
 * Server Actions de autenticação do backoffice (Fase 3).
 * A autorização real acontece aqui (Server Actions são endpoints POST públicos).
 */
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, clearSessionCookie, SESSION_TTL_MS } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok =
    user?.active &&
    user.passwordHash &&
    verifyPassword(password, user.passwordHash);

  // Mensagem genérica (não revela se o e-mail existe).
  if (!ok || !user) {
    return { error: "Credenciais inválidas." };
  }

  await setSessionCookie({
    uid: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    exp: Date.now() + SESSION_TTL_MS,
  });

  // redirect() lança NEXT_REDIRECT — deve ficar fora de try/catch.
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
