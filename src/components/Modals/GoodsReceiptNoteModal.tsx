import React, { useState, useEffect } from 'react';
import { PurchaseOrder, InventoryItem, GarageSettings } from '../../types';
import { Truck, X, Check, Printer, Plus } from 'lucide-react';
import { api } from '../../lib/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrders: PurchaseOrder[];
  inventory: InventoryItem[];
  settings: GarageSettings;
  onReceiveGoods: (poId: string, itemsReceived: Array<{ itemId: string; qty: number; unitCost: number }>) => void;
}

export const GoodsReceiptNoteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  purchaseOrders,
  inventory,
  settings,
  onReceiveGoods,
}) => {
  const pendingPOs = purchaseOrders.filter(po => po.status !== 'Received' && po.status !== 'Cancelled');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [grnNumber, setGrnNumber] = useState('Loading...');
  const [vendorDeliveryNote, setVendorDeliveryNote] = useState('DN-84920');
  const [receiverName, setReceiverName] = useState('MAMMAR (Supervisor / Storekeeper)');
  const [editedUnitCosts, setEditedUnitCosts] = useState<Record<string, number>>({});
  const [successGRN, setSuccessGRN] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!selectedPoId || !purchaseOrders.some(p => p.id === selectedPoId)) {
      const fallbackId = pendingPOs[0]?.id || purchaseOrders[0]?.id || '';
      if (fallbackId) setSelectedPoId(fallbackId);
    }

    api.getNextDocumentNumber('GRN')
      .then(res => {
        if (res?.code) setGrnNumber(res.code);
      })
      .catch(() => {
        setGrnNumber(`GRN-0001`);
      });
  }, [isOpen, purchaseOrders, selectedPoId]);

  if (!isOpen) return null;

  const currentPO = purchaseOrders.find(po => po.id === selectedPoId);

  const handleConfirmReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPO) return;

    onReceiveGoods(
      currentPO.id,
      currentPO.items.map((item, idx) => {
        const key = item.itemId || item.partNumber || `item-${idx}`;
        const cost = editedUnitCosts[key] !== undefined ? editedUnitCosts[key] : item.unitCost;
        return {
          itemId: item.itemId,
          qty: item.quantity,
          unitCost: cost,
        };
      })
    );

    setSuccessGRN({
      grnNumber,
      poNumber: currentPO.poNumber,
      vendor: currentPO.supplierName,
      deliveryNote: vendorDeliveryNote,
      itemsCount: currentPO.items.length,
      totalAmount: currentPO.totalAmount,
      date: new Date().toLocaleString(),
      receiver: receiverName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded border border-slate-300 shadow-2xl w-full max-w-2xl text-slate-800 text-xs font-sans overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e4e79] text-white px-4 py-2 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-300" />
            <span className="text-xs">Goods Receipt Note (GRN) — Inward Store Entry</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {successGRN ? (
          <div className="p-5 space-y-4">
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Goods Inward Registered Successfully!</p>
                <p className="text-[11px]">Warehouse inventory balances updated and Purchase Order marked as Received.</p>
              </div>
            </div>

            <div className="border border-slate-300 rounded p-4 bg-slate-50 font-mono text-[11px] space-y-2">
              <div className="text-center border-b border-slate-300 pb-2">
                <p className="font-bold text-slate-900">{settings.garageName}</p>
                <p className="text-[10px] text-slate-500">GOODS RECEIPT NOTE • {successGRN.grnNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500 font-sans">Purchase Order:</span> <strong>{successGRN.poNumber}</strong></div>
                <div><span className="text-slate-500 font-sans">Vendor / Supplier:</span> <strong>{successGRN.vendor}</strong></div>
                <div><span className="text-slate-500 font-sans">Supplier Delivery Note:</span> <strong>{successGRN.deliveryNote}</strong></div>
                <div><span className="text-slate-500 font-sans">Total Value:</span> <strong>{successGRN.totalAmount} QAR</strong></div>
                <div className="col-span-2"><span className="text-slate-500 font-sans">Received &amp; Inspected By:</span> <strong>{successGRN.receiver}</strong></div>
                <div className="col-span-2 text-[10px] text-slate-400">Timestamp: {successGRN.date}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print GRN
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmReceipt} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Select Purchase Order</label>
                <select
                  value={selectedPoId ?? ''}
                  onChange={e => setSelectedPoId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                  required
                >
                  {purchaseOrders.map(po => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.supplierName} ({po.totalAmount} QAR) [{po.status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Supplier Delivery Note #</label>
                <input
                  type="text"
                  value={vendorDeliveryNote ?? ''}
                  onChange={e => setVendorDeliveryNote(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white font-mono"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] text-slate-500 font-semibold mb-1">Storekeeper / Receiver</label>
                <input
                  type="text"
                  value={receiverName ?? ''}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                  required
                />
              </div>
            </div>

            {/* Items list from PO */}
            {currentPO && (
              <div>
                <h4 className="font-bold text-slate-800 mb-1">Goods to Receive &amp; Add to Inventory</h4>
                <div className="border border-slate-300 rounded overflow-hidden">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-[#e9edf2] text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="py-2 px-3 border-r border-slate-300">Item Description</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Ordered Qty</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-right w-24">Unit Cost (QAR)</th>
                        <th className="py-2 px-3 text-right w-28">Total (QAR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                      {currentPO.items.map((item, idx) => {
                        const key = item.itemId || item.partNumber || `item-${idx}`;
                        const currentCost = editedUnitCosts[key] !== undefined ? editedUnitCosts[key] : item.unitCost;
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 border-r border-slate-200 font-sans text-slate-800 font-medium">
                              {item.partName} <span className="text-slate-400 text-[10px]">({item.partNumber})</span>
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-bold text-emerald-700">
                              {item.quantity}
                            </td>
                            <td className="py-1.5 px-2 border-r border-slate-200 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={currentCost}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditedUnitCosts(prev => ({ ...prev, [key]: val }));
                                }}
                                className="w-20 px-1 py-0.5 border border-slate-300 rounded text-right font-mono font-bold bg-white text-slate-900 focus:border-blue-500 outline-none"
                                title="Editable Unit Cost"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {(item.quantity * currentCost).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs cursor-pointer shadow-xs"
              >
                Confirm Goods Inward &amp; Update Stock
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
