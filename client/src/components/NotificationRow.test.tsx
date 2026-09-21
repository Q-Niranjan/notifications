import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/shared/types";
import { NotificationRow } from "@/components/NotificationRow";

const { session, refMode } = vi.hoisted(() => ({
  session: {
    copy: {
      justNow: "Just now",
      showMore: "Show more",
      showLess: "Show less",
      markAsRead: "Mark as read",
      archive: "Archive",
      unarchive: "Remove from archive",
      viewDetails: "View details",
    },
    filter: "all" as "all" | "archived",
    openNotification: vi.fn(),
    markRead: vi.fn(),
    markSeen: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
  },
  refMode: { missingNode: false },
}));

vi.mock("@/shared/hooks", () => ({
  useInboxSession: () => session,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useRef: ((initial: unknown) => {
      if (!refMode.missingNode) return actual.useRef(initial);
      const ref = { current: null as HTMLDivElement | null };
      Object.defineProperty(ref, "current", {
        get: () => null,
        set: () => undefined,
      });
      return ref;
    }) as typeof actual.useRef,
  };
});

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    title: "Grant approved",
    body: "Your request was approved.",
    read: false,
    seen: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationRow", () => {
  let observerCallback: IntersectionObserverCallback | undefined;

  beforeEach(() => {
    session.filter = "all";
    session.openNotification.mockClear();
    session.markRead.mockClear();
    session.markSeen.mockClear();
    session.archive.mockClear();
    session.unarchive.mockClear();
    observerCallback = undefined;
    refMode.missingNode = false;

    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          observerCallback = callback;
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return [];
        }
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("opens the notification when the row is clicked", () => {
    const item = notification();
    const { getByRole } = render(<NotificationRow notification={item} />);

    fireEvent.click(getByRole("listitem"));
    expect(session.openNotification).toHaveBeenCalledWith(item);
  });

  it("opens from the heading without bubbling to the row", () => {
    const item = notification();
    const { getByRole } = render(<NotificationRow notification={item} />);

    session.openNotification.mockClear();
    fireEvent.click(getByRole("button", { name: "Grant approved" }));

    expect(session.openNotification).toHaveBeenCalledWith(item);
    expect(session.openNotification).toHaveBeenCalledOnce();
  });

  it("marks unread items as read and archive them", () => {
    const { getByRole } = render(
      <NotificationRow notification={notification({ read: false })} />
    );

    fireEvent.click(getByRole("button", { name: "Mark as read" }));
    expect(session.markRead).toHaveBeenCalledWith(["n1"]);

    fireEvent.click(getByRole("button", { name: "Archive" }));
    expect(session.archive).toHaveBeenCalledWith(["n1"]);
    expect(getByRole("listitem")).toHaveClass("bg-indigo-50/40");
  });

  it("shows unarchive instead of mark-read on archived items", () => {
    const { getByRole, queryByRole } = render(
      <NotificationRow
        notification={notification({ read: false, archived: true })}
      />
    );

    expect(queryByRole("button", { name: "Mark as read" })).not.toBeInTheDocument();
    expect(queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();

    fireEvent.click(getByRole("button", { name: "Remove from archive" }));
    expect(session.unarchive).toHaveBeenCalledWith(["n1"]);
  });

  it("shows unarchive when the archived filter is active", () => {
    session.filter = "archived";
    const { getByRole, queryByRole } = render(
      <NotificationRow notification={notification({ read: true })} />
    );

    expect(queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(getByRole("button", { name: "Remove from archive" })).toBeInTheDocument();
  });

  it("renders body, time, and primary action", () => {
    const { getByText, getByRole } = render(
      <NotificationRow
        notification={notification({
          primaryAction: { label: "Open case" },
        })}
      />
    );

    expect(getByText("Your request was approved.")).toBeInTheDocument();
    expect(getByText("Just now")).toBeInTheDocument();
    expect(getByRole("button", { name: "Open case" })).toBeInTheDocument();
  });

  it("uses the person name when title is empty", () => {
    const { getByRole, queryByRole } = render(
      <NotificationRow
        notification={notification({
          title: "",
          subscriber: { id: "p1", firstName: "Ada", lastName: "Lovelace" },
        })}
      />
    );

    expect(getByRole("button", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(queryByRole("button", { name: "Mark as read" })).toBeInTheDocument();
  });

  it("renders a row without heading, body, or timestamp", () => {
    const { getByRole, queryByText, queryByRole } = render(
      <NotificationRow
        notification={notification({
          title: "",
          body: "",
          createdAt: "",
          read: true,
        })}
      />
    );

    expect(getByRole("listitem")).toBeInTheDocument();
    expect(queryByRole("button", { name: "Grant approved" })).not.toBeInTheDocument();
    expect(queryByText("Your request was approved.")).not.toBeInTheDocument();
    expect(queryByText("Just now")).not.toBeInTheDocument();
  });

  it("does not observe rows that are already seen", () => {
    render(<NotificationRow notification={notification({ seen: true })} />);
    expect(observerCallback).toBeUndefined();
  });

  it("does not observe when the row node is missing", () => {
    refMode.missingNode = true;
    render(<NotificationRow notification={notification({ seen: false })} />);
    expect(observerCallback).toBeUndefined();
  });

  it("ignores observer updates without an intersecting entry", () => {
    render(<NotificationRow notification={notification({ seen: false })} />);

    observerCallback?.([], {} as IntersectionObserver);
    observerCallback?.(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );

    expect(session.markSeen).not.toHaveBeenCalled();
  });

  it("marks the notification seen after it stays visible", async () => {
    vi.useFakeTimers();
    render(<NotificationRow notification={notification({ seen: false })} />);

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(session.markSeen).toHaveBeenCalledWith(["n1"]);
  });

  it("does not mark seen when the row leaves the viewport", async () => {
    vi.useFakeTimers();
    render(<NotificationRow notification={notification({ seen: false })} />);

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      observerCallback?.(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(session.markSeen).not.toHaveBeenCalled();
  });
});
