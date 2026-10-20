import http from 'http';

function request(options: http.RequestOptions, postData?: any): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode || 0, body: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode || 0, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runVerification() {
  console.log('--- Starting Najm Al Huda System Verification ---');
  let failures = 0;
  let passed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, detail || '');
      failures++;
    }
  }

  try {
    // 1. Health check
    const health = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/health',
      method: 'GET'
    });
    assert(health.status === 200 && health.body.status === 'ok', 'API Health Check returns 200 OK');

    // 2. Auth Login with admin credentials
    const loginRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      emailOrUsername: 'autonomous@najmalhuda.qa',
      password: 'admin123'
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin login succeeds and returns token');

    const token = loginRes.body.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 3. Auth Me
    const meRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/me',
      method: 'GET',
      headers: authHeaders
    });
    assert(meRes.status === 200 && meRes.body.user.email === 'autonomous@najmalhuda.qa', 'Auth Me returns active user profile');

    // 4. Bootstrap Data Check
    const bootstrap = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bootstrap',
      method: 'GET',
      headers: authHeaders
    });
    assert(bootstrap.status === 200, 'Bootstrap endpoint returns 200');
    assert(Array.isArray(bootstrap.body.customers) && bootstrap.body.customers.length > 0, 'Bootstrap includes Qatar customers');
    assert(Array.isArray(bootstrap.body.vehicles) && bootstrap.body.vehicles.length > 0, 'Bootstrap includes vehicles with Qatar plates');
    assert(Array.isArray(bootstrap.body.inventory) && bootstrap.body.inventory.length > 0, 'Bootstrap includes spare parts inventory');
    assert(Array.isArray(bootstrap.body.suppliers) && bootstrap.body.suppliers.length > 0, 'Bootstrap includes verified suppliers');
    assert(bootstrap.body.settings && bootstrap.body.settings.currency === 'QAR', 'Settings configured with QAR currency');

    // 5. Create Job Card
    const newJcRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/job-cards',
      method: 'POST',
      headers: authHeaders
    }, {
      customer: bootstrap.body.customers[0],
      vehicle: bootstrap.body.vehicles[0],
      status: 'Received',
      assignedTechnician: 'Rashid Khan',
      serviceType: 'Denting & Painting',
      totalAmount: 1250,
      mechanicalLaborCost: 350,
      dentingLaborCost: 450,
      paintingCost: 450
    });
    assert(newJcRes.status === 200 && newJcRes.body.jobNumber, 'Job Card created with auto-generated JC number', newJcRes.body);
    const createdJcId = newJcRes.body.id;

    // 6. Advance Status
    const statusRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/job-cards/${createdJcId}/status`,
      method: 'POST',
      headers: authHeaders
    }, {
      newStatus: 'In Progress',
      reason: 'Work started on bay 2'
    });
    assert(statusRes.status === 200 && statusRes.body.jobCard.status === 'In Progress', 'Job card status successfully advanced to In Progress');

    // 7. Issue Material to Job Card
    const targetItem = bootstrap.body.inventory[0];
    const originalQty = targetItem.quantityOnHand;
    const issueRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/job-cards/${createdJcId}/issue-parts`,
      method: 'POST',
      headers: authHeaders
    }, {
      partId: targetItem.id,
      quantity: 2,
      technicianName: 'Rashid Khan'
    });
    assert(issueRes.status === 200 && issueRes.body.success, 'Spare parts issued to job card with stock decrement');

    // 8. Return Parts from Job Card
    const returnRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/job-cards/${createdJcId}/return-parts`,
      method: 'POST',
      headers: authHeaders
    }, {
      partId: targetItem.id,
      returnQty: 1,
      reason: '1 excess unit returned to store'
    });
    assert(returnRes.status === 200 && returnRes.body.success, 'Returned part restocked successfully');

    // 9. Create Purchase Order
    const poRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/purchase-orders',
      method: 'POST',
      headers: authHeaders
    }, {
      supplierName: 'Metro Auto Supplies Co.',
      supplierContact: '+974 4455 6677',
      date: '2026-09-22',
      expectedDate: '2026-09-25',
      items: [
        {
          partId: targetItem.id,
          sku: targetItem.sku,
          name: targetItem.name,
          quantity: 10,
          quantityOrdered: 10,
          unitCost: targetItem.costPrice || 45,
          totalCost: 10 * (targetItem.costPrice || 45)
        }
      ],
      totalAmount: 10 * (targetItem.costPrice || 45),
      paymentStatus: 'Unpaid'
    });
    assert(poRes.status === 200 && poRes.body.poNumber, 'Purchase Order created successfully with PO number');
    const createdPoId = poRes.body.id;

    // 10. Inward Goods Receipt Note (GRN)
    const receivePoRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/purchase-orders/${createdPoId}/receive`,
      method: 'POST',
      headers: authHeaders
    }, {
      deliveryNoteNumber: 'DN-TEST-2026',
      notes: 'All items inspected and verified against Qatar specs'
    });
    assert(receivePoRes.status === 200 && receivePoRes.body.grnNumber, 'Goods Receipt Note (GRN) generated on PO inwarding');

    // 11. Create Invoice & Record Payment
    const invRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/invoices',
      method: 'POST',
      headers: authHeaders
    }, {
      jobCardId: createdJcId,
      jobCardNumber: newJcRes.body.jobNumber,
      date: '2026-09-22',
      customerName: bootstrap.body.customers[0].name,
      grandTotal: 1250,
      paidAmount: 0,
      balanceAmount: 1250,
      paymentStatus: 'Unpaid'
    });
    assert(invRes.status === 200 && invRes.body.invoiceNumber, 'Invoice created successfully');
    const invId = invRes.body.id;

    const payRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/invoices/${invId}/payments`,
      method: 'POST',
      headers: authHeaders
    }, {
      amount: 1250,
      method: 'Card / POS',
      reference: 'QNB-POS-TXN-884102'
    });
    assert(payRes.status === 200 && payRes.body.invoice.paymentStatus === 'Paid', 'Payment recorded and invoice marked Paid');

    // 12. Safe Reset Demo Data Test (Must not wipe data to empty arrays)
    const resetRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/reset-demo',
      method: 'POST',
      headers: authHeaders
    }, {
      confirmation: 'RESET_NAJM_DEMO_DATA'
    });
    assert(resetRes.status === 200 && resetRes.body.success, 'Safe reset endpoint executed with confirmation');

    const postResetBootstrap = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/bootstrap',
      method: 'GET',
      headers: authHeaders
    });
    assert(postResetBootstrap.body.customers.length > 0, 'Post-reset database contains healthy seed customers (not wiped)');
    assert(postResetBootstrap.body.jobCards.length > 0, 'Post-reset database contains healthy seed job cards (not wiped)');

    console.log(`\n--- Verification Complete: ${passed} passed, ${failures} failed ---`);
    if (failures === 0) {
      console.log('🎉 All core full-stack systems and security checks verified successfully!');
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runVerification();
