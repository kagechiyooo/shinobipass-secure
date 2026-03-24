import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input(props: InputProps) {
  const { label, type, ...inputProps } = props;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-2">
      <label className="text-[14px] font-medium text-[#888888]">{label}</label>
      <div className="relative">
        <input
          {...inputProps}
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          className="w-full px-4 py-3.5 rounded-lg border border-[#cccccc] focus:outline-none focus:border-[#999999] transition-all placeholder:text-[#dddddd] text-[15px] pr-12"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#666666] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
