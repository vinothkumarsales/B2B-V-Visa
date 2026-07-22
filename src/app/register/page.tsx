import { Suspense } from 'react';
import { MittoAuth } from '@/components/careers/MittoAuth';

export const metadata = { title: { absolute: 'Create your workspace | Mitto Career' }, description: 'Create your private Mitto Career job-search workspace.' };

export default function RegisterPage() {
  return <Suspense><MittoAuth mode="register" /></Suspense>;
}
