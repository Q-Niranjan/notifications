"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { NotificationFactory } from "../../core/factory";
import type { NotificationService } from "../../core/service";
import type { NotificationConfig } from "../types";
import { connectionKey, errorMessage } from "../utils";
import "../../providers/register";

export type InboxClient = {
  client: NotificationService | null;
  clientRef: RefObject<NotificationService | null>;
  generationRef: RefObject<number>;
  isCurrent: (generation: number) => boolean;
  clientKey: string;
  connectionError: string | null;
};

export function useInboxClient(
  config: NotificationConfig,
  errorFallback: string
): InboxClient {
  const connection = {
    subscriberId: config.subscriberId,
    applicationIdentifier: config.applicationIdentifier,
    subscriberHash: config.subscriberHash,
    backendUrl: config.backendUrl,
    socketUrl: config.socketUrl,
    context: config.context,
    contextHash: config.contextHash,
  };
  const clientKey = `${config.provider}|${connectionKey(connection)}`;
  const connectionRef = useRef(connection);
  connectionRef.current = connection;

  const [client, setClient] = useState<NotificationService | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const clientRef = useRef<NotificationService | null>(null);
  const generationRef = useRef(0);

  const isCurrent = useCallback((generation: number) => {
    return generation === generationRef.current;
  }, []);

  useEffect(() => {
    generationRef.current += 1;
    setConnectionError(null);

    try {
      const next = NotificationFactory.create(
        config.provider,
        connectionRef.current
      );
      clientRef.current = next;
      setClient(next);
      return () => {
        generationRef.current += 1;
        clientRef.current = null;
        next.disconnect();
      };
    } catch (err) {
      clientRef.current = null;
      setClient(null);
      setConnectionError(errorMessage(err, errorFallback));
      return undefined;
    }
  }, [clientKey, config.provider, errorFallback]);

  return {
    client,
    clientRef,
    generationRef,
    isCurrent,
    clientKey,
    connectionError,
  };
}
