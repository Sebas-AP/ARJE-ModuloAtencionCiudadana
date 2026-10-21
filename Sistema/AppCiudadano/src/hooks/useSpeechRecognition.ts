import { useState, useEffect, useCallback, useRef } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

// Expo Go cannot load this third-party native module. Do not require it in
// that runtime: the report form remains usable and simply omits dictation.
const speechRecognitionModule = Constants.executionEnvironment === 'storeClient'
  ? null
  : require('expo-speech-recognition').ExpoSpeechRecognitionModule;

// Web Speech API detection
const webSpeechRecognition = Platform.OS === 'web' && typeof window !== 'undefined' 
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
  : null;

interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isAvailable: boolean;
  isSupported: boolean;
}

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isAvailable: false,
    isSupported: false,
  });

  const isMountedRef = useRef(true);
  const originalTranscriptRef = useRef<string>('');
  const webRecognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check availability on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkAvailability();

    let subscriptions: any[] = [];

    if (speechRecognitionModule) {
      subscriptions = [
        speechRecognitionModule.addListener?.('start', () => {
          if (isMountedRef.current) setState((prev) => ({ ...prev, isListening: true, error: null }));
        }),
        speechRecognitionModule.addListener?.('end', () => {
          if (isMountedRef.current) setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
        }),
        speechRecognitionModule.addListener?.('result', (result: any) => {
          if (!isMountedRef.current) return;
          const transcript = result.results[0]?.transcript || '';
          setState((prev) => result.isFinal
            ? { ...prev, transcript: prev.transcript + (prev.transcript ? ' ' : '') + transcript, interimTranscript: '' }
            : { ...prev, interimTranscript: transcript });
        }),
        speechRecognitionModule.addListener?.('error', (event: any) => {
          if (!isMountedRef.current) return;
          // Handle different error types
          const isNoSpeech = event.error === 'no-speech';
          const isAborted = event.error === 'aborted';
          const isNetwork = event.error === 'network';
          const persistent = !isNoSpeech && !isAborted;
          
          setState((prev) => ({ 
            ...prev, 
            error: persistent ? event.message || 'Error en reconocimiento de voz' : null, 
            isListening: false 
          }));
          
          // For no-speech, we could auto-restart if continuous mode
          if (isNoSpeech && state.isListening) {
            // Optionally auto-restart after a brief pause
          }
        }),
      ];
    } else if (webSpeechRecognition) {
      // Web Speech API setup
      const recognition = new webSpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        if (isMountedRef.current) setState((prev) => ({ ...prev, isListening: true, error: null }));
      };
      recognition.onend = () => {
        if (isMountedRef.current) setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
      };
      recognition.onresult = (event: any) => {
        if (!isMountedRef.current) return;
        const result = event.results[event.results.length - 1];
        const transcript = result[0]?.transcript || '';
        setState((prev) => result.isFinal
          ? { ...prev, transcript: prev.transcript + (prev.transcript ? ' ' : '') + transcript, interimTranscript: '' }
          : { ...prev, interimTranscript: transcript });
      };
      recognition.onerror = (event: any) => {
        if (!isMountedRef.current) return;
        const isNoSpeech = event.error === 'no-speech';
        const isAborted = event.error === 'aborted';
        const isNetwork = event.error === 'network';
        const persistent = !isNoSpeech && !isAborted;
        
        setState((prev) => ({ 
          ...prev, 
          error: persistent ? event.message || 'Error en reconocimiento de voz' : null, 
          isListening: false 
        }));
      };

      webRecognitionRef.current = recognition;
    }

    return () => {
      isMountedRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      subscriptions.forEach((subscription) => subscription?.remove?.());
      speechRecognitionModule?.stop?.();
      webRecognitionRef.current?.abort?.();
    };
  }, []);

  const checkAvailability = async () => {
    try {
      let available = false;
      if (speechRecognitionModule) {
        available = speechRecognitionModule.isRecognitionAvailable 
          ? speechRecognitionModule.isRecognitionAvailable() 
          : false;
      } else if (webSpeechRecognition) {
        available = true;
      }
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isAvailable: !!available, isSupported: !!available }));
      }
    } catch {
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isAvailable: false, isSupported: false }));
      }
    }
  };

  const startListening = useCallback(async (options?: ExpoSpeechRecognitionOptions) => {
    if (!state.isAvailable) {
      await checkAvailability();
    }

    if (!state.isSupported) {
      setState((prev) => ({ ...prev, error: 'Reconocimiento de voz no soportado en este dispositivo' }));
      return;
    }

    // Store original transcript for potential cancel
    originalTranscriptRef.current = state.transcript;

    // Request permission
    let permissionGranted = false;
    if (speechRecognitionModule) {
      const permission = await speechRecognitionModule.requestPermissionsAsync?.() ?? { granted: false };
      permissionGranted = permission.granted;
    } else if (webSpeechRecognition) {
      // Web Speech API handles permission via browser prompt
      permissionGranted = true;
    }

    if (!permissionGranted) {
      setState((prev) => ({ ...prev, error: 'Permiso de micrófono denegado' }));
      return;
    }

    // Only set isListening after permission granted
    try {
      if (speechRecognitionModule) {
        speechRecognitionModule.start?.({
          lang: 'es-MX', // Prefer Mexican Spanish
          interimResults: true,
          continuous: false,
          ...options,
        });
      } else if (webRecognitionRef.current) {
        webRecognitionRef.current.lang = 'es-MX';
        webRecognitionRef.current.start();
      }
      
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
          interimTranscript: '',
        }));
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: error instanceof Error ? error.message : 'Error al iniciar reconocimiento',
      }));
    }
  }, [state.isAvailable, checkAvailability, state.transcript]);

  const stopListening = useCallback(async () => {
    try {
      speechRecognitionModule?.stop?.();
      webRecognitionRef.current?.stop?.();
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isListening: false,
          interimTranscript: '',
        }));
      }
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, []);

  const cancelListening = useCallback(async () => {
    // Stop listening and restore original transcript
    await stopListening();
    setState((prev) => ({
      ...prev,
      transcript: originalTranscriptRef.current,
      interimTranscript: '',
      isListening: false,
    }));
  }, [stopListening]);

  const resetTranscript = useCallback(() => {
    setState((prev) => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
    }));
  }, []);

  const setTranscript = useCallback((text: string) => {
    setState((prev) => ({
      ...prev,
      transcript: text,
    }));
  }, []);

  const fullTranscript = state.transcript + (state.interimTranscript ? ' ' + state.interimTranscript : '');

  return {
    ...state,
    fullTranscript,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
    setTranscript,
    checkAvailability,
  };
}
