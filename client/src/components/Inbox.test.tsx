import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Inbox } from "@/components/Inbox";

const config = {
  provider: "novu",
  subscriberId: "user-1",
  applicationIdentifier: "app-1",
  subscriberhash: "1234567890",
};

const { session, useDialogFocus } = vi.hoisted(() => ({
  session: {
    open: false,
    setOpen: vi.fn(),
  },
  useDialogFocus: vi.fn(),
}));

vi.mock("@/shared/hooks", () => ({
  InboxSessionProvider: ({
    children,
    config: sessionConfig,
  }: {
    children: React.ReactNode;
    config: { provider: string };
  }) => (
    <div data-testid="session-provider" data-provider={sessionConfig.provider}>
      {children}
    </div>
  ),
  useInboxSession: () => session,
  useDialogFocus: (...args: unknown[]) => useDialogFocus(...args),
}));

vi.mock("@/components/Bell", () => ({
  Bell: () => <button type="button">Bell</button>,
}));

vi.mock("@/components/InboxPanel", () => ({
  InboxPanel: ({ visible }: { visible: boolean }) => (
    <div data-testid="inbox-panel" data-visible={String(visible)} />
  ),
}));

describe("Inbox", () => {
  beforeEach(() => {
    session.open = false;
    session.setOpen.mockClear();
    useDialogFocus.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes config through the session provider", () => {
    const { getByTestId } = render(<Inbox config={config} />);

    expect(getByTestId("session-provider")).toHaveAttribute(
      "data-provider",
      "novu"
    );
  });

  it("renders Bell when no children are passed", () => {
    const { getByRole, queryByTestId } = render(<Inbox config={config} />);

    expect(getByRole("button", { name: "Bell" })).toBeInTheDocument();
    expect(queryByTestId("inbox-panel")).not.toBeInTheDocument();
  });

  it("renders custom children instead of Bell", () => {
    const { getByRole, queryByRole } = render(
      <Inbox config={config}>
        <button type="button">Custom trigger</button>
      </Inbox>
    );

    expect(getByRole("button", { name: "Custom trigger" })).toBeInTheDocument();
    expect(queryByRole("button", { name: "Bell" })).not.toBeInTheDocument();
  });

  it("mounts the overlay and panel when open", async () => {
    const { rerender, container, getByTestId, queryByTestId } = render(
      <Inbox config={config} />
    );

    expect(queryByTestId("inbox-panel")).not.toBeInTheDocument();

    session.open = true;
    rerender(<Inbox config={config} />);

    await waitFor(() => {
      expect(getByTestId("inbox-panel")).toBeInTheDocument();
    });
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
    expect(getByTestId("inbox-panel")).toHaveAttribute("data-visible", "true");
    expect(container.querySelector(".fixed.inset-0")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("closes on overlay click", async () => {
    session.open = true;
    const { container } = render(<Inbox config={config} />);

    await waitFor(() => {
      expect(container.querySelector(".fixed.inset-0")).not.toBeNull();
    });
    fireEvent.click(container.querySelector(".fixed.inset-0")!);

    expect(session.setOpen).toHaveBeenCalledWith(false);
  });

  it("closes on mousedown outside the inbox", () => {
    session.open = true;
    render(<Inbox config={config} />);

    fireEvent.mouseDown(document.body);

    expect(session.setOpen).toHaveBeenCalledWith(false);
  });

  it("does not close on mousedown inside the inbox", () => {
    session.open = true;
    const { getByRole } = render(<Inbox config={config} />);

    fireEvent.mouseDown(getByRole("button", { name: "Bell" }));

    expect(session.setOpen).not.toHaveBeenCalled();
  });

  it("unmounts the panel after the close animation", async () => {
    vi.useFakeTimers();
    session.open = true;
    const { rerender, getByTestId, queryByTestId } = render(
      <Inbox config={config} />
    );

    expect(getByTestId("inbox-panel")).toBeInTheDocument();

    session.open = false;
    rerender(<Inbox config={config} />);

    expect(getByTestId("inbox-panel")).toHaveAttribute("data-visible", "false");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(queryByTestId("inbox-panel")).not.toBeInTheDocument();
  });

  it("traps focus while the panel is open and mounted", () => {
    session.open = true;
    render(<Inbox config={config} />);

    expect(useDialogFocus).toHaveBeenCalled();
    const lastCall = useDialogFocus.mock.calls[useDialogFocus.mock.calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });

  it("closes when dialog focus requests close", () => {
    session.open = true;
    render(<Inbox config={config} />);

    const lastCall = useDialogFocus.mock.calls[useDialogFocus.mock.calls.length - 1];
    const onClose = lastCall[2] as () => void;
    onClose();

    expect(session.setOpen).toHaveBeenCalledWith(false);
  });

  it("cancels the open animation when the inbox closes immediately", async () => {
    vi.useFakeTimers();
    const { rerender, queryByTestId } = render(<Inbox config={config} />);

    session.open = true;
    rerender(<Inbox config={config} />);

    session.open = false;
    rerender(<Inbox config={config} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(queryByTestId("inbox-panel")).not.toBeInTheDocument();
  });
});
