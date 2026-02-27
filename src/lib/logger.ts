type LogLevel = "info" | "error";

function formatPayload(level: LogLevel, message: string, context?: Record<string, unknown>) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  console.info(JSON.stringify(formatPayload("info", message, context)));
}

export function logError(message: string, error: unknown, context?: Record<string, unknown>): void {
  const normalizedError =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };

  console.error(
    JSON.stringify(
      formatPayload("error", message, {
        ...context,
        error: normalizedError,
      }),
    ),
  );
}
