export function visibleControls(dialog: HTMLElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (el) =>
      el.getAttribute("aria-hidden") !== "true" &&
      !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
  );
}
