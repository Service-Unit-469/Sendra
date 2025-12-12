import { createMetricsLogger, type MetricsLogger, Unit } from "aws-embedded-metrics";
import { Resource } from "sst";
import { getRequestInfo } from "../logging";

export const getMetricsLogger = (namespace: string, dimensions: Record<string, string>) => {
  const logger = createMetricsLogger();
  let stage = "Local";
  try {
    stage = Resource.App.stage;
  } catch {
    // we're running locally
  }
  logger.setNamespace(`Sendra/${namespace}`);
  logger.putDimensions({ ...dimensions, Stage: stage });

  const requestInfo = getRequestInfo();
  logger.setProperty("RequestId", requestInfo.requestId);
  logger.setProperty("CorrelationId", requestInfo.correlationId);
  return logger;
};

export const withMetrics = async <T>(fn: (metricsLogger: MetricsLogger) => Promise<T>, namespace: string, dimensions: Record<string, string>) => {
  const logger = getMetricsLogger(namespace, dimensions);
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
  }
};
