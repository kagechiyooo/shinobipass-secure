import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';

interface SelectGesturesViewProps {
  onBack: () => void;
  onNext: () => void;
}

export function SelectGesturesView({ onBack, onNext }: SelectGesturesViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Account Details
      </button>
      <div className="space-y-2">
        <h1 className="text-[28px] font-bold text-[#444444]">Set 4 Custom Gestures</h1>
        <p className="text-[#999999]">You will record your own hand poses for slots 1 to 4, then use the slot numbers to log in later.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-[#d9d9d9] bg-[#fafafa] px-6 py-8 text-center shadow-sm"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#999999]">Gesture</p>
            <div className="mt-4 flex h-24 items-center justify-center rounded-2xl border border-dashed border-[#cfcfcf] bg-white">
              <span className="text-5xl font-black text-[#222222]">{index + 1}</span>
            </div>
            <p className="mt-4 text-sm text-[#777777]">Record your own pose for slot {index + 1}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center pt-6">
        <button
          onClick={onNext}
          className="px-12 py-4 rounded-lg font-bold flex items-center transition-all bg-[#222222] text-white shadow-lg hover:bg-black"
        >
          Next <ChevronRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </motion.div>
  );
}
