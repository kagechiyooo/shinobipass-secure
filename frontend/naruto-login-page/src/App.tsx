/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';

// Views
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { SelectGesturesView } from './views/SelectGesturesView';
import { RecordGesturesView } from './views/RecordGesturesView';
import { VerifyGesturesView } from './views/VerifyGesturesView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { SuccessView } from './views/SuccessView';
import { HomeView } from './views/HomeView';
import { View, GestureSignature } from './types';
import { storage } from './utils/storage';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [selectedGestures, setSelectedGestures] = useState<string[]>([]);
  const [signatures, setSignatures] = useState<GestureSignature[]>([]);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [repetition, setRepetition] = useState(1);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [verifyContext, setVerifyContext] = useState<'login' | 'forgot'>('login');

  React.useEffect(() => {
    const user = storage.getCurrentUser();
    if (user) {
      setUsername(user.username);
      setView('home');
    }
  }, []);

  const handleToggleGesture = (id: string) => {
    if (selectedGestures.includes(id)) {
      setSelectedGestures(selectedGestures.filter(g => g !== id));
    } else if (selectedGestures.length < 4) {
      setSelectedGestures([...selectedGestures, id]);
    }
  };

  const handleSaveRecording = (landmarks: any[]) => {
    const currentSignId = selectedGestures[recordingIndex];
    const existingSignatureIndex = signatures.findIndex(s => s.signId === currentSignId);

    let updatedSignatures = [...signatures];
    if (existingSignatureIndex === -1) {
      updatedSignatures.push({ signId: currentSignId, landmarks: [landmarks] });
    } else {
      updatedSignatures[existingSignatureIndex].landmarks.push(landmarks);
    }
    setSignatures(updatedSignatures);

    if (repetition < 3) {
      setRepetition(repetition + 1);
    } else if (recordingIndex < selectedGestures.length - 1) {
      setRecordingIndex(recordingIndex + 1);
      setRepetition(1);
    } else {
      // All recorded! Save user to storage
      storage.saveUser({ username, signatures: updatedSignatures });
      setView('success');
    }
  };

  const startGestureVerify = (context: 'login' | 'forgot') => {
    setVerifyContext(context);
    const user = storage.getUser(username);
    if (!user) {
      alert('User not found!');
      return;
    }
    setSelectedGestures(user.signatures.map(s => s.signId));
    setSignatures(user.signatures);
    setVerifiedCount(0);
    setView('verifyGestures');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startGestureVerify('login');
  };

  const handleForgotPassword = () => {
    startGestureVerify('forgot');
  };

  const handleVerifyStep = () => {
    if (verifiedCount < 3) {
      setVerifiedCount(verifiedCount + 1);
    } else {
      setVerifiedCount(4);
      setTimeout(() => {
        if (verifyContext === 'login') {
          const user = storage.getUser(username);
          if (user) storage.setCurrentUser(user);
          setView('home');
        } else {
          setView('resetPassword');
        }
      }, 800);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-[#1a1a1a]">
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] py-10">
          <AnimatePresence mode="wait">
            {view === 'login' && (
              <LoginView
                onLogin={handleLoginSubmit}
                onRegister={() => setView('register')}
                onForgot={handleForgotPassword}
                username={username}
                onUsernameChange={setUsername}
              />
            )}

            {view === 'register' && (
              <RegisterView
                onBack={() => setView('login')}
                onNext={() => setView('selectGestures')}
                username={username}
                onUsernameChange={setUsername}
              />
            )}

            {view === 'selectGestures' && (
              <SelectGesturesView
                selectedGestures={selectedGestures}
                onToggleGesture={handleToggleGesture}
                onBack={() => setView('register')}
                onNext={() => setView('recordGestures')}
              />
            )}

            {view === 'recordGestures' && (
              <RecordGesturesView
                selectedGestures={selectedGestures}
                recordingIndex={recordingIndex}
                repetition={repetition}
                onBack={() => setView('selectGestures')}
                onSave={handleSaveRecording}
              />
            )}

            {view === 'verifyGestures' && (
              <VerifyGesturesView
                selectedGestures={selectedGestures}
                signatures={signatures}
                verifiedCount={verifiedCount}
                onBack={() => setView('login')}
                onVerifyStep={handleVerifyStep}
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
