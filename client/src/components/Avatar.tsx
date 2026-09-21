"use client";

import { useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";

export function Avatar({
  url,
  name,
  accented,
}: {
  url?: string;
  name?: string;
  accented?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={38}
        height={38}
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-black/[0.06] sm:h-[38px] sm:w-[38px]"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-[38px] sm:w-[38px] ${
        accented ? "bg-indigo-50 text-indigo-500" : "bg-neutral-100 text-neutral-400"
      }`}
      aria-hidden="true"
      title={name}
    >
      <InboxIcon size={16} strokeWidth={1.8} />
    </span>
  );
}
