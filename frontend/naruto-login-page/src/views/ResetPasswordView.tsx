import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Input } from '../components/Input';

interface ResetPasswordViewProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResetPasswordView({ onBack, onSubmit }: ResetPasswordViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Verification
      </button>
      <div className="space-y-2 text-center">
        <h1 className="text-[28px] font-bold text-[#444444]">Reset Password</h1>
        <p className="text-[#999999]">Set a new secure password for your account</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="New Password" type="password" placeholder="****************" />
        <Input label="Confirm New Password" type="password" placeholder="****************" />
        <button type="submit" className="w-full bg-[#222222] text-white py-4 rounded-lg font-bold text-[16px] shadow-md mt-4">
          Update Password
        </button>
      </form>
    </motion.div>
  );
}
