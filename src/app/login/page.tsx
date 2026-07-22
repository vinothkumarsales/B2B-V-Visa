import { Suspense } from 'react';
import { MittoAuth } from '@/components/careers/MittoAuth';

export const metadata = { title: { absolute: 'Log in | Mitto Career' }, description: 'Log in to your private Mitto Career workspace.' };

export default function LoginPage() {
  return <Suspense><MittoAuth mode="login" /></Suspense>;
}
