import { errorMessage } from "@/shared/utils/errorMessage";

export function throwIfError(error: unknown, action: string): void {
  if (!error) return;
  throw new Error(
    `[@openg2p/notification] ${errorMessage(error, `Failed to ${action}`)}`
  );
}
