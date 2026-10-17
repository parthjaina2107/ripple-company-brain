export async function api<T>(
  path: string,
  data?: unknown,
  options: { timeoutMs?: number } = {},
): Promise<T> {
  // Reads should not leave the initial screen spinning indefinitely. Mutations
  // get a longer budget for model calls and are never automatically retried.
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? (data === undefined ? 15000 : 60000),
  );
  try {
    const response = await fetch(`/api${path}`, {
      method: data === undefined ? "GET" : "POST",
      headers:
        data === undefined ? undefined : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: controller.signal,
    });
    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        "The API is unavailable or restarting. Wait a moment and retry.",
      );
    }
    if (!response.ok)
      throw new Error(
        [result.error || "Request failed.", ...(result.details || [])].join(
          " ",
        ),
      );
    return result as T;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        data === undefined
          ? "The workspace connection timed out. The API or database may be reconnecting. Click Retry connection."
          : "The request timed out. Reload the workspace to check whether the change completed before trying again.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Cannot reach the API. Check that the development server is running, then retry.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
