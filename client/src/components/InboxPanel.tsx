"use client";

import { type KeyboardEvent, type RefObject, useRef } from "react";
import {
  AlertCircle,
  Inbox as InboxIcon,
  Loader2,
  X,
} from "lucide-react";
import { useInboxSession } from "../shared/hooks";
import type { NotificationFilter } from "../shared/types";
import { NotificationRow } from "./NotificationRow";

function FilterTabs() {
  const { filter, setFilter, copy, unreadCount, readCount, archivedCount, listId } =
    useInboxSession();
  const allCount = unreadCount + readCount + archivedCount;
  const tabRefs = useRef<Partial<Record<NotificationFilter, HTMLButtonElement | null>>>(
    {}
  );

  const options: Array<{ value: NotificationFilter; label: string; count: number }> = [
    { value: "all", label: copy.filterAll, count: allCount },
    { value: "unread", label: copy.filterUnread, count: unreadCount },
    { value: "archived", label: copy.filterArchived, count: archivedCount },
  ];

  const move = (next: NotificationFilter) => {
    setFilter(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(options[(index + 1) % options.length].value);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(options[(index - 1 + options.length) % options.length].value);
    } else if (event.key === "Home") {
      event.preventDefault();
      move(options[0].value);
    } else if (event.key === "End") {
      event.preventDefault();
      move(options[options.length - 1].value);
    }
  };

  return (
    <div
      className="mx-4 mb-3.5 grid grid-cols-3 gap-1 rounded-full bg-neutral-100 p-1 sm:mx-5 sm:mb-4"
      role="tablist"
      aria-label={copy.notifications}
    >
      {options.map((option, index) => {
        const selected = filter === option.value;
        const tabId = `${listId}-${option.value}`;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            id={tabId}
            aria-selected={selected}
            aria-controls={listId}
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              tabRefs.current[option.value] = node;
            }}
            onClick={() => setFilter(option.value)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={`flex min-w-0 items-center justify-center gap-2 rounded-full px-2 py-1.5 text-[12.5px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:px-3 sm:py-[7px] sm:text-[13px] ${
              selected
                ? "bg-white text-black shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                : "text-neutral-500 hover:text-black"
            }`}
          >
            <span className="truncate">{option.label}</span>
            <span
              className={`shrink-0 text-[12px] tabular-nums ${
                selected ? "text-indigo-500" : "text-neutral-400"
              }`}
            >
              {option.count > 99 ? "99+" : option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function InboxPanel({
  visible,
  panelRef,
}: {
  visible: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const {
    notifications,
    loading,
    loadingMore,
    hasMore,
    error,
    copy,
    filter,
    refresh,
    loadMore,
    markAllRead,
    panelId,
    titleId,
    listId,
    setOpen,
  } = useInboxSession();

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  return (
    <div
      ref={panelRef}
      id={panelId}
      tabIndex={-1}
      className={`z-50 origin-top-right transition-all duration-150 ease-out max-sm:fixed max-sm:inset-x-2 max-sm:top-[4.75rem] max-sm:w-auto sm:absolute sm:right-0 sm:top-[calc(100%+10px)] sm:w-[min(420px,calc(100vw-16px))] focus:outline-none ${
        visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-[0.98] opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="relative z-[2] flex max-h-[min(70dvh,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_20px_48px_-12px_rgba(15,23,42,0.22)] sm:max-h-none">
        <div className="bg-white pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-3 px-4 pb-3 sm:px-5 sm:pb-3.5">
            <h2
              id={titleId}
              className="m-0 min-w-0 text-[16px] font-semibold tracking-tight text-black sm:text-[16.5px]"
            >
              {copy.notifications}
            </h2>
            <div className="flex shrink-0 items-center gap-0.5">
              {filter !== "archived" && unreadIds.length > 0 ? (
                <button
                  type="button"
                  className="rounded-full px-2.5 py-1 text-[12.5px] font-medium text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  onClick={() => void markAllRead()}
                >
                  {copy.markAllAsRead}
                </button>
              ) : null}
              <button
                type="button"
                aria-label={copy.close}
                className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                onClick={() => setOpen(false)}
              >
                <X size={15} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          </div>
          <FilterTabs />
        </div>

        <div className="relative min-h-0 flex-1 border-t border-neutral-100 sm:flex-none">
          <div
            id={listId}
            role="tabpanel"
            aria-labelledby={`${listId}-${filter}`}
            className="h-full divide-y divide-neutral-100 overflow-y-auto pb-4 sm:h-auto sm:max-h-[min(420px,calc(100vh-160px))]"
            aria-busy={loading}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center text-neutral-400" aria-live="polite">
                <Loader2 size={20} strokeWidth={2} className="animate-spin text-neutral-300" />
                <p className="m-0 text-[13.5px]">{copy.loading}</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center" aria-live="assertive">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertCircle size={17} strokeWidth={1.9} />
                </span>
                <p className="m-0 text-[13.5px] text-neutral-500">{copy.error}</p>
                <button
                  type="button"
                  className="mt-1 rounded-full bg-neutral-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors duration-150 hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  onClick={() => void refresh()}
                >
                  {copy.retry}
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2.5 py-14 text-center">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-300">
                  <InboxIcon size={17} strokeWidth={1.7} />
                </span>
                <p className="m-0 text-[13.5px] text-neutral-400">{copy.empty}</p>
              </div>
            ) : (
              <div role="list">
                {notifications.map((n) => (
                  <NotificationRow key={n.id} notification={n} />
                ))}
              </div>
            )}
          </div>
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-white to-transparent"
            aria-hidden="true"
          />
        </div>

        {hasMore && !loading ? (
          <div className="border-t border-neutral-100 py-2.5 text-center">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium text-neutral-500 transition-colors duration-150 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? (
                <Loader2 size={13} strokeWidth={2.2} className="animate-spin" />
              ) : null}
              {copy.loadMore}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
