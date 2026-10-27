"use client";

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Users,
  Layers,
  Send,
  RefreshCw,
  Sliders,
  X,
  FileText,
  Check,
  MapPin,
  BellRing,
  RotateCcw,
  Zap,
  Building2,
  Scale,
  Smartphone,
  Eye,
  Trash2,
  Pencil,
  Save,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';

export interface AdminWeightRange {
  id: string;
  name: string;
  displayLabel: string;
  minKg: number;
  maxKg: number;
  displayOrder: number;
  isActive: boolean;
}

export type HolidayScope = 'ALL' | 'DIVISIONS' | 'VEHICLES';
export type HolidayHandling = 'NEXT_WORKING_DAY' | 'NEXT_WEEK_SAME_DAY';

export interface OperationsHoliday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'NATIONAL' | 'STATE_REGIONAL' | 'MUNICIPAL_LOCAL' | 'YARD_MAINTENANCE';
  scope: HolidayScope;
  scopeDescription: string;
  divisionIds?: string[];
  vehicleIds?: string[];
  handling: HolidayHandling;
  affectedRunsCount: number;
  affectedPickupsCount: number;
  shiftedToDate: string;
  isConfirmed: boolean;
}

export interface WeeklyMatrixCell {
  vehicleReg: string;
  vehicleName: string;
  dayOfWeek: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  divisionName: string;
  assignedDriver: string;
  collectorName: string;
  totalStops: number;
  bookedKg: number;
  maxCapacityKg: number;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'HOLIDAY_SHIFTED';
  stops: {
    stopNumber: number;
    pickupCode: string;
    customerName: string;
    area: string;
    weightKg: number;
    timeSlot: string;
  }[];
}

export interface UnassignedPickupRecord {
  id: string;
  pickupCode: string; // AKP-20261012-088
  customerName: string;
  phone: string;
  divisionName: string;
  address: string;
  estimatedWeightKg: number;
  scrapCategories: string[];
  requestedDate: string;
  preferredSlot: string;
  reason: 'BULK_COMMERCIAL_OVER_100KG' | 'SLOT_OVERCAPACITY' | 'HOLIDAY_RESCHEDULED_UNMATCHED';
  flaggedAt: string;
}

export const HolidayAndRoutePlanningScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'MATRIX' | 'UNASSIGNED_QUEUE' | 'SETTINGS'>('CALENDAR');
  const [holidays, setHolidays] = useState<OperationsHoliday[]>([]);
  const [matrixCells, setMatrixCells] = useState<WeeklyMatrixCell[]>([]);
  const [unassignedQueue, setUnassignedQueue] = useState<UnassignedPickupRecord[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calendar State
  const today = new Date();
  const [currentMonth] = useState(today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Modals
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUnassignedItem, setSelectedUnassignedItem] = useState<UnassignedPickupRecord | null>(null);
  const [inspectingRouteCell, setInspectingRouteCell] = useState<WeeklyMatrixCell | null>(null);

  // Form: Create / Simulate Holiday
  const [formDate, setFormDate] = useState(today.toISOString().split('T')[0]);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<OperationsHoliday['type']>('STATE_REGIONAL');
  const [formScope, setFormScope] = useState<HolidayScope>('ALL');
  const [formHandling, setFormHandling] = useState<HolidayHandling>('NEXT_WORKING_DAY');

  // Simulation Results Preview
  const [simulationData, setSimulationData] = useState<{
    affectedRunsCount: number;
    affectedPickupsCount: number;
    shiftsToDate: string;
    sampleNotificationText: string;
  } | null>(null);

  // Vehicle Assign Target
  const [assignTargetVehicle, setAssignTargetVehicle] = useState('');

  // Route Settings
  const [bulkLimitKg, setBulkLimitKg] = useState(50);
  const [routeFinalizeHours, setRouteFinalizeHours] = useState(12);
  const [autoRetryMinutes, setAutoRetryMinutes] = useState(30);

  // Customer booking weight ranges (editable)
  const [weightRanges, setWeightRanges] = useState<AdminWeightRange[]>([]);
  const [weightRangesLoading, setWeightRangesLoading] = useState(false);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editWeightForm, setEditWeightForm] = useState({
    name: '',
    displayLabel: '',
    minKg: 0,
    maxKg: 10,
    displayOrder: 1,
  });
  const [newWeightForm, setNewWeightForm] = useState({
    name: '',
    displayLabel: '',
    minKg: 0,
    maxKg: 10,
    displayOrder: 1,
  });
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const metrics = useMemo(() => {
    const upcomingHolidaysCount = holidays.filter((h) => h.date >= today.toISOString().split('T')[0]).length;
    const totalWeeklyRuns = matrixCells.length;
    const activeRunningRuns = matrixCells.filter((c) => c.status === 'RUNNING').length;
    const unassignedCount = unassignedQueue.length;
    const totalWeeklyBookedKg = matrixCells.reduce((acc, c) => acc + c.bookedKg, 0);
    const totalWeeklyCapacityKg = matrixCells.reduce((acc, c) => acc + c.maxCapacityKg, 0);
    const avgCapacityLoad =
      totalWeeklyCapacityKg > 0 ? Math.round((totalWeeklyBookedKg / totalWeeklyCapacityKg) * 100) : 0;

    return {
      upcomingHolidaysCount,
      totalWeeklyRuns,
      activeRunningRuns,
      unassignedCount,
      avgCapacityLoad: `${avgCapacityLoad}%`,
      totalWeeklyBookedKg: `${Math.round(totalWeeklyBookedKg / 1000).toFixed(1)} T`,
    };
  }, [holidays, matrixCells, unassignedQueue]);

  // Dynamic live holidays and unassigned queue from NestJS backend
  React.useEffect(() => {
    const fetchHolidayData = async () => {
      setIsLoading(true);
      try {
        const date = today.toISOString().split('T')[0];
        const monday = new Date(today);
        const day = monday.getDay() || 7;
        monday.setDate(monday.getDate() - day + 1);
        const weekDates = Array.from({ length: 6 }, (_, index) => {
          const value = new Date(monday);
          value.setDate(monday.getDate() + index);
          return value.toISOString().split('T')[0];
        });
        const [holRes, unassignedRes, schedulesRes, runsResponses, vehiclesRes, divisionsRes, rulesRes, weightsRes] = await Promise.all([
          adminApiClient.get('/admin/holidays'),
          adminApiClient.get('/admin/pickups/unassigned'),
          adminApiClient.get('/admin/route-schedules'),
          Promise.all(weekDates.map((runDate) => adminApiClient.get(`/admin/route-runs?date=${runDate}`))),
          adminApiClient.get('/admin/vehicles'),
          adminApiClient.get('/admin/divisions'),
          adminApiClient.get('/admin/order-rules'),
          adminApiClient.get('/admin/catalog/weight-ranges'),
        ]);
        if (!holRes.success || !unassignedRes.success || !schedulesRes.success ||
            !vehiclesRes.success || !divisionsRes.success || !rulesRes.success ||
            runsResponses.some((response) => !response.success)) {
          showToast('Some calendar or route data could not be loaded.');
        }

        if (holRes.success && Array.isArray(holRes.data)) {
          setHolidays(
            holRes.data.map((h: any) => ({
              id: h._id || h.id,
              name: h.name,
              date: h.date,
              type: h.type || 'NATIONAL',
              scope: h.scope || 'ALL',
              scopeDescription: h.scopeDescription || 'All Network Divisions',
              divisionIds: h.divisionIds || [],
              vehicleIds: h.vehicleIds || [],
              handling: h.handling || 'NEXT_WORKING_DAY',
              affectedRunsCount: h.affectedRunsCount || 0,
              affectedPickupsCount: h.affectedPickupsCount || 0,
              shiftedToDate: h.shiftedToDate || h.date,
              isConfirmed: h.isConfirmed !== undefined ? h.isConfirmed : true,
            })),
          );
        }

        if (unassignedRes.success && Array.isArray(unassignedRes.data)) {
          setUnassignedQueue(
            unassignedRes.data.map((u: any) => {
              const weight = u.estimatedWeightSnapshot;
              const estKg =
                weight?.maxGrams != null
                  ? Math.round(Number(weight.maxGrams) / 1000)
                  : Number(u.totals?.netWeightKg || 0);
              return {
                id: u._id || u.id,
                pickupCode: u.pickupCode || u._id || '—',
                customerName: u.addressSnapshot?.name || u.orderMeta?.customerName || 'Customer',
                phone: u.mobile || u.orderMeta?.customerPhone || '—',
                divisionName: u.division?.name || u.divisionName || u.addressSnapshot?.pincode || '—',
                address:
                  [u.addressSnapshot?.line1, u.addressSnapshot?.line2, u.addressSnapshot?.city]
                    .filter(Boolean)
                    .join(', ') || '—',
                estimatedWeightKg: estKg,
                scrapCategories: (u.categories || []).map((item: any) =>
                  typeof item === 'string' ? item : item?.name || item?.productName || '—',
                ),
                requestedDate: u.scheduledDate || u.preferredDate || u.requestedDate || '—',
                preferredSlot: u.timeSlotSnapshot?.displayLabel || u.preferredSlot || '—',
                reason: u.unassignedReason || (u.needsAdminReview ? 'AWAITING_ADMIN_ASSIGN' : 'UNASSIGNED'),
                flaggedAt: u.updatedAt || u.createdAt || '—',
              };
            }),
          );
        }
        const weeklyRuns = runsResponses.flatMap((response) =>
          response.success && Array.isArray(response.data) ? response.data : [],
        );
        const routeData = weeklyRuns.length > 0
          ? weeklyRuns
          : schedulesRes.success && Array.isArray(schedulesRes.data) ? schedulesRes.data : [];
        setMatrixCells(routeData.map((route: any) => ({
          dayOfWeek: (route.dayOfWeek || (route.weekday
            ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][route.weekday - 1]
            : new Date(route.date || date)
            .toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase())) as WeeklyMatrixCell['dayOfWeek'],
          divisionName: route.divisionId?.name || route.division?.name || route.divisionName || '—',
          vehicleName: route.vehicleId?.name || route.vehicle?.name ||
            vehiclesRes.data?.find((v: any) => (v._id || v.id) === route.vehicleId)?.name || '—',
          vehicleReg: route.vehicleId?.registrationNumber || route.vehicle?.registrationNumber ||
            vehiclesRes.data?.find((v: any) => (v._id || v.id) === route.vehicleId)?.registrationNumber || '—',
          assignedDriver: route.employeeProfileId?.name || route.defaultEmployeeId?.name || '—',
          collectorName: route.employeeProfileId?.name || route.defaultEmployeeId?.name || '—',
          maxCapacityKg: Number(route.vehicleId?.capacityKg || route.maxCapacityKg || route.capacityKg || 0),
          bookedKg: Number(route.usedKg || 0),
          totalStops: Number(route.usedStops ?? route.stops?.length ?? 0),
          status: route.status === 'IN_PROGRESS' ? 'RUNNING' :
            route.status === 'PLANNED' || route.status === 'FINALIZED' ? 'SCHEDULED' :
            route.status || 'SCHEDULED',
          stops: (route.stops || []).map((stop: any, index: number) => ({
            stopNumber: stop.sequence || index + 1,
            pickupCode: stop.pickupId?.pickupCode || stop.pickupId?._id || stop.pickupId || '—',
            customerName: stop.customerName || stop.pickup?.orderMeta?.customerName || 'Customer',
            area: stop.area || stop.pickup?.addressSnapshot?.area || '—',
            weightKg: Number(stop.plannedMaxKg || 0),
            timeSlot: stop.timeSlot || `${route.windowStart || '—'} – ${route.windowEnd || '—'}`,
          })),
        })));
        if (vehiclesRes.success && Array.isArray(vehiclesRes.data)) {
          setVehicles(vehiclesRes.data);
          setAssignTargetVehicle(vehiclesRes.data[0]?.registrationNumber || '');
        }
        if (divisionsRes.success && Array.isArray(divisionsRes.data)) setDivisions(divisionsRes.data);
        if (rulesRes.success && rulesRes.data) {
          const rules = rulesRes.data.rules || rulesRes.data;
          setBulkLimitKg(Number(rules.bulkLimitKg || 0));
          setRouteFinalizeHours(Number(rules.routeFinalizeHoursBefore || 0));
          setAutoRetryMinutes(Number(rules.autoAssignRetryMinutes || 0));
        }
        if (weightsRes.success && Array.isArray(weightsRes.data)) {
          setWeightRanges(
            weightsRes.data.map((w: any) => ({
              id: String(w._id || w.id),
              name: w.name || '',
              displayLabel: w.displayLabel || w.name || '',
              minKg: Number(w.minGrams || 0) / 1000,
              maxKg: Number(w.maxGrams || 0) / 1000,
              displayOrder: Number(w.displayOrder || 0),
              isActive: w.isActive !== false,
            })),
          );
        }
      } catch (err) {
        console.error('Failed to fetch holiday data:', err);
        showToast('Failed to load calendar and route planning data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHolidayData();
  }, []);

  // Trigger Simulation
  const handleSimulateImpact = async (values?: Partial<OperationsHoliday>) => {
    const date = values?.date || formDate;
    const name = values?.name || formName;
    const type = values?.type || formType;
    const scope = values?.scope || formScope;
    const handling = values?.handling || formHandling;
    const divisionIds = values?.divisionIds || divisions.map((item) => item._id || item.id);
    const vehicleIds = values?.vehicleIds || vehicles.map((item) => item._id || item.id);
    const res = await adminApiClient.post('/admin/holidays/preview', {
      name, date, type, scope, handling,
      ...(scope === 'DIVISIONS' ? { divisionIds } : {}),
      ...(scope === 'VEHICLES' ? { vehicleIds } : {}),
    });
    if (res.success && res.data) {
      setFormDate(date);
      setFormName(name);
      setFormType(type);
      setFormScope(scope);
      setFormHandling(handling);
      setSimulationData({
        affectedRunsCount: Number(res.data.affectedRunsCount || 0),
        affectedPickupsCount: Number(res.data.affectedPickupsCount || 0),
        shiftsToDate: res.data.shiftsToDate || date,
        sampleNotificationText: res.data.sampleNotificationText ||
          `Your pickup scheduled for ${date} will move to ${res.data.shiftsToDate || date} due to ${name || 'an operations holiday'}.`,
      });
      setIsSimulationModalOpen(true);
    } else showToast(res.error || 'Unable to preview holiday impact.');
  };

  // Confirm Holiday and Propagate Reschedule to MongoDB
  const handleConfirmHoliday = async () => {
    if (!simulationData) return;

    const newHoliday: OperationsHoliday = {
      id: `hol_${Date.now()}`,
      name: formName,
      date: formDate,
      type: formType,
      scope: formScope,
      scopeDescription: formScope === 'ALL' ? 'All Network Divisions' : 'Specified Divisions / Fleet',
      handling: formHandling,
      affectedRunsCount: simulationData.affectedRunsCount,
      affectedPickupsCount: simulationData.affectedPickupsCount,
      shiftedToDate: simulationData.shiftsToDate,
      isConfirmed: true,
    };

    try {
      const res = await adminApiClient.post('/admin/holidays', {
        name: newHoliday.name,
        date: newHoliday.date,
        type: newHoliday.type,
        scope: newHoliday.scope,
        handling: newHoliday.handling,
        ...(newHoliday.scope === 'DIVISIONS' ? { divisionIds: divisions.map((item) => item._id || item.id) } : {}),
        ...(newHoliday.scope === 'VEHICLES' ? { vehicleIds: vehicles.map((item) => item._id || item.id) } : {}),
      });

      if (res.success && res.data) {
        const payload = res.data.holiday || res.data;
        const saved = {
          ...newHoliday,
          ...payload,
          id: payload._id || payload.id,
          affectedRunsCount: Number(res.data.affectedRuns ?? newHoliday.affectedRunsCount),
          affectedPickupsCount: Number(res.data.affectedPickups ?? newHoliday.affectedPickupsCount),
        };
        setHolidays((prev) => [...prev, saved].sort((a, b) => a.date.localeCompare(b.date)));
        setIsSimulationModalOpen(false);
        setIsHolidayModalOpen(false);
        showToast(`Holiday "${formName}" saved.`);
      } else {
        showToast(res.error || 'Failed to save holiday.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save holiday.');
    }
  };

  // One-click Assign Unassigned Bulk Pickup
  const handleAssignBulkPickup = async () => {
    if (!selectedUnassignedItem) return;
    const vehicle = vehicles.find((item) => item.registrationNumber === assignTargetVehicle);
    const res = await adminApiClient.post(`/admin/pickups/${selectedUnassignedItem.id}/assign`, {
      employeeProfileId: vehicle?.defaultEmployeeId?._id || vehicle?.defaultEmployeeId ||
        vehicle?.defaultDriver?._id || vehicle?.defaultDriver?.id,
      vehicleType: vehicle?.vehicleType,
      vehicleNumber: vehicle?.registrationNumber,
    });
    if (res.success) {
      setUnassignedQueue((prev) => prev.filter((item) => item.id !== selectedUnassignedItem.id));
      setIsAssignModalOpen(false);
      showToast(`Assigned ${selectedUnassignedItem.pickupCode} to ${assignTargetVehicle}.`);
      setSelectedUnassignedItem(null);
    } else showToast(res.error || 'Failed to assign pickup.');
  };

  const handleDeleteHoliday = async (id: string) => {
    const res = await adminApiClient.delete(`/admin/holidays/${id}`);
    if (res.success) setHolidays((current) => current.filter((holiday) => holiday.id !== id));
    else showToast(res.error || 'Failed to delete holiday.');
  };

  const handleSaveOrderRules = async () => {
    const res = await adminApiClient.put('/admin/order-rules', {
      bulkLimitKg,
      routeFinalizeHoursBefore: routeFinalizeHours,
      autoAssignRetryMinutes: autoRetryMinutes,
    });
    showToast(res.success ? 'Routing parameters saved successfully.' : res.error || 'Failed to save routing parameters.');
  };

  /** Assign bulk option: any range with minKg >= this range's min becomes bulk. */
  const handleSetBulkFromRange = async (range: AdminWeightRange) => {
    const nextLimit = Math.max(0, Number(range.minKg) || 0);
    setBulkLimitKg(nextLimit);
    const res = await adminApiClient.put('/admin/order-rules', {
      bulkLimitKg: nextLimit,
      routeFinalizeHoursBefore: routeFinalizeHours,
      autoAssignRetryMinutes: autoRetryMinutes,
    });
    showToast(
      res.success
        ? `Bulk minimum set to ${nextLimit} kg — “${range.displayLabel}” and above are bulk.`
        : res.error || 'Failed to update bulk minimum.',
    );
  };

  const loadWeightRanges = async () => {
    setWeightRangesLoading(true);
    try {
      const res = await adminApiClient.get('/admin/catalog/weight-ranges');
      if (res.success && Array.isArray(res.data)) {
        setWeightRanges(
          res.data.map((w: any) => ({
            id: String(w._id || w.id),
            name: w.name || '',
            displayLabel: w.displayLabel || w.name || '',
            minKg: Number(w.minGrams || 0) / 1000,
            maxKg: Number(w.maxGrams || 0) / 1000,
            displayOrder: Number(w.displayOrder || 0),
            isActive: w.isActive !== false,
          })),
        );
      } else {
        showToast(res.error || 'Unable to load weight ranges.');
      }
    } finally {
      setWeightRangesLoading(false);
    }
  };

  const startEditWeight = (range: AdminWeightRange) => {
    setEditingWeightId(range.id);
    setEditWeightForm({
      name: range.name,
      displayLabel: range.displayLabel,
      minKg: range.minKg,
      maxKg: range.maxKg,
      displayOrder: range.displayOrder,
    });
  };

  const handleSaveWeightEdit = async () => {
    if (!editingWeightId) return;
    if (editWeightForm.maxKg <= editWeightForm.minKg) {
      showToast('Max kg must be greater than min kg.');
      return;
    }
    setIsSavingWeight(true);
    try {
      const res = await adminApiClient.patch(`/admin/catalog/weight-ranges/${editingWeightId}`, {
        name: editWeightForm.name.trim().toUpperCase().replace(/\s+/g, '_'),
        displayLabel: editWeightForm.displayLabel.trim(),
        minGrams: Math.round(editWeightForm.minKg * 1000),
        maxGrams: Math.round(editWeightForm.maxKg * 1000),
        displayOrder: editWeightForm.displayOrder,
      });
      if (res.success) {
        setEditingWeightId(null);
        await loadWeightRanges();
        showToast('Weight range updated.');
      } else {
        showToast(res.error || 'Failed to update weight range.');
      }
    } finally {
      setIsSavingWeight(false);
    }
  };

  const handleCreateWeightRange = async () => {
    if (!newWeightForm.displayLabel.trim() || !newWeightForm.name.trim()) {
      showToast('Name and display label are required.');
      return;
    }
    if (newWeightForm.maxKg <= newWeightForm.minKg) {
      showToast('Max kg must be greater than min kg.');
      return;
    }
    setIsSavingWeight(true);
    try {
      const res = await adminApiClient.post('/admin/catalog/weight-ranges', {
        name: newWeightForm.name.trim().toUpperCase().replace(/\s+/g, '_'),
        displayLabel: newWeightForm.displayLabel.trim(),
        minGrams: Math.round(newWeightForm.minKg * 1000),
        maxGrams: Math.round(newWeightForm.maxKg * 1000),
        displayOrder: newWeightForm.displayOrder || weightRanges.length + 1,
      });
      if (res.success) {
        setNewWeightForm({
          name: '',
          displayLabel: '',
          minKg: 0,
          maxKg: 10,
          displayOrder: weightRanges.length + 2,
        });
        await loadWeightRanges();
        showToast('Weight range added. Customer app will show it on next refresh.');
      } else {
        showToast(res.error || 'Failed to create weight range.');
      }
    } finally {
      setIsSavingWeight(false);
    }
  };

  const handleToggleWeightActive = async (range: AdminWeightRange) => {
    const res = await adminApiClient.patch(`/admin/catalog/weight-ranges/${range.id}`, {
      isActive: !range.isActive,
    });
    if (res.success) {
      await loadWeightRanges();
      showToast(range.isActive ? 'Weight range deactivated.' : 'Weight range activated.');
    } else {
      showToast(res.error || 'Failed to update weight range status.');
    }
  };

  const handleDeleteWeightRange = async (range: AdminWeightRange) => {
    const res = await adminApiClient.delete(`/admin/catalog/weight-ranges/${range.id}`);
    if (res.success) {
      await loadWeightRanges();
      showToast('Weight range deactivated (soft delete).');
    } else {
      showToast(res.error || 'Failed to delete weight range.');
    }
  };

  const calendarYear = today.getFullYear();
  const calendarMonth = today.getMonth();
  const daysInOctober = Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const holidayMatch = holidays.find((h) => h.date === dateStr);
    const isToday = dateStr === today.toISOString().split('T')[0];
    return {
      dayNum,
      dateStr,
      holidayMatch,
      isToday,
    };
  });

  return (
    <div className="space-y-6">
      {isLoading && <div className="text-xs font-semibold text-slate-500">Loading calendar and route data…</div>}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title & Top Command Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#0A3D2B]">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Operations Holiday Calendar & Route Planning
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Phase 5 • Smart Scheduling
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated Holiday Shift Engine, Weekly Route Run Master Matrix & Bulk Commercial Auto-Assign Desk
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setFormDate(today.toISOString().split('T')[0]);
              setFormName('');
              setIsHolidayModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A3D2B] text-white text-xs font-bold hover:bg-[#0E4D36] transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            + Add Operations Holiday
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming Holidays</span>
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900">{metrics.upcomingHolidaysCount} Days</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Rules configured</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Route Runs</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black text-blue-700">{metrics.activeRunningRuns} Live</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Out of {metrics.totalWeeklyRuns} planned runs</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fleet Capacity Load</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700">{metrics.avgCapacityLoad}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Weekly volume: {metrics.totalWeeklyBookedKg}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unassigned Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-600">{metrics.unassignedCount} Orders</div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">Requires vehicle assign</div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-left hover:border-amber-400 hover:shadow-md transition-all cursor-pointer w-full"
          title="Open Settings to edit weight ranges & bulk limit"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bulk Weight Limit</span>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-black text-purple-700">{bulkLimitKg} kg</div>
          <div className="text-[10px] text-amber-700 mt-0.5 font-bold">Open Settings → edit weight ranges</div>
        </button>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lock-in Window</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-lg font-black text-slate-900">{routeFinalizeHours} hrs</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Before route start</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs — Settings pinned on the right so it never scrolls away */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
          <button
            onClick={() => setActiveTab('CALENDAR')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'CALENDAR'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Holiday Calendar
            <span className="text-[10px] opacity-80">({holidays.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'MATRIX'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Route Matrix
          </button>

          <button
            onClick={() => setActiveTab('UNASSIGNED_QUEUE')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'UNASSIGNED_QUEUE'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Unassigned Queue
            <span className="text-[10px] opacity-80">({unassignedQueue.length})</span>
          </button>
        </div>

        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border ${
            activeTab === 'SETTINGS'
              ? 'bg-[#0A3D2B] text-white border-[#0A3D2B] shadow-sm'
              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
          }`}
          title="Weight ranges, bulk limits & routing rules"
        >
          <Sliders className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      {/* TAB 1: OPERATIONS HOLIDAY CALENDAR */}
      {activeTab === 'CALENDAR' && (
        <div className="space-y-6">
          {/* Calendar Header */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-900 text-base">{currentMonth}</span>
              <span className="text-xs text-slate-500 font-semibold">• Andhra Pradesh Scrap Operations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> National Holiday
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span> State / Regional
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ml-2"></span> Municipal Diversion
              </span>
              <button
                onClick={() => {
                  setFormDate(today.toISOString().split('T')[0]);
                  setFormName('');
                  setIsHolidayModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Define Holiday
              </button>
            </div>
          </div>

          {/* 7-Col Month Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2 mt-3">
              {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, index) => (
                <div key={`empty-${index}`} className="h-28 rounded-xl bg-slate-50/40 border border-slate-100/60 p-2" />
              ))}

              {daysInOctober.map((day) => {
                const hasHoliday = !!day.holidayMatch;
                return (
                  <div
                    key={day.dayNum}
                    onClick={() => {
                      if (day.holidayMatch) {
                        setFormDate(day.holidayMatch.date);
                        setFormName(day.holidayMatch.name);
                        setFormType(day.holidayMatch.type);
                        setFormScope(day.holidayMatch.scope);
                        setFormHandling(day.holidayMatch.handling);
                        handleSimulateImpact(day.holidayMatch);
                      } else {
                        setFormDate(day.dateStr);
                        setFormName('');
                        setIsHolidayModalOpen(true);
                      }
                    }}
                    className={`h-28 rounded-xl border p-2 flex flex-col justify-between transition-all cursor-pointer ${
                      day.isToday
                        ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                        : hasHoliday
                        ? 'border-rose-200 bg-rose-50/40 hover:border-rose-400'
                        : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black ${
                          day.isToday
                            ? 'text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-full'
                            : 'text-slate-700'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                      {day.isToday && (
                        <span className="text-[9px] font-extrabold text-emerald-700 uppercase">Today</span>
                      )}
                    </div>

                    {hasHoliday && day.holidayMatch && (
                      <div className="space-y-1">
                        <div
                          className={`p-1.5 rounded-lg text-[10px] font-bold leading-tight ${
                            day.holidayMatch.type === 'NATIONAL'
                              ? 'bg-rose-100 text-rose-900 border border-rose-200'
                              : day.holidayMatch.type === 'STATE_REGIONAL'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}
                        >
                          <div className="truncate">{day.holidayMatch.name}</div>
                          <div className="text-[8px] font-semibold opacity-80 mt-0.5">
                            Shifts to {day.holidayMatch.shiftedToDate}
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasHoliday && (
                      <div className="text-[10px] text-slate-300 opacity-0 hover:opacity-100 flex items-center justify-center gap-1">
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configured Holidays List Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Configured Operations Holiday Master List</h3>
              <span className="text-xs text-slate-400">Total {holidays.length} rules</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Holiday</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Operational Scope</th>
                    <th className="py-3 px-4">Reschedule Rule</th>
                    <th className="py-3 px-4 text-center">Affected Runs</th>
                    <th className="py-3 px-4 text-center">Affected Pickups</th>
                    <th className="py-3 px-4 text-center">Target Date</th>
                    <th className="py-3 px-4 text-center">Simulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{h.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">{h.date}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            h.type === 'NATIONAL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : h.type === 'STATE_REGIONAL'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {h.type}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{h.scopeDescription}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Scope: {h.scope}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-emerald-800 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {h.handling === 'NEXT_WORKING_DAY' ? 'Next Working Day' : 'Next Week Same Day'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {h.affectedRunsCount} runs
                      </td>

                      <td className="py-3 px-4 text-center font-black text-rose-700">
                        {h.affectedPickupsCount} stops
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900">
                        {h.shiftedToDate}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setFormDate(h.date);
                            setFormName(h.name);
                            setFormType(h.type);
                            setFormScope(h.scope);
                            setFormHandling(h.handling);
                            handleSimulateImpact(h);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0A3D2B] hover:text-white font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Simulate
                        </button>
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="ml-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-700 hover:text-white font-bold text-[11px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY ROUTE RUN MASTER MATRIX */}
      {activeTab === 'MATRIX' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Weekly Route Run Master Matrix</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vehicles × Weekdays operational grid with capacity saturation, crew rosters, and stop sequencing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Capacity Bars:</span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                &lt;80% Normal
              </span>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                80-95% High
              </span>
              <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
                &gt;95% Saturation
              </span>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matrixCells.map((cell, idx) => {
              const capacityPct = Math.round((cell.bookedKg / cell.maxCapacityKg) * 100);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-black text-[10px]">
                        {cell.dayOfWeek}
                      </span>
                      <span className="font-bold text-slate-900 text-xs">{cell.vehicleReg}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        cell.status === 'RUNNING'
                          ? 'bg-blue-100 text-blue-800'
                          : cell.status === 'SCHEDULED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {cell.status}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-slate-800 text-xs truncate">{cell.divisionName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{cell.assignedDriver}</span>
                      <span className="text-slate-300">•</span>
                      <span>{cell.totalStops} stops</span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold">Load Capacity:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {cell.bookedKg} / {cell.maxCapacityKg} kg ({capacityPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          capacityPct > 95
                            ? 'bg-rose-500'
                            : capacityPct > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, capacityPct)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">{cell.vehicleName}</span>
                    <button
                      onClick={() => setInspectingRouteCell(cell)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0A3D2B] hover:text-white font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Inspect Stops ({cell.stops.length})</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BULK AUTO-ASSIGN & EXCEPTION QUEUE */}
      {activeTab === 'UNASSIGNED_QUEUE' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Pending Customer Pickups (Manual Assign)</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer-booked slots awaiting admin accept + employee assignment. Prefer{' '}
                <a href="/dispatch" className="text-emerald-700 font-bold underline">
                  Pickup Dispatch
                </a>{' '}
                for full assign UI.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {unassignedQueue.length} Pending
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Pickup Code & Customer</th>
                    <th className="py-3 px-4">Location & Address</th>
                    <th className="py-3 px-4 text-right">Est. Weight (kg)</th>
                    <th className="py-3 px-4">Material Types</th>
                    <th className="py-3 px-4">Requested Slot</th>
                    <th className="py-3 px-4">Exception Reason</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unassignedQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <div>No pending exceptions! All customer pickups successfully assigned to route vehicles.</div>
                      </td>
                    </tr>
                  ) : (
                    unassignedQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{item.customerName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-semibold text-emerald-800">{item.pickupCode}</span>
                            <span>•</span>
                            <span>{item.phone}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{item.divisionName}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.address}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {item.estimatedWeightKg} kg
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {item.scrapCategories.map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-700">{item.requestedDate}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{item.preferredSlot}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            {item.reason.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedUnassignedItem(item);
                              setIsAssignModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#0A3D2B] text-white hover:bg-[#0E4D36] font-bold text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5 mx-auto"
                          >
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            Assign Vehicle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ROUTE RULES + WEIGHT RANGES CONFIG */}
      {activeTab === 'SETTINGS' && (
        <div className="max-w-4xl space-y-5">
          {/* Section A: Customer booking weight ranges */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-bold text-slate-900 text-sm">Customer Estimated Weight Ranges</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  These options appear on Customer App → Request Pickup → Step 2 (estimated weight).
                  Edit labels and kg bounds here; changes apply after customers refresh the app.
                </p>
              </div>
              <button
                type="button"
                onClick={loadWeightRanges}
                disabled={weightRangesLoading}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${weightRangesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Display Label</th>
                    <th className="py-2.5 px-3">Min kg</th>
                    <th className="py-2.5 px-3">Max kg</th>
                    <th className="py-2.5 px-3">Bulk</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weightRanges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 px-3 text-center text-slate-400 font-semibold">
                        {weightRangesLoading
                          ? 'Loading weight ranges…'
                          : 'No weight ranges found. Add one below or restart backend to auto-seed.'}
                      </td>
                    </tr>
                  ) : (
                    weightRanges.map((range) => {
                      const isEditing = editingWeightId === range.id;
                      const isBulkRange = range.minKg >= bulkLimitKg;
                      return (
                        <tr key={range.id} className={!range.isActive ? 'bg-slate-50/80 opacity-70' : ''}>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editWeightForm.displayOrder}
                                onChange={(e) =>
                                  setEditWeightForm((f) => ({ ...f, displayOrder: Number(e.target.value) || 0 }))
                                }
                                className="w-16 px-2 py-1 rounded-lg border border-slate-200 font-mono"
                              />
                            ) : (
                              <span className="font-mono font-bold text-slate-700">{range.displayOrder}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                value={editWeightForm.name}
                                onChange={(e) => setEditWeightForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-28 px-2 py-1 rounded-lg border border-slate-200 font-mono uppercase"
                              />
                            ) : (
                              <span className="font-mono text-slate-800">{range.name}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                value={editWeightForm.displayLabel}
                                onChange={(e) =>
                                  setEditWeightForm((f) => ({ ...f, displayLabel: e.target.value }))
                                }
                                className="w-36 px-2 py-1 rounded-lg border border-slate-200 font-bold"
                              />
                            ) : (
                              <span className="font-bold text-slate-900">{range.displayLabel}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={editWeightForm.minKg}
                                onChange={(e) =>
                                  setEditWeightForm((f) => ({ ...f, minKg: Number(e.target.value) || 0 }))
                                }
                                className="w-20 px-2 py-1 rounded-lg border border-slate-200 font-mono"
                              />
                            ) : (
                              <span className="font-mono">{range.minKg}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isEditing ? (
                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={editWeightForm.maxKg}
                                onChange={(e) =>
                                  setEditWeightForm((f) => ({ ...f, maxKg: Number(e.target.value) || 0 }))
                                }
                                className="w-20 px-2 py-1 rounded-lg border border-slate-200 font-mono"
                              />
                            ) : (
                              <span className="font-mono">{range.maxKg}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {isBulkRange ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                Bulk+
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetBulkFromRange(range)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 cursor-pointer"
                                title={`Set bulk minimum to ${range.minKg} kg (this range and above)`}
                              >
                                Set as bulk min
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleWeightActive(range)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border cursor-pointer ${
                                range.isActive
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {range.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isSavingWeight}
                                    onClick={handleSaveWeightEdit}
                                    className="p-1.5 rounded-lg bg-[#0A3D2B] text-white hover:bg-[#0E4D36] cursor-pointer"
                                    title="Save"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingWeightId(null)}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditWeight(range)}
                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                                    title="Edit"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteWeightRange(range)}
                                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    title="Deactivate"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Add new weight range */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Weight Range
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <input
                  placeholder="Code (e.g. SMALL)"
                  value={newWeightForm.name}
                  onChange={(e) => setNewWeightForm((f) => ({ ...f, name: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
                />
                <input
                  placeholder="Label (e.g. 10 – 20 kg)"
                  value={newWeightForm.displayLabel}
                  onChange={(e) => setNewWeightForm((f) => ({ ...f, displayLabel: e.target.value }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Min kg"
                  value={newWeightForm.minKg}
                  onChange={(e) => setNewWeightForm((f) => ({ ...f, minKg: Number(e.target.value) || 0 }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Max kg"
                  value={newWeightForm.maxKg}
                  onChange={(e) => setNewWeightForm((f) => ({ ...f, maxKg: Number(e.target.value) || 0 }))}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Order"
                  value={newWeightForm.displayOrder}
                  onChange={(e) =>
                    setNewWeightForm((f) => ({ ...f, displayOrder: Number(e.target.value) || 0 }))
                  }
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isSavingWeight}
                  onClick={handleCreateWeightRange}
                  className="px-4 py-2 rounded-xl bg-[#0A3D2B] text-white text-xs font-bold hover:bg-[#0E4D36] cursor-pointer disabled:opacity-60"
                >
                  Add Weight Range
                </button>
              </div>
            </div>
          </div>

          {/* Section B: Order / routing rules */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Order Rules & Bulk Commercial Limits</h3>
            <p className="text-xs text-slate-500">
              Configure parameters controlling when orders bypass normal 3-wheeler auto-routing and trigger heavy trucks.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Bulk Order Weight Threshold (kg)</span>
                  <span className="font-mono text-emerald-700">{bulkLimitKg} kg</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="5"
                  value={bulkLimitKg}
                  onChange={(e) => setBulkLimitKg(parseInt(e.target.value))}
                  className="w-full accent-[#0A3D2B] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  Any weight range whose minimum is ≥ this value is marked Bulk on the customer app
                  and routed to the heavy-vehicle queue. Tip: use “Set as bulk min” on a range above.
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Route Finalization Window (Hours Before Shift)</span>
                  <span className="font-mono text-emerald-700">{routeFinalizeHours} Hours</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="2"
                  value={routeFinalizeHours}
                  onChange={(e) => setRouteFinalizeHours(parseInt(e.target.value))}
                  className="w-full accent-[#0A3D2B] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  Hours prior to 8:00 AM shift start when stops are locked and sequence notifications fire.
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Auto-Assign Retry Interval (Minutes)</span>
                  <span className="font-mono text-emerald-700">{autoRetryMinutes} Minutes</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="10"
                  value={autoRetryMinutes}
                  onChange={(e) => setAutoRetryMinutes(parseInt(e.target.value))}
                  className="w-full accent-[#0A3D2B] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">
                  Background cron re-evaluates unassigned queue against newly freed vehicle capacity.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleSaveOrderRules}
                className="px-5 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md"
              >
                Save Routing Parameters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: DEFINE OPERATIONS HOLIDAY MODAL --- */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-[#0A3D2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">Define Operations Holiday</h3>
              </div>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Holiday Date *</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Holiday Category</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                  >
                    <option value="NATIONAL">National Holiday</option>
                    <option value="STATE_REGIONAL">State / AP Regional Festival</option>
                    <option value="MUNICIPAL_LOCAL">Municipal Road Closure / Diversion</option>
                    <option value="YARD_MAINTENANCE">Yard Maintenance Day</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Holiday Name / Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Sankranti Festival / Kanaka Durga Utsavam"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Scope Selection */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Operational Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ALL', 'DIVISIONS', 'VEHICLES'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setFormScope(sc)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                        formScope === sc
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {sc === 'ALL' ? 'Entire Network' : sc === 'DIVISIONS' ? 'Specific Yard' : 'Specific Vehicles'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reschedule Handling Rule */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                  Pickups Rescheduling Shift Rule
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormHandling('NEXT_WORKING_DAY')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formHandling === 'NEXT_WORKING_DAY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-bold text-xs">Next Working Day</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Shift all runs to tomorrow (+1 day)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormHandling('NEXT_WEEK_SAME_DAY')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      formHandling === 'NEXT_WEEK_SAME_DAY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="font-bold text-xs">Next Week Same Day</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Shift runs to next week (+7 days)</div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSimulateImpact()}
                className="px-5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Simulate Holiday Impact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: HOLIDAY IMPACT SIMULATION & CONFIRMATION --- */}
      {isSimulationModalOpen && simulationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 space-y-0">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-black text-sm">Holiday Impact Simulation</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{formName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSimulationModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Closure Date</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">{formDate}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-500 uppercase block">Affected Pickups</span>
                  <span className="font-black text-rose-700 text-base mt-0.5 block">
                    {simulationData.affectedPickupsCount} Stops
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Shifted To</span>
                  <span className="font-black text-emerald-800 text-xs mt-0.5 block">
                    {simulationData.shiftsToDate}
                  </span>
                </div>
              </div>

              {/* Customer WhatsApp Notification Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    Automated Customer WhatsApp / SMS Broadcast Queue
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                    Ready to Dispatch
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 font-sans text-slate-700 text-[11px] leading-relaxed italic">
                  &ldquo;{simulationData.sampleNotificationText}&rdquo;
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Confirming will automatically reschedule {simulationData.affectedRunsCount} route runs to{' '}
                  {simulationData.shiftsToDate} and update customer apps in real-time.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsSimulationModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                onClick={handleConfirmHoliday}
                className="px-5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                Confirm & Propagate Reschedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: ONE-CLICK BULK VEHICLE ASSIGNMENT --- */}
      {isAssignModalOpen && selectedUnassignedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-[#0A3D2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm">Assign Heavy Capacity Vehicle</h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{selectedUnassignedItem.customerName}</span>
                  <span className="font-mono text-emerald-800">{selectedUnassignedItem.estimatedWeightKg} kg</span>
                </div>
                <div className="text-[11px] text-slate-500">{selectedUnassignedItem.address}</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Requested: {selectedUnassignedItem.requestedDate} ({selectedUnassignedItem.preferredSlot})
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                  Select Heavy Commercial Vehicle
                </label>
                <div className="space-y-2">
                  {vehicles.map((vehicle) => ({
                    reg: vehicle.registrationNumber,
                    name: vehicle.name || vehicle.vehicleType || '—',
                    driver: vehicle.defaultDriver?.name || '—',
                    avail: `${Number(vehicle.capacityKg || 0).toLocaleString('en-IN')} kg capacity`,
                  })).map((v) => (
                    <button
                      key={v.reg}
                      type="button"
                      onClick={() => setAssignTargetVehicle(v.reg)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        assignTargetVehicle === v.reg
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between font-bold text-slate-900 text-xs">
                        <span>{v.reg}</span>
                        <span className="text-emerald-700 font-semibold text-[11px]">{v.avail}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {v.name} • Driver: {v.driver}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignBulkPickup}
                className="px-5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: INSPECT ROUTE STOPS SEQUENCE --- */}
      {inspectingRouteCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm">
                  {inspectingRouteCell.vehicleReg} • {inspectingRouteCell.dayOfWeek} Route Sequence
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{inspectingRouteCell.divisionName}</p>
              </div>
              <button
                onClick={() => setInspectingRouteCell(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5 text-xs">
              {inspectingRouteCell.stops.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No doorstep stops currently assigned for this route run.
                </div>
              ) : (
                inspectingRouteCell.stops.map((stop) => (
                  <div
                    key={stop.stopNumber}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0A3D2B] text-white font-black text-xs flex items-center justify-center shrink-0">
                        {stop.stopNumber}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{stop.customerName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-emerald-800 font-semibold">{stop.pickupCode}</span>
                          <span>•</span>
                          <span>{stop.area}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-slate-900">{stop.weightKg} kg</span>
                      <div className="text-[9px] text-slate-400">{stop.timeSlot}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectingRouteCell(null)}
                className="px-4 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
