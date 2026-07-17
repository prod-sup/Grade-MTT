import type { NextConfig } from "next";

// CSP sem domínios externos: não há CDN, fonte remota (next/font/google já
// self-hosta em build) ou API de terceiros chamada do navegador — tudo fica
// em 'self'. `script-src`/`style-src` precisam de 'unsafe-inline' porque o
// next-themes injeta um <script> inline (evita flash de tema errado) e o
// app usa `style={{...}}` em vários componentes (ex. flyer, carrossel); não
// há `dangerouslySetInnerHTML`/`innerHTML` em lugar nenhum do código-fonte,
// então o risco residual de permitir inline aqui é baixo. Evoluir para CSP
// com nonce (via middleware) é um endurecimento futuro, não incluído agora.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS só tem efeito sobre HTTPS (navegadores ignoram em HTTP/localhost).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    serverActions: {
      // Cobre PNGs de até 2MB (validados em `src/lib/uploads.ts`) já
      // codificados em base64 (~37% maior que o binário original).
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
