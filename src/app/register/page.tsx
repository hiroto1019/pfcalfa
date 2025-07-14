import { RegisterForm } from '@/components/auth/register-form';
import { Suspense } from 'react';

export default function Register() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
