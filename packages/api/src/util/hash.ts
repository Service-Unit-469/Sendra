import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const pscrypt = promisify(scrypt);
const RS = "\x1e";

// Pass the password string and get hashed password back
const encryptPassword = async (password: string, salt: string) => {
  const hash = await pscrypt(password, salt, 32);
  return (hash as Buffer).toString("hex");
};

/**
 * Verifies a hash against a password
 * @param {string} pass The password
 * @param {string} hash The hash
 */
export const verifyHash = async (pass: string, hash: string) => {
  const [originalPassHash, salt] = hash.split(RS);
  const currentPassHash = await encryptPassword(pass, salt);
  const textEncoder = new TextEncoder();
  return timingSafeEqual(textEncoder.encode(originalPassHash), textEncoder.encode(currentPassHash));
};

/**
 * Generates a hash from plain text
 * @param {string} pass The password
 * @returns {Promise<string>} Password hash
 */
export const createHash = async (pass: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");
  const hash = await encryptPassword(pass, salt);
  return [hash, salt].join(RS);
};
