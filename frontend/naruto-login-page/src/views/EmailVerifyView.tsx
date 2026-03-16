import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface EmailVerifyViewProps {
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EmailVerifyView({ onBack, onSubmit }: EmailVerifyViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Choice
      </button>
      <div className="space-y-2 text-center">
        <h1 className="text-[28px] font-bold text-[#444444]">Email Verification</h1>
        <p className="text-[#999999]">Enter the 6-digit code sent to your email</p>
      </div>
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <input
              key={i}
              type="text"
              maxLength={1}
              className="w-full h-14 text-center text-2xl font-bold border-2 border-[#cccccc] rounded-xl focus:border-[#222222] focus:outline-none"
            />
          ))}
        </div>
        <button type="submit" className="w-full bg-[#222222] text-white py-4 rounded-lg font-bold text-[16px] shadow-md">
          Verify Code
        </button>
      </form>
      <p className="text-center text-[#999999]">Didn't receive code? <button className="text-[#222222] font-bold">Resend</button></p>
    </motion.div>
  );
}
