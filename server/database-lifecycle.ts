import type { EventEmitter } from "node:events";

// FalkorDB forwards socket errors as EventEmitter 'error' events. Without a
// listener Node terminates the API process, even when node-redis can reconnect.
export function handleDatabaseErrors(
  client: Pick<EventEmitter, "on">,
  report: (message: string) => void = console.warn,
) {
  let reported = false;
  client.on("error", () => {
    if (!reported)
      report(
        "FalkorDB connection interrupted. Reconnecting; preview fallback is disabled.",
      );
    reported = true;
  });
  return () => {
    reported = false;
  };
}
