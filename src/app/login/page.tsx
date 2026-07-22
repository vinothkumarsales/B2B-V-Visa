import { Suspense } from 'react';
import { MittoAuth } from '@/components/careers/MittoAuth';
import { GoogleAuthEntry } from '@/components/careers/GoogleAuthEntry';

export const metadata = { title: { absolute: 'Log in | Mitto Career' }, description: 'Log in to your private Mitto Career workspace.' };

export default function LoginPage() {
  return <><GoogleAuthEntry /><Suspense><MittoAuth mode="login" /></Suspense></>;
}
