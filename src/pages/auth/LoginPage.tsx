import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Input } from '../../components/common/Input.tsx';
import { AuthCard, AuthError, PasswordInput } from '../../components/auth/AuthCard.tsx';
import { Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await signIn(email.trim(), password);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to sign in. Please verify your email and password.');
        setIsSubmitting(false);
        return;
      }

      if (res.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate(from || '/student/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during login.');
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to reach your courses, progress and certificates."
        footer={
          <>
            Don&rsquo;t have an account?{' '}
            <Link to="/register" className="font-bold text-indigo-600 hover:underline">
              Create one
            </Link>
          </>
        }
      >
        {errorMsg && <AuthError message={errorMsg} />}

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

          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            disabled={isSubmitting}
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-[13px] font-semibold text-indigo-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            variant="primary"
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in' : 'Sign in'}
          </Button>
        </form>
      </AuthCard>
    </MainLayout>
  );
};
