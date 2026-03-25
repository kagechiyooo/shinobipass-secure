import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { View, GestureSignature, User } from './types';
import { storage } from './utils/storage';
import { api } from './lib/api';

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

export default function App() {
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetConfirmPasswordValue, setResetConfirmPasswordValue] = useState('');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginStatusMessage, setLoginStatusMessage] = useState<string | null>(null);
  const [loginLockRemaining, setLoginLockRemaining] = useState(0);
  const [selectedGestures, setSelectedGestures] = useState<string[]>(GESTURE_SLOT_IDS);
  const [gestureSignatures, setGestureSignatures] = useState<GestureSignature[]>([]);
  const [recordingIndex, setRecordingIndex] = useState(0);
  const [repetition, setRepetition] = useState(1);
  const [verifyContext, setVerifyContext] = useState<'login' | 'forgot'>('login');
  const [verifySequence, setVerifySequence] = useState<string[]>([]);

  useEffect(() => {
    const user = storage.getCurrentUser();
    const savedAccessToken = storage.getAccessToken();
    if (user && savedAccessToken) {
      setUsername(user.username);
      setAccessToken(savedAccessToken);
      setView('home');
    }
  }, []);

  useEffect(() => {
    if (view === 'home' && !accessToken) {
      setView('login');
    }

    if (view === 'verifyGestures' && !challengeToken) {
      setView('login');
    }

    if (view === 'resetPassword' && !accessToken) {
      setView('login');
    }
  }, [accessToken, challengeToken, view]);

  useEffect(() => {
    if (loginLockRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setLoginLockRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loginLockRemaining]);

  const handleSaveRecording = async (hands: { landmarks: any[]; label: string }[], snapshot: number[] | null) => {
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
        try {
          const gestures = updatedSignatures.map((signature) => ({
            landmark_template: signature.captures[0] ?? [],
            snapshot_template: signature.snapshots && signature.snapshots.length > 0
              ? signature.snapshots.reduce((acc, current) => acc.map((value, index) => value + (current[index] ?? 0)))
                  .map((sum) => sum / signature.snapshots!.length)
              : null,
          }));

          await api.register({
            username,
            password,
            gestures,
          });

          setChallengeToken(null);
          setAccessToken(null);
          storage.setCurrentUser(null);
          storage.setAccessToken(null);
          setPassword('');
          setConfirmPassword('');
          setView('success');
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Register failed');
        }
      }
    }
  };

  const startGestureVerify = async (context: 'login' | 'forgot') => {
    try {
      const loginResult = context === 'login'
        ? await api.login({ username, password })
        : await api.forgotPasswordChallenge({ username });
      const orderedSignatures = loginResult.gestures
        .sort((a, b) => a.slot_number - b.slot_number)
        .map((gesture) => ({
          signId: `gesture-${gesture.slot_number}`,
          captures: [Array.isArray(gesture.landmark_template) ? gesture.landmark_template as any[] : []],
          snapshots: gesture.snapshot_template ? [gesture.snapshot_template] : [],
        }));

      setVerifyContext(context);
      setChallengeToken(loginResult.challengeToken);
      setAccessToken(null);
      setLoginStatusMessage(null);
      setLoginLockRemaining(0);
      setSelectedGestures(orderedSignatures.map((signature) => signature.signId));
      setGestureSignatures(orderedSignatures);
      setVerifySequence(loginResult.sequence.map((slotNumber) => `gesture-${slotNumber}`));
      setView('verifyGestures');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setLoginStatusMessage(message);

      const lockMatch = message.match(/(\d+)\s*seconds?/i);
      if (lockMatch) {
        setLoginLockRemaining(Number(lockMatch[1]));
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void startGestureVerify('login');
  };

  const handleForgotPassword = () => {
    void startGestureVerify('forgot');
  };

  const handleVerifySuccess = () => {
    setTimeout(() => {
      if (verifyContext === 'login') {
        storage.setCurrentUser({ username, signatures: gestureSignatures });
        if (accessToken) {
          storage.setAccessToken(accessToken);
        }
        setPassword('');
        setChallengeToken(null);
        setView('home');
      } else {
        setResetPasswordValue('');
        setResetConfirmPasswordValue('');
        setView('resetPassword');
      }
    }, 500);
  };

  const handleVerifyStep = async (_currentStep: number, detectedSlot: number) => {
    if (!challengeToken) {
      throw new Error('Missing challenge token');
    }

    const result = await api.verifyGestureStep({
      detected_slot: detectedSlot,
    }, challengeToken);

    if (result.accessToken) {
      setAccessToken(result.accessToken);
      storage.setAccessToken(result.accessToken);
    }

    return {
      passed: result.passed,
      nextStep: result.next_step,
      completed: result.completed,
      message: result.message,
    };
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
                password={password}
                loginStatusMessage={loginStatusMessage}
                loginLockRemaining={loginLockRemaining}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onLogin={handleLoginSubmit}
                onRegister={() => {
                  setLoginStatusMessage(null);
                  setLoginLockRemaining(0);
                  setPassword('');
                  setConfirmPassword('');
                  setResetPasswordValue('');
                  setResetConfirmPasswordValue('');
                  setChallengeToken(null);
                  setAccessToken(null);
                  storage.setAccessToken(null);
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
                password={password}
                confirmPassword={confirmPassword}
                onUsernameChange={setUsername}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onBack={() => {
                  setLoginStatusMessage(null);
                  setLoginLockRemaining(0);
                  setView('login');
                }}
                onNext={() => {
                  if (!username || !password) {
                    alert('Username and password are required.');
                    return;
                  }
                  if (password !== confirmPassword) {
                    alert('Passwords do not match.');
                    return;
                  }
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
                strictVerification={verifyContext === 'forgot'}
                onBack={() => setView('login')}
                onVerifyStep={handleVerifyStep}
                onVerifySuccess={handleVerifySuccess}
              />
            )}

            {view === 'resetPassword' && (
              <ResetPasswordView
                password={resetPasswordValue}
                confirmPassword={resetConfirmPasswordValue}
                onPasswordChange={setResetPasswordValue}
                onConfirmPasswordChange={setResetConfirmPasswordValue}
                onBack={() => setView('login')}
                onSubmit={async (e) => {
                  e.preventDefault();

                  if (!resetPasswordValue) {
                    alert('New password is required.');
                    return;
                  }

                  if (resetPasswordValue !== resetConfirmPasswordValue) {
                    alert('Passwords do not match.');
                    return;
                  }

                  try {
                    await api.resetPassword({
                      newPassword: resetPasswordValue,
                    }, accessToken ?? '');
                    setResetPasswordValue('');
                    setResetConfirmPasswordValue('');
                    setPassword('');
                    setView('success');
                  } catch (error) {
                    alert(error instanceof Error ? error.message : 'Reset password failed');
                  }
                }}
              />
            )}

            {view === 'success' && (
              <SuccessView onDone={() => window.location.reload()} />
            )}

            {view === 'home' && (
              <HomeView onLogout={() => {
                storage.setCurrentUser(null);
                storage.setAccessToken(null);
                setPassword('');
                setResetPasswordValue('');
                setResetConfirmPasswordValue('');
                setChallengeToken(null);
                setAccessToken(null);
                setView('login');
              }} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
