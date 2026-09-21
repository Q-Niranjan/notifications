"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Notification, NotificationCopy, NotificationRedirect } from "@/shared/types";
import { SEEN_FLUSH_MS } from "@/shared/constants";
import { errorMessage, followRedirect } from "@/shared/utils";
import type { InboxClient } from "@/shared/hooks/useInboxClient";
import type { InboxList } from "@/shared/hooks/useInboxList";

export function useInboxActions(
  inboxClient: InboxClient,
  list: InboxList,
  copy: NotificationCopy
) {
  const { clientRef, generationRef, isCurrent, clientKey } = inboxClient;
  const {
    filter,
    setNotifications,
    setSelectedIds,
    setError,
    refresh,
    refreshCounts,
    notificationsRef,
  } = list;

  const pendingSeenRef = useRef(new Set<string>());
  const seenFlushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const runOnIds = useCallback(
    async (
      ids: string[],
      action: (id: string) => Promise<void>,
      update: (prev: Notification[]) => Notification[]
    ) => {
      const active = clientRef.current;
      if (!active || ids.length === 0) return;
      const generation = generationRef.current;
      setNotifications(update);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      try {
        await Promise.all(ids.map(action));
        if (!isCurrent(generation)) return;
        await refreshCounts(generation);
      } catch (err) {
        if (!isCurrent(generation)) return;
        setError(errorMessage(err, copy.error));
        await refresh();
      }
    },
    [clientRef, copy.error, generationRef, isCurrent, refresh, refreshCounts, setError, setNotifications, setSelectedIds]
  );

  const markRead = useCallback(
    async (ids: string[]) => {
      const active = clientRef.current;
      if (!active) return;
      await runOnIds(ids, (id) => active.markRead(id), (prev) =>
        filter === "unread"
          ? prev.filter((item) => !ids.includes(item.id))
          : prev.map((item) =>
              ids.includes(item.id) ? { ...item, read: true, seen: true } : item
            )
      );
    },
    [clientRef, filter, runOnIds]
  );

  const markAllRead = useCallback(async () => {
    const active = clientRef.current;
    if (!active) return;
    const generation = generationRef.current;
    setNotifications((prev) =>
      filter === "unread"
        ? []
        : prev.map((item) =>
            item.read ? item : { ...item, read: true, seen: true }
          )
    );
    setSelectedIds([]);
    try {
      await active.readAll();
      if (!isCurrent(generation)) return;
      await refreshCounts(generation);
    } catch (err) {
      if (!isCurrent(generation)) return;
      setError(errorMessage(err, copy.error));
      await refresh();
    }
  }, [clientRef, copy.error, filter, generationRef, isCurrent, refresh, refreshCounts, setError, setNotifications, setSelectedIds]);

  const flushSeen = useCallback(async () => {
    const active = clientRef.current;
    const ids = [...pendingSeenRef.current];
    pendingSeenRef.current.clear();
    if (!active || ids.length === 0) return;
    try {
      await active.markSeen(ids);
    } catch {
      // Seen is best-effort, matching Novu Inbox.
    }
  }, [clientRef]);

  const markSeen = useCallback(
    (ids: string[]) => {
      const next: string[] = [];
      for (const id of ids) {
        const item = notificationsRef.current.find((entry) => entry.id === id);
        if (!id || item?.seen || pendingSeenRef.current.has(id)) continue;
        pendingSeenRef.current.add(id);
        next.push(id);
      }
      if (next.length === 0) return;
      setNotifications((prev) =>
        prev.map((item) =>
          next.includes(item.id) ? { ...item, seen: true } : item
        )
      );
      if (seenFlushTimerRef.current) return;
      seenFlushTimerRef.current = setTimeout(() => {
        seenFlushTimerRef.current = undefined;
        void flushSeen();
      }, SEEN_FLUSH_MS);
    },
    [flushSeen, notificationsRef, setNotifications]
  );

  const archive = useCallback(
    async (ids: string[]) => {
      const active = clientRef.current;
      if (!active) return;
      await runOnIds(ids, (id) => active.archive(id), (prev) =>
        filter === "all"
          ? prev.map((item) =>
              ids.includes(item.id) ? { ...item, archived: true } : item
            )
          : prev.filter((item) => !ids.includes(item.id))
      );
    },
    [clientRef, filter, runOnIds]
  );

  const unarchive = useCallback(
    async (ids: string[]) => {
      const active = clientRef.current;
      if (!active) return;
      await runOnIds(ids, (id) => active.unarchive(id), (prev) =>
        filter === "archived"
          ? prev.filter((item) => !ids.includes(item.id))
          : prev.map((item) =>
              ids.includes(item.id) ? { ...item, archived: false } : item
            )
      );
    },
    [clientRef, filter, runOnIds]
  );

  const openNotification = useCallback(
    async (notification: Notification, redirect?: NotificationRedirect) => {
      if (!notification.read) await markRead([notification.id]);
      followRedirect(redirect ?? notification.redirect);
    },
    [markRead]
  );

  const toggleSelected = useCallback(
    (id: string) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    },
    [setSelectedIds]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(notificationsRef.current.map((item) => item.id));
  }, [notificationsRef, setSelectedIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, [setSelectedIds]);

  useEffect(() => {
    pendingSeenRef.current.clear();
    if (seenFlushTimerRef.current) {
      clearTimeout(seenFlushTimerRef.current);
      seenFlushTimerRef.current = undefined;
    }
  }, [clientKey]);

  useEffect(() => {
    return () => {
      if (seenFlushTimerRef.current) clearTimeout(seenFlushTimerRef.current);
      void flushSeen();
    };
  }, [flushSeen]);

  return useMemo(
    () => ({
      markRead,
      markAllRead,
      markSeen,
      archive,
      unarchive,
      openNotification,
      toggleSelected,
      selectAll,
      clearSelection,
    }),
    [
      archive,
      clearSelection,
      markAllRead,
      markRead,
      markSeen,
      openNotification,
      selectAll,
      toggleSelected,
      unarchive,
    ]
  );
}
