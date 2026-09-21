import { fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/shared/types";
import { InboxPanel } from "@/components/InboxPanel";

const { session } = vi.hoisted(() => ({
  session: {
    notifications: [] as Notification[],
    loading: false,
    loadingMore: false,
    hasMore: false,
    error: null as string | null,
    copy: {
      notifications: "Notifications",
      empty: "You're all caught up",
      loading: "Loading notifications…",
      error: "Couldn't load notifications",
      retry: "Retry",
      loadMore: "Load more",
      markAllAsRead: "Mark all as read",
      close: "Close notifications",
      filterAll: "All",
      filterUnread: "Unread",
      filterArchived: "Archived",
    },
    filter: "all" as "all" | "unread" | "archived",
    unreadCount: 0,
    readCount: 0,
    archivedCount: 0,
    listId: "list-1",
    panelId: "panel-1",
    titleId: "title-1",
    refresh: vi.fn(),
    loadMore: vi.fn(),
    markAllRead: vi.fn(),
    setOpen: vi.fn(),
    setFilter: vi.fn(),
  },
}));

vi.mock("@/shared/hooks", () => ({
  useInboxSession: () => session,
}));

vi.mock("@/components/NotificationRow", () => ({
  NotificationRow: ({ notification }: { notification: Notification }) => (
    <div role="listitem">{notification.title}</div>
  ),
}));

function renderPanel(visible = true) {
  return render(<InboxPanel visible={visible} panelRef={createRef<HTMLDivElement>()} />);
}

function notification(id: string, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    title: `Title ${id}`,
    body: "",
    read: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("InboxPanel", () => {
  beforeEach(() => {
    session.notifications = [];
    session.loading = false;
    session.loadingMore = false;
    session.hasMore = false;
    session.error = null;
    session.filter = "all";
    session.unreadCount = 0;
    session.readCount = 0;
    session.archivedCount = 0;
    session.refresh.mockClear();
    session.loadMore.mockClear();
    session.markAllRead.mockClear();
    session.setOpen.mockClear();
    session.setFilter.mockClear();
  });

  it("renders the dialog title and close control", () => {
    const { getByRole } = renderPanel();
    const dialog = getByRole("dialog");

    expect(dialog).toHaveAttribute("id", "panel-1");
    expect(dialog).toHaveAttribute("aria-labelledby", "title-1");
    expect(getByRole("heading", { name: "Notifications" })).toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: "Close notifications" }));
    expect(session.setOpen).toHaveBeenCalledWith(false);
  });

  it("applies the hidden animation class when not visible", () => {
    const { getByRole } = renderPanel(false);

    expect(getByRole("dialog")).toHaveClass("opacity-0");
  });

  it("shows mark all as read when there are unread items", () => {
    session.notifications = [notification("1")];
    const { getByRole } = renderPanel();

    fireEvent.click(getByRole("button", { name: "Mark all as read" }));
    expect(session.markAllRead).toHaveBeenCalledOnce();
  });

  it("hides mark all as read on the archived tab", () => {
    session.filter = "archived";
    session.notifications = [notification("1")];
    const { queryByRole } = renderPanel();

    expect(queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument();
  });

  it("changes filter on tab click and keyboard", () => {
    session.unreadCount = 100;
    const { getByRole } = renderPanel();

    expect(getByRole("tab", { name: /Unread/ })).toHaveTextContent("99+");

    fireEvent.click(getByRole("tab", { name: /Unread/ }));
    expect(session.setFilter).toHaveBeenCalledWith("unread");

    const allTab = getByRole("tab", { name: /All/ });
    fireEvent.keyDown(allTab, { key: "ArrowRight" });
    expect(session.setFilter).toHaveBeenCalledWith("unread");

    fireEvent.keyDown(allTab, { key: "ArrowLeft" });
    expect(session.setFilter).toHaveBeenCalledWith("archived");

    fireEvent.keyDown(allTab, { key: "Home" });
    expect(session.setFilter).toHaveBeenCalledWith("all");

    fireEvent.keyDown(allTab, { key: "ArrowDown" });
    expect(session.setFilter).toHaveBeenCalledWith("unread");

    fireEvent.keyDown(allTab, { key: "ArrowUp" });
    expect(session.setFilter).toHaveBeenCalledWith("archived");
  });

  it("moves to the last filter tab on End", () => {
    const { getByRole } = renderPanel();

    fireEvent.keyDown(getByRole("tab", { name: /Unread/ }), {
      key: "End",
      code: "End",
    });

    expect(session.setFilter).toHaveBeenCalledTimes(1);
    expect(session.setFilter).toHaveBeenCalledWith("archived");
  });

  it("ignores keys that are not filter shortcuts", () => {
    const { getByRole } = renderPanel();

    fireEvent.keyDown(getByRole("tab", { name: /All/ }), { key: "Enter" });

    expect(session.setFilter).not.toHaveBeenCalled();
  });

  it("shows the loading state", () => {
    session.loading = true;
    const { getByText, queryByRole } = renderPanel();

    expect(getByText("Loading notifications…")).toBeInTheDocument();
    expect(queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("shows the error state and retries", () => {
    session.error = "nope";
    const { getByText, getByRole } = renderPanel();

    expect(getByText("Couldn't load notifications")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Retry" }));
    expect(session.refresh).toHaveBeenCalledOnce();
  });

  it("shows the empty state", () => {
    const { getByText } = renderPanel();

    expect(getByText("You're all caught up")).toBeInTheDocument();
  });

  it("renders notification rows", () => {
    session.notifications = [notification("1"), notification("2", { read: true })];
    const { getByText, queryByRole } = renderPanel();

    expect(getByText("Title 1")).toBeInTheDocument();
    expect(getByText("Title 2")).toBeInTheDocument();
    expect(queryByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
  });

  it("loads more when hasMore is true", () => {
    session.hasMore = true;
    session.notifications = [notification("1")];
    const { getByRole } = renderPanel();

    fireEvent.click(getByRole("button", { name: "Load more" }));
    expect(session.loadMore).toHaveBeenCalledOnce();
  });

  it("disables load more while loadingMore", () => {
    session.hasMore = true;
    session.loadingMore = true;
    session.notifications = [notification("1")];
    const { getByRole } = renderPanel();

    expect(getByRole("button", { name: /Load more/ })).toBeDisabled();
  });
});
