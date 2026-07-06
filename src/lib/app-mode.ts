import { isDemoMode as envIsDemoMode } from '@/lib/env';

export function isDemoMode(): boolean {
  return envIsDemoMode;
}
