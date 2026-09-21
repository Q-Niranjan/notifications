import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Notification, NotificationCopy } from "@/shared/types";
import { mergeCopy } from "@/shared/utils";
import { followRedirect } from "@/shared/utils";
import type { InboxClient } from "@/shared/hooks/useInboxClient";
import type { InboxList } from "@/shared/hooks/useInboxList";
import { useInboxActions } from "@/shared/hooks/useInboxActions";
import type { NotificationService } from "@/core/service";

vi.mock("@/shared/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/utils")>();
  return { ...actual, followRedirect: vi.fn() };
});

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
    list: vi.fn(async () => ({ notifications: [], hasMore: false })),
    unreadCount: vi.fn(async () => 0),
    readCount: vi.fn(async () => 0),
    archivedCount: vi.fn(async () => 0),
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

function setup(options?: {
  filter?: InboxList["filter"];
  notifications?: Notification[];
  service?: NotificationService | null;
  clientKey?: string;
}) {
  const notifications = options?.notifications ?? [item()];
  const service = options?.service === undefined ? createService() : options.service;
  const generationRef = { current: 1 };
  const inboxClient: InboxClient = {
    client: service,
    clientRef: { current: service },
    generationRef,
    isCurrent: (generation: number) => generation === generationRef.current,
    clientKey: options?.clientKey ?? "test|user-1",
    connectionError: null,
  };
  const list = {
    filter: options?.filter ?? "all",
    setNotifications: vi.fn(),
    setSelectedIds: vi.fn(),
    setError: vi.fn(),
    refresh: vi.fn(async () => undefined),
    refreshCounts: vi.fn(async () => undefined),
    notificationsRef: { current: notifications },
  } as unknown as InboxList;

  const hook = renderHook(
    ({ client, inboxList }) => useInboxActions(client, inboxList, copy),
    { initialProps: { client: inboxClient, inboxList: list } }
  );

  return { ...hook, inboxClient, list, service, generationRef };
}

function applyUpdate(
  setNotifications: InboxList["setNotifications"],
  current: Notification[]
) {
  const updater = vi.mocked(setNotifications).mock.calls[0][0] as
    | Notification[]
    | ((prev: Notification[]) => Notification[]);
  return typeof updater === "function" ? updater(current) : updater;
}

describe("useInboxActions", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(followRedirect).mockClear();
  });

  it("marks ids as read", async () => {
    const current = [item({ id: "n1" }), item({ id: "n2" })];
    const { result, list, service } = setup({ notifications: current });

    await act(async () => {
      await result.current.markRead(["n1"]);
    });

    expect(service?.markRead).toHaveBeenCalledWith("n1");
    expect(applyUpdate(list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n1", read: true, seen: true }),
      expect.objectContaining({ id: "n2", read: false }),
    ]);
    expect(list.setSelectedIds).toHaveBeenCalled();
    const deselect = vi.mocked(list.setSelectedIds).mock.calls[0][0] as (
      prev: string[]
    ) => string[];
    expect(deselect(["n1", "n2"])).toEqual(["n2"]);
    expect(list.refreshCounts).toHaveBeenCalledWith(1);
  });

  it("removes read ids from the unread filter", async () => {
    const current = [item({ id: "n1" }), item({ id: "n2" })];
    const { result, list } = setup({
      filter: "unread",
      notifications: current,
    });

    await act(async () => {
      await result.current.markRead(["n1"]);
    });

    expect(applyUpdate(list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n2" }),
    ]);
  });

  it("does not mark read without a client or ids", async () => {
    const { result, service } = setup();
    await act(async () => {
      await result.current.markRead([]);
    });
    expect(service?.markRead).not.toHaveBeenCalled();

    const empty = setup({ service: null });
    await act(async () => {
      await empty.result.current.markRead(["n1"]);
    });
  });

  it("refreshes when mark read fails", async () => {
    const service = createService({
      markRead: vi.fn(async () => {
        throw new Error("denied");
      }),
    });
    const { result, list } = setup({ service });

    await act(async () => {
      await result.current.markRead(["n1"]);
    });

    expect(list.setError).toHaveBeenCalledWith("denied");
    expect(list.refresh).toHaveBeenCalledOnce();
  });

  it("marks all as read", async () => {
    const current = [item({ id: "n1" }), item({ id: "n2", read: true })];
    const { result, list, service } = setup({ notifications: current });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(service?.readAll).toHaveBeenCalledOnce();
    expect(applyUpdate(list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n1", read: true, seen: true }),
      expect.objectContaining({ id: "n2", read: true }),
    ]);
  });

  it("refreshes when mark all read fails", async () => {
    const service = createService({
      readAll: vi.fn(async () => {
        throw new Error("denied");
      }),
    });
    const { result, list } = setup({ service });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(list.setError).toHaveBeenCalledWith("denied");
    expect(list.refresh).toHaveBeenCalledOnce();
  });

  it("does not mark all as read without a client", async () => {
    const { result, list } = setup({ service: null });
    await act(async () => {
      await result.current.markAllRead();
    });
    expect(list.refreshCounts).not.toHaveBeenCalled();
  });

  it("ignores a stale mark all read result", async () => {
    const { result, list, generationRef, service } = setup();
    vi.mocked(service!.readAll).mockImplementation(async () => {
      generationRef.current += 1;
    });

    await act(async () => {
      await result.current.markAllRead();
    });
    expect(list.refreshCounts).not.toHaveBeenCalled();
  });

  it("ignores a stale mark all read error", async () => {
    const service = createService({
      readAll: vi.fn(async () => undefined),
    });
    const { result, list, generationRef } = setup({ service });
    vi.mocked(service.readAll).mockImplementation(async () => {
      generationRef.current += 1;
      throw new Error("denied");
    });

    await act(async () => {
      await result.current.markAllRead();
    });
    expect(list.setError).not.toHaveBeenCalled();
    expect(list.refresh).not.toHaveBeenCalled();
  });

  it("clears the unread list when marking all as read", async () => {
    const current = [item({ id: "n1" })];
    const { result, list } = setup({ filter: "unread", notifications: current });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(applyUpdate(list.setNotifications, current)).toEqual([]);
  });

  it("archives on the all filter and removes otherwise", async () => {
    const current = [item({ id: "n1" }), item({ id: "n2" })];
    const all = setup({ notifications: current });
    await act(async () => {
      await all.result.current.archive(["n1"]);
    });
    expect(all.service?.archive).toHaveBeenCalledWith("n1");
    expect(applyUpdate(all.list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n1", archived: true }),
      expect.objectContaining({ id: "n2" }),
    ]);

    const unread = setup({ filter: "unread", notifications: current });
    await act(async () => {
      await unread.result.current.archive(["n1"]);
    });
    expect(applyUpdate(unread.list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n2" }),
    ]);
  });

  it("does not archive without a client", async () => {
    const { result, list } = setup({ service: null });
    await act(async () => {
      await result.current.archive(["n1"]);
    });
    expect(list.setNotifications).not.toHaveBeenCalled();
  });

  it("unarchives on non-archived filters and removes on archived", async () => {
    const current = [
      item({ id: "n1", archived: true }),
      item({ id: "n2", archived: true }),
    ];
    const all = setup({ notifications: current });
    await act(async () => {
      await all.result.current.unarchive(["n1"]);
    });
    expect(all.service?.unarchive).toHaveBeenCalledWith("n1");
    expect(applyUpdate(all.list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n1", archived: false }),
      expect.objectContaining({ id: "n2", archived: true }),
    ]);

    const archived = setup({ filter: "archived", notifications: current });
    await act(async () => {
      await archived.result.current.unarchive(["n1"]);
    });
    expect(applyUpdate(archived.list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n2", archived: true }),
    ]);
  });

  it("does not unarchive without a client", async () => {
    const { result, list } = setup({ service: null });
    await act(async () => {
      await result.current.unarchive(["n1"]);
    });
    expect(list.setNotifications).not.toHaveBeenCalled();
  });

  it("ignores a stale id action result", async () => {
    const { result, list, generationRef, service } = setup();
    vi.mocked(service!.markRead).mockImplementation(async () => {
      generationRef.current += 1;
    });

    await act(async () => {
      await result.current.markRead(["n1"]);
    });
    expect(list.refreshCounts).not.toHaveBeenCalled();
  });

  it("ignores a stale id action error", async () => {
    const service = createService();
    const { result, list, generationRef } = setup({ service });
    vi.mocked(service.markRead).mockImplementation(async () => {
      generationRef.current += 1;
      throw new Error("denied");
    });

    await act(async () => {
      await result.current.markRead(["n1"]);
    });
    expect(list.setError).not.toHaveBeenCalled();
    expect(list.refresh).not.toHaveBeenCalled();
  });

  it("toggles, selects, and clears selection", () => {
    const { result, list } = setup();

    act(() => result.current.toggleSelected("n1"));
    const toggle = vi.mocked(list.setSelectedIds).mock.calls[0][0] as (
      prev: string[]
    ) => string[];
    expect(toggle([])).toEqual(["n1"]);
    expect(toggle(["n1"])).toEqual([]);

    act(() => result.current.selectAll());
    expect(list.setSelectedIds).toHaveBeenCalledWith(["n1"]);

    act(() => result.current.clearSelection());
    expect(list.setSelectedIds).toHaveBeenLastCalledWith([]);
  });

  it("opens a notification and follows its redirect", async () => {
    const notification = item({
      id: "n1",
      redirect: { url: "https://example.com" },
    });
    const { result, service } = setup({ notifications: [notification] });

    await act(async () => {
      await result.current.openNotification(notification);
    });

    expect(service?.markRead).toHaveBeenCalledWith("n1");
    expect(followRedirect).toHaveBeenCalledWith({ url: "https://example.com" });
  });

  it("does not mark an already read notification before opening", async () => {
    const notification = item({ id: "n1", read: true });
    const { result, service } = setup({ notifications: [notification] });

    await act(async () => {
      await result.current.openNotification(notification, {
        url: "https://other.example",
      });
    });

    expect(service?.markRead).not.toHaveBeenCalled();
    expect(followRedirect).toHaveBeenCalledWith({
      url: "https://other.example",
    });
  });

  it("does not queue seen ids that are already handled", () => {
    const { result, list } = setup({
      notifications: [item({ id: "n1", seen: true })],
    });
    act(() => result.current.markSeen(["n1"]));
    expect(list.setNotifications).not.toHaveBeenCalled();
  });

  it("keeps one seen flush timer for later ids", async () => {
    vi.useFakeTimers();
    const current = [item({ id: "n1", seen: false }), item({ id: "n3", seen: false })];
    const { result, service } = setup({ notifications: current });

    act(() => result.current.markSeen(["n1"]));
    act(() => result.current.markSeen(["n3"]));
    expect(service?.markSeen).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service?.markSeen).toHaveBeenCalledWith(["n1", "n3"]);
  });

  it("skips seen flush without a client", async () => {
    vi.useFakeTimers();
    const { result, inboxClient, service } = setup({
      notifications: [item({ seen: false })],
    });

    act(() => result.current.markSeen(["n1"]));
    inboxClient.clientRef.current = null;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service?.markSeen).not.toHaveBeenCalled();
  });

  it("flushes seen ids after the delay", async () => {
    vi.useFakeTimers();
    const current = [item({ id: "n1", seen: false }), item({ id: "n2", seen: true })];
    const { result, list, service } = setup({ notifications: current });

    act(() => result.current.markSeen(["n1", "n1", "n2", ""]));
    expect(applyUpdate(list.setNotifications, current)).toEqual([
      expect.objectContaining({ id: "n1", seen: true }),
      expect.objectContaining({ id: "n2", seen: true }),
    ]);
    expect(service?.markSeen).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service?.markSeen).toHaveBeenCalledWith(["n1"]);
  });

  it("swallows seen errors", async () => {
    vi.useFakeTimers();
    const service = createService({
      markSeen: vi.fn(async () => {
        throw new Error("seen failed");
      }),
    });
    const { result } = setup({ service, notifications: [item({ seen: false })] });

    act(() => result.current.markSeen(["n1"]));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service.markSeen).toHaveBeenCalledWith(["n1"]);
  });

  it("flushes pending seen ids on unmount", async () => {
    const { result, service, unmount } = setup({
      notifications: [item({ seen: false })],
    });

    act(() => result.current.markSeen(["n1"]));
    unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(service?.markSeen).toHaveBeenCalledWith(["n1"]);
  });

  it("clears the seen timer when the client key changes", async () => {
    vi.useFakeTimers();
    const { result, rerender, inboxClient, list, service } = setup({
      notifications: [item({ seen: false })],
    });

    act(() => result.current.markSeen(["n1"]));
    inboxClient.clientKey = "test|user-2";
    rerender({ client: inboxClient, inboxList: list });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(service?.markSeen).not.toHaveBeenCalled();
  });
});
