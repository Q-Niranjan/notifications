import { act, render, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/shared/types";
import { InboxSessionProvider, useInboxSession } from "@/shared/hooks/useInboxSession";

const { inboxClient, list, actions, useInboxRealtime } = vi.hoisted(() => ({
  inboxClient: { clientKey: "test|user-1" },
  list: {
    notifications: [] as Notification[],
    unreadCount: 0,
    readCount: 0,
    archivedCount: 0,
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null as string | null,
    filter: "all" as const,
    setFilter: vi.fn(),
    selectedIds: [] as string[],
    refresh: vi.fn(async () => undefined),
    loadMore: vi.fn(async () => undefined),
  },
  actions: {
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    markSeen: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    openNotification: vi.fn(),
    toggleSelected: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
  },
  useInboxRealtime: vi.fn(),
}));

vi.mock("@/shared/hooks/useInboxClient", () => ({
  useInboxClient: () => inboxClient,
}));

vi.mock("@/shared/hooks/useInboxList", () => ({
  useInboxList: () => list,
}));

vi.mock("@/shared/hooks/useInboxActions", () => ({
  useInboxActions: () => actions,
}));

vi.mock("@/shared/hooks/useInboxRealtime", () => ({
  useInboxRealtime: (...args: unknown[]) => useInboxRealtime(...args),
}));

const config = {
  provider: "novu",
  subscriberId: "user-1",
  applicationIdentifier: "app-1",
};

function Probe() {
  const session = useInboxSession();
  return (
    <div>
      <span data-testid="open">{String(session.open)}</span>
      <span data-testid="all-selected">{String(session.allSelected)}</span>
      <span data-testid="unread">{session.unreadCount}</span>
      <span data-testid="copy-close">{session.copy.close}</span>
      <span data-testid="filter">{session.filter}</span>
      <button type="button" onClick={() => session.toggle()}>
        toggle
      </button>
      <button type="button" onClick={() => session.setOpen(true)}>
        open
      </button>
    </div>
  );
}

describe("useInboxSession", () => {
  beforeEach(() => {
    list.notifications = [];
    list.selectedIds = [];
    list.unreadCount = 0;
    list.filter = "all";
    list.loading = false;
    useInboxRealtime.mockClear();
  });

  it("throws outside InboxSessionProvider", () => {
    expect(() => renderHook(() => useInboxSession())).toThrow(
      "[@openg2p/notification] useInboxSession must be used within Inbox."
    );
  });

  it("provides session values from the composed hooks", () => {
    list.unreadCount = 4;
    const { getByTestId } = render(
      <InboxSessionProvider config={config} localization={{ close: "Shut" }}>
        <Probe />
      </InboxSessionProvider>
    );

    expect(getByTestId("open")).toHaveTextContent("false");
    expect(getByTestId("unread")).toHaveTextContent("4");
    expect(getByTestId("copy-close")).toHaveTextContent("Shut");
    expect(getByTestId("all-selected")).toHaveTextContent("false");
    expect(useInboxRealtime).toHaveBeenCalledWith(inboxClient, list);
  });

  it("toggles open when uncontrolled", () => {
    const { getByRole, getByTestId } = render(
      <InboxSessionProvider config={config}>
        <Probe />
      </InboxSessionProvider>
    );

    act(() => getByRole("button", { name: "toggle" }).click());
    expect(getByTestId("open")).toHaveTextContent("true");
  });

  it("uses the controlled open prop and reports changes", () => {
    const onOpenChange = vi.fn();
    const { getByRole, getByTestId, rerender } = render(
      <InboxSessionProvider
        config={config}
        open={false}
        onOpenChange={onOpenChange}
      >
        <Probe />
      </InboxSessionProvider>
    );

    act(() => getByRole("button", { name: "toggle" }).click());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(getByTestId("open")).toHaveTextContent("false");

    rerender(
      <InboxSessionProvider
        config={config}
        open={true}
        onOpenChange={onOpenChange}
      >
        <Probe />
      </InboxSessionProvider>
    );
    expect(getByTestId("open")).toHaveTextContent("true");
  });

  it("marks all selected when every notification is selected", () => {
    list.notifications = [
      { id: "n1", title: "", body: "", read: false, createdAt: "" },
      { id: "n2", title: "", body: "", read: false, createdAt: "" },
    ];
    list.selectedIds = ["n1", "n2"];

    const { getByTestId } = render(
      <InboxSessionProvider config={config}>
        <Probe />
      </InboxSessionProvider>
    );

    expect(getByTestId("all-selected")).toHaveTextContent("true");
  });
});
