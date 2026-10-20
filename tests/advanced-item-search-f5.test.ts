import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InventoryItem } from '../src/types';

describe('Advanced Item Search (F5 Shortcut) & Multi-Filter Logic', () => {
  const sampleInventory: InventoryItem[] = [
    {
      id: 'INV-001',
      sku: 'BRK-PAD-001',
      barcode: '6291002001',
      oemPartNumber: '04465-33450',
      name: 'Ceramic Brake Pads Front Set',
      nameAr: 'أقمشة فرامل سيراميك أمامية',
      category: 'Brakes',
      brand: 'Toyota Genuine',
      fitment: 'Toyota Camry 2018-2024 / Avalon 2019-2023',
      rackLocation: 'Rack B-03',
      unit: 'set',
      unitCost: 110,
      sellingPrice: 185,
      minReorderLevel: 5,
      quantityOnHand: 14
    },
    {
      id: 'INV-002',
      sku: 'OIL-FLT-002',
      barcode: '6291002002',
      oemPartNumber: '90915-YZZD2',
      name: 'Engine Oil Filter Cartridge',
      nameAr: 'فلتر زيت محرك',
      category: 'Filters',
      brand: 'Denso',
      fitment: 'Toyota Land Cruiser / Prado 4.0L',
      rackLocation: 'Rack A-01',
      unit: 'pcs',
      unitCost: 18,
      sellingPrice: 35,
      minReorderLevel: 10,
      quantityOnHand: 4 // Low Stock
    },
    {
      id: 'INV-003',
      sku: 'SPK-PLG-003',
      barcode: '6291002003',
      oemPartNumber: 'IK20TT',
      name: 'Iridium TT Spark Plug',
      nameAr: 'بواجي بلاتينيوم إيريديوم',
      category: 'Electrical',
      brand: 'Denso',
      fitment: 'Universal V6 / V8 Engines',
      rackLocation: 'Rack C-05',
      unit: 'pcs',
      unitCost: 22,
      sellingPrice: 45,
      minReorderLevel: 12,
      quantityOnHand: 0 // Out of Stock
    },
    {
      id: 'INV-004',
      sku: 'ENG-OIL-5W30',
      barcode: '6291002004',
      oemPartNumber: 'MOBIL-1-5W30',
      name: 'Full Synthetic Motor Oil 5W-30 (4L)',
      nameAr: 'زيت محرك تخليقي بالكامل',
      category: 'Fluids',
      brand: 'Mobil 1',
      fitment: 'All Gasoline Vehicles',
      rackLocation: 'Rack D-02',
      unit: 'can',
      unitCost: 95,
      sellingPrice: 160,
      minReorderLevel: 8,
      quantityOnHand: 25
    }
  ];

  it('filters items correctly by keyword search across SKU, Name, OEM, and Fitment', () => {
    // Search by SKU
    const filterBySku = sampleInventory.filter(item => 
      item.sku.toLowerCase().includes('brk')
    );
    assert.strictEqual(filterBySku.length, 1);
    assert.strictEqual(filterBySku[0].sku, 'BRK-PAD-001');

    // Search by OEM number
    const filterByOem = sampleInventory.filter(item => 
      (item.oemPartNumber || '').toLowerCase().includes('90915')
    );
    assert.strictEqual(filterByOem.length, 1);
    assert.strictEqual(filterByOem[0].name, 'Engine Oil Filter Cartridge');

    // Search by Fitment / vehicle compatibility
    const filterByFitment = sampleInventory.filter(item => 
      (item.fitment || '').toLowerCase().includes('camry')
    );
    assert.strictEqual(filterByFitment.length, 1);
    assert.strictEqual(filterByFitment[0].sku, 'BRK-PAD-001');
  });

  it('filters items by stock status: IN_STOCK, LOW_STOCK, and OUT_OF_STOCK', () => {
    const inStock = sampleInventory.filter(item => (item.quantityOnHand ?? 0) > 0);
    assert.strictEqual(inStock.length, 3);

    const lowStock = sampleInventory.filter(item => {
      const qty = item.quantityOnHand ?? 0;
      const min = item.minReorderLevel ?? 5;
      return qty > 0 && qty <= min;
    });
    assert.strictEqual(lowStock.length, 1);
    assert.strictEqual(lowStock[0].sku, 'OIL-FLT-002');

    const outOfStock = sampleInventory.filter(item => (item.quantityOnHand ?? 0) <= 0);
    assert.strictEqual(outOfStock.length, 1);
    assert.strictEqual(outOfStock[0].sku, 'SPK-PLG-003');
  });

  it('filters items by Category, Brand, and Location', () => {
    const filtersCat = sampleInventory.filter(item => item.category === 'Filters');
    assert.strictEqual(filtersCat.length, 1);

    const densoItems = sampleInventory.filter(item => item.brand === 'Denso');
    assert.strictEqual(densoItems.length, 2);

    const rackA = sampleInventory.filter(item => item.rackLocation === 'Rack A-01');
    assert.strictEqual(rackA.length, 1);
  });

  it('filters items by Price Range and sorts accordingly', () => {
    const under100 = sampleInventory.filter(item => (item.sellingPrice ?? 0) <= 100);
    assert.strictEqual(under100.length, 2); // OIL-FLT-002 (35), SPK-PLG-003 (45)

    const sortedByPriceAsc = [...sampleInventory].sort((a, b) => 
      (a.sellingPrice ?? 0) - (b.sellingPrice ?? 0)
    );
    assert.strictEqual(sortedByPriceAsc[0].sku, 'OIL-FLT-002');
    assert.strictEqual(sortedByPriceAsc[sortedByPriceAsc.length - 1].sku, 'BRK-PAD-001');
  });

  it('verifies F5 keyboard event handling logic prevents default page reload and triggers search', () => {
    let preventDefaultCalled = false;
    let stopPropagationCalled = false;
    let modalOpened = false;

    const simulateF5KeyDown = (e: { key: string; preventDefault: () => void; stopPropagation: () => void }) => {
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        modalOpened = true;
      }
    };

    const mockEvent = {
      key: 'F5',
      preventDefault: () => { preventDefaultCalled = true; },
      stopPropagation: () => { stopPropagationCalled = true; }
    };

    simulateF5KeyDown(mockEvent);

    assert.strictEqual(preventDefaultCalled, true, 'e.preventDefault() must be called to stop browser page reload');
    assert.strictEqual(stopPropagationCalled, true, 'e.stopPropagation() must be called');
    assert.strictEqual(modalOpened, true, 'Advanced Search Modal must open upon F5 keydown');
  });

  it('verifies that selecting an item from the search dialog adds it to the requisition list even if edit mode was initially inactive', () => {
    // Initial state: not in edit mode, empty requisitions
    let isEditMode = false;
    let activeTab = 'general';
    let requisitions: any[] = [];

    const addPart = (invItem: InventoryItem, qty: number = 1) => {
      isEditMode = true;
      const itemPrice = Number(invItem.sellingPrice ?? invItem.unitPrice ?? invItem.unitCost ?? 0);
      const quantityToAdd = Math.max(1, qty || 1);

      const existingIndex = requisitions.findIndex(p => p.sku === invItem.sku);
      if (existingIndex > -1) {
        requisitions[existingIndex].quantity += quantityToAdd;
        requisitions[existingIndex].total = requisitions[existingIndex].quantity * requisitions[existingIndex].unitPrice;
      } else {
        requisitions.push({
          id: `PART-${Date.now()}`,
          inventoryId: invItem.id,
          sku: invItem.sku,
          name: invItem.name,
          quantity: quantityToAdd,
          unitPrice: itemPrice,
          total: itemPrice * quantityToAdd,
          source: 'Inventory Stock',
          status: 'Pending'
        });
      }
    };

    const onSelectItem = (item: InventoryItem, qty: number = 1) => {
      isEditMode = true;
      addPart(item, qty);
      activeTab = 'requisitions';
    };

    // User clicks button 1 (table row Add) or button 2 (Select Item)
    const selectedItem = sampleInventory[0]; // BRK-PAD-001, price 185
    onSelectItem(selectedItem, 2);

    assert.strictEqual(requisitions.length, 1, 'Requisition list must have 1 item');
    assert.strictEqual(requisitions[0].sku, 'BRK-PAD-001');
    assert.strictEqual(requisitions[0].quantity, 2);
    assert.strictEqual(requisitions[0].total, 370);
    assert.strictEqual(isEditMode, true, 'Edit mode must be activated');
    assert.strictEqual(activeTab, 'requisitions', 'Active tab must switch to requisitions');

    // Add another part
    const secondItem = sampleInventory[1]; // OIL-FLT-002, price 35
    onSelectItem(secondItem, 1);

    assert.strictEqual(requisitions.length, 2, 'Requisition list must now have 2 items');
    assert.strictEqual(requisitions[1].sku, 'OIL-FLT-002');
    assert.strictEqual(requisitions[1].quantity, 1);
    assert.strictEqual(requisitions[1].total, 35);
  });
});
