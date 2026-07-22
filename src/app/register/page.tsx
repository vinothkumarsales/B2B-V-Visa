import { Suspense } from 'react';
import { MittoAuth } from '@/components/careers/MittoAuth';
import { GoogleAuthEntry } from '@/components/careers/GoogleAuthEntry';

export const metadata = { title: { absolute: 'Create your workspace | Mitto Career' }, description: 'Create your private Mitto Career job-search workspace.' };

export default function RegisterPage() {
  return <><GoogleAuthEntry register /><Suspense><MittoAuth mode="register" /></Suspense></>;
}
