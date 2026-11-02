"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApiClient } from '../lib/api-client';

export type AdminRole = 'SUPER_ADMIN' | 'YARD_MANAGER' | 'DISPATCHER' | 'ACCOUNTANT';

export interface AdminUser {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  avatarUrl?: string;
  assignedDivision?: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const isValidJwt = (token: string): boolean => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore the session after a reload. The access token only lives 15 minutes,
    // so an expired one must be renewed with the (30 day) refresh token instead of
    // sending the admin back to the login screen.
    const initAuth = async () => {
      try {
        const storedProfile = localStorage.getItem('aslikaata_admin_profile');
        const storedToken = localStorage.getItem('aslikaata_admin_access_token');
        if (!storedProfile) {
          adminApiClient.clearTokens();
          return;
        }
        let tokenOk = !!storedToken && isValidJwt(storedToken);
        if (!tokenOk) {
          const fresh = await adminApiClient.acquireFreshToken();
          // A rejected refresh token is cleared by the client. If it is still stored the
          // backend was just unreachable, so keep the admin signed in and retry later.
          tokenOk = !!fresh || !!localStorage.getItem('aslikaata_admin_refresh_token');
        }
        if (tokenOk) {
          const profile: AdminUser = JSON.parse(storedProfile);
          // The role shown/used in the UI always comes from the server, never from storage.
          const me = await adminApiClient.get('/auth/me');
          if (me.success && me.data?.staffRole) {
            profile.role = me.data.staffRole as AdminRole;
            localStorage.setItem('aslikaata_admin_profile', JSON.stringify(profile));
            setAdmin(profile);
          } else if (me.success) {
            // Valid token but no staff role (removed/never assigned): not an admin session.
            adminApiClient.clearTokens();
            setAdmin(null);
          } else {
            // Server unreachable or temporarily failing: keep the stored profile.
            setAdmin(profile);
          }
        } else {
          adminApiClient.clearTokens();
          setAdmin(null);
        }
      } catch (err) {
        console.warn('AdminAuth initAuth error:', err);
        adminApiClient.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Real dynamic login with backend endpoint
   */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await adminApiClient.post('/auth/admin/login', {
        email: email.trim(),
        password,
      });

      if (res.success && res.data) {
        const { accessToken, refreshToken, admin: adminData } = res.data;
        adminApiClient.setTokens(accessToken, refreshToken);

        const profile: AdminUser = {
          userId: adminData.id,
          name: adminData.name || 'Admin User',
          email: adminData.email,
          mobile: adminData.mobile || '',
          role: (adminData.role || 'SUPER_ADMIN') as AdminRole,
          assignedDivision: adminData.assignedDivision || 'All Andhra Divisions',
        };

        setAdmin(profile);
        localStorage.setItem('aslikaata_admin_profile', JSON.stringify(profile));
        return { success: true };
      }

      return {
        success: false,
        error: res.error || 'Invalid email or password. Please verify your credentials.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server.',
      };
    }
  };

  const logout = () => {
    setAdmin(null);
    adminApiClient.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
};
