import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Input } from '../components/Input';

interface RegisterViewProps {
  username: string;
  password: string;
  confirmPassword: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function RegisterView({
  username,
  password,
  confirmPassword,
  onUsernameChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onBack,
  onNext,
}: RegisterViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <button type="button" onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
      </button>
      <div className="space-y-2">
        <h1 className="text-[32px] font-bold text-[#444444]">Create Account</h1>
        <p className="text-[#999999]">Enter your details to get started</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Input
          label="Username"
          placeholder="Konoha Hero"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          required
        />
        <Input
          label="Password (อย่างน้อย 8 ตัว)"
          type="password"
          placeholder="****************"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="****************"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          required
        />
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onNext}
            className="bg-[#222222] text-white px-12 py-4 rounded-lg font-bold flex items-center shadow-lg hover:bg-black transition-all"
          >
            Next <ChevronRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
