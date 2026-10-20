import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Server } from 'node:http';
import { supabaseDb } from '../server/supabaseDb';
import { authenticate, registerSessionToken } from '../server/auth';
import { apiRouter } from '../server/routes';

describe('Close & Create Invoice Workflow Tests', () => {
  let server: Server;
  let baseUrl: string;
  let authCookie: string;
  let createdJobCardId: string;
  let createdJobNumber: string;
  let createdInvoiceId: string;
  let createdInvoiceNumber: string;
  let testPartId: string;
  let testSku: string;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });

    // Create session for admin user
    const adminId = 'usr-admin-test';
    const token = 'test_token_close_invoice';
    registerSessionToken(token, {
      id: adminId,
      username: 'admin',
      email: 'admin@najmalhuda.qa',
      full_name: 'Admin User',
      role: 'owner',
      is_active: true,
      permissions: { canManageJobCards: true, canManageBilling: true, canManageInventory: true },
      created_at: new Date().toISOString()
    });
    authCookie = token;

    // Create a test inventory item
    testSku = `TEST-BRAKE-${Date.now()}`;
    const partRes = await fetch(`${baseUrl}/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({
        sku: testSku,
        name: 'Brake Pads Front',
        quantityOnHand: 20,
        unitCost: 100,
        sellingPrice: 180,
        category: 'Brakes'
      })
    });
    const partData = await partRes.json();
    testPartId = partData.id || 'TEST-BRAKE-PAD';
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  it('1. Create an active Job Card with labor and parts', async () => {
    const jcPayload = {
      dateIn: new Date().toISOString().split('T')[0],
      timeIn: '10:00 AM',
      promisedDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      status: 'In Progress',
      jobType: 'Mechanical',
      customer: {
        id: 'CU-0001',
        name: 'Al Shamal Transport Co.',
        phone: '+974 5512 3456',
        email: 'info@alshamal.qa',
        address: 'Salwa Road, Doha'
      },
      vehicle: {
        plateNumber: 'QA-12345',
        make: 'Toyota',
        model: 'Land Cruiser',
        year: 2024,
        vin: 'JTEBU05J901234567',
        odometer: 45000
      },
      customerComplaints: 'Engine noise on acceleration and brake squeal',
      diagnosisNotes: 'Front brake pads worn out. Oil change required.',
      mechanicalTasks: [
        {
          id: 'task-1',
          description: 'Replace Front Brake Pads & Resurface Rotors',
          estimatedHours: 2,
          hourlyRate: 150
        },
        {
          id: 'task-2',
          description: 'Synthetic Engine Oil & Filter Change',
          estimatedHours: 1,
          hourlyRate: 100
        }
      ],
      partsUsed: [
        {
          id: 'part-1',
          inventoryId: testPartId,
          sku: testSku,
          name: 'Brake Pads Front',
          quantity: 2,
          unitPrice: 180,
          total: 360
        }
      ],
      mechanicalLaborCost: 400,
      partsCost: 360,
      discount: 20,
      taxRate: 5,
      totalAmount: 777
    };

    const res = await fetch(`${baseUrl}/job-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify(jcPayload)
    });

    const data = await res.json();
    if (res.status !== 200) {
      console.error('Test 1 failed with body:', data);
    }
    assert.equal(res.status, 200);
    assert.ok(data.id);
    assert.ok(data.jobNumber);
    assert.match(data.jobNumber, /^JC-\d{4}$/);

    createdJobCardId = data.id;
    createdJobNumber = data.jobNumber;
  });

  it('2. Issue parts to Job Card (verify initial inventory movement)', async () => {
    const invList = await supabaseDb.getInventory();
    const invBefore = invList.find(i => i.sku === testSku);
    const initialQty = invBefore?.quantityOnHand ?? 20;

    const res = await fetch(`${baseUrl}/job-cards/${createdJobCardId}/issue-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({
        partId: testPartId,
        quantity: 2,
        technicianName: 'Alex Master'
      })
    });

    const bodyData = await res.json().catch(() => ({}));
    if (res.status !== 200) {
      console.error('Test 2 failed with body:', bodyData);
    }
    assert.equal(res.status, 200);

    const invAfterList = await supabaseDb.getInventory();
    const invAfter = invAfterList.find(i => i.sku === testSku);
    assert.equal(invAfter?.quantityOnHand, initialQty - 2, 'Stock should be decremented by 2 upon parts issue');
  });

  it('3. Perform "Close & Create Invoice" atomically via backend endpoint', async () => {
    const invList = await supabaseDb.getInventory();
    const invBefore = invList.find(i => i.sku === testSku);
    const stockBeforeInvoice = invBefore?.quantityOnHand ?? 18;

    const res = await fetch(`${baseUrl}/job-cards/${createdJobCardId}/close-and-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({
        customerComplaints: 'Engine noise on acceleration and brake squeal',
        diagnosisNotes: 'Front brake pads worn out. Oil change required.',
        mechanicalTasks: [
          { description: 'Replace Front Brake Pads', hours: 2, rate: 150 },
          { description: 'Oil Change', hours: 1, rate: 100 }
        ],
        partsUsed: [
          { inventoryId: testPartId, sku: testSku, name: 'Brake Pads Front', quantity: 2, unitPrice: 180 }
        ],
        subtotal: 760,
        discount: 20,
        taxRate: 5,
        totalAmount: 777
      })
    });

    const data = await res.json();
    if (res.status !== 200) {
      console.error('Test 3 failed with body:', data);
    }
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.invoice);
    assert.ok(data.invoiceNumber);
    assert.match(data.invoiceNumber, /^IV-\d{4}$/);

    createdInvoiceId = data.invoiceId;
    createdInvoiceNumber = data.invoiceNumber;

    // Verify Job Card status becomes Closed in database
    const allCards = await supabaseDb.getJobCards();
    const jcInDb = allCards.find(j => j.id === createdJobCardId);
    assert.ok(jcInDb);
    assert.ok(jcInDb.status === 'Closed' || jcInDb.status === 'Delivered', 'Job Card status must be updated to Closed or Delivered');
    assert.equal(jcInDb.invoiceId || jcInDb.invoice_id, createdInvoiceId, 'Job Card invoice_id must link to newly created invoice');

    // Verify Invoice fields
    const invoice = data.invoice;
    assert.ok(invoice.status === 'Issued' || invoice.status === 'Unpaid', 'Initial invoice status must be Issued or Unpaid');
    assert.equal(invoice.paidAmount, 0, 'Initial paid amount must be 0');
    assert.equal(invoice.balanceAmount, invoice.grandTotal, 'Outstanding balance must equal grand total');
    assert.equal(invoice.paymentMethod || '', '', 'Payment method should be empty until payment is recorded');
    assert.equal(invoice.jobNumber, createdJobNumber, 'Invoice must link to Job Card number');

    // Verify inventory stock is NOT deducted again during invoice creation
    const invAfterList = await supabaseDb.getInventory();
    const invAfter = invAfterList.find(i => i.sku === testSku);
    assert.equal(invAfter?.quantityOnHand, stockBeforeInvoice, 'Inventory stock must NOT be deducted again on invoice creation');
  });

  it('4. Prevent duplicate invoice creation when calling "Close & Create Invoice" again', async () => {
    const res = await fetch(`${baseUrl}/job-cards/${createdJobCardId}/close-and-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({
        subtotal: 760,
        totalAmount: 777
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.alreadyExisted, true, 'Should indicate invoice already exists');
    assert.equal(data.invoiceNumber, createdInvoiceNumber, 'Must return the same existing invoice number');
    assert.equal(data.invoiceId, createdInvoiceId, 'Must return the same existing invoice ID');

    // Verify database still has only ONE invoice for this Job Card
    const allInvoices = await supabaseDb.getInvoices();
    const invMatches = allInvoices.filter(i => i.jobCardId === createdJobCardId);
    assert.equal(invMatches.length, 1, 'There must be strictly 1 invoice for this Job Card');
  });

  it('5. Verify invoice persists after backend query / reload', async () => {
    const invRes = await fetch(`${baseUrl}/invoices/${createdInvoiceId}`, {
      headers: {
        'Authorization': `Bearer ${authCookie}`
      }
    });

    const invoiceBody = await invRes.json();
    const invoiceData = invoiceBody.invoice || invoiceBody;
    assert.equal(invRes.status, 200);
    assert.equal(invoiceData.invoiceNumber, createdInvoiceNumber);
    assert.ok(invoiceData.status === 'Issued' || invoiceData.status === 'Unpaid');
  });

  it('6. Validation error handling when closing Job Card with missing customer or vehicle', async () => {
    // Create a new unpopulated draft Job Card
    const draftRes = await fetch(`${baseUrl}/job-cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({
        status: 'Draft',
        customer: { name: '' },
        vehicle: { plateNumber: '' }
      })
    });

    const draftData = await draftRes.json();
    const draftId = draftData.id;

    // Try close & invoice with missing customer
    const failRes1 = await fetch(`${baseUrl}/job-cards/${draftId}/close-and-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authCookie}`
      },
      body: JSON.stringify({
        customer: { name: '' },
        vehicle: { plateNumber: 'QA-999' }
      })
    });

    const failData1 = await failRes1.json();
    assert.equal(failRes1.status, 400);
    assert.ok(failData1.error, 'Should return error for missing customer');

    // Check that job card was NOT closed
    const allCards = await supabaseDb.getJobCards();
    const draftCheck = allCards.find(j => j.id === draftId);
    assert.equal(draftCheck?.status, 'Draft', 'Job card status must remain Draft when save/invoice fails');
  });
});
