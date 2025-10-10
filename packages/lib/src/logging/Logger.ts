import pino from "pino";
import pinoPretty from "pino-pretty";
import { logConfig } from "../services/AppConfig";
import { getRequestInfo } from "./RequestInfo";

const { level, pretty } = logConfig;

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
        };
      },
      formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
      },
    },
    stream,
  );

export const rootLogger = createLogger();
