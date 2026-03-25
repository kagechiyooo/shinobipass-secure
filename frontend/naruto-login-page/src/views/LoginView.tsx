import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { Input } from '../components/Input';

interface LoginViewProps {
  username: string;
  password: string;
  loginStatusMessage: string | null;
  loginLockRemaining: number;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLogin: (e: React.FormEvent) => void;
  onRegister: () => void;
  onForgot: () => void;
}

export function LoginView({
  username,
  password,
  loginStatusMessage,
  loginLockRemaining,
  onUsernameChange,
  onPasswordChange,
  onLogin,
  onRegister,
  onForgot,
}: LoginViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <Logo />
      <div className="space-y-2">
        <h1 className="text-[36px] font-bold text-[#444444] tracking-tight leading-tight">
          Login to your Account
        </h1>
        <p className="text-[#999999] text-[16px]">
          Secure access to your Konoha
        </p>
      </div>
      <form className="space-y-6" onSubmit={onLogin}>
        <Input
          label="Username"
          placeholder="Konoha Hero"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="****************"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
        />
        <button onClick={onForgot} type="button" className="text-[13px] font-bold text-[#222222] hover:opacity-70">
          Forgot Password?
        </button>
        <button type="submit" className="w-full bg-[#222222] text-white py-4 rounded-lg font-bold text-[16px] shadow-md hover:bg-black transition-all">
          Login
        </button>
      </form>
      {(loginStatusMessage || loginLockRemaining > 0) && (
        <div className={`rounded-2xl border px-5 py-4 text-sm ${
          loginLockRemaining > 0
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-[#ececec] bg-[#fafafa] text-[#666666]'
        }`}>
          {loginStatusMessage && <p>{loginStatusMessage}</p>}
          {loginLockRemaining > 0 && <p className={loginStatusMessage ? 'mt-1' : ''}>Try again in {loginLockRemaining}s</p>}
        </div>
      )}
      <p className="text-center text-[#999999] text-[15px]">
        Not Registered Yet?{' '}
        <button type="button" onClick={onRegister} className="font-bold text-[#222222] hover:underline">
          Create an account
        </button>
      </p>
    </motion.div>
  );
}
