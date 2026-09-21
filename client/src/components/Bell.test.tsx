import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Bell } from "@/components/Bell";

const { session } = vi.hoisted(() => ({
  session: {
    unreadCount: 0,
    open: false,
    toggle: vi.fn(),
    copy: { notifications: "Notifications" },
    panelId: "inbox-panel",
  },
}));

vi.mock("@/shared/hooks", () => ({
  useInboxSession: () => session,
}));

describe("Bell", () => {
  beforeEach(() => {
    session.unreadCount = 0;
    session.open = false;
    session.toggle.mockClear();
  });

  it("renders a closed bell with no badge when unreadCount is 0", () => {
    const { getByRole, container } = render(<Bell />);
    const button = getByRole("button");

    expect(button).toHaveAttribute("aria-label", "Notifications");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).not.toHaveAttribute("aria-controls");
    expect(container.querySelector("span.absolute")).not.toBeInTheDocument();
  });

  it("shows the unread count and label", () => {
    session.unreadCount = 5;
    const { getByRole, container } = render(<Bell />);

    expect(getByRole("button")).toHaveAttribute(
      "aria-label",
      "Notifications, 5 unread"
    );
    expect(container.querySelector("span.absolute")).toHaveTextContent("5");
    expect(container.querySelector("span.absolute")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("shows 99+ when unreadCount is greater than 99", () => {
    session.unreadCount = 100;
    const { container } = render(<Bell />);

    expect(container.querySelector("span.absolute")).toHaveTextContent("99+");
  });

  it("exposes the panel when open", () => {
    session.open = true;
    const { getByRole } = render(<Bell />);
    const button = getByRole("button");

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", "inbox-panel");
  });

  it("calls toggle on click", () => {
    const { getByRole } = render(<Bell />);
    fireEvent.click(getByRole("button"));
    expect(session.toggle).toHaveBeenCalledOnce();
  });

  it("appends className on the button", () => {
    const { getByRole } = render(<Bell className="text-red-500" />);
    expect(getByRole("button")).toHaveClass("text-red-500");
  });
});