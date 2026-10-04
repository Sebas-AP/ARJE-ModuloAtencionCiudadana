import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SplashScreen } from 'expo-splash-screen';
import { authService } from './services/authService';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      setUserLoaded(true);
      SplashScreen.hideAsync();
    };
    loadUser();
  }, []);

  if (!userLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reporte/[id]" />
        </>
      ) : (
        <Stack.Screen name="(auth)/login" />
      )}
    </Stack>
  );
}