import type { NotificationRedirect } from "@/shared/types";

export function followRedirect(redirect?: NotificationRedirect): void {
  const url = redirect?.url;
  if (!url || typeof window === "undefined") return;

  const target = redirect.target ?? "_self";
  if (target === "_blank") {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  if (target === "_top") {
    window.top?.location.assign(url);
    return;
  }
  if (target === "_parent") {
    window.parent.location.assign(url);
    return;
  }
  window.location.assign(url);
}
