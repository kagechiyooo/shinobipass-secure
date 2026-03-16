import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input(props: InputProps) {
  const { label, ...inputProps } = props;
  return (
    <div className="space-y-2">
      <label className="text-[14px] font-medium text-[#888888]">{label}</label>
      <input
        {...inputProps}
        className="w-full px-4 py-3.5 rounded-lg border border-[#cccccc] focus:outline-none focus:border-[#999999] transition-all placeholder:text-[#dddddd] text-[15px]"
      />
    </div>
  );
}
