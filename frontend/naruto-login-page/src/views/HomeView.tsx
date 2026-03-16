import React from 'react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';

interface HomeViewProps {
  onLogout: () => void;
}

export function HomeView({ onLogout }: HomeViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-10"
    >
      <Logo />
      <div className="space-y-4">
        <h1 className="text-[64px] font-bold text-[#222222] tracking-tighter">Welcome</h1>
        <p className="text-[#999999] text-xl">You have successfully logged into the system.</p>
      </div>
      <div className="pt-10">
        <button
          onClick={onLogout}
          className="text-[#888888] font-bold hover:text-black transition-colors"
        >
          Logout
        </button>
      </div>
    </motion.div>
  );
}
