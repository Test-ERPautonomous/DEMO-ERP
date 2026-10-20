/**
 * CSV Export Utility for Najm Al Huda Garage ERP
 * Generates standards-compliant CSV with UTF-8 BOM (\uFEFF)
 * for seamless compatibility with Microsoft Excel (supporting Arabic & English text).
 */

import { Customer, Vehicle, JobCard, InventoryItem, Invoice } from '../types';

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  data: T[]
): void {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }

  // Header row
  const headerLine = columns.map(c => escapeCsvCell(c.header)).join(',');

  // Data rows
  const dataLines = data.map(item => {
    return columns
      .map(col => {
        const value = col.accessor(item);
        return escapeCsvCell(value);
      })
      .join(',');
  });

  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  // If cell contains commas, quotes, or newlines, quote and escape
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
}

export function exportCustomersToCSV(customers: Customer[]): void {
  const columns: CsvColumn<Customer>[] = [
    { header: 'Customer ID', accessor: c => c.id },
    { header: 'Customer Name', accessor: c => c.name },
    { header: 'Phone', accessor: c => c.phone },
    { header: 'Email', accessor: c => c.email || '' },
    { header: 'QID / CR Number', accessor: c => c.qid || '' },
  ];
  exportToCsv(`najm_al_huda_customers_${new Date().toISOString().split('T')[0]}`, columns, customers);
}

export function exportVehiclesToCSV(vehicles: Vehicle[]): void {
  const columns: CsvColumn<Vehicle>[] = [
    { header: 'Plate Number', accessor: v => v.plateNumber || '' },
    { header: 'VIN / Chassis', accessor: v => v.vin || '' },
    { header: 'Make', accessor: v => v.make },
    { header: 'Model', accessor: v => v.model },
    { header: 'Year', accessor: v => v.year },
    { header: 'Engine', accessor: v => v.engineNo || '' },
    { header: 'Color', accessor: v => v.color || '' },
    { header: 'Mileage (km)', accessor: v => v.mileage || 0 },
  ];
  exportToCsv(`najm_al_huda_vehicles_${new Date().toISOString().split('T')[0]}`, columns, vehicles);
}

export function exportJobCardsToCSV(jobCards: JobCard[]): void {
  const columns: CsvColumn<JobCard>[] = [
    { header: 'Job Number', accessor: j => j.jobNumber },
    { header: 'Status', accessor: j => j.status },
    { header: 'Service Type', accessor: j => j.serviceType },
    { header: 'Date In', accessor: j => j.createdAt },
    { header: 'Promised Date', accessor: j => j.estimatedDeliveryDate || '' },
    { header: 'Plate Number', accessor: j => j.vehiclePlate },
    { header: 'Make & Model', accessor: j => `${j.vehicleMake} ${j.vehicleModel}` },
    { header: 'Customer Name', accessor: j => j.customerName },
    { header: 'Customer Phone', accessor: j => j.customerPhone },
    { header: 'Technician', accessor: j => j.technicianName || 'Unassigned' },
    { header: 'Total Estimate (QAR)', accessor: j => j.grandTotal },
    { header: 'Subtotal', accessor: j => j.subtotal },
    { header: 'Tax', accessor: j => j.tax },
  ];
  exportToCsv(`najm_al_huda_job_cards_${new Date().toISOString().split('T')[0]}`, columns, jobCards);
}

export function exportInventoryToCSV(items: InventoryItem[]): void {
  const columns: CsvColumn<InventoryItem>[] = [
    { header: 'SKU', accessor: i => i.sku },
    { header: 'Item Name', accessor: i => i.name },
    { header: 'Category', accessor: i => i.category },
    { header: 'Quantity On Hand', accessor: i => i.quantityOnHand },
    { header: 'Min Reorder Level', accessor: i => i.minReorderLevel },
    { header: 'Unit Cost (QAR)', accessor: i => i.unitCost },
    { header: 'Retail Price (QAR)', accessor: i => i.retailPrice },
    { header: 'Rack Location', accessor: i => i.rackLocation || '' },
    { header: 'Supplier', accessor: i => i.supplierName || '' },
  ];
  exportToCsv(`najm_al_huda_inventory_${new Date().toISOString().split('T')[0]}`, columns, items);
}

export function exportInvoicesToCSV(invoices: Invoice[]): void {
  const columns: CsvColumn<Invoice>[] = [
    { header: 'Invoice Number', accessor: inv => inv.invoiceNumber },
    { header: 'Job Card Number', accessor: inv => inv.jobNumber || '' },
    { header: 'Date', accessor: inv => inv.date },
    { header: 'Due Date', accessor: inv => inv.dueDate },
    { header: 'Customer Name', accessor: inv => inv.customerName },
    { header: 'Customer Phone', accessor: inv => inv.customerPhone || '' },
    { header: 'Vehicle Plate', accessor: inv => inv.vehiclePlate || '' },
    { header: 'Status', accessor: inv => inv.status },
    { header: 'Subtotal (QAR)', accessor: inv => inv.subtotal },
    { header: 'Discount', accessor: inv => inv.discountAmount },
    { header: 'Tax Amount', accessor: inv => inv.taxAmount },
    { header: 'Grand Total (QAR)', accessor: inv => inv.grandTotal },
    { header: 'Paid Amount (QAR)', accessor: inv => inv.paidAmount },
    { header: 'Balance Due (QAR)', accessor: inv => inv.balanceAmount },
  ];
  exportToCsv(`najm_al_huda_invoices_${new Date().toISOString().split('T')[0]}`, columns, invoices);
}
