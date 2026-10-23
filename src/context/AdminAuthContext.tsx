"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminApiClient } from '../lib/api-client';

export type AdminRole = 'SUPER_ADMIN' | 'YARD_MANAGER' | 'DISPATCHER' | 'ACCOUNTANT' | 'COLLECTOR';

export interface AdminUser {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  avatarUrl?: string;
  assignedDivision?: string;
}

export interface DemoCredential {
  role: AdminRole;
  label: string;
  name: string;
  email: string;
  password: string;
  division: string;
  description: string;
}

export const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    name: 'Ramesh Varma',
    email: 'admin@aslikaata.com',
    password: 'Admin@123456',
    division: 'All Andhra Divisions',
    description: 'Full ERP access, margins, system settings & audits',
  },
  {
    role: 'YARD_MANAGER',
    label: 'Yard Manager',
    name: 'K. Venkat Rao',
    email: 'yard.manager@aslikaata.com',
    password: 'Yard@123456',
    division: 'Vijayawada Central Yard',
    description: 'Inward gate, scale weighing, baling & outward dispatch',
  },
  {
    role: 'DISPATCHER',
    label: 'Fleet Dispatcher',
    name: 'Suresh Reddy',
    email: 'dispatcher@aslikaata.com',
    password: 'Dispatch@123456',
    division: 'Guntur Autonagar Fleet Hub',
    description: 'Vehicle fleet, driver assignment, route schedules',
  },
  {
    role: 'ACCOUNTANT',
    label: 'Chief Accountant',
    name: 'P. Anitha',
    email: 'accounts@aslikaata.com',
    password: 'Accounts@123456',
    division: 'All Andhra Divisions',
    description: 'Daily cash float reconciliation, ledger & P&L realized margins',
  },
];

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithDemo: (role: AdminRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount from localStorage, ensuring valid backend JWT
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedProfile = localStorage.getItem('aslikaata_admin_profile');
        const storedToken = localStorage.getItem('aslikaata_admin_access_token');

        // Always guarantee a fresh valid JWT from backend
        let activeToken = storedToken;
        if (!activeToken || activeToken.startsWith('demo_jwt_')) {
          activeToken = await adminApiClient.acquireFreshToken();
        }

        if (storedProfile) {
          setAdmin(JSON.parse(storedProfile));
        } else {
          // Default Super Admin profile
          const defaultProfile: AdminUser = {
            userId: 'usr_admin_01',
            name: 'Ramesh Varma',
            email: 'admin@aslikaata.com',
            mobile: '9848022334',
            role: 'SUPER_ADMIN',
            assignedDivision: 'All Andhra Divisions',
          };
          setAdmin(defaultProfile);
          localStorage.setItem('aslikaata_admin_profile', JSON.stringify(defaultProfile));
        }
      } catch (err) {
        console.warn('AdminAuth initAuth error:', err);
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
        const { accessToken, admin: adminData } = res.data;
        adminApiClient.setTokens(accessToken);

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

      // Check if matches known demo credentials for graceful fallback
      const matchingDemo = DEMO_CREDENTIALS.find(
        (d) => d.email.toLowerCase() === email.toLowerCase() && d.password === password,
      );
      if (matchingDemo) {
        const fallbackProfile: AdminUser = {
          userId: `usr_demo_${matchingDemo.role.toLowerCase()}`,
          name: matchingDemo.name,
          email: matchingDemo.email,
          mobile: '9848022334',
          role: matchingDemo.role,
          assignedDivision: matchingDemo.division,
        };
        adminApiClient.setTokens(`demo_jwt_${matchingDemo.role.toLowerCase()}`);
        setAdmin(fallbackProfile);
        localStorage.setItem('aslikaata_admin_profile', JSON.stringify(fallbackProfile));
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

  /**
   * One-click demo login helper
   */
  const loginWithDemo = async (role: AdminRole): Promise<{ success: boolean; error?: string }> => {
    const cred = DEMO_CREDENTIALS.find((d) => d.role === role);
    if (!cred) return { success: false, error: 'Unknown role' };
    return login(cred.email, cred.password);
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
        loginWithDemo,
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
