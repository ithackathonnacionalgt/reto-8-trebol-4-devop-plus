import type { LogLevel } from "../config/env.js";

const SENSITIVE_FIELD = /api[_-]?key|access[_-]?key|secret|authorization|password|token/i;
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogContext = Record<string, unknown>;

export interface LogSink {
  write(line: string): void;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const consoleSink: LogSink = {
  write: (line) => console.log(line),
};

export function createLogger(level: LogLevel, sink: LogSink = consoleSink): Logger {
  const log = (messageLevel: LogLevel, message: string, context?: LogContext): void => {
    if (LOG_LEVEL_PRIORITY[messageLevel] < LOG_LEVEL_PRIORITY[level]) {
      return;
    }

    const contextSuffix = context === undefined ? "" : ` ${JSON.stringify(redact(context))}`;
    sink.write(`[${messageLevel.toUpperCase()}] ${message}${contextSuffix}`);
  };

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
  };
}

export function redact(value: unknown, fieldName?: string): unknown {
  if (fieldName !== undefined && SENSITIVE_FIELD.test(fieldName)) {
    return "[REDACTED]";
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redact(nestedValue, key)]),
    );
  }

  return value;
}
