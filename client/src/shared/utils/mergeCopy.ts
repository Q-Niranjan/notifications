import type { NotificationCopy } from "@/shared/types";

const DEFAULT_COPY: NotificationCopy = {
  notifications: "Notifications",
  empty: "You're all caught up",
  loading: "Loading notifications…",
  error: "Couldn't load notifications",
  retry: "Retry",
  loadMore: "Load more",
  markAsRead: "Mark as read",
  markAllAsRead: "Mark all as read",
  archive: "Archive",
  unarchive: "Remove from archive",
  selectAll: "Select all",
  justNow: "Just now",
  filterAll: "All",
  filterUnread: "Unread",
  filterRead: "Read",
  filterArchived: "Archived",
  selected: "selected",
  viewDetails: "View details",
  showMore: "Show more",
  showLess: "Show less",
  close: "Close notifications",
};

export function mergeCopy(
  localization?: Partial<NotificationCopy> | Record<string, string>
): NotificationCopy {
  return { ...DEFAULT_COPY, ...localization };
}
