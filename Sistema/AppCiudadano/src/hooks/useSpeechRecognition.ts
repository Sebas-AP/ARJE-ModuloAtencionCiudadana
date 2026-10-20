import { useState, useEffect, useCallback, useRef } from 'react';
import Constants from 'expo-constants';
import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

// Expo Go cannot load this third-party native module.  Do not require it in
// that runtime: the report form remains usable and simply omits dictation.
const speechRecognitionModule = Constants.executionEnvironment === 'storeClient'
  ? null
  : require('expo-speech-recognition').ExpoSpeechRecognitionModule;

interface SpeechRecognitionState {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isAvailable: boolean;
}

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechRecognitionState>({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    error: null,
    isAvailable: false,
  });

  const isMountedRef = useRef(true);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    checkAvailability();

    const subscriptions = [
      speechRecognitionModule?.addListener?.('start', () => {
        if (isMountedRef.current) setState((prev) => ({ ...prev, isListening: true, error: null }));
      }),
      speechRecognitionModule?.addListener?.('end', () => {
        if (isMountedRef.current) setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
      }),
      speechRecognitionModule?.addListener?.('result', (result: any) => {
        if (!isMountedRef.current) return;
        const transcript = result.results[0]?.transcript || '';
        setState((prev) => result.isFinal
          ? { ...prev, transcript: prev.transcript + (prev.transcript ? ' ' : '') + transcript, interimTranscript: '' }
          : { ...prev, interimTranscript: transcript });
      }),
      speechRecognitionModule?.addListener?.('error', (event: any) => {
        if (!isMountedRef.current) return;
        const persistent = event.error !== 'aborted' && event.error !== 'no-speech';
        setState((prev) => ({ ...prev, error: persistent ? event.message || 'Error en reconocimiento de voz' : null, isListening: false }));
      }),
    ];

    return () => {
      isMountedRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      subscriptions.forEach((subscription) => subscription?.remove?.());
      speechRecognitionModule?.stop?.();
    };
  }, []);

  const checkAvailability = async () => {
    try {
      const available = speechRecognitionModule?.isRecognitionAvailable ? speechRecognitionModule.isRecognitionAvailable() : false;
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isAvailable: !!available }));
      }
    } catch {
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isAvailable: false }));
      }
    }
  };

  const startListening = useCallback(async (options?: ExpoSpeechRecognitionOptions) => {
    if (!state.isAvailable) {
      await checkAvailability();
    }

    if (!speechRecognitionModule) {
      setState((prev) => ({ ...prev, error: 'Reconocimiento de voz no soportado en este dispositivo' }));
      return;
    }

    const permission = await speechRecognitionModule.requestPermissionsAsync?.() ?? { granted: false };
    if (!permission.granted) {
      setState((prev) => ({ ...prev, error: 'Permiso de micrófono denegado' }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isListening: true,
      error: null,
      interimTranscript: '',
    }));

    try {
      speechRecognitionModule.start?.({
        lang: 'es-ES',
        interimResults: true,
        continuous: false,
        ...options,
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: error instanceof Error ? error.message : 'Error al iniciar reconocimiento',
      }));
    }
  }, [state.isAvailable, checkAvailability]);

  const stopListening = useCallback(async () => {
    try {
      speechRecognitionModule?.stop?.();
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
    resetTranscript,
    setTranscript,
    checkAvailability,
  };
}
