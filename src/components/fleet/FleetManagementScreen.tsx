"use client";

import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Fuel,
  Wrench,
  Receipt,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  Building2,
  User,
  Zap,
  Gauge,
  FileText,
  X,
  Sparkles,
  Layers,
  Phone,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';

export type VehicleOwnership = 'OWNED' | 'RENTED';
export type VehicleType = 'EV_AUTO' | 'DIESEL_AUTO' | 'TATA_ACE' | 'BOLERO_PICKUP' | 'E_RICKSHAW';
export type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'OFF_DUTY' | 'DECOMMISSIONED';

export interface VehicleAsset {
  id: string;
  registrationNumber: string;
  name: string;
  vehicleType: VehicleType;
  ownership: VehicleOwnership;
  ownershipDetails: {
    vendorName?: string;
    vendorPhone?: string;
    rentBillingModel?: 'DAILY_FLAT' | 'MONTHLY_FIXED' | 'PER_KM';
    rentalChargeRupees: number; // e.g. 600/day or 18000/month
    contractValidUntil?: string;
    assetValueRupees?: number; // for owned
  };
  capacityKg: number;
  maxStops: number;
  compliance: {
    fitnessValidUntil: string; // YYYY-MM-DD
    insuranceValidUntil: string;
    pucValidUntil: string;
    lastServiceOdometer: number;
  };
  currentOdometer: number;
  assignedDivision: string;
  defaultDriver: {
    name: string;
    phone: string;
  };
  status: VehicleStatus;
  todayTrips: number;
  todayCollectedKg: number;
}

export interface FuelLogRecord {
  id: string;
  vehicleReg: string;
  driverName: string;
  fuelType: 'DIESEL' | 'CNG' | 'ELECTRICITY';
  quantity: number; // Liters or kWh
  ratePerUnit: number; // Rs per L or kWh
  totalCostRupees: number;
  odometerReading: number;
  kmSinceLastRefuel: number;
  calculatedMileage: string;
  incurredAt: string;
  stationName: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleReg: string;
  maintenanceType: 'ROUTINE_SERVICE' | 'BREAKDOWN_REPAIR' | 'TIRE_REPLACEMENT' | 'BATTERY_HEALTH';
  garageName: string;
  odometer: number;
  costRupees: number;
  description: string;
  downtimeHours: number;
  serviceDate: string;
  invoiceNumber: string;
}

export interface IncidentalRecord {
  id: string;
  vehicleReg: string;
  driverName: string;
  expenseType: 'TOLL_PLAZA' | 'PUNCTURE_REPAIR' | 'MUNICIPAL_PARKING' | 'VEHICLE_WASH';
  amountRupees: number;
  notes: string;
  incurredAt: string;
}

const mapVehicleStatus = (status?: string): VehicleStatus => {
  if (status === 'MAINTENANCE') return 'IN_MAINTENANCE';
  if (status === 'RETIRED') return 'DECOMMISSIONED';
  return (status || 'ACTIVE') as VehicleStatus;
};

export const FleetManagementScreen: React.FC = () => {
  const complianceWarningDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'RENTALS' | 'FUEL' | 'MAINTENANCE' | 'INCIDENTALS'>('REGISTRY');
  const [vehicles, setVehicles] = useState<VehicleAsset[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLogRecord[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceRecord[]>([]);
  const [incidentals, setIncidentals] = useState<IncidentalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'OWNED' | 'RENTED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedVehicleForDrawer, setSelectedVehicleForDrawer] = useState<VehicleAsset | null>(null);

  // Modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isLogFuelOpen, setIsLogFuelOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for adding vehicle
  const [newRegNo, setNewRegNo] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<VehicleType>('EV_AUTO');
  const [newOwnership, setNewOwnership] = useState<VehicleOwnership>('RENTED');
  const [newVendorName, setNewVendorName] = useState('');
  const [newRentRupees, setNewRentRupees] = useState(700);
  const [newCapacity, setNewCapacity] = useState(500);
  const [isSubmittingVehicle, setIsSubmittingVehicle] = useState(false);

  // Form states for fuel entry
  const [selectedFuelVeh, setSelectedFuelVeh] = useState(vehicles[0]?.registrationNumber || '');
  const [fuelLitres, setFuelLitres] = useState(15);
  const [fuelRate, setFuelRate] = useState(98.5);
  const [fuelOdometer, setFuelOdometer] = useState(15500);
  const [fuelDriver, setFuelDriver] = useState('');
  const [fuelStation, setFuelStation] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Dynamic live fleet, fuel and maintenance fetching from NestJS backend
  useEffect(() => {
    const fetchFleetData = async () => {
      try {
        const [vehRes, fuelRes, maintRes, incRes] = await Promise.all([
          adminApiClient.get('/admin/vehicles'),
          adminApiClient.get('/admin/operations/fuel-logs'),
          adminApiClient.get('/admin/operations/maintenance-logs'),
          adminApiClient.get('/admin/operations/incidental-logs'),
        ]);

        if (vehRes.success && Array.isArray(vehRes.data)) {
          const mapped: VehicleAsset[] = vehRes.data.map((v: any) => ({
            id: v._id || v.id,
            registrationNumber: v.registrationNumber,
            name: v.name || v.registrationNumber,
            vehicleType: v.vehicleType || 'EV_AUTO',
            ownership: v.ownership || 'OWNED',
            ownershipDetails: {
              vendorName: v.ownershipDetails?.vendorName || '—',
              rentBillingModel: v.ownershipDetails?.rentBillingModel,
              rentalChargeRupees: v.ownershipDetails?.rentalChargeRupees || 0,
              contractValidUntil: v.ownershipDetails?.contractValidUntil || '—',
              assetValueRupees: v.ownershipDetails?.assetValueRupees || 0,
            },
            capacityKg: v.capacityKg || 0,
            maxStops: v.maxStops || 0,
            compliance: {
              fitnessValidUntil: v.compliance?.fitnessValidUntil || '—',
              insuranceValidUntil: v.compliance?.insuranceValidUntil || '—',
              pucValidUntil: v.compliance?.pucValidUntil || '—',
              lastServiceOdometer: v.compliance?.lastServiceOdometer || 0,
            },
            currentOdometer: v.currentOdometer || 0,
            assignedDivision: v.assignedDivision?.name || v.assignedDivision || '—',
            defaultDriver: {
              name: v.defaultDriver?.name || '—',
              phone: v.defaultDriver?.phone || '—',
            },
            status: mapVehicleStatus(v.status),
            todayTrips: Number(v.todayTrips || 0),
            todayCollectedKg: Number(v.todayCollectedKg || 0),
          }));
          setVehicles(mapped);
          if (mapped[0]?.registrationNumber) {
            setSelectedFuelVeh(mapped[0].registrationNumber);
            setFuelDriver(mapped[0].defaultDriver.name === '—' ? '' : mapped[0].defaultDriver.name);
          }
        }

        if (fuelRes.success && Array.isArray(fuelRes.data)) {
          setFuelLogs(
            fuelRes.data.map((f: any) => ({
              id: f._id || f.id,
              vehicleReg: f.vehicleReg,
              driverName: f.driverName,
              fuelType: f.fuelType,
              quantity: f.quantity,
              ratePerUnit: f.ratePerUnit,
              totalCostRupees: f.totalCostRupees,
              odometerReading: f.odometerReading,
              kmSinceLastRefuel: f.kmSinceLastRefuel || 0,
              calculatedMileage: f.calculatedMileage || '—',
              incurredAt: f.incurredAt || f.createdAt || '—',
              stationName: f.stationName || '—',
            })),
          );
        }

        if (maintRes.success && Array.isArray(maintRes.data)) {
          setMaintenanceLogs(
            maintRes.data.map((m: any) => ({
              id: m._id || m.id,
              vehicleReg: m.vehicleReg,
              maintenanceType: m.maintenanceType,
              garageName: m.garageName,
              odometer: m.odometer,
              costRupees: m.costRupees,
              description: m.description,
              downtimeHours: m.downtimeHours || 0,
              serviceDate: m.serviceDate || '—',
              invoiceNumber: m.invoiceNumber || '—',
            })),
          );
        }

        if (incRes.success && Array.isArray(incRes.data)) {
          setIncidentals(
            incRes.data.map((i: any) => ({
              id: i._id || i.id,
              vehicleReg: i.vehicleReg,
              driverName: i.driverName,
              expenseType: i.expenseType,
              amountRupees: i.amountRupees,
              notes: i.notes,
              incurredAt: i.incurredAt || i.createdAt || '—',
            })),
          );
        }
      } catch (err) {
        console.error('Error fetching live fleet data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFleetData();
  }, []);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalVehicles = vehicles.length;
    const ownedCount = vehicles.filter((v) => v.ownership === 'OWNED').length;
    const rentedCount = vehicles.filter((v) => v.ownership === 'RENTED').length;
    const inMaintCount = vehicles.filter((v) => v.status === 'IN_MAINTENANCE').length;

    let monthlyRentObligation = 0;
    vehicles.forEach((v) => {
      if (v.ownership === 'RENTED') {
        if (v.ownershipDetails.rentBillingModel === 'DAILY_FLAT') {
          monthlyRentObligation += v.ownershipDetails.rentalChargeRupees * 26;
        } else {
          monthlyRentObligation += v.ownershipDetails.rentalChargeRupees;
        }
      }
    });

    const totalFuelCost = fuelLogs.reduce((acc, f) => acc + f.totalCostRupees, 0);
    const totalMaintCost = maintenanceLogs.reduce((acc, m) => acc + m.costRupees, 0);
    const totalIncidentals = incidentals.reduce((acc, i) => acc + i.amountRupees, 0);

    return {
      totalVehicles,
      ownedCount,
      rentedCount,
      inMaintCount,
      monthlyRentObligation: `₹${monthlyRentObligation.toLocaleString('en-IN')}`,
      totalFuelCost: `₹${totalFuelCost.toLocaleString('en-IN')}`,
      totalMaintCost: `₹${totalMaintCost.toLocaleString('en-IN')}`,
      totalIncidentals: `₹${totalIncidentals.toLocaleString('en-IN')}`,
    };
  }, [vehicles, fuelLogs, maintenanceLogs, incidentals]);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (ownershipFilter !== 'ALL' && v.ownership !== ownershipFilter) return false;
      if (statusFilter !== 'ALL' && v.status !== statusFilter) return false;
      return true;
    });
  }, [vehicles, ownershipFilter, statusFilter]);

  // Handle Add Vehicle
  const handleAddVehicleSubmit = async () => {
    if (!newRegNo.trim()) {
      showToast('❌ Please enter vehicle registration number (e.g. AP 16 TE 9942)');
      return;
    }

    const regUpper = newRegNo.toUpperCase().trim();
    const finalName = newName.trim() || `${newType.replace('_', ' ')} (${regUpper})`;
    setIsSubmittingVehicle(true);

    try {
      const res = await adminApiClient.post('/admin/vehicles', {
        registrationNumber: regUpper,
        name: finalName,
        vehicleType: newType,
        capacityKg: newCapacity,
        maxStops: 20,
      });

      if (res.success && res.data) {
        setSelectedFuelVeh(regUpper);
        setIsAddVehicleOpen(false);
        setNewRegNo('');
        setNewName('');
        setNewVendorName('');
        showToast(`✅ Vehicle ${regUpper} registered & saved to MongoDB!`);

        // Refresh full vehicle list from MongoDB to ensure consistency
        const vehRes = await adminApiClient.get('/admin/vehicles');
        if (vehRes.success && Array.isArray(vehRes.data)) {
          const mapped: VehicleAsset[] = vehRes.data.map((item: any) => ({
            id: item._id || item.id,
            registrationNumber: item.registrationNumber,
            name: item.name || item.registrationNumber,
            vehicleType: item.vehicleType || 'EV_AUTO',
            ownership: item.ownership || 'OWNED',
            ownershipDetails: {
              vendorName: item.ownershipDetails?.vendorName || '—',
              rentBillingModel: item.ownershipDetails?.rentBillingModel,
              rentalChargeRupees: item.ownershipDetails?.rentalChargeRupees || 0,
              contractValidUntil: item.ownershipDetails?.contractValidUntil || '—',
              assetValueRupees: item.ownershipDetails?.assetValueRupees || 0,
            },
            capacityKg: item.capacityKg || 0,
            maxStops: item.maxStops || 0,
            compliance: {
              fitnessValidUntil: item.compliance?.fitnessValidUntil || '—',
              insuranceValidUntil: item.compliance?.insuranceValidUntil || '—',
              pucValidUntil: item.compliance?.pucValidUntil || '—',
              lastServiceOdometer: item.compliance?.lastServiceOdometer || 0,
            },
            currentOdometer: item.currentOdometer || 0,
            assignedDivision: item.assignedDivision?.name || item.assignedDivision || '—',
            defaultDriver: {
              name: item.defaultDriver?.name || '—',
              phone: item.defaultDriver?.phone || '—',
            },
            status: mapVehicleStatus(item.status),
            todayTrips: 0,
            todayCollectedKg: 0,
          }));
          setVehicles(mapped);
        }
      } else {
        showToast(`❌ Error: ${res.error || 'Could not register vehicle. Please try again.'}`);
      }
    } catch (err: any) {
      console.error('Failed to save vehicle to backend:', err);
      showToast(`❌ Network error: ${err.message || 'Cannot reach backend'}`);
    } finally {
      setIsSubmittingVehicle(false);
    }
  };

  // Handle Fuel Entry Submit
  const handleFuelEntrySubmit = async () => {
    const total = fuelLitres * fuelRate;
    try {
      const res = await adminApiClient.post('/admin/operations/fuel-logs', {
        vehicleReg: selectedFuelVeh,
        driverName: fuelDriver || '—',
        fuelType: 'DIESEL',
        quantity: fuelLitres,
        ratePerUnit: fuelRate,
        totalCostRupees: total,
        odometerReading: fuelOdometer,
        kmSinceLastRefuel: 180,
        calculatedMileage: `${(180 / fuelLitres).toFixed(1)} km/L`,
        stationName: fuelStation,
      });

      if (res.success && res.data) {
        // Refetch fuel logs from MongoDB after saving
        const fuelRes = await adminApiClient.get('/admin/operations/fuel-logs');
        if (fuelRes.success && Array.isArray(fuelRes.data)) {
          setFuelLogs(fuelRes.data.map((f: any) => ({
            id: f._id || f.id,
            vehicleReg: f.vehicleReg,
            driverName: f.driverName,
            fuelType: f.fuelType,
            quantity: f.quantity,
            ratePerUnit: f.ratePerUnit,
            totalCostRupees: f.totalCostRupees,
            odometerReading: f.odometerReading,
            kmSinceLastRefuel: Number(f.kmSinceLastRefuel || 0),
            calculatedMileage: f.calculatedMileage || '—',
            incurredAt: f.incurredAt || (f.createdAt ? new Date(f.createdAt).toLocaleString('en-IN') : '—'),
            stationName: f.stationName || '—',
          })));
        }
        setIsLogFuelOpen(false);
        showToast(`✅ Fuel log saved for ${selectedFuelVeh}: ₹${total.toFixed(2)}`);
      } else {
        showToast(`❌ Error: ${res.error || 'Could not save fuel log.'}`);
      }
    } catch (err: any) {
      console.error('Failed to save fuel log:', err);
      showToast(`❌ Network error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0A3D2B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
          <span className="text-xs font-black tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Fleet Logistics Operations & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <Truck className="w-3 h-3 text-emerald-700" />
                Fleet Logistics & Vehicle ERP
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Phase 2: Rented vs Owned Fleet & Daily Fuel Control
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Vehicle Registry, Rental Contracts & Fuel Desk
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Track vehicle ownership status (Owned capital asset vs Rented daily/monthly contracts), 
              automated Fitness Certificate (FC) & Insurance expiry monitors, fuel efficiency, and route incidentals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsLogFuelOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Fuel className="w-3.5 h-3.5 text-blue-600" />
              <span>Log Fuel / EV Power</span>
            </button>

            <button
              onClick={() => setIsAddVehicleOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Register New Vehicle</span>
            </button>
          </div>
        </div>

        {/* 4 Fleet Logistics KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Fleet Assets
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{metrics.totalVehicles}</span>
              <span className="text-[11px] font-extrabold text-emerald-700">
                {metrics.totalVehicles - metrics.inMaintCount} On Route
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {metrics.ownedCount} Owned • {metrics.rentedCount} Rented
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Monthly Rental Contracts
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-950">{metrics.monthlyRentObligation}</span>
            </div>
            <span className="text-[10px] text-amber-800/80 mt-1 block">Accrued vehicle rent obligations</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Fuel & Charging Cost
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-blue-950">{metrics.totalFuelCost}</span>
            </div>
            <span className="text-[10px] text-blue-700 mt-1 block">Avg ~₹1.80 per kg scrap transported</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
              Repairs & Maintenance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-rose-950">{metrics.totalMaintCost}</span>
            </div>
            <span className="text-[10px] text-rose-700 mt-1 block">
              {metrics.inMaintCount} vehicle currently in garage
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {[
            { id: 'REGISTRY', label: '🚚 Vehicle Registry', count: vehicles.length },
            { id: 'RENTALS', label: '📑 Rented Contracts Ledger', count: metrics.rentedCount },
            { id: 'FUEL', label: '⛽ Fuel & Energy Logs', count: fuelLogs.length },
            { id: 'MAINTENANCE', label: '🔧 Maintenance & Repairs', count: maintenanceLogs.length },
            { id: 'INCIDENTALS', label: '🧾 Route Incidentals (Tolls/Puncture)', count: incidentals.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#0A3D2B] text-white shadow-md shadow-emerald-950/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                activeTab === tab.id ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: VEHICLE REGISTRY */}
      {activeTab === 'REGISTRY' && (
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/90">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Ownership Filter:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                {(['ALL', 'OWNED', 'RENTED'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setOwnershipFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      ownershipFilter === mode
                        ? 'bg-[#0A3D2B] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Assets' : mode === 'OWNED' ? '🟢 Owned' : '🟡 Rented'}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400 font-semibold">
              Showing {filteredVehicles.length} of {vehicles.length} vehicles
            </div>
          </div>

          {/* Vehicles Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Vehicle Identity</th>
                    <th className="py-3.5 px-3">Ownership & Contract</th>
                    <th className="py-3.5 px-3">Type & Capacity</th>
                    <th className="py-3.5 px-3">Compliance & Expiry</th>
                    <th className="py-3.5 px-3">Assigned Driver</th>
                    <th className="py-3.5 px-3">Today Activity</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredVehicles.map((veh) => {
                    const isRented = veh.ownership === 'RENTED';
                    const isMaint = veh.status === 'IN_MAINTENANCE';

                    return (
                      <tr key={veh.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-800 shrink-0 border border-slate-200">
                              {veh.vehicleType === 'EV_AUTO' ? '⚡' : '🚚'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-slate-900 text-xs">
                                  {veh.registrationNumber}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold block truncate max-w-[140px]">
                                {veh.name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Ownership & Rent Charge */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${
                                isRented
                                  ? 'bg-amber-100/70 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100/70 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {veh.ownership}
                            </span>
                            <span className="text-[11px] font-bold text-slate-700 mt-1">
                              {isRented
                                ? `₹${veh.ownershipDetails.rentalChargeRupees}/${
                                    veh.ownershipDetails.rentBillingModel === 'DAILY_FLAT' ? 'day' : 'mo'
                                  }`
                                : `Asset: ₹${(
                                    (veh.ownershipDetails.assetValueRupees || 0) / 100000
                                  ).toFixed(1)}L`}
                            </span>
                            {isRented && veh.ownershipDetails.vendorName && (
                              <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                                {veh.ownershipDetails.vendorName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Type & Capacity */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800 text-xs">
                              {veh.capacityKg} kg
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Max {veh.maxStops} stops / run
                            </span>
                            <span className="text-[9px] font-semibold text-slate-500 mt-0.5">
                              Odo: {veh.currentOdometer.toLocaleString()} km
                            </span>
                          </div>
                        </td>

                        {/* 4. Compliance Counters */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-0.5 text-[10px]">
                            <div className="flex items-center gap-1 font-bold">
                              <span className="text-slate-400">FC:</span>
                              <span className={veh.compliance.fitnessValidUntil !== '—' && veh.compliance.fitnessValidUntil <= complianceWarningDate ? 'text-rose-600 font-black' : 'text-slate-700'}>
                                {veh.compliance.fitnessValidUntil}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 font-bold">
                              <span className="text-slate-400">Ins:</span>
                              <span className={veh.compliance.insuranceValidUntil !== '—' && veh.compliance.insuranceValidUntil <= complianceWarningDate ? 'text-amber-600 font-black' : 'text-slate-700'}>
                                {veh.compliance.insuranceValidUntil}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Driver */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs">
                              {veh.defaultDriver.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {veh.defaultDriver.phone}
                            </span>
                            <span className="text-[9px] text-emerald-800 font-semibold truncate max-w-[110px]">
                              {veh.assignedDivision}
                            </span>
                          </div>
                        </td>

                        {/* 6. Today Activity */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-xs">
                              {veh.todayCollectedKg} kg
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {veh.todayTrips} trips today
                            </span>
                          </div>
                        </td>

                        {/* 7. Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isMaint
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {veh.status}
                          </span>
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedVehicleForDrawer(veh)}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && filteredVehicles.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">
                      No vehicles available.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RENTED CONTRACTS LEDGER */}
      {activeTab === 'RENTALS' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h4 className="font-black text-amber-950">Active Rented Vehicle Contracts</h4>
                <p className="text-[11px] text-amber-800">
                  Third-party fleet agreements for seasonal scrap collection demand spikes in Vijayawada & Guntur.
                </p>
              </div>
            </div>

            <div className="text-right font-black text-amber-950">
              <span className="text-xs text-amber-800 block">Total Monthly Accrual</span>
              <span className="text-base">{metrics.monthlyRentObligation}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles
              .filter((v) => v.ownership === 'RENTED')
              .map((veh) => (
                <div key={veh.id} className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        RENTED ASSET
                      </span>
                      <h3 className="text-sm font-black text-slate-900 mt-1">{veh.registrationNumber}</h3>
                      <p className="text-xs text-slate-500">{veh.name}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">
                        ₹{veh.ownershipDetails.rentalChargeRupees}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {veh.ownershipDetails.rentBillingModel === 'DAILY_FLAT' ? 'per working day' : 'per month'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Fleet Vendor</span>
                      <span className="font-extrabold text-slate-800 mt-0.5 block">{veh.ownershipDetails.vendorName}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {veh.ownershipDetails.vendorPhone}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Contract Validity</span>
                      <span className="font-extrabold text-slate-800 mt-0.5 block">Until {veh.ownershipDetails.contractValidUntil}</span>
                      <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">Auto-Renewing Active</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FUEL & POWER CHARGING LOG */}
      {activeTab === 'FUEL' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/90">
            <span className="text-xs font-bold text-slate-700">Recent Fuel & EV Charging Slips:</span>
            <button
              onClick={() => setIsLogFuelOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Log Fuel Slip
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Vehicle & Date</th>
                    <th className="py-3.5 px-3">Energy / Fuel Type</th>
                    <th className="py-3.5 px-3">Volume & Rate</th>
                    <th className="py-3.5 px-3">Total Amount</th>
                    <th className="py-3.5 px-3">Odometer</th>
                    <th className="py-3.5 px-3">Calculated Efficiency</th>
                    <th className="py-3.5 px-4">Fuel Station</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {fuelLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900 text-xs block">{log.vehicleReg}</span>
                        <span className="text-[10px] text-slate-400">{log.driverName} • {log.incurredAt}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          log.fuelType === 'ELECTRICITY'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {log.fuelType}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {log.quantity} {log.fuelType === 'ELECTRICITY' ? 'kWh' : 'L'} @ ₹{log.ratePerUnit}
                      </td>

                      <td className="py-3.5 px-3 font-black text-slate-900 text-xs">
                        ₹{log.totalCostRupees.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 font-bold">
                        {log.odometerReading} km (+{log.kmSinceLastRefuel} km)
                      </td>

                      <td className="py-3.5 px-3 font-black text-emerald-700">
                        {log.calculatedMileage}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 truncate max-w-[160px]">
                        {log.stationName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: MAINTENANCE & REPAIRS */}
      {activeTab === 'MAINTENANCE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Vehicle & Garage</th>
                    <th className="py-3.5 px-3">Service Type</th>
                    <th className="py-3.5 px-3">Description of Work</th>
                    <th className="py-3.5 px-3">Odometer</th>
                    <th className="py-3.5 px-3">Downtime</th>
                    <th className="py-3.5 px-3">Invoice Total</th>
                    <th className="py-3.5 px-4">Date</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {maintenanceLogs.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900 text-xs block">{m.vehicleReg}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{m.garageName}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {m.maintenanceType.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 font-medium max-w-xs truncate">
                        {m.description}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 font-bold">
                        {m.odometer.toLocaleString()} km
                      </td>

                      <td className="py-3.5 px-3 text-amber-700 font-extrabold">
                        {m.downtimeHours} hrs off-route
                      </td>

                      <td className="py-3.5 px-3 font-black text-rose-700 text-xs">
                        ₹{m.costRupees.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {m.serviceDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: INCIDENTALS */}
      {activeTab === 'INCIDENTALS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Vehicle & Driver</th>
                    <th className="py-3.5 px-3">Expense Category</th>
                    <th className="py-3.5 px-3">Notes & Reason</th>
                    <th className="py-3.5 px-3">Amount</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {incidentals.map((inc) => (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-black text-slate-900 text-xs block">{inc.vehicleReg}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{inc.driverName}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {inc.expenseType.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {inc.notes}
                      </td>

                      <td className="py-3.5 px-3 font-black text-slate-900 text-xs">
                        ₹{inc.amountRupees.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-semibold">
                        {inc.incurredAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS DRAWER FOR A VEHICLE */}
      {selectedVehicleForDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {selectedVehicleForDrawer.ownership} ASSET
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedVehicleForDrawer.registrationNumber}
                </h3>
                <p className="text-xs text-slate-500">{selectedVehicleForDrawer.name}</p>
              </div>

              <button
                onClick={() => setSelectedVehicleForDrawer(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Compliance Expiry Cards */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Statutory Compliance Expirations
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Fitness (FC)</span>
                  <span className="font-extrabold text-slate-800 text-[11px] block mt-0.5">
                    {selectedVehicleForDrawer.compliance.fitnessValidUntil}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Insurance</span>
                  <span className="font-extrabold text-amber-950 text-[11px] block mt-0.5">
                    {selectedVehicleForDrawer.compliance.insuranceValidUntil}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">PUC Emission</span>
                  <span className="font-extrabold text-slate-800 text-[11px] block mt-0.5">
                    {selectedVehicleForDrawer.compliance.pucValidUntil}
                  </span>
                </div>
              </div>
            </div>

            {/* Driver & Division */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Operations</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Default Driver:</span>
                <span className="font-black text-slate-900">{selectedVehicleForDrawer.defaultDriver.name} ({selectedVehicleForDrawer.defaultDriver.phone})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Assigned Division:</span>
                <span className="font-bold text-emerald-800">{selectedVehicleForDrawer.assignedDivision}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payload Capacity:</span>
                <span className="font-black text-slate-900">{selectedVehicleForDrawer.capacityKg} kg (Max {selectedVehicleForDrawer.maxStops} stops)</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedVehicleForDrawer(null)}
              className="mt-auto w-full py-3 rounded-2xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] cursor-pointer"
            >
              Close Asset Details
            </button>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW VEHICLE */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-800" />
                Register New Collection Vehicle
              </h3>
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. AP 16 TE 9942"
                  value={newRegNo}
                  onChange={(e) => setNewRegNo(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold uppercase bg-slate-50 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Display Asset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ape Auto Electric Cargo - East 03"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Vehicle Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                  >
                    <option value="EV_AUTO">⚡ Electric 3-Wheeler</option>
                    <option value="DIESEL_AUTO">🚚 Diesel Ape Auto</option>
                    <option value="TATA_ACE">🚛 Tata Ace 1 Ton</option>
                    <option value="BOLERO_PICKUP">🚐 Bolero Maxi Truck</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ownership Model</label>
                  <select
                    value={newOwnership}
                    onChange={(e) => setNewOwnership(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                  >
                    <option value="RENTED">🟡 Rented Contract</option>
                    <option value="OWNED">🟢 Owned Asset</option>
                  </select>
                </div>
              </div>

              {newOwnership === 'RENTED' && (
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <span className="text-[10px] font-black uppercase text-amber-900 block">
                    Rental Contract Terms
                  </span>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Fleet Vendor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Sri Balaji Logistics"
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      className="w-full p-2 rounded-lg border border-amber-300 font-medium text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">Daily Rent (₹/day)</label>
                    <input
                      type="number"
                      value={newRentRupees}
                      onChange={(e) => setNewRentRupees(parseFloat(e.target.value) || 0)}
                      className="w-full p-2 rounded-lg border border-amber-300 font-bold text-xs bg-white outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Payload Capacity (kg)</label>
                <input
                  type="number"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value) || 500)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-register-vehicle-submit"
                onClick={handleAddVehicleSubmit}
                disabled={isSubmittingVehicle}
                className="w-1/2 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingVehicle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register Asset</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG FUEL ENTRY */}
      {isLogFuelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-600" />
                Log Daily Fuel / EV Charging Slip
              </h3>
              <button
                onClick={() => setIsLogFuelOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Vehicle</label>
                <select
                  value={selectedFuelVeh}
                  onChange={(e) => {
                    setSelectedFuelVeh(e.target.value);
                    const vehicle = vehicles.find((item) => item.registrationNumber === e.target.value);
                    setFuelDriver(vehicle?.defaultDriver.name === '—' ? '' : vehicle?.defaultDriver.name || '');
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.registrationNumber}>
                      {v.registrationNumber} ({v.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Driver</label>
                  <select
                    value={fuelDriver}
                    onChange={(e) => setFuelDriver(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                  >
                    <option value="">—</option>
                    {vehicles
                      .filter((vehicle) => vehicle.defaultDriver.name !== '—')
                      .map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.defaultDriver.name}>
                          {vehicle.defaultDriver.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Station</label>
                  <input
                    type="text"
                    value={fuelStation}
                    onChange={(e) => setFuelStation(e.target.value)}
                    placeholder="Fuel / charging station"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity (Liters / kWh)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={fuelLitres}
                    onChange={(e) => setFuelLitres(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Rate per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fuelRate}
                    onChange={(e) => setFuelRate(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Current Odometer Reading (km)</label>
                <input
                  type="number"
                  value={fuelOdometer}
                  onChange={(e) => setFuelOdometer(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <span className="font-bold text-blue-900">Calculated Slip Total:</span>
                <span className="font-black text-blue-950 text-sm">
                  ₹{(fuelLitres * fuelRate).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsLogFuelOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFuelEntrySubmit}
                className="w-1/2 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] cursor-pointer shadow-md"
              >
                Save Fuel Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
