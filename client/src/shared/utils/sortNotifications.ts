import type { Notification } from "@/shared/types";

export function sortNotifications(
  notifications: Notification[]
): Notification[] {
  return [...notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
