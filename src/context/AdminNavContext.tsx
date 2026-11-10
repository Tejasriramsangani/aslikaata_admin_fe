"use client";

import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { adminApiClient } from '../lib/api-client';
import { useAdminAuth } from './AdminAuthContext';

export type AdminNavSection =
  | 'pricing' // Phase 1: Real-time Scrap Rates & Dynamic Margin Engine
  | 'fleet' // Phase 2: Vehicle Registry, Maintenance & Fuel
  | 'workforce' // Phase 3: HRM, Pickers, Drivers, Daily Cash Floats
  | 'inward' // Phase 4: Multi-Channel Scrap Intake & Yard Gate Walk-in
  | 'dispatch' // Manual accept + assign customer pickup requests
  | 'calendar' // Phase 5: Holiday Operations Calendar & Weekly Shift
  | 'outward' // Phase 6: Outward Mill Dispatches & Sales
  | 'analytics' // Phase 6: Financial P&L & Unit Economics
  | 'audits' // Phase 6: Fraud & Discrepancy Sentinel
  | 'users'; // RBAC Users & Staff Role Management

export interface DivisionOption {
  id: string;
  code: string;
  name: string;
  activePickups?: number;
}

interface AdminNavContextType {
  activeSection: AdminNavSection;
  setActiveSection: (sec: AdminNavSection) => void;
  selectedDivisionId: string;
  setSelectedDivisionId: (divId: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  isBackendConnected: boolean;
  unassignedBulkCount: number;
  setUnassignedBulkCount: React.Dispatch<React.SetStateAction<number>>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  divisions: DivisionOption[];
  /** Freelance-picker requests waiting for a decision (sidebar badge). */
  pendingPickerRequests: number;
  refreshPickerRequestCount: () => Promise<void>;
  /** Bumps whenever a picker request is raised/decided so open screens can reload. */
  pickerRequestEventTick: number;
}

const AdminNavContext = createContext<AdminNavContextType | undefined>(undefined);

export const AdminNavProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSection, setActiveSection] = useState<AdminNavSection>('pricing');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('all');
  const [divisions, setDivisions] = useState<DivisionOption[]>([
    { id: 'all', code: 'ALL', name: 'All Divisions (Network-Wide)' },
  ]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [unassignedBulkCount, setUnassignedBulkCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const { admin } = useAdminAuth();
  const [pendingPickerRequests, setPendingPickerRequests] = useState(0);
  const [pickerRequestEventTick, setPickerRequestEventTick] = useState(0);
  const adminId = admin?.userId;

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const refreshPickerRequestCount = useCallback(async () => {
    const res = await adminApiClient.get<{ pending: number }>('/admin/picker-requests/pending-count');
    if (res.success && res.data) setPendingPickerRequests(Number(res.data.pending) || 0);
  }, []);

  useEffect(() => {
    if (adminId) void refreshPickerRequestCount();
  }, [adminId, refreshPickerRequestCount]);

  useEffect(() => {
    if (!adminId) return; // not signed in (e.g. login page): nothing to load
    const loadNavigationData = async () => {
      const [divisionRes, unassignedRes] = await Promise.all([
        adminApiClient.get('/admin/divisions'),
        adminApiClient.get('/admin/pickups/unassigned'),
      ]);
      if (divisionRes.success && Array.isArray(divisionRes.data)) {
        setDivisions([
          { id: 'all', code: 'ALL', name: 'All Divisions (Network-Wide)' },
          ...divisionRes.data.map((division: any) => ({
            id: division._id || division.id,
            code: division.code || '—',
            name: division.name || '—',
            activePickups: Number(division.activePickups || 0),
          })),
        ]);
      }
      setUnassignedBulkCount(
        unassignedRes.success && Array.isArray(unassignedRes.data) ? unassignedRes.data.length : 0,
      );
    };
    loadNavigationData();
  }, [adminId]);

  // Real-time Socket.IO Connection to NestJS Backend
  useEffect(() => {
    if (!adminId) return; // sockets require a valid token; connect only once signed in
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    let socket: Socket | null = null;

    try {
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnectionAttempts: 10,
        // Resolved on every (re)connect so an expired access token is renewed first.
        auth: (cb) => {
          adminApiClient.getValidAccessToken().then((token) => cb(token ? { token } : {}));
        },
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

      // Freelance-picker requests raised / decided (by anyone) -> keep badge + open list fresh
      socket.on('picker_request.created', () => {
        setPendingPickerRequests((c) => c + 1);
        setPickerRequestEventTick((t) => t + 1);
      });
      socket.on('picker_request.updated', () => {
        void refreshPickerRequestCount();
        setPickerRequestEventTick((t) => t + 1);
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
      setIsBackendConnected(false);
    };
  }, [adminId, refreshPickerRequestCount]);

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
        isMobileNavOpen,
        setIsMobileNavOpen,
        isBackendConnected,
        unassignedBulkCount,
        setUnassignedBulkCount,
        searchQuery,
        setSearchQuery,
        divisions,
        pendingPickerRequests,
        refreshPickerRequestCount,
        pickerRequestEventTick,
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
