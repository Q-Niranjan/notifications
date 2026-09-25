import { beforeEach, describe, expect, it, vi } from "vitest";
import { NovuNotificationService, toNotification } from "@/providers/novu";

const { novu } = vi.hoisted(() => {
  const listeners = new Map<string, (event: unknown) => void>();
  const novu = {
    lastOptions: undefined as Record<string, unknown> | undefined,
    notifications: {
      list: vi.fn(),
      count: vi.fn(),
      read: vi.fn(),
      readAll: vi.fn(),
      seenAll: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
    },
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, handler);
      return () => listeners.delete(event);
    }),
    socket: {
      disconnect: vi.fn(),
    },
    emit(event: string, payload: unknown) {
      listeners.get(event)?.(payload);
    },
    resetListeners() {
      listeners.clear();
    },
  };
  return { novu };
});

vi.mock("@novu/js", () => ({
  Novu: class {
    constructor(options: Record<string, unknown>) {
      novu.lastOptions = options;
      return novu;
    }
  },
}));

const connection = {
  subscriber: { subscriberId: "user-1" },
  applicationIdentifier: "app-1",
  subscriberHash: "hash",
  backendUrl: "https://api.example.com",
  socketUrl: "wss://ws.example.com",
  context: {
    tenant: "acme",
    org: { id: "org-1", data: { plan: "pro" } },
  },
  contextHash: "ctx-hash",
};

function okList(notifications: unknown[], hasMore = false) {
  return { data: { notifications, hasMore }, error: undefined };
}

function okCount(count: number) {
  return { data: { count }, error: undefined };
}

function ok() {
  return { error: undefined };
}

function mapNotification(raw: Record<string, unknown>) {
  return toNotification(raw as Parameters<typeof toNotification>[0]);
}

describe("toNotification", () => {
  it("maps Novu fields onto the inbox notification", () => {
    expect(
      mapNotification({
        _id: "n1",
        subject: "Hello",
        content: "From content",
        isRead: true,
        isArchived: false,
        createdAt: "2026-01-02T00:00:00.000Z",
        channelType: "in_app",
        to: { subscriberId: "sub-1", firstName: "Ada", lastName: "Lovelace" },
        primaryAction: {
          label: "Open",
          redirect: { url: "https://example.com", target: "_blank" },
        },
        secondaryAction: { label: "primary" },
        workflow: { id: "wf-1", name: "Grant" },
      })
    ).toMatchObject({
      id: "n1",
      title: "Hello",
      body: "From content",
      read: true,
      archived: false,
      channel: "in_app",
      subscriber: {
        id: "sub-1",
        firstName: "Ada",
        lastName: "Lovelace",
      },
      primaryAction: {
        label: "Open",
        redirect: { url: "https://example.com", target: "_blank" },
      },
      redirect: { url: "https://example.com", target: "_blank" },
      workflow: { id: "wf-1", name: "Grant" },
    });
  });

  it("prefers body over content and drops empty people and actions", () => {
    expect(
      mapNotification({
        id: "n2",
        body: "Body",
        content: "Ignored",
        read: true,
        to: {},
        primaryAction: { label: "  " },
        workflow: {},
      })
    ).toMatchObject({
      id: "n2",
      body: "Body",
      read: true,
      subscriber: undefined,
      primaryAction: undefined,
      workflow: undefined,
    });
  });

  it("maps a person id and a top-level redirect", () => {
    expect(
      mapNotification({
        id: "n3",
        to: { id: "p1", firstName: "Ada", avatar: "https://a" },
        redirect: { url: "https://app.example", target: "_self" },
        workflow: { identifier: "grant" },
      })
    ).toMatchObject({
      id: "n3",
      subscriber: { id: "p1", firstName: "Ada", avatar: "https://a" },
      redirect: { url: "https://app.example", target: "_self" },
      workflow: { identifier: "grant" },
    });
  });

  it("uses an empty person id when only a name is present", () => {
    expect(
      mapNotification({
        to: { lastName: "Lovelace" },
        content: 12,
        redirect: {},
        primaryAction: { redirect: { url: "https://only-redirect" } },
      })
    ).toMatchObject({
      id: "",
      body: "",
      subscriber: { id: "", lastName: "Lovelace" },
      primaryAction: {
        label: "",
        redirect: { url: "https://only-redirect" },
      },
      redirect: { url: "https://only-redirect" },
    });
  });
});

describe("NovuNotificationService", () => {
  beforeEach(() => {
    novu.resetListeners();
    novu.lastOptions = undefined;
    novu.notifications.list.mockReset();
    novu.notifications.count.mockReset();
    novu.notifications.read.mockReset();
    novu.notifications.readAll.mockReset();
    novu.notifications.seenAll.mockReset();
    novu.notifications.archive.mockReset();
    novu.notifications.unarchive.mockReset();
    novu.on.mockClear();
    novu.socket.disconnect.mockClear();
    novu.notifications.list.mockResolvedValue(okList([]));
    novu.notifications.count.mockResolvedValue(okCount(0));
    novu.notifications.read.mockResolvedValue(ok());
    novu.notifications.readAll.mockResolvedValue(ok());
    novu.notifications.seenAll.mockResolvedValue(ok());
    novu.notifications.archive.mockResolvedValue(ok());
    novu.notifications.unarchive.mockResolvedValue(ok());
  });

  it("requires subscriberId and applicationIdentifier", () => {
    expect(() => new NovuNotificationService({ subscriber: { subscriberId: "" } })).toThrow(
      "[@openg2p/notification] Novu requires subscriberId."
    );
    expect(
      () => new NovuNotificationService({ subscriber: { subscriberId: "user-1" } })
    ).toThrow("[@openg2p/notification] Novu requires applicationIdentifier.");
  });

  it("constructs Novu with the connection", () => {
    new NovuNotificationService(connection);

    expect(novu.lastOptions).toEqual({
      applicationIdentifier: "app-1",
      subscriber: { subscriberId: "user-1" },
      subscriberHash: "hash",
      apiUrl: "https://api.example.com",
      backendUrl: "https://api.example.com",
      socketUrl: "wss://ws.example.com",
      context: {
        tenant: "acme",
        org: { id: "org-1", data: { plan: "pro" } },
      },
      contextHash: "ctx-hash",
    });
  });

  it("omits context when the connection has none", () => {
    new NovuNotificationService({
      subscriber: { subscriberId: "user-1" },
      applicationIdentifier: "app-1",
    });
    expect(novu.lastOptions?.context).toBeUndefined();
  });

  it("lists all notifications by merging active and archived", async () => {
    novu.notifications.list
      .mockResolvedValueOnce(
        okList([{ id: "a", subject: "Active", createdAt: "2026-01-02T00:00:00.000Z" }], true)
      )
      .mockResolvedValueOnce(
        okList([{ id: "b", subject: "Archived", createdAt: "2026-01-01T00:00:00.000Z" }])
      );

    const client = new NovuNotificationService(connection);
    const result = await client.list({
      filter: "all",
      after: "cursor-a",
      archivedAfter: "cursor-b",
    });

    expect(novu.notifications.list).toHaveBeenNthCalledWith(1, {
      limit: 20,
      after: "cursor-a",
      archived: false,
      useCache: false,
    });
    expect(novu.notifications.list).toHaveBeenNthCalledWith(2, {
      limit: 20,
      after: "cursor-b",
      archived: true,
      useCache: false,
    });
    expect(result.notifications.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.hasMore).toBe(true);
  });

  it("skips empty and duplicate ids when listing all", async () => {
    novu.notifications.list
      .mockResolvedValueOnce({ data: { hasMore: false }, error: undefined })
      .mockResolvedValueOnce(
        okList([{ id: "a" }, { id: "" }, { id: "a" }], true)
      )
      .mockResolvedValueOnce(okList([{ id: "b" }]))
      .mockResolvedValueOnce({ data: undefined, error: undefined });
    const client = new NovuNotificationService(connection);

    const first = await client.list();
    expect(first.notifications.map((item) => item.id)).toEqual(["a"]);
    expect(first.hasMore).toBe(true);

    const second = await client.list();
    expect(second.notifications.map((item) => item.id)).toEqual(["b"]);
    expect(second.hasMore).toBe(false);
  });

  it("lists unread notifications with the unread query", async () => {
    novu.notifications.list.mockResolvedValueOnce(
      okList([{ id: "u1", subject: "Unread" }], true)
    );
    const client = new NovuNotificationService(connection);
    const result = await client.list({ filter: "unread", limit: 5, after: "c1" });

    expect(novu.notifications.list).toHaveBeenCalledWith({
      limit: 5,
      after: "c1",
      useCache: false,
      archived: false,
      read: false,
    });
    expect(result.notifications).toHaveLength(1);
    expect(result.hasMore).toBe(true);
  });

  it("lists read and archived with the matching query", async () => {
    const client = new NovuNotificationService(connection);
    novu.notifications.list.mockResolvedValue(okList([]));

    await client.list({ filter: "read" });
    expect(novu.notifications.list).toHaveBeenLastCalledWith({
      limit: 20,
      after: undefined,
      useCache: false,
      archived: false,
      read: true,
    });

    await client.list({ filter: "archived" });
    expect(novu.notifications.list).toHaveBeenLastCalledWith({
      limit: 20,
      after: undefined,
      useCache: false,
      archived: true,
    });

    novu.notifications.list.mockResolvedValue({ data: undefined, error: undefined });
    await expect(client.list({ filter: "read" })).resolves.toEqual({
      notifications: [],
      hasMore: false,
    });
  });

  it("throws when listing fails", async () => {
    novu.notifications.list.mockResolvedValue({
      data: undefined,
      error: new Error("boom"),
    });
    const client = new NovuNotificationService(connection);

    await expect(client.list({ filter: "unread" })).rejects.toThrow(
      "[@openg2p/notification] boom"
    );
  });

  it("throws when the archived list fails", async () => {
    novu.notifications.list
      .mockResolvedValueOnce(okList([]))
      .mockResolvedValueOnce({
        data: undefined,
        error: new Error("archived boom"),
      });
    const client = new NovuNotificationService(connection);

    await expect(client.list()).rejects.toThrow(
      "[@openg2p/notification] archived boom"
    );
  });

  it("loads unread, read, and archived counts", async () => {
    novu.notifications.count
      .mockResolvedValueOnce(okCount(4))
      .mockResolvedValueOnce(okCount(7))
      .mockResolvedValueOnce(okCount(2));
    const client = new NovuNotificationService(connection);

    await expect(client.unreadCount()).resolves.toBe(4);
    await expect(client.readCount()).resolves.toBe(7);
    await expect(client.archivedCount()).resolves.toBe(2);
  });

  it("returns 0 when count data is missing", async () => {
    novu.notifications.count.mockResolvedValue({ data: undefined, error: undefined });
    const client = new NovuNotificationService(connection);
    await expect(client.unreadCount()).resolves.toBe(0);
    await expect(client.readCount()).resolves.toBe(0);
    await expect(client.archivedCount()).resolves.toBe(0);
  });

  it("throws when counts fail", async () => {
    novu.notifications.count.mockResolvedValue({
      data: undefined,
      error: new Error("nope"),
    });
    const client = new NovuNotificationService(connection);
    await expect(client.unreadCount()).rejects.toThrow(
      "[@openg2p/notification] nope"
    );
    await expect(client.readCount()).rejects.toThrow(
      "[@openg2p/notification] nope"
    );
    await expect(client.archivedCount()).rejects.toThrow(
      "[@openg2p/notification] nope"
    );
  });

  it("marks read, seen, archive, and unarchive through Novu", async () => {
    const client = new NovuNotificationService(connection);

    await client.markRead("n1");
    await client.readAll();
    await client.markSeen(["n1", "n2"]);
    await client.archive("n1");
    await client.unarchive("n1");

    expect(novu.notifications.read).toHaveBeenCalledWith({ notificationId: "n1" });
    expect(novu.notifications.readAll).toHaveBeenCalledOnce();
    expect(novu.notifications.seenAll).toHaveBeenCalledWith({
      notificationIds: ["n1", "n2"],
    });
    expect(novu.notifications.archive).toHaveBeenCalledWith({ notificationId: "n1" });
    expect(novu.notifications.unarchive).toHaveBeenCalledWith({
      notificationId: "n1",
    });
  });

  it("skips markSeen when there are no ids", async () => {
    const client = new NovuNotificationService(connection);
    await client.markSeen([]);
    expect(novu.notifications.seenAll).not.toHaveBeenCalled();
  });

  it("forwards received notifications from the socket", () => {
    const client = new NovuNotificationService(connection);
    const handler = vi.fn();
    client.onReceived(handler);

    novu.emit("notifications.notification_received", {
      result: { id: "live", subject: "Ping" },
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: "live", title: "Ping" })
    );

    handler.mockClear();
    novu.emit("notifications.notification_received", { id: "direct", subject: "Hi" });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ id: "direct", title: "Hi" })
    );

    handler.mockClear();
    novu.emit("notifications.notification_received", { subject: "no-id" });
    novu.emit("notifications.notification_received", "bad");
    expect(handler).not.toHaveBeenCalled();

    handler.mockImplementation(() => {
      throw new Error("handler failed");
    });
    expect(() =>
      novu.emit("notifications.notification_received", { id: "live" })
    ).not.toThrow();
  });

  it("forwards unread count socket events", () => {
    const client = new NovuNotificationService(connection);
    const handler = vi.fn();
    client.onUnreadCount(handler);

    novu.emit("notifications.unread_count_changed", { result: 9 });
    novu.emit("notifications.unread_count_changed", { total: 3 });
    novu.emit("notifications.unread_count_changed", { result: { total: "x" } });
    novu.emit("notifications.unread_count_changed", { result: {} });
    novu.emit("notifications.unread_count_changed", "bad");

    expect(handler).toHaveBeenNthCalledWith(1, 9);
    expect(handler).toHaveBeenNthCalledWith(2, 3);
    expect(handler).toHaveBeenNthCalledWith(3, 0);
    expect(handler).toHaveBeenNthCalledWith(4, 0);
    expect(handler).toHaveBeenNthCalledWith(5, 0);
  });

  it("disconnects the Novu socket", () => {
    const client = new NovuNotificationService(connection);
    client.disconnect();
    expect(novu.socket.disconnect).toHaveBeenCalledOnce();
  });
});
