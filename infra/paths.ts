import { createRequire } from "node:module";
import { dirname, relative, resolve } from "node:path";

const projectRequire = createRequire(resolve(process.cwd(), "package.json"));
const sendraEntrypoint = projectRequire.resolve("@service-unit-469/sendra/sst");
const sendraRequire = createRequire(sendraEntrypoint);

/** Resolve a package-exported Lambda handler to SST's path.handler format. */
export function lambdaHandler(packageSubpath: string) {
  const entrypoint = sendraRequire.resolve(packageSubpath);
  const handlerModule = entrypoint.replace(/\.(?:[cm]?js|tsx?)$/, "");
  return `${handlerModule}.handler`;
}

/** Resolve a file in Sendra's package, whether deployed from the repo or npm. */
export function sendraPath(relativePath: string) {
  return resolve(dirname(sendraEntrypoint), relativePath);
}

/** Resolve a file in Sendra relative to the current SST project directory. */
export function sendraRelativePath(relativePath: string) {
  return relative(process.cwd(), sendraPath(relativePath));
}
