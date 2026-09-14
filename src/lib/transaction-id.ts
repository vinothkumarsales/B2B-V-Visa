/**
 * Generate a unique transaction ID based on the client ID.
 * Format: {CLIENT_ID_SHORT}-{timestamp_hex}-{random_hex}
 * Example: enKOd-67a3f2c1-b4e9
 */

const CLIENT_ID = 'enKOdaUD6df8RHXgzoP723VOvHA2';
const CLIENT_ID_SHORT = CLIENT_ID.slice(0, 5); // "enKOd"

let counter = 0;

export function generateTransactionId(): string {
  counter++;
  const timestamp = Date.now().toString(16).slice(-8);
  const random = Math.random().toString(16).slice(2, 6);
  return `${CLIENT_ID_SHORT}-${timestamp}-${random}`;
}

export function generateApplicationId(internalId?: string): string {
  counter++;
  const timestamp = Date.now().toString(16).slice(-8);
  const random = Math.random().toString(16).slice(2, 6);
  const suffix = internalId ? `-${internalId}` : '';
  return `${CLIENT_ID_SHORT}-APP-${timestamp}-${random}${suffix}`;
}

export function generateGroupId(): string {
  counter++;
  const timestamp = Date.now().toString(16).slice(-8);
  const random = Math.random().toString(16).slice(2, 6);
  return `${CLIENT_ID_SHORT}-GRP-${timestamp}-${random}`;
}

export { CLIENT_ID };