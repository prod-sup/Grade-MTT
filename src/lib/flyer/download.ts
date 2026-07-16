/** Dispara o download de um PNG (dataURL) direto no navegador do visitante. */
export function downloadDataUrl(dataUrl: string, filenamePrefix: string): void {
  const link = document.createElement("a");
  link.download = `${filenamePrefix}-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}
