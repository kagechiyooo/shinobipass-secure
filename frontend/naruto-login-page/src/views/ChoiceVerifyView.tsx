import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Camera } from 'lucide-react';

interface ChoiceVerifyViewProps {
  onBack: () => void;
  onEmailVerify: () => void;
  onGestureVerify: () => void;
  onCancel: () => void;
}

export function ChoiceVerifyView({ onBack, onEmailVerify, onGestureVerify, onCancel }: ChoiceVerifyViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10 text-center"
    >
      <div className="flex justify-start">
        <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </button>
      </div>
      <div className="space-y-2">
        <h1 className="text-[28px] font-bold text-[#444444]">Choose Verification</h1>
        <p className="text-[#999999]">How would you like to verify your identity?</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={onEmailVerify}
          className="p-6 border-2 border-[#cccccc] rounded-2xl hover:border-[#222222] transition-all flex items-center space-x-4 group"
        >
          <div className="w-12 h-12 bg-[#f8f8f8] rounded-full flex items-center justify-center group-hover:bg-[#222222] group-hover:text-white transition-colors">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">Email Verification</p>
            <p className="text-sm text-[#999999]">Receive a code via your email</p>
          </div>
        </button>
        <button
          onClick={onGestureVerify}
          className="p-6 border-2 border-[#cccccc] rounded-2xl hover:border-[#222222] transition-all flex items-center space-x-4 group"
        >
          <div className="w-12 h-12 bg-[#f8f8f8] rounded-full flex items-center justify-center group-hover:bg-[#222222] group-hover:text-white transition-colors">
            <Camera className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">Hand Sign Gesture</p>
            <p className="text-sm text-[#999999]">Perform your secret hand sequence</p>
          </div>
        </button>
      </div>
      <button onClick={onCancel} className="text-[#888888] hover:text-black">Cancel</button>
    </motion.div>
  );
}
