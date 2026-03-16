import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { Input } from '../components/Input';

interface LoginViewProps {
  onLogin: (e: React.FormEvent) => void;
  onRegister: () => void;
  onForgot: () => void;
}

export function LoginView({ onLogin, onRegister, onForgot }: LoginViewProps) {
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
          See what is going on with your business
        </p>
      </div>
      <form className="space-y-6" onSubmit={onLogin}>
        <Input label="Email" type="email" placeholder="mail@abc.com" />
        <Input label="Password" type="password" placeholder="****************" />
        <button onClick={onForgot} type="button" className="text-[13px] font-bold text-[#222222] hover:opacity-70">
          Forgot Password?
        </button>
        <button type="submit" className="w-full bg-[#222222] text-white py-4 rounded-lg font-bold text-[16px] shadow-md hover:bg-black transition-all">
          Login
        </button>
      </form>
      <p className="text-center text-[#999999] text-[15px]">
        Not Registered Yet?{' '}
        <button onClick={onRegister} className="font-bold text-[#222222] hover:underline">
          Create an account
        </button>
      </p>
    </motion.div>
  );
}
