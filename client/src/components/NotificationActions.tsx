"use client";

import { ArrowRight } from "lucide-react";
import { useInboxSession } from "@/shared/hooks";
import type { Notification, NotificationAction } from "@/shared/types";

export function NotificationActions({
  notification,
}: {
  notification: Notification;
}) {
  const { copy, openNotification } = useInboxSession();
  const actions: Array<{ key: "primary" | "secondary"; action: NotificationAction }> =
    [];
  if (notification.primaryAction) {
    actions.push({ key: "primary", action: notification.primaryAction });
  }
  if (notification.secondaryAction) {
    actions.push({ key: "secondary", action: notification.secondaryAction });
  }
  if (actions.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      {actions.map(({ key, action }) => {
        const isPrimary = key === "primary";
        return (
          <button
            key={key}
            type="button"
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isPrimary
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              void openNotification(notification, action.redirect);
            }}
          >
            {action.label || copy.viewDetails}
            {isPrimary ? <ArrowRight size={13} strokeWidth={2.2} /> : null}
          </button>
        );
      })}
    </div>
  );
}
