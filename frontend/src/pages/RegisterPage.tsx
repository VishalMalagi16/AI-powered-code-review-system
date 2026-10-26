import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Lock, Mail, User as UserIcon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const pwd = watch('password', '');
  const hasMinLength = pwd.length >= 8;
  const hasNumber = /\d/.test(pwd);

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await signup(data.name, data.email, data.password);
      navigate('/app/dashboard');
    } catch {
      // Handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
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
        <h2 className="text-2xl font-extrabold text-slate-100">Create your account</h2>
        <p className="mt-2 text-xs text-slate-400">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 transition-colors">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-surface-border py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              placeholder="Ada Lovelace"
              leadingIcon={<UserIcon className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="ada@lovelace.dev"
              leadingIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

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

            <Input
              label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leadingIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Quick requirements helper */}
            <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span className={`inline-flex items-center gap-1 ${hasMinLength ? 'text-emerald-400' : ''}`}>
                <CheckCircle2 className="w-3 h-3" /> 8+ characters
              </span>
              <span className={`inline-flex items-center gap-1 ${hasNumber ? 'text-emerald-400' : ''}`}>
                <CheckCircle2 className="w-3 h-3" /> Contains number
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2 font-semibold shadow-md shadow-brand-600/30"
              isLoading={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
