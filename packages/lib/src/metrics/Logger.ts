import { createMetricsLogger, type MetricsLogger, Unit } from "aws-embedded-metrics";
import { Resource } from "sst";
import { getRequestInfo } from "../logging";
import { getLogConfig } from "../services/AppConfig";

export type DimensionsType = {
  Operation: string;
} & Record<string, string>;

export const getMetricsLogger = (dimensions: DimensionsType) => {
  const logger = createMetricsLogger();
  let stage = "Local";
  try {
    stage = Resource.App.stage;
  } catch {
    // we're running locally
  }
  logger.setNamespace("Sendra");
  logger.putDimensions({ ...dimensions, Stage: stage });

  const requestInfo = getRequestInfo();
  logger.setProperty("RequestId", requestInfo.requestId);
  logger.setProperty("CorrelationId", requestInfo.correlationId);
  return logger;
};

export const withMetrics = async <T>(fn: (metricsLogger: MetricsLogger) => Promise<T>, dimensions: DimensionsType) => {
  const logger = getMetricsLogger(dimensions);
  const start = Date.now();

  try {
    const result = await fn(logger);
    logger.putMetric("Success", 1, Unit.Count);
    return result;
  } catch (error) {
    logger.putMetric("Error", 1, Unit.Count);
    throw error;
  } finally {
    logger.putMetric("Duration", Date.now() - start, Unit.Milliseconds);
    if (getLogConfig().metricsEnabled) {
      await logger.flush();
    }
  }
};
