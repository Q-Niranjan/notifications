import { Novu, type InboxNotification } from "@novu/js";
import type {
  Notification,
  NotificationAction,
  NotificationConnection,
  NotificationListOptions,
  NotificationListResult,
  NotificationPerson,
  NotificationRedirect,
  NotificationWorkflow,
} from "@/shared/types";
import type { NotificationService } from "@/core/service";
import { sortNotifications, throwIfError } from "@/shared/utils";

type RawNotification = Partial<InboxNotification> & {
  _id?: string;
  content?: unknown;
  read?: boolean;
  archived?: boolean;
};

function toPerson(value: unknown): NotificationPerson | undefined {
  if (!value || typeof value !== "object") return undefined;

  const person = value as {
    id?: string;
    subscriberId?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  const id = person.id ?? person.subscriberId;
  if (!id && !person.firstName && !person.lastName && !person.avatar) {
    return undefined;
  }

  return {
    id: id ?? "",
    subscriberId: person.subscriberId,
    firstName: person.firstName,
    lastName: person.lastName,
    avatar: person.avatar,
  };
}

function toRedirect(value: unknown): NotificationRedirect | undefined {
  if (!value || typeof value !== "object") return undefined;
  const redirect = value as { url?: string; target?: NotificationRedirect["target"] };
  if (!redirect.url) return undefined;
  return { url: redirect.url, target: redirect.target };
}

function toAction(value: unknown): NotificationAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const action = value as {
    label?: string;
    isCompleted?: boolean;
    redirect?: unknown;
  };
  const rawLabel = action.label?.trim() ?? "";
  const normalized = rawLabel.toLowerCase();
  const label =
    normalized === "primary" || normalized === "secondary" ? "" : rawLabel;
  const redirect = toRedirect(action.redirect);
  if (!label && !redirect) return undefined;
  return {
    label,
    isCompleted: action.isCompleted,
    redirect,
  };
}

function toWorkflow(value: unknown): NotificationWorkflow | undefined {
  if (!value || typeof value !== "object") return undefined;
  const workflow = value as NotificationWorkflow;
  if (
    workflow.id == null &&
    workflow.identifier == null &&
    workflow.name == null
  ) {
    return undefined;
  }
  return {
    id: workflow.id,
    identifier: workflow.identifier,
    name: workflow.name,
    critical: workflow.critical,
    tags: workflow.tags,
  };
}

function asBody(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function toNotification(n: InboxNotification | RawNotification): Notification {
  const raw = n as RawNotification;
  const primaryAction = toAction(raw.primaryAction);
  const redirect =
    toRedirect(raw.redirect) ?? primaryAction?.redirect;

  return {
    id: raw.id ?? raw._id ?? "",
    transactionId: raw.transactionId,
    title: raw.subject ?? "",
    body: asBody(raw.body) || asBody(raw.content),
    data: raw.data as Record<string, unknown> | undefined,
    createdAt: raw.createdAt ?? "",
    read: raw.isRead ?? raw.read ?? false,
    seen: raw.isSeen,
    archived: raw.isArchived ?? raw.archived ?? false,
    snoozed: raw.isSnoozed,
    snoozedUntil: raw.snoozedUntil,
    readAt: raw.readAt,
    seenAt: raw.firstSeenAt,
    archivedAt: raw.archivedAt,
    deliveredAt: raw.deliveredAt,
    avatar: raw.avatar,
    subscriber: toPerson(raw.to),
    primaryAction,
    secondaryAction: toAction(raw.secondaryAction),
    channel: raw.channelType,
    tags: raw.tags,
    redirect,
    workflow: toWorkflow(raw.workflow),
    severity: raw.severity,
  };
}

function mergeByCreatedAt(lists: Notification[][]): Notification[] {
  const seen = new Set<string>();
  const merged: Notification[] = [];

  for (const list of lists) {
    for (const item of list) {
      if (!item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }

  return sortNotifications(merged);
}

function toNovuContext(
  context?: NotificationConnection["context"]
): Record<string, string | { id: string; data?: Record<string, unknown> }> | undefined {
  if (!context) return undefined;
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      typeof value === "object" && value !== null ? value : String(value),
    ])
  );
}

export class NovuNotificationService implements NotificationService {
  private novu: Novu;

  constructor(connection: NotificationConnection) {
    if (!connection.subscriber?.subscriberId) {
      throw new Error(
        "[@openg2p/notification] Novu requires subscriberId."
      );
    }

    if (!connection.applicationIdentifier) {
      throw new Error(
        "[@openg2p/notification] Novu requires applicationIdentifier."
      );
    }

    this.novu = new Novu({
      applicationIdentifier: connection.applicationIdentifier,
      subscriber: connection.subscriber,
      subscriberHash: connection.subscriberHash,
      apiUrl: connection.backendUrl,
      backendUrl: connection.backendUrl,
      socketUrl: connection.socketUrl,
      context: toNovuContext(connection.context),
      contextHash: connection.contextHash,
    });
  }

  async list(
    options: NotificationListOptions = {}
  ): Promise<NotificationListResult> {
    const limit = options.limit ?? 20;
    const filter = options.filter ?? "all";

    if (filter === "all") {
      const [active, archived] = await Promise.all([
        this.novu.notifications.list({
          limit,
          after: options.after,
          archived: false,
          useCache: false,
        }),
        this.novu.notifications.list({
          limit,
          after: options.archivedAfter,
          archived: true,
          useCache: false,
        }),
      ]);
      throwIfError(active.error, "list notifications");
      throwIfError(archived.error, "list archived notifications");
      return {
        notifications: mergeByCreatedAt([
          (active.data?.notifications ?? []).map(toNotification),
          (archived.data?.notifications ?? []).map(toNotification),
        ]),
        hasMore: Boolean(active.data?.hasMore || archived.data?.hasMore),
      };
    }

    const query =
      filter === "archived"
        ? { archived: true }
        : filter === "unread"
          ? { archived: false, read: false }
          : { archived: false, read: true };

    const { data, error } = await this.novu.notifications.list({
      limit,
      after: options.after,
      useCache: false,
      ...query,
    });
    throwIfError(error, "list notifications");
    return {
      notifications: (data?.notifications ?? []).map(toNotification),
      hasMore: Boolean(data?.hasMore),
    };
  }

  async unreadCount(): Promise<number> {
    const { data, error } = await this.novu.notifications.count({
      read: false,
      archived: false,
    });
    throwIfError(error, "load unread count");
    return data?.count ?? 0;
  }

  async readCount(): Promise<number> {
    const { data, error } = await this.novu.notifications.count({
      read: true,
      archived: false,
    });
    throwIfError(error, "load read count");
    return data?.count ?? 0;
  }

  async archivedCount(): Promise<number> {
    const { data, error } = await this.novu.notifications.count({
      archived: true,
    });
    throwIfError(error, "load archived count");
    return data?.count ?? 0;
  }

  async markRead(id: string): Promise<void> {
    const { error } = await this.novu.notifications.read({
      notificationId: id,
    });
    throwIfError(error, "mark as read");
  }

  async readAll(): Promise<void> {
    const { error } = await this.novu.notifications.readAll();
    throwIfError(error, "mark all as read");
  }

  async markSeen(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const { error } = await this.novu.notifications.seenAll({
      notificationIds: ids,
    });
    throwIfError(error, "mark as seen");
  }

  async archive(id: string): Promise<void> {
    const { error } = await this.novu.notifications.archive({
      notificationId: id,
    });
    throwIfError(error, "archive notification");
  }

  async unarchive(id: string): Promise<void> {
    const { error } = await this.novu.notifications.unarchive({
      notificationId: id,
    });
    throwIfError(error, "unarchive notification");
  }

  onReceived(handler: (notification: Notification) => void): () => void {
    return this.novu.on("notifications.notification_received", (event) => {
      try {
        const payload =
          event && typeof event === "object" && "result" in event
            ? event.result
            : event;
        if (!payload || typeof payload !== "object") return;
        const notification = toNotification(payload as InboxNotification);
        if (!notification.id) return;
        handler(notification);
      } catch {
        // Socket payloads can differ from REST. The session falls back to a list merge.
      }
    });
  }

  onUnreadCount(handler: (count: number) => void): () => void {
    return this.novu.on("notifications.unread_count_changed", (event) => {
      const result =
        event && typeof event === "object" && "result" in event
          ? event.result
          : event;
      const count =
        typeof result === "number"
          ? result
          : Number(
              result && typeof result === "object" && "total" in result
                ? result.total
                : 0
            );
      handler(Number.isFinite(count) ? count : 0);
    });
  }

  disconnect(): void {
    void this.novu.socket.disconnect();
  }
}
