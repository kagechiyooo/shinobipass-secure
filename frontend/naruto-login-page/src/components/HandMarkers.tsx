import React, { useEffect, useRef } from 'react';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS, Hands, Results } from '@mediapipe/hands';

interface HandMarkersProps {
  video: HTMLVideoElement | null;
  onHandsStateChange?: (state: { leftDetected: boolean; rightDetected: boolean; totalHands: number }) => void;
  onLandmarksChange?: (landmarks: any[][]) => void;
  onError?: (message: string | null) => void;
}

export function HandMarkers({ video, onHandsStateChange, onLandmarksChange, onError }: HandMarkersProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!video) {
      return;
    }

    let isCancelled = false;
    let frameId = 0;
    let hands: Hands | null = null;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');

    if (!canvas || !context) {
      return;
    }

    const syncCanvasSize = () => {
      if (!video.videoWidth || !video.videoHeight) {
        return false;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      return true;
    };

    const handleResults = (results: Results) => {
      if (!syncCanvasSize()) {
        return;
      }

      context.save();
      context.clearRect(0, 0, canvas.width, canvas.height);

      const handedness = results.multiHandedness ?? [];
      const leftDetected = handedness.some((entry) => entry.label === 'Left');
      const rightDetected = handedness.some((entry) => entry.label === 'Right');

      onHandsStateChange?.({
        leftDetected,
        rightDetected,
        totalHands: results.multiHandLandmarks?.length ?? 0,
      });

      onLandmarksChange?.(results.multiHandLandmarks ?? []);

      results.multiHandLandmarks?.forEach((landmarks, index) => {
        const isLeft = handedness[index]?.label === 'Left';
        const stroke = isLeft ? '#22c55e' : '#38bdf8';

        drawConnectors(context, landmarks, HAND_CONNECTIONS, {
          color: stroke,
          lineWidth: 3,
        });
        drawLandmarks(context, landmarks, {
          color: '#f8fafc',
          fillColor: stroke,
          radius: 4,
          lineWidth: 2,
        });
      });

      context.restore();
    };

    const start = async () => {
      try {
        hands = new Hands({
          locateFile: (file) => `/mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });

        hands.onResults(handleResults);
        onError?.(null);

        const tick = async () => {
          if (isCancelled) {
            return;
          }

          try {
            if (video.readyState >= 2 && syncCanvasSize()) {
              await hands?.send({ image: video });
            }
          } catch (error) {
            console.error('Hand tracking failed:', error);
            onError?.('Hand tracking failed to start.');
            return;
          }

          frameId = window.requestAnimationFrame(() => {
            void tick();
          });
        };

        void tick();
      } catch (error) {
        console.error('Failed to load MediaPipe Hands assets:', error);
        onError?.('Could not load hand tracking assets.');
      }
    };

    void start();

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(frameId);
      onHandsStateChange?.({ leftDetected: false, rightDetected: false, totalHands: 0 });
      onError?.(null);
      context.clearRect(0, 0, canvas.width, canvas.height);
      void hands?.close();
    };
  }, [onError, onHandsStateChange, video]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none z-10 scale-x-[-1]" />;
}
