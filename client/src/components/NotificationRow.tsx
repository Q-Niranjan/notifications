"use client";

import { useEffect, useRef } from "react";
import { Archive, ArchiveRestore, Check } from "lucide-react";
import { useInboxSession } from "../shared/hooks";
import type { Notification } from "../shared/types";
import { formatPersonName, formatRelativeTime } from "../shared/utils";
import { Avatar } from "./Avatar";
import { ExpandableMessage } from "./ExpandableMessage";
import { NotificationActions } from "./NotificationActions";

const SEEN_VISIBLE_MS = 1000;

export function NotificationRow({ notification }: { notification: Notification }) {
  const {
    copy,
    filter,
    openNotification,
    markRead,
    markSeen,
    archive,
    unarchive,
  } = useInboxSession();
  const rowRef = useRef<HTMLDivElement>(null);
  const isUnread = !notification.read;
  const isArchived = Boolean(notification.archived);
  const person = notification.subscriber;
  const personName = formatPersonName(person);
  const iconUrl = notification.avatar ?? person?.avatar;
  const heading = notification.title || personName;
  const showUnarchive = filter === "archived" || isArchived;
  const showMarkRead = !showUnarchive && isUnread;
  const showArchive = !showUnarchive;
  const highlight = isUnread && !isArchived;

  useEffect(() => {
    if (notification.seen) return;
    const node = rowRef.current;
    if (!node) return;
    let timer: ReturnType<typeof window.setTimeout> | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          if (timer) window.clearTimeout(timer);
          timer = undefined;
          return;
        }
        timer = window.setTimeout(() => {
          markSeen([notification.id]);
        }, SEEN_VISIBLE_MS);
      },
      { threshold: 0.5 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [markSeen, notification.id, notification.seen]);

  return (
    <div
      ref={rowRef}
      className={`group relative flex cursor-pointer items-start gap-2.5 py-3 pl-3 pr-3 transition-colors duration-150 sm:gap-3 sm:py-3.5 sm:pl-4 sm:pr-4 ${
        highlight ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-neutral-50"
      }`}
      role="listitem"
      onClick={() => void openNotification(notification)}
    >
      {highlight ? (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-500"
          aria-hidden="true"
        />
      ) : null}

      <Avatar url={iconUrl} name={personName || heading} accented={highlight} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 sm:gap-3">
          {heading ? (
            <button
              type="button"
              className={`min-w-0 flex-1 text-left text-[14px] leading-snug sm:text-[14.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isUnread ? "font-semibold text-black" : "font-medium text-neutral-800"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                void openNotification(notification);
              }}
            >
              {heading}
            </button>
          ) : (
            <span className="min-w-0 flex-1" />
          )}
          {notification.createdAt ? (
            <span className="shrink-0 pt-0.5 text-[11px] leading-none text-neutral-400 sm:text-[11.5px]">
              {formatRelativeTime(notification.createdAt, copy.justNow)}
            </span>
          ) : null}
        </div>

        {notification.body ? (
          <ExpandableMessage
            text={notification.body}
            showMore={copy.showMore}
            showLess={copy.showLess}
          />
        ) : null}

        <NotificationActions notification={notification} />
      </div>

      <div className="flex shrink-0 flex-col items-center justify-start gap-0.5 pt-0.5">
        {showMarkRead ? (
          <button
            type="button"
            title={copy.markAsRead}
            aria-label={copy.markAsRead}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors duration-150 hover:bg-indigo-100 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={(e) => {
              e.stopPropagation();
              void markRead([notification.id]);
            }}
          >
            <Check size={15} strokeWidth={2.2} />
          </button>
        ) : null}
        {showArchive ? (
          <button
            type="button"
            title={copy.archive}
            aria-label={copy.archive}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors duration-150 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={(e) => {
              e.stopPropagation();
              void archive([notification.id]);
            }}
          >
            <Archive size={15} strokeWidth={1.8} />
          </button>
        ) : null}
        {showUnarchive ? (
          <button
            type="button"
            title={copy.unarchive}
            aria-label={copy.unarchive}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors duration-150 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            onClick={(e) => {
              e.stopPropagation();
              void unarchive([notification.id]);
            }}
          >
            <ArchiveRestore size={15} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
