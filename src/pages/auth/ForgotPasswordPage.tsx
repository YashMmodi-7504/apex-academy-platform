import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Input } from '../../components/common/Input.tsx';
import { AuthCard, AuthError } from '../../components/auth/AuthCard.tsx';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await resetPassword(email.trim());
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to send reset email.');
      } else {
        setSuccessMsg(res.message || 'Reset link sent successfully!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An error occurred while resetting your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <AuthCard
        title="Reset your password"
        subtitle="We will email you a link to choose a new password."
        footer={
          <>
            Remembered it?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:underline">
              Back to sign in
            </Link>
          </>
        }
      >
        {errorMsg && <AuthError message={errorMsg} />}

        {successMsg ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"
          >
            <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-700" />
            <p className="mt-2.5 text-sm font-bold text-emerald-900">Check your inbox</p>
            <p className="mt-1 text-[13px] leading-relaxed text-emerald-800">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              autoComplete="email"
              required
              disabled={isSubmitting}
            />

            <Button
              variant="primary"
              type="submit"
              size="lg"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending link' : 'Send reset link'}
            </Button>
          </form>
        )}
      </AuthCard>
    </MainLayout>
  );
};
