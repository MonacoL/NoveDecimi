// Download di un file generato nella pagina. Sostituisce claude.use('downloads'):
// fuori dagli artefatti un <a download> creato al volo funziona.

export function scarica(nomeFile: string, contenuto: BlobPart, tipo: string): void {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Data locale come AAAA-MM-GG, per i nomi dei file. */
export function timbroData(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
