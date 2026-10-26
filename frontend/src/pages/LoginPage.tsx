import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      const redirect = searchParams.get('redirect') || '/app/dashboard';
      navigate(redirect);
    } catch {
      // Handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = () => {
    setValue('email', 'dev@codeguard.ai');
    setValue('password', 'DevPassword123!');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brand-500/20">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">CodeGuard AI</span>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-100">Sign in to your account</h2>
        <p className="mt-2 text-xs text-slate-400">
          Or{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
            create a new developer account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-surface-border py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          {searchParams.get('expired') && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-medium">
              Your session has expired. Please sign in again.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@company.com"
              leadingIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leadingIcon={<Lock className="w-4 h-4" />}
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2 font-semibold shadow-md shadow-brand-600/30"
              isLoading={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Helper */}
          <div className="pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={fillDemoAccount}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-surface-hover hover:bg-surface-active border border-slate-700/60 text-xs text-slate-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Fill Quick Demo Credentials</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
