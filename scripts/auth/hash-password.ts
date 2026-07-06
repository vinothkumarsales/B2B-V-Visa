import { stdin } from 'node:process';
import { hashPassword } from '../../src/server/auth/password.ts';

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function main() {
  const password = await readStdin();

  if (!password) {
    throw new Error('Password is required on stdin');
  }

  console.log(hashPassword(password));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unable to hash password');
  process.exit(1);
});
