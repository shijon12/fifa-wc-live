import { Suspense } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { SiteNav } from '@/components/SiteNav';

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-[#07120d] text-stone-100">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <SiteNav />
        <div className="mt-10">
          <Suspense>
            <AuthForm mode="sign-up" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
