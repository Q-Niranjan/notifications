import type { NotificationPerson } from "../types";

export function formatPersonName(
  person?: Pick<NotificationPerson, "firstName" | "lastName">
): string {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}
