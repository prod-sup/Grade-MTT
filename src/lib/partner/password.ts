/**
 * Hash/verificação de senha do domínio Parceiro — reexporta o módulo de auth
 * do backoffice (puro Node `crypto`, sem acoplamento a sessão/DAL) para que
 * o domínio de parceiros nunca precise importar de `@/lib/auth` diretamente.
 */
export { hashPassword, verifyPassword } from "@/lib/auth/password";
