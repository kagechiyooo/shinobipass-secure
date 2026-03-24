import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Input } from '../components/Input';

interface RegisterViewProps {
  onBack: () => void;
  onNext: () => void;
  username: string;
  onUsernameChange: (value: string) => void;
}

export function RegisterView({ onBack, onNext, username, onUsernameChange }: RegisterViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
      </button>
      <div className="space-y-2">
        <h1 className="text-[32px] font-bold text-[#444444]">Create Account</h1>
        <p className="text-[#999999]">Enter your details to get started</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" placeholder="John" />
          <Input label="Last Name" placeholder="Doe" />
        </div>
        <Input
          label="Email"
          type="email"
          placeholder="mail@abc.com"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
        />
        <Input label="Password" type="password" placeholder="****************" />
        <Input label="Confirm Password" type="password" placeholder="****************" />
        <div className="flex justify-center pt-4">
          <button
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
