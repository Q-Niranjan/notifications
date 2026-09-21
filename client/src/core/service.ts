import type {
  Notification,
  NotificationConnection,
  NotificationListOptions,
  NotificationListResult,
} from "../shared/types";

export interface NotificationService {
  list(
    options?: NotificationListOptions
  ): Promise<NotificationListResult>;

  unreadCount(): Promise<number>;

  readCount(): Promise<number>;

  archivedCount(): Promise<number>;

  markRead(id: string): Promise<void>;

  readAll(): Promise<void>;

  markSeen(ids: string[]): Promise<void>;

  archive(id: string): Promise<void>;

  unarchive(id: string): Promise<void>;

  onReceived(
    handler: (notification: Notification) => void
  ): () => void;

  onUnreadCount(
    handler: (count: number) => void
  ): () => void;

  disconnect(): void;
}

export type NotificationProvider = new (
  connection: NotificationConnection
) => NotificationService;
