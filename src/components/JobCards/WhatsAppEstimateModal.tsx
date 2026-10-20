import React, { useState } from 'react';
import { JobCard, GarageSettings } from '../../types';
import { 
  MessageSquare, 
  X, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ExternalLink, 
  Send,
  Phone,
  FileText,
  DollarSign
} from 'lucide-react';
import { useToast } from '../Common/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobCard: JobCard | null;
  settings: GarageSettings;
  onApprove: (id: string, method: 'WhatsApp' | 'In-Person' | 'OTP') => void;
  onReject: (id: string) => void;
}

export const WhatsAppEstimateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  jobCard,
  settings,
  onApprove,
  onReject,
}) => {
  const { addToast } = useToast();
  if (!isOpen || !jobCard) return null;

  const phoneRaw = jobCard.customer?.phone || '';
  const phoneFormatted = phoneRaw.replace(/[^0-9]/g, '');
  const targetPhone = phoneFormatted.startsWith('974') ? phoneFormatted : `974${phoneFormatted}`;

  const mechLabor = jobCard.mechanicalLaborCost ?? 0;
  const dentingLabor = jobCard.dentingLaborCost ?? 0;
  const paintCost = jobCard.paintingCost ?? 0;
  const paintBooth = jobCard.paintBoothCharge ?? 0;
  const partsCost = jobCard.partsCost ?? 0;
  const consumablesCost = jobCard.consumablesCost ?? 0;
  const totalAmount = jobCard.totalAmount ?? (mechLabor + dentingLabor + paintCost + paintBooth + partsCost + consumablesCost);

  const customerName = jobCard.customer?.name || 'Customer';
  const vehicleMake = jobCard.vehicle?.make || '';
  const vehicleModel = jobCard.vehicle?.model || '';
  const plateNumber = jobCard.vehicle?.plateNumber || 'N/A';
  const garageName = settings?.garageName || 'Garage';
  const garageNameAr = settings?.garageNameAr || garageName;

  // Formatted estimate message in Arabic & English
  const messageArabic = `مرحباً ${customerName}،
تقدير التكلفة الخاص بسيارتك (${vehicleMake} ${vehicleModel} - لوحة ${plateNumber}):
رقم كرت العمل: ${jobCard.jobNumber || jobCard.id}

تفاصيل الأعمال الموصى بها:
• أجور اليد الميكانيكية والكهرباء: QAR ${mechLabor.toLocaleString()}
• أعمال السمكرة والصبغ: QAR ${(dentingLabor + paintCost + paintBooth).toLocaleString()}
• قطع الغيار المستخدمة: QAR ${partsCost.toLocaleString()}
• الإجمالي المقدر: QAR ${totalAmount.toLocaleString()}

الرجاء الرد بـ "موافق" أو الضغط على الرابط التالي لتأكيد الإصلاح:
https://garage-app.qatar/estimate/${jobCard.id}

شكرًا لاختياركم ${garageNameAr}!`;

  const messageEnglish = `Hello ${customerName},
Here is the official cost estimate for your vehicle (${vehicleMake} ${vehicleModel} - Plate: ${plateNumber}):
Job Card #: ${jobCard.jobNumber || jobCard.id}

Cost Breakdown:
• Mechanical & Electrical Labor: QAR ${mechLabor.toLocaleString()}
• Bodywork & Painting: QAR ${(dentingLabor + paintCost + paintBooth).toLocaleString()}
• Spare Parts & Consumables: QAR ${(partsCost + consumablesCost).toLocaleString()}
• Net Estimated Total: QAR ${totalAmount.toLocaleString()}

Please reply "APPROVED" or use the link below to confirm repair authorization:
https://garage-app.qatar/estimate/${jobCard.id}

Thank you,
${garageName}`;

  const fullMessage = `${messageArabic}\n\n---\n\n${messageEnglish}`;

  const whatsappUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(fullMessage)}`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    addToast('Estimate copied to clipboard!');
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
    addToast('WhatsApp chat opened with estimate message!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Customer Estimate Approval</h3>
              <p className="text-[11px] text-emerald-100">Send WhatsApp / OTP & Record Customer Response</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs">
          {/* Customer & Vehicle Info Summary */}
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Customer</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{customerName}</span>
              <p className="text-[11px] text-slate-500">{jobCard.customer?.phone || 'No phone'}</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Vehicle & Total</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{vehicleMake} {vehicleModel}</span>
              <p className="text-xs font-black text-[#1875bb]">QAR {totalAmount.toLocaleString()}</p>
            </div>
          </div>

          {/* Current Approval Status Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            jobCard.approvalStatus === 'Approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : jobCard.approvalStatus === 'Rejected'
              ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
              : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {jobCard.approvalStatus === 'Approved' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : jobCard.approvalStatus === 'Rejected' ? (
                <XCircle className="w-5 h-5 text-red-600" />
              ) : (
                <MessageSquare className="w-5 h-5 text-amber-600" />
              )}
              <span>
                Status: {jobCard.approvalStatus || 'Pending Approval'}
                {jobCard.approvalMethod && ` (via ${jobCard.approvalMethod})`}
              </span>
            </div>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onApprove(jobCard.id, 'WhatsApp')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition-colors"
              >
                Mark Approved
              </button>
              <button
                type="button"
                onClick={() => onReject(jobCard.id)}
                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold rounded-lg text-[11px] transition-colors"
              >
                Mark Rejected
              </button>
            </div>
          </div>

          {/* Message Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                💬 Bilingual WhatsApp Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[#1875bb] hover:underline flex items-center gap-1 font-bold text-[11px]"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Text
              </button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={fullMessage ?? ''}
              className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-slate-200 leading-relaxed outline-hidden"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-md transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Send via WhatsApp Web/App</span>
          </button>
        </div>

      </div>
    </div>
  );
};
