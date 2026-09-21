"use client";

import { createElement, useCallback, useContext, useId, useMemo, useState, type ReactNode } from "react";
import type { NotificationInboxProps } from "@/shared/types";
import { mergeCopy } from "@/shared/utils";
import { InboxSessionContext, type InboxSessionValue } from "@/shared/context";
import { useInboxActions } from "@/shared/hooks/useInboxActions";
import { useInboxClient } from "@/shared/hooks/useInboxClient";
import { useInboxList } from "@/shared/hooks/useInboxList";
import { useInboxRealtime } from "@/shared/hooks/useInboxRealtime";

export type { InboxSessionValue } from "@/shared/context";

export function useInboxSession(): InboxSessionValue {
  const ctx = useContext(InboxSessionContext);
  if (!ctx) {
    throw new Error(
      "[@openg2p/notification] useInboxSession must be used within Inbox."
    );
  }
  return ctx;
}

export function InboxSessionProvider({
  config,
  open: openProp,
  onOpenChange,
  localization,
  children,
}: NotificationInboxProps & { children: ReactNode }) {
  const panelId = useId();
  const titleId = useId();
  const listId = useId();
  const copy = useMemo(() => mergeCopy(localization), [localization]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : uncontrolledOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange]
  );

  const toggle = useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const inboxClient = useInboxClient(config, copy.error);
  const list = useInboxList(inboxClient, copy);
  const actions = useInboxActions(inboxClient, list, copy);
  useInboxRealtime(inboxClient, list);
  const allSelected =
    list.notifications.length > 0 &&
    list.selectedIds.length === list.notifications.length;

  const value = useMemo<InboxSessionValue>(
    () => ({
      notifications: list.notifications,
      unreadCount: list.unreadCount,
      readCount: list.readCount,
      archivedCount: list.archivedCount,
      loading: list.loading,
      loadingMore: list.loadingMore,
      hasMore: list.hasMore,
      error: list.error,
      filter: list.filter,
      setFilter: list.setFilter,
      selectedIds: list.selectedIds,
      refresh: list.refresh,
      loadMore: list.loadMore,
      ...actions,
      copy,
      allSelected,
      open,
      setOpen,
      toggle,
      panelId,
      titleId,
      listId,
    }),
    [
      actions,
      allSelected,
      copy,
      list,
      listId,
      open,
      panelId,
      setOpen,
      titleId,
      toggle,
    ]
  );

  return createElement(InboxSessionContext.Provider, { value }, children);
}
