"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  User,
  Users,
  X,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';
import { useAdminNav } from '../../context/AdminNavContext';

interface PendingOrder {
  id: string;
  pickupCode: string;
  customerName: string;
  phone: string;
  address: string;
  pincode: string;
  scheduledDate: string;
  preferredSlot: string;
  weightLabel: string;
  categories: string[];
  remarks: string;
}

interface DriverCard {
  id: string;
  name: string;
  code: string;
  busyCount: number;
  available: boolean;
}

interface VehicleOption {
  id: string;
  name: string;
  registrationNumber: string;
  vehicleType: string;
}

interface TimeSlotOption {
  id: string;
  label: string;
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function mapOrder(u: any): PendingOrder {
  const weight = u.estimatedWeightSnapshot;
  const weightLabel =
    weight?.displayLabel ||
    weight?.name ||
    (weight?.minGrams != null
      ? `${(weight.minGrams || 0) / 1000}–${(weight.maxGrams || 0) / 1000} kg`
      : '—');
  return {
    id: String(u._id || u.id),
    pickupCode: u.pickupCode || '—',
    customerName: u.customerName || u.addressSnapshot?.name || 'Customer',
    phone: u.customerPhone || u.mobile || '—',
    address:
      [u.addressSnapshot?.line1, u.addressSnapshot?.line2, u.addressSnapshot?.city]
        .filter(Boolean)
        .join(', ') || '—',
    pincode: u.addressSnapshot?.pincode || '—',
    scheduledDate: u.scheduledDate || '—',
    preferredSlot: u.timeSlotSnapshot?.displayLabel || '—',
    weightLabel,
    categories: Array.isArray(u.categories)
      ? u.categories.map((c: any) => (typeof c === 'string' ? c : c?.name || '—'))
      : [],
    remarks: u.preparation?.remarks || '',
  };
}

export const DispatchPickupScreen: React.FC = () => {
  const { setUnassignedBulkCount } = useAdminNav();

  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [slots, setSlots] = useState<TimeSlotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  const [rescheduleOrder, setRescheduleOrder] = useState<PendingOrder | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(tomorrowIso());
  const [rescheduleSlotId, setRescheduleSlotId] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('No pickup employee available for this slot');

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueRes, empRes, vehRes, slotRes, activeRes] = await Promise.all([
        adminApiClient.get('/admin/pickups/unassigned'),
        adminApiClient.get('/admin/employees?status=APPROVED'),
        adminApiClient.get('/admin/vehicles'),
        adminApiClient.get('/catalog/slots'),
        adminApiClient.get('/admin/pickups?status=ASSIGNED'),
      ]);

      const mappedOrders =
        queueRes.success && Array.isArray(queueRes.data) ? queueRes.data.map(mapOrder) : [];
      setOrders(mappedOrders);
      setUnassignedBulkCount(mappedOrders.length);

      const activePickups =
        activeRes.success && Array.isArray(activeRes.data) ? activeRes.data : [];
      const busyByEmployee = new Map<string, number>();
      for (const p of activePickups) {
        const eid = String(p.assignment?.employeeProfileId || '');
        if (!eid) continue;
        busyByEmployee.set(eid, (busyByEmployee.get(eid) || 0) + 1);
      }

      // Also count ON_THE_WAY / ARRIVED if returned in other calls — fetch those lightly
      const onWayRes = await adminApiClient.get('/admin/pickups?status=ON_THE_WAY');
      if (onWayRes.success && Array.isArray(onWayRes.data)) {
        for (const p of onWayRes.data) {
          const eid = String(p.assignment?.employeeProfileId || '');
          if (!eid) continue;
          busyByEmployee.set(eid, (busyByEmployee.get(eid) || 0) + 1);
        }
      }

      if (empRes.success && Array.isArray(empRes.data)) {
        setDrivers(
          empRes.data.map((e: any) => {
            const id = String(e._id || e.id);
            const busyCount = busyByEmployee.get(id) || 0;
            return {
              id,
              name: e.fullName || e.name || '—',
              code: e.employeeCode || '—',
              busyCount,
              available: busyCount === 0,
            };
          }),
        );
      } else {
        setDrivers([]);
      }

      if (vehRes.success && Array.isArray(vehRes.data)) {
        const list = vehRes.data.map((v: any) => ({
          id: String(v._id || v.id),
          name: v.name || v.vehicleType || 'Vehicle',
          registrationNumber: v.registrationNumber || '—',
          vehicleType: v.vehicleType || 'THREE_WHEELER',
        }));
        setVehicles(list);
        setSelectedVehicleId((prev) => prev || list[0]?.id || '');
      }

      if (slotRes.success && Array.isArray(slotRes.data)) {
        const list = slotRes.data.map((s: any) => ({
          id: String(s._id || s.id),
          label: s.displayLabel || `${s.startTime} – ${s.endTime}`,
        }));
        setSlots(list);
        setRescheduleSlotId((prev) => prev || list[0]?.id || '');
      }
    } finally {
      setLoading(false);
    }
  }, [setUnassignedBulkCount]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );
  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId) || null,
    [drivers, selectedDriverId],
  );
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId],
  );

  const availableDrivers = drivers.filter((d) => d.available);
  const busyDrivers = drivers.filter((d) => !d.available);

  const handleAssign = async () => {
    if (!selectedOrder) {
      showToast('Select a customer order on the left.');
      return;
    }
    if (!selectedDriver) {
      showToast('Select an available employee on the right.');
      return;
    }
    if (!selectedVehicle) {
      showToast('Pick a vehicle below, then assign.');
      return;
    }

    setBusy(true);
    try {
      const res = await adminApiClient.post(`/admin/pickups/${selectedOrder.id}/assign`, {
        employeeProfileId: selectedDriver.id,
        vehicleType: selectedVehicle.vehicleType,
        vehicleNumber: selectedVehicle.registrationNumber,
      });
      if (res.success) {
        showToast(
          `Assigned ${selectedOrder.pickupCode} → ${selectedDriver.name}. They will see it in My Pickups.`,
        );
        setSelectedOrderId(null);
        setSelectedDriverId(null);
        await load();
      } else {
        showToast(typeof res.error === 'string' ? res.error : 'Assign failed.');
      }
    } catch (e: any) {
      showToast(e?.message || 'Assign failed.');
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = (order: PendingOrder) => {
    setRescheduleOrder(order);
    setRescheduleDate(order.scheduledDate !== '—' ? order.scheduledDate : tomorrowIso());
    setRescheduleSlotId(slots[0]?.id || '');
    setRescheduleReason('No pickup employee available for this slot');
  };

  const handleReschedule = async () => {
    if (!rescheduleOrder) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rescheduleDate)) {
      showToast('Choose a valid date.');
      return;
    }
    setBusy(true);
    try {
      const res = await adminApiClient.patch(`/admin/pickups/${rescheduleOrder.id}/reschedule`, {
        scheduledDate: rescheduleDate,
        timeSlotId: rescheduleSlotId || undefined,
        reason: rescheduleReason || 'Rescheduled by admin',
      });
      if (res.success) {
        showToast(`Rescheduled ${rescheduleOrder.pickupCode} to ${rescheduleDate}.`);
        setRescheduleOrder(null);
        if (selectedOrderId === rescheduleOrder.id) setSelectedOrderId(null);
        await load();
      } else {
        showToast(typeof res.error === 'string' ? res.error : 'Reschedule failed.');
      }
    } catch (e: any) {
      showToast(e?.message || 'Reschedule failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {toast && (
        <div className="fixed top-4 right-4 z-[70] max-w-sm px-4 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl">
          {toast}
        </div>
      )}

      {/* Simple header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-700" />
            Assign pickups
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            1) Choose a customer order → 2) Choose an available employee → 3) Assign. If nobody is free,
            reschedule the order.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* How it works strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs">
          <span className="font-black text-emerald-900">Left — Customer orders</span>
          <p className="text-emerald-800/80 mt-0.5">Requests the customer placed with date & slot.</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs">
          <span className="font-black text-sky-900">Right — Pickup employees</span>
          <p className="text-sky-800/80 mt-0.5">Green = free to assign. Grey = already on a job.</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs">
          <span className="font-black text-amber-900">No one free?</span>
          <p className="text-amber-800/80 mt-0.5">Use Reschedule on the order to pick another slot.</p>
        </div>
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[420px]">
        {/* CUSTOMER ORDERS */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-black">Customer orders</h2>
            </div>
            <span className="text-[11px] font-bold bg-white/15 px-2 py-0.5 rounded-full">
              {orders.length} waiting
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[520px]">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-700" />
                Loading orders…
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">No waiting orders</p>
                <p className="text-xs mt-1">New customer requests will show here.</p>
              </div>
            ) : (
              orders.map((order) => {
                const selected = selectedOrderId === order.id;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full text-left rounded-2xl border-2 p-3.5 transition-all cursor-pointer ${
                      selected
                        ? 'border-[#0A3D2B] bg-emerald-50 ring-2 ring-[#0A3D2B]/15'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-xs font-black text-emerald-800">
                          {order.pickupCode}
                        </div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {order.customerName}
                        </div>
                      </div>
                      {selected && (
                        <span className="text-[10px] font-black uppercase bg-[#0A3D2B] text-white px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <CalendarClock className="w-3.5 h-3.5 text-emerald-700" />
                      {order.scheduledDate} · {order.preferredSlot}
                    </div>
                    <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        {order.address} · PIN {order.pincode}
                      </span>
                    </div>
                    <div className="mt-1.5 text-[11px] text-slate-600 font-semibold">
                      {order.weightLabel}
                      {order.categories.length > 0 ? ` · ${order.categories.slice(0, 3).join(', ')}` : ''}
                    </div>

                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openReschedule(order)}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-[11px] font-bold hover:bg-amber-100 cursor-pointer"
                      >
                        Reschedule
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* AVAILABLE EMPLOYEES */}
        <section className="rounded-3xl border-2 border-slate-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[#0A3D2B] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-black">Pickup employees</h2>
            </div>
            <span className="text-[11px] font-bold bg-white/15 px-2 py-0.5 rounded-full">
              {availableDrivers.length} free
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[520px]">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-700" />
                Loading employees…
              </div>
            ) : drivers.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-2xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-bold text-amber-900">No approved pickup employees</p>
                <p className="text-xs text-amber-800 mt-1">
                  Go to <strong>Workforce</strong>, approve an employee, then come back here.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 mb-2 px-0.5">
                    Available now
                  </p>
                  {availableDrivers.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
                      Nobody is free. Reschedule the customer order, or wait until a job finishes.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableDrivers.map((driver) => {
                        const selected = selectedDriverId === driver.id;
                        return (
                          <button
                            key={driver.id}
                            type="button"
                            onClick={() => setSelectedDriverId(driver.id)}
                            className={`w-full text-left rounded-2xl border-2 p-3 transition-all cursor-pointer flex items-center gap-3 ${
                              selected
                                ? 'border-[#0A3D2B] bg-emerald-50 ring-2 ring-[#0A3D2B]/15'
                                : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-900">{driver.name}</div>
                              <div className="text-[10px] font-mono text-slate-500">{driver.code}</div>
                            </div>
                            <span className="text-[10px] font-black uppercase text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                              Free
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {busyDrivers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-0.5">
                      Busy on other pickups
                    </p>
                    <div className="space-y-2 opacity-70">
                      {busyDrivers.map((driver) => (
                        <div
                          key={driver.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-300 text-slate-600 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-700">{driver.name}</div>
                            <div className="text-[10px] text-slate-500">
                              {driver.busyCount} active job{driver.busyCount > 1 ? 's' : ''}
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            Busy
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Assign bar */}
      <div className="sticky bottom-3 z-20 rounded-2xl border border-slate-200 bg-white shadow-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Order</div>
              <div className="font-bold text-slate-900 mt-0.5 truncate">
                {selectedOrder ? selectedOrder.pickupCode : '— select left'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Employee</div>
              <div className="font-bold text-slate-900 mt-0.5 truncate">
                {selectedDriver ? selectedDriver.name : '— select right'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
              <label className="text-[10px] font-bold uppercase text-slate-400 block">Vehicle</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="mt-0.5 w-full bg-transparent font-bold text-slate-900 outline-none cursor-pointer"
              >
                {vehicles.length === 0 && <option value="">No vehicles — add in Fleet</option>}
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !selectedOrder || !selectedDriver || !selectedVehicle}
            onClick={handleAssign}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#0A3D2B] text-white text-sm font-black hover:bg-[#0E4D36] disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer inline-flex items-center justify-center gap-2 shadow-md"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-amber-400" />}
            Assign to employee
          </button>
        </div>
        {availableDrivers.length === 0 && orders.length > 0 && (
          <p className="text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            No free employees — open an order and tap Reschedule.
          </p>
        )}
      </div>

      {/* Reschedule modal */}
      {rescheduleOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-amber-500 text-slate-950 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm">Reschedule order</h3>
                <p className="text-[11px] font-mono opacity-80">{rescheduleOrder.pickupCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleOrder(null)}
                className="p-1 rounded-lg hover:bg-black/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Use this when no pickup employee is available for the customer&apos;s current slot.
              </p>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  New date
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  New time slot
                </label>
                <select
                  value={rescheduleSlotId}
                  onChange={(e) => setRescheduleSlotId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                >
                  {slots.length === 0 && <option value="">No slots configured</option>}
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Reason
                </label>
                <input
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-800"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleOrder(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleReschedule}
                className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 cursor-pointer inline-flex items-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                Save new slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
