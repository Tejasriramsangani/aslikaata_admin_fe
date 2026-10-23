"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export type AdminNavSection =
  | 'pricing' // Phase 1: Real-time Scrap Rates & Dynamic Margin Engine
  | 'fleet' // Phase 2: Vehicle Registry, Maintenance & Fuel
  | 'workforce' // Phase 3: HRM, Pickers, Drivers, Daily Cash Floats
  | 'inward' // Phase 4: Multi-Channel Scrap Intake & Yard Gate Walk-in
  | 'calendar' // Phase 5: Holiday Operations Calendar & Weekly Shift
  | 'outward' // Phase 6: Outward Mill Dispatches & Sales
  | 'analytics' // Phase 6: Financial P&L & Unit Economics
  | 'audits' // Phase 6: Fraud & Discrepancy Sentinel
  | 'users'; // RBAC Users & Staff Role Management

export interface DivisionOption {
  id: string;
  code: string;
  name: string;
  activePickups: number;
}

export const AVAILABLE_DIVISIONS: DivisionOption[] = [
  { id: 'div_all', code: 'ALL', name: 'All Divisions (Network-Wide)', activePickups: 42 },
  { id: 'div_vja_central', code: 'VJA_C', name: 'Vijayawada Central Yard (MG Road, Benz Circle)', activePickups: 18 },
  { id: 'div_vja_east', code: 'VJA_E', name: 'Vijayawada East (Madhura Nagar, Currency Nagar)', activePickups: 15 },
  { id: 'div_guntur_hub', code: 'GNT_01', name: 'Guntur Processing Yard (Autonagar)', activePickups: 9 },
];

interface AdminNavContextType {
  activeSection: AdminNavSection;
  setActiveSection: (sec: AdminNavSection) => void;
  selectedDivisionId: string;
  setSelectedDivisionId: (divId: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isBackendConnected: boolean;
  unassignedBulkCount: number;
  setUnassignedBulkCount: React.Dispatch<React.SetStateAction<number>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const AdminNavContext = createContext<AdminNavContextType | undefined>(undefined);

export const AdminNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<AdminNavSection>('pricing');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('div_all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [unassignedBulkCount, setUnassignedBulkCount] = useState(2); // Initial active alerts
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Real-time Socket.IO Connection to NestJS Backend
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    let socket: Socket | null = null;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('aslikaata_admin_access_token') : null;
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnectionAttempts: 10,
        auth: token ? { token } : undefined,
      });

      socket.on('connect', () => {
        setIsBackendConnected(true);
      });

      socket.on('disconnect', () => {
        setIsBackendConnected(false);
      });

      socket.on('connect_error', () => {
        setIsBackendConnected(false);
      });

      // Listen for unassigned pickup alerts
      socket.on('pickup.unassigned_alert', () => {
        setUnassignedBulkCount((c) => c + 1);
      });
    } catch {
      setIsBackendConnected(false);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return (
    <AdminNavContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedDivisionId,
        setSelectedDivisionId,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isBackendConnected,
        unassignedBulkCount,
        setUnassignedBulkCount,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AdminNavContext.Provider>
  );
};

export const useAdminNav = () => {
  const ctx = useContext(AdminNavContext);
  if (!ctx) throw new Error('useAdminNav must be used within an AdminNavProvider');
  return ctx;
};
