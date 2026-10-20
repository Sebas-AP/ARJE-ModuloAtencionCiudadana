import type * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, NotificationData } from '../constants';

// expo-notifications includes native code that Expo Go no longer ships on
// Android. Keeping this module lazy lets the rest of the app run in Expo Go;
// notification features remain available in a development/production build.
const Notifications: typeof ExpoNotifications | null = Constants.executionEnvironment === 'storeClient'
  ? null
  : require('expo-notifications');

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: ExpoNotifications.EventSubscription | null = null;
  private responseListener: ExpoNotifications.EventSubscription | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async registerForPushNotifications(): Promise<string | null> {
    if (this.expoPushToken) {
      return this.expoPushToken;
    }

    if (!Notifications || !Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions not granted');
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PERMISSIONS, 'denied');
      return null;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PERMISSIONS, 'granted');

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.extra?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      this.expoPushToken = token.data;
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, this.expoPushToken);
      console.log('Expo Push Token:', this.expoPushToken);
      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  public async setupNotificationListeners(
    onNotification: (notification: ExpoNotifications.Notification) => void,
    onResponse: (response: ExpoNotifications.NotificationResponse) => void
  ): Promise<void> {
    if (!Notifications) return;
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotification);
    this.responseListener = Notifications.addNotificationResponseReceivedListener(onResponse);
  }

  public removeNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  public async sendLocalNotification(data: NotificationData): Promise<string> {
    if (!Notifications) return '';
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: { ...data.data, type: data.type, reporteId: data.reporteId },
        sound: true,
        badge: 1,
      },
      trigger: null,
    });
    return notificationId;
  }

  public async scheduleNotification(
    data: NotificationData,
    trigger: ExpoNotifications.NotificationTriggerInput
  ): Promise<string> {
    if (!Notifications) return '';
    return Notifications.scheduleNotificationAsync({
      content: {
        title: data.title,
        body: data.body,
        data: { ...data.data, type: data.type, reporteId: data.reporteId },
        sound: true,
      },
      trigger,
    });
  }

  public async cancelNotification(notificationId: string): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  public async cancelAllNotifications(): Promise<void> {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  public async getBadgeCount(): Promise<number> {
    if (!Notifications) return 0;
    return Notifications.getBadgeCountAsync();
  }

  public async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  }

  public async clearBadge(): Promise<void> {
    if (!Notifications) return;
    await Notifications.setBadgeCountAsync(0);
  }

  public getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  public async loadStoredToken(): Promise<string | null> {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_TOKEN);
    if (stored) {
      this.expoPushToken = stored;
    }
    return this.expoPushToken;
  }

  public async hasPermission(): Promise<boolean> {
    if (!Notifications) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    if (!Notifications) return false;
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    return status === 'granted';
  }

  public static createStatusChangeNotification(
    reporteId: number,
    oldStatus: string,
    newStatus: string
  ): NotificationData {
    return {
      type: 'status_change',
      reporteId,
      title: 'Actualización de reporte',
      body: `Tu reporte #${reporteId} cambió de "${oldStatus}" a "${newStatus}"`,
      data: { reporteId, oldStatus, newStatus },
    };
  }

  public static createAssignedNotification(
    reporteId: number,
    cuadrillaNombre: string
  ): NotificationData {
    return {
      type: 'assigned',
      reporteId,
      title: 'Reporte asignado',
      body: `Tu reporte #${reporteId} fue asignado a la cuadrilla "${cuadrillaNombre}"`,
      data: { reporteId, cuadrillaNombre },
    };
  }

  public static createCompletedNotification(
    reporteId: number
  ): NotificationData {
    return {
      type: 'completed',
      reporteId,
      title: 'Reporte completado',
      body: `Tu reporte #${reporteId} ha sido completado`,
      data: { reporteId },
    };
  }
}

export const notificationService = NotificationService.getInstance();
