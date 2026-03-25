import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { View, GestureSignature, User } from './types';
import { storage } from './utils/storage';

// Views
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { SelectGesturesView } from './views/SelectGesturesView';
import { RecordGesturesView } from './views/RecordGesturesView';
import { VerifyGesturesView } from './views/VerifyGesturesView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { SuccessView } from './views/SuccessView';
import { HomeView } from './views/HomeView';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [selectedGestures, setSelectedGestures] = useState<string[]>([]);
  const [gestureSignatures, setGestureSignatures] = useState<GestureSignature[]>([]);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [repetition, setRepetition] = useState(1);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [verifyContext, setVerifyContext] = useState<'login' | 'forgot'>('login');

  useEffect(() => {
    const user = storage.getCurrentUser();
    if (user) {
      setUsername(user.username);
      setView('home');
    }
  }, []);

  const handleToggleGesture = (id: string) => {
    if (selectedGestures.includes(id)) {
      setSelectedGestures([]);
    } else {
      setSelectedGestures([id]);
    }
  };

  const handleSaveRecording = (hands: { landmarks: any[]; label: string }[]) => {
    const currentSignId = selectedGestures[recordingIndex];
    const newSignature: GestureSignature = {
      signId: currentSignId,
      landmarks: hands // Store the single capture (array of hands)
    };

    // Update signatures (replacing existing if found)
    const updatedSignatures = [newSignature];
    setGestureSignatures(updatedSignatures);

    // Registration complete - Save to storage and login immediately
    const newUser: User = {
      username: username,
      signatures: updatedSignatures
    };
    storage.saveUser(newUser);
    storage.setCurrentUser(newUser); // Log in immediately
    setView('home');
  };

  const startGestureVerify = (context: 'login' | 'forgot') => {
    const user = storage.getUser(username);
    if (!user) {
      alert('User not found!');
      return;
    }

    setVerifyContext(context);
    setSelectedGestures(user.signatures.map(s => s.signId));
    setGestureSignatures(user.signatures);
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
    if (verifiedCount < selectedGestures.length - 1) {
      setVerifiedCount(verifiedCount + 1);
    } else {
      setVerifiedCount(selectedGestures.length);
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
                onRegister={() => setView('register')}
                onForgot={handleForgotPassword}
              />
            )}

            {view === 'register' && (
              <RegisterView
                username={username}
                onUsernameChange={setUsername}
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

            {view === 'verifyGestures' && (
              <VerifyGesturesView
                selectedGestures={selectedGestures}
                signatures={gestureSignatures}
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
