'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('isAuthenticated', 'true');
      router.push('/dashboard');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(47,103,255,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(97,171,255,0.14),_transparent_28%),linear-gradient(180deg,_#f7faff_0%,_#eef4fb_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(255,255,255,0.78)_100%)] p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(47,103,255,0.14),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(15,23,42,0.05),_transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
                  <Image
                    src="/transparent_bg.png"
                    alt="PaperKraft"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-[14px] object-cover"
                    priority
                  />
                </div>
                <div>
                  <p className="text-[13px] font-[700] uppercase tracking-[0.22em] text-[#2f67ff]">PaperKraft</p>
                  <h1 className="mt-1 text-[28px] font-[800] tracking-[-0.04em] text-slate-900 sm:text-[34px]">Question paper generation for colleges</h1>
                </div>
              </div>

              <div className="max-w-xl space-y-5">
                <p className="text-[16px] leading-7 text-slate-600 sm:text-[17px]">
                  Manage subjects, moderators, templates, and exam structure from one clean admin workspace.
                  Upload data, generate question paper workflows, and keep the entire process organized.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(47,103,255,0.08),_transparent_55%)]" />
                <div className="relative flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2f67ff] text-white shadow-[0_10px_24px_rgba(47,103,255,0.3)]">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v10" />
                      <path d="m8.5 6.5 3.5-3.5 3.5 3.5" />
                      <path d="M5 14v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-[700] uppercase tracking-[0.2em] text-slate-500">Admin access</p>
                    <p className="mt-1 text-[15px] leading-6 text-slate-600">Secure login for PaperKraft administrators and staff.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.1)] backdrop-blur sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,_#eef4ff_0%,_#ffffff_100%)] shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
                  <Image
                    src="/transparent_bg.png"
                    alt="PaperKraft"
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-[16px] object-cover"
                    priority
                  />
                </div>
                <p className="text-[13px] font-[700] uppercase tracking-[0.24em] text-[#2f67ff]">Welcome back</p>
                <h2 className="mt-2 text-[30px] font-[800] tracking-[-0.04em] text-slate-900">Admin Login</h2>
                <p className="mt-2 text-[14px] leading-6 text-slate-500">Sign in to manage PaperKraft question paper generation for colleges.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="username" className="mb-2 block text-[13px] font-[700] text-slate-600">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                    placeholder="Enter admin username"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-[13px] font-[700] text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 pr-12 text-[14px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="group absolute inset-y-0 right-0 flex items-center justify-center px-4 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:text-[#2f67ff] active:translate-y-0 active:scale-90"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" />
                          <path d="M9.88 5.09A10.5 10.5 0 0 1 12 4.75c5.5 0 9.5 5.25 9.5 5.25s-1.33 1.92-3.55 3.47" />
                          <path d="M6.1 6.1C3.66 7.82 2.5 10 2.5 10s1.83 2.66 4.82 4.57A10.7 10.7 0 0 0 12 15.25c1.01 0 1.99-.16 2.91-.46" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 12S5.5 5.5 12 5.5 21.5 12 21.5 12 18.5 18.5 12 18.5 2.5 12 2.5 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[14px] bg-[linear-gradient(180deg,_#3b73ff_0%,_#2456de_100%)] text-[14px] font-[700] text-white shadow-[0_12px_28px_rgba(47,103,255,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(47,103,255,0.34)] active:translate-y-0 active:scale-[0.985]"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(110deg,_transparent_10%,_rgba(255,255,255,0.24)_45%,_transparent_80%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative"> 
                  Login to PaperKraft
                  </span>
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
