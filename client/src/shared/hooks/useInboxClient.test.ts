import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationFactory } from "@/core/factory";
import type { NotificationConnection } from "@/shared/types";
import { useInboxClient } from "@/shared/hooks/useInboxClient";

vi.mock("@/providers/register", () => ({}));

class TestService {
  connection: NotificationConnection;
  disconnect = vi.fn();

  constructor(connection: NotificationConnection) {
    this.connection = connection;
  }

  list = vi.fn(async () => ({ notifications: [], hasMore: false }));
  unreadCount = vi.fn(async () => 0);
  readCount = vi.fn(async () => 0);
  archivedCount = vi.fn(async () => 0);
  markRead = vi.fn(async () => undefined);
  readAll = vi.fn(async () => undefined);
  markSeen = vi.fn(async () => undefined);
  archive = vi.fn(async () => undefined);
  unarchive = vi.fn(async () => undefined);
  onReceived = vi.fn(() => () => undefined);
  onUnreadCount = vi.fn(() => () => undefined);
}

const config = {
  provider: "test",
  subscriberId: "user-1",
  applicationIdentifier: "app-1",
  subscriberHash: "hash",
  backendUrl: "https://api.example.com",
  socketUrl: "wss://ws.example.com",
};

describe("useInboxClient", () => {
  beforeEach(() => {
    NotificationFactory.register("test", TestService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a client from the registered provider", () => {
    const { result } = renderHook(() =>
      useInboxClient(config, "Couldn't connect")
    );
    const client = result.current.client as TestService;

    expect(client).toBeInstanceOf(TestService);
    expect(client.connection).toEqual({
      subscriberId: "user-1",
      applicationIdentifier: "app-1",
      subscriberHash: "hash",
      backendUrl: "https://api.example.com",
      socketUrl: "wss://ws.example.com",
      subscriber: undefined,
      context: undefined,
      contextHash: undefined,
    });
    expect(result.current.clientRef.current).toBe(client);
    expect(result.current.connectionError).toBeNull();
    expect(result.current.clientKey).toContain("test|user-1|app-1");
    expect(result.current.isCurrent(result.current.generationRef.current)).toBe(
      true
    );
    expect(result.current.isCurrent(0)).toBe(false);
  });

  it("disconnects the client on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useInboxClient(config, "Couldn't connect")
    );
    const client = result.current.client as TestService;

    unmount();
    expect(client.disconnect).toHaveBeenCalledOnce();
  });

  it("reconnects when the connection key changes", () => {
    const { result, rerender } = renderHook(
      ({ subscriberId }) =>
        useInboxClient({ ...config, subscriberId }, "Couldn't connect"),
      { initialProps: { subscriberId: "user-1" } }
    );
    const first = result.current.client as TestService;

    rerender({ subscriberId: "user-2" });
    const second = result.current.client as TestService;

    expect(first.disconnect).toHaveBeenCalledOnce();
    expect(second).toBeInstanceOf(TestService);
    expect(second).not.toBe(first);
    expect(second.connection.subscriberId).toBe("user-2");
  });

  it("stores the connection error when create fails", () => {
    const { result } = renderHook(() =>
      useInboxClient(
        { ...config, provider: "missing" },
        "Couldn't connect"
      )
    );

    expect(result.current.client).toBeNull();
    expect(result.current.clientRef.current).toBeNull();
    expect(result.current.connectionError).toBe(
      '[@openg2p/notification] Unknown provider "missing"'
    );
  });

  it("uses the fallback when create throws a non-Error", () => {
    vi.spyOn(NotificationFactory, "create").mockImplementation(() => {
      throw "offline";
    });

    const { result } = renderHook(() =>
      useInboxClient(config, "Couldn't connect")
    );

    expect(result.current.client).toBeNull();
    expect(result.current.connectionError).toBe("Couldn't connect");
  });
});
