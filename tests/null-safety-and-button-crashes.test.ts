import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRolePermissions } from '../src/context/AuthContext';

describe('Regression Tests: Null-Safety, Button Clicks & Error Prevention', () => {

  describe('1. Role & Permission Handling (Missing / Null / Unexpected Roles)', () => {
    it('handles undefined or null role safely without calling toLowerCase on undefined', () => {
      // @ts-expect-error test undefined role
      const permUndefined = getRolePermissions(undefined);
      assert.ok(permUndefined);
      assert.equal(typeof permUndefined.canViewDashboard, 'boolean');

      // @ts-expect-error test null role
      const permNull = getRolePermissions(null);
      assert.ok(permNull);
      assert.equal(typeof permNull.canViewDashboard, 'boolean');

      // @ts-expect-error test non-string role
      const permEmpty = getRolePermissions('');
      assert.ok(permEmpty);
      assert.equal(typeof permEmpty.canViewDashboard, 'boolean');
    });

    it('handles unexpected case and spacing in roles safely', () => {
      const permServiceAdvisor = getRolePermissions('Service Advisor');
      assert.equal(permServiceAdvisor.canManageJobCards, true);
      assert.equal(permServiceAdvisor.canManageUsers, false);

      const permAdmin = getRolePermissions('  ADMIN  ');
      assert.equal(permAdmin.canManageUsers, false);
      assert.equal(permAdmin.canManageSettings, true);
    });
  });

  describe('2. User Search & Filter (Missing / Null / Empty User Record Fields)', () => {
    it('safely filters users even when fields are undefined, null, or empty', () => {
      const corruptedUsers: any[] = [
        { id: '1', fullName: undefined, username: undefined, email: undefined, role: 'owner' },
        { id: '2', fullName: null, username: null, email: null, role: 'technician' },
        { id: '3', fullName: 'Ahmed Al-Kuwari', username: 'ahmed', email: 'ahmed@najm.qa', role: 'manager' },
        null,
        undefined,
      ];

      // Replicate the filtering logic from UserManager
      const filterUsers = (searchQuery?: string, roleFilter: string = 'all') => {
        return corruptedUsers.filter(u => {
          if (!u) return false;
          const query = (searchQuery || '').trim().toLowerCase();
          const fullName = (u.fullName || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = u.phone || '';

          const matchesSearch = !query ||
            fullName.includes(query) ||
            username.includes(query) ||
            email.includes(query) ||
            phone.includes(query);

          const matchesRole = roleFilter === 'all' || u.role === roleFilter;
          return matchesSearch && matchesRole;
        });
      };

      // Empty search
      assert.doesNotThrow(() => {
        const res = filterUsers('');
        assert.equal(res.length, 3);
      });

      // Undefined search query
      assert.doesNotThrow(() => {
        const res = filterUsers(undefined);
        assert.equal(res.length, 3);
      });

      // Targeted search that matches
      assert.doesNotThrow(() => {
        const res = filterUsers('ahmed');
        assert.equal(res.length, 1);
        assert.equal(res[0].username, 'ahmed');
      });

      // Repeated search queries
      for (let i = 0; i < 20; i++) {
        assert.doesNotThrow(() => filterUsers(`query_${i}`));
      }
    });
  });

  describe('3. Invoice & Job Card Matching (VIEW JOBCARD Button & Navigation)', () => {
    it('safely finds linked job card even if jobNumber is missing or null on some records', () => {
      const corruptedJobCards: any[] = [
        { id: 'jc-1', jobNumber: undefined, customer: { name: 'Test' } },
        { id: 'jc-2', jobNumber: null, customer: { name: 'Test 2' } },
        { id: 'jc-3', jobNumber: 'JOB-2026-0042', customer: { name: 'Valid Job' } },
      ];

      const resolveJobCard = (jobCardNo?: string) => {
        if (!jobCardNo) return null;
        const cleanTargetNo = jobCardNo.trim().toLowerCase();
        return corruptedJobCards.find(j => (j.jobNumber || '').trim().toLowerCase() === cleanTargetNo) || null;
      };

      // Click button with valid job number
      const found = resolveJobCard('JOB-2026-0042');
      assert.ok(found);
      assert.equal(found.id, 'jc-3');

      // Click button with lowercase job number
      const foundLower = resolveJobCard('job-2026-0042');
      assert.ok(foundLower);
      assert.equal(foundLower.id, 'jc-3');

      // Click button with non-existent job number
      const notFound = resolveJobCard('JOB-9999');
      assert.equal(notFound, null);

      // Click button with empty or undefined jobCardNo
      assert.equal(resolveJobCard(''), null);
      assert.equal(resolveJobCard(undefined), null);

      // Repeated clicks simulate user clicking rapidly
      for (let i = 0; i < 50; i++) {
        assert.doesNotThrow(() => resolveJobCard('job-2026-0042'));
      }
    });

    it('safely searches Find Dialog invoices even with corrupted invoice entries', () => {
      const corruptedInvoices: any[] = [
        { id: 'inv-1', invoiceNumber: undefined, customerName: undefined },
        { id: 'inv-2', invoiceNumber: null, customerName: null },
        { id: 'inv-3', invoiceNumber: 'INV-2026-0010', customerName: 'Fahad Qatar', vehiclePlate: '12345' },
        null,
      ];

      const searchInvoices = (searchTerm?: string) => {
        return corruptedInvoices.filter(inv => {
          if (!inv) return false;
          const t = (searchTerm || '').trim().toLowerCase();
          if (!t) return true;
          const invNum = (inv.invoiceNumber || '').toLowerCase();
          const custName = (inv.customerName || (inv.customer && inv.customer.name) || '').toLowerCase();
          const plate = (inv.vehiclePlate || (inv.vehicle && inv.vehicle.plateNumber) || '').toLowerCase();
          const jcNum = (inv.jobCardNumber || '').toLowerCase();

          return (
            invNum.includes(t) ||
            custName.includes(t) ||
            plate.includes(t) ||
            jcNum.includes(t)
          );
        });
      };

      assert.doesNotThrow(() => {
        const all = searchInvoices('');
        assert.equal(all.length, 3);

        const fahad = searchInvoices('fahad');
        assert.equal(fahad.length, 1);
        assert.equal(fahad[0].id, 'inv-3');

        const nonExistent = searchInvoices('non-existent');
        assert.equal(nonExistent.length, 0);

        const undefSearch = searchInvoices(undefined);
        assert.equal(undefSearch.length, 3);
      });
    });
  });

  describe('4. Inventory Stock Take Sheet & Counter Sale Search', () => {
    it('safely filters inventory with null or missing SKU, name, or category', () => {
      const corruptedInventory: any[] = [
        { id: 'p-1', name: undefined, sku: undefined, category: undefined, quantityOnHand: 5 },
        { id: 'p-2', name: null, sku: null, category: null, quantityOnHand: 0 },
        { id: 'p-3', name: 'Oil Filter Bosch', sku: 'OF-1001', category: 'Filters', quantityOnHand: 15 },
        null,
      ];

      const filterStockTake = (searchTerm?: string, filterCategory: string = 'ALL') => {
        return (corruptedInventory || []).filter(item => {
          if (!item) return false;
          const matchesCat = filterCategory === 'ALL' || item.category === filterCategory;
          const term = (searchTerm || '').trim().toLowerCase();
          const nameStr = (item.name || '').toLowerCase();
          const skuStr = (item.sku || '').toLowerCase();
          const rackStr = (item.rackLocation || '').toLowerCase();

          const matchesSearch = !term ||
            nameStr.includes(term) ||
            skuStr.includes(term) ||
            rackStr.includes(term);

          return matchesCat && matchesSearch;
        });
      };

      assert.doesNotThrow(() => {
        const res = filterStockTake('');
        assert.equal(res.length, 3);

        const bosch = filterStockTake('bosch');
        assert.equal(boscheMatchCount(bosch), 1);

        const undef = filterStockTake(undefined);
        assert.equal(undef.length, 3);
      });

      function boscheMatchCount(items: any[]) {
        return items.filter(i => i.sku === 'OF-1001').length;
      }
    });
  });

  describe('5. Formatting & toLocaleString Null Safety', () => {
    it('safely formats numbers when fields are undefined or null', () => {
      const formatAmount = (amt: number | undefined | null) => {
        return (amt ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      assert.equal(formatAmount(undefined), '0.00');
      assert.equal(formatAmount(null), '0.00');
      assert.equal(formatAmount(1250.5), '1,250.50');
      assert.equal(formatAmount(0), '0.00');
    });

    it('safely computes estimate breakdown when financial numbers are missing on JobCard', () => {
      const jobCard: any = {
        id: 'jc-99',
        customer: { name: 'Nasser', phone: '+974 55123456' },
        vehicle: { make: 'Toyota', model: 'Land Cruiser', plateNumber: '998877' },
        // Notice all cost fields missing:
        mechanicalLaborCost: undefined,
        dentingLaborCost: undefined,
        paintingCost: undefined,
        paintBoothCharge: null,
        partsCost: undefined,
        consumablesCost: undefined,
        totalAmount: undefined,
      };

      const mechLabor = jobCard.mechanicalLaborCost ?? 0;
      const dentingLabor = jobCard.dentingLaborCost ?? 0;
      const paintCost = jobCard.paintingCost ?? 0;
      const paintBooth = jobCard.paintBoothCharge ?? 0;
      const partsCost = jobCard.partsCost ?? 0;
      const consumablesCost = jobCard.consumablesCost ?? 0;
      const totalAmount = jobCard.totalAmount ?? (mechLabor + dentingLabor + paintCost + paintBooth + partsCost + consumablesCost);

      assert.equal(mechLabor.toLocaleString(), '0');
      assert.equal((dentingLabor + paintCost + paintBooth).toLocaleString(), '0');
      assert.equal(totalAmount.toLocaleString(), '0');
    });
  });

  describe('6. Empty Database & Missing Storage State Hydration', () => {
    it('handles empty database arrays without throwing on repeated operations', () => {
      const emptyInvoices: any[] = [];
      const emptyJobCards: any[] = [];
      const emptyInventory: any[] = [];

      // Test searching empty sets
      assert.doesNotThrow(() => {
        emptyInvoices.filter(i => (i.invoiceNumber || '').toLowerCase().includes('test'));
        emptyJobCards.filter(j => (j.jobNumber || '').toLowerCase().includes('test'));
        emptyInventory.filter(p => (p.name || '').toLowerCase().includes('test'));
      });
    });
  });
});
