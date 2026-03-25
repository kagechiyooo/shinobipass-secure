import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { HAND_SIGNS, FINGER_NAMES } from '../constants';
import { CameraFeed } from '../components/CameraFeed';
import { HandMarkers } from '../components/HandMarkers';
import { gestureUtils } from '../utils/gesture';
import { HandFrame } from '../types';

interface RecordGesturesViewProps {
  username: string;
  selectedGestures: string[];
  recordingIndex: number;
  repetition: number;
  onSave: (sequence: HandFrame[]) => void;
  onBack: () => void;
}

export function RecordGesturesView({
  username,
  selectedGestures,
  recordingIndex,
  repetition,
  onSave,
  onBack
}: RecordGesturesViewProps) {
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [handsState, setHandsState] = React.useState({ leftDetected: false, rightDetected: false, totalHands: 0 });
  const [currentLandmarks, setCurrentLandmarks] = React.useState<{ landmarks: any[]; label: string }[]>([]);
  const [handTrackingError, setHandTrackingError] = React.useState<string | null>(null);
  const [lastSeenHands, setLastSeenHands] = React.useState<number>(0);
  const [autoSaveProgress, setAutoSaveProgress] = React.useState(0);
  const sequenceRef = React.useRef<HandFrame[]>([]);

  const currentSign = HAND_SIGNS.find(s => s.id === selectedGestures[recordingIndex]);

  React.useEffect(() => {
    if (handsState.totalHands > 0) setLastSeenHands(Date.now());
  }, [handsState.totalHands]);

  // Capture sub-frame sequence
  React.useEffect(() => {
    if (autoSaveProgress > 0 && currentLandmarks.length > 0) {
      sequenceRef.current.push({
        landmarks: currentLandmarks[0].landmarks,
        timestamp: Date.now(),
        label: currentLandmarks[0].label
      });
    }
  }, [autoSaveProgress, currentLandmarks]);

  React.useEffect(() => {
    let interval: any;
    if (isCameraActive && handsState.totalHands > 0) {
      interval = setInterval(() => {
        if (currentSign?.validationRules) {
          const validation = gestureUtils.validateRule(currentLandmarks, currentSign.validationRules);
          if (!validation.valid) {
            setHandTrackingError(validation.message);
            // Stalling logic - don't reset progress
            return;
          }
        }

        setHandTrackingError(null);
        setAutoSaveProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            onSave([...sequenceRef.current]);
            sequenceRef.current = [];
            return 0;
          }
          return prev + 20; // 500ms duration per rep
        });
      }, 100);
    } else {
      setAutoSaveProgress(0);
      sequenceRef.current = [];
    }
    return () => clearInterval(interval);
  }, [isCameraActive, handsState.totalHands, currentLandmarks, recordingIndex, selectedGestures, onSave, currentSign]);

  const isHandsLost = isCameraActive && Date.now() - lastSeenHands > 3000;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-black text-[#1a1a1a] tracking-tight uppercase">Master Profile Training</h1>
          <p className="text-[#666666] font-medium">Capture repetition <span className="text-red-500 font-bold">{repetition}/3</span> for stability</p>
        </div>
        <div className="flex gap-1.5">
          {selectedGestures.map((_, i) => (
            <div key={i} className={`w-8 h-1.5 rounded-full transition-all duration-500 ${i < recordingIndex ? 'bg-green-500' : i === recordingIndex ? 'bg-red-500 w-12' : 'bg-[#f0f0f0]'}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        {/* Camera Feed - Expanded */}
        <div className="aspect-video bg-black rounded-[40px] relative overflow-hidden shadow-2xl group border-[6px] border-[#f8f8f8]">
          {!isCameraActive ? (
            <button onClick={() => setIsCameraActive(true)} className="absolute inset-0 m-auto w-fit h-fit bg-red-600 text-white px-12 py-5 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl z-20">Initialize Advanced Sensors</button>
          ) : (
            <CameraFeed isActive={isCameraActive}>
              {(video) => (
                <>
                  <HandMarkers video={video} onHandsStateChange={setHandsState} onLandmarksChange={setCurrentLandmarks} />

                  {/* Progress Ring Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <AnimatePresence>
                      {autoSaveProgress > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="relative w-56 h-56">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="112" cy="112" r="100" fill="none" stroke="white" strokeWidth="4" className="opacity-10" />
                            <circle cx="112" cy="112" r="100" fill="none" stroke="#FF6321" strokeWidth="10" strokeDasharray={628.3} strokeDashoffset={628.3 - (628.3 * autoSaveProgress) / 100} strokeLinecap="round" className="transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(255,99,33,0.4)]" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-white font-black text-3xl tracking-tighter italic">RECORDING</span>
                            <span className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Hold Position</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </CameraFeed>
          )}

          {isHandsLost && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-8 text-center">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-white font-bold text-xl uppercase tracking-tighter">Hand Signal Lost</h3>
                <p className="text-white/60 text-sm">Please bring your hand back into the camera frame to resume training.</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions - Bottom Panel */}
        <div className="grid md:grid-cols-2 gap-6 items-center bg-[#f8f8f8] p-8 rounded-[40px] border border-[#eeeeee] shadow-sm">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6321] mb-2">Training Target</p>
            <h2 className="text-5xl font-black text-[#1a1a1a] tracking-tighter uppercase leading-none">{currentSign?.name}</h2>

            {handTrackingError && (
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl border border-orange-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-bold tracking-tight">{handTrackingError}</p>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {currentSign?.validationRules?.map((rule, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold ${rule === 'EXTENDED' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : rule === 'FOLDED' ? 'bg-slate-800 text-white' : 'bg-white text-slate-400'}`}>
                  {rule === 'EXTENDED' ? 'UP' : rule === 'FOLDED' ? 'DOWN' : 'ANY'}
                </div>
                <span className={`text-[13px] font-bold ${rule !== 'ANY' ? 'text-[#1a1a1a]' : 'text-slate-400'}`}>{FINGER_NAMES[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={onBack} className="py-4 text-[#888888] font-bold hover:text-black transition-colors uppercase tracking-widest text-[10px] mx-auto opacity-50 hover:opacity-100">← Restart Sequence Selection</button>
      </div>
    </motion.div>
  );
}
