import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  JobCard, 
  JobType, 
  JobStatus, 
  MechanicalTask, 
  DentingPaintingItem, 
  JobCardPartItem, 
  InventoryItem,
  GarageSettings,
  CustomerMasterItem,
  Invoice,
  Vehicle
} from '../../types';
import { api } from '../../lib/api';
import { 
  Search, 
  Plus, 
  Printer, 
  Save, 
  FileText, 
  Trash2, 
  X, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronFirst, 
  ChevronLast, 
  ChevronDown,
  Edit3, 
  Check, 
  Receipt, 
  FileSpreadsheet, 
  AlertCircle, 
  ShoppingBag, 
  Package, 
  CheckCircle2, 
  Loader2,
  Clock,
  Calendar,
  Filter,
  Car
} from 'lucide-react';
import { PrintModalHeader } from '../Common/PrintModalHeader';
import { QuickAddPartModal } from '../Modals/QuickAddPartModal';
import { AdvancedItemSearchModal } from '../Modals/AdvancedItemSearchModal';
import { RequisitionPOModal } from '../Modals/RequisitionPOModal';
import { RequisitionIssueModal } from './RequisitionIssueModal';
import { JobCardPhotoAttachments } from './JobCardPhotoAttachments';
import { formatDate } from '../../utils/formatters';
import { JobCardPhoto } from '../../utils/photoStorage';
import { RecordToolbar } from '../Common/Workspace/RecordToolbar';
import { FindRecordModal, FindResultItem } from '../Common/FindRecordModal';
import { NajmAlHudaLogo } from '../Common/NajmAlHudaLogo';
import { useGarage } from '../../context/GarageContext';
import { getAllVehicleBrands, getVehicleModelsForBrand } from '../../data/vehiclePresets';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardData: Omit<JobCard, 'id' | 'jobNumber'>) => Promise<any> | any;
  initialData?: JobCard | null;
  inventory: InventoryItem[];
  settings: GarageSettings;
  customers?: CustomerMasterItem[];
  onGenerateInvoice?: (jobCardId: string) => void;
  onOpenInvoice?: (invoiceId: string) => void;
  allJobCards?: JobCard[];
  onSelectJobCard?: (card: JobCard) => void;
  onDeleteJobCard?: (id: string) => void;
  invoices?: Invoice[];
}

export const JobCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  inventory,
  settings,
  customers = [],
  onGenerateInvoice,
  onOpenInvoice,
  allJobCards = [],
  onSelectJobCard,
  onDeleteJobCard,
  invoices = [],
}) => {
  if (!isOpen) return null;

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'general' | 'remarks' | 'requisitions' | 'labor' | 'issues' | 'attachments'
  >('general');

  // Helpers for DD/MM/YYYY formatting
  const isoToDmy = (isoStr?: string | null): string => {
    if (!isoStr) return '';
    const trimmed = isoStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  };

  const dmyToIso = (dmyStr: string): string => {
    const trimmed = dmyStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
  };

  // Document Info
  const [docNumber, setDocNumber] = useState(initialData ? initialData.jobNumber : 'Loading...');
  const [docDate, setDocDate] = useState(initialData?.dateIn || new Date().toISOString().split('T')[0]);
  const [docDateDisplay, setDocDateDisplay] = useState(() => isoToDmy(initialData?.dateIn || new Date().toISOString().split('T')[0]));
  const [expectedDelivery, setExpectedDelivery] = useState(
    initialData?.expectedDelivery || initialData?.promisedDate || ''
  );
  const [expectedDeliveryDisplay, setExpectedDeliveryDisplay] = useState(() =>
    isoToDmy(initialData?.expectedDelivery || initialData?.promisedDate || '')
  );

  const dateInPickerRef = useRef<HTMLInputElement>(null);
  const expectedDeliveryPickerRef = useRef<HTMLInputElement>(null);

  // Load preview document number from backend for new job card
  useEffect(() => {
    if (!initialData) {
      api.getNextDocumentNumber('JOB_CARD')
        .then(res => {
          if (res?.code) {
            setDocNumber(res.code);
          }
        })
        .catch(() => {
          setDocNumber(`JC-0001`);
        });
    } else {
      setDocNumber(initialData.jobNumber);
    }
    if (initialData?.dateIn) {
      setDocDate(initialData.dateIn);
      setDocDateDisplay(isoToDmy(initialData.dateIn));
    }
    const exp = initialData?.expectedDelivery || initialData?.promisedDate || '';
    setExpectedDelivery(exp);
    setExpectedDeliveryDisplay(isoToDmy(exp));
  }, [initialData]);
  const [docTime, setDocTime] = useState(initialData?.timeIn || '09:00 AM');
  const [jobType, setJobType] = useState<JobType>(initialData?.jobType || 'Mechanical');
  const [reference, setReference] = useState(initialData?.reference || 'Direct Customer Walk-in');
  const [refDocNo, setRefDocNo] = useState(initialData?.refDocNo || '');
  const [supplEstNo, setSupplEstNo] = useState(initialData?.supplEstNo || '');
  const [serviceType, setServiceType] = useState(initialData?.serviceType || 'Normal');

  const handleDateInInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setDocDateDisplay(val);
    setHasUnsavedChanges(true);

    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length === 8 && !val.includes('/')) {
      val = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      setDocDateDisplay(val);
    }

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(val);
    if (match) {
      const [, d, m, y] = match;
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        setDocDate(`${y}-${m}-${d}`);
      }
    } else if (!val.trim()) {
      setDocDate('');
    }
  };

  const handleDateInBlur = () => {
    const digitsOnly = docDateDisplay.replace(/\D/g, '');
    if (digitsOnly.length === 8) {
      const formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      setDocDateDisplay(formatted);
      setDocDate(dmyToIso(formatted));
    } else if (!docDateDisplay.trim()) {
      setDocDate('');
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(docDateDisplay.trim()) && docDate) {
      setDocDateDisplay(isoToDmy(docDate));
    }
  };

  const handleExpectedDeliveryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setExpectedDeliveryDisplay(val);
    setHasUnsavedChanges(true);

    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length === 8 && !val.includes('/')) {
      val = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      setExpectedDeliveryDisplay(val);
    }

    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(val);
    if (match) {
      const [, d, m, y] = match;
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
        setExpectedDelivery(`${y}-${m}-${d}`);
      }
    } else if (!val.trim()) {
      setExpectedDelivery('');
    }
  };

  const handleExpectedDeliveryBlur = () => {
    const digitsOnly = expectedDeliveryDisplay.replace(/\D/g, '');
    if (digitsOnly.length === 8) {
      const formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      setExpectedDeliveryDisplay(formatted);
      setExpectedDelivery(dmyToIso(formatted));
    } else if (!expectedDeliveryDisplay.trim()) {
      setExpectedDelivery('');
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expectedDeliveryDisplay.trim()) && expectedDelivery) {
      setExpectedDeliveryDisplay(isoToDmy(expectedDelivery));
    }
  };

  // Customer Details
  const [customerName, setCustomerName] = useState(initialData?.customer?.name || '');
  const [customerAddress, setCustomerAddress] = useState(initialData?.customer?.address || '');
  const [customerAddressLine2, setCustomerAddressLine2] = useState('');
  const [customerEmail, setCustomerEmail] = useState(initialData?.customer?.email || '');
  const [contactPerson, setContactPerson] = useState(initialData?.customer?.contactPerson || '');
  const [mobileNo, setMobileNo] = useState(initialData?.customer?.phone || '');
  const [telephoneNo, setTelephoneNo] = useState(initialData?.customer?.telephone || '');
  const [faxNo, setFaxNo] = useState(initialData?.customer?.fax || '');

  // Insurance Details
  const [isInsuranceActive, setIsInsuranceActive] = useState(initialData?.insurance?.enabled || false);
  const [insuranceCompany, setInsuranceCompany] = useState(initialData?.insurance?.company || '');
  const [policyNo, setPolicyNo] = useState(initialData?.insurance?.policyNo || '');
  const [lpoRefNo, setLpoRefNo] = useState(initialData?.insurance?.lpoRefNo || '');
  const [claimType, setClaimType] = useState<'Full' | 'Part' | 'No'>(initialData?.insurance?.claimType || 'No');
  const [chargeExcessVat, setChargeExcessVat] = useState(initialData?.insurance?.chargeExcessVat || false);
  const [claimNo, setClaimNo] = useState(initialData?.insurance?.claimNo || '');

  // Vehicle Details
  const [vehicleMake, setVehicleMake] = useState(initialData?.vehicle?.make || '');
  const [vehicleModel, setVehicleModel] = useState(initialData?.vehicle?.model || '');
  const [vehicleYear, setVehicleYear] = useState<number | ''>(initialData?.vehicle?.year ? initialData.vehicle.year : '');
  const [regPrefix, setRegPrefix] = useState(initialData?.vehicle?.regPrefix || 'Private (QA)');
  const [regNo, setRegNo] = useState(initialData?.vehicle?.plateNumber || '');
  const [vehicleType, setVehicleType] = useState(initialData?.vehicle?.vehicleType || 'SUV');
  const [engineNo, setEngineNo] = useState(initialData?.vehicle?.engineNo || '');
  const [vinNo, setVinNo] = useState(initialData?.vehicle?.vin || '');
  const [tyreSize, setTyreSize] = useState(initialData?.vehicle?.tyreSize || '');
  const [vehicleColor, setVehicleColor] = useState(initialData?.vehicle?.color || '');
  const [fuelLevel, setFuelLevel] = useState<number | ''>(
    initialData?.vehicle?.fuelLevel !== undefined && initialData?.vehicle?.fuelLevel !== null 
      ? initialData.vehicle.fuelLevel 
      : ''
  );
  const [mileageKms, setMileageKms] = useState<number | ''>(
    initialData?.vehicle?.odometer !== undefined && initialData?.vehicle?.odometer !== null 
      ? initialData.vehicle.odometer 
      : ''
  );
  const [mileageUnit, setMileageUnit] = useState('Kms');
  const [lastServiceDate, setLastServiceDate] = useState(initialData?.vehicle?.lastServiceDate || '');
  const [lastServiceKms, setLastServiceKms] = useState(initialData?.vehicle?.lastServiceKms || 0);
  const [nextServiceDate, setNextServiceDate] = useState(initialData?.vehicle?.nextServiceDate || '');
  const [nextServiceKms, setNextServiceKms] = useState(initialData?.vehicle?.nextServiceKms || 0);
  const [policeFileNo, setPoliceFileNo] = useState(initialData?.vehicle?.policeFileNo || '');

  // Financial & Accounting State
  const [chargeType, setChargeType] = useState(initialData?.accounting?.chargeType || 'Cash');
  const [isLumpsum, setIsLumpsum] = useState(initialData?.accounting?.isLumpsum || false);
  const [lumpsumAmount, setLumpsumAmount] = useState(initialData?.accounting?.lumpsumAmount || 0);
  const [otherChargeManual, setOtherChargeManual] = useState(initialData?.accounting?.otherCharge || 0);
  const [customerAmount, setCustomerAmount] = useState(initialData?.accounting?.customerAmount || 0);
  const [discount, setDiscount] = useState(initialData?.discount || 0);
  const [advanceRecd, setAdvanceRecd] = useState(initialData?.accounting?.advanceReceived || 0);
  const [insuranceAmount, setInsuranceAmount] = useState(initialData?.accounting?.insuranceAmount || 0);
  const [insuranceDiscount, setInsuranceDiscount] = useState(initialData?.accounting?.insuranceDiscount || 0);
  const [insuranceAdvanceRecd, setInsuranceAdvanceRecd] = useState(initialData?.accounting?.insuranceAdvanceReceived || 0);

  // Line items and Garage context
  const { updateJobCard, issueMaterialToJobCard, returnMaterialFromJobCard, adjustStock, invoices: contextInvoices = [], closeAndInvoiceJobCard, deleteJobCard: contextDeleteJobCard, addCustomer, customers: contextCustomers = [], vehicles: contextVehicles = [], jobCards: contextJobCards = [] } = useGarage();
  const effectiveInvoices = invoices.length > 0 ? invoices : contextInvoices;
  
  const allAvailableCustomers = useMemo(() => {
    const map = new Map<string, CustomerMasterItem>();
    (customers || []).forEach(c => { if (c.id) map.set(c.id, c); });
    (contextCustomers || []).forEach(c => { if (c.id && !map.has(c.id)) map.set(c.id, c); });
    return Array.from(map.values());
  }, [customers, contextCustomers]);

  // Customer-to-Vehicles relationship index for cross-filtering (Reg No, Chassis No, Model)
  const customerVehiclesMap = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    (contextVehicles || []).forEach(v => {
      if (v.customerId) {
        const list = map.get(v.customerId) || [];
        list.push(v);
        map.set(v.customerId, list);
      }
      if (v.customerPhone) {
        const list = map.get(v.customerPhone) || [];
        if (!list.some(x => x.id === v.id)) {
          list.push(v);
          map.set(v.customerPhone, list);
        }
      }
    });
    (contextJobCards || []).forEach(jc => {
      const custId = jc.customer?.id;
      const phone = jc.customer?.phone || (jc as any).mobileNo;
      if (jc.regNo && (custId || phone)) {
        const key = custId || phone;
        const list = map.get(key) || [];
        if (!list.some(v => v.plateNumber?.toLowerCase() === jc.regNo?.toLowerCase())) {
          list.push({
            id: `jc-veh-${jc.id}`,
            customerId: custId || '',
            plateNumber: jc.regNo,
            vin: jc.vinNo,
            make: jc.vehicleMake || '',
            model: jc.vehicleModel || '',
            color: jc.vehicleColor,
            year: jc.vehicleYear ? Number(jc.vehicleYear) : undefined,
            engineNo: jc.engineNo
          });
          map.set(key, list);
        }
      }
    });
    return map;
  }, [contextVehicles, contextJobCards]);

  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerPhone2, setQuickCustomerPhone2] = useState('');
  const [quickCustomerEmail, setQuickCustomerEmail] = useState('');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState('');
  const [quickCustomerQID, setQuickCustomerQID] = useState('');
  const [quickCustomerError, setQuickCustomerError] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerSuccessNotice, setCustomerSuccessNotice] = useState<string | null>(null);

  const [showCustomerSearchModal, setShowCustomerSearchModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterRegNo, setFilterRegNo] = useState('');
  const [filterChassisNo, setFilterChassisNo] = useState('');
  const [filterModel, setFilterModel] = useState('');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCustomerName.trim()) count++;
    if (filterPhone.trim()) count++;
    if (filterRegNo.trim()) count++;
    if (filterChassisNo.trim()) count++;
    if (filterModel.trim()) count++;
    return count;
  }, [filterCustomerName, filterPhone, filterRegNo, filterChassisNo, filterModel]);

  const clearAllFilters = () => {
    setCustomerSearchQuery('');
    setFilterCustomerName('');
    setFilterPhone('');
    setFilterRegNo('');
    setFilterChassisNo('');
    setFilterModel('');
  };

  const filteredSearchCustomers = useMemo(() => {
    const generalQ = customerSearchQuery.toLowerCase().trim();
    const nameQ = filterCustomerName.toLowerCase().trim();
    const phoneQ = filterPhone.toLowerCase().trim();
    const regQ = filterRegNo.toLowerCase().trim();
    const chassisQ = filterChassisNo.toLowerCase().trim();
    const modelQ = filterModel.toLowerCase().trim();

    return allAvailableCustomers.filter(c => {
      const custVehicles = [
        ...(customerVehiclesMap.get(c.id) || []),
        ...(c.phone ? (customerVehiclesMap.get(c.phone) || []) : [])
      ];

      // 1. Universal Search (Name, Mobile, Telephone, Reg No, Chassis No, Model, QID, Email, City)
      if (generalQ) {
        const matchesCust =
          c.name?.toLowerCase().includes(generalQ) ||
          c.phone?.toLowerCase().includes(generalQ) ||
          (c as any).telephone?.toLowerCase().includes(generalQ) ||
          (c as any).qid?.toLowerCase().includes(generalQ) ||
          c.email?.toLowerCase().includes(generalQ) ||
          c.city?.toLowerCase().includes(generalQ) ||
          c.address?.toLowerCase().includes(generalQ);

        const matchesVeh = custVehicles.some(v =>
          v.plateNumber?.toLowerCase().includes(generalQ) ||
          v.vin?.toLowerCase().includes(generalQ) ||
          v.model?.toLowerCase().includes(generalQ) ||
          v.make?.toLowerCase().includes(generalQ)
        );

        if (!matchesCust && !matchesVeh) return false;
      }

      // 2. Specific filter: Customer Name
      if (nameQ && !c.name?.toLowerCase().includes(nameQ)) {
        return false;
      }

      // 3. Specific filter: Mobile / Tel No
      if (phoneQ) {
        const matchesPhone =
          c.phone?.toLowerCase().includes(phoneQ) ||
          (c as any).telephone?.toLowerCase().includes(phoneQ);
        if (!matchesPhone) return false;
      }

      // 4. Specific filter: Reg No (Plate No)
      if (regQ) {
        const matchesReg = custVehicles.some(v => v.plateNumber?.toLowerCase().includes(regQ));
        if (!matchesReg) return false;
      }

      // 5. Specific filter: Chassis No (VIN)
      if (chassisQ) {
        const matchesChassis = custVehicles.some(v => v.vin?.toLowerCase().includes(chassisQ));
        if (!matchesChassis) return false;
      }

      // 6. Specific filter: Model
      if (modelQ) {
        const matchesModel = custVehicles.some(v =>
          v.model?.toLowerCase().includes(modelQ) ||
          v.make?.toLowerCase().includes(modelQ)
        );
        if (!matchesModel) return false;
      }

      return true;
    });
  }, [
    allAvailableCustomers,
    customerVehiclesMap,
    customerSearchQuery,
    filterCustomerName,
    filterPhone,
    filterRegNo,
    filterChassisNo,
    filterModel
  ]);

  const handleSelectCustomerFromSearch = (selected: CustomerMasterItem, vehicleMatch?: Vehicle) => {
    setCustomerName(selected.name);
    setMobileNo(selected.phone);
    if ((selected as any).telephone) setTelephoneNo((selected as any).telephone);
    if (selected.city || selected.address) setCustomerAddress(selected.city || selected.address || '');
    if (selected.email) setCustomerEmail(selected.email);
    if (selected.name) setContactPerson(selected.name);

    // Auto-populate vehicle details if matched or if customer has a single vehicle and current form vehicle is empty
    const custVehicles = [
      ...(customerVehiclesMap.get(selected.id) || []),
      ...(selected.phone ? (customerVehiclesMap.get(selected.phone) || []) : [])
    ];
    const targetVeh = vehicleMatch || (custVehicles.length === 1 && !regNo ? custVehicles[0] : undefined);
    if (targetVeh) {
      if (targetVeh.plateNumber) setRegNo(targetVeh.plateNumber);
      if (targetVeh.make) setVehicleMake(targetVeh.make);
      if (targetVeh.model) setVehicleModel(targetVeh.model);
      if (targetVeh.vin) setVinNo(targetVeh.vin);
      if (targetVeh.year) setVehicleYear(Number(targetVeh.year));
      if (targetVeh.color) setVehicleColor(targetVeh.color);
      if (targetVeh.engineNo) setEngineNo(targetVeh.engineNo);
    }

    setHasUnsavedChanges(true);
    setShowCustomerSearchModal(false);
    clearAllFilters();
  };

  const handleSaveQuickCustomer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickCustomerName.trim()) {
      setQuickCustomerError('Customer name is required');
      return;
    }
    if (!quickCustomerPhone.trim()) {
      setQuickCustomerError('Mobile number is required');
      return;
    }
    setIsSavingCustomer(true);
    setQuickCustomerError('');

    try {
      const created = addCustomer({
        name: quickCustomerName.trim(),
        phone: quickCustomerPhone.trim(),
        telephone: quickCustomerPhone2.trim() || undefined,
        email: quickCustomerEmail.trim() || undefined,
        address: quickCustomerAddress.trim() || undefined,
        city: quickCustomerAddress.trim() || 'Doha',
        qid: quickCustomerQID.trim() || undefined,
        contact: quickCustomerName.trim()
      });

      // Auto-populate Job Card form
      setCustomerName(created.name);
      setMobileNo(created.phone);
      if (quickCustomerPhone2.trim()) setTelephoneNo(quickCustomerPhone2.trim());
      if (created.email) setCustomerEmail(created.email);
      if (created.address || created.city) setCustomerAddress(created.address || created.city || '');
      setContactPerson(created.name);
      setHasUnsavedChanges(true);

      setCustomerSuccessNotice(`Customer "${created.name}" created and loaded!`);
      setTimeout(() => setCustomerSuccessNotice(null), 4000);

      // Reset & close
      setQuickCustomerName('');
      setQuickCustomerPhone('');
      setQuickCustomerPhone2('');
      setQuickCustomerEmail('');
      setQuickCustomerAddress('');
      setQuickCustomerQID('');
      setShowQuickCustomerModal(false);
    } catch (err: any) {
      setQuickCustomerError(err?.message || 'Failed to create customer');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const [showQuickAddPartModal, setShowQuickAddPartModal] = useState(false);
  const [showAdvancedItemSearch, setShowAdvancedItemSearch] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [isRequisitionIssueModalOpen, setIsRequisitionIssueModalOpen] = useState(false);
  const [requisitionSearch, setRequisitionSearch] = useState('');
  const ensureArray = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  };

  const [requisitions, setRequisitions] = useState<JobCardPartItem[]>(() =>
    ensureArray(initialData?.partsUsed || (initialData as any)?.parts || (initialData as any)?.requisitions || (initialData as any)?.parts_json)
  );
  const [attachedPhotos, setAttachedPhotos] = useState<JobCardPhoto[]>(() =>
    ensureArray((initialData as any)?.attachments || (initialData as any)?.photos || [])
  );
  const [selectedIssueReturnIds, setSelectedIssueReturnIds] = useState<string[]>([]);
  const [issueReturnQtys, setIssueReturnQtys] = useState<{ [id: string]: number }>({});
  const [issueFeedback, setIssueFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleUpdatePartQty = (index: number, newQty: number | string) => {
    const n = [...requisitions];
    if (!n[index]) return;
    const parsed = typeof newQty === 'string' ? (newQty === '' ? 0 : parseFloat(newQty) || 0) : newQty;
    const unitRate = Number(n[index].unitPrice) || 0;
    const cleanQty = typeof newQty === 'string' && newQty === '' ? ('' as any) : Math.max(0, parsed);
    n[index] = {
      ...n[index],
      quantity: cleanQty,
      total: Number((Math.max(0, parsed) * unitRate).toFixed(2)),
    };
    setRequisitions(n);
    setHasUnsavedChanges(true);
    setIsEditMode(true);

    if (initialData?.id && updateJobCard) {
      const totalPartsCost = n.reduce(
        (sum, item) => sum + (Number(item.total) || (Number(item.quantity || 1) * Number(item.unitPrice || 0)) || 0),
        0
      );
      const newRawTotal = isLumpsum && lumpsumAmount > 0 
        ? lumpsumAmount 
        : (totalPartsCost + totalLaborCost + totalOtherCharge);
      const newNetTotal = Number(Math.max(0, newRawTotal - discount).toFixed(2));

      updateJobCard(initialData.id, {
        partsUsed: n.map(p => ({ ...p, quantity: Number(p.quantity) || 1 })),
        partsCost: totalPartsCost,
        totalAmount: newNetTotal,
      });
    }
  };

  const handleUpdatePartPrice = (index: number, newPrice: number | string) => {
    const n = [...requisitions];
    if (!n[index]) return;
    const parsedPrice = typeof newPrice === 'string' ? (newPrice === '' ? 0 : parseFloat(newPrice) || 0) : newPrice;
    const currentQty = Number(n[index].quantity) || 0;
    const cleanPrice = typeof newPrice === 'string' && newPrice === '' ? ('' as any) : Math.max(0, parsedPrice);
    n[index] = {
      ...n[index],
      unitPrice: cleanPrice,
      total: Number((currentQty * Math.max(0, parsedPrice)).toFixed(2)),
    };
    setRequisitions(n);
    setHasUnsavedChanges(true);
    setIsEditMode(true);

    if (initialData?.id && updateJobCard) {
      const totalPartsCost = n.reduce(
        (sum, item) => sum + (Number(item.total) || (Number(item.quantity || 1) * Number(item.unitPrice || 0)) || 0),
        0
      );
      const newRawTotal = isLumpsum && lumpsumAmount > 0 
        ? lumpsumAmount 
        : (totalPartsCost + totalLaborCost + totalOtherCharge);
      const newNetTotal = Number(Math.max(0, newRawTotal - discount).toFixed(2));

      updateJobCard(initialData.id, {
        partsUsed: n.map(p => ({ ...p, unitPrice: Number(p.unitPrice) || 0, quantity: Number(p.quantity) || 1 })),
        partsCost: totalPartsCost,
        totalAmount: newNetTotal,
      });
    }
  };

  const handleIssueStockParts = () => {
    const stockItems = requisitions.filter(p => (!p.source || p.source === 'Inventory Stock') && p.status !== 'Issued');
    if (stockItems.length === 0) {
      alert('No pending inventory stock parts found to issue.');
      return;
    }
    
    stockItems.forEach(part => {
      const invMatch = inventory.find(i => i.id === part.inventoryId || i.sku === part.sku);
      if (invMatch) {
        issueMaterialToJobCard(initialData?.id || 'temp-jc-id', invMatch, part.quantity, 'Service Manager');
      }
    });

    const updated = requisitions.map(p => {
      if ((!p.source || p.source === 'Inventory Stock') && p.status !== 'Issued') {
        return { ...p, source: 'Inventory Stock' as const, status: 'Issued' as const };
      }
      return p;
    });

    setRequisitions(updated);
    setIssueFeedback({
      type: 'success',
      message: `Successfully issued ${stockItems.length} part(s) from inventory stock! Stock count updated.`
    });
  };

  const handleConfirmIssueRequisitions = (
    issuedItems: Array<{
      partId: string;
      inventoryId?: string;
      sku: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>,
    technician: string,
    issueNotes?: string
  ) => {
    // 1. Issue each item via context
    issuedItems.forEach(item => {
      const invMatch = inventory.find(i => i.id === item.inventoryId || i.sku === item.sku);
      if (invMatch) {
        issueMaterialToJobCard(
          initialData?.id || 'temp-jc-id',
          invMatch,
          item.quantity,
          technician || assignedTechnician || 'Lead Technician'
        );
      }
    });

    // 2. Update requisitions list status to Issued and set the issued quantity
    const issuedPartIds = new Set(issuedItems.map(i => i.partId));
    const updated = requisitions.map(p => {
      if (issuedPartIds.has(p.id)) {
        const itemInfo = issuedItems.find(i => i.partId === p.id);
        const qty = itemInfo ? itemInfo.quantity : (Number(p.quantity) || 1);
        const price = Number(p.unitPrice) || 0;
        return { 
          ...p, 
          source: 'Inventory Stock' as const, 
          status: 'Issued' as const,
          quantity: qty,
          total: qty * price,
          technician: technician || assignedTechnician,
        };
      }
      return p;
    });

    setRequisitions(updated);
    setHasUnsavedChanges(true);
    setIsEditMode(true);

    // If initialData exists, also persist to backend
    if (initialData?.id) {
      const totalPartsCost = updated.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
      const laborTotal = mechanicalTasks.reduce((acc, t) => acc + (Number(t.estimatedHours || 0) * Number(t.hourlyRate || 0)), 0);
      const newRawTotal = laborTotal + totalPartsCost;
      const newNetTotal = Number(Math.max(0, newRawTotal - discount).toFixed(2));

      updateJobCard(initialData.id, {
        partsUsed: updated.map(p => ({ ...p, quantity: Number(p.quantity) || 1 })),
        partsCost: totalPartsCost,
        totalAmount: newNetTotal,
      });
    }

    setIssueFeedback({
      type: 'success',
      message: `Successfully issued ${issuedItems.length} item(s) to ${technician}! Inventory stock count updated.`
    });
  };

  const handleExecuteIssueReturn = (itemsToReturn: JobCardPartItem[]) => {
    if (itemsToReturn.length === 0) {
      setIssueFeedback({ type: 'error', message: 'Please select at least one issued item to return.' });
      return;
    }

    // 1. Return each item to inventory via adjustStock and returnMaterialFromJobCard
    itemsToReturn.forEach(item => {
      const returnQty = Number(issueReturnQtys[item.id] ?? item.quantity) || 1;
      const invMatch = inventory.find(i => 
        (item.inventoryId && i.id === item.inventoryId) || 
        (item.sku && i.sku && String(i.sku).toLowerCase() === String(item.sku).toLowerCase()) || 
        (item.name && i.name && String(i.name).toLowerCase() === String(item.name).toLowerCase())
      );

      // Directly adjust stock in inventory context & database
      if (invMatch) {
        adjustStock(invMatch.id, returnQty, 'Issue Return back to inventory');
      }

      if (initialData?.id) {
        returnMaterialFromJobCard(
          initialData.id,
          item.id || item.sku || '',
          returnQty,
          'Issue Return back to stock'
        );
      }
    });

    // 2. Update requisitions list: reset status back to Pending (or adjust remaining quantity)
    const returnQtyMap = new Map(itemsToReturn.map(i => [i.id, Number(issueReturnQtys[i.id] ?? i.quantity) || 1]));

    const updated = requisitions.map(p => {
      if (returnQtyMap.has(p.id) || itemsToReturn.some(it => it.id === p.id || (it.sku && it.sku === p.sku))) {
        const retQty = returnQtyMap.get(p.id) || Number(issueReturnQtys[p.id] ?? p.quantity) || 1;
        const remainingQty = Math.max(0, p.quantity - retQty);

        if (remainingQty === 0) {
          // Full return: item is unissued and marked Pending in requisition list
          return {
            ...p,
            status: 'Pending' as const,
            quantity: Number(p.quantity) || 1,
            total: (Number(p.quantity) || 1) * Number(p.unitPrice || 0),
          };
        } else {
          // Partial return: keep remaining as Issued
          return {
            ...p,
            quantity: remainingQty,
            total: remainingQty * Number(p.unitPrice || 0),
          };
        }
      }
      return p;
    });

    setRequisitions(updated);
    setSelectedIssueReturnIds([]);
    setHasUnsavedChanges(true);
    setIsEditMode(true);

    // 3. Persist to backend if job card exists
    if (initialData?.id) {
      const totalPartsCost = updated.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
      const laborTotal = mechanicalTasks.reduce((acc, t) => acc + (Number(t.estimatedHours || 0) * Number(t.hourlyRate || 0)), 0);
      const newRawTotal = laborTotal + totalPartsCost;
      const newNetTotal = Number(Math.max(0, newRawTotal - discount).toFixed(2));

      updateJobCard(initialData.id, {
        partsUsed: updated.map(p => ({ ...p, quantity: Number(p.quantity) || 1 })),
        partsCost: totalPartsCost,
        totalAmount: newNetTotal,
      });
    }

    setIssueFeedback({
      type: 'success',
      message: `Successfully returned ${itemsToReturn.length} item(s) back to inventory stock as it was! Inventory quantities updated.`
    });
  };
  const [mechanicalTasks, setMechanicalTasks] = useState<MechanicalTask[]>(() =>
    ensureArray(initialData?.mechanicalTasks || (initialData as any)?.labor || (initialData as any)?.tasks || (initialData as any)?.labor_json)
  );
  const [dentingPaintingPanels, setDentingPaintingPanels] = useState<DentingPaintingItem[]>(
    initialData?.dentingPaintingPanels || []
  );

  // Remarks & Issues
  const [supervisorRemarks, setSupervisorRemarks] = useState(initialData?.supervisorRemarks || '');
  const [customerComplaints, setCustomerComplaints] = useState(
    initialData?.customerComplaints || (Array.isArray((initialData as any)?.complaints) ? (initialData as any).complaints.join(', ') : '')
  );
  const [diagnosisNotes, setDiagnosisNotes] = useState(initialData?.diagnosisNotes || (initialData as any)?.diagnosis || '');
  const [deliveryNotes, setDeliveryNotes] = useState(initialData?.deliveryNotes || '');

  // Personnel & Workflow
  const [estimator, setEstimator] = useState(initialData?.estimator || '');
  const [serviceAdviser, setServiceAdviser] = useState(initialData?.serviceAdviser || '');
  const [jobStatus, setJobStatus] = useState<JobStatus>(initialData?.status || 'Draft');
  const [assignedTechnician, setAssignedTechnician] = useState(initialData?.assignedTechnician || '');

  // Toolbar & lifecycle state
  const [showFindModal, setShowFindModal] = useState(false);
  const [showServiceTemplateModal, setShowServiceTemplateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!initialData);
  const [isNewRecord, setIsNewRecord] = useState(!initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  const [invoiceSuccessMsg, setInvoiceSuccessMsg] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasDraftAvailable, setHasDraftAvailable] = useState(false);

  // Check for saved draft on mount for new job cards
  useEffect(() => {
    if (!initialData) {
      const savedDraft = localStorage.getItem('najm_jobcard_draft');
      if (savedDraft) {
        setHasDraftAvailable(true);
      }
    }
  }, [initialData]);

  // Draft autosave
  useEffect(() => {
    if (isEditMode && hasUnsavedChanges && !initialData) {
      const draft = {
        customerName,
        mobileNo,
        customerAddress,
        customerEmail,
        regNo,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        vinNo,
        customerComplaints,
        diagnosisNotes,
        jobType,
        assignedTechnician,
        mechanicalTasks,
        requisitions,
        savedAt: new Date().toLocaleTimeString(),
      };
      localStorage.setItem('najm_jobcard_draft', JSON.stringify(draft));
    }
  }, [
    isEditMode,
    hasUnsavedChanges,
    initialData,
    customerName,
    mobileNo,
    customerAddress,
    customerEmail,
    regNo,
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vinNo,
    customerComplaints,
    diagnosisNotes,
    jobType,
    assignedTechnician,
    mechanicalTasks,
    requisitions,
  ]);

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem('najm_jobcard_draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.customerName) setCustomerName(d.customerName);
      if (d.mobileNo) setMobileNo(d.mobileNo);
      if (d.customerAddress) setCustomerAddress(d.customerAddress);
      if (d.customerEmail) setCustomerEmail(d.customerEmail);
      if (d.regNo) setRegNo(d.regNo);
      if (d.vehicleMake) setVehicleMake(d.vehicleMake);
      if (d.vehicleModel) setVehicleModel(d.vehicleModel);
      if (d.vehicleYear) setVehicleYear(d.vehicleYear);
      if (d.vinNo) setVinNo(d.vinNo);
      if (d.customerComplaints) setCustomerComplaints(d.customerComplaints);
      if (d.diagnosisNotes) setDiagnosisNotes(d.diagnosisNotes);
      if (d.jobType) setJobType(d.jobType);
      if (d.assignedTechnician) setAssignedTechnician(d.assignedTechnician);
      if (d.mechanicalTasks) setMechanicalTasks(d.mechanicalTasks);
      if (d.requisitions) setRequisitions(d.requisitions);
      setHasDraftAvailable(false);
      setHasUnsavedChanges(true);
    } catch {
      // ignore
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('najm_jobcard_draft');
    setHasDraftAvailable(false);
  };

  // Returning Customer & Vehicle detector (prevents duplicate records)
  const returningMatch = useMemo(() => {
    if (!isEditMode) return null;
    const cleanPlate = (regNo || '').trim().toUpperCase();
    const cleanPhone = (mobileNo || '').trim();
    if (!cleanPlate && (!cleanPhone || cleanPhone.length < 5)) return null;

    // Check previous job cards first
    const foundInJobs = (allJobCards || []).find(j => 
      (cleanPlate && j.vehicle?.plateNumber?.trim().toUpperCase() === cleanPlate && (!initialData || j.id !== initialData.id)) ||
      (cleanPhone && j.customer?.phone?.trim() === cleanPhone && (!initialData || j.id !== initialData.id))
    );
    if (foundInJobs && (foundInJobs.customer?.name !== customerName || foundInJobs.vehicle?.make !== vehicleMake)) {
      return {
        source: 'Previous Job Card',
        customer: foundInJobs.customer,
        vehicle: foundInJobs.vehicle
      };
    }

    // Check customer master
    const foundInCustomers = (customers || []).find(c => 
      cleanPhone && c.phone?.trim() === cleanPhone && c.name !== customerName
    );
    if (foundInCustomers) {
      return {
        source: 'Customer Master',
        customer: {
          id: foundInCustomers.id,
          name: foundInCustomers.name,
          phone: foundInCustomers.phone,
          address: foundInCustomers.city || ''
        }
      };
    }
    return null;
  }, [regNo, mobileNo, allJobCards, customers, customerName, vehicleMake, isEditMode, initialData]);

  // Quick Service Presets
  const applyServicePreset = (presetName: string) => {
    if (!isEditMode) setIsEditMode(true);
    setHasUnsavedChanges(true);

    if (presetName === 'oil_change') {
      setMechanicalTasks(prev => [
        ...prev,
        {
          id: `TASK-${Date.now()}`,
          category: 'Routine Maintenance',
          description: 'Engine Oil & Filter Replacement + 21-Pt Inspection',
          estimatedHours: 1,
          hourlyRate: settings?.defaultLaborRate || 150,
          status: 'Pending'
        }
      ]);
      const oilFilter = inventory.find(i => {
        const n = (i.name || '').toLowerCase();
        return n.includes('oil filter') || n.includes('filter');
      });
      const engineOil = inventory.find(i => {
        const n = (i.name || '').toLowerCase();
        return n.includes('oil') || n.includes('synthetic') || n.includes('5w');
      });
      if (oilFilter) addPart(oilFilter);
      if (engineOil) addPart(engineOil);
      setCustomerComplaints(prev => prev ? `${prev}, Routine Engine Oil & Filter Change` : 'Routine Engine Oil & Filter Change');
    } else if (presetName === 'brake_service') {
      setMechanicalTasks(prev => [
        ...prev,
        {
          id: `TASK-${Date.now()}`,
          category: 'Brakes',
          description: 'Front & Rear Brake Pads Replacement + Disc Rotor Inspection',
          estimatedHours: 1.5,
          hourlyRate: settings?.defaultLaborRate || 150,
          status: 'Pending'
        }
      ]);
      const brakePads = inventory.find(i => {
        const n = (i.name || '').toLowerCase();
        return n.includes('brake') || n.includes('pad');
      });
      if (brakePads) addPart(brakePads);
      setCustomerComplaints(prev => prev ? `${prev}, Brake Inspection & Pad Replacement` : 'Brake Inspection & Pad Replacement');
    } else if (presetName === 'ac_service') {
      setMechanicalTasks(prev => [
        ...prev,
        {
          id: `TASK-${Date.now()}`,
          category: 'Routine Maintenance',
          description: 'AC Cooling Diagnostic, Leak Check & R134a Gas Recharge',
          estimatedHours: 1,
          hourlyRate: settings?.defaultLaborRate || 150,
          status: 'Pending'
        }
      ]);
      setCustomerComplaints(prev => prev ? `${prev}, AC cooling insufficient` : 'AC cooling insufficient');
    } else if (presetName === 'battery_service') {
      setMechanicalTasks(prev => [
        ...prev,
        {
          id: `TASK-${Date.now()}`,
          category: 'Routine Maintenance',
          description: 'Battery Health Load Test, Alternator Output & Terminal Cleaning',
          estimatedHours: 0.5,
          hourlyRate: settings?.defaultLaborRate || 150,
          status: 'Pending'
        }
      ]);
      setCustomerComplaints(prev => prev ? `${prev}, Battery check / Slow starting` : 'Battery check / Slow starting');
    } else if (presetName === 'obd_scan') {
      setMechanicalTasks(prev => [
        ...prev,
        {
          id: `TASK-${Date.now()}`,
          category: 'Routine Maintenance',
          description: 'OBD-II Computer Diagnostic Scan & Live Sensor Analysis',
          estimatedHours: 0.5,
          hourlyRate: settings?.defaultLaborRate || 150,
          status: 'Pending'
        }
      ]);
      setCustomerComplaints(prev => prev ? `${prev}, Check Engine Light Diagnostic` : 'Check Engine Light Diagnostic');
    }
  };

  // Financial calculations
  const partsAmount = (requisitions || []).reduce(
    (sum, item) => sum + (Number(item.total) || (Number(item.quantity || 1) * Number(item.unitPrice || 0)) || 0),
    0
  );
  const mechanicalLaborCost = (mechanicalTasks || []).reduce(
    (sum, item) => sum + (Number(item.estimatedHours || 0) * Number(item.hourlyRate || 0)),
    0
  );
  const dentingLaborCost = (dentingPaintingPanels || []).reduce((sum, p) => sum + (Number(p.dentingCost) || 0), 0);
  const paintingCost = (dentingPaintingPanels || []).reduce((sum, p) => sum + (Number(p.paintingCost) || 0), 0);
  const totalLaborCost = mechanicalLaborCost + dentingLaborCost + paintingCost;

  const totalOtherCharge = Number(otherChargeManual || 0) + Number(initialData?.consumablesCost || 0);

  const rawTotal = isLumpsum && lumpsumAmount > 0 
    ? lumpsumAmount 
    : (partsAmount + totalLaborCost + totalOtherCharge);

  const calculatedVat = 0;
  const netTotalAmount = Number(Math.max(0, rawTotal - discount).toFixed(2));

  // Dependency Guard for Deletion
  const isReferencedByInvoice = initialData ? effectiveInvoices.find(inv => inv.jobCardId === initialData.id || inv.jobCardNumber === initialData.jobNumber) : null;
  const deleteBlockReason = isReferencedByInvoice ? `This Job Card is linked to Invoice ${isReferencedByInvoice.invoiceNumber}. Please void or delete the invoice first.` : null;

  // Existing linked invoice matching ID, Job Number, or linked invoiceId
  const currentJobNumber = (docNumber && docNumber !== 'Loading...') ? docNumber : (initialData?.jobNumber || '');
  const existingLinkedInvoice = effectiveInvoices.find(inv => {
    if (initialData?.id && inv.jobCardId === initialData.id) return true;
    if (initialData?.invoiceId && inv.id === initialData.invoiceId) return true;
    const invJc = (inv.jobCardNumber || '').trim().toLowerCase();
    const curJc = currentJobNumber.trim().toLowerCase();
    const initJc = (initialData?.jobNumber || '').trim().toLowerCase();
    if (invJc && curJc && invJc === curJc) return true;
    if (invJc && initJc && invJc === initJc) return true;
    return false;
  });

  // Workflow Action: Save & Close
  const handleSaveAndClose = async () => {
    setJobStatus('Closed');
    await handleSave();
  };

  // Workflow Action: Close & Create Invoice / Create Invoice
  const handleCloseAndCreateInvoice = async () => {
    setValidationError(null);
    setInvoiceSuccessMsg(null);

    // a. Validate Customer
    const hasCustomer = (customerName || mobileNo || '').trim().length > 0;
    if (!hasCustomer) {
      setValidationError('Customer Name or Contact Phone is required.');
      setActiveTab('general');
      return;
    }

    // b. Validate Vehicle
    if (!regNo.trim()) {
      setValidationError('Vehicle Plate / Registration Number is required.');
      setActiveTab('general');
      return;
    }

    // c. Validate Work Scope (Complaints/Diagnosis) - removed as per user request

    // d. Validate Labor items
    for (const l of mechanicalTasks) {
      if (!l.description || !l.description.trim()) {
        setValidationError('All labor operations must have a description.');
        setActiveTab('labor');
        return;
      }
      if (Number(l.estimatedHours || 0) < 0 || Number(l.hourlyRate || 0) < 0) {
        setValidationError('Labor hours and rates cannot be negative.');
        setActiveTab('labor');
        return;
      }
    }

    // e. Validate Parts
    for (const p of requisitions) {
      if (Number(p.quantity || 0) <= 0) {
        setValidationError(`Part "${p.name || p.sku || 'Item'}" quantity must be greater than 0.`);
        setActiveTab('requisitions');
        return;
      }
      if (Number(p.unitPrice || 0) < 0) {
        setValidationError(`Part "${p.name || p.sku || 'Item'}" price cannot be negative.`);
        setActiveTab('requisitions');
        return;
      }
    }

    // f. Validate Totals
    if (netTotalAmount < 0) {
      setValidationError('Grand Total cannot be negative.');
      return;
    }

    // Build payload
    const payload: Omit<JobCard, 'id' | 'jobNumber'> & { jobNumber?: string; id?: string } = {
      ...(initialData?.id ? { id: initialData.id } : {}),
      ...(docNumber && !docNumber.includes('...') && !docNumber.includes('PENDING') ? { jobNumber: docNumber } : {}),
      dateIn: docDate,
      timeIn: docTime,
      promisedDate: expectedDelivery,
      expectedDelivery: expectedDelivery,
      status: 'Closed',
      jobType,
      priority: 'Normal',
      reference,
      refDocNo,
      supplEstNo,
      serviceType,
      customer: {
        id: initialData?.customer?.id || (customerName ? `CUST-${Date.now()}` : 'CUST-0001'),
        name: customerName,
        address: customerAddress,
        email: customerEmail,
        contactPerson,
        phone: mobileNo,
        telephone: telephoneNo,
        fax: faxNo
      },
      insurance: {
        enabled: isInsuranceActive,
        company: insuranceCompany,
        policyNo,
        lpoRefNo,
        claimType,
        chargeExcessVat,
        claimNo
      },
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear !== '' && vehicleYear !== null && vehicleYear !== undefined ? Number(vehicleYear) : undefined,
        regPrefix,
        plateNumber: regNo,
        vehicleType,
        engineNo,
        vin: vinNo,
        tyreSize,
        color: vehicleColor,
        fuelLevel: fuelLevel !== '' && fuelLevel !== null && fuelLevel !== undefined ? Number(fuelLevel) : undefined,
        odometer: mileageKms !== '' && mileageKms !== null && mileageKms !== undefined ? Number(mileageKms) : undefined,
        lastServiceDate,
        lastServiceKms,
        nextServiceDate,
        nextServiceKms,
        policeFileNo
      },
      accounting: {
        chargeType,
        isLumpsum,
        lumpsumAmount,
        otherCharge: otherChargeManual,
        customerAmount,
        advanceReceived: advanceRecd,
        insuranceAmount,
        insuranceDiscount,
        insuranceAdvanceReceived: insuranceAdvanceRecd
      },
      estimator,
      serviceAdviser,
      assignedTechnician: assignedTechnician || 'Unassigned',
      customerComplaints,
      diagnosisNotes,
      supervisorRemarks,
      deliveryNotes,
      mechanicalTasks,
      dentingPaintingPanels,
      partsUsed: requisitions,
      attachments: attachedPhotos,
      photos: attachedPhotos,
      mechanicalLaborCost,
      dentingLaborCost,
      paintingCost,
      paintBoothCharge: initialData?.paintBoothCharge || 0,
      partsCost: partsAmount,
      consumablesCost: initialData?.consumablesCost || 0,
      discount,
      taxRate: 0,
      totalAmount: netTotalAmount,
    };

    setIsProcessingInvoice(true);
    try {
      let cardId = initialData?.id;
      if (!cardId) {
        const savedCard = await onSave(payload);
        cardId = (savedCard as any)?.id || initialData?.id;
      }

      if (!cardId) {
        const matched = (allJobCards || []).find(j => j.jobNumber === docNumber);
        if (matched) cardId = matched.id;
      }

      const res = await closeAndInvoiceJobCard(cardId || docNumber, payload);
      setIsProcessingInvoice(false);

      if (res && res.success) {
        const msg = res.message || `Job Card ${docNumber} closed and Invoice ${res.invoiceNumber} created.`;
        setInvoiceSuccessMsg(msg);
        setJobStatus('Closed');
        setHasUnsavedChanges(false);
        setIsEditMode(false);

        if (onOpenInvoice && res.invoiceId) {
          setTimeout(() => {
            onClose();
            onOpenInvoice(res.invoiceId!);
          }, 500);
        } else if (onGenerateInvoice && cardId) {
          onGenerateInvoice(cardId);
        }
      }
    } catch (err: any) {
      setIsProcessingInvoice(false);
      setValidationError(err?.message || 'Failed to close Job Card and create invoice.');
    }
  };

  const customToolbarActions = (
    <div className="flex items-center space-x-1">
      {/* Save & Close */}
      {isEditMode && (
        <button
          type="button"
          onClick={handleSaveAndClose}
          disabled={isSaving || isProcessingInvoice}
          className="px-2 sm:px-2.5 py-1 flex flex-col items-center justify-center text-slate-800 hover:bg-slate-200 border border-slate-300 rounded-xs cursor-pointer disabled:opacity-35 min-w-[42px] transition-all"
          title="Save Job Card and set status to Closed"
        >
          <CheckCircle2 className="w-4.5 h-4.5 text-blue-700" />
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight mt-0.5">Save & Close</span>
        </button>
      )}

      {/* Close & Create Invoice OR Create Invoice OR View Invoice */}
      {existingLinkedInvoice ? (
        <button
          type="button"
          onClick={async () => {
            if (hasUnsavedChanges) {
              await handleSave();
            }
            const targetRef = existingLinkedInvoice.id || (docNumber && docNumber !== 'Loading...' ? docNumber : initialData?.jobNumber) || initialData?.id || '';
            if (onOpenInvoice) {
              onClose();
              onOpenInvoice(targetRef);
            } else if (onGenerateInvoice && initialData?.id) {
              onGenerateInvoice(initialData.id);
            }
          }}
          className="px-2.5 py-1 flex flex-col items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white rounded-xs font-semibold cursor-pointer shadow-xs min-w-[50px] transition-all"
          title={`View existing invoice ${existingLinkedInvoice.invoiceNumber}`}
        >
          <Receipt className="w-4.5 h-4.5 text-white" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5">View Invoice</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCloseAndCreateInvoice}
          disabled={isSaving || isProcessingInvoice}
          className="px-2.5 py-1 flex flex-col items-center justify-center bg-blue-700 hover:bg-blue-800 text-white rounded-xs font-semibold cursor-pointer shadow-xs min-w-[65px] transition-all disabled:opacity-50"
          title="Close Job Card and generate linked invoice"
        >
          {isProcessingInvoice ? (
            <Loader2 className="w-4.5 h-4.5 text-white animate-spin" />
          ) : (
            <Receipt className="w-4.5 h-4.5 text-white" />
          )}
          <span className="text-[10px] sm:text-[11px] font-bold tracking-tight mt-0.5 whitespace-nowrap">
            {isProcessingInvoice ? 'Creating...' : jobStatus === 'Closed' ? 'Create Invoice' : 'Close & Create Invoice'}
          </span>
        </button>
      )}
    </div>
  );

  // Navigation Logic
  const currentIndex = initialData ? allJobCards.findIndex(j => j.id === initialData.id) : -1;

  const handleFirst = () => { if (allJobCards.length > 0) { loadJobCard(allJobCards[0]); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); } };
  const handleLast = () => { if (allJobCards.length > 0) { loadJobCard(allJobCards[allJobCards.length - 1]); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); } };
  const handleNext = () => { if (currentIndex > -1 && currentIndex < allJobCards.length - 1) { loadJobCard(allJobCards[currentIndex + 1]); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); } };
  const handlePrevious = () => { if (currentIndex > 0) { loadJobCard(allJobCards[currentIndex - 1]); setIsNewRecord(false); setHasUnsavedChanges(false); setIsEditMode(false); } };

  const handleDelete = async () => {
    if (!initialData || deleteBlockReason) return;
    setIsDeleting(true);
    setValidationError(null);
    try {
      if (onDeleteJobCard) {
        await onDeleteJobCard(initialData.id);
      } else {
        await contextDeleteJobCard(initialData.id);
      }
      setIsDeleting(false);
      onClose();
    } catch (err: any) {
      setIsDeleting(false);
      setValidationError(err?.message || 'Failed to delete Job Card.');
    }
  };

  const handleNewRecord = () => {
    if (onSelectJobCard) onSelectJobCard(null as any);
    setDocNumber('Fetching next sequential JC...');
    api.getNextDocumentNumber('JOB_CARD')
      .then(res => setDocNumber(res.code))
      .catch(() => setDocNumber(`JC-0001`));
    const todayIso = new Date().toISOString().split('T')[0];
    setDocDate(todayIso);
    setDocDateDisplay(isoToDmy(todayIso));
    setExpectedDelivery('');
    setExpectedDeliveryDisplay('');
    setDocTime('09:00 AM');
    setCustomerName(''); setCustomerAddress(''); setCustomerEmail(''); setContactPerson(''); setMobileNo(''); setTelephoneNo(''); setFaxNo('');
    setVehicleMake(''); setVehicleModel(''); setRegNo(''); setVinNo(''); setEngineNo(''); setVehicleColor('');
    setVehicleYear('');
    setMileageKms(''); setFuelLevel('');
    setRequisitions([]); setMechanicalTasks([]); setDentingPaintingPanels([]);
    setCustomerComplaints(''); setDiagnosisNotes(''); setSupervisorRemarks(''); setDeliveryNotes('');
    setDiscount(0); setLumpsumAmount(0); setIsLumpsum(false); setJobStatus('Draft');
    setIsNewRecord(true);
    setIsEditMode(true);
    setHasUnsavedChanges(false);
    setValidationError(null);
  };

  const handleCancel = () => {
    setValidationError(null);
    if (initialData) {
      loadJobCard(initialData);
      setIsNewRecord(false);
    } else {
      handleNewRecord();
    }
    setHasUnsavedChanges(false);
    setIsEditMode(false);
  };

  const loadJobCard = (card: JobCard) => {
    if (onSelectJobCard) onSelectJobCard(card);
    setDocNumber(card.jobNumber || '');
    setDocDate(card.dateIn || new Date().toISOString().split('T')[0]);
    setDocDateDisplay(isoToDmy(card.dateIn || new Date().toISOString().split('T')[0]));
    setDocTime(card.timeIn || '09:00 AM');
    setJobType(card.jobType || 'Mechanical');
    setReference(card.reference || 'Direct Customer Walk-in');
    setRefDocNo(card.refDocNo || '');
    setSupplEstNo(card.supplEstNo || '');
    setServiceType(card.serviceType || 'Normal');
    const expVal = card.expectedDelivery || card.promisedDate || '';
    setExpectedDelivery(expVal);
    setExpectedDeliveryDisplay(isoToDmy(expVal));

    setCustomerName(card.customer?.name || '');
    setCustomerAddress(card.customer?.address || '');
    setCustomerEmail(card.customer?.email || '');
    setContactPerson(card.customer?.contactPerson || '');
    setMobileNo(card.customer?.phone || '');
    setTelephoneNo(card.customer?.telephone || '');
    setFaxNo(card.customer?.fax || '');

    setIsInsuranceActive(card.insurance?.enabled || false);
    setInsuranceCompany(card.insurance?.company || '');
    setPolicyNo(card.insurance?.policyNo || '');
    setLpoRefNo(card.insurance?.lpoRefNo || '');
    setClaimType(card.insurance?.claimType || 'No');
    setChargeExcessVat(card.insurance?.chargeExcessVat || false);
    setClaimNo(card.insurance?.claimNo || '');

    setVehicleMake(card.vehicle?.make || '');
    setVehicleModel(card.vehicle?.model || '');
    setVehicleYear(card.vehicle?.year ? card.vehicle.year : '');
    setRegPrefix(card.vehicle?.regPrefix || 'Private (QA)');
    setRegNo(card.vehicle?.plateNumber || '');
    setVehicleType(card.vehicle?.vehicleType || 'SUV');
    setEngineNo(card.vehicle?.engineNo || '');
    setVinNo(card.vehicle?.vin || '');
    setTyreSize(card.vehicle?.tyreSize || '');
    setVehicleColor(card.vehicle?.color || '');
    setFuelLevel(card.vehicle?.fuelLevel !== undefined && card.vehicle?.fuelLevel !== null ? card.vehicle.fuelLevel : '');
    setMileageKms(card.vehicle?.odometer !== undefined && card.vehicle?.odometer !== null ? card.vehicle.odometer : '');
    setLastServiceDate(card.vehicle?.lastServiceDate || '');
    setLastServiceKms(card.vehicle?.lastServiceKms || 0);
    setNextServiceDate(card.vehicle?.nextServiceDate || '');
    setNextServiceKms(card.vehicle?.nextServiceKms || 0);
    setPoliceFileNo(card.vehicle?.policeFileNo || '');

    setChargeType(card.accounting?.chargeType || 'Cash');
    setIsLumpsum(card.accounting?.isLumpsum || false);
    setLumpsumAmount(card.accounting?.lumpsumAmount || 0);
    setOtherChargeManual(card.accounting?.otherCharge || 0);
    setCustomerAmount(card.accounting?.customerAmount || 0);
    setDiscount(card.discount || 0);
    setAdvanceRecd(card.accounting?.advanceReceived || 0);
    setInsuranceAmount(card.accounting?.insuranceAmount || 0);
    setInsuranceDiscount(card.accounting?.insuranceDiscount || 0);
    setInsuranceAdvanceRecd(card.accounting?.insuranceAdvanceReceived || 0);

    setRequisitions(ensureArray(card.partsUsed || (card as any).parts || (card as any).requisitions || (card as any).parts_json));
    setMechanicalTasks(ensureArray(card.mechanicalTasks || (card as any).labor || (card as any).tasks || (card as any).labor_json));
    setDentingPaintingPanels(card.dentingPaintingPanels || []);

    setSupervisorRemarks(card.supervisorRemarks || '');
    setCustomerComplaints(card.customerComplaints || (Array.isArray((card as any).complaints) ? (card as any).complaints.join(', ') : ''));
    setDiagnosisNotes(card.diagnosisNotes || (card as any).diagnosis || '');
    setDeliveryNotes(card.deliveryNotes || '');

    setEstimator(card.estimator || '');
    setServiceAdviser(card.serviceAdviser || '');
    setJobStatus(card.status || 'Draft');
    setAssignedTechnician(card.assignedTechnician || '');
  };

  useEffect(() => {
    if (initialData) {
      loadJobCard(initialData);
      setIsNewRecord(false);
      setIsEditMode(false);
      setHasUnsavedChanges(false);
    }
  }, [initialData?.id, initialData?.jobNumber]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSave = async () => {
    setValidationError(null);
    setSaveSuccessMsg(null);

    const hasCustomer = (customerName || mobileNo || '').trim().length > 0;
    const hasVehicle = (regNo || vehicleMake || vehicleModel || '').trim().length > 0;
    const hasWorkScope = (customerComplaints || diagnosisNotes || '').trim().length > 0 || mechanicalTasks.length > 0 || dentingPaintingPanels.length > 0 || requisitions.length > 0;

    if (jobStatus !== 'Draft') {
      if (!hasCustomer) {
        setValidationError('Customer Name or Contact Phone is required for active job cards.');
        setActiveTab('general');
        return;
      }
      if (!regNo.trim()) {
        setValidationError('Vehicle Plate / Registration Number is required.');
        setActiveTab('general');
        return;
      }
      if (!hasWorkScope) {
        setValidationError('At least one Customer Complaint, Diagnosis Note, Labor Task, or Part Requisition is required.');
        setActiveTab('remarks');
        return;
      }
    } else {
      // Draft mode: Must have at least one identifiable field
      if (!hasCustomer && !hasVehicle && !hasWorkScope) {
        setValidationError('Blank job card drafts cannot be created. Enter at least a Plate Number, Customer Name, or Complaint.');
        return;
      }
    }

    const payload: Omit<JobCard, 'id' | 'jobNumber'> & { jobNumber?: string } = {
      ...(docNumber && !docNumber.includes('...') && !docNumber.includes('PENDING') ? { jobNumber: docNumber } : {}),
      dateIn: docDate,
      timeIn: docTime,
      promisedDate: expectedDelivery,
      expectedDelivery: expectedDelivery,
      status: jobStatus,
      jobType,
      priority: 'Normal',
      reference,
      refDocNo,
      supplEstNo,
      serviceType,
      
      customer: {
        id: initialData?.customer?.id || (customerName ? `CUST-${Date.now()}` : 'CUST-0001'),
        name: customerName,
        address: customerAddress,
        email: customerEmail,
        contactPerson,
        phone: mobileNo,
        telephone: telephoneNo,
        fax: faxNo
      },
      insurance: {
        enabled: isInsuranceActive,
        company: insuranceCompany,
        policyNo,
        lpoRefNo,
        claimType,
        chargeExcessVat,
        claimNo
      },
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear !== '' && vehicleYear !== null && vehicleYear !== undefined ? Number(vehicleYear) : undefined,
        regPrefix,
        plateNumber: regNo,
        vehicleType,
        engineNo,
        vin: vinNo,
        tyreSize,
        color: vehicleColor,
        fuelLevel: fuelLevel !== '' && fuelLevel !== null && fuelLevel !== undefined ? Number(fuelLevel) : undefined,
        odometer: mileageKms !== '' && mileageKms !== null && mileageKms !== undefined ? Number(mileageKms) : undefined,
        lastServiceDate,
        lastServiceKms,
        nextServiceDate,
        nextServiceKms,
        policeFileNo
      },
      accounting: {
        chargeType,
        isLumpsum,
        lumpsumAmount,
        otherCharge: otherChargeManual,
        customerAmount,
        advanceReceived: advanceRecd,
        insuranceAmount,
        insuranceDiscount,
        insuranceAdvanceReceived: insuranceAdvanceRecd
      },
      
      estimator,
      serviceAdviser,
      assignedTechnician: assignedTechnician || 'Unassigned',
      
      customerComplaints,
      diagnosisNotes,
      supervisorRemarks,
      deliveryNotes,
      
      mechanicalTasks,
      dentingPaintingPanels,
      partsUsed: requisitions,
      parts: requisitions,
      requisitions,
      labor: mechanicalTasks,
      attachments: attachedPhotos,
      photos: attachedPhotos,
      
      mechanicalLaborCost,
      dentingLaborCost,
      paintingCost,
      paintBoothCharge: initialData?.paintBoothCharge || 0,
      partsCost: partsAmount,
      consumablesCost: initialData?.consumablesCost || 0,
      discount,
      taxRate: 0,
      totalAmount: netTotalAmount,
    };

    setIsSaving(true);
    try {
      const savedResult = await onSave(payload);
      setIsSaving(false);
      setIsNewRecord(false);
      setHasUnsavedChanges(false);
      setIsEditMode(false);
      localStorage.removeItem('najm_jobcard_draft');
      setHasDraftAvailable(false);
      const savedDocNumber = (savedResult as any)?.jobNumber || docNumber;
      if (savedDocNumber && !savedDocNumber.includes('...')) {
        setDocNumber(savedDocNumber);
      }
      setSaveSuccessMsg(`Job Card ${savedDocNumber} saved successfully.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsSaving(false);
      setValidationError(err?.message || 'Failed to save Job Card to backend.');
    }
  };

  const addTask = () => {
    setMechanicalTasks([...mechanicalTasks, {
      id: `TASK-${Date.now()}`,
      category: 'Routine Maintenance',
      description: 'New Task',
      estimatedHours: 1,
      hourlyRate: settings?.defaultLaborRate || 150,
      status: 'Pending'
    }]);
  };

  const addPart = (invItem: InventoryItem, qty: number = 1) => {
    setIsEditMode(true);
    const itemPrice = Number(invItem.sellingPrice ?? invItem.unitPrice ?? invItem.unitCost ?? 0);
    const quantityToAdd = Math.max(1, qty || 1);

    setRequisitions(prev => {
      const existing = prev.find(p => p.sku === invItem.sku);
      if (existing) {
        return prev.map(p => p.sku === invItem.sku ? { 
          ...p, 
          quantity: p.quantity + quantityToAdd, 
          total: (p.quantity + quantityToAdd) * (Number(p.unitPrice) || itemPrice) 
        } : p);
      }
      return [...prev, {
        id: `PART-${Date.now()}`,
        inventoryId: invItem.id,
        sku: invItem.sku,
        name: invItem.name,
        quantity: quantityToAdd,
        unitPrice: itemPrice,
        total: itemPrice * quantityToAdd,
        source: 'Inventory Stock',
        status: 'Pending'
      }];
    });
    setHasUnsavedChanges(true);
  };

  const findItems: FindResultItem[] = (allJobCards || []).map(jc => ({
    id: jc.id,
    code: jc.jobNumber,
    date: jc.dateIn,
    customerName: jc.customer?.name,
    customerPhone: jc.customer?.phone || jc.customer?.telephone,
    vehiclePlate: jc.vehicle?.plateNumber,
    vehicleModel: `${jc.vehicle?.make || ''} ${jc.vehicle?.model || ''}`.trim(),
    vin: jc.vehicle?.vin,
    status: jc.status,
    amount: jc.totalAmount,
    currency: 'QAR',
    rawRecord: jc,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-2 bg-slate-950/70 backdrop-blur-xs font-sans select-none text-[11px]">
      <div 
        className="bg-[#f0f0f0] border-2 border-[#94a3b8] rounded-xs w-full max-w-[1240px] h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto text-slate-800"
        onChangeCapture={() => setHasUnsavedChanges(true)}
      >
        
        {/* ROW 1: AUTHENTIC ENTERPRISE ACTION TOOLBAR */}
        <RecordToolbar
          isNew={isNewRecord}
          isEditing={isEditMode}
          isSaving={isSaving}
          isDeleting={isDeleting}
          hasSavedRecord={Boolean(initialData && !isNewRecord)}
          hasUnsavedChanges={hasUnsavedChanges}
          onNew={handleNewRecord}
          onSave={handleSave}
          onEdit={() => setIsEditMode(true)}
          onDelete={handleDelete}
          onCancel={handleCancel}
          onFind={() => setShowFindModal(true)}
          onPrint={() => setShowPrintModal(true)}
          onClose={onClose}
          canNavigate={true}
          currentIndex={currentIndex}
          totalRecords={allJobCards.length}
          onFirst={handleFirst}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onLast={handleLast}
          recordLabel="Job Card"
          recordNumber={docNumber}
          deleteBlockReason={deleteBlockReason}
          customActions={customToolbarActions}
        />

        {/* Validation Error Banner */}
        {validationError && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between text-rose-700 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseAndCreateInvoice}
                className="text-rose-700 font-bold hover:underline bg-rose-100 px-2 py-0.5 rounded text-[10px] border border-rose-300 cursor-pointer"
              >
                Retry Create Invoice
              </button>
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="text-rose-500 hover:text-rose-800 text-[10px] underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Save Success Banner */}
        {saveSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-emerald-800 text-xs font-bold animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 text-[10px] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Banner */}
        {invoiceSuccessMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between text-emerald-800 text-xs font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>{invoiceSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setInvoiceSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 text-[10px] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Draft Recovery Banner */}
        {hasDraftAvailable && (
          <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex items-center justify-between text-sky-800 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600 shrink-0" />
              <span>You have an autosaved Job Card draft from an earlier session.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[11px] font-bold cursor-pointer transition shadow-2xs"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Returning Customer & Vehicle Recognition Banner */}
        {returningMatch && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-amber-900 text-xs font-medium">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Existing Record Found:</strong> {returningMatch.customer?.name} ({returningMatch.customer?.phone})
                {returningMatch.vehicle ? ` • ${returningMatch.vehicle.make} ${returningMatch.vehicle.model} (${returningMatch.vehicle.plateNumber})` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (returningMatch.customer) {
                  setCustomerName(returningMatch.customer.name || '');
                  setMobileNo(returningMatch.customer.phone || '');
                  setCustomerAddress(returningMatch.customer.address || '');
                  setCustomerEmail(returningMatch.customer.email || '');
                }
                if (returningMatch.vehicle) {
                  setRegNo(returningMatch.vehicle.plateNumber || '');
                  setVehicleMake(returningMatch.vehicle.make || '');
                  setVehicleModel(returningMatch.vehicle.model || '');
                  setVehicleYear(returningMatch.vehicle.year ? returningMatch.vehicle.year : '');
                  setVinNo(returningMatch.vehicle.vin || '');
                  setVehicleColor(returningMatch.vehicle.color || '');
                  setMileageKms(returningMatch.vehicle.odometer !== undefined && returningMatch.vehicle.odometer !== null ? returningMatch.vehicle.odometer : '');
                }
                setHasUnsavedChanges(true);
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs cursor-pointer shadow-2xs transition"
            >
              1-Click Auto-Fill (No Duplicates)
            </button>
          </div>
        )}

        {/* ROW 2: Header Grid Form */}
        <div className="p-3 bg-white border-b border-[#c8ccd0] grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="w-24 text-right font-medium text-slate-600">Job Card No.</label>
              <div className="flex bg-slate-100 border border-slate-300 rounded-sm overflow-hidden flex-1 items-center">
                <input type="text" readOnly value={docNumber ?? ''} className="w-full px-2 py-0.5 bg-transparent outline-none font-bold text-slate-900 tracking-wide" />
                <span className="px-1.5 py-0.5 bg-slate-200 text-[9px] font-semibold text-slate-600 uppercase border-l border-slate-300 shrink-0">Auto Seq</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-right font-medium text-slate-600">Date In</label>
              <input
                type="text"
                placeholder="dd/mm/yyyy"
                value={docDateDisplay}
                onChange={handleDateInInputChange}
                onBlur={handleDateInBlur}
                disabled={!isEditMode}
                className="flex-1 px-2 py-0.5 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    dateInPickerRef.current?.showPicker?.();
                  } catch {
                    dateInPickerRef.current?.focus();
                  }
                }}
                disabled={!isEditMode}
                className="p-1 border border-slate-300 rounded-sm bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 cursor-pointer shrink-0"
                title="Pick Date (dd/mm/yyyy)"
                aria-label="Pick Date"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <input
                ref={dateInPickerRef}
                type="date"
                value={docDate ? (/^\d{4}-\d{2}-\d{2}$/.test(docDate) ? docDate : dmyToIso(docDate)) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setDocDate(e.target.value);
                    setDocDateDisplay(isoToDmy(e.target.value));
                    setHasUnsavedChanges(true);
                  }
                }}
                disabled={!isEditMode}
                tabIndex={-1}
                className="sr-only pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-right font-medium text-slate-600">Job Type</label>
              <select value={jobType ?? ''} onChange={e => setJobType(e.target.value as JobType)} disabled={!isEditMode} className="flex-1 px-2 py-0.5 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white disabled:bg-slate-50">
                <option value="Mechanical">Mechanical</option>
                <option value="Body & Paint">Body & Paint</option>
                <option value="Electrical">Electrical</option>
                <option value="Wash & Detailing">Wash & Detailing</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="w-28 text-right font-medium text-slate-600 shrink-0">Load Customer</label>
              <div className="flex-1 relative flex items-center">
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__NEW__') {
                      setShowQuickCustomerModal(true);
                      return;
                    }
                    const selected = allAvailableCustomers.find(c => c.id === val);
                    if (selected) {
                      setCustomerName(selected.name);
                      setMobileNo(selected.phone);
                      if (selected.city || selected.address) setCustomerAddress(selected.city || selected.address || '');
                      if (selected.email) setCustomerEmail(selected.email);
                      if (selected.name) setContactPerson(selected.name);
                      setHasUnsavedChanges(true);
                    }
                  }}
                  disabled={!isEditMode}
                  className="w-full h-[26px] pl-2 pr-12 py-0 border border-slate-300 rounded-sm outline-none bg-blue-50 focus:border-blue-400 disabled:bg-slate-50 text-xs text-slate-800 appearance-none cursor-pointer"
                >
                  <option value="">-- Select from Master --</option>
                  <option value="__NEW__" className="text-blue-700 font-bold bg-blue-50">
                    + Add New Customer...
                  </option>
                  {allAvailableCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>

                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowCustomerSearchModal(true); }}
                    disabled={!isEditMode}
                    title="Search Customers"
                    aria-label="Search Customers"
                    className="h-[20px] w-[20px] flex items-center justify-center text-slate-500 hover:text-blue-700 hover:bg-blue-100 rounded-xs disabled:opacity-50 transition cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {customerSuccessNotice && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-medium animate-in fade-in">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{customerSuccessNotice}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="w-28 text-right font-medium text-slate-600 shrink-0">Customer Name</label>
              <input
                type="text"
                value={customerName || ''}
                onChange={e => setCustomerName(e.target.value)}
                disabled={!isEditMode}
                className="flex-1 h-[26px] px-2 py-0 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 font-bold text-slate-800 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-28 text-right font-medium text-slate-600 shrink-0">Mobile No</label>
              <input
                type="text"
                value={mobileNo || ''}
                onChange={e => setMobileNo(e.target.value)}
                disabled={!isEditMode}
                className="flex-1 h-[26px] px-2 py-0 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="w-24 text-right font-medium text-slate-600">Status</label>
              <select
                value={jobStatus || 'Draft'}
                onChange={e => setJobStatus(e.target.value as JobStatus)}
                disabled={!isEditMode}
                className="flex-1 px-2 py-0.5 border border-slate-300 rounded-sm outline-none bg-white font-bold text-blue-700"
              >
                <option value="Draft">Draft</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Invoiced">Invoiced</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-right font-medium text-slate-600">Expected Del</label>
              <input
                type="text"
                placeholder="dd/mm/yyyy"
                value={expectedDeliveryDisplay}
                onChange={handleExpectedDeliveryInputChange}
                onBlur={handleExpectedDeliveryBlur}
                disabled={!isEditMode}
                className="flex-1 px-2 py-0.5 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 font-bold text-blue-700 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  try {
                    expectedDeliveryPickerRef.current?.showPicker?.();
                  } catch {
                    expectedDeliveryPickerRef.current?.focus();
                  }
                }}
                disabled={!isEditMode}
                className="p-1 border border-slate-300 rounded-sm bg-slate-50 hover:bg-slate-100 text-slate-600 disabled:opacity-50 cursor-pointer shrink-0"
                title="Pick Expected Delivery Date (dd/mm/yyyy)"
                aria-label="Pick Expected Delivery Date"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
              <input
                ref={expectedDeliveryPickerRef}
                type="date"
                value={expectedDelivery ? (/^\d{4}-\d{2}-\d{2}$/.test(expectedDelivery) ? expectedDelivery : dmyToIso(expectedDelivery)) : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setExpectedDelivery(e.target.value);
                    setExpectedDeliveryDisplay(isoToDmy(e.target.value));
                    setHasUnsavedChanges(true);
                  }
                }}
                disabled={!isEditMode}
                tabIndex={-1}
                className="sr-only pointer-events-none"
                aria-hidden="true"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 text-right font-medium text-slate-600">Assigned Tech</label>
              <input
                type="text"
                value={assignedTechnician || ''}
                onChange={e => setAssignedTechnician(e.target.value)}
                disabled={!isEditMode}
                placeholder="Assign technician..."
                className="flex-1 px-2 py-0.5 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white disabled:bg-slate-50 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Quick Service Presets Bar */}
        <div className="px-3 py-1.5 bg-slate-100 border-b border-[#c8ccd0] flex items-center gap-2 overflow-x-auto text-xs shrink-0 custom-scrollbar">
          <span className="font-extrabold text-slate-600 text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1">
            ⚡ Quick Presets:
          </span>
          <button
            type="button"
            onClick={() => applyServicePreset('oil_change')}
            disabled={!isEditMode}
            className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold rounded text-[11px] shrink-0 cursor-pointer disabled:opacity-50 transition shadow-2xs"
          >
            🛢️ Oil & Filter Service
          </button>
          <button
            type="button"
            onClick={() => applyServicePreset('brake_service')}
            disabled={!isEditMode}
            className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold rounded text-[11px] shrink-0 cursor-pointer disabled:opacity-50 transition shadow-2xs"
          >
            🛑 Brake Pad Replacement
          </button>
          <button
            type="button"
            onClick={() => applyServicePreset('ac_service')}
            disabled={!isEditMode}
            className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold rounded text-[11px] shrink-0 cursor-pointer disabled:opacity-50 transition shadow-2xs"
          >
            ❄️ AC Recharge & Gas
          </button>
          <button
            type="button"
            onClick={() => applyServicePreset('battery_service')}
            disabled={!isEditMode}
            className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold rounded text-[11px] shrink-0 cursor-pointer disabled:opacity-50 transition shadow-2xs"
          >
            🔋 Battery Check
          </button>
          <button
            type="button"
            onClick={() => applyServicePreset('obd_scan')}
            disabled={!isEditMode}
            className="px-2.5 py-1 bg-white hover:bg-sky-50 border border-slate-300 hover:border-sky-400 text-slate-700 font-semibold rounded text-[11px] shrink-0 cursor-pointer disabled:opacity-50 transition shadow-2xs"
          >
            💻 OBD Diagnostic Scan
          </button>
        </div>

        {/* Tab Headers */}
        <div className="bg-[#f0f0f0] border-b border-[#94a3b8] px-2 pt-2 flex space-x-1 shrink-0 overflow-x-auto">
          {[
            { id: 'general', label: 'General Info' },
            { id: 'remarks', label: 'Remarks / Issues' },
            { id: 'labor', label: 'Labor Details' },
            { id: 'requisitions', label: 'Requisitions' },
            { id: 'issues', label: 'Issue Details' },
            { id: 'attachments', label: attachedPhotos.length > 0 ? `Attachments (${attachedPhotos.length})` : 'Attachments' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 text-[11px] font-semibold rounded-t-sm border border-b-0 whitespace-nowrap transition-colors relative ${
                activeTab === tab.id 
                  ? 'bg-white border-[#94a3b8] text-blue-700 shadow-[0_-2px_0_0_#2563eb] z-10' 
                  : 'bg-[#e2e8f0] border-transparent border-b-[#94a3b8] text-slate-600 hover:bg-[#cbd5e1]'
              }`}
              style={activeTab === tab.id ? { marginBottom: '-1px', paddingBottom: 'calc(0.375rem + 1px)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 bg-white overflow-y-scroll p-4">
          
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* COLUMN 1: Detailed Customer Info */}
              <div className="border border-slate-200 p-3.5 bg-slate-50/60 space-y-2.5 rounded-lg shadow-2xs">
                <div className="border-b border-slate-200 pb-1.5 mb-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Detailed Customer Info</h4>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson || ''}
                    onChange={e => setContactPerson(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="Primary contact..."
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Telephone</label>
                  <input
                    type="text"
                    value={telephoneNo || ''}
                    onChange={e => setTelephoneNo(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="Landline / Tel..."
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Email</label>
                  <input
                    type="email"
                    value={customerEmail || ''}
                    onChange={e => setCustomerEmail(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="customer@domain.com"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Address 1</label>
                  <input
                    type="text"
                    value={customerAddress || ''}
                    onChange={e => setCustomerAddress(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="Street, Zone, City..."
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Fax</label>
                  <input
                    type="text"
                    value={faxNo || ''}
                    onChange={e => setFaxNo(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="Fax number..."
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>
              </div>

              {/* COLUMN 2 (Vehicle Identification & Specs): Plate, Make/Model, Year, Color, VIN */}
              <div className="border border-slate-200 p-3.5 bg-slate-50/60 space-y-2.5 rounded-lg shadow-2xs">
                <div className="border-b border-slate-200 pb-1.5 mb-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Vehicle Identification</h4>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Reg No (Plate)</label>
                  <input
                    type="text"
                    value={regNo || ''}
                    onChange={e => setRegNo(e.target.value.toUpperCase())}
                    disabled={!isEditMode}
                    className="flex-1 px-2.5 py-1 border border-amber-300 rounded-md outline-none focus:border-blue-500 font-bold uppercase bg-[#fffae6] disabled:bg-slate-100 text-xs text-slate-900 tracking-wider"
                    placeholder="E.G. 123456"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Make/Model</label>
                  <div className="flex flex-1 gap-1.5">
                    <input
                      type="text"
                      list="gen-vehicle-makes-list"
                      value={vehicleMake || ''}
                      onChange={e => setVehicleMake(e.target.value)}
                      disabled={!isEditMode}
                      className="w-1/2 px-2.5 py-1 border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-xs text-slate-800 font-medium"
                      placeholder="Make"
                    />
                    <datalist id="gen-vehicle-makes-list">
                      {getAllVehicleBrands().map(b => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>

                    <input
                      type="text"
                      list="gen-vehicle-models-list"
                      value={vehicleModel || ''}
                      onChange={e => setVehicleModel(e.target.value)}
                      disabled={!isEditMode}
                      className="w-1/2 px-2.5 py-1 border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-xs text-slate-800 font-medium"
                      placeholder="Model"
                    />
                    <datalist id="gen-vehicle-models-list">
                      {getVehicleModelsForBrand(vehicleMake || '').map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Vehicle Year</label>
                  <input
                    type="number"
                    value={vehicleYear !== '' && vehicleYear !== null && vehicleYear !== undefined ? vehicleYear : ''}
                    onChange={e => setVehicleYear(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!isEditMode}
                    placeholder="e.g. 2024"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 font-mono font-medium text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Color</label>
                  <input
                    type="text"
                    value={vehicleColor || ''}
                    onChange={e => setVehicleColor(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="e.g. Pearl White"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">VIN / Chassis</label>
                  <input
                    type="text"
                    value={vinNo || ''}
                    onChange={e => setVinNo(e.target.value.toUpperCase())}
                    disabled={!isEditMode}
                    className="flex-1 px-2.5 py-1 border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 uppercase font-mono text-xs text-slate-800"
                    placeholder="17-Digit VIN / Chassis..."
                  />
                </div>
              </div>

              {/* COLUMN 3: Specifications & Readings */}
              <div className="border border-slate-200 p-3.5 bg-slate-50/60 space-y-2.5 rounded-lg shadow-2xs">
                <div className="border-b border-slate-200 pb-1.5 mb-1">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Specifications & Readings</h4>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Odometer (Kms)</label>
                  <input
                    type="number"
                    value={mileageKms !== '' && mileageKms !== null && mileageKms !== undefined ? mileageKms : ''}
                    onChange={e => setMileageKms(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!isEditMode}
                    placeholder="e.g. 45000"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Engine No</label>
                  <input
                    type="text"
                    value={engineNo || ''}
                    onChange={e => setEngineNo(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="e.g. 1GR-FE"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 font-mono text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Tyre Size</label>
                  <input
                    type="text"
                    value={tyreSize || ''}
                    onChange={e => setTyreSize(e.target.value)}
                    disabled={!isEditMode}
                    placeholder="e.g. 285/60 R18"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-28 text-right font-medium text-slate-700 text-xs shrink-0">Fuel Level %</label>
                  <input
                    type="number"
                    value={fuelLevel !== '' && fuelLevel !== null && fuelLevel !== undefined ? fuelLevel : ''}
                    onChange={e => setFuelLevel(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={!isEditMode}
                    placeholder="e.g. 50"
                    min="0"
                    max="100"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-400 bg-white disabled:bg-slate-100 font-mono font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'remarks' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              <div className="space-y-2 flex flex-col h-full">
                <label className="font-bold text-slate-800 border-b border-slate-200 pb-1">Customer Complaints</label>
                <textarea value={customerComplaints || ''} onChange={e=>setCustomerComplaints(e.target.value)} disabled={!isEditMode} className="flex-1 w-full p-2 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white resize-none" placeholder="Enter complaints..." />
              </div>
              <div className="space-y-2 flex flex-col h-full">
                <label className="font-bold text-slate-800 border-b border-slate-200 pb-1">Diagnosis Notes / Findings</label>
                <textarea value={diagnosisNotes || ''} onChange={e=>setDiagnosisNotes(e.target.value)} disabled={!isEditMode} className="flex-1 w-full p-2 border border-slate-300 rounded-sm outline-none focus:border-blue-400 bg-white resize-none" placeholder="Enter diagnosis..." />
              </div>
            </div>
          )}

          {activeTab === 'labor' && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-slate-800">Mechanical & Technical Tasks</h4>
                <button onClick={addTask} disabled={!isEditMode} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-sm flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Task
                </button>
              </div>
              <div className="border border-slate-300 overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#e4e7eb] border-b border-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Description</th>
                      <th className="p-2 border-r border-slate-300 w-32">Category</th>
                      <th className="p-2 border-r border-slate-300 w-24">Hours</th>
                      <th className="p-2 border-r border-slate-300 w-24">Rate</th>
                      <th className="p-2 border-r border-slate-300 w-24">Total</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mechanicalTasks.map((t, i) => (
                      <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="p-1 border-r border-slate-200"><input type="text" value={t.description || ''} onChange={e => {const n = [...mechanicalTasks]; n[i].description = e.target.value; setMechanicalTasks(n);}} disabled={!isEditMode} className="w-full px-1 py-0.5 border border-transparent hover:border-slate-300 focus:border-blue-400 outline-none bg-transparent" /></td>
                        <td className="p-1 border-r border-slate-200">
                          <select value={t.category || 'Routine Maintenance'} onChange={e => {const n = [...mechanicalTasks]; n[i].category = e.target.value as any; setMechanicalTasks(n);}} disabled={!isEditMode} className="w-full px-1 py-0.5 outline-none bg-transparent">
                            <option value="Engine">Engine</option>
                            <option value="Brakes">Brakes</option>
                            <option value="Routine Maintenance">Maint</option>
                          </select>
                        </td>
                        <td className="p-1 border-r border-slate-200"><input type="number" value={t.estimatedHours ?? 0} onChange={e => {const n = [...mechanicalTasks]; n[i].estimatedHours = Number(e.target.value); setMechanicalTasks(n);}} disabled={!isEditMode} className="w-full px-1 py-0.5 border border-transparent outline-none bg-transparent text-right" /></td>
                        <td className="p-1 border-r border-slate-200"><input type="number" value={t.hourlyRate ?? 0} onChange={e => {const n = [...mechanicalTasks]; n[i].hourlyRate = Number(e.target.value); setMechanicalTasks(n);}} disabled={!isEditMode} className="w-full px-1 py-0.5 border border-transparent outline-none bg-transparent text-right" /></td>
                        <td className="p-2 border-r border-slate-200 text-right font-bold text-slate-800">{(Number(t.estimatedHours || 0) * Number(t.hourlyRate || 0)).toFixed(2)}</td>
                        <td className="p-1 text-center"><button onClick={() => {const n = [...mechanicalTasks]; n.splice(i, 1); setMechanicalTasks(n);}} disabled={!isEditMode} className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'requisitions' && (
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-slate-800">Parts Requisition (Internal Items)</h4>
              </div>
              <div className="flex gap-4 h-full">
                <div className="w-1/3 border border-slate-300 rounded-sm flex flex-col bg-white">
                  <div className="p-2 border-b border-slate-200 bg-slate-50 font-bold flex items-center justify-between">
                    <span>Inventory Master</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditMode(true);
                        setShowQuickAddPartModal(true);
                      }}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  <div className="p-1.5 border-b border-slate-200 bg-slate-100">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Search SKU or Part Name... (F5 for Advanced Search)"
                        value={requisitionSearch ?? ''}
                        onChange={(e) => setRequisitionSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'F5') {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAdvancedItemSearch(true);
                          }
                        }}
                        className="w-full pl-2 pr-9 py-1 text-xs border border-slate-300 rounded-sm bg-white outline-none focus:border-blue-400 font-medium"
                        title="Search SKU or Part Name. Press F5 while in this search field to open Advanced Item Search with filters."
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdvancedItemSearch(true)}
                        title="Open Advanced Item Search (Shortcut: F5)"
                        className="absolute right-1 px-1.5 py-0.5 text-[9px] font-mono font-black bg-slate-200 hover:bg-sky-100 hover:text-sky-700 text-slate-700 rounded border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                      >
                        F5
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-1 space-y-1">
                    {inventory
                      .filter(item => {
                        if (!requisitionSearch) return true;
                        const s = requisitionSearch.toLowerCase();
                        const n = (item.name || '').toLowerCase();
                        const k = (item.sku || '').toLowerCase();
                        return n.includes(s) || k.includes(s);
                      })
                      .map(item => {
                        const itemPrice = Number(item.sellingPrice ?? item.unitPrice ?? item.unitCost ?? 0);
                        const itemStock = Number(item.quantityOnHand ?? item.quantity ?? item.stockQuantity ?? 0);
                        return (
                          <div 
                            key={item.id} 
                            onClick={() => {
                              setIsEditMode(true);
                              addPart(item);
                            }} 
                            className="p-2 text-xs border border-slate-200 rounded-sm cursor-pointer hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-bold">{item.name}</div>
                            <div className="text-[10px] text-slate-500">{item.sku} | Price: {itemPrice.toFixed(2)} | Stock: {itemStock}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <div className="w-2/3 border border-slate-300 overflow-y-auto flex-1 flex flex-col justify-between">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#e4e7eb] border-b border-slate-300 sticky top-0">
                      <tr>
                        <th className="p-2 border-r border-slate-300 w-12 text-center">SL</th>
                        <th className="p-2 border-r border-slate-300">SKU</th>
                        <th className="p-2 border-r border-slate-300">Part Name</th>
                        <th className="p-2 border-r border-slate-300 w-28">Source</th>
                        <th className="p-2 border-r border-slate-300 w-28 text-center">Qty</th>
                        <th className="p-2 border-r border-slate-300 w-20 text-right">Price</th>
                        <th className="p-2 border-r border-slate-300 w-20 text-right">Total</th>
                        <th className="p-2 border-r border-slate-300 w-28">Status</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {requisitions.map((p, i) => {
                        const price = Number(p.unitPrice ?? 0);
                        const qty = Number(p.quantity ?? 1);
                        const total = Number(p.total ?? (qty * price));
                        const currentSource = p.source || 'Inventory Stock';
                        const currentStatus = p.status || 'Pending';

                        return (
                          <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-200 text-center font-mono text-xs text-slate-500 font-bold">{i + 1}</td>
                            <td className="p-2 border-r border-slate-200 font-mono text-xs">{p.sku}</td>
                            <td className="p-2 border-r border-slate-200">{p.name}</td>
                            <td className="p-1 border-r border-slate-200">
                              <select
                                value={currentSource ?? ''}
                                onChange={e => {
                                  const n = [...requisitions];
                                  n[i] = { ...n[i], source: e.target.value as any };
                                  setRequisitions(n);
                                  setHasUnsavedChanges(true);
                                  setIsEditMode(true);
                                }}
                                className="w-full px-1 py-0.5 text-[11px] outline-none bg-white border border-slate-300 rounded-xs"
                              >
                                <option value="Inventory Stock">📦 Stock</option>
                                <option value="Outside Purchase / PO">🛒 Outside PO</option>
                              </select>
                            </td>
                            <td className="p-1 border-r border-slate-200">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentQty = Number(p.quantity) || 1;
                                    const newQty = Math.max(1, currentQty - 1);
                                    handleUpdatePartQty(i, newQty);
                                  }}
                                  className="w-6 h-6 bg-slate-100 hover:bg-blue-100 active:bg-blue-200 border border-slate-300 rounded-xs flex items-center justify-center font-bold text-xs text-slate-700 cursor-pointer shrink-0 transition select-none"
                                  title="Decrease Quantity"
                                  aria-label="Decrease Quantity"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={p.quantity === 0 ? '' : (p.quantity ?? 1)}
                                  onFocus={e => e.target.select()}
                                  onClick={e => (e.target as HTMLInputElement).select()}
                                  onChange={e => handleUpdatePartQty(i, e.target.value)}
                                  onBlur={() => {
                                    const val = Number(p.quantity);
                                    if (!val || val <= 0 || isNaN(val)) {
                                      handleUpdatePartQty(i, 1);
                                    } else {
                                      handleUpdatePartQty(i, val);
                                    }
                                  }}
                                  className="w-14 px-1 py-0.5 outline-none text-center font-bold font-mono text-xs text-slate-900 bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 rounded-xs cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  title="Part Quantity (Click or type to change)"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentQty = Number(p.quantity) || 0;
                                    const newQty = currentQty + 1;
                                    handleUpdatePartQty(i, newQty);
                                  }}
                                  className="w-6 h-6 bg-slate-100 hover:bg-blue-100 active:bg-blue-200 border border-slate-300 rounded-xs flex items-center justify-center font-bold text-xs text-slate-700 cursor-pointer shrink-0 transition select-none"
                                  title="Increase Quantity"
                                  aria-label="Increase Quantity"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-1 border-r border-slate-200 text-right font-mono">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={p.unitPrice === '' ? '' : (p.unitPrice ?? price ?? 0)}
                                disabled={!isEditMode}
                                onFocus={e => e.target.select()}
                                onClick={e => (e.target as HTMLInputElement).select()}
                                onChange={e => handleUpdatePartPrice(i, e.target.value)}
                                className="w-20 px-1 py-0.5 outline-none text-right font-bold font-mono text-xs text-slate-900 bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 rounded-xs cursor-text [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-50 disabled:border-transparent"
                                title="Part Unit Price (Click or type to change)"
                              />
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-bold font-mono text-emerald-700">{total.toFixed(2)}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center text-[10px]">
                              {currentStatus === 'Issued' ? (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-xs border border-emerald-300 inline-block">Issued</span>
                              ) : currentStatus === 'PO Created' ? (
                                <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-xs border border-indigo-300 inline-block" title={p.supplierName}>{p.poNumber || 'PO Created'}</span>
                              ) : (
                                <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-xs border border-amber-300 inline-block">Pending</span>
                              )}
                            </td>
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const n = [...requisitions];
                                  n.splice(i, 1);
                                  setRequisitions(n);
                                  setHasUnsavedChanges(true);
                                  setIsEditMode(true);
                                }}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                title="Remove Part"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BOTTOM REQUISITION DECISION ACTION BAR */}
              <div className="mt-2 pt-2 border-t border-slate-300 flex items-center justify-between bg-slate-100 p-2 rounded-sm border border-slate-200">
                <div className="text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block">Requisition Source & Execution:</span>
                  <span className="text-[10px] text-slate-500">Decide whether parts are issued from inventory or purchased outside via PO.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPOModal(true)}
                    disabled={!isEditMode || requisitions.length === 0}
                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    title="Create Purchase Order for outside parts"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Create PO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (requisitions.length === 0) {
                        alert('No requisition parts found in this job card to issue.');
                        return;
                      }
                      setIsRequisitionIssueModalOpen(true);
                    }}
                    disabled={!isEditMode || requisitions.length === 0}
                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xs flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    title="Issue material from local inventory stock"
                  >
                    <Package className="w-3 h-3" />
                    <span>Issue Material</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Issue Details Tab */}
          {activeTab === 'issues' && (
            <div className="h-full flex flex-col justify-between">
              <div className="space-y-3">
                {/* Header bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span>Material Issue & Dispatch Details</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">
                        {requisitions.filter(p => p.status === 'Issued').length} Issued Item(s)
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Parts issued to this job card from inventory stock or outside purchase orders. Select issued items to make an issue return back into inventory.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Total Issued Value:</span>
                    <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      QAR {requisitions.filter(p => p.status === 'Issued').reduce((acc, p) => acc + (Number(p.total) || (Number(p.quantity) * Number(p.unitPrice))), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* IN-TAB FEEDBACK BANNER */}
                {issueFeedback && (
                  <div className={`p-3 rounded-lg flex items-center justify-between text-xs font-semibold ${
                    issueFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : issueFeedback.type === 'error'
                        ? 'bg-rose-50 text-rose-800 border border-rose-300'
                        : 'bg-blue-50 text-blue-800 border border-blue-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {issueFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{issueFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIssueFeedback(null)}
                      className="text-slate-500 hover:text-slate-800 font-bold ml-2 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Issued Items Table */}
                {requisitions.filter(p => p.status === 'Issued').length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl my-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                      <Package className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">No Issued Items Found</h4>
                    <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                      No materials have been issued to this job card yet. Go to the "Requisitions" tab and click "Issue Material" to dispatch parts from inventory stock or outside purchase.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('requisitions')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                    >
                      Go to Requisitions Tab
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-300 rounded-sm overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#e4e7eb] border-b border-slate-300 sticky top-0 text-slate-700 font-bold">
                        <tr>
                          <th className="p-2 w-10 text-center border-r border-slate-300">
                            <input
                              type="checkbox"
                              checked={
                                requisitions.filter(p => p.status === 'Issued').length > 0 &&
                                requisitions.filter(p => p.status === 'Issued').every(p => selectedIssueReturnIds.includes(p.id))
                              }
                              onChange={() => {
                                const issued = requisitions.filter(p => p.status === 'Issued');
                                const allSelected = issued.every(p => selectedIssueReturnIds.includes(p.id));
                                if (allSelected) {
                                  setSelectedIssueReturnIds([]);
                                } else {
                                  setSelectedIssueReturnIds(issued.map(p => p.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-400 cursor-pointer w-4 h-4"
                              title="Select All Issued Items"
                            />
                          </th>
                          <th className="p-2 border-r border-slate-300">SKU & Item Name</th>
                          <th className="p-2 border-r border-slate-300 w-36">Source</th>
                          <th className="p-2 border-r border-slate-300 w-36">Issued To (Tech)</th>
                          <th className="p-2 border-r border-slate-300 w-20 text-center">Issued Qty</th>
                          <th className="p-2 border-r border-slate-300 w-28 text-center">Return Qty</th>
                          <th className="p-2 border-r border-slate-300 w-24 text-right">Price (QAR)</th>
                          <th className="p-2 border-r border-slate-300 w-24 text-right">Total (QAR)</th>
                          <th className="p-2 border-r border-slate-300 w-28 text-center">Current Stock</th>
                          <th className="p-2 border-r border-slate-300 w-28 text-center">After Return</th>
                          <th className="p-2 w-20 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {requisitions.filter(p => p.status === 'Issued').map((p) => {
                          const isSelected = selectedIssueReturnIds.includes(p.id);
                          const invMatch = inventory.find(i => 
                            i.id === p.inventoryId || 
                            (p.sku && i.sku && String(i.sku).toLowerCase() === String(p.sku).toLowerCase()) || 
                            (p.name && i.name && String(i.name).toLowerCase() === String(p.name).toLowerCase())
                          );
                          const currentStockOnHand = invMatch ? Number(invMatch.quantityOnHand ?? invMatch.stockQuantity ?? 0) : 0;
                          const returnQty = issueReturnQtys[p.id] ?? Number(p.quantity) ?? 1;
                          const projectedStockAfterReturn = currentStockOnHand + returnQty;
                          const isFromPO = p.source === 'Outside Purchase / PO' || !!p.poNumber;

                          return (
                            <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}>
                              {/* Selection checkbox */}
                              <td className="p-2 text-center border-r border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedIssueReturnIds(prev => prev.filter(id => id !== p.id));
                                    } else {
                                      setSelectedIssueReturnIds(prev => [...prev, p.id]);
                                    }
                                  }}
                                  className="rounded text-amber-600 focus:ring-amber-400 cursor-pointer w-4 h-4"
                                />
                              </td>

                              {/* SKU & Name */}
                              <td className="p-2 border-r border-slate-200">
                                <div className="font-bold text-slate-900">{p.name}</div>
                                <div className="text-[11px] font-mono text-slate-500">SKU: {p.sku || '-'}</div>
                              </td>

                              {/* Source */}
                              <td className="p-2 border-r border-slate-200">
                                {isFromPO ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                                    <ShoppingBag className="w-3 h-3 text-indigo-500" />
                                    <span>Outside PO {p.poNumber ? `(${p.poNumber})` : ''}</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                                    <Package className="w-3 h-3 text-emerald-500" />
                                    <span>Inventory Stock</span>
                                  </span>
                                )}
                              </td>

                              {/* Issued To Technician */}
                              <td className="p-2 border-r border-slate-200 text-slate-700">
                                <span className="font-semibold text-slate-800">
                                  {p.technician || assignedTechnician || 'Lead Technician'}
                                </span>
                              </td>

                              {/* Issued Qty */}
                              <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-blue-700">
                                {p.quantity}
                              </td>

                              {/* Return Qty Input */}
                              <td className="p-1 border-r border-slate-200 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  max={p.quantity}
                                  value={returnQty}
                                  onChange={e => {
                                    const val = Math.min(Number(p.quantity) || 1, Math.max(1, parseInt(e.target.value, 10) || 1));
                                    setIssueReturnQtys(prev => ({ ...prev, [p.id]: val }));
                                  }}
                                  className="w-16 px-1.5 py-0.5 text-center font-bold font-mono border border-slate-300 rounded bg-white text-slate-900 outline-none focus:border-amber-500"
                                />
                              </td>

                              {/* Unit Price */}
                              <td className="p-2 border-r border-slate-200 text-right font-mono text-slate-600">
                                {Number(p.unitPrice || 0).toFixed(2)}
                              </td>

                              {/* Total Price */}
                              <td className="p-2 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                                {(Number(p.quantity) * Number(p.unitPrice || 0)).toFixed(2)}
                              </td>

                              {/* Current Stock */}
                              <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-slate-600">
                                {currentStockOnHand}
                              </td>

                              {/* Projected Stock after Return */}
                              <td className="p-2 border-r border-slate-200 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">
                                +{returnQty} → {projectedStockAfterReturn}
                              </td>

                              {/* Individual Return Button */}
                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleExecuteIssueReturn([p])}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1 mx-auto cursor-pointer transition shadow-2xs"
                                  title="Return this item back to inventory"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Return</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom Action Footer with Issue Return at Bottom Right Corner */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-600 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>
                    Selected for Return:{' '}
                    <strong className="text-slate-900 font-mono text-sm">
                      {selectedIssueReturnIds.length}
                    </strong>{' '}
                    item(s)
                  </span>
                  {selectedIssueReturnIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedIssueReturnIds([])}
                      className="text-slate-500 hover:text-slate-800 underline text-xs ml-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* BOTTOM RIGHT CORNER: Issue Return Button */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const allIssued = requisitions.filter(p => p.status === 'Issued');
                      if (allIssued.length === 0) {
                        setIssueFeedback({ type: 'info', message: 'No issued items available to return.' });
                        return;
                      }
                      const selectedItems = allIssued.filter(p => selectedIssueReturnIds.includes(p.id));
                      const itemsToReturn = selectedItems.length > 0 ? selectedItems : allIssued;
                      handleExecuteIssueReturn(itemsToReturn);
                    }}
                    disabled={requisitions.filter(p => p.status === 'Issued').length === 0}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    title="Return issued parts back to inventory stock"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {selectedIssueReturnIds.length > 0 
                        ? `Issue Return (${selectedIssueReturnIds.length})` 
                        : 'Issue Return'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Attachments & Local Drive Photo Management Panel */}
          {activeTab === 'attachments' && (
            <div className="h-full overflow-hidden p-1">
              <JobCardPhotoAttachments
                jobCardId={initialData?.id || docNumber || 'draft'}
                jobCardNumber={docNumber || initialData?.jobNumber || 'JC-DRAFT'}
                vehiclePlate={regNo || initialData?.vehicle?.plateNumber || ''}
                isEditMode={isEditMode}
                initialPhotos={attachedPhotos}
                onPhotosChange={(updated) => {
                  setAttachedPhotos(updated);
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          )}

        </div>

        {/* BOTTOM TOTALS FOOTER (ERP STYLE) */}
        <div className="bg-[#e4e7eb] border-t border-[#94a3b8] p-2 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            {existingLinkedInvoice ? (
              <button
                type="button"
                onClick={async () => {
                  if (hasUnsavedChanges) {
                    await handleSave();
                  }
                  const targetRef = existingLinkedInvoice.id || (docNumber && docNumber !== 'Loading...' ? docNumber : initialData?.jobNumber) || initialData?.id || '';
                  if (onOpenInvoice) {
                    onClose();
                    onOpenInvoice(targetRef);
                  } else if (onGenerateInvoice && initialData?.id) {
                    onGenerateInvoice(initialData.id);
                  }
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span>View Invoice ({existingLinkedInvoice.invoiceNumber})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloseAndCreateInvoice}
                disabled={isSaving || isProcessingInvoice}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                {isProcessingInvoice ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Receipt className="w-4 h-4" />
                )}
                <span>
                  {isProcessingInvoice ? 'Creating Invoice...' : jobStatus === 'Closed' ? 'Create Invoice' : 'Close & Create Invoice'}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Total Parts:</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 border border-slate-300 rounded-sm w-24 text-right">{(Number(partsAmount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Total Labor:</span>
              <span className="font-bold text-slate-800 bg-white px-2 py-0.5 border border-slate-300 rounded-sm w-24 text-right">{(Number(totalLaborCost) || 0).toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Discount:</span>
              <input type="number" value={discount ?? 0} onChange={e=>setDiscount(Number(e.target.value))} disabled={!isEditMode} className="font-bold text-red-600 bg-white px-2 py-0.5 border border-slate-300 rounded-sm w-20 text-right outline-none" />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="font-bold text-slate-700 uppercase tracking-wide">Net Total:</span>
              <span className="font-black text-emerald-700 bg-emerald-50 px-3 py-0.5 border border-emerald-300 rounded-sm w-28 text-right text-[13px]">{(Number(netTotalAmount) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <QuickAddPartModal
          isOpen={showQuickAddPartModal}
          onClose={() => setShowQuickAddPartModal(false)}
          onPartCreated={(newPart) => {
            setIsEditMode(true);
            addPart(newPart);
            setActiveTab('requisitions');
          }}
        />

        <AdvancedItemSearchModal
          isOpen={showAdvancedItemSearch}
          onClose={() => setShowAdvancedItemSearch(false)}
          inventory={inventory}
          initialSearchQuery={requisitionSearch}
          onSelectItem={(item, qty) => {
            setIsEditMode(true);
            addPart(item, qty);
            setActiveTab('requisitions');
          }}
          title="Advanced Parts & Inventory Item Search"
          subtitle="Search across SKU, OEM, Brand, Fitment, Rack Location, and detailed stock levels"
        />

        <RequisitionPOModal
          isOpen={showPOModal}
          onClose={() => setShowPOModal(false)}
          jobCardNumber={docNumber}
          parts={requisitions}
          onPOCreated={(poNo, updatedParts) => {
            setRequisitions(updatedParts);
          }}
        />

        {/* Dedicated Requisition Stock Issue Window */}
        <RequisitionIssueModal
          isOpen={isRequisitionIssueModalOpen}
          onClose={() => setIsRequisitionIssueModalOpen(false)}
          jobNumber={docNumber || initialData?.jobNumber || 'JC-NEW'}
          vehiclePlate={regNo || initialData?.vehicle?.plateNumber || ''}
          requisitions={requisitions}
          inventory={inventory}
          defaultTechnician={assignedTechnician}
          onConfirmIssue={handleConfirmIssueRequisitions}
        />

        {/* Search / Find Job Card Modal */}
        <FindRecordModal
          isOpen={showFindModal}
          onClose={() => setShowFindModal(false)}
          onSelect={(card) => {
            loadJobCard(card);
            setIsNewRecord(false);
            setIsEditMode(false);
            setHasUnsavedChanges(false);
          }}
          title="Find Job Card"
          placeholder="Search by Job Card No, customer name, phone, plate, VIN..."
          items={findItems}
        />

        {/* Official Printable Job Card Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs font-sans">
            <div className="bg-white border-2 border-slate-400 rounded-xs w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
              <PrintModalHeader
                title="Workshop Job Card"
                documentId={docNumber}
                targetElementId="printable-job-card-view"
                onClose={() => setShowPrintModal(false)}
                accentColor="#1e3a8a"
              />

              <div id="printable-job-card-view" className="p-6 overflow-y-auto flex-1 bg-white font-sans text-slate-900 space-y-4 text-xs">
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">{settings?.garageName || 'Najm Al Huda Auto Maintenance'}</h1>
                    {settings?.garageNameAr && <p className="text-sm font-semibold text-slate-600">{settings.garageNameAr}</p>}
                    <p className="text-xs text-slate-600 mt-1">{settings?.address || 'Industrial Area, St. 24'}, {settings?.cityStateZip || 'Doha, Qatar'}</p>
                    <p className="text-xs text-slate-600">Tel: {settings?.phone || '+974 4450 1234'} • CR No: {settings?.crNumber || '123456'}</p>
                  </div>
                  <div className="text-right font-mono">
                    <div className="inline-block px-3 py-1 bg-blue-900 text-white font-black text-sm rounded-xs tracking-wider uppercase mb-1">
                      WORK ORDER / JOB CARD
                    </div>
                    <div className="font-black text-base text-blue-950 mt-1">{docNumber}</div>
                    <div className="text-slate-600 text-[11px]">Date In: {formatDate(docDate)} {docTime}</div>
                    <div className="text-slate-600 text-[11px]">Delivery: {expectedDelivery ? formatDate(expectedDelivery) : 'Not specified'}</div>
                    <div className="text-slate-600 text-[11px] font-bold">Status: {jobStatus}</div>
                  </div>
                </div>

                {/* Customer and Vehicle boxes */}
                <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded p-3 bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 mb-1.5 uppercase tracking-wide">Customer Information</h3>
                    <div className="space-y-0.5 text-xs">
                      <div><span className="text-slate-500 font-medium">Name:</span> <strong className="text-slate-900">{customerName || 'N/A'}</strong></div>
                      <div><span className="text-slate-500 font-medium">Phone:</span> {mobileNo || telephoneNo || 'N/A'}</div>
                      {customerEmail && <div><span className="text-slate-500 font-medium">Email:</span> {customerEmail}</div>}
                      {customerAddress && <div><span className="text-slate-500 font-medium">Address:</span> {customerAddress}</div>}
                      {contactPerson && <div><span className="text-slate-500 font-medium">Contact:</span> {contactPerson}</div>}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 mb-1.5 uppercase tracking-wide">Vehicle Details</h3>
                    <div className="space-y-0.5 text-xs">
                      <div><span className="text-slate-500 font-medium">Plate No:</span> <strong className="text-slate-900 font-mono text-sm">{regNo || 'N/A'}</strong> ({regPrefix})</div>
                      <div><span className="text-slate-500 font-medium">Vehicle:</span> {vehicleMake} {vehicleModel} {vehicleYear ? `(${vehicleYear})` : ''}</div>
                      <div><span className="text-slate-500 font-medium">Color:</span> {vehicleColor || 'N/A'} • <span className="text-slate-500 font-medium">Mileage:</span> {mileageKms} km</div>
                      {vinNo && <div><span className="text-slate-500 font-medium">VIN:</span> <span className="font-mono">{vinNo}</span></div>}
                      <div><span className="text-slate-500 font-medium">Fuel Level:</span> {fuelLevel}%</div>
                    </div>
                  </div>
                </div>

                {/* Work Scope / Complaints */}
                {(customerComplaints || diagnosisNotes || supervisorRemarks) && (
                  <div className="border border-slate-300 rounded p-3 space-y-2">
                    {customerComplaints && (
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Customer Complaints:</span>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{customerComplaints}</p>
                      </div>
                    )}
                    {diagnosisNotes && (
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Diagnosis / Findings:</span>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{diagnosisNotes}</p>
                      </div>
                    )}
                    {supervisorRemarks && (
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Supervisor Remarks:</span>
                        <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{supervisorRemarks}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Labor Tasks Table */}
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">Labor Operations</h3>
                  <table className="w-full text-left border border-slate-300 text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-1.5 w-8 text-center">#</th>
                        <th className="p-1.5">Description / Task</th>
                        <th className="p-1.5 text-center w-20">Hours</th>
                        <th className="p-1.5 text-right w-24">Rate (QAR)</th>
                        <th className="p-1.5 text-right w-24">Total (QAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {mechanicalTasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-2 text-center text-slate-400 italic">No labor operations listed</td>
                        </tr>
                      ) : (
                        mechanicalTasks.map((t, idx) => (
                          <tr key={t.id || idx}>
                            <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-1.5 font-medium">{t.description}</td>
                            <td className="p-1.5 text-center font-mono">{t.estimatedHours}</td>
                            <td className="p-1.5 text-right font-mono">{(Number(t.hourlyRate) || 0).toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono font-bold">{(Number(t.estimatedHours || 1) * Number(t.hourlyRate || 0)).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Parts & Materials Table */}
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1">Parts & Materials Requisition</h3>
                  <table className="w-full text-left border border-slate-300 text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-1.5 w-8 text-center">#</th>
                        <th className="p-1.5">Part Description</th>
                        <th className="p-1.5 w-28">Part No / SKU</th>
                        <th className="p-1.5 text-center w-16">Qty</th>
                        <th className="p-1.5 text-right w-24">Price (QAR)</th>
                        <th className="p-1.5 text-right w-24">Total (QAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {requisitions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-2 text-center text-slate-400 italic">No parts requisitioned</td>
                        </tr>
                      ) : (
                        requisitions.map((p, idx) => (
                          <tr key={p.id || idx}>
                            <td className="p-1.5 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-1.5 font-medium">{p.name}</td>
                            <td className="p-1.5 font-mono text-[10px] text-slate-600">{p.sku || '-'}</td>
                            <td className="p-1.5 text-center font-mono">{p.quantity}</td>
                            <td className="p-1.5 text-right font-mono">{(Number(p.unitPrice) || 0).toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono font-bold">{(Number(p.total) || (p.quantity * Number(p.unitPrice || 0))).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Totals */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1 text-xs border border-slate-300 rounded p-2.5 bg-slate-50">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Labor:</span>
                      <span className="font-mono font-bold">{(Number(totalLaborCost) || 0).toFixed(2)} QAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Parts:</span>
                      <span className="font-mono font-bold">{(Number(partsAmount) || 0).toFixed(2)} QAR</span>
                    </div>
                    {Number(totalOtherCharge || 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Other Charges:</span>
                        <span className="font-mono font-bold">{(Number(totalOtherCharge) || 0).toFixed(2)} QAR</span>
                      </div>
                    )}
                    {Number(discount || 0) > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <span className="font-mono font-bold">-{(Number(discount) || 0).toFixed(2)} QAR</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-300 pt-1 text-sm font-black text-blue-950">
                      <span>Grand Total:</span>
                      <span className="font-mono">{(Number(netTotalAmount) || 0).toFixed(2)} QAR</span>
                    </div>
                  </div>
                </div>

                {/* Authorization Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-xs">
                  <div>
                    <div className="border-b border-slate-400 h-10 mb-1"></div>
                    <span className="font-medium text-slate-700">Customer Signature</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-10 mb-1"></div>
                    <span className="font-medium text-slate-700">Service Advisor</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 h-10 mb-1"></div>
                    <span className="font-medium text-slate-700">Workshop Supervisor</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Customer Search Modal */}
      {showCustomerSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-200" />
                <h3 className="font-bold text-sm">Search Customer Master</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowCustomerSearchModal(false); clearAllFilters(); }}
                className="text-blue-200 hover:text-white p-1 rounded-sm hover:bg-blue-600/50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* PRIMARY SEARCH BAR - Matches CSS selector 1 */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={customerSearchQuery}
                  onChange={e => setCustomerSearchQuery(e.target.value)}
                  placeholder="Quick search across all fields (Customer, Phone, Reg No, Chassis, Model)..."
                  className="w-full pl-9 pr-16 py-2 text-xs border border-slate-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white font-medium"
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 px-1 py-0.5 text-xs font-bold"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* SPECIFIC FILTERING OPTIONS GRID */}
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Filter className="w-3.5 h-3.5 text-blue-600" />
                    <span>Filtering Options:</span>
                    {activeFilterCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                        {activeFilterCount} Active
                      </span>
                    )}
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {/* Customer Name Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Customer Name</label>
                    <input
                      type="text"
                      value={filterCustomerName}
                      onChange={e => setFilterCustomerName(e.target.value)}
                      placeholder="e.g. Abdullah..."
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none focus:border-blue-500 focus:bg-blue-50/20"
                    />
                  </div>

                  {/* Mobile / Tel No Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Mobile / Tel No</label>
                    <input
                      type="text"
                      value={filterPhone}
                      onChange={e => setFilterPhone(e.target.value)}
                      placeholder="e.g. 55..., 44..."
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none focus:border-blue-500 focus:bg-blue-50/20 font-mono"
                    />
                  </div>

                  {/* Reg No (Plate No) Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Reg No (Plate No)</label>
                    <input
                      type="text"
                      value={filterRegNo}
                      onChange={e => setFilterRegNo(e.target.value)}
                      placeholder="e.g. 123456 / QA..."
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none focus:border-blue-500 focus:bg-blue-50/20 font-mono uppercase"
                    />
                  </div>

                  {/* Chassis No (VIN) Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Chassis No (VIN)</label>
                    <input
                      type="text"
                      value={filterChassisNo}
                      onChange={e => setFilterChassisNo(e.target.value)}
                      placeholder="e.g. JTE..., KMH..."
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none focus:border-blue-500 focus:bg-blue-50/20 font-mono uppercase"
                    />
                  </div>

                  {/* Model / Make Filter */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Model / Make</label>
                    <input
                      type="text"
                      value={filterModel}
                      onChange={e => setFilterModel(e.target.value)}
                      placeholder="e.g. Land Cruiser, Patrol..."
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none focus:border-blue-500 focus:bg-blue-50/20"
                    />
                  </div>

                  {/* Clear / Reset Filter Button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      disabled={activeFilterCount === 0 && !customerSearchQuery}
                      className="w-full py-1 px-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 cursor-pointer flex items-center justify-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-500" />
                      <span>Clear All Filters</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SEARCH RESULTS LIST */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
                {filteredSearchCustomers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <p className="font-medium">No customers found matching the specified filters</p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {(activeFilterCount > 0 || customerSearchQuery) && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomerSearchModal(false);
                          setShowQuickCustomerModal(true);
                          setQuickCustomerName(customerSearchQuery || filterCustomerName);
                          setQuickCustomerPhone(filterPhone);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add as New Customer</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredSearchCustomers.map(cust => {
                    const custVehicles = [
                      ...(customerVehiclesMap.get(cust.id) || []),
                      ...(cust.phone ? (customerVehiclesMap.get(cust.phone) || []) : [])
                    ];

                    return (
                      <div
                        key={cust.id}
                        className="p-3 hover:bg-blue-50/60 transition group border-b border-slate-100 last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span>{cust.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({cust.id})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                              <span className="font-mono text-slate-800 font-medium">📞 {cust.phone}</span>
                              {(cust as any).telephone && <span className="font-mono text-slate-600">☎️ {(cust as any).telephone}</span>}
                              {cust.city && <span>📍 {cust.city}</span>}
                              {(cust as any).qid && <span className="font-mono text-slate-500">QID: {(cust as any).qid}</span>}
                            </div>

                            {/* Registered Vehicles Badge List */}
                            {custVehicles.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {custVehicles.map(veh => {
                                  const isRegMatch = filterRegNo && veh.plateNumber?.toLowerCase().includes(filterRegNo.toLowerCase());
                                  const isChassisMatch = filterChassisNo && veh.vin?.toLowerCase().includes(filterChassisNo.toLowerCase());
                                  const isModelMatch = filterModel && (veh.model?.toLowerCase().includes(filterModel.toLowerCase()) || veh.make?.toLowerCase().includes(filterModel.toLowerCase()));
                                  const isHighlighted = isRegMatch || isChassisMatch || isModelMatch;

                                  return (
                                    <button
                                      key={veh.id || veh.plateNumber}
                                      type="button"
                                      onClick={() => handleSelectCustomerFromSearch(cust, veh)}
                                      title="Click to select customer and load this vehicle onto Job Card"
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition cursor-pointer border ${
                                        isHighlighted
                                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold ring-1 ring-amber-400'
                                          : 'bg-white hover:bg-blue-100 border-slate-300 text-slate-800'
                                      }`}
                                    >
                                      <Car className="w-3 h-3 text-blue-600" />
                                      <span className="font-mono font-bold">{veh.plateNumber || 'No Plate'}</span>
                                      {(veh.make || veh.model) && (
                                        <span className="text-slate-600">{veh.make} {veh.model}</span>
                                      )}
                                      {veh.vin && (
                                        <span className="text-slate-400 font-mono text-[10px]">VIN: {veh.vin.slice(-6)}</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectCustomerFromSearch(cust)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs transition cursor-pointer shrink-0 mt-0.5"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs text-slate-500">
                <span>
                  Showing {filteredSearchCustomers.length} customer(s)
                  {activeFilterCount > 0 && ` (filtered)`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerSearchModal(false);
                    setShowQuickCustomerModal(true);
                  }}
                  className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create New Customer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showQuickCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-200" />
                <h3 className="font-bold text-sm">Add New Customer to Master</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowQuickCustomerModal(false); setQuickCustomerError(''); }}
                className="text-blue-200 hover:text-white p-1 rounded-sm hover:bg-blue-600/50 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCustomer} className="p-4 space-y-3">
              {quickCustomerError && (
                <div className="p-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{quickCustomerError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickCustomerName}
                  onChange={e => setQuickCustomerName(e.target.value)}
                  placeholder="e.g. Mohammed Al-Kuwari"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Primary Phone / Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickCustomerPhone}
                    onChange={e => setQuickCustomerPhone(e.target.value)}
                    placeholder="e.g. +974 5512 3456"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alternate / Second Number
                  </label>
                  <input
                    type="text"
                    value={quickCustomerPhone2}
                    onChange={e => setQuickCustomerPhone2(e.target.value)}
                    placeholder="e.g. +974 4412 3456"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={quickCustomerEmail}
                    onChange={e => setQuickCustomerEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    QID / CR No.
                  </label>
                  <input
                    type="text"
                    value={quickCustomerQID}
                    onChange={e => setQuickCustomerQID(e.target.value)}
                    placeholder="e.g. 29063400123"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address / City (Qatar)
                </label>
                <input
                  type="text"
                  value={quickCustomerAddress}
                  onChange={e => setQuickCustomerAddress(e.target.value)}
                  placeholder="e.g. Street 34, Industrial Area / Doha"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowQuickCustomerModal(false); setQuickCustomerError(''); }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingCustomer ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save & Select Customer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};
