'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useIsAuthenticated } from '@/lib/auth/store';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const isAuthenticated = useIsAuthenticated();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Override body overflow for this page
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    clearError();

    if (!email.trim()) {
      setFormError('Email is required');
      return;
    }

    if (!password) {
      setFormError('Password is required');
      return;
    }

    const { error } = await signIn(email, password);

    if (!error) {
      router.refresh();
      router.push('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '16px',
        padding: '40px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', textDecoration: 'none' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="6" width="16" height="12" rx="2" fill="white" stroke="none" />
              <path d="M18 12 L22 12" stroke="white" strokeWidth="3" />
              <line x1="5" y1="9" x2="5" y2="11" stroke="#3b82f6" strokeWidth="1.5" />
              <line x1="8" y1="9" x2="8" y2="12" stroke="#3b82f6" strokeWidth="1.5" />
              <line x1="11" y1="9" x2="11" y2="11" stroke="#3b82f6" strokeWidth="1.5" />
              <line x1="14" y1="9" x2="14" y2="12" stroke="#3b82f6" strokeWidth="1.5" />
              <path d="M22 10 L22 14" stroke="white" strokeWidth="2" />
            </svg>
          </div>
          <span style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>Rule Tool</span>
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '32px' }}>
          Sign in to your account to continue
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#e2e8f0', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#e2e8f0', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          {/* Error message */}
          {(formError || error) && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              marginBottom: '20px',
            }}>
              <p style={{ fontSize: '14px', color: '#f87171', margin: 0 }}>
                {formError || error}
              </p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading ? '#475569' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginBottom: '20px',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign up link */}
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
