import { JobCard, Invoice, GarageSettings } from '../types';
import { triggerPrint } from './printUtils';
import { formatDate } from './formatters';

/**
 * Generate and trigger a high-resolution, bilingual (Arabic + English) printable document / PDF
 * for Workshop Job Cards and Invoices according to Qatar commercial standards.
 */

export function printJobCardPdf(jobCard: JobCard, settings: GarageSettings): void {
  const partsList = jobCard.partsUsed || [];
  const laborList = jobCard.laborOperations || [];

  const partsTotal = partsList.reduce((sum, p) => sum + (Number(p.quantity || 1) * Number(p.unitPrice || 0)), 0);
  const laborTotal = laborList.reduce((sum, l) => sum + (Number(l.total) || (Number(l.hours || 1) * Number(l.rate || 0))), 0);
  const grandTotal = jobCard.grandTotal || (partsTotal + laborTotal);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.4;">
      <!-- OFFICIAL HEADER -->
      <div style="border-bottom: 2px solid #1875bb; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 20px; font-weight: 800; color: #1875bb; margin: 0; text-transform: uppercase;">
            ${settings.garageName || 'NAJM AL HUDA GARAGE & SCRAP TRADING'}
          </h1>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; direction: rtl;">
            كراج نجم الهدى وتجارة السكراب
          </div>
          <div style="font-size: 10px; color: #475569; margin-top: 4px;">
            Tel: ${settings.phone || '+974 5512 3456'}
          </div>
          <div style="font-size: 10px; color: #475569;">
            ${settings.address || 'Street 24, Industrial Area, Doha - State of Qatar'}
          </div>
        </div>

        <!-- DOCUMENT TITLE BADGE -->
        <div style="text-align: right; background-color: #f1f5f9; padding: 8px 14px; border-radius: 6px; border: 1px solid #cbd5e1;">
          <div style="font-size: 14px; font-weight: 800; color: #1875bb; letter-spacing: 0.5px;">JOB CARD</div>
          <div style="font-size: 12px; font-weight: 700; color: #334155; direction: rtl;">بطاقة عمل ورشة</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; font-family: monospace; margin-top: 3px;">
            #${jobCard.jobNumber}
          </div>
        </div>
      </div>

      <!-- METADATA GRID -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <!-- VEHICLE DETAILS -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #fafafa;">
          <div style="font-size: 11px; font-weight: 700; color: #1875bb; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>VEHICLE PARTICULARS</span>
            <span style="direction: rtl;">بيانات المركبة</span>
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Plate No / اللوحة:</td>
              <td style="font-weight: 700; font-family: monospace; font-size: 11px; color: #0f172a;">${jobCard.vehiclePlate}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Vehicle / السيارة:</td>
              <td style="font-weight: 600;">${jobCard.vehicleMake} ${jobCard.vehicleModel} (${jobCard.vehicleYear})</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Odometer:</td>
              <td>${jobCard.mileage ? jobCard.mileage.toLocaleString() + ' KM' : 'N/A'}</td>
            </tr>
          </table>
        </div>

        <!-- CUSTOMER & TIMELINE -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #fafafa;">
          <div style="font-size: 11px; font-weight: 700; color: #1875bb; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>CUSTOMER & TIMELINE</span>
            <span style="direction: rtl;">بيانات العميل والطلب</span>
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Customer / العميل:</td>
              <td style="font-weight: 700; color: #0f172a;">${jobCard.customerName}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Phone / الهاتف:</td>
              <td style="font-weight: 600;">${jobCard.customerPhone}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Date Created / التاريخ:</td>
              <td>${formatDate(jobCard.createdAt)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Current Status / الحالة:</td>
              <td style="font-weight: 700; color: #1875bb;">${jobCard.status.toUpperCase()}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- WORK SCOPE / COMPLAINTS -->
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 14px; background-color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>CUSTOMER COMPLAINT & WORK SCOPE</span>
          <span style="direction: rtl;">شكوى العميل ونطاق الصيانة</span>
        </div>
        <div style="font-size: 11px; color: #1e293b; background-color: #f8fafc; padding: 6px 8px; border-radius: 4px; border: 1px dashed #cbd5e1;">
          ${jobCard.complaints || 'General inspection, maintenance, and technical testing.'}
        </div>
      </div>

      <!-- PARTS TABLE -->
      <div style="margin-bottom: 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #1875bb; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>1. REQUIRED PARTS & CONSUMABLES (قطع الغيار والمستهلكات)</span>
          <span>SUBTOTAL: QAR ${partsTotal.toFixed(2)}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
          <thead style="background-color: #f1f5f9;">
            <tr>
              <th style="padding: 5px; text-align: left; border: 1px solid #cbd5e1; width: 30px;">#</th>
              <th style="padding: 5px; text-align: left; border: 1px solid #cbd5e1;">Part Description / الوصف</th>
              <th style="padding: 5px; text-align: center; border: 1px solid #cbd5e1; width: 60px;">Qty / الكمية</th>
              <th style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; width: 80px;">Rate (QAR)</th>
              <th style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; width: 90px;">Total (QAR)</th>
            </tr>
          </thead>
          <tbody>
            ${partsList && partsList.length > 0 ? partsList.map((part, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1;">
                  <strong>${part.name || 'Part'}</strong>
                  ${part.sku ? `<span style="font-family: monospace; color: #64748b; font-size: 9px; margin-left: 6px;">[${part.sku}]</span>` : ''}
                </td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${part.quantity ?? 1}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">${Number(part.unitPrice || 0).toFixed(2)}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${(Number(part.total) || (Number(part.quantity ?? 1) * Number(part.unitPrice || 0))).toFixed(2)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="padding: 8px; text-align: center; color: #94a3b8; border: 1px solid #cbd5e1;">No parts allocated to this job.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- LABOR OPERATIONS TABLE -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 700; color: #1875bb; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>2. LABOR & SERVICE OPERATIONS (أجور اليد العاملة والعمليات)</span>
          <span>SUBTOTAL: QAR ${laborTotal.toFixed(2)}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
          <thead style="background-color: #f1f5f9;">
            <tr>
              <th style="padding: 5px; text-align: left; border: 1px solid #cbd5e1; width: 30px;">#</th>
              <th style="padding: 5px; text-align: left; border: 1px solid #cbd5e1;">Operation / العملية</th>
              <th style="padding: 5px; text-align: center; border: 1px solid #cbd5e1; width: 60px;">Hours / الساعات</th>
              <th style="padding: 5px; text-align: right; border: 1px solid #cbd5e1; width: 90px;">Total (QAR)</th>
            </tr>
          </thead>
          <tbody>
            ${laborList && laborList.length > 0 ? laborList.map((lab, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: 600;">${lab.description || 'Service Task'}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${lab.hours ?? 1}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${(Number(lab.total) || (Number(lab.hours ?? 1) * Number(lab.rate ?? 0))).toFixed(2)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="4" style="padding: 8px; text-align: center; color: #94a3b8; border: 1px solid #cbd5e1;">No labor items recorded.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>

      <!-- TOTAL SUMMARY BOX -->
      <div style="display: flex; justify-content: flex-end; margin-bottom: 16px;">
        <div style="width: 250px; border: 2px solid #1875bb; border-radius: 6px; padding: 8px 12px; background-color: #f0f9ff;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span>Parts Total / قطع الغيار:</span>
            <span style="font-weight: 600;">QAR ${partsTotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px;">
            <span>Labor Total / أجور العمل:</span>
            <span style="font-weight: 600;">QAR ${laborTotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; color: #1875bb;">
            <span>ESTIMATED TOTAL:</span>
            <span>QAR ${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <!-- SIGNATURE BOXES & TERMS -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 12px;">
        <div style="font-size: 9px; color: #64748b; line-height: 1.4; margin-bottom: 14px;">
          <strong>Terms & Conditions / الشروط والأحكام:</strong> Work is executed in accordance with workshop standards. Najm Al Huda Garage is not responsible for personal items left in vehicle.
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; text-align: center; font-size: 10px;">
          <div>
            <div style="height: 40px; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px;"></div>
            <div style="font-weight: 700;">Service Advisor / مستشار الخدمة</div>
          </div>
          <div>
            <div style="height: 40px; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px;"></div>
            <div style="font-weight: 700;">Technician / الفني المختص</div>
          </div>
          <div>
            <div style="height: 40px; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px;"></div>
            <div style="font-weight: 700;">Customer Signature / توقيع العميل</div>
          </div>
        </div>
      </div>
    </div>
  `;

  triggerPrint(html, {
    title: `JobCard_${jobCard.jobNumber}_NajmAlHuda`,
    filename: `JobCard_${jobCard.jobNumber}.pdf`,
  });
}

export const generateJobCardPDF = printJobCardPdf;

export function printInvoicePdf(invoice: Invoice, settings: GarageSettings): void {
  const partsSubtotal = (invoice.partItems || []).reduce((sum, p) => sum + (p.total || 0), 0);
  const laborSubtotal = (invoice.laborItems || []).reduce((sum, l) => sum + (l.total || 0), 0);
  const totalPaid = invoice.paidAmount || 0;
  const balanceDue = invoice.balanceAmount || (invoice.grandTotal - totalPaid);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.4;">
      <!-- OFFICIAL HEADER -->
      <div style="border-bottom: 2px solid #1875bb; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h1 style="font-size: 20px; font-weight: 800; color: #1875bb; margin: 0; text-transform: uppercase;">
            ${settings.garageName || 'NAJM AL HUDA GARAGE & SCRAP TRADING'}
          </h1>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; direction: rtl;">
            كراج نجم الهدى وتجارة السكراب
          </div>
          <div style="font-size: 10px; color: #475569; margin-top: 4px;">
            Tel: ${settings.phone || '+974 5512 3456'}
          </div>
          <div style="font-size: 10px; color: #475569;">
            ${settings.address || 'Street 24, Industrial Area, Doha - State of Qatar'}
          </div>
        </div>

        <!-- DOCUMENT TITLE BADGE -->
        <div style="text-align: right; background-color: #f1f5f9; padding: 8px 14px; border-radius: 6px; border: 1px solid #cbd5e1;">
          <div style="font-size: 14px; font-weight: 800; color: #1875bb; letter-spacing: 0.5px;">INVOICE</div>
          <div style="font-size: 12px; font-weight: 700; color: #334155; direction: rtl;">فاتورة ورشة</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; font-family: monospace; margin-top: 3px;">
            #${invoice.invoiceNumber}
          </div>
        </div>
      </div>

      <!-- METADATA GRID -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <!-- BILL TO -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #fafafa;">
          <div style="font-size: 11px; font-weight: 700; color: #1875bb; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>BILL TO / العميل</span>
            <span style="direction: rtl;">بيانات العميل</span>
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Customer Name:</td>
              <td style="font-weight: 700; color: #0f172a;">${invoice.customerName}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Phone / الهاتف:</td>
              <td style="font-weight: 600;">${invoice.customerPhone || ''}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Vehicle / المركبة:</td>
              <td style="font-weight: 600;">${invoice.vehiclePlate || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <!-- INVOICE INFO -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #fafafa;">
          <div style="font-size: 11px; font-weight: 700; color: #1875bb; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>INVOICE DETAILS</span>
            <span style="direction: rtl;">تفاصيل الفاتورة</span>
          </div>
          <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Invoice Date / التاريخ:</td>
              <td style="font-weight: 600;">${formatDate(invoice.date)}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Job Card Ref / بطاقة العمل:</td>
              <td style="font-family: monospace; font-weight: 700; color: #1875bb;">${invoice.jobNumber || 'Direct Sale'}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Status / الحالة:</td>
              <td>
                <span style="font-weight: 800; color: ${invoice.status === 'Paid' ? '#16a34a' : invoice.status === 'Partial' ? '#d97706' : '#dc2626'};">
                  ${invoice.status.toUpperCase()}
                </span>
              </td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 2px 0;">Currency / العملة:</td>
              <td style="font-weight: 600;">Qatari Riyal (QAR / ر.ق)</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- ITEM LIST TABLE -->
      <div style="margin-bottom: 16px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1;">
          <thead style="background-color: #1875bb; color: #ffffff;">
            <tr>
              <th style="padding: 6px; text-align: left; width: 30px;">#</th>
              <th style="padding: 6px; text-align: left;">Item Description / بيان الخدمة أو الصنف</th>
              <th style="padding: 6px; text-align: center; width: 70px;">Type / النوع</th>
              <th style="padding: 6px; text-align: center; width: 50px;">Qty</th>
              <th style="padding: 6px; text-align: right; width: 80px;">Rate (QAR)</th>
              <th style="padding: 6px; text-align: right; width: 90px;">Total (QAR)</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ...invoice.partItems.map(p => ({ desc: p.name || p.description, type: 'Part', qty: p.quantity || 1, rate: p.unitPrice || 0, total: p.total || 0 })),
              ...invoice.laborItems.map(l => ({ desc: l.description, type: 'Labor', qty: l.hours || 1, rate: l.rate || 0, total: l.total || 0 }))
            ].map((item, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${idx + 1}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; font-weight: 600;">${item.desc}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center; font-size: 9px; color: #475569;">${item.type}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: center;">${item.qty}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right;">${item.rate.toFixed(2)}</td>
                <td style="padding: 5px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- SUMMARY & PAYMENTS -->
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; margin-bottom: 16px;">
        <!-- PAYMENT LOG -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; background-color: #fafafa;">
          <div style="font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            PAYMENT LEDGER / سجل الدفعات
          </div>
          ${invoice.payments && invoice.payments.length > 0 ? `
            <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
              <thead>
                <tr style="color: #64748b; border-bottom: 1px solid #cbd5e1;">
                  <th style="text-align: left; padding: 3px;">Date</th>
                  <th style="text-align: left; padding: 3px;">Method</th>
                  <th style="text-align: left; padding: 3px;">Ref</th>
                  <th style="text-align: right; padding: 3px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.payments.map(pay => `
                  <tr>
                    <td style="padding: 3px;">${pay.date ? formatDate(pay.date) : 'N/A'}</td>
                    <td style="padding: 3px; font-weight: 600;">${pay.method || pay.paymentMethod}</td>
                    <td style="padding: 3px; font-family: monospace;">${pay.reference || '-'}</td>
                    <td style="padding: 3px; text-align: right; font-weight: 700; color: #16a34a;">QAR ${(pay.amount || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `
            <div style="font-size: 10px; color: #94a3b8; font-style: italic; padding: 6px 0;">No payments recorded yet.</div>
          `}
        </div>

        <!-- TOTALS BREAKDOWN -->
        <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background-color: #ffffff;">
          <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0; color: #475569;">Parts Subtotal / قطع الغيار:</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 600;">QAR ${partsSubtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #475569;">Labor Subtotal / أجور العمل:</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 600;">QAR ${laborSubtotal.toFixed(2)}</td>
            </tr>
            ${invoice.discountAmount ? `
              <tr>
                <td style="padding: 3px 0; color: #dc2626;">Discount / خصم:</td>
                <td style="padding: 3px 0; text-align: right; font-weight: 600; color: #dc2626;">- QAR ${invoice.discountAmount.toFixed(2)}</td>
              </tr>
            ` : ''}
            <tr style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 0; font-weight: 800; font-size: 12px;">NET AMOUNT / الإجمالي:</td>
              <td style="padding: 5px 0; text-align: right; font-weight: 800; font-size: 13px; color: #1875bb;">QAR ${invoice.grandTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0; color: #16a34a; font-weight: 600;">Total Paid / المدفوع:</td>
              <td style="padding: 3px 0; text-align: right; font-weight: 700; color: #16a34a;">QAR ${totalPaid.toFixed(2)}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 4px 6px; font-weight: 800; color: #b91c1c;">BALANCE DUE / المتبقي:</td>
              <td style="padding: 4px 6px; text-align: right; font-weight: 800; color: #b91c1c;">QAR ${balanceDue.toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </div>

      <!-- SIGNATURE AND LEGAL -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 14px; margin-top: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px;">
          <div>
            <div style="font-weight: 700; color: #1875bb;">Thank you for trusting Najm Al Huda Garage!</div>
            <div style="color: #64748b; font-size: 9px; margin-top: 2px;">
              For warranty inquiries or parts support, please retain this invoice.
            </div>
          </div>

          <div style="text-align: center; width: 160px;">
            <div style="height: 40px; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px;"></div>
            <div style="font-weight: 700;">Authorized Signatory / الختم والاعتماد</div>
          </div>
        </div>
      </div>
    </div>
  `;

  triggerPrint(html, {
    title: `Invoice_${invoice.invoiceNumber}_NajmAlHuda`,
    filename: `Invoice_${invoice.invoiceNumber}.pdf`,
  });
}

export const generateInvoicePDF = printInvoicePdf;
