export type UserRole = string;
export type SupplierLedgerEntry = any;
export type MechanicalTask = any;
export type PaymentRecord = any;
export type PurchaseOrderItem = any;
export type InventoryCategory = any;
export type JobCardPartItem = any;
export type JobStatusHistoryEntry = any;
export type ScrapMaterialType = any;
export type ExpenseRecord = any;
export type WarrantyRecord = any;
export type InsuranceClaimRecord = any;
export type SystemAuditLog = any;
export type FinancialAccount = any;
export type FinancialTransaction = any;
export type FinancialAllocation = any;
export type FinancialJournalEntry = any;
export type FinancialOverviewSummary = any;
export type DviChecklistItem = any;
export type JobCardPhoto = any;
export type InvoiceItem = any;
export type CarPanelKey = any;
export type DentingPaintingItem = any;
export type DamageType = any;
export type RepairAction = any;
export type FinancialPaymentMethod = any;
export type JobType = any;

export interface Customer {
  id: string;
  customerId?: string;
  customerNumber?: string;
  code?: string;
  name: string;
  nameAr?: string;
  contact?: string;
  phone: string;
  telephone?: string;
  fax?: string;
  email?: string;
  qid?: string;
  address?: string;
  city?: string;
  accountType?: string;
  creditLimit?: number;
  balance?: number;
  notes?: string;
  createdAt?: string;
}

export interface Vehicle {
  id: string;
  vehicleId?: string;
  vehicleNumber?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  plateNumber: string;
  vin?: string;
  make: string;
  model: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  color?: string;
  mileage?: number;
  engine?: string;
  engineNo?: string;
  bodyType?: string;
  category?: string;
  fuelLevel?: number;
  odometer?: number;
  notes?: string;
  createdAt?: string;
}

export interface Technician {
  id: string;
  employeeId?: string;
  name: string;
  role?: string;
  specialty?: string;
  specialization?: string;
  assignedBay?: string;
  efficiency?: number;
  hourlyRate?: number;
  phone?: string;
  status?: string;
  currentBay?: string;
  clockInTime?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode?: string;
  oemPartNumber?: string;
  oemNumber?: string;
  name: string;
  nameAr?: string;
  category: string;
  brand?: string;
  fitment?: string;
  unit?: string;
  rackLocation?: string;
  binLocation?: string;
  location?: string;
  supplierId?: string;
  supplierName?: string;
  supplier?: string;
  unitCost: number;
  costPrice?: number;
  purchasePrice?: number;
  retailPrice?: number;
  sellingPrice?: number;
  unitPrice?: number;
  minReorderLevel?: number;
  minStockLevel?: number;
  minStock?: number;
  reorderPoint?: number;
  quantityOnHand: number;
  quantityAvailable?: number;
  quantity?: number;
  stockQuantity?: number;
  lastRestockedDate?: string;
  lastRestockDate?: string;
  compatibility?: string[];
  [key: string]: any;
}

export interface StockMovement {
  id: string;
  itemId: string;
  sku: string;
  itemName: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  unitCost?: number;
  referenceType?: string;
  referenceNumber?: string;
  referenceNo?: string;
  userId?: string;
  userName?: string;
  user?: string;
  reason?: string;
  timestamp: string;
}

export interface ScrapPriceRate {
  materialType: string;
  material?: string;
  buyingRate: number;
  sellingRate: number;
  updatedAt: string;
}

export interface ScrapIntake {
  id: string;
  receiptNo: string;
  sellerName: string;
  sellerPhone?: string;
  sellerQid?: string;
  materialType?: string;
  material?: string;
  weightKg: number;
  pricePerKg?: number;
  ratePerKg?: number;
  totalAmount: number;
  paymentMethod: string;
  date: string;
  vehiclePlate?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ScrapSale {
  id: string;
  invoiceNo: string;
  buyerCompany?: string;
  buyerName?: string;
  buyerPhone?: string;
  materialType?: string;
  material?: string;
  weightKg: number;
  ratePerKg?: number;
  saleRatePerKg?: number;
  totalAmount: number;
  totalRevenue?: number;
  costPerKg?: number;
  avgCostPerKg?: number;
  costAmount: number;
  profitMargin: number;
  marginPercent: number;
  paymentStatus: string;
  date: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface EstimationItem {
  id: string;
  estimateNumber?: string;
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  plateNumber?: string;
  vehicleModel?: string;
  date?: string;
  status?: string;
  [key: string]: any;
}

export interface SupplierMasterItem {
  id: string;
  supplierId?: string;
  name: string;
  nameAr?: string;
  contact?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  trn?: string;
  taxId?: string;
  crNumber?: string;
  address?: string;
  location?: string;
  category?: string;
  terms?: string;
  paymentTerms?: string;
  balance?: number;
  currentBalance?: number;
  ledger?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CounterSale {
  id: string;
  saleNumber: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  items: any[];
  subtotal: number;
  discount?: number;
  tax?: number;
  taxAmount?: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface GarageUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  phone?: string;
  password?: string;
  isActive: boolean;
  permissions: Record<string, boolean>;
  createdAt?: string;
  lastLogin?: string;
}

export interface CompanyProfile {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  crNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
  isArchive?: boolean;
  isPrimary?: boolean;
  tagline?: string;
  cityStateZip?: string;
  country?: string;
  taxId?: string;
  currencySymbol?: string;
  settings?: Settings;
  createdAt?: string;
}

export interface JobCard {
  id: string;
  jobNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: any;
  vehicleId?: string;
  vehiclePlate?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicle?: any;
  mileage?: number;
  fuelLevel?: string | number;
  technicianId?: string;
  technicianName?: string;
  assignedTechnician?: string;
  serviceType?: string;
  jobType?: string;
  status: any;
  priority?: string;
  complaints?: string;
  diagnosis?: string;
  laborOperations?: Array<{ id: string; description: string; hours: number; rate: number; total: number }>;
  partsUsed?: Array<{ id: string; partId: string; inventoryId?: string; sku: string; name: string; quantity: number; unitPrice: number; total: number }>;
  parts?: any[];
  labor?: any[];
  requisitions?: any[];
  mechanicalTasks?: any[];
  dentingPaintingPanels?: any[];
  statusHistory?: any[];
  completedDate?: string;
  invoiceId?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  grandTotal?: number;
  paidAmount?: number;
  createdAt?: string;
  estimatedDeliveryDate?: string;
  mechanicalLaborCost?: number;
  mechanicalLaborTotal?: number;
  dentingLaborCost?: number;
  paintingCost?: number;
  paintBoothCharge?: number;
  partsCost?: number;
  consumablesCost?: number;
  taxRate?: number;
  totalAmount?: number;
  customerNotes?: string;
  internalNotes?: string;
  customerComplaints?: string;
  diagnosisNotes?: string;
  dateIn?: string;
  timeIn?: string;
  reference?: string;
  refDocNo?: string;
  supplEstNo?: string;
  expectedDelivery?: string;
  promisedDate?: string;
  insurance?: any;
  accounting?: any;
  supervisorRemarks?: string;
  deliveryNotes?: string;
  estimator?: string;
  serviceAdviser?: string;
  dviChecklist?: any[];
  photos?: any[];
  approvalStatus?: string;
  approvalMethod?: string;
  serviceAdvisor?: string;
  laborItems?: any[];
  estimatedCompletionDate?: string;
  assignedBay?: string;
  [key: string]: any;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobCardId?: string;
  jobNumber?: string;
  jobCardNumber?: string;
  customer?: any;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  vehicle?: any;
  vehiclePlate?: string;
  vehicleName?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  vinChassisNo?: string;
  odometer?: number;
  date: string;
  time?: string;
  dueDate: string;
  status?: any;
  paymentStatus?: string;
  laborItems?: any[];
  partItems?: any[];
  additionalCharges?: any[];
  mechanicalLaborTotal?: number;
  dentingLaborTotal?: number;
  paintingTotal?: number;
  partsTotal?: number;
  consumablesTotal?: number;
  subtotal: number;
  discountAmount?: number;
  discount?: number;
  discountAccount?: string;
  taxAmount?: number;
  taxPercent?: number;
  grandTotal: number;
  total?: number;
  totalAmount?: number;
  paidAmount: number;
  balanceAmount: number;
  balanceDue?: number;
  advancePaid?: number;
  roundOff?: number | boolean;
  paymentMethod?: string;
  paymentTerm?: string;
  paymentDays?: number;
  payments?: any[];
  isLocked?: boolean;
  accountName?: string;
  createdBy?: string;
  contactPerson?: string;
  mobileNo?: string;
  telephoneNo?: string;
  creditNo?: string;
  narration?: string;
  notes?: string;
  [key: string]: any;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierContact?: string;
  date: string;
  expectedDate?: string;
  receivedDate?: string;
  status: 'Draft' | 'Sent' | 'Ordered' | 'Partially Received' | 'Received' | 'Cancelled' | 'Submitted' | string;
  items: Array<{
    partId: string;
    sku: string;
    name: string;
    quantity: number;
    quantityOrdered?: number;
    quantityReceived?: number;
    unitCost: number;
    totalCost: number;
    receivedQuantity?: number;
    [key: string]: any;
  }>;
  totalAmount: number;
  paymentStatus: string;
  notes?: string;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  customer: Partial<Customer>;
  vehicle: Partial<Vehicle>;
  date: string;
  validUntil: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Converted';
  items: Array<{ type: string; description: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
}

export interface Settings {
  garageName: string;
  garageNameAr?: string;
  tagline?: string;
  address?: string;
  cityStateZip?: string;
  phone?: string;
  email?: string;
  trn?: string;
  crNumber?: string;
  taxId?: string;
  country?: string;
  currency?: string;
  currencySymbol?: string;
  vatRatePercent?: number;
  taxRatePercent?: number;
  defaultLaborRate?: number;
  paintBoothHourRate?: number;
  logoUrl?: string;
  headerLogoUrl?: string;
}

export type CustomerMasterItem = Customer;
export type VehicleMasterItem = Vehicle;
export type GarageSettings = Settings;
export type JobStatus = JobCard['status'];
export type UserPermissions = Record<string, boolean>;
