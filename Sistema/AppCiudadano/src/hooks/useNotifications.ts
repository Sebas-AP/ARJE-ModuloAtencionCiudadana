import { useEffect, useCallback, useState } from 'react';
import { notificationService } from '../services/notifications';
import { NotificationData } from '../constants';

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = await notificationService.loadStoredToken();
      if (token) {
        setExpoPushToken(token);
      }
      const permission = await notificationService.hasPermission();
      setHasPermission(permission);
    };
    init();
  }, []);

  const registerForPushNotifications = useCallback(async () => {
    const token = await notificationService.registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      setHasPermission(true);
    }
    return token;
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
    if (granted) {
      return registerForPushNotifications();
    }
    return null;
  }, [registerForPushNotifications]);

  const setupListeners = useCallback((
    onNotification: (notification: any) => void,
    onResponse: (response: any) => void
  ) => {
    notificationService.setupNotificationListeners(onNotification, onResponse);
    return () => notificationService.removeNotificationListeners();
  }, []);

  const sendLocalNotification = useCallback(async (data: NotificationData) => {
    return notificationService.sendLocalNotification(data);
  }, []);

  const scheduleNotification = useCallback(async (data: NotificationData, trigger: any) => {
    return notificationService.scheduleNotification(data, trigger);
  }, []);

  const cancelNotification = useCallback(async (id: string) => {
    return notificationService.cancelNotification(id);
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    return notificationService.cancelAllNotifications();
  }, []);

  const setBadgeCount = useCallback(async (count: number) => {
    return notificationService.setBadgeCount(count);
  }, []);

  const clearBadge = useCallback(async () => {
    return notificationService.clearBadge();
  }, []);

  return {
    expoPushToken,
    hasPermission,
    registerForPushNotifications,
    requestPermission,
    setupListeners,
    sendLocalNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    setBadgeCount,
    clearBadge,
  };
}