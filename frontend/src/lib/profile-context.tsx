"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type ProfileType = "autor" | "processos" | "admin" | null;

interface ProfileContextValue {
  profile: ProfileType;
  setProfile: (p: ProfileType) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  setProfile: () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<ProfileType>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("5s_profile") as ProfileType;
    if (stored) {
      setProfileState(stored);
    }
    setLoaded(true);
  }, []);

  const setProfile = (p: ProfileType) => {
    setProfileState(p);
    if (p) {
      localStorage.setItem("5s_profile", p);
    } else {
      localStorage.removeItem("5s_profile");
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
