import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { View, GestureSignature, User } from './types';
import { storage } from './utils/storage';

// Views
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { gestureUtils } from './utils/gesture';
import { SelectGesturesView } from './views/SelectGesturesView';
import { RecordGesturesView } from './views/RecordGesturesView';
import { VerifyGesturesView } from './views/VerifyGesturesView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { SuccessView } from './views/SuccessView';
import { HomeView } from './views/HomeView';

const GESTURE_SLOT_COUNT = 4;
const GESTURE_SLOT_IDS = Array.from({ length: GESTURE_SLOT_COUNT }, (_, index) => `gesture-${index + 1}`);

const shuffleGestures = (gestureIds: string[]) => {
  const shuffled = [...gestureIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export default function App() {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [selectedGestures, setSelectedGestures] = useState<string[]>(GESTURE_SLOT_IDS);
  const [gestureSignatures, setGestureSignatures] = useState<GestureSignature[]>([]);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [repetition, setRepetition] = useState(1);
  const [verifyContext, setVerifyContext] = useState<'login' | 'forgot'>('login');
  const [verifySequence, setVerifySequence] = useState<string[]>([]);

  useEffect(() => {
    const user = storage.getCurrentUser();
    if (user) {
      setUsername(user.username);
      setView('home');
    }
  }, []);

  const handleSaveRecording = (hands: { landmarks: any[]; label: string }[], snapshot: number[] | null) => {
    const currentSignId = selectedGestures[recordingIndex];
    let updatedSignatures = [...gestureSignatures];
    let existing = updatedSignatures.find(s => s.signId === currentSignId);

    // Calculate proportions for the first hand in the capture
    const handProportions = hands.length > 0 ? gestureUtils.calculateProportions(hands[0].landmarks) : [];

    if (existing) {
      existing.captures.push(hands);
      if (snapshot) {
        existing.snapshots = [...(existing.snapshots ?? []), snapshot];
      }
      if (handProportions.length > 0) existing.proportions = handProportions;
    } else {
      updatedSignatures.push({
        signId: currentSignId,
        captures: [hands],
        snapshots: snapshot ? [snapshot] : [],
        proportions: handProportions
      });
    }
    setGestureSignatures(updatedSignatures);

    if (repetition < 2) {
      setRepetition(repetition + 1);
    } else {
      if (recordingIndex < selectedGestures.length - 1) {
        setRecordingIndex(recordingIndex + 1);
        setRepetition(1);
      } else {
        const newUser: User = {
          username: username,
          signatures: updatedSignatures
        };
        storage.saveUser(newUser);
        storage.setCurrentUser(newUser);
        setView('home');
      }
    }
  };

  const startGestureVerify = (context: 'login' | 'forgot') => {
    const user = storage.getUser(username);
    if (!user) {
      alert('User not found!');
      return;
    }

    setVerifyContext(context);
    const orderedSignatures = [...user.signatures].sort((a, b) => a.signId.localeCompare(b.signId));
    if (orderedSignatures.length === 0) {
      alert('No saved gestures found for this user.');
      return;
    }

    setSelectedGestures(orderedSignatures.map((signature) => signature.signId));
    setGestureSignatures(orderedSignatures);
    setVerifySequence(shuffleGestures(orderedSignatures.map((signature) => signature.signId)));
    setView('verifyGestures');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startGestureVerify('login');
  };

  const handleForgotPassword = () => {
    startGestureVerify('forgot');
  };

  const handleVerifySuccess = () => {
    setTimeout(() => {
      if (verifyContext === 'login') {
        const user = storage.getUser(username);
        if (user) storage.setCurrentUser(user);
        setView('home');
      } else {
        setView('resetPassword');
      }
    }, 500);
  };

  return (
    <div className="min-h-screen lg:h-screen flex bg-white font-sans text-[#1a1a1a] overflow-hidden">
      {/* Left Side: Naruto Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-black overflow-hidden">
        <img
          src="https://i.pinimg.com/1200x/7f/ae/95/7fae95033bd8f035d6c22832508cf5c5.jpg"
          alt="Naruto Uzumaki"
          className="absolute inset-0 w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      {/* Right Side: Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-[520px] py-10 lg:min-h-[760px] lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <LoginView
                username={username}
                onUsernameChange={setUsername}
                onLogin={handleLoginSubmit}
                onRegister={() => {
                  setSelectedGestures(GESTURE_SLOT_IDS);
                  setGestureSignatures([]);
                  setRecordingIndex(0);
                  setRepetition(1);
                  setView('register');
                }}
                onForgot={handleForgotPassword}
              />
            )}

            {view === 'register' && (
              <RegisterView
                username={username}
                onUsernameChange={setUsername}
                onBack={() => setView('login')}
                onNext={() => {
                  setSelectedGestures(GESTURE_SLOT_IDS);
                  setGestureSignatures([]);
                  setRecordingIndex(0);
                  setRepetition(1);
                  setView('selectGestures');
                }}
              />
            )}

            {view === 'selectGestures' && (
              <SelectGesturesView
                onBack={() => setView('register')}
                onNext={() => {
                  setGestureSignatures([]);
                  setRecordingIndex(0);
                  setRepetition(1);
                  setView('recordGestures');
                }}
              />
            )}

            {view === 'recordGestures' && (
              <RecordGesturesView
                selectedGestures={selectedGestures}
                recordingIndex={recordingIndex}
                repetition={repetition}
                onBack={() => {
                  setGestureSignatures([]);
                  setRecordingIndex(0);
                  setRepetition(1);
                  setView('selectGestures');
                }}
                onSave={handleSaveRecording}
              />
            )}

            {view === 'verifyGestures' && (
              <VerifyGesturesView
                selectedGestures={selectedGestures}
                signatures={gestureSignatures}
                verifySequence={verifySequence}
                onBack={() => setView('login')}
                onVerifySuccess={handleVerifySuccess}
              />
            )}

            {view === 'resetPassword' && (
              <ResetPasswordView
                onBack={() => setView('login')}
                onSubmit={(e) => { e.preventDefault(); setView('login'); }}
              />
            )}

            {view === 'success' && (
              <SuccessView onDone={() => window.location.reload()} />
            )}

            {view === 'home' && (
              <HomeView onLogout={() => { storage.setCurrentUser(null); setView('login'); }} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
