import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { HAND_SIGNS } from '../constants';

interface SelectGesturesViewProps {
  selectedGestures: string[];
  onToggleGesture: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SelectGesturesView({ selectedGestures, onToggleGesture, onBack, onNext }: SelectGesturesViewProps) {
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
        <h1 className="text-[28px] font-bold text-[#444444]">Select 1 Hand Sign</h1>
        <p className="text-[#999999]">Choose exactly 1 gesture for your security pattern ({selectedGestures.length}/1)</p>
      </div>
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {HAND_SIGNS.map((sign) => (
          <button
            key={sign.id}
            onClick={() => onToggleGesture(sign.id)}
            className={`relative w-fit max-w-full min-w-[8.5rem] px-3 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 overflow-hidden ${selectedGestures.includes(sign.id)
                ? 'border-[#222222] bg-green-100'
                : 'border-[#cccccc] bg-white hover:border-[#999999]'
              }`}
          >
            <div className={`absolute inset-0 bg-green-500 opacity-5 ${selectedGestures.includes(sign.id) ? 'opacity-10' : ''}`} />
            <div className="relative z-10 inline-flex items-center justify-center overflow-hidden rounded-lg bg-[#f0f0f0] px-2 py-2">
              <img src={sign.image} alt={sign.name} className="block w-auto h-auto max-w-[8.5rem] max-h-[6.75rem] object-contain" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider relative z-10 ${selectedGestures.includes(sign.id) ? 'text-[#222222]' : 'text-[#666666]'}`}>
              {sign.name}
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-center pt-6">
        <button
          disabled={selectedGestures.length !== 1}
          onClick={onNext}
          className={`px-12 py-4 rounded-lg font-bold flex items-center transition-all ${selectedGestures.length === 1
              ? 'bg-[#222222] text-white shadow-lg hover:bg-black'
              : 'bg-[#eeeeee] text-[#cccccc] cursor-not-allowed'
            }`}
        >
          Next <ChevronRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </motion.div>
  );
}
