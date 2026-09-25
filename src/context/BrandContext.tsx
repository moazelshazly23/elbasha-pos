import React, { createContext, useContext, useEffect, useState } from 'react';
import { RestaurantProfile } from '../types';
import { posDb } from '../services/db';

interface BrandContextType {
  profile: RestaurantProfile;
  updateProfile: (updated: Partial<RestaurantProfile>) => void;
  resetBranding: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<RestaurantProfile>(() => posDb.getProfile());

  useEffect(() => {
    const unsubscribe = posDb.subscribe(() => {
      setProfile(posDb.getProfile());
    });
    return unsubscribe;
  }, []);

  // Sync dynamic CSS variables and Document Title
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', profile.primaryColor || '#8B1E1E');
    root.style.setProperty('--brand-dark', profile.darkColor || '#231610');
    root.style.setProperty('--brand-accent', profile.accentColor || '#B8860B');
    root.style.setProperty('--brand-bg', profile.bgColor || '#F8F5F0');

    // Dynamically update document title
    document.title = `${profile.name} | ${profile.englishName || 'Restaurant POS'}`;
  }, [profile]);

  const updateProfile = (updated: Partial<RestaurantProfile>) => {
    const next = posDb.updateProfile(updated);
    setProfile(next);
  };

  const resetBranding = () => {
    posDb.resetToDefaultDemo();
    setProfile(posDb.getProfile());
  };

  return (
    <BrandContext.Provider value={{ profile, updateProfile, resetBranding }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = (): BrandContextType => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within BrandProvider');
  }
  return context;
};
