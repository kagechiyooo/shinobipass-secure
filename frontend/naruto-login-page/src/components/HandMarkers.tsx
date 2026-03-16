import React from 'react';
import { motion } from 'motion/react';

export function HandMarkers() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      <svg className="w-full h-full opacity-80" viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice">
        <motion.g
          animate={{
            x: [0, 5, -5, 0],
            y: [0, -3, 3, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Palm/Wrist area */}
          <circle cx="120" cy="150" r="3" fill="#00FF00" className="animate-pulse" />
          <circle cx="100" cy="140" r="3" fill="#00FF00" />
          <circle cx="140" cy="140" r="3" fill="#00FF00" />
          
          {/* Fingers */}
          {/* Thumb */}
          <path d="M100 140 L80 120 L70 100" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="80" cy="120" r="2" fill="#00FF00" />
          <circle cx="70" cy="100" r="2" fill="#00FF00" />
          
          {/* Index */}
          <path d="M110 135 L105 100 L100 70" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="105" cy="100" r="2" fill="#00FF00" />
          <circle cx="100" cy="70" r="2" fill="#00FF00" />
          
          {/* Middle */}
          <path d="M120 135 L120 90 L120 60" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="120" cy="90" r="2" fill="#00FF00" />
          <circle cx="120" cy="60" r="2" fill="#00FF00" />
          
          {/* Ring */}
          <path d="M130 135 L135 100 L140 75" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="135" cy="100" r="2" fill="#00FF00" />
          <circle cx="140" cy="75" r="2" fill="#00FF00" />
          
          {/* Pinky */}
          <path d="M140 140 L155 120 L165 105" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="155" cy="120" r="2" fill="#00FF00" />
          <circle cx="165" cy="105" r="2" fill="#00FF00" />
          
          {/* Connecting lines for palm */}
          <path d="M100 140 L110 135 L120 135 L130 135 L140 140 L120 150 Z" stroke="#00FF00" strokeWidth="1" fill="rgba(0, 255, 0, 0.1)" />
        </motion.g>

        {/* Right Hand Skeleton */}
        <motion.g
          animate={{
            x: [0, -5, 5, 0],
            y: [0, 3, -3, 0],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {/* Palm/Wrist area */}
          <circle cx="280" cy="150" r="3" fill="#00FF00" className="animate-pulse" />
          <circle cx="260" cy="140" r="3" fill="#00FF00" />
          <circle cx="300" cy="140" r="3" fill="#00FF00" />
          
          {/* Fingers */}
          {/* Thumb */}
          <path d="M300 140 L320 120 L330 100" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="320" cy="120" r="2" fill="#00FF00" />
          <circle cx="330" cy="100" r="2" fill="#00FF00" />
          
          {/* Index */}
          <path d="M290 135 L295 100 L300 70" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="295" cy="100" r="2" fill="#00FF00" />
          <circle cx="300" cy="70" r="2" fill="#00FF00" />
          
          {/* Middle */}
          <path d="M280 135 L280 90 L280 60" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="280" cy="90" r="2" fill="#00FF00" />
          <circle cx="280" cy="60" r="2" fill="#00FF00" />
          
          {/* Ring */}
          <path d="M270 135 L265 100 L260 75" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="265" cy="100" r="2" fill="#00FF00" />
          <circle cx="260" cy="75" r="2" fill="#00FF00" />
          
          {/* Pinky */}
          <path d="M260 140 L245 120 L235 105" stroke="#00FF00" strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          <circle cx="245" cy="120" r="2" fill="#00FF00" />
          <circle cx="235" cy="105" r="2" fill="#00FF00" />
          
          {/* Connecting lines for palm */}
          <path d="M300 140 L290 135 L280 135 L270 135 L260 140 L280 150 Z" stroke="#00FF00" strokeWidth="1" fill="rgba(0, 255, 0, 0.1)" />
        </motion.g>
      </svg>
      
      {/* Scanning Line */}
      <motion.div
        className="absolute left-0 right-0 h-[2px] bg-[#00FF00] opacity-30 shadow-[0_0_10px_#00FF00]"
        animate={{
          top: ['0%', '100%', '0%']
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
}
