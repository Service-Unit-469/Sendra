import pino from "pino";
import pinoPretty from "pino-pretty";
import { getRequestInfo } from "../request-ids";
import { getLogConfig } from "../services/AppConfig";

const { level, pretty } = getLogConfig();

const stream = pretty
  ? pinoPretty({
      levelFirst: true,
      colorize: true,
    })
  : process.stdout;

const createLogger = () =>
  pino(
    {
      level,
      mixin: () => {
        const requestInfo = getRequestInfo();
        return {
          reqId: requestInfo.requestId,
          correlationId: requestInfo.correlationId,
        };
      },
      formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
      },
      redact: ["req.headers.authorization", "*.public", "*.secret"],
    },
    stream,
  );

export const rootLogger = createLogger();
