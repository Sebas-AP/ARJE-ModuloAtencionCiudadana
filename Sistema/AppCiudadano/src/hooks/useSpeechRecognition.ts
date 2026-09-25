import { useState, useEffect, useCallback, useRef } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent, ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

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

  useSpeechRecognitionEvent('start', () => {
    if (!isMountedRef.current) return;
    setState((prev) => ({ ...prev, isListening: true, error: null }));
  });

  useSpeechRecognitionEvent('end', () => {
    if (!isMountedRef.current) return;
    setState((prev) => ({ ...prev, isListening: false, interimTranscript: '' }));
  });

  useSpeechRecognitionEvent('result', (result) => {
    if (!isMountedRef.current) return;
    const transcript = result.results[0]?.transcript || '';
    if (result.isFinal) {
      setState((prev) => ({
        ...prev,
        transcript: prev.transcript + (prev.transcript ? ' ' : '') + transcript,
        interimTranscript: '',
      }));
    } else {
      setState((prev) => ({
        ...prev,
        interimTranscript: transcript,
      }));
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (!isMountedRef.current) return;
    let persistent = true;
    if (event.error === 'aborted' || event.error === 'no-speech') {
      persistent = false;
    }
    setState((prev) => ({
      ...prev,
      error: persistent ? event.message || 'Error en reconocimiento de voz' : null,
      isListening: false,
    }));
  });

  useEffect(() => {
    isMountedRef.current = true;
    checkAvailability();

    return () => {
      isMountedRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  const checkAvailability = async () => {
    try {
      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isAvailable: available }));
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

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
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
      ExpoSpeechRecognitionModule.start({
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
      ExpoSpeechRecognitionModule.stop();
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