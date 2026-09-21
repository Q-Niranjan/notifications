import type { NotificationPerson } from "@/shared/types";

export function formatPersonName(
  person?: Pick<NotificationPerson, "firstName" | "lastName">
): string {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}
