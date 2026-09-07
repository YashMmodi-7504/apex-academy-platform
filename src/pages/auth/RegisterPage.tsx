import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout.tsx';
import { Button } from '../../components/common/Button.tsx';
import { Input } from '../../components/common/Input.tsx';
import { AuthCard, AuthError, AuthSuccess, PasswordInput } from '../../components/auth/AuthCard.tsx';
import { Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Inline validation so the learner sees the problem before submitting.
  const passwordTooShort = password.length > 0 && password.length < 6;
  const passwordsDiffer = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await signUp(fullName.trim(), email.trim(), password);

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(res.message || 'Account created successfully!');

      // If immediate session created, redirect after brief delay
      setTimeout(() => {
        navigate('/student/dashboard', { replace: true });
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred during registration.');
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <AuthCard
        title="Create your account"
        subtitle="Enrol in courses, track your progress and earn verifiable certificates."
        footer={
          <>
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        {errorMsg && <AuthError message={errorMsg} />}
        {successMsg && <AuthSuccess message={successMsg} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            placeholder="Your name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<User className="h-4 w-4" />}
            autoComplete="name"
            helperText="This is the name printed on your certificates."
            required
            disabled={isSubmitting}
          />

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
            autoComplete="new-password"
            error={passwordTooShort ? 'At least 6 characters.' : undefined}
            helperText={passwordTooShort ? undefined : 'At least 6 characters.'}
          />

          <PasswordInput
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={isSubmitting}
            autoComplete="new-password"
            error={passwordsDiffer ? 'Passwords do not match.' : undefined}
          />

          <Button
            variant="primary"
            type="submit"
            size="lg"
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account' : 'Create account'}
          </Button>
        </form>
      </AuthCard>
    </MainLayout>
  );
};
