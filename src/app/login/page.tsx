import { Suspense } from 'react';
import { MittoAuth } from '@/components/careers/MittoAuth';

export default function LoginPage() {
  return <Suspense><MittoAuth mode="login" /></Suspense>;
}
