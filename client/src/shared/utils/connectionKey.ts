import type { NotificationConnection } from "../types";

function stableSerialize(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right)
  );
  return `{${entries
    .map(([key, nested]) => `${key}:${stableSerialize(nested)}`)
    .join(",")}}`;
}

export function connectionKey(config: NotificationConnection): string {
  return [
    config.subscriberId ?? "",
    config.applicationIdentifier ?? "",
    config.subscriberHash ?? "",
    config.backendUrl ?? "",
    config.socketUrl ?? "",
    config.contextHash ?? "",
    stableSerialize(config.context),
  ].join("|");
}
