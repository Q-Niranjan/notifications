"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { InboxSessionProvider, useDialogFocus, useInboxSession } from "../shared/hooks";
import type { NotificationInboxProps } from "../shared/types";
import { Bell } from "./Bell";
import { InboxPanel } from "./InboxPanel";

function InboxShell({ children }: { children?: ReactNode }) {
  const { open, setOpen } = useInboxSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timeout = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(timeout);
  }, [open]);

  useDialogFocus(open && mounted, panelRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, setOpen]);

  return (
    <div className="relative inline-flex overflow-visible" ref={rootRef}>
      {children ?? <Bell />}
      {mounted ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <InboxPanel visible={visible} panelRef={panelRef} />
        </>
      ) : null}
    </div>
  );
}

export function Inbox(props: NotificationInboxProps) {
  const { children, ...sessionProps } = props;
  return (
    <InboxSessionProvider {...sessionProps}>
      <InboxShell>{children}</InboxShell>
    </InboxSessionProvider>
  );
}
