// Messaggi mostrati dentro la pagina, al posto di alert(). L'elemento deve
// avere aria-live, così gli screen reader leggono il messaggio.

const timer = new WeakMap<HTMLElement, number>();

export function mostraAvviso(el: HTMLElement, testo: string, durataMs = 6000): void {
  el.textContent = testo;
  window.clearTimeout(timer.get(el));
  if (durataMs > 0) {
    timer.set(
      el,
      window.setTimeout(() => {
        el.textContent = '';
      }, durataMs),
    );
  }
}
