import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 (generator "prisma-client") exige um driver adapter em runtime.
// Para SQLite usamos o better-sqlite3. O caminho relativo em DATABASE_URL
// (ex: "file:./dev.db") é resolvido a partir do diretório de execução (raiz).
const url = process.env.DATABASE_URL ?? "file:./dev.db";

// Singleton para evitar múltiplas instâncias em dev (hot reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
