import { Suspense } from 'react';
import { MittoAuth } from '@/components/careers/MittoAuth';

export default function RegisterPage() {
  return <Suspense><MittoAuth mode="register" /></Suspense>;
}
