import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { patients } from './api';
import { fullName } from './avatar';
import { useAuthStore } from './stores/authStore';

// Signed photo URLs expire (~1h). A failed image triggers one profile refetch, but never
// more often than this, so a photo that stays broken cannot cause a refetch loop.
const MIN_REFETCH_GAP_MS = 30_000;

/**
 * The signed-in user's avatar props. Reads the shared ['patient','profile'] query (fresh signed
 * URL, current gender) and falls back to the login snapshot in the auth store until it loads.
 * The store is kept in sync so non-hook readers see the fresh values too.
 */
export function useMyAvatar() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data, refetch } = useQuery({
    queryKey: ['patient', 'profile'],
    queryFn: () => patients.getMyProfile(),
    enabled: isAuthenticated,
  });
  const profile = data?.data;

  const uri = profile ? (profile.profilePhotoUrl ?? undefined) : user?.avatarUrl;
  const gender = profile?.gender ?? user?.gender;
  const name = profile
    ? fullName(profile.firstName, profile.lastName)
    : fullName(user?.firstName, user?.lastName);

  useEffect(() => {
    if (!profile) return;
    const current = useAuthStore.getState().user;
    const next = profile.profilePhotoUrl ?? undefined;
    if (current && (current.avatarUrl !== next || current.gender !== profile.gender)) {
      useAuthStore.setState({ user: { ...current, avatarUrl: next, gender: profile.gender } });
    }
  }, [profile]);

  const lastRefetch = useRef(0);
  const onImageError = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetch.current < MIN_REFETCH_GAP_MS) return;
    lastRefetch.current = now;
    void refetch();
  }, [refetch]);

  return { uri, name, gender, onImageError };
}
