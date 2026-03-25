import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle2 } from 'lucide-react';
import { HAND_SIGNS } from '../constants';
import { CameraFeed } from '../components/CameraFeed';
import { HandMarkers } from '../components/HandMarkers';
import { gestureUtils } from '../utils/gesture';
import { GestureSignature, HandFrame } from '../types';

interface VerifyGesturesViewProps {
  selectedGestures: string[];
  verifiedCount: number;
  signatures: GestureSignature[];
  onVerifyStep: () => void;
  onSuccess: () => void;
}

export function VerifyGesturesView({
  selectedGestures,
  verifiedCount,
  signatures,
  onVerifyStep,
  onSuccess
}: VerifyGesturesViewProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [handsState, setHandsState] = useState({ leftDetected: false, rightDetected: false, totalHands: 0 });
  const [currentLandmarks, setCurrentLandmarks] = useState<{ landmarks: any[]; label: string }[]>([]);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [verifyProgress, setVerifyProgress] = useState(0);
  const [behaviorMatch, setBehaviorMatch] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const sequenceBufferRef = useRef<HandFrame[]>([]);

  // Capture rolling sequence buffer (V9 PRO)
  useEffect(() => {
    if (currentLandmarks.length > 0) {
      const frame: HandFrame = {
        landmarks: currentLandmarks[0].landmarks,
        timestamp: Date.now(),
        label: currentLandmarks[0].label
      };
      sequenceBufferRef.current = [...sequenceBufferRef.current, frame].slice(-15); // 15 frames for better DTW
    }
  }, [currentLandmarks]);

  // Liveness Check logic
  useEffect(() => {
    if (isCameraActive && !livenessPassed && currentLandmarks.length > 0) {
      const wrist = currentLandmarks[0].landmarks[0];
      if (wrist.y < 0.2) {
        setLivenessPassed(true);
      }
    }
  }, [isCameraActive, livenessPassed, currentLandmarks]);

  const getAveragedLandmarks = () => {
    if (sequenceBufferRef.current.length === 0) return currentLandmarks;
    // Simple average of the last 10 frames
    const latestFrames = sequenceBufferRef.current.slice(-10);
    const averaged = JSON.parse(JSON.stringify(latestFrames[latestFrames.length - 1].landmarks));

    for (let i = 0; i < 21; i++) {
      let x = 0, y = 0, z = 0;
      latestFrames.forEach(f => {
        x += f.landmarks[i].x;
        y += f.landmarks[i].y;
        z += f.landmarks[i].z;
      });
      averaged[i].x = x / latestFrames.length;
      averaged[i].y = y / latestFrames.length;
      averaged[i].z = z / latestFrames.length;
    }
    return [{ landmarks: averaged, label: latestFrames[latestFrames.length - 1].label }];
  };

  // Main verification loop
  useEffect(() => {
    let interval: any;
    if (isCameraActive && handsState.totalHands > 0 && verifiedCount < selectedGestures.length && livenessPassed) {
      interval = setInterval(() => {
        const signature = signatures.find(s => s.signId === selectedGestures[verifiedCount]);
        if (signature) {
          const averaged = getAveragedLandmarks();
          const result = gestureUtils.compareAgainstSignature(averaged, signature, sequenceBufferRef.current);

          setSimilarity(result.score);
          setHint(result.hint);
          setBehaviorMatch(result.behaviorMatch);

          if (result.score < 0.38) {
            setVerifyProgress(prev => {
              if (prev >= 100) {
                clearInterval(interval);
                onVerifyStep();
                sequenceBufferRef.current = [];
                return 0;
              }
              return prev + 25;
            });
          } else {
            // If movement is totally different, don't reset but stop progress
            // Stalling logic from user request
          }
        }
      }, 100);
    } else {
      setVerifyProgress(0);
    }
    return () => clearInterval(interval);
  }, [isCameraActive, handsState.totalHands, verifiedCount, selectedGestures, signatures, onVerifyStep, livenessPassed, currentLandmarks]);

  useEffect(() => {
    if (verifiedCount === selectedGestures.length && selectedGestures.length > 0) {
      setTimeout(onSuccess, 1500);
    }
  }, [verifiedCount, selectedGestures.length, onSuccess]);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-[28px] font-bold text-[#444444]">Shinobi-Sense PRO</h1>
        <p className="text-[#999999]">Verifying shape, timing, and dynamic movement sequence</p>
      </div>

      <div className="aspect-video bg-black rounded-2xl relative overflow-hidden shadow-2xl border border-white/5 mx-auto max-w-4xl">
        {!isCameraActive ? (
          <button onClick={() => setIsCameraActive(true)} className="absolute inset-0 m-auto w-fit h-fit bg-red-600 text-white px-10 py-3 rounded-full font-bold hover:bg-red-700 transition-colors shadow-lg">Activate Sensors</button>
        ) : (
          <CameraFeed isActive={isCameraActive}>
            {(video) => (
              <>
                <HandMarkers video={video} onHandsStateChange={setHandsState} onLandmarksChange={setCurrentLandmarks} />

                {/* Visual Feedback Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                  {!livenessPassed ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-black/60 backdrop-blur-xl p-8 rounded-full border border-orange-500/30 text-center">
                      <p className="text-[#FF6321] font-black uppercase tracking-[0.2em] text-[10px] mb-1">Liveness Pulse</p>
                      <p className="text-white text-lg font-bold">Raise hand to Top 🔝</p>
                    </motion.div>
                  ) : verifiedCount < selectedGestures.length && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center w-64 shadow-2xl">
                      <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1">Authenticating</p>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                        {HAND_SIGNS.find(s => s.id === selectedGestures[verifiedCount])?.name}
                      </h2>

                      {verifyProgress > 0 && (
                        <div className="mt-4 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-orange-600 to-red-500" style={{ width: `${verifyProgress}%` }} />
                        </div>
                      )}

                      {similarity !== null && (
                        <div className="mt-4 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                            <span className="text-white/40 italic">Signature Match</span>
                            <span className={similarity < 0.4 ? "text-green-400" : "text-white/60"}>
                              {Math.max(0, 100 - (similarity * 150)).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider">
                            <span className="text-white/40 italic">Behavior Score</span>
                            <span className="text-sky-400">{(behaviorMatch * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Counter */}
                <div className="absolute top-4 left-4 flex gap-2 z-30">
                  {selectedGestures.map((s, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full border border-white/20 transition-all duration-500 ${i < verifiedCount ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : i === verifiedCount ? 'bg-orange-500 animate-pulse' : 'bg-white/10'}`} />
                  ))}
                </div>
              </>
            )}
          </CameraFeed>
        )}
      </div>

      <div className="flex justify-center min-h-[40px]">
        {verifiedCount === selectedGestures.length ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center text-green-600 font-black text-xl tracking-tighter uppercase">
            <CheckCircle2 className="w-8 h-8 mr-3 stroke-[3]" /> Identity Confirmed
          </motion.div>
        ) : (
          <p className="text-sm font-medium text-[#888888] tracking-tight">{hint ?? "Maintain sign to confirm identity"}</p>
        )}
      </div>
    </motion.div>
  );
}
