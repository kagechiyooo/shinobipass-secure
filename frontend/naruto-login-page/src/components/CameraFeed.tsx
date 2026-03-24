import React, { useEffect, useRef, useState } from 'react';
import { CameraOff } from 'lucide-react';

interface CameraFeedProps {
  isActive: boolean;
  children?: React.ReactNode | ((video: HTMLVideoElement | null) => React.ReactNode);
}

export function CameraFeed({ isActive, children }: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getCameraErrorMessage = (err: unknown) => {
    const errorName =
      typeof err === 'object' && err !== null && 'name' in err && typeof err.name === 'string'
        ? err.name
        : null;

    if (!window.isSecureContext) {
      return 'Camera requires HTTPS or localhost. Open this app from https://... or http://localhost.';
    }

    switch (errorName) {
      case 'NotAllowedError':
        return 'Camera access was blocked. Allow camera permission in your browser and reload.';
      case 'NotReadableError':
        return 'Camera is busy or unavailable. Close Zoom, Meet, Discord, Teams, or other camera apps and try again.';
      case 'NotFoundError':
        return 'No camera was found on this device. Check that a webcam is connected and enabled.';
      case 'OverconstrainedError':
        return 'This camera does not support the requested mode. Try another camera or reload.';
      case 'AbortError':
        return 'Camera startup was interrupted. Reload the page and try again.';
      default:
        return errorName
          ? `Could not access camera (${errorName}). Check browser permission and camera availability.`
          : 'Could not access camera. Please check browser permissions and camera availability.';
    }
  };

  const requestCameraStream = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
    } catch (preferredErr) {
      const errorName =
        typeof preferredErr === 'object' &&
        preferredErr !== null &&
        'name' in preferredErr &&
        typeof preferredErr.name === 'string'
          ? preferredErr.name
          : null;

      if (errorName === 'NotAllowedError' || errorName === 'NotReadableError') {
        throw preferredErr;
      }

      return navigator.mediaDevices.getUserMedia({ video: true });
    }
  };

  useEffect(() => {
    async function startCamera() {
      if (isActive) {
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            setError(getCameraErrorMessage(null));
            return;
          }

          const mediaStream = await requestCameraStream();
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setError(null);
        } catch (err) {
          console.error("Error accessing camera:", err);
          setError(getCameraErrorMessage(err));
        }
      } else {
        stopCamera();
      }
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isActive]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      {error ? (
        <div className="text-center p-4">
          <CameraOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
        ) : (
        <>
          <video
            ref={(node) => {
              videoRef.current = node;
              setVideoElement(node);
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {typeof children === 'function' ? children(videoElement) : children}
        </>
      )}
    </div>
  );
}
