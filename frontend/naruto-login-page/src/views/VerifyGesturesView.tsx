import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Camera, CheckCircle2, ShieldAlert } from 'lucide-react';
import { HandMarkers } from '../components/HandMarkers';
import { CameraFeed } from '../components/CameraFeed';
import { GestureSignature } from '../types';
import { gestureUtils } from '../utils/gesture';

interface VerifyGesturesViewProps {
  selectedGestures: string[];
  signatures: GestureSignature[];
  verifySequence: string[];
  strictVerification?: boolean;
  onBack: () => void;
  onVerifyStep: (currentStep: number, detectedSlot: number) => Promise<{
    passed: boolean;
    nextStep: number;
    completed: boolean;
    message: string;
  }>;
  onVerifySuccess: () => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 5;
const MATCH_THRESHOLD = 0.48;
const FAIL_THRESHOLD = 0.78;
const BEST_MARGIN = 0.03;
const TARGET_MARGIN = 0.04;
const PROGRESS_STEP = 40;
const FAIL_STEP = 12;
const NEXT_STEP_COUNTDOWN_SECONDS = 3;

const getBufferedHands = (
  buffer: { landmarks: any[]; label: string }[][],
  fallback: { landmarks: any[]; label: string }[]
) => {
  if (buffer.length === 0) return fallback;
  return buffer[buffer.length - 1];
};

export function VerifyGesturesView({
  selectedGestures,
  signatures,
  verifySequence,
  strictVerification = false,
  onBack,
  onVerifyStep,
  onVerifySuccess,
}: VerifyGesturesViewProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [handsState, setHandsState] = useState({ leftDetected: false, rightDetected: false, totalHands: 0 });
  const [currentLandmarks, setCurrentLandmarks] = useState<{ landmarks: any[]; label: string }[]>([]);
  const [landmarksBuffer, setLandmarksBuffer] = useState<{ landmarks: any[]; label: string }[][]>([]);
  const [handTrackingError, setHandTrackingError] = useState<string | null>(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [failProgress, setFailProgress] = useState(0);
  const [isAdvancingStep, setIsAdvancingStep] = useState(false);
  const [nextStepCountdown, setNextStepCountdown] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const timeoutRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentLandmarksRef = useRef<{ landmarks: any[]; label: string }[]>([]);
  const landmarksBufferRef = useRef<{ landmarks: any[]; label: string }[][]>([]);
  const handsCountRef = useRef(0);
  const verifyRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (currentLandmarks.length > 0) {
      setLandmarksBuffer((prev) => {
        const next = [...prev, currentLandmarks].slice(-5);
        landmarksBufferRef.current = next;
        return next;
      });
    }
  }, [currentLandmarks]);

  useEffect(() => {
    currentLandmarksRef.current = currentLandmarks;
  }, [currentLandmarks]);

  useEffect(() => {
    handsCountRef.current = handsState.totalHands;
  }, [handsState.totalHands]);

  useEffect(() => {
    setHoldProgress(0);
    setFailProgress(0);
    setLandmarksBuffer([]);
    landmarksBufferRef.current = [];
  }, [verifiedCount]);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setAttemptsUsed(0);
          setVerifiedCount(0);
          setHoldProgress(0);
          setFailProgress(0);
          setStatusMessage('Lock cleared. Start again from step 1.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (nextStepCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setNextStepCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [nextStepCountdown]);

  const activeTargetId = verifySequence[verifiedCount] ?? null;
  const activeTargetIndex = activeTargetId ? selectedGestures.findIndex((id) => id === activeTargetId) : -1;
  const activeTargetSlot = activeTargetIndex >= 0 ? activeTargetIndex + 1 : null;
  const matchThreshold = strictVerification ? 0.38 : MATCH_THRESHOLD;
  const failThreshold = strictVerification ? 0.68 : FAIL_THRESHOLD;
  const bestMargin = strictVerification ? 0.06 : BEST_MARGIN;
  const targetMargin = strictVerification ? 0.02 : TARGET_MARGIN;
  const progressStep = strictVerification ? 25 : PROGRESS_STEP;
  const failStep = strictVerification ? 16 : FAIL_STEP;

  const getSignatureScore = (
    signature: GestureSignature,
    bufferedHands: { landmarks: any[]; label: string }[],
    currentSnapshot: number[] | null
  ) => {
    const imageScore = gestureUtils.compareImageSnapshots(currentSnapshot, signature.snapshots ?? []);
    const landmarkScore = gestureUtils.compareAgainstSignature(bufferedHands, signature.captures).score;
    const hasSnapshots = (signature.snapshots?.length ?? 0) > 0;

    if (!hasSnapshots) {
      return landmarkScore;
    }

    const safeImageScore = Number.isFinite(imageScore) ? Math.min(imageScore, 1) : 1;
    return (landmarkScore * 0.8) + (safeImageScore * 0.2);
  };

  const failAttempt = (message: string) => {
    setHoldProgress(0);
    setFailProgress(0);
    setVerifiedCount(0);
    setIsAdvancingStep(false);

    const nextAttemptsUsed = attemptsUsed + 1;
    if (nextAttemptsUsed >= MAX_ATTEMPTS) {
      setAttemptsUsed(0);
      setCooldownRemaining(LOCKOUT_SECONDS);
      setStatusMessage(`Wrong gesture. Locked for ${LOCKOUT_SECONDS}s.`);
      return;
    }

    setAttemptsUsed(nextAttemptsUsed);
    setStatusMessage(`${message} Start again from step 1. ${MAX_ATTEMPTS - nextAttemptsUsed} attempt(s) left.`);
  };

  useEffect(() => {
    if (!isCameraActive || cooldownRemaining > 0 || !activeTargetId || signatures.length === 0 || isAdvancingStep || nextStepCountdown > 0) {
      setHoldProgress(0);
      setFailProgress(0);
      return;
    }

    const interval = window.setInterval(() => {
      if (handsCountRef.current === 0) {
        setHoldProgress(0);
        setFailProgress(0);
        setLastScore(null);
        return;
      }

      const bufferedHands = getBufferedHands(landmarksBufferRef.current, currentLandmarksRef.current);
      const currentSnapshot = gestureUtils.extractHandSnapshot(videoRef.current, bufferedHands);
      const rankedMatches = signatures
        .map((signature) => ({
          signId: signature.signId,
          score: getSignatureScore(signature, bufferedHands, currentSnapshot),
        }))
        .sort((left, right) => left.score - right.score);

      const bestMatch = rankedMatches[0];
      const secondBestMatch = rankedMatches[1];
      const targetMatch = rankedMatches.find((match) => match.signId === activeTargetId);
      const isTargetBestMatch = bestMatch?.signId === activeTargetId;
      const hasSafeMargin = secondBestMatch ? (secondBestMatch.score - bestMatch.score) >= BEST_MARGIN : true;
      const finalScore = bestMatch?.score ?? 999;
      const targetScore = targetMatch?.score ?? 999;
      const targetIsCloseEnough = targetScore <= matchThreshold;
      const targetAlmostBest = bestMatch ? (targetScore - bestMatch.score) <= targetMargin : false;
      const isConfidentTargetMatch = targetIsCloseEnough && (isTargetBestMatch || targetAlmostBest);
      const isConfidentWrongMatch = !isConfidentTargetMatch && !isTargetBestMatch && finalScore <= failThreshold && hasSafeMargin;

      setLastScore(targetScore);

      if (isConfidentTargetMatch) {
        setFailProgress(0);
        setStatusMessage(`Gesture ${activeTargetSlot ?? '?'} detected. Hold steady.`);
        setHoldProgress((prev) => Math.min(100, prev + progressStep));
        return;
      }

      if (isConfidentWrongMatch) {
        setHoldProgress(0);
        setStatusMessage(`That looks closer to gesture ${selectedGestures.findIndex((id) => id === bestMatch.signId) + 1}.`);
        setFailProgress((prev) => {
          const next = Math.min(100, prev + failStep);
          if (next >= 100) {
            failAttempt('Different gesture detected.');
            return 0;
          }
          return next;
        });
        return;
      }

      if (bestMatch) {
        setStatusMessage(
          `Checking gesture ${activeTargetSlot ?? '?'}. Detector currently sees gesture ${selectedGestures.findIndex((id) => id === bestMatch.signId) + 1}.`
        );
      } else {
        setStatusMessage(`Checking gesture ${activeTargetSlot ?? '?'}. Keep the same pose for a moment.`);
      }
      setHoldProgress((prev) => Math.max(0, prev - 4));
      setFailProgress((prev) => Math.max(0, prev - 8));
    }, 200);

    return () => window.clearInterval(interval);
  }, [
    activeTargetId,
    activeTargetSlot,
    attemptsUsed,
    cooldownRemaining,
    isAdvancingStep,
    isCameraActive,
    onVerifyStep,
    onVerifySuccess,
    selectedGestures,
    strictVerification,
    verifySequence,
    verifiedCount,
    nextStepCountdown,
  ]);

  useEffect(() => {
    if (holdProgress < 100 || isAdvancingStep || verifyRequestInFlightRef.current || activeTargetSlot === null) {
      return;
    }

    verifyRequestInFlightRef.current = true;
    setIsAdvancingStep(true);
    setStatusMessage(`Gesture ${activeTargetSlot} matched. Confirming with server...`);

    void onVerifyStep(verifiedCount, activeTargetSlot)
      .then((result) => {
        if (!result.passed) {
          verifyRequestInFlightRef.current = false;
          setIsAdvancingStep(false);
          setHoldProgress(0);
          failAttempt(result.message || 'Different gesture detected.');
          return;
        }

        if (result.completed) {
          verifyRequestInFlightRef.current = false;
          setStatusMessage(`Gesture ${activeTargetSlot} matched. Login successful.`);
          timeoutRef.current = window.setTimeout(() => onVerifySuccess(), 500);
          return;
        }

        const nextTargetId = verifySequence[result.nextStep];
        const nextTargetIndex = selectedGestures.findIndex((id) => id === nextTargetId);
        setNextStepCountdown(NEXT_STEP_COUNTDOWN_SECONDS);
        setStatusMessage(`Gesture ${activeTargetSlot} matched. Next: gesture ${nextTargetIndex + 1} in ${NEXT_STEP_COUNTDOWN_SECONDS}s.`);
        timeoutRef.current = window.setTimeout(() => {
          verifyRequestInFlightRef.current = false;
          setVerifiedCount(result.nextStep);
          setHoldProgress(0);
          setNextStepCountdown(0);
          setIsAdvancingStep(false);
        }, NEXT_STEP_COUNTDOWN_SECONDS * 1000);
      })
      .catch((error) => {
        verifyRequestInFlightRef.current = false;
        setHoldProgress(0);
        setIsAdvancingStep(false);
        setStatusMessage(error instanceof Error ? error.message : 'Failed to verify gesture step.');
      });
  }, [activeTargetSlot, holdProgress, isAdvancingStep, onVerifyStep, onVerifySuccess, selectedGestures, verifySequence, verifiedCount]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-10"
    >
      <div className="flex justify-start">
        <button onClick={onBack} className="flex items-center text-[#888888] hover:text-black transition-colors font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </button>
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-[28px] font-bold text-[#444444]">Verify Identity</h1>
        <p className="text-[#999999]">Login checks the live gesture against the averaged template from the two saved samples.</p>
      </div>

      <div className="grid grid-cols-4 gap-3 px-2">
        {verifySequence.map((id, index) => {
          const slotIndex = selectedGestures.findIndex((gestureId) => gestureId === id);
          const slotNumber = slotIndex + 1;
          const isVerified = index < verifiedCount;
          const isActive = index === verifiedCount;
          return (
            <div
              key={`${id}-${index}`}
              className={`relative rounded-2xl border-2 p-4 text-center transition-all ${
                isVerified
                  ? 'border-green-500 bg-green-50'
                  : isActive
                    ? 'border-[#222222] bg-[#f8f8f8] shadow-md'
                    : 'border-[#d5d5d5] bg-white opacity-60'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#9a9a9a]">Step {index + 1}</p>
              <div className="mt-3 flex h-16 items-center justify-center rounded-xl bg-[#f0f0f0]">
                <span className="text-3xl font-black text-[#222222]">{slotNumber}</span>
              </div>
              {isVerified && <CheckCircle2 className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white text-green-500" />}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-[#d9d9d9] bg-[#fafafa] p-6 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-[#999999]">Challenge Order</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {verifySequence.map((id, index) => {
            const slotIndex = selectedGestures.findIndex((gestureId) => gestureId === id);
            return (
              <div
                key={`challenge-${id}-${index}`}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border ${
                  index === verifiedCount ? 'border-[#222222] bg-white shadow-sm' : 'border-[#d9d9d9] bg-white/70'
                }`}
              >
                <span className="text-2xl font-black text-[#222222]">{slotIndex + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-[#666666]">Current target: gesture {activeTargetSlot ?? '?'}</p>
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
                  {holdProgress > 0 && (
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="white" strokeWidth="8" fill="transparent" className="opacity-20" />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#22c55e"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * holdProgress) / 100}
                          className="transition-all duration-100 ease-linear"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold uppercase">Match</span>
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
                </>
              );
            }}
          </CameraFeed>
        )}
      </div>

      <div className="space-y-3">
        <div className={`w-full rounded-lg px-6 py-4 font-bold shadow-lg transition-all text-center ${
          cooldownRemaining > 0
            ? 'bg-[#dddddd] text-[#999999]'
            : isAdvancingStep
              ? 'bg-green-50 text-green-700 border border-green-200'
              : holdProgress > 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : failProgress > 0
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-[#222222] text-white'
        }`}>
          {cooldownRemaining > 0 ? (
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Locked for {cooldownRemaining}s
            </span>
          ) : isAdvancingStep && nextStepCountdown > 0 ? (
            `Next gesture starts in ${nextStepCountdown}s`
          ) : handsState.totalHands === 0 ? (
            'Show the required gesture in frame'
          ) : isAdvancingStep ? (
            statusMessage ?? 'Matched. Moving to the next step...'
          ) : holdProgress > 0 ? (
            `Matched. Hold steady... ${Math.max(0, 1 - (holdProgress / 100)).toFixed(1)}s`
          ) : failProgress > 0 ? (
            'Different gesture detected. Adjust your hand.'
          ) : (
            `Checking gesture ${activeTargetSlot ?? '?'} automatically`
          )}
        </div>

        {(statusMessage || cooldownRemaining > 0 || lastScore !== null) && (
          <div className="rounded-2xl border border-[#ececec] bg-[#fafafa] px-5 py-4 text-sm text-[#666666]">
            {statusMessage && <p>{statusMessage}</p>}
            {!statusMessage && cooldownRemaining > 0 && <p>Please wait until the lock timer ends, then restart from step 1.</p>}
            {lastScore !== null && cooldownRemaining <= 0 && <p>Current match score: {lastScore.toFixed(3)}</p>}
            {cooldownRemaining <= 0 && <p className="mt-1">Attempts left: {MAX_ATTEMPTS - attemptsUsed}</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
