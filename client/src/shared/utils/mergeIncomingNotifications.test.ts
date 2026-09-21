import { describe, expect, it } from "vitest";
import { mergeIncomingNotifications } from "@/shared/utils/mergeIncomingNotifications";
import type { Notification } from "@/shared/types";

function item(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    title: "Title",
    body: "Body",
    read: false,
    createdAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("mergeIncomingNotifications", () => {
  it("returns the previous list when nothing is incoming", () => {
    const prev = [item()];
    expect(mergeIncomingNotifications(prev, [], "all")).toEqual({
      notifications: prev,
      added: 0,
    });
  });

  it("updates matching ids and keeps the rest", () => {
    const prev = [
      item({ id: "n1", title: "Old", createdAt: "2026-01-01T00:00:00.000Z" }),
      item({ id: "n2", title: "Keep", createdAt: "2026-01-03T00:00:00.000Z" }),
    ];
    const incoming = [
      item({ id: "n1", title: "New", createdAt: "2026-01-01T00:00:00.000Z" }),
      item({ id: "n3", title: "Added", createdAt: "2026-01-04T00:00:00.000Z" }),
    ];

    expect(mergeIncomingNotifications(prev, incoming, "unread")).toEqual({
      notifications: [
        item({ id: "n3", title: "Added", createdAt: "2026-01-04T00:00:00.000Z" }),
        item({ id: "n1", title: "New", createdAt: "2026-01-01T00:00:00.000Z" }),
        item({ id: "n2", title: "Keep", createdAt: "2026-01-03T00:00:00.000Z" }),
      ],
      added: 1,
    });
  });

  it("sorts when the filter is all", () => {
    const prev = [item({ id: "n1", createdAt: "2026-01-01T00:00:00.000Z" })];
    const incoming = [item({ id: "n2", createdAt: "2026-01-03T00:00:00.000Z" })];
    expect(
      mergeIncomingNotifications(prev, incoming, "all").notifications.map(
        (entry) => entry.id
      )
    ).toEqual(["n2", "n1"]);
  });
});
