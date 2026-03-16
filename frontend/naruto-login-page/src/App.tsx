/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { View } from './types';

// Views
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { SelectGesturesView } from './views/SelectGesturesView';
import { RecordGesturesView } from './views/RecordGesturesView';
import { ChoiceVerifyView } from './views/ChoiceVerifyView';
import { EmailVerifyView } from './views/EmailVerifyView';
import { VerifyGesturesView } from './views/VerifyGesturesView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { SuccessView } from './views/SuccessView';
import { HomeView } from './views/HomeView';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [selectedGestures, setSelectedGestures] = useState<string[]>([]);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [repetition, setRepetition] = useState(1);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [verifyContext, setVerifyContext] = useState<'login' | 'forgot'>('login');

  const handleToggleGesture = (id: string) => {
    if (selectedGestures.includes(id)) {
      setSelectedGestures(selectedGestures.filter(g => g !== id));
    } else if (selectedGestures.length < 4) {
      setSelectedGestures([...selectedGestures, id]);
    }
  };

  const handleSaveRecording = () => {
    if (repetition < 3) {
      setRepetition(repetition + 1);
    } else if (recordingIndex < selectedGestures.length - 1) {
      setRecordingIndex(recordingIndex + 1);
      setRepetition(1);
    } else {
      setView('success');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyContext('login');
    setView('chooseLoginVerify');
  };

  const handleForgotPassword = () => {
    setVerifyContext('forgot');
    setView('chooseForgotVerify');
  };

  const startGestureVerify = () => {
    if (selectedGestures.length === 0) {
      setSelectedGestures(['snake', 'dragon', 'tiger', 'bird']);
    }
    setVerifiedCount(0);
    setView('verifyGestures');
  };

  const startEmailVerify = () => {
    setView('emailVerify');
  };

  const handleVerifyStep = () => {
    if (verifiedCount < 3) {
      setVerifiedCount(verifiedCount + 1);
    } else {
      setVerifiedCount(4);
      setTimeout(() => {
        if (verifyContext === 'login') {
          setView('home');
        } else {
          setView('resetPassword');
        }
      }, 800);
    }
  };

  const handleEmailVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyContext === 'login') {
      setView('home');
    } else {
      setView('resetPassword');
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
              />
            )}

            {view === 'register' && (
              <RegisterView 
                onBack={() => setView('login')} 
                onNext={() => setView('selectGestures')} 
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

            {(view === 'chooseLoginVerify' || view === 'chooseForgotVerify') && (
              <ChoiceVerifyView 
                onBack={() => setView('login')}
                onEmailVerify={startEmailVerify}
                onGestureVerify={startGestureVerify}
                onCancel={() => setView('login')}
              />
            )}

            {view === 'emailVerify' && (
              <EmailVerifyView 
                onBack={() => setView(verifyContext === 'login' ? 'chooseLoginVerify' : 'chooseForgotVerify')}
                onSubmit={handleEmailVerifySubmit}
              />
            )}

            {view === 'verifyGestures' && (
              <VerifyGesturesView 
                selectedGestures={selectedGestures}
                verifiedCount={verifiedCount}
                onBack={() => setView(verifyContext === 'login' ? 'chooseLoginVerify' : 'chooseForgotVerify')}
                onVerifyStep={handleVerifyStep}
              />
            )}

            {view === 'resetPassword' && (
              <ResetPasswordView 
                onBack={() => setView('chooseForgotVerify')}
                onSubmit={(e) => { e.preventDefault(); setView('login'); }}
              />
            )}

            {view === 'success' && (
              <SuccessView onDone={() => window.location.reload()} />
            )}

            {view === 'home' && (
              <HomeView onLogout={() => setView('login')} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
