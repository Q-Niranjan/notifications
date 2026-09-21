"use client";

import { useEffect } from "react";
import { LIVE_MERGE_RETRY_MS, PAGE_SIZE } from "@/shared/constants";
import { mergeIncomingNotifications } from "@/shared/utils";
import type { InboxClient } from "@/shared/hooks/useInboxClient";
import type { InboxList } from "@/shared/hooks/useInboxList";

export function useInboxRealtime(inboxClient: InboxClient, list: InboxList) {
  const { client, generationRef, isCurrent } = inboxClient;
  const {
    filter,
    setNotifications,
    notificationsRef,
    setHasMore,
    setUnreadCount,
    unreadCountRef,
    setReadCount,
    setArchivedCount,
  } = list;

  useEffect(() => {
    if (!client) return;

    const pullLatest = async (): Promise<number> => {
      const generation = generationRef.current;
      try {
        const listFilter = filter === "all" ? "unread" : filter;
        const page = await client.list({ limit: PAGE_SIZE, filter: listFilter });
        if (!isCurrent(generation)) return 0;
        const added = mergeIncomingNotifications(
          notificationsRef.current,
          page.notifications,
          filter
        ).added;
        setNotifications((prev) =>
          mergeIncomingNotifications(prev, page.notifications, filter)
            .notifications
        );
        if (filter !== "all") setHasMore(page.hasMore);
        return added;
      } catch {
        return 0;
      }
    };

    const offReceived = client.onReceived((notification) => {
      if (filter === "archived" || filter === "read") return;
      setNotifications((prev) => {
        if (!notification.id || prev.some((item) => item.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });
    });

    let cancelled = false;
    let retryTimer: ReturnType<typeof window.setTimeout> | undefined;

    const offCount = client.onUnreadCount((count) => {
      const increased = count > unreadCountRef.current;
      setUnreadCount(count);
      const generation = generationRef.current;
      void Promise.all([
        client.readCount().then((value) => {
          if (isCurrent(generation) && !cancelled) setReadCount(value);
        }),
        client.archivedCount().then((value) => {
          if (isCurrent(generation) && !cancelled) setArchivedCount(value);
        }),
      ]).catch(() => undefined);

      if (!increased || filter === "archived" || filter === "read") return;

      void pullLatest().then((added) => {
        if (cancelled || added > 0) return;
        retryTimer = window.setTimeout(() => {
          if (!cancelled) void pullLatest();
        }, LIVE_MERGE_RETRY_MS);
      });
    });

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      offReceived();
      offCount();
    };
  }, [
    client,
    filter,
    generationRef,
    isCurrent,
    notificationsRef,
    setArchivedCount,
    setHasMore,
    setNotifications,
    setReadCount,
    setUnreadCount,
    unreadCountRef,
  ]);
}
