import React from 'react';
import { 
  X, 
  HelpCircle, 
  Wrench, 
  Receipt, 
  Package, 
  Users, 
  Zap, 
  Keyboard, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';

interface EasyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewJob: () => void;
  onOpenCustomerMaster: () => void;
  onOpenInventory: () => void;
}

export const EasyGuideModal: React.FC<EasyGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenNewJob,
  onOpenCustomerMaster,
  onOpenInventory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-sky-300 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-sky-50 border-b border-sky-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Easy Workshop Guide</h2>
              <p className="text-xs text-slate-500">Quick tips and shortcuts to run your garage smoothly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Quick 3-Step Workflow */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">1</span>
              Standard Workshop Workflow
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-sky-700 font-bold text-xs mb-1">
                  <Wrench className="w-4 h-4" />
                  Step 1: Job Card
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click <strong>New Job Card</strong>. Enter customer &amp; plate number, select mechanical services or damage panels, and save.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-xs mb-1">
                  <Package className="w-4 h-4" />
                  Step 2: Progress &amp; Parts
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Assign technicians, issue spare parts from inventory, and advance status: In Progress → Painting Booth → Ready.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                  <Receipt className="w-4 h-4" />
                  Step 3: Invoice &amp; Pay
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click <strong>Generate Invoice</strong>. Settle with Cash, Card, or Insurance Claim, and print receipt.
                </p>
              </div>
            </div>
          </div>

          {/* Useful Keyboard Shortcuts */}
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-sky-600" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-sky-50/60 border border-sky-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium">New Job Card</span>
                <kbd className="bg-white border border-slate-300 px-2 py-0.5 rounded shadow-xs font-mono font-bold text-slate-700">
                  Shift + F1
                </kbd>
              </div>
              <div className="bg-sky-50/60 border border-sky-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Customer Master</span>
                <kbd className="bg-white border border-slate-300 px-2 py-0.5 rounded shadow-xs font-mono font-bold text-slate-700">
                  Shift + F2
                </kbd>
              </div>
              <div className="bg-sky-50/60 border border-sky-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-slate-700 font-medium">Item Master</span>
                <kbd className="bg-white border border-slate-300 px-2 py-0.5 rounded shadow-xs font-mono font-bold text-slate-700">
                  Shift + F3
                </kbd>
              </div>
            </div>
          </div>

          {/* Fast Navigation Tips */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
            <h4 className="font-bold text-amber-900 text-xs mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              Easy Pro Tips:
            </h4>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
              <li>Use the <strong>Quick Navigation Bar</strong> at the top to jump directly to Job Cards, Billing, Parts, or Reports in 1 click.</li>
              <li>Type any vehicle plate number in the <strong>Plate Search</strong> bar to immediately view its full repair history.</li>
              <li>Click the <strong>Company Code</strong> in the top title bar anytime to switch branches or open a fresh zero database.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onOpenNewJob();
            }}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Create New Job Now</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
