import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "@/shared/types";
import { NotificationActions } from "@/components/NotificationActions";

const { session } = vi.hoisted(() => ({
  session: {
    copy: { viewDetails: "View details" },
    openNotification: vi.fn(),
  },
}));

vi.mock("@/shared/hooks", () => ({
  useInboxSession: () => session,
}));

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    title: "Title",
    body: "Body",
    read: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("NotificationActions", () => {
  beforeEach(() => {
    session.openNotification.mockClear();
  });

  it("renders nothing when there are no actions", () => {
    const { container } = render(
      <NotificationActions notification={notification()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("opens the primary action redirect and does not bubble", () => {
    const onParentClick = vi.fn();
    const item = notification({
      primaryAction: {
        label: "Open",
        redirect: { url: "https://example.com", target: "_blank" },
      },
    });
    const { getByRole } = render(
      <div onClick={onParentClick}>
        <NotificationActions notification={item} />
      </div>
    );

    fireEvent.click(getByRole("button", { name: "Open" }));

    expect(session.openNotification).toHaveBeenCalledWith(item, {
      url: "https://example.com",
      target: "_blank",
    });
    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("falls back to view details when the label is empty", () => {
    const { getByRole } = render(
      <NotificationActions
        notification={notification({
          secondaryAction: { label: "" },
        })}
      />
    );

    expect(getByRole("button", { name: "View details" })).toBeInTheDocument();
  });

  it("renders primary and secondary actions", () => {
    const { getByRole } = render(
      <NotificationActions
        notification={notification({
          primaryAction: { label: "Accept" },
          secondaryAction: { label: "Dismiss" },
        })}
      />
    );

    expect(getByRole("button", { name: "Accept" })).toHaveClass("bg-indigo-600");
    expect(getByRole("button", { name: "Dismiss" })).toHaveClass("bg-neutral-100");
    expect(getByRole("button", { name: "Accept" }).querySelector("svg")).not.toBeNull();
  });
});
