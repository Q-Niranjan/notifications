# @openg2p/notification

In-app notification inbox for OpenG2P frontends.

Host apps render `Inbox` and pass a connection config. The package talks to the notification provider through an adapter, so application UI never imports Novu (or any other vendor SDK) directly.

Novu is the built-in provider. Other providers can be registered on `NotificationFactory`.

## Features

- Bell with unread badge and dropdown inbox
- All / Unread / Archived filters
- Mark as read, mark all as read, archive, unarchive
- Live updates over the provider WebSocket
- Pagination (20 per page)
- Localization overrides
- `useInboxSession` hook for custom UI inside `Inbox`

## Architecture

```text
Host app
   │
   ▼
Inbox / Bell / useInboxSession
   │
   ▼
NotificationFactory.create(provider, connection)
   │
   ▼
NotificationService adapter  (Novu today)
   │
   ▼
Provider SDK + API / WebSocket
```

The browser connects to the provider. OpenG2P backends do not proxy inbox REST or WebSocket traffic.

| Layer | Role |
|---|---|
| `Inbox` | Bell, panel, and session wiring |
| `NotificationFactory` | Looks up a provider by name |
| `NotificationService` | Provider-neutral inbox contract |
| `NovuNotificationService` | Novu adapter (`@novu/js`) |

The host app maps its own env or runtime config into `Inbox` `config`. `subscriberId` is the current user. Do not render `Inbox` until `provider`, `applicationIdentifier`, and `subscriberId` are all set.

## Usage

```tsx
"use client";

import { Inbox } from "@openg2p/notification-ui-lib";

<Inbox
  config={{
    provider: "novu",
    subscriberId,
    applicationIdentifier,
    backendUrl,
    socketUrl,
  }}
  localization={{
    notifications: t("notifications"),
    empty: t("no_notifications"),
  }}
/>
```

Pass children to `Inbox` to replace the default `Bell`. `useInboxSession` must be used under `Inbox`.

Peer dependencies: `react`, `react-dom`, and `lucide-react`. The inbox uses Tailwind utility classes, so the host app must generate them (for Next.js, add `transpilePackages: ["@openg2p/notification-ui-lib"]`).

To swap providers later, implement `NotificationService` and call `NotificationFactory.register("name", Implementation)`.

## License

MPL-2.0
