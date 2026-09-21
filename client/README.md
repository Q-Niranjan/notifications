# @openg2p/notification

In-app notification inbox for OpenG2P UI.

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

## Development

From `notifications/client`:

```bash
npm install
npm run build
npm test
npm pack
```

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run build` | Compile `src` to `dist` (CJS, ESM, and types) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Re-run tests on file changes |
| `npm pack` | Create a tarball from `dist` for local installs |

Build before `npm pack`. The published package only includes `dist`.

Optional:

```bash
npm run lint
npm run lint:fix
npm run clean
```

## Usage

```tsx
"use client";

import { Inbox } from "@openg2p/notification";

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

To swap providers later, implement `NotificationService` and call `NotificationFactory.register("name", Implementation)`.

## License

MPL-2.0
