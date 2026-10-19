import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { ENV } from '../config/env';
import { 
  Zap, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Leaf,
  CheckCircle2,
  Cpu,
  Shield
} from 'lucide-react';
import { ApiStatusBadge } from '../components/common/ApiStatusBadge';

import logoImg from '../assets/landisgyr-logo.png';

const loginSchema = z.object({
  employeeIdOrEmail: z.string().min(1, 'Employee ID or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employeeIdOrEmail: '',
      password: '',
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/inventory', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (values) => {
    setApiError('');
    try {
      const user = await login(values.employeeIdOrEmail, values.password);
      toast.success(`Welcome back, ${user.name || user.employeeId}`);
      const destination = location.state?.from?.pathname || '/inventory';
      navigate(destination, { replace: true });
    } catch (err) {
      setApiError(err.message || 'Invalid employee ID/email or password');
    }
  };

  return (
    <div className="min-h-screen bg-ams-bg flex flex-col justify-between">
      {/* Top Header Bar */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-ams-border bg-white shadow-subtle">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Landis+Gyr" className="h-9 w-auto object-contain" />
          <div className="h-6 w-px bg-ams-border hidden sm:block" />
          <div>
            <span className="font-bold text-sm tracking-tight text-ams-text block leading-none">
              Asset Management System
            </span>
            <span className="text-[10px] text-brand-deep font-semibold uppercase tracking-wider block mt-0.5">
              Intelligent Energy, Delivered.
            </span>
          </div>
        </div>
        <ApiStatusBadge />
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-white border border-ams-border shadow-modal overflow-hidden">
          
          {/* Left Column: Clean Brand Identity */}
          <div className="lg:col-span-6 bg-gradient-to-br from-brand-deep via-[#1E6032] to-[#144723] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Geometric SVG Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
                    <path d="M 28 0 L 0 0 0 28" fill="none" stroke="currentColor" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-pattern)" />
              </svg>
            </div>

            <div className="relative z-10 my-auto">
              {/* Logo in Clean White Card */}
              <div className="inline-block bg-white rounded-2xl p-4 shadow-lg border border-white/20 mb-6">
                <img src={logoImg} alt="Landis+Gyr" className="h-14 sm:h-16 w-auto object-contain" />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                Asset Management System
              </h1>

              <p className="mt-2 text-base text-brand-light font-medium tracking-wide">
                Intelligent Energy, Delivered.
              </p>
            </div>

            {/* Bottom Brand Statement */}
            <div className="mt-10 pt-5 border-t border-white/15 relative z-10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-brand-light/70 block font-medium">Landis+Gyr</span>
                <span className="text-xs font-semibold text-white tracking-wide">Intelligent Energy, Delivered.</span>
              </div>
              <Cpu className="w-5 h-5 text-brand-primary/70" />
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-6 p-8 lg:p-10 flex flex-col justify-center bg-white">
            <div className="mb-6">
              <img src={logoImg} alt="Landis+Gyr" className="h-11 w-auto object-contain mb-3" />
              <h2 className="text-xl sm:text-2xl font-bold text-ams-text tracking-tight">
                Asset Management System
              </h2>
              <p className="text-xs text-brand-deep font-semibold mt-1">
                Intelligent Energy, Delivered.
              </p>
            </div>

            {apiError && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-ams-error/30 text-xs text-ams-error font-medium flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{apiError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Employee ID or Email */}
              <div>
                <label className="block text-xs font-semibold text-ams-text mb-1.5">
                  Employee ID or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-ams-muted absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    {...register('employeeIdOrEmail')}
                    placeholder="e.g. EMP001 or employee@landisgyr.com"
                    autoComplete="username"
                    className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                      errors.employeeIdOrEmail ? 'border-ams-error bg-red-50/20' : 'border-ams-border'
                    } focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep transition-smooth`}
                  />
                </div>
                {errors.employeeIdOrEmail && (
                  <p className="mt-1 text-xs text-ams-error font-medium">{errors.employeeIdOrEmail.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-ams-text mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ams-muted absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className={`w-full pl-9 pr-10 py-2 text-sm rounded-lg border ${
                      errors.password ? 'border-ams-error bg-red-50/20' : 'border-ams-border'
                    } focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep transition-smooth`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-ams-muted hover:text-ams-text focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-ams-error font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Sign in Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg bg-brand-deep hover:bg-brand-dark text-white font-semibold text-sm transition-smooth flex items-center justify-center gap-2 shadow-subtle disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-2"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 text-center text-xs text-ams-muted border-t border-ams-border bg-white">
        &copy; {new Date().getFullYear()} Landis+Gyr Asset Management System. All rights reserved.
      </div>
    </div>
  );
}
