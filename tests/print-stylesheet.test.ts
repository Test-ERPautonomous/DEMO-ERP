import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { generatePrintableHtml } from '../src/utils/printUtils';

describe('Dedicated Print-Only Stylesheet & A4 Paper Layout', () => {
  it('includes @media print block with A4 paper size and layout overrides in src/index.css', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Check A4 page definition
    assert.ok(cssContent.includes('@page'), 'Must contain @page declaration');
    assert.ok(cssContent.includes('A4 portrait'), 'Must define A4 portrait paper size');

    // Check @media print media query
    assert.ok(cssContent.includes('@media print'), 'Must contain @media print media query');

    // Check hiding sidebars, navigation, toolbars, and controls
    assert.ok(cssContent.includes('.no-print'), 'Must hide .no-print elements');
    assert.ok(cssContent.includes('nav'), 'Must target navigation elements');
    assert.ok(cssContent.includes('aside'), 'Must target sidebar/aside elements');
    assert.ok(cssContent.includes('.sidebar'), 'Must hide sidebar class');
    assert.ok(cssContent.includes('button'), 'Must hide button elements');

    // Check A4 table formatting rules
    assert.ok(cssContent.includes('table'), 'Must define table rules in print');
    assert.ok(cssContent.includes('table-header-group'), 'Must repeat table headers on page breaks');
    assert.ok(cssContent.includes('break-inside: avoid') || cssContent.includes('page-break-inside: avoid'), 'Must avoid row breaks across pages');

    // Check utility classes
    assert.ok(cssContent.includes('.print-only'), 'Must include .print-only utility');
    assert.ok(cssContent.includes('.print-totals-box'), 'Must include .print-totals-box utility');
    assert.ok(cssContent.includes('.print-footer-signatures'), 'Must include .print-footer-signatures utility');
  });

  it('generates complete standalone A4 printable HTML with proper table and print rules', () => {
    const sampleInvoiceHtml = `
      <div id="printable-invoice-view">
        <h1>Tax Invoice - INV-2026-0001</h1>
        <table className="print-table">
          <thead>
            <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
          </thead>
          <tbody>
            <tr><td>Brake Pad Replacement</td><td>1</td><td>450.00</td></tr>
          </tbody>
        </table>
      </div>
    `;

    const fullHtml = generatePrintableHtml(sampleInvoiceHtml, { title: 'Invoice INV-2026-0001' });

    assert.ok(fullHtml.includes('<!DOCTYPE html>'), 'Must produce valid HTML5 DOCTYPE');
    assert.ok(fullHtml.includes('A4 portrait'), 'Must specify A4 portrait in generated print HTML');
    assert.ok(fullHtml.includes('table-header-group'), 'Must format table headers for multi-page A4 printing');
    assert.ok(fullHtml.includes('INV-2026-0001'), 'Must include content html');
    assert.ok(fullHtml.includes('.no-print'), 'Must include .no-print utility class');
  });
});
