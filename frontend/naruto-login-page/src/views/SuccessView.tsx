import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

interface SuccessViewProps {
  onDone: () => void;
}

export function SuccessView({ onDone }: SuccessViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-8"
    >
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12" />
        </div>
      </div>
      <div className="space-y-2">
        <h1 className="text-[32px] font-bold text-[#444444]">Registration Complete!</h1>
        <p className="text-[#999999]">Your account and hand signs have been saved successfully.</p>
      </div>
      <button
        onClick={onDone}
        className="bg-[#222222] text-white px-12 py-4 rounded-lg font-bold shadow-lg hover:bg-black transition-all"
      >
        Done
      </button>
    </motion.div>
  );
}
