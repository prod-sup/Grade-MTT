/**
 * Gate de sessão do portal (Fase 4). Se o visitante não passou pelo check-in,
 * redireciona para a landing "/". Chame em cada página do portal.
 */
import { redirect } from "next/navigation";
import { getVisitor, type VisitorContext } from "./session";

export { getVisitor };
export type { VisitorContext };

export async function requireVisitor(): Promise<VisitorContext> {
  const visitor = await getVisitor();
  if (!visitor) redirect("/");
  return visitor;
}
