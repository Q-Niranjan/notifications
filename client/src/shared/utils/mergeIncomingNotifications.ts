import type { Notification, NotificationFilter } from "@/shared/types";
import { sortNotifications } from "@/shared/utils/sortNotifications";

export function mergeIncomingNotifications(
  prev: Notification[],
  incoming: Notification[],
  filter: NotificationFilter
): { notifications: Notification[]; added: number } {
  const incomingById = new Map(
    incoming.map((item) => [item.id, item] as const)
  );
  const prevIds = new Set(prev.map((item) => item.id));
  const newItems = incoming.filter((item) => item.id && !prevIds.has(item.id));
  if (newItems.length === 0 && incomingById.size === 0) {
    return { notifications: prev, added: 0 };
  }
  const updated = prev.map((item) => incomingById.get(item.id) ?? item);
  const next = [...newItems, ...updated];
  return {
    notifications: filter === "all" ? sortNotifications(next) : next,
    added: newItems.length,
  };
}
