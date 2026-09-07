import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import { LoadingSpinner } from './LoadingSpinner.tsx';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './Button.tsx';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Route wrapper requiring any authenticated user (Student or Admin)
 */
export const RequireAuth: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium tracking-wide">Verifying Apex Security Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * Route wrapper requiring ADMIN role
 */
export const RequireAdmin: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-slate-500 font-medium tracking-wide">Validating Admin Credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl shadow-lg text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
            <p className="text-slate-600 text-xs leading-relaxed">
              You are signed in as a <span className="text-indigo-600 font-semibold">{role}</span> account. Administrator privileges are required to access the control panel.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/student/dashboard">
              <Button variant="primary" className="w-full text-xs">
                Return to Student Dashboard
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Return to Public Website
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
