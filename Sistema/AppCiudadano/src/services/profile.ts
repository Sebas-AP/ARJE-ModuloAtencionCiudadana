import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../constants';

class ProfileService {
  private static instance: ProfileService;
  private profile: UserProfile | null = null;

  private constructor() {}

  public static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  public async loadProfile(): Promise<UserProfile> {
    if (this.profile) return this.profile;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        this.profile = JSON.parse(stored);
      } else {
        this.profile = {};
      }
    } catch {
      this.profile = {};
    }
    return this.profile ?? {};
  }

  public async saveProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.loadProfile();
    this.profile = { ...current, ...profile };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(this.profile));
    return this.profile;
  }

  public async updateField<K extends keyof UserProfile>(field: K, value: UserProfile[K]): Promise<UserProfile> {
    return this.saveProfile({ [field]: value });
  }

  public async clearProfile(): Promise<void> {
    this.profile = {};
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }

  public getProfile(): UserProfile | null {
    return this.profile;
  }

  public getField<K extends keyof UserProfile>(field: K): UserProfile[K] | undefined {
    return this.profile?.[field];
  }
}

export const profileService = ProfileService.getInstance();