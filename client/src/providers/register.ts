import { NotificationFactory } from "@/core/factory";
import { NovuNotificationService } from "@/providers/novu";

NotificationFactory.register("novu", NovuNotificationService);
