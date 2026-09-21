import { fireEvent, render, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef, type RefObject } from "react";
import { useDialogFocus } from "@/shared/hooks/useDialogFocus";

function Dialog({
  open,
  onClose,
  empty,
}: {
  open: boolean;
  onClose: () => void;
  empty?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(open, ref, onClose);
  return (
    <div ref={ref} tabIndex={-1} data-testid="dialog">
      {empty ? null : (
        <>
          <button type="button">First</button>
          <button type="button">Last</button>
        </>
      )}
    </div>
  );
}

describe("useDialogFocus", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 10;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 10;
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when closed or when the dialog node is missing", () => {
    const onClose = vi.fn();
    const { rerender } = render(<Dialog open={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    const dialogRef: RefObject<HTMLElement | null> = { current: null };
    renderHook(() => useDialogFocus(true, dialogRef, onClose));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    rerender(<Dialog open={true} onClose={onClose} />);
  });

  it("focuses the dialog when it opens", async () => {
    const { getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} />
    );
    await waitFor(() => expect(getByTestId("dialog")).toHaveFocus());
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(<Dialog open={true} onClose={onClose} />);
    await waitFor(() => expect(document.querySelector("[data-testid=dialog]")).toHaveFocus());

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("lets Shift+Tab move away from the last control", async () => {
    const { getByRole, getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} />
    );
    await waitFor(() => expect(getByTestId("dialog")).toHaveFocus());
    const last = getByRole("button", { name: "Last" });
    last.focus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("traps Tab from the last control to the first", async () => {
    const { getByRole, getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} />
    );
    await waitFor(() => expect(getByTestId("dialog")).toHaveFocus());
    const last = getByRole("button", { name: "Last" });
    last.focus();
    expect(last).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("traps Shift+Tab from the first control to the last", async () => {
    const { getByRole, getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} />
    );
    getByRole("button", { name: "First" }).focus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(getByRole("button", { name: "Last" })).toHaveFocus();

    getByTestId("dialog").focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(getByRole("button", { name: "Last" })).toHaveFocus();
  });

  it("ignores keys other than Tab and Escape", () => {
    const onClose = vi.fn();
    render(<Dialog open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cycles Tab back into the dialog when focus has left", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    const { getByRole, getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} />
    );
    await waitFor(() => expect(getByTestId("dialog")).toHaveFocus());
    outside.focus();
    expect(outside).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(getByRole("button", { name: "First" })).toHaveFocus();

    outside.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(getByRole("button", { name: "Last" })).toHaveFocus();
    outside.remove();
  });

  it("focuses the dialog when Tab is pressed with no controls", () => {
    const { getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} empty />
    );
    fireEvent.keyDown(document, { key: "Tab" });
    expect(getByTestId("dialog")).toHaveFocus();
  });

  it("restores the previously focused element on close", async () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();

    const { rerender, getByTestId } = render(
      <Dialog open={true} onClose={() => undefined} />
    );
    await waitFor(() => expect(getByTestId("dialog")).toHaveFocus());

    rerender(<Dialog open={false} onClose={() => undefined} />);
    expect(outside).toHaveFocus();
    outside.remove();
  });
});
