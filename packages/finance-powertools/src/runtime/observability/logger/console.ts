import { Cause, Effect, Logger } from "effect";

type LoggerOptions = Parameters<Parameters<typeof Logger.make>[0]>[0];

const formatContext = (annotations: LoggerOptions["annotations"]) =>
  Object.fromEntries(Array.from(annotations));

const formatCause = (cause: LoggerOptions["cause"]) =>
  Cause.isEmptyType(cause) ? undefined : Cause.pretty(cause);

const baseConsoleLogger = Logger.make((options: LoggerOptions) => {
  const { logLevel, message, cause, annotations } = options;
  const timestamp = new Date().toISOString();
  const formatted = [timestamp, logLevel.label, String(message)].join(" | ");

  console.log(formatted);

  const context = formatContext(annotations);
  if (Object.keys(context).length > 0) {
    console.log("context", context);
  }

  const renderedCause = formatCause(cause);
  if (renderedCause) {
    console.error(renderedCause);
  }
});

export const consoleLoggerLayer = () => Logger.replace(Logger.defaultLogger, baseConsoleLogger);

const structuredLogger = Logger.make((options: LoggerOptions) => {
  const { logLevel, message, cause, annotations } = options;
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level: logLevel.label,
    message: String(message),
  };

  const context = formatContext(annotations);
  if (Object.keys(context).length > 0) {
    payload.context = context;
  }

  const renderedCause = formatCause(cause);
  if (renderedCause) {
    payload.cause = renderedCause;
  }

  console.log(JSON.stringify(payload));
});

export const structuredConsoleLoggerLayer = () =>
  Logger.replace(Logger.defaultLogger, structuredLogger);

export const customLoggerLayer = (
  handler: (options: LoggerOptions) => Effect.Effect<void, never>,
) =>
  Logger.replace(
    Logger.defaultLogger,
    Logger.make((options: LoggerOptions) => {
      void Effect.runFork(handler(options));
    }),
  );
