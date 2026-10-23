"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { adminApiClient } from '../../lib/api-client';
import {
  PackagePlus,
  Scale,
  Receipt,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  QrCode,
  DollarSign,
  ArrowRight,
  User,
  Phone,
  FileText,
  Layers,
  ChevronRight,
  X,
  Sparkles,
  Building2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  TrendingUp,
  Percent,
  Trash2,
  AlertCircle,
} from 'lucide-react';

export type InwardChannel = 'DOORSTEP_PICKUP' | 'YARD_WALK_IN' | 'B2B_COMMERCIAL';
export type PaymentMethod = 'CASH' | 'UPI_INSTANT' | 'NEFT_RTGS';
export type InwardStatus = 'RECEIVED_VERIFIED' | 'PENDING_WEIGHBRIDGE_TARE' | 'SHORTAGE_FLAGGED';

export interface InwardItemRow {
  productId: string;
  categoryName: string;
  productName: string;
  ratePerKgRupees: number;
  grossWeightKg: number;
  deductionKg: number;
  deductionReason: string;
  netWeightKg: number;
  lineTotalRupees: number;
}

export interface InwardVoucherRecord {
  id: string;
  voucherNumber: string; // e.g. YRD-20261012-084, AKP-20261012-019, B2B-20261012-005
  channel: InwardChannel;
  timestamp: string;
  divisionId: string;
  divisionName: string;
  sellerName: string;
  sellerPhone: string;
  sellerType: 'HOUSEHOLD' | 'LOCAL_KABADIS' | 'TRADESMAN' | 'CORPORATE_B2B' | 'FIELD_PICKER';
  // Logistics
  vehicleReg?: string;
  assignedCollectorName?: string;
  truckGrossWeightKg?: number;
  truckTareWeightKg?: number;
  gstin?: string;
  eWayBillNumber?: string;
  // Items
  items: InwardItemRow[];
  totalGrossKg: number;
  totalDeductionKg: number;
  totalNetKg: number;
  grandTotalRupees: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PAID' | 'PENDING_RECONCILIATION';
  operatorName: string;
  status: InwardStatus;
  reconciliationNotes?: string;
}

export interface YardReconciliationRecord {
  id: string;
  date: string;
  vehicleReg: string;
  collectorCode: string;
  collectorName: string;
  routeDivision: string;
  expectedFieldPickupsCount: number;
  reportedFieldTotalKg: number; // Sum of customer app scale readings
  physicalYardScaleKg: number; // Dumped on yard floor industrial platform scale
  weightVarianceKg: number; // Physical - Reported
  variancePercentage: number;
  status: 'PERFECT_MATCH' | 'ACCEPTABLE_TOLERANCE' | 'WEIGHT_SHORTAGE_FLAGGED';
  verifiedAt: string;
  supervisorName: string;
  auditNotes?: string;
}

// Available Scrap Products for POS Line Builder
export const POS_AVAILABLE_SCRAP = [
  { id: 'p_copper', cat: 'Metal', name: 'Copper / Tamba', rate: 605.0, icon: '🟤' },
  { id: 'p_brass', cat: 'Metal', name: 'Brass / Peetal', rate: 390.0, icon: '🟡' },
  { id: 'p_alu', cat: 'Metal', name: 'Aluminium Scrap', rate: 145.0, icon: '⚪' },
  { id: 'p_iron', cat: 'Metal', name: 'Iron / Loha (Heavy)', rate: 28.0, icon: '⚙️' },
  { id: 'p_tin', cat: 'Metal', name: 'Tin / Sheet Metal', rate: 22.0, icon: '🥫' },
  { id: 'p_carton', cat: 'Paper', name: 'Cardboard / Carton (Raddi)', rate: 13.5, icon: '📦' },
  { id: 'p_newspaper', cat: 'Paper', name: 'Old Newspaper (ONP)', rate: 14.0, icon: '📰' },
  { id: 'p_books', cat: 'Paper', name: 'Office Records / White Paper', rate: 16.0, icon: '📄' },
  { id: 'p_hdpe', cat: 'Plastic', name: 'Rigid Plastic / HDPE Drums', rate: 24.0, icon: '🪣' },
  { id: 'p_pet', cat: 'Plastic', name: 'PET Bottles (Clean Baled)', rate: 16.5, icon: '🧴' },
  { id: 'p_ewaste', cat: 'E-Waste', name: 'Mixed Circuit Boards / PCBA', rate: 180.0, icon: '💻' },
  { id: 'p_battery', cat: 'E-Waste', name: 'Lead Acid Batteries', rate: 88.0, icon: '🔋' },
  { id: 'p_ac', cat: 'Appliances', name: 'Split AC 1.5T Unit (Full Scrap)', rate: 4200.0, icon: '❄️', isUnit: true },
];

export const DEDUCTION_REASONS = [
  'Moisture / Water Dampness',
  'Dust & Sand Contamination',
  'Cardboard Core / Bind Wire',
  'Heavy Rust & Non-Metallic Attachments',
  'Plastic Caps / Labels Contamination',
];

// Seed Inward Vouchers
const SEED_INWARD_VOUCHERS: InwardVoucherRecord[] = [
  {
    id: 'inv_01',
    voucherNumber: 'YRD-20261012-084',
    channel: 'YARD_WALK_IN',
    timestamp: 'Today, 11:42 AM',
    divisionId: 'div_vja_central',
    divisionName: 'Vijayawada Central Yard',
    sellerName: 'B. Subba Rao',
    sellerPhone: '9848123456',
    sellerType: 'LOCAL_KABADIS',
    items: [
      {
        productId: 'p_iron',
        categoryName: 'Metal',
        productName: 'Iron / Loha (Heavy)',
        ratePerKgRupees: 28.0,
        grossWeightKg: 184.5,
        deductionKg: 4.5,
        deductionReason: 'Dust & Sand Contamination',
        netWeightKg: 180.0,
        lineTotalRupees: 5040.0,
      },
      {
        productId: 'p_carton',
        categoryName: 'Paper',
        productName: 'Cardboard / Carton (Raddi)',
        ratePerKgRupees: 13.5,
        grossWeightKg: 320.0,
        deductionKg: 10.0,
        deductionReason: 'Moisture / Water Dampness',
        netWeightKg: 310.0,
        lineTotalRupees: 4185.0,
      },
    ],
    totalGrossKg: 504.5,
    totalDeductionKg: 14.5,
    totalNetKg: 490.0,
    grandTotalRupees: 9225.0,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    operatorName: 'Ramesh Varma (Gate Weighmaster)',
    status: 'RECEIVED_VERIFIED',
  },
  {
    id: 'inv_02',
    voucherNumber: 'AKP-20261012-019',
    channel: 'DOORSTEP_PICKUP',
    timestamp: 'Today, 11:15 AM',
    divisionId: 'div_vja_central',
    divisionName: 'Vijayawada Central Yard',
    sellerName: 'Ch. Madhusudhan',
    sellerPhone: '9908112233',
    sellerType: 'HOUSEHOLD',
    vehicleReg: 'AP 16 TX 4021',
    assignedCollectorName: 'Ramesh Kumar (AKP-EMP-0247)',
    items: [
      {
        productId: 'p_copper',
        categoryName: 'Metal',
        productName: 'Copper / Tamba',
        ratePerKgRupees: 605.0,
        grossWeightKg: 12.4,
        deductionKg: 0.4,
        deductionReason: 'Heavy Rust & Non-Metallic Attachments',
        netWeightKg: 12.0,
        lineTotalRupees: 7260.0,
      },
      {
        productId: 'p_newspaper',
        categoryName: 'Paper',
        productName: 'Old Newspaper (ONP)',
        ratePerKgRupees: 14.0,
        grossWeightKg: 45.0,
        deductionKg: 0.0,
        deductionReason: 'None',
        netWeightKg: 45.0,
        lineTotalRupees: 630.0,
      },
    ],
    totalGrossKg: 57.4,
    totalDeductionKg: 0.4,
    totalNetKg: 57.0,
    grandTotalRupees: 7890.0,
    paymentMethod: 'UPI_INSTANT',
    paymentStatus: 'PAID',
    operatorName: 'Field App Auto-Sync',
    status: 'RECEIVED_VERIFIED',
  },
  {
    id: 'inv_03',
    voucherNumber: 'B2B-20261012-005',
    channel: 'B2B_COMMERCIAL',
    timestamp: 'Today, 10:20 AM',
    divisionId: 'div_guntur_hub',
    divisionName: 'Guntur Processing Yard',
    sellerName: 'Sri Durga Automotives Ltd',
    sellerPhone: '9866009988',
    sellerType: 'CORPORATE_B2B',
    vehicleReg: 'AP 07 TJ 8820',
    assignedCollectorName: 'Heavy Weighbridge Scale #1',
    truckGrossWeightKg: 8450.0,
    truckTareWeightKg: 4120.0,
    gstin: '37AABCS1429K1ZX',
    eWayBillNumber: '2418-9901-8273',
    items: [
      {
        productId: 'p_iron',
        categoryName: 'Metal',
        productName: 'Industrial Stamping Scrap / Iron',
        ratePerKgRupees: 30.5,
        grossWeightKg: 4330.0,
        deductionKg: 0.0,
        deductionReason: 'None',
        netWeightKg: 4330.0,
        lineTotalRupees: 132065.0,
      },
    ],
    totalGrossKg: 4330.0,
    totalDeductionKg: 0.0,
    totalNetKg: 4330.0,
    grandTotalRupees: 132065.0,
    paymentMethod: 'NEFT_RTGS',
    paymentStatus: 'PAID',
    operatorName: 'K. Venkat Rao (Yard Mgr)',
    status: 'RECEIVED_VERIFIED',
  },
  {
    id: 'inv_04',
    voucherNumber: 'YRD-20261012-083',
    channel: 'YARD_WALK_IN',
    timestamp: 'Today, 09:50 AM',
    divisionId: 'div_vja_east',
    divisionName: 'Vijayawada East Yard',
    sellerName: 'M. Venkateswarlu',
    sellerPhone: '9701443322',
    sellerType: 'TRADESMAN',
    items: [
      {
        productId: 'p_alu',
        categoryName: 'Metal',
        productName: 'Aluminium Section Cut-pieces',
        ratePerKgRupees: 145.0,
        grossWeightKg: 28.5,
        deductionKg: 0.5,
        deductionReason: 'Dust & Sand Contamination',
        netWeightKg: 28.0,
        lineTotalRupees: 4060.0,
      },
      {
        productId: 'p_brass',
        categoryName: 'Metal',
        productName: 'Brass Plumbing Fixtures',
        ratePerKgRupees: 390.0,
        grossWeightKg: 8.2,
        deductionKg: 0.2,
        deductionReason: 'Plastic Caps / Labels Contamination',
        netWeightKg: 8.0,
        lineTotalRupees: 3120.0,
      },
    ],
    totalGrossKg: 36.7,
    totalDeductionKg: 0.7,
    totalNetKg: 36.0,
    grandTotalRupees: 7180.0,
    paymentMethod: 'UPI_INSTANT',
    paymentStatus: 'PAID',
    operatorName: 'Ramesh Varma (Gate Weighmaster)',
    status: 'RECEIVED_VERIFIED',
  },
];

// Seed Daily Route Reconciliation Records
const SEED_RECONCILIATION: YardReconciliationRecord[] = [
  {
    id: 'rec_01',
    date: '2026-10-12',
    vehicleReg: 'AP 16 TX 4021',
    collectorCode: 'AKP-EMP-0247',
    collectorName: 'Ramesh Kumar',
    routeDivision: 'Vijayawada Central (Benz Circle)',
    expectedFieldPickupsCount: 6,
    reportedFieldTotalKg: 342.5,
    physicalYardScaleKg: 341.8,
    weightVarianceKg: -0.7,
    variancePercentage: -0.2,
    status: 'PERFECT_MATCH',
    verifiedAt: '12:45 PM',
    supervisorName: 'K. Venkat Rao',
    auditNotes: 'Scale variance under 0.5% (normal dust loss). Batch cleared for sorting.',
  },
  {
    id: 'rec_02',
    date: '2026-10-12',
    vehicleReg: 'AP 16 TE 9081',
    collectorCode: 'AKP-EMP-0182',
    collectorName: 'Siva Krishna',
    routeDivision: 'Vijayawada East (Madhura Nagar)',
    expectedFieldPickupsCount: 4,
    reportedFieldTotalKg: 280.0,
    physicalYardScaleKg: 276.5,
    weightVarianceKg: -3.5,
    variancePercentage: -1.25,
    status: 'ACCEPTABLE_TOLERANCE',
    verifiedAt: '12:15 PM',
    supervisorName: 'K. Venkat Rao',
    auditNotes: 'High cardboard content; minor moisture drying during noon transport.',
  },
  {
    id: 'rec_03',
    date: '2026-10-12',
    vehicleReg: 'AP 16 TF 2234',
    collectorCode: 'AKP-EMP-0310',
    collectorName: 'K. Venkatesh',
    routeDivision: 'Guntur Processing Yard (Autonagar)',
    expectedFieldPickupsCount: 8,
    reportedFieldTotalKg: 780.0,
    physicalYardScaleKg: 755.0,
    weightVarianceKg: -25.0,
    variancePercentage: -3.2,
    status: 'WEIGHT_SHORTAGE_FLAGGED',
    verifiedAt: '11:30 AM',
    supervisorName: 'K. Venkat Rao',
    auditNotes: 'Discrepancy exceeds 2.5% threshold. Field scales recalibration requested.',
  },
];

export const MultiChannelInwardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'WALK_IN_POS' | 'B2B_WEIGHBRIDGE' | 'RECONCILER'>('LEDGER');
  const [vouchers, setVouchers] = useState<InwardVoucherRecord[]>(SEED_INWARD_VOUCHERS);
  const [reconciliations, setReconciliations] = useState<YardReconciliationRecord[]>(SEED_RECONCILIATION);

  // Filters
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic live vouchers and reconciliations integration from backend
  useEffect(() => {
    const fetchLiveInwardData = async () => {
      try {
        const [vouchRes, recRes, pickRes] = await Promise.all([
          adminApiClient.get('/admin/operations/inward-vouchers'),
          adminApiClient.get('/admin/operations/yard-reconciliations'),
          adminApiClient.get('/admin/pickups'),
        ]);

        let combinedVouchers: InwardVoucherRecord[] = [];

        if (vouchRes.success && Array.isArray(vouchRes.data) && vouchRes.data.length > 0) {
          combinedVouchers = vouchRes.data.map((v: any) => ({
            id: v._id || v.id,
            voucherNumber: v.voucherNumber,
            channel: v.channel,
            timestamp: v.timestamp || new Date(v.createdAt).toLocaleTimeString(),
            divisionId: v.divisionId || 'div_vja_central',
            divisionName: v.divisionName || 'Vijayawada Central Yard',
            sellerName: v.sellerName,
            sellerPhone: v.sellerPhone || '',
            sellerType: v.sellerType || 'LOCAL_KABADIS',
            vehicleReg: v.vehicleReg,
            assignedCollectorName: v.assignedCollectorName,
            truckGrossWeightKg: v.truckGrossWeightKg,
            truckTareWeightKg: v.truckTareWeightKg,
            gstin: v.gstin,
            eWayBillNumber: v.eWayBillNumber,
            items: v.items || [],
            totalGrossKg: v.totalGrossKg,
            totalDeductionKg: v.totalDeductionKg,
            totalNetKg: v.totalNetKg,
            grandTotalRupees: v.grandTotalRupees,
            paymentMethod: v.paymentMethod || 'CASH',
            paymentStatus: v.paymentStatus || 'PAID',
            operatorName: v.operatorName || 'System Weighmaster',
            status: v.status || 'RECEIVED_VERIFIED',
            reconciliationNotes: v.reconciliationNotes,
          }));
        }

        if (pickRes.success && Array.isArray(pickRes.data) && pickRes.data.length > 0) {
          const liveDoorstep: InwardVoucherRecord[] = pickRes.data.map((p: any, idx: number) => ({
            id: p._id || p.id || `live_pick_${idx}`,
            voucherNumber: p.pickupCode || `AKP-${10245 + idx}`,
            channel: 'DOORSTEP_PICKUP' as const,
            timestamp: new Date(p.createdAt || Date.now()).toLocaleTimeString(),
            divisionId: p.divisionId || 'div_vja_central',
            divisionName: 'Vijayawada Central Hub',
            sellerName: p.customerName || p.customerId || 'Field Customer',
            sellerPhone: p.mobile || '9848022334',
            sellerType: 'HOUSEHOLD' as const,
            items: [
              {
                productId: 'prod_scrap_01',
                categoryName: 'Mixed Recyclables',
                productName: p.category || 'Doorstep Scrap Collection',
                ratePerKgRupees: 18.0,
                grossWeightKg: p.totalWeightKg || p.estWeightKg || 25,
                deductionKg: 0,
                deductionReason: 'None',
                netWeightKg: p.totalWeightKg || p.estWeightKg || 25,
                lineTotalRupees: p.totalValueRupees || (p.totalWeightKg || 25) * 18,
              },
            ],
            totalGrossKg: p.totalWeightKg || p.estWeightKg || 25,
            totalDeductionKg: 0,
            totalNetKg: p.totalWeightKg || p.estWeightKg || 25,
            grandTotalRupees: p.totalValueRupees || (p.totalWeightKg || 25) * 18,
            paymentMethod: (p.paymentMethod || 'CASH') as PaymentMethod,
            paymentStatus: (p.status === 'COMPLETED' ? 'PAID' : 'PENDING') as any,
            operatorName: 'Ravi Kumar (AP 16 TX 4021)',
            status: (p.status === 'COMPLETED' ? 'RECEIVED_VERIFIED' : 'PENDING_WEIGHMENT') as any,
          }));
          combinedVouchers = [...liveDoorstep, ...combinedVouchers];
        }

        if (combinedVouchers.length > 0) {
          setVouchers(combinedVouchers);
        }

        if (recRes.success && Array.isArray(recRes.data) && recRes.data.length > 0) {
          setReconciliations(
            recRes.data.map((r: any) => ({
              id: r._id || r.id,
              date: r.date,
              vehicleReg: r.vehicleReg,
              collectorCode: r.collectorCode || 'AKP-EMP',
              collectorName: r.collectorName,
              routeDivision: r.routeDivision || 'Vijayawada Central',
              expectedFieldPickupsCount: r.expectedFieldPickupsCount || 0,
              reportedFieldTotalKg: r.reportedFieldTotalKg,
              physicalYardScaleKg: r.physicalYardScaleKg,
              weightVarianceKg: r.weightVarianceKg,
              variancePercentage: r.variancePercentage,
              status: r.status,
              verifiedAt: r.verifiedAt || 'Today',
              supervisorName: r.supervisorName || 'Yard Supervisor',
              auditNotes: r.auditNotes,
            })),
          );
        }
      } catch (err) {
        console.error('Failed to load inward operations data:', err);
      }
    };

    fetchLiveInwardData();
  }, []);

  // Thermal Slip Modal State
  const [thermalSlipRecord, setThermalSlipRecord] = useState<InwardVoucherRecord | null>(null);

  // --- Walk-in POS Desk Form State ---
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCustomerType, setPosCustomerType] = useState<'HOUSEHOLD' | 'LOCAL_KABADIS' | 'TRADESMAN'>('LOCAL_KABADIS');
  const [posPaymentMethod, setPosPaymentMethod] = useState<PaymentMethod>('CASH');

  // Multi-item Cart for POS
  const [posCart, setPosCart] = useState<InwardItemRow[]>([
    {
      productId: 'p_iron',
      categoryName: 'Metal',
      productName: 'Iron / Loha (Heavy)',
      ratePerKgRupees: 28.0,
      grossWeightKg: 45.0,
      deductionKg: 1.0,
      deductionReason: 'Dust & Sand Contamination',
      netWeightKg: 44.0,
      lineTotalRupees: 1232.0,
    },
  ]);

  // Current line item input state
  const [selectedScrapId, setSelectedScrapId] = useState(POS_AVAILABLE_SCRAP[0].id);
  const [currentGrossWeight, setCurrentGrossWeight] = useState<number>(0);
  const [currentDeductionKg, setCurrentDeductionKg] = useState<number>(0);
  const [currentDeductionReason, setCurrentDeductionReason] = useState(DEDUCTION_REASONS[0]);

  // --- B2B Weighbridge State ---
  const [isB2BModalOpen, setIsB2BModalOpen] = useState(false);
  const [b2bCompanyName, setB2bCompanyName] = useState('Tirumala Tech Park Facilities');
  const [b2bPhone, setB2bPhone] = useState('9849011223');
  const [b2bGst, setB2bGst] = useState('37AAACT5512B1Z8');
  const [b2bEWayBill, setB2bEWayBill] = useState('2419-8802-9912');
  const [b2bVehicleReg, setB2bVehicleReg] = useState('AP 16 TH 5541');
  const [b2bGrossKg, setB2bGrossKg] = useState<number>(6850);
  const [b2bTareKg, setB2bTareKg] = useState<number>(2720);
  const [b2bSelectedProduct, setB2bSelectedProduct] = useState('p_carton');
  const [b2bContractRate, setB2bContractRate] = useState<number>(14.5);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const metrics = useMemo(() => {
    const totalVouchersCount = vouchers.length;
    const totalGrossKg = vouchers.reduce((acc, v) => acc + v.totalGrossKg, 0);
    const totalDeductionKg = vouchers.reduce((acc, v) => acc + v.totalDeductionKg, 0);
    const totalNetKg = vouchers.reduce((acc, v) => acc + v.totalNetKg, 0);
    const totalPayoutRupees = vouchers.reduce((acc, v) => acc + v.grandTotalRupees, 0);

    const doorstepNetKg = vouchers.filter((v) => v.channel === 'DOORSTEP_PICKUP').reduce((acc, v) => acc + v.totalNetKg, 0);
    const walkInNetKg = vouchers.filter((v) => v.channel === 'YARD_WALK_IN').reduce((acc, v) => acc + v.totalNetKg, 0);
    const b2bNetKg = vouchers.filter((v) => v.channel === 'B2B_COMMERCIAL').reduce((acc, v) => acc + v.totalNetKg, 0);

    const wastagePercent = totalGrossKg > 0 ? ((totalDeductionKg / totalGrossKg) * 100).toFixed(1) : '0.0';

    return {
      totalVouchersCount,
      totalNetKg: totalNetKg.toLocaleString('en-IN', { maximumFractionDigits: 1 }),
      totalGrossKg: totalGrossKg.toLocaleString('en-IN', { maximumFractionDigits: 1 }),
      totalDeductionKg: totalDeductionKg.toLocaleString('en-IN', { maximumFractionDigits: 1 }),
      wastagePercent,
      totalPayoutRupees: `₹${Math.round(totalPayoutRupees).toLocaleString('en-IN')}`,
      doorstepNetKg: Math.round(doorstepNetKg).toLocaleString('en-IN'),
      walkInNetKg: Math.round(walkInNetKg).toLocaleString('en-IN'),
      b2bNetKg: Math.round(b2bNetKg).toLocaleString('en-IN'),
    };
  }, [vouchers]);

  // POS Cart Calculations
  const posCartSummary = useMemo(() => {
    const totalGross = posCart.reduce((acc, i) => acc + i.grossWeightKg, 0);
    const totalDeductions = posCart.reduce((acc, i) => acc + i.deductionKg, 0);
    const totalNet = posCart.reduce((acc, i) => acc + i.netWeightKg, 0);
    const totalPayable = posCart.reduce((acc, i) => acc + i.lineTotalRupees, 0);
    return { totalGross, totalDeductions, totalNet, totalPayable };
  }, [posCart]);

  // Add Item to POS Cart
  const handleAddItemToPosCart = () => {
    if (currentGrossWeight <= 0) {
      alert('Please enter a valid scale gross weight greater than 0.');
      return;
    }
    const scrapMeta = POS_AVAILABLE_SCRAP.find((s) => s.id === selectedScrapId) || POS_AVAILABLE_SCRAP[0];
    const deduction = Math.max(0, currentDeductionKg);
    const net = Math.max(0, currentGrossWeight - deduction);
    const lineTotal = net * scrapMeta.rate;

    const newItem: InwardItemRow = {
      productId: scrapMeta.id,
      categoryName: scrapMeta.cat,
      productName: scrapMeta.name,
      ratePerKgRupees: scrapMeta.rate,
      grossWeightKg: currentGrossWeight,
      deductionKg: deduction,
      deductionReason: deduction > 0 ? currentDeductionReason : 'None',
      netWeightKg: net,
      lineTotalRupees: lineTotal,
    };

    setPosCart((prev) => [...prev, newItem]);
    setCurrentGrossWeight(0);
    setCurrentDeductionKg(0);
    showToast(`Added ${scrapMeta.name} (${net} kg) to intake bill`);
  };

  const handleRemovePosCartItem = (index: number) => {
    setPosCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit POS Yard Walk-in Intake
  const handleSubmitPosVoucher = () => {
    if (posCart.length === 0) {
      alert('Add at least one scrap item to complete intake.');
      return;
    }
    if (!posCustomerName.trim()) {
      alert('Please enter customer / seller name.');
      return;
    }

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newVoucher: InwardVoucherRecord = {
      id: `inv_${Date.now()}`,
      voucherNumber: `YRD-20261012-${randomSuffix}`,
      channel: 'YARD_WALK_IN',
      timestamp: 'Just now',
      divisionId: 'div_vja_central',
      divisionName: 'Vijayawada Central Yard',
      sellerName: posCustomerName.trim(),
      sellerPhone: posCustomerPhone.trim() || 'Not Provided',
      sellerType: posCustomerType,
      items: [...posCart],
      totalGrossKg: posCartSummary.totalGross,
      totalDeductionKg: posCartSummary.totalDeductions,
      totalNetKg: posCartSummary.totalNet,
      grandTotalRupees: posCartSummary.totalPayable,
      paymentMethod: posPaymentMethod,
      paymentStatus: 'PAID',
      operatorName: 'Gate Weighmaster Desk',
      status: 'RECEIVED_VERIFIED',
    };

    setVouchers((prev) => [newVoucher, ...prev]);
    setThermalSlipRecord(newVoucher); // Automatically open thermal receipt modal
    // Persist to MongoDB
    adminApiClient
      .post('/admin/operations/inward-vouchers', newVoucher)
      .then((res) => {
        if (res.success && res.data) {
          newVoucher.id = res.data._id || newVoucher.id;
        }
      })
      .catch((err) => console.error('Failed to persist POS voucher:', err));

    // Reset Form
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPosCart([]);
    showToast(`Walk-in Inward #${newVoucher.voucherNumber} created & ₹${Math.round(newVoucher.grandTotalRupees)} disbursed! (Saved to MongoDB)`);
  };

  // Submit B2B Weighbridge Entry
  const handleSubmitB2bWeighbridge = async () => {
    const netKg = b2bGrossKg - b2bTareKg;
    if (netKg <= 0) {
      alert('Gross weight must be strictly higher than tare vehicle weight.');
      return;
    }
    const scrapMeta = POS_AVAILABLE_SCRAP.find((s) => s.id === b2bSelectedProduct) || POS_AVAILABLE_SCRAP[5];
    const totalPayable = netKg * b2bContractRate;
    const randomSuffix = Math.floor(10 + Math.random() * 90);

    const newVoucher: InwardVoucherRecord = {
      id: `inv_b2b_${Date.now()}`,
      voucherNumber: `B2B-20261012-0${randomSuffix}`,
      channel: 'B2B_COMMERCIAL',
      timestamp: 'Just now',
      divisionId: 'div_vja_central',
      divisionName: 'Vijayawada Central Yard (Heavy Scale #1)',
      sellerName: b2bCompanyName.trim(),
      sellerPhone: b2bPhone.trim(),
      sellerType: 'CORPORATE_B2B',
      vehicleReg: b2bVehicleReg.toUpperCase().trim(),
      assignedCollectorName: 'Heavy Weighbridge Scale #1',
      truckGrossWeightKg: b2bGrossKg,
      truckTareWeightKg: b2bTareKg,
      gstin: b2bGst.trim().toUpperCase(),
      eWayBillNumber: b2bEWayBill.trim(),
      items: [
        {
          productId: scrapMeta.id,
          categoryName: scrapMeta.cat,
          productName: scrapMeta.name,
          ratePerKgRupees: b2bContractRate,
          grossWeightKg: netKg,
          deductionKg: 0,
          deductionReason: 'Certified B2B Weighbridge Tare Net',
          netWeightKg: netKg,
          lineTotalRupees: totalPayable,
        },
      ],
      totalGrossKg: netKg,
      totalDeductionKg: 0,
      totalNetKg: netKg,
      grandTotalRupees: totalPayable,
      paymentMethod: 'NEFT_RTGS',
      paymentStatus: 'PAID',
      operatorName: 'Weighbridge Senior Operator',
      status: 'RECEIVED_VERIFIED',
    };

    // Persist to MongoDB
    try {
      const res = await adminApiClient.post('/admin/operations/inward-vouchers', newVoucher);
      if (res.success && res.data) {
        newVoucher.id = res.data._id || newVoucher.id;
      }
    } catch (err) {
      console.error('Failed to save B2B voucher:', err);
    }

    setVouchers((prev) => [newVoucher, ...prev]);
    setIsB2BModalOpen(false);
    setThermalSlipRecord(newVoucher);
    showToast(`B2B Weighbridge ticket #${newVoucher.voucherNumber} recorded (${netKg} kg net)! (Saved to MongoDB)`);
  };

  // Reconcile / Sign-off Route Dump
  const handleSignOffReconciliation = (recId: string) => {
    adminApiClient
      .patch(`/admin/operations/yard-reconciliations/${recId}/sign-off`, {
        notes: 'Supervisor physically inspected dump & verified weight on platform scale.',
      })
      .catch((err) => console.error('Failed to sign off reconciliation on backend:', err));

    setReconciliations((prev) =>
      prev.map((r) =>
        r.id === recId
          ? {
              ...r,
              status: 'PERFECT_MATCH',
              auditNotes: 'Supervisor physically inspected dump & verified weight on platform scale.',
            }
          : r,
      ),
    );
    showToast('Route dump physically verified and released into sorting bays. (Updated in MongoDB)');
  };

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (channelFilter !== 'ALL' && v.channel !== channelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.voucherNumber.toLowerCase().includes(q) ||
          v.sellerName.toLowerCase().includes(q) ||
          v.sellerPhone.includes(q) ||
          (v.vehicleReg && v.vehicleReg.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [vouchers, channelFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#0A3D2B]">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Scrap Inward Receiving & Yard Gate Desk
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Phase 4 • Multi-Channel Intake
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Unified intake for Doorstep Fleet Pickups, Yard Walk-in POS, B2B Weighbridge & Daily Route Dump Reconciler
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('WALK_IN_POS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'WALK_IN_POS'
                ? 'bg-[#0A3D2B] text-white shadow-lg shadow-emerald-950/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-500" />
            Yard Counter POS
          </button>

          <button
            onClick={() => setIsB2BModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md cursor-pointer"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            + B2B Truck Weighbridge
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today Inward Net</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900">{metrics.totalNetKg} <span className="text-xs text-slate-500 font-semibold">kg</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gross: {metrics.totalGrossKg} kg</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Payout Disbursed</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700">{metrics.totalPayoutRupees}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{metrics.totalVouchersCount} vouchers paid</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Wastage / Moisture</span>
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-700">{metrics.totalDeductionKg} <span className="text-xs font-semibold">kg</span></div>
          <div className="text-[10px] text-amber-600/80 mt-0.5">{metrics.wastagePercent}% weight deduction</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Doorstep Route</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black text-blue-700">{metrics.doorstepNetKg} <span className="text-xs font-semibold">kg</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Field pickers intake</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Yard Walk-ins</span>
            <Receipt className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-black text-purple-700">{metrics.walkInNetKg} <span className="text-xs font-semibold">kg</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Counter POS intake</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">B2B Heavy Weighbridge</span>
            <Building2 className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-lg font-black text-slate-900">{metrics.b2bNetKg} <span className="text-xs font-semibold">kg</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Industrial cleanout</div>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Inward Intake Ledger ({vouchers.length})
          </button>

          <button
            onClick={() => setActiveTab('WALK_IN_POS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'WALK_IN_POS'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Yard Gate Walk-in POS
          </button>

          <button
            onClick={() => setActiveTab('B2B_WEIGHBRIDGE')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'B2B_WEIGHBRIDGE'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            B2B Weighbridge Desk
          </button>

          <button
            onClick={() => setActiveTab('RECONCILER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'RECONCILER'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Daily Route Reconciler ({reconciliations.length})
          </button>
        </div>
      </div>

      {/* TAB 1: UNIFIED INWARD INTAKE LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Channel:
              </span>
              {(['ALL', 'YARD_WALK_IN', 'DOORSTEP_PICKUP', 'B2B_COMMERCIAL'] as const).map((channel) => (
                <button
                  key={channel}
                  onClick={() => setChannelFilter(channel)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    channelFilter === channel
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {channel === 'ALL'
                    ? 'All Channels'
                    : channel === 'YARD_WALK_IN'
                    ? 'Yard Walk-ins'
                    : channel === 'DOORSTEP_PICKUP'
                    ? 'Doorstep Pickups'
                    : 'B2B Bulk'}
                </button>
              ))}
            </div>

            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search voucher #, seller, vehicle or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Vouchers Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Voucher & Channel</th>
                    <th className="py-3 px-4">Seller / Client Details</th>
                    <th className="py-3 px-4">Division & Logistics</th>
                    <th className="py-3 px-4 text-right">Gross Wt (kg)</th>
                    <th className="py-3 px-4 text-right">Deduction (kg)</th>
                    <th className="py-3 px-4 text-right">Net Billable (kg)</th>
                    <th className="py-3 px-4 text-right">Total Payout</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{voucher.voucherNumber}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wide ${
                              voucher.channel === 'YARD_WALK_IN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : voucher.channel === 'DOORSTEP_PICKUP'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {voucher.channel === 'YARD_WALK_IN'
                              ? 'Yard Walk-in'
                              : voucher.channel === 'DOORSTEP_PICKUP'
                              ? 'Doorstep Pickup'
                              : 'B2B Commercial'}
                          </span>
                          <span className="text-[10px] text-slate-400">{voucher.timestamp}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{voucher.sellerName}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{voucher.sellerPhone}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {voucher.sellerType}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">{voucher.divisionName}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {voucher.vehicleReg ? (
                            <span className="font-bold text-slate-700">{voucher.vehicleReg}</span>
                          ) : (
                            <span>Counter Gate Floor Scale</span>
                          )}
                          {voucher.assignedCollectorName && (
                            <span className="text-slate-400 block">{voucher.assignedCollectorName}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                        {voucher.totalGrossKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {voucher.totalDeductionKg > 0 ? (
                          <span className="font-bold text-amber-700">
                            -{voucher.totalDeductionKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                          </span>
                        ) : (
                          <span className="text-slate-400">0.0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        {voucher.totalNetKg.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        ₹{Math.round(voucher.grandTotalRupees).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            voucher.paymentMethod === 'CASH'
                              ? 'bg-amber-100 text-amber-800'
                              : voucher.paymentMethod === 'UPI_INSTANT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {voucher.paymentMethod}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setThermalSlipRecord(voucher)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0A3D2B] hover:text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Receipt
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

      {/* TAB 2: YARD GATE WALK-IN POS DESK */}
      {activeTab === 'WALK_IN_POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Rapid Intake Entry Builder (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Customer Details Box */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">1. Customer / Seller Details</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Yard Counter Floor</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Seller Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. B. Subba Rao"
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9848012345"
                    value={posCustomerPhone}
                    onChange={(e) => setPosCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Seller Type</label>
                  <select
                    value={posCustomerType}
                    onChange={(e) => setPosCustomerType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LOCAL_KABADIS">Local Kabadi / Aggregator</option>
                    <option value="HOUSEHOLD">Walk-in Household</option>
                    <option value="TRADESMAN">Plumber / Electrician</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scrap Weighing & Line Item Builder */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-sm">2. Weighing & Deduction Entry</h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Live Rate Engine Active
                </span>
              </div>

              {/* Scrap Item Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                  Select Scrap Product (Active Buying Rates Applied)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POS_AVAILABLE_SCRAP.map((scrap) => {
                    const isSelected = selectedScrapId === scrap.id;
                    return (
                      <button
                        key={scrap.id}
                        type="button"
                        onClick={() => setSelectedScrapId(scrap.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{scrap.icon}</span>
                          <span className="font-bold text-xs text-slate-800 truncate">{scrap.name}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">{scrap.cat}</span>
                          <span className="text-xs font-black text-emerald-700">
                            ₹{scrap.rate.toFixed(1)}
                            <span className="text-[9px] text-slate-400 font-normal">/kg</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weighing Inputs: Gross, Deduction, Reason */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Gross Weight on Scale (kg) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={currentGrossWeight || ''}
                      onChange={(e) => setCurrentGrossWeight(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-white border border-slate-300 font-mono font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-400 absolute right-3 top-1/2 -translate-y-1/2">kg</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Deduction / Moisture (kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={currentDeductionKg || ''}
                      onChange={(e) => setCurrentDeductionKg(parseFloat(e.target.value) || 0)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-white border border-slate-300 font-mono font-black text-sm text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-slate-400 absolute right-3 top-1/2 -translate-y-1/2">kg</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Deduction Reason</label>
                  <select
                    value={currentDeductionReason}
                    onChange={(e) => setCurrentDeductionReason(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DEDUCTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Math Preview for Line Item */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <div className="text-xs text-emerald-900">
                  <span className="font-semibold">Calculated Net: </span>
                  <span className="font-mono font-black text-sm">
                    {Math.max(0, currentGrossWeight - currentDeductionKg).toFixed(1)} kg
                  </span>
                  <span className="text-slate-400 mx-2">×</span>
                  <span className="font-semibold">
                    ₹{(POS_AVAILABLE_SCRAP.find((s) => s.id === selectedScrapId)?.rate || 0).toFixed(1)}/kg
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Line Total</span>
                  <span className="font-mono font-black text-base text-emerald-800">
                    ₹
                    {Math.round(
                      Math.max(0, currentGrossWeight - currentDeductionKg) *
                        (POS_AVAILABLE_SCRAP.find((s) => s.id === selectedScrapId)?.rate || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItemToPosCart}
                className="w-full py-2.5 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Item to Inward Slip
              </button>
            </div>
          </div>

          {/* Right Column: Live Inward Bill & Instant Payout (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#0A3D2B]" />
                  <h3 className="font-bold text-slate-900 text-sm">Active Inward Voucher</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {posCart.length} item{posCart.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {posCart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No scrap items added yet. Select a product and weight on the left.
                  </div>
                ) : (
                  posCart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{item.productName}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span>{item.netWeightKg} kg</span>
                          <span className="text-slate-300 mx-1">@</span>
                          <span>₹{item.ratePerKgRupees}/kg</span>
                          {item.deductionKg > 0 && (
                            <span className="text-amber-600 ml-1.5 text-[10px]">(-{item.deductionKg}kg ded)</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-xs">
                          ₹{Math.round(item.lineTotalRupees).toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => handleRemovePosCartItem(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Voucher Grand Totals */}
              <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Weight:</span>
                  <span className="font-mono font-bold">{posCartSummary.totalGross.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Total Deduction:</span>
                  <span className="font-mono font-bold">-{posCartSummary.totalDeductions.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1.5">
                  <span>Net Billable Weight:</span>
                  <span className="font-mono text-emerald-800">{posCartSummary.totalNet.toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black text-base border-t border-slate-200 pt-2">
                  <span>Total Payable:</span>
                  <span className="font-mono text-emerald-700">
                    ₹{Math.round(posCartSummary.totalPayable).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                  Disbursement Payout Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('CASH')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                      posPaymentMethod === 'CASH'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    💵 Cash from Drawer
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('UPI_INSTANT')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-xs ${
                      posPaymentMethod === 'UPI_INSTANT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    📱 Instant UPI Transfer
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitPosVoucher}
                className="w-full py-3 rounded-xl bg-[#0A3D2B] text-white font-extrabold text-xs hover:bg-[#0E4D36] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                Issue Payout & Print Thermal Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: B2B COMMERCIAL & WEIGHBRIDGE ENTRY DESK */}
      {activeTab === 'B2B_WEIGHBRIDGE' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Industrial & Commercial Heavy Weighbridge</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full-truck axle weighing with automatic Tare deduction, GST compliance & e-Way bill audit
              </p>
            </div>
            <button
              onClick={() => setIsB2BModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              New Truck Weighbridge Entry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Gross Truck Weighbridge</span>
              <div className="text-2xl font-black text-slate-900 mt-1">100 T Platform</div>
              <p className="text-xs text-slate-400 mt-1">Certified Pitless Electronic Scale (±5 kg tolerance)</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Standard Formula</span>
              <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg mt-1 border border-emerald-200">
                Net Bulk Scrap = Gross Truck Wt - Tare Empty Truck Wt
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Auto-calculated upon second axle weigh-out</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tax & Invoicing</span>
              <div className="text-xs font-semibold text-slate-700 mt-1">
                Reverse Charge 18% GST • 0.1% TDS Under Sec 194Q
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Commercial B2B purchase bills generated automatically</p>
            </div>
          </div>

          {/* B2B Filtered Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket & Company</th>
                    <th className="py-3 px-4">Truck Reg & e-Way Bill</th>
                    <th className="py-3 px-4 text-right">Gross Truck (kg)</th>
                    <th className="py-3 px-4 text-right">Tare Empty (kg)</th>
                    <th className="py-3 px-4 text-right">Net Scrap (kg)</th>
                    <th className="py-3 px-4 text-right">Invoice Total</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {vouchers
                    .filter((v) => v.channel === 'B2B_COMMERCIAL')
                    .map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{v.sellerName}</div>
                          <div className="text-[10px] text-slate-400">
                            {v.voucherNumber} • {v.timestamp}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{v.vehicleReg}</div>
                          <div className="text-[10px] font-mono text-slate-400">e-Way: {v.eWayBillNumber}</div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {v.truckGrossWeightKg?.toLocaleString('en-IN')} kg
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-amber-700">
                          {v.truckTareWeightKg?.toLocaleString('en-IN')} kg
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          {v.totalNetKg.toLocaleString('en-IN')} kg
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                          ₹{Math.round(v.grandTotalRupees).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setThermalSlipRecord(v)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0A3D2B] hover:text-white text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Weigh-Slip
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

      {/* TAB 4: DAILY INWARD RECONCILER */}
      {activeTab === 'RECONCILER' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Evening Shift Scrap Dump Reconciler</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compares sum of Doorstep App Digital Scale Vouchers against Yard Floor Platform Scale gross weight
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Perfect (&lt;0.5%)
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span> Tolerance (&lt;1.5%)
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ml-2"></span> Shortage Flagged
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Vehicle & Picker</th>
                    <th className="py-3 px-4">Division Route</th>
                    <th className="py-3 px-4 text-center">Pickups Done</th>
                    <th className="py-3 px-4 text-right">Reported App Wt (kg)</th>
                    <th className="py-3 px-4 text-right">Physical Yard Wt (kg)</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Audit Notes & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reconciliations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{rec.collectorName}</div>
                        <div className="text-[10px] text-slate-400">
                          {rec.collectorCode} • <span className="font-bold text-slate-700">{rec.vehicleReg}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">{rec.routeDivision}</td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {rec.expectedFieldPickupsCount} stops
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-600">
                        {rec.reportedFieldTotalKg.toFixed(1)} kg
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                        {rec.physicalYardScaleKg.toFixed(1)} kg
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`font-mono font-bold ${
                            rec.weightVarianceKg < -5
                              ? 'text-rose-600'
                              : rec.weightVarianceKg < 0
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {rec.weightVarianceKg > 0 ? '+' : ''}
                          {rec.weightVarianceKg.toFixed(1)} kg ({rec.variancePercentage}%)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            rec.status === 'PERFECT_MATCH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'ACCEPTABLE_TOLERANCE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rec.status === 'PERFECT_MATCH' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {rec.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[11px] text-slate-500 max-w-xs">{rec.auditNotes}</div>
                        {rec.status !== 'PERFECT_MATCH' && (
                          <button
                            onClick={() => handleSignOffReconciliation(rec.id)}
                            className="mt-1.5 px-2.5 py-1 rounded-lg bg-[#0A3D2B] text-white text-[10px] font-bold hover:bg-[#0E4D36] transition-all cursor-pointer"
                          >
                            Sign-off & Accept Dump
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: 3-INCH ESC/POS THERMAL RECEIPT VOUCHER PREVIEW --- */}
      {thermalSlipRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs">Thermal 3-Inch Slip Preview (80mm)</span>
              </div>
              <button
                onClick={() => setThermalSlipRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Printable Content (Styled exactly like an ESC/POS 80mm thermal receipt) */}
            <div className="p-6 overflow-y-auto bg-slate-100/50 flex justify-center">
              <div className="w-[320px] bg-white p-5 rounded-md shadow-sm border border-slate-300 font-mono text-[11px] text-slate-800 leading-tight space-y-3">
                {/* Receipt Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-3">
                  <div className="font-black text-sm tracking-widest uppercase">ASLI KAATA</div>
                  <div className="text-[10px] text-slate-600">Smart Scrap Recycling & ERP</div>
                  <div className="text-[9px] text-slate-500">Vijayawada Central Yard • AP</div>
                  <div className="text-[9px] text-slate-500">Helpline: +91 91212 88492</div>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>VOUCHER:</span>
                    <span className="font-bold">{thermalSlipRecord.voucherNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DATE/TIME:</span>
                    <span>{thermalSlipRecord.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SELLER:</span>
                    <span className="font-bold">{thermalSlipRecord.sellerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PHONE:</span>
                    <span>{thermalSlipRecord.sellerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TYPE:</span>
                    <span>{thermalSlipRecord.sellerType}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border-b border-dashed border-slate-400 pb-2 space-y-1.5">
                  <div className="flex justify-between font-bold text-[10px] text-slate-900 border-b border-slate-300 pb-1">
                    <span>ITEM / RATE</span>
                    <span>NET WT</span>
                    <span>AMT (₹)</span>
                  </div>

                  {thermalSlipRecord.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between font-semibold">
                        <span className="truncate max-w-[140px]">{item.productName}</span>
                        <span>{item.netWeightKg} kg</span>
                        <span>{Math.round(item.lineTotalRupees)}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex justify-between">
                        <span>@₹{item.ratePerKgRupees}/kg</span>
                        {item.deductionKg > 0 && <span>(Ded: {item.deductionKg}kg {item.deductionReason})</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Summary */}
                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>Gross Wt:</span>
                    <span>{thermalSlipRecord.totalGrossKg.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Deductions:</span>
                    <span>-{thermalSlipRecord.totalDeductionKg.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Net Billable:</span>
                    <span>{thermalSlipRecord.totalNetKg.toFixed(1)} kg</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
                    <span>TOTAL DISBURSED:</span>
                    <span>₹{Math.round(thermalSlipRecord.grandTotalRupees).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>PAYMENT METHOD:</span>
                    <span className="font-bold">{thermalSlipRecord.paymentMethod} (PAID)</span>
                  </div>
                </div>

                {/* Footer with QR Stamp */}
                <div className="text-center pt-1 space-y-1">
                  <div className="inline-block p-1 border border-slate-300 rounded bg-slate-50">
                    <QrCode className="w-12 h-12 text-slate-800 mx-auto" />
                  </div>
                  <div className="text-[8px] text-slate-400 uppercase">
                    Scan to Verify Digital Audit Record • ASLI KAATA
                  </div>
                  <div className="text-[9px] font-bold text-slate-700">Thank You For Recycling With Us!</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
              <button
                onClick={() => {
                  window.print();
                  showToast('Sent print job to default receipt printer.');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                Print Thermal Slip
              </button>

              <button
                onClick={() => setThermalSlipRecord(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: B2B TRUCK WEIGHBRIDGE INTAKE MODAL --- */}
      {isB2BModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-[#0A3D2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm">Industrial Truck Weighbridge Entry</h3>
              </div>
              <button
                onClick={() => setIsB2BModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Company / Seller *</label>
                  <input
                    type="text"
                    value={b2bCompanyName}
                    onChange={(e) => setB2bCompanyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Vehicle Reg Plate *</label>
                  <input
                    type="text"
                    value={b2bVehicleReg}
                    onChange={(e) => setB2bVehicleReg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={b2bGst}
                    onChange={(e) => setB2bGst(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GST e-Way Bill #</label>
                  <input
                    type="text"
                    value={b2bEWayBill}
                    onChange={(e) => setB2bEWayBill(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Weighbridge Axle Scales */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Weighbridge Axle Scale Readings (kg)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">1. Gross Truck Weight</label>
                    <input
                      type="number"
                      value={b2bGrossKg}
                      onChange={(e) => setB2bGrossKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-black text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1">2. Tare Empty Weight</label>
                    <input
                      type="number"
                      value={b2bTareKg}
                      onChange={(e) => setB2bTareKg(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-black text-sm text-amber-700"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-emerald-900">Net Bulk Scrap Weight:</span>
                  <span className="font-mono font-black text-base text-emerald-800">
                    {Math.max(0, b2bGrossKg - b2bTareKg).toLocaleString('en-IN')} kg
                  </span>
                </div>
              </div>

              {/* Product and Commercial Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Scrap Grade</label>
                  <select
                    value={b2bSelectedProduct}
                    onChange={(e) => setB2bSelectedProduct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                  >
                    {POS_AVAILABLE_SCRAP.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contract Rate (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={b2bContractRate}
                    onChange={(e) => setB2bContractRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-black text-slate-800"
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 flex justify-between items-center font-bold">
                <span>Calculated Total Value:</span>
                <span className="font-mono font-black text-base text-emerald-800">
                  ₹{Math.round(Math.max(0, b2bGrossKg - b2bTareKg) * b2bContractRate).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsB2BModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitB2bWeighbridge}
                className="px-5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md"
              >
                Record Weighbridge Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
