"use client";

import { Bell as BellIcon } from "lucide-react";
import { useInboxSession } from "@/shared/hooks";
import type { NotificationBellProps } from "@/shared/types";

export function Bell({ className = "" }: NotificationBellProps) {
  const { unreadCount, open, toggle, copy, panelId } = useInboxSession();
  const hasUnread = unreadCount > 0;
  const label = hasUnread
    ? `${copy.notifications}, ${unreadCount} unread`
    : copy.notifications;
  const badge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <button
      type="button"
      className={`relative inline-flex h-10 w-10 items-center justify-center text-neutral-600 transition-colors duration-150 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${className}`.trim()}
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      onClick={toggle}
    >
      <BellIcon size={19} strokeWidth={1.8} aria-hidden="true" />
      {hasUnread ? (
        <span
          className="absolute right-1 top-1 flex min-w-[17px] h-[17px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold leading-none tabular-nums text-white ring-2 ring-white"
          aria-hidden="true"
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
