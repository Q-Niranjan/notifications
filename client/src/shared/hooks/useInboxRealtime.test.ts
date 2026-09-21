import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/shared/types";
import type { InboxClient } from "@/shared/hooks/useInboxClient";
import type { InboxList } from "@/shared/hooks/useInboxList";
import { useInboxRealtime } from "@/shared/hooks/useInboxRealtime";
import type { NotificationService } from "@/core/service";

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

function setup(options?: {
  filter?: InboxList["filter"];
  notifications?: Notification[];
  unreadCount?: number;
  list?: Partial<NotificationService>;
}) {
  const received = new Map<string, (payload: Notification) => void>();
  const counts = new Map<string, (count: number) => void>();
  const offReceived = vi.fn();
  const offCount = vi.fn();
  const service: NotificationService = {
    list: vi.fn(async () => ({ notifications: [], hasMore: false })),
    unreadCount: vi.fn(async () => 0),
    readCount: vi.fn(async () => 8),
    archivedCount: vi.fn(async () => 2),
    markRead: vi.fn(async () => undefined),
    readAll: vi.fn(async () => undefined),
    markSeen: vi.fn(async () => undefined),
    archive: vi.fn(async () => undefined),
    unarchive: vi.fn(async () => undefined),
    onReceived: vi.fn((handler) => {
      received.set("received", handler);
      return offReceived;
    }),
    onUnreadCount: vi.fn((handler) => {
      counts.set("count", handler);
      return offCount;
    }),
    disconnect: vi.fn(),
    ...options?.list,
  };
  const generationRef = { current: 1 };
  const unreadCountRef = { current: options?.unreadCount ?? 0 };
  const notifications = options?.notifications ?? [];
  const notificationsRef = { current: notifications };
  const inboxClient: InboxClient = {
    client: service,
    clientRef: { current: service },
    generationRef,
    isCurrent: (generation: number) => generation === generationRef.current,
    clientKey: "test|user-1",
    connectionError: null,
  };
  const list = {
    filter: options?.filter ?? "all",
    setNotifications: vi.fn((updater: (prev: Notification[]) => Notification[]) => {
      if (typeof updater === "function") {
        notificationsRef.current = updater(notificationsRef.current);
      }
    }),
    notificationsRef,
    setHasMore: vi.fn(),
    setUnreadCount: vi.fn((count: number) => {
      unreadCountRef.current = count;
    }),
    unreadCountRef,
    setReadCount: vi.fn(),
    setArchivedCount: vi.fn(),
  } as unknown as InboxList;

  const hook = renderHook(() => useInboxRealtime(inboxClient, list));
  return {
    ...hook,
    service,
    list,
    inboxClient,
    emitReceived: (notification: Notification) =>
      received.get("received")?.(notification),
    emitCount: (count: number) => counts.get("count")?.(count),
    offReceived,
    offCount,
  };
}

describe("useInboxRealtime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does nothing without a client", () => {
    const inboxClient: InboxClient = {
      client: null,
      clientRef: { current: null },
      generationRef: { current: 0 },
      isCurrent: () => true,
      clientKey: "test|user-1",
      connectionError: null,
    };
    const list = {
      filter: "all",
      setNotifications: vi.fn(),
      notificationsRef: { current: [] },
      setHasMore: vi.fn(),
      setUnreadCount: vi.fn(),
      unreadCountRef: { current: 0 },
      setReadCount: vi.fn(),
      setArchivedCount: vi.fn(),
    } as unknown as InboxList;

    renderHook(() => useInboxRealtime(inboxClient, list));
    expect(list.setNotifications).not.toHaveBeenCalled();
  });

  it("prepends a received notification", () => {
    const current = [item({ id: "n1" })];
    const { emitReceived, list } = setup({ notifications: current });
    const incoming = item({ id: "live", title: "Ping" });

    act(() => emitReceived(incoming));
    const updater = vi.mocked(list.setNotifications).mock.calls[0][0] as (
      prev: Notification[]
    ) => Notification[];
    expect(updater(current)).toEqual([incoming, ...current]);
  });

  it("ignores duplicate or empty received ids", () => {
    const current = [item({ id: "n1" })];
    const { emitReceived, list } = setup({ notifications: current });

    act(() => emitReceived(item({ id: "n1" })));
    act(() => emitReceived(item({ id: "" })));

    const first = vi.mocked(list.setNotifications).mock.calls[0][0] as (
      prev: Notification[]
    ) => Notification[];
    const second = vi.mocked(list.setNotifications).mock.calls[1][0] as (
      prev: Notification[]
    ) => Notification[];
    expect(first(current)).toBe(current);
    expect(second(current)).toBe(current);
  });

  it("ignores received notifications on read and archived filters", () => {
    const read = setup({ filter: "read" });
    act(() => read.emitReceived(item({ id: "live" })));
    expect(read.list.setNotifications).not.toHaveBeenCalled();

    const archived = setup({ filter: "archived" });
    act(() => archived.emitReceived(item({ id: "live" })));
    expect(archived.list.setNotifications).not.toHaveBeenCalled();
  });

  it("updates counts when unread count changes", async () => {
    const { emitCount, list, service } = setup({ unreadCount: 2 });

    await act(async () => {
      emitCount(2);
      await Promise.resolve();
    });

    expect(list.setUnreadCount).toHaveBeenCalledWith(2);
    expect(list.setReadCount).toHaveBeenCalledWith(8);
    expect(list.setArchivedCount).toHaveBeenCalledWith(2);
    expect(service.list).not.toHaveBeenCalled();
  });

  it("pulls the latest unread page when the count increases", async () => {
    const incoming = item({ id: "live" });
    const { emitCount, list, service } = setup({
      unreadCount: 0,
      list: {
        list: vi.fn(async () => ({ notifications: [incoming], hasMore: true })),
      },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });

    expect(service.list).toHaveBeenCalledWith({ limit: 20, filter: "unread" });
    expect(list.setNotifications).toHaveBeenCalled();
  });

  it("updates hasMore when pulling a filtered page", async () => {
    const { emitCount, list, service } = setup({
      filter: "unread",
      unreadCount: 0,
      list: {
        list: vi.fn(async () => ({
          notifications: [item({ id: "u1" })],
          hasMore: true,
        })),
      },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });

    expect(service.list).toHaveBeenCalledWith({ limit: 20, filter: "unread" });
    expect(list.setHasMore).toHaveBeenCalledWith(true);
  });

  it("swallows count refresh errors", async () => {
    const { emitCount } = setup({
      unreadCount: 2,
      list: {
        readCount: vi.fn(async () => {
          throw new Error("count failed");
        }),
        archivedCount: vi.fn(async () => {
          throw new Error("count failed");
        }),
      },
    });

    await act(async () => {
      emitCount(2);
      await Promise.resolve();
    });
  });

  it("does not retry after unmount", async () => {
    vi.useFakeTimers();
    const { emitCount, unmount, service } = setup({
      unreadCount: 0,
      list: {
        list: vi.fn(async () => ({ notifications: [], hasMore: false })),
      },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service.list).toHaveBeenCalledOnce();
  });

  it("retries the live merge when nothing was added", async () => {
    vi.useFakeTimers();
    const listFn = vi
      .fn()
      .mockResolvedValueOnce({ notifications: [], hasMore: false })
      .mockResolvedValueOnce({
        notifications: [item({ id: "late" })],
        hasMore: false,
      });
    const { emitCount, service } = setup({
      unreadCount: 0,
      list: { list: listFn },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });
    expect(service.list).toHaveBeenCalledOnce();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it("does not pull when the count increases on read or archived", async () => {
    const { emitCount, service } = setup({
      filter: "read",
      unreadCount: 0,
    });

    await act(async () => {
      emitCount(4);
      await Promise.resolve();
    });
    expect(service.list).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount, offReceived, offCount } = setup();
    unmount();
    expect(offReceived).toHaveBeenCalledOnce();
    expect(offCount).toHaveBeenCalledOnce();
  });

  it("swallows pull errors", async () => {
    const { emitCount, service } = setup({
      unreadCount: 0,
      list: {
        list: vi.fn(async () => {
          throw new Error("live failed");
        }),
      },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });
    expect(service.list).toHaveBeenCalledOnce();
  });

  it("drops a stale live pull", async () => {
    const { emitCount, list, inboxClient, service } = setup({
      unreadCount: 0,
      list: {
        list: vi.fn(async () => {
          inboxClient.generationRef.current += 1;
          return { notifications: [item({ id: "stale" })], hasMore: false };
        }),
      },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });

    expect(service.list).toHaveBeenCalledOnce();
    expect(list.setNotifications).not.toHaveBeenCalled();
  });

  it("drops count updates after a stale generation", async () => {
    let resolveRead: ((value: number) => void) | undefined;
    let resolveArchived: ((value: number) => void) | undefined;
    const { emitCount, list, inboxClient } = setup({
      unreadCount: 2,
      list: {
        readCount: vi.fn(
          () =>
            new Promise<number>((resolve) => {
              resolveRead = resolve;
            })
        ),
        archivedCount: vi.fn(
          () =>
            new Promise<number>((resolve) => {
              resolveArchived = resolve;
            })
        ),
      },
    });

    act(() => emitCount(2));
    inboxClient.generationRef.current += 1;
    await act(async () => {
      resolveRead?.(9);
      resolveArchived?.(4);
      await Promise.resolve();
    });
    expect(list.setReadCount).not.toHaveBeenCalled();
    expect(list.setArchivedCount).not.toHaveBeenCalled();
  });

  it("drops count updates after unmount", async () => {
    let resolveRead: ((value: number) => void) | undefined;
    let resolveArchived: ((value: number) => void) | undefined;
    const { emitCount, unmount, list } = setup({
      unreadCount: 2,
      list: {
        readCount: vi.fn(
          () =>
            new Promise<number>((resolve) => {
              resolveRead = resolve;
            })
        ),
        archivedCount: vi.fn(
          () =>
            new Promise<number>((resolve) => {
              resolveArchived = resolve;
            })
        ),
      },
    });

    act(() => emitCount(2));
    unmount();
    await act(async () => {
      resolveRead?.(9);
      resolveArchived?.(4);
      await Promise.resolve();
    });
    expect(list.setReadCount).not.toHaveBeenCalled();
    expect(list.setArchivedCount).not.toHaveBeenCalled();
  });

  it("does not run a scheduled retry after cancel", async () => {
    vi.useFakeTimers();
    vi.spyOn(window, "clearTimeout").mockImplementation(() => undefined);
    const { emitCount, unmount, service } = setup({
      unreadCount: 0,
      list: {
        list: vi.fn(async () => ({ notifications: [], hasMore: false })),
      },
    });

    await act(async () => {
      emitCount(1);
      await Promise.resolve();
    });
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service.list).toHaveBeenCalledOnce();
  });
});
