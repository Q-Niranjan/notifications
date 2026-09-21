export type NotificationFilter = "all" | "unread" | "read" | "archived";

export type NotificationChannel =
  | "in_app"
  | "email"
  | "sms"
  | "chat"
  | "push"
  | "tool";

export type NotificationSeverity = "high" | "medium" | "low" | "none";

export type NotificationPerson = {
  id: string;
  subscriberId?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
};

export type NotificationRedirect = {
  url: string;
  target?: "_self" | "_blank" | "_parent" | "_top" | "_unfencedTop";
};

export type NotificationAction = {
  label: string;
  isCompleted?: boolean;
  redirect?: NotificationRedirect;
};

export type NotificationWorkflow = {
  id?: string;
  identifier?: string;
  name?: string;
  critical?: boolean;
  tags?: string[];
};

export type Notification = {
  id: string;
  transactionId?: string;
  title: string;
  body: string;
  subscriber?: NotificationPerson;
  read: boolean;
  seen?: boolean;
  archived?: boolean;
  snoozed?: boolean;
  snoozedUntil?: string | null;
  createdAt: string;
  readAt?: string | null;
  seenAt?: string | null;
  archivedAt?: string | null;
  deliveredAt?: string[];
  avatar?: string;
  primaryAction?: NotificationAction;
  secondaryAction?: NotificationAction;
  channel?: NotificationChannel | string;
  tags?: string[];
  data?: Record<string, unknown>;
  redirect?: NotificationRedirect;
  workflow?: NotificationWorkflow | null;
  severity?: NotificationSeverity;
};

export type NotificationContextValue =
  | string
  | number
  | boolean
  | { id: string; data?: Record<string, unknown> };

export type NotificationConnection = {
  subscriberId: string;
  applicationIdentifier?: string;
  subscriberHash?: string;
  backendUrl?: string;
  socketUrl?: string;
  context?: Record<string, NotificationContextValue>;
  contextHash?: string;
};

export type NotificationListOptions = {
  limit?: number;
  after?: string;
  archivedAfter?: string;
  filter?: NotificationFilter;
};

export type NotificationListResult = {
  notifications: Notification[];
  hasMore: boolean;
};

export type NotificationConfig = NotificationConnection & {
  provider: string;
};

export type NotificationCopy = {
  notifications: string;
  empty: string;
  loading: string;
  error: string;
  retry: string;
  loadMore: string;
  markAsRead: string;
  markAllAsRead: string;
  archive: string;
  unarchive: string;
  selectAll: string;
  justNow: string;
  filterAll: string;
  filterUnread: string;
  filterRead: string;
  filterArchived: string;
  selected: string;
  viewDetails: string;
  showMore: string;
  showLess: string;
  close: string;
};

export type NotificationInboxProps = {
  config: NotificationConfig;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  localization?: Partial<NotificationCopy> | Record<string, string>;
  children?: import("react").ReactNode;
};

export type NotificationBellProps = {
  className?: string;
};
