// biome-ignore-all lint/suspicious/noExplicitAny: Need to support any for the decorator
import { rootLogger } from "./Logger";

const OBJ_KEYS_TO_TRACE = ["message", "id", "type", "project"];
const TRUNCATE_LENGTH = 256;
const ELLIPSIS = "...";

export type LogMethodOptions = {
  context?: Record<string, any>;
  methodName?: string;
};

function createArgsArray(args: any[]) {
  return args
    .map((arg) => {
      if (typeof arg === "undefined") {
        return "undefined";
      }
      if (arg === null) {
        return "null";
      }
      if (typeof arg === "function") {
        return `function ${arg.name}()`;
      }
      if (arg instanceof Blob) {
        return {
          Blob: {
            size: arg.size,
            type: arg.type,
          },
        };
      }

      if (typeof arg === "string") {
        return arg.length > TRUNCATE_LENGTH ? `${arg.slice(0, TRUNCATE_LENGTH - ELLIPSIS.length)}${ELLIPSIS}` : arg;
      }
      if (typeof arg === "object") {
        const type = arg.constructor?.name ?? "Object";
        const loggable = Object.entries(arg)
          .filter(([key]) => OBJ_KEYS_TO_TRACE.includes(key))
          .map(([key, value]) => ({
            [key]: value ?? "undefined",
          }));
        if (Object.keys(loggable).length > 0) {
          return `${type}: ${JSON.stringify(loggable)}`;
        }
        return `${type}: ${arg.toString()}`;
      }
      return arg;
    })
    .join(", ");
}

function getLogger(module: string, methodName: string, args: any[], options?: LogMethodOptions) {
  const logger = rootLogger.child({
    method: {
      name: methodName,
      module,
      args: createArgsArray(args),
    },
    ...options?.context,
  });

  return logger;
}

export function logMethodReturningPromise(className: string, options: LogMethodOptions = {}) {
  const wrap = <TThis, TArgs extends unknown[], TResult>(target: (this: TThis, ...args: TArgs) => Promise<TResult>, methodName: string) => {
    return function replacementMethod(this: TThis, ...args: TArgs) {
      const logger = getLogger(className, methodName, args, options);
      const start = Date.now();
      logger.info(`${methodName}.start`);
      const result = target.call(this, ...args);

      return new Promise<TResult>((resolve, reject) => {
        result
          .then((value: TResult) => {
            logger.info({ duration: Date.now() - start }, `${methodName}.succeeded`);
            resolve(value);
          })
          .catch((error: unknown) => {
            logger.warn({ duration: Date.now() - start, error }, `${methodName}.failed`);
            reject(error);
          });
      });
    };
  };

  const decorator = ((...args: unknown[]) => {
    // Legacy decorator signature: (target, propertyKey, descriptor)
    if (args.length === 3) {
      const propertyKey = args[1] as string | symbol;
      const descriptor = args[2] as TypedPropertyDescriptor<(...methodArgs: unknown[]) => Promise<unknown>>;
      if (!descriptor.value) {
        return descriptor;
      }
      descriptor.value = wrap(descriptor.value, String(propertyKey));
      return descriptor;
    }

    // Manual/stage-3-style usage used by tests: (target, contextOrName)
    if (args.length === 2 && typeof args[0] === "function") {
      const target = args[0] as (this: unknown, ...methodArgs: unknown[]) => Promise<unknown>;
      const context = args[1] as ClassMethodDecoratorContext | string;
      const methodName = typeof context === "string" ? context : String(context.name);
      return wrap(target, methodName);
    }

    throw new TypeError("Unsupported decorator signature");
  }) as MethodDecorator;

  return decorator;
}
