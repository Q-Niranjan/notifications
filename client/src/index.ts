import "@/providers/register";

export * from "@/shared/types";
export * from "@/core/service";
export * from "@/core/factory";
export * from "@/providers";

export type {
  NotificationService as INotificationService,
  NotificationService as NotificationClient,
} from "@/core/service";

export { useInboxSession } from "@/shared/hooks";
export { Inbox, Bell } from "@/components";
