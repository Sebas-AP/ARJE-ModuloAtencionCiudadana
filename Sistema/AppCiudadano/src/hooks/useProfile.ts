import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profile';
import { UserProfile } from '../types';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const p = await profileService.loadProfile();
      setProfile(p);
      setIsLoading(false);
    };
    load();
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const updated = await profileService.saveProfile(updates);
    setProfile(updated);
    return updated;
  }, []);

  const updateField = useCallback(async <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    const updated = await profileService.updateField(field, value);
    setProfile(updated);
    return updated;
  }, []);

  const clearProfile = useCallback(async () => {
    await profileService.clearProfile();
    setProfile({});
  }, []);

  return {
    profile,
    isLoading,
    updateProfile,
    updateField,
    clearProfile,
  };
}