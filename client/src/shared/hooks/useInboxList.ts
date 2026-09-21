"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Notification, NotificationCopy, NotificationFilter } from "@/shared/types";
import { PAGE_SIZE } from "@/shared/constants";
import { errorMessage, sortNotifications } from "@/shared/utils";
import type { InboxClient } from "@/shared/hooks/useInboxClient";

export function useInboxList(inboxClient: InboxClient, copy: NotificationCopy) {
  const { clientRef, generationRef, isCurrent, clientKey, connectionError } =
    inboxClient;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<NotificationFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const unreadCountRef = useRef(0);
  unreadCountRef.current = unreadCount;
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loadingMoreRef = useRef(false);

  const setFilter = useCallback((next: NotificationFilter) => {
    setFilterState(next);
    setSelectedIds([]);
  }, []);

  const refreshCounts = useCallback(
    async (generation = generationRef.current) => {
      const active = clientRef.current;
      if (!active) return;
      const [unread, read, archived] = await Promise.all([
        active.unreadCount(),
        active.readCount(),
        active.archivedCount(),
      ]);
      if (!isCurrent(generation)) return;
      setUnreadCount(unread);
      setReadCount(read);
      setArchivedCount(archived);
    },
    [clientRef, generationRef, isCurrent]
  );

  const refresh = useCallback(async () => {
    const active = clientRef.current;
    if (!active) return;
    const generation = ++generationRef.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoading(true);
    setError(null);
    try {
      const [list] = await Promise.all([
        active.list({ limit: PAGE_SIZE, filter }),
        refreshCounts(generation),
      ]);
      if (!isCurrent(generation)) return;
      setNotifications(list.notifications);
      setHasMore(list.hasMore);
      setSelectedIds((ids) =>
        ids.filter((id) => list.notifications.some((item) => item.id === id))
      );
    } catch (err) {
      if (!isCurrent(generation)) return;
      setError(errorMessage(err, copy.error));
    } finally {
      if (isCurrent(generation)) setLoading(false);
    }
  }, [clientRef, copy.error, filter, generationRef, isCurrent, refreshCounts]);

  const loadMore = useCallback(async () => {
    const active = clientRef.current;
    if (!active || !hasMoreRef.current || loadingMoreRef.current) return;
    const generation = generationRef.current;
    const items = notificationsRef.current;
    const after =
      filter === "all"
        ? [...items].reverse().find((item) => !item.archived)?.id
        : items[items.length - 1]?.id;
    const archivedAfter =
      filter === "all"
        ? [...items].reverse().find((item) => item.archived)?.id
        : undefined;
    if (!after && !archivedAfter) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const list = await active.list({
        limit: PAGE_SIZE,
        after,
        archivedAfter,
        filter,
      });
      if (!isCurrent(generation)) return;
      setNotifications((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const next = [
          ...prev,
          ...list.notifications.filter((item) => !seen.has(item.id)),
        ];
        return filter === "all" ? sortNotifications(next) : next;
      });
      setHasMore(list.hasMore);
    } catch (err) {
      if (!isCurrent(generation)) return;
      setError(errorMessage(err, copy.error));
    } finally {
      if (isCurrent(generation)) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [clientRef, copy.error, filter, generationRef, isCurrent]);

  useEffect(() => {
    loadingMoreRef.current = false;
    setNotifications([]);
    setSelectedIds([]);
    setUnreadCount(0);
    setReadCount(0);
    setArchivedCount(0);
    setHasMore(false);
    setLoadingMore(false);
    if (connectionError) {
      setError(connectionError);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
  }, [clientKey, connectionError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      notifications,
      setNotifications,
      notificationsRef,
      unreadCount,
      setUnreadCount,
      unreadCountRef,
      readCount,
      setReadCount,
      archivedCount,
      setArchivedCount,
      loading,
      loadingMore,
      hasMore,
      setHasMore,
      error,
      setError,
      filter,
      setFilter,
      selectedIds,
      setSelectedIds,
      refresh,
      loadMore,
      refreshCounts,
    }),
    [
      archivedCount,
      error,
      filter,
      hasMore,
      loadMore,
      loading,
      loadingMore,
      notifications,
      readCount,
      refresh,
      refreshCounts,
      selectedIds,
      setFilter,
      unreadCount,
    ]
  );
}

export type InboxList = ReturnType<typeof useInboxList>;
