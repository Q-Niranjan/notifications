"use client";

import { createContext } from "react";
import type {
  Notification,
  NotificationCopy,
  NotificationFilter,
  NotificationRedirect,
} from "./types";

export interface InboxSessionValue {
  notifications: Notification[];
  unreadCount: number;
  readCount: number;
  archivedCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  copy: NotificationCopy;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  selectedIds: string[];
  allSelected: boolean;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  panelId: string;
  titleId: string;
  listId: string;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  markSeen: (ids: string[]) => void;
  archive: (ids: string[]) => Promise<void>;
  unarchive: (ids: string[]) => Promise<void>;
  openNotification: (
    notification: Notification,
    redirect?: NotificationRedirect
  ) => Promise<void>;
}

export const InboxSessionContext = createContext<InboxSessionValue | null>(
  null
);
