import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const LoginPage = dynamic(() => import('@/components/auth/login-page').then(mod => mod.LoginPage), {
  suspense: true,
});

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
