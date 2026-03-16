import React from 'react';

export function Logo() {
  return (
    <div className="flex justify-start">
      <div className="relative w-12 h-12 flex items-center justify-center">
        <div className="absolute w-10 h-[4px] bg-[#333333]"></div>
        <div className="absolute h-10 w-[4px] bg-[#333333]"></div>
        <div className="absolute top-0 left-0 w-2 h-2 rounded-full bg-[#333333]"></div>
        <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#333333]"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 rounded-full bg-[#333333]"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#333333]"></div>
      </div>
    </div>
  );
}
