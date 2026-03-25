import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera } from 'lucide-react';
import { HandMarkers } from '../components/HandMarkers';
import { CameraFeed } from '../components/CameraFeed';
import { gestureUtils } from '../utils/gesture';

interface RecordGesturesViewProps {
  selectedGestures: string[];
  recordingIndex: number;
  repetition: number;
  onBack: () => void;
  onSave: (hands: { landmarks: any[]; label: string }[], snapshot: number[] | null) => void;
}

export function RecordGesturesView({ recordingIndex, repetition, onBack, onSave }: RecordGesturesViewProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [handsState, setHandsState] = useState({ leftDetected: false, rightDetected: false, totalHands: 0 });
  const [currentLandmarks, setCurrentLandmarks] = useState<{ landmarks: any[]; label: string }[]>([]);
  const [handTrackingError, setHandTrackingError] = useState<string | null>(null);
  const [autoSaveProgress, setAutoSaveProgress] = useState(0);
  const [countdown, setCountdown] = useState(2);
  const [isCapturePending, setIsCapturePending] = useState(false);
  const landmarksRef = React.useRef<{ landmarks: any[]; label: string }[]>([]);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const currentSlot = recordingIndex + 1;

  React.useEffect(() => {
    landmarksRef.current = currentLandmarks;
  }, [currentLandmarks]);

  React.useEffect(() => {
    setCountdown(2);
    setAutoSaveProgress(0);
    setIsCapturePending(false);
  }, [recordingIndex, repetition]);

  React.useEffect(() => {
    if (!isCameraActive) {
      setCountdown(2);
      return;
    }

    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown, isCameraActive, recordingIndex, repetition]);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isCameraActive && countdown === 0 && handsState.totalHands > 0) {
      interval = setInterval(() => {
        setAutoSaveProgress((prev) => Math.min(100, prev + 10));
      }, 100);
    } else {
      setAutoSaveProgress(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [countdown, handsState.totalHands, isCameraActive, onSave]);

  React.useEffect(() => {
    if (autoSaveProgress < 100 || isCapturePending) {
      return;
    }

    setIsCapturePending(true);
    const capture = landmarksRef.current;
    const snapshot = gestureUtils.extractHandSnapshot(videoRef.current, capture);
    setAutoSaveProgress(0);
    onSave(capture, snapshot);
  }, [autoSaveProgress, isCapturePending, onSave]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 text-center"
    >
      <div className="flex justify-start">
        <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Gesture Slots
        </button>
      </div>
      <div className="space-y-2">
        <h1 className="text-[28px] font-bold text-[#444444]">Record Gesture {currentSlot}</h1>
        <p className="text-[#999999]">Show your own pose for slot {currentSlot} and hold it steady until it is captured twice.</p>
      </div>

      <div className="bg-[#f8f8f8] rounded-3xl p-10 space-y-6 border border-[#cccccc]">
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-white rounded-[2rem] flex items-center justify-center shadow-inner border border-[#cccccc]">
            <span className="text-6xl font-black text-[#222222]">{currentSlot}</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest">Gesture Slot {currentSlot}</h2>
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${i <= repetition ? 'bg-[#222222]' : 'bg-[#dddddd]'}`}
              />
            ))}
          </div>
        </div>
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
            {(video) => {
              videoRef.current = video;
              return (
                <>
                <HandMarkers
                  video={video}
                  onHandsStateChange={setHandsState}
                  onLandmarksChange={setCurrentLandmarks}
                  onError={setHandTrackingError}
                />
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  {countdown > 0 ? (
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-black/45 backdrop-blur-sm">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-white/70">Next Capture</p>
                        <p className="mt-1 text-5xl font-black text-white">{countdown}</p>
                      </div>
                    </div>
                  ) : autoSaveProgress > 0 && (
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="white"
                          strokeWidth="8"
                          fill="transparent"
                          className="opacity-20"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#FF6321"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * autoSaveProgress) / 100}
                          className="transition-all duration-100 ease-linear"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold">Auto</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute top-4 left-4 flex items-center space-x-2 z-30 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <div className={`w-2 h-2 rounded-full ${handsState.totalHands > 0 ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                    {handTrackingError ?? (handsState.totalHands > 0 ? 'Pose detected' : 'Show hand(s)')}
                  </span>
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
              );
            }}
          </CameraFeed>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <div className={`px-10 py-4 rounded-xl font-bold flex flex-col items-center transition-all ${handTrackingError ? 'bg-red-50 text-red-500 border border-red-200' : handsState.totalHands > 0 ? 'bg-[#FF6321]/10 text-[#FF6321]' : 'bg-[#f0f0f0] text-[#999999]'}`}>
          {handTrackingError ? (
            <span className="text-sm">{handTrackingError}</span>
          ) : countdown > 0 ? (
            <span className="text-sm">Get ready for gesture {currentSlot}. Capturing starts in {countdown}s</span>
          ) : handsState.totalHands > 0 ? (
            <span className="text-sm">Hold your pose... {Math.max(0, 1 - (autoSaveProgress / 100)).toFixed(1)}s</span>
          ) : (
            <span className="text-sm">Show the gesture you want to save for slot {currentSlot}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
