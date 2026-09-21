import type { NotificationConnection } from "../shared/types";
import type {
  NotificationProvider,
  NotificationService,
} from "./service";

const providers = new Map<string, NotificationProvider>();

export class NotificationFactory {
  static register(
    name: string,
    provider: NotificationProvider
  ): void {
    providers.set(name, provider);
  }

  static create(
    name: string,
    connection: NotificationConnection
  ): NotificationService {
    const Provider = providers.get(name);

    if (!Provider) {
      throw new Error(
        `[@openg2p/notification] Unknown provider "${name}"`
      );
    }

    return new Provider(connection);
  }
}
