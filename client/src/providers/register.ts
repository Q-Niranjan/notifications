import { NotificationFactory } from "../core/factory";
import { NovuNotificationService } from "./novu";

NotificationFactory.register("novu", NovuNotificationService);
