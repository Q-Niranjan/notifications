import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Notification, NotificationCopy } from "@/shared/types";
import { mergeCopy } from "@/shared/utils";
import type { InboxClient } from "@/shared/hooks/useInboxClient";
import { useInboxList } from "@/shared/hooks/useInboxList";
import type { NotificationService } from "@/core/service";

const copy: NotificationCopy = mergeCopy();

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

function createService(
  overrides: Partial<NotificationService> = {}
): NotificationService {
  return {
    list: vi.fn(async () => ({ notifications: [item()], hasMore: false })),
    unreadCount: vi.fn(async () => 3),
    readCount: vi.fn(async () => 4),
    archivedCount: vi.fn(async () => 1),
    markRead: vi.fn(async () => undefined),
    readAll: vi.fn(async () => undefined),
    markSeen: vi.fn(async () => undefined),
    archive: vi.fn(async () => undefined),
    unarchive: vi.fn(async () => undefined),
    onReceived: vi.fn(() => () => undefined),
    onUnreadCount: vi.fn(() => () => undefined),
    disconnect: vi.fn(),
    ...overrides,
  };
}

function createInboxClient(
  service: NotificationService | null,
  overrides: Partial<InboxClient> = {}
): InboxClient {
  const generationRef = { current: 0 };
  const clientRef = { current: service };
  return {
    client: service,
    clientRef,
    generationRef,
    isCurrent: (generation: number) => generation === generationRef.current,
    clientKey: "test|user-1",
    connectionError: null,
    ...overrides,
  };
}

describe("useInboxList", () => {
  it("loads notifications and counts", async () => {
    const service = createService();
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(service.list).toHaveBeenCalledWith({ limit: 20, filter: "all" });
    expect(result.current.notifications).toEqual([item()]);
    expect(result.current.unreadCount).toBe(3);
    expect(result.current.readCount).toBe(4);
    expect(result.current.archivedCount).toBe(1);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("skips counts and refresh without a client", async () => {
    const inboxClient = createInboxClient(null);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.loading).toBe(true));
    await act(async () => {
      await result.current.refresh();
      await result.current.refreshCounts();
    });
    expect(result.current.notifications).toEqual([]);
  });

  it("surfaces a connection error without loading", async () => {
    const inboxClient = createInboxClient(null, {
      connectionError: "offline",
    });
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("offline");
    expect(result.current.notifications).toEqual([]);
  });

  it("stores a list error", async () => {
    const service = createService({
      list: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("boom");
  });

  it("ignores a stale list error", async () => {
    const inboxClient = createInboxClient(createService());
    const service = inboxClient.clientRef.current as NotificationService;
    service.list = vi.fn(async () => {
      inboxClient.generationRef.current += 1;
      throw new Error("stale");
    });
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(service.list).toHaveBeenCalled());
    expect(result.current.error).toBeNull();
  });

  it("drops stale list results", async () => {
    const inboxClient = createInboxClient(createService());
    const service = inboxClient.clientRef.current as NotificationService;
    service.list = vi.fn(async () => {
      inboxClient.generationRef.current += 1;
      return { notifications: [item({ id: "stale" })], hasMore: true };
    });

    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(service.list).toHaveBeenCalled());
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("clears selection when the filter changes", async () => {
    const service = createService({
      list: vi.fn(async () => ({
        notifications: [item({ id: "n1" }), item({ id: "n2" })],
        hasMore: false,
      })),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSelectedIds(["n1"]));
    act(() => result.current.setFilter("unread"));

    expect(result.current.filter).toBe("unread");
    expect(result.current.selectedIds).toEqual([]);
    await waitFor(() =>
      expect(service.list).toHaveBeenCalledWith({
        limit: 20,
        filter: "unread",
      })
    );
  });

  it("keeps selected ids that are still on the page", async () => {
    const service = createService({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          notifications: [item({ id: "n1" }), item({ id: "n2" })],
          hasMore: false,
        })
        .mockResolvedValueOnce({
          notifications: [item({ id: "n2" })],
          hasMore: false,
        }),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    act(() => result.current.setSelectedIds(["n1", "n2"]));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.selectedIds).toEqual(["n2"]);
  });

  it("loads more using active and archived cursors", async () => {
    const first = [
      item({ id: "active-1", archived: false, createdAt: "2026-01-03T00:00:00.000Z" }),
      item({ id: "archived-1", archived: true, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const nextPage = [
      item({ id: "active-2", archived: false, createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const service = createService({
      list: vi
        .fn()
        .mockResolvedValueOnce({ notifications: first, hasMore: true })
        .mockResolvedValueOnce({ notifications: nextPage, hasMore: false }),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(service.list).toHaveBeenLastCalledWith({
      limit: 20,
      after: "active-1",
      archivedAfter: "archived-1",
      filter: "all",
    });
    expect(result.current.notifications.map((entry) => entry.id)).toEqual([
      "active-1",
      "active-2",
      "archived-1",
    ]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadingMore).toBe(false);
  });

  it("loads more from the last item when the filter is not all", async () => {
    const service = createService({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          notifications: [item({ id: "seed" })],
          hasMore: false,
        })
        .mockResolvedValueOnce({
          notifications: [item({ id: "u1" }), item({ id: "u2" })],
          hasMore: true,
        })
        .mockResolvedValueOnce({
          notifications: [item({ id: "u3" })],
          hasMore: false,
        }),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilter("unread"));
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(service.list).toHaveBeenLastCalledWith({
      limit: 20,
      after: "u2",
      archivedAfter: undefined,
      filter: "unread",
    });
    expect(result.current.notifications.map((entry) => entry.id)).toEqual([
      "u1",
      "u2",
      "u3",
    ]);
  });

  it("does not load more without a cursor", async () => {
    const service = createService({
      list: vi.fn(async () => ({
        notifications: [item({ id: "" })],
        hasMore: true,
      })),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(service.list).toHaveBeenCalledOnce();
  });

  it("stores a load more error", async () => {
    const service = createService({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          notifications: [item({ id: "n1" })],
          hasMore: true,
        })
        .mockRejectedValueOnce(new Error("page failed")),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.error).toBe("page failed");
    expect(result.current.loadingMore).toBe(false);
  });

  it("ignores a stale load more result", async () => {
    const inboxClient = createInboxClient(
      createService({
        list: vi
          .fn()
          .mockResolvedValueOnce({
            notifications: [item({ id: "n1" })],
            hasMore: true,
          })
          .mockImplementationOnce(async () => {
            inboxClient.generationRef.current += 1;
            return { notifications: [item({ id: "n2" })], hasMore: false };
          }),
      })
    );
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.notifications.map((entry) => entry.id)).toEqual(["n1"]);
    expect(result.current.loadingMore).toBe(true);
  });

  it("ignores a stale load more error", async () => {
    const inboxClient = createInboxClient(createService());
    const service = inboxClient.clientRef.current as NotificationService;
    service.list = vi
      .fn()
      .mockResolvedValueOnce({
        notifications: [item({ id: "n1" })],
        hasMore: true,
      })
      .mockImplementationOnce(async () => {
        inboxClient.generationRef.current += 1;
        throw new Error("stale page");
      });
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.loadingMore).toBe(true);
  });

  it("skips load more while a page is already loading", async () => {
    let resolveList: ((value: { notifications: Notification[]; hasMore: boolean }) => void) |
      undefined;
    const service = createService({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          notifications: [item({ id: "n1" })],
          hasMore: true,
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveList = resolve;
            })
        ),
    });
    const inboxClient = createInboxClient(service);
    const { result } = renderHook(() => useInboxList(inboxClient, copy));

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    act(() => {
      void result.current.loadMore();
    });
    await act(async () => {
      await result.current.loadMore();
    });
    expect(service.list).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveList?.({ notifications: [item({ id: "n2" })], hasMore: false });
    });
  });
});
