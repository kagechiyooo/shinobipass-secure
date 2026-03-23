import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, CheckCircle2 } from 'lucide-react';
import { HAND_SIGNS } from '../constants';
import { HandMarkers } from '../components/HandMarkers';
import { CameraFeed } from '../components/CameraFeed';

interface VerifyGesturesViewProps {
  selectedGestures: string[];
  verifiedCount: number;
  onBack: () => void;
  onVerifyStep: () => void;
}

export function VerifyGesturesView({ selectedGestures, verifiedCount, onBack, onVerifyStep }: VerifyGesturesViewProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [handsState, setHandsState] = useState({ leftDetected: false, rightDetected: false, totalHands: 0 });
  const [handTrackingError, setHandTrackingError] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <div className="flex justify-start">
        <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Choice
        </button>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-[28px] font-bold text-[#444444]">Verify Identity</h1>
        <p className="text-[#999999]">Perform your security hand signs sequence</p>
      </div>

      {/* Top 4 Gestures Display */}
      <div className="grid grid-cols-4 gap-3">
        {selectedGestures.map((id, index) => {
          const sign = HAND_SIGNS.find(s => s.id === id);
          const isVerified = index < verifiedCount;
          const isActive = index === verifiedCount;
          return (
            <div
              key={id}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center space-y-1 ${
                isVerified 
                  ? 'border-green-500 bg-green-50' 
                  : isActive 
                    ? 'border-[#222222] bg-[#f8f8f8] scale-105 shadow-md' 
                    : 'border-[#cccccc] opacity-40'
              }`}
            >
              <img src={sign?.image} alt={sign?.name} className="w-10 h-10" />
              <span className="text-[10px] font-bold uppercase">{sign?.name}</span>
              {isVerified && <CheckCircle2 className="w-4 h-4 text-green-500 absolute -top-1 -right-1 bg-white rounded-full" />}
            </div>
          );
        })}
      </div>

      <div className="aspect-video bg-black rounded-2xl flex items-center justify-center text-white relative overflow-hidden group">
        {!isCameraActive ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-white/20 transition-colors">
              <Camera className="w-8 h-8 opacity-50" />
            </div>
            <button 
              onClick={() => setIsCameraActive(true)}
              className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-[#eeeeee] transition-all"
            >
              Start Camera
            </button>
          </div>
        ) : (
          <CameraFeed isActive={isCameraActive}>
            {(video) => (
              <>
                <HandMarkers video={video} onHandsStateChange={setHandsState} onError={setHandTrackingError} />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  {verifiedCount < 4 && (
                    <div className="text-center space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                        {handTrackingError ?? (handsState.totalHands === 2 ? '2 hands detected' : 'show both hands')}
                      </p>
                      <p className="text-xl font-bold uppercase tracking-widest text-white">
                        {HAND_SIGNS.find(s => s.id === selectedGestures[verifiedCount])?.name}
                      </p>
                    </div>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${handsState.leftDetected ? 'bg-green-500/90 text-white' : 'bg-white/10 text-white/70'}`}>
                    Left hand
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${handsState.rightDetected ? 'bg-sky-500/90 text-white' : 'bg-white/10 text-white/70'}`}>
                    Right hand
                  </div>
                </div>
              </>
            )}
          </CameraFeed>
        )}
      </div>

      <div className="flex justify-center">
        {verifiedCount < 4 ? (
          <button
            onClick={onVerifyStep}
            disabled={!isCameraActive || handsState.totalHands < 2}
            className={`px-16 py-4 rounded-lg font-bold flex items-center shadow-lg transition-all ${
              isCameraActive && handsState.totalHands === 2
                ? 'bg-[#222222] text-white hover:bg-black' 
                : 'bg-[#dddddd] text-[#999999] cursor-not-allowed'
            }`}
          >
            Perform Sign
          </button>
        ) : (
          <div className="flex items-center text-green-600 font-bold text-xl animate-bounce">
            <CheckCircle2 className="w-6 h-6 mr-2" /> Identity Verified!
          </div>
        )}
      </div>
    </motion.div>
  );
}
