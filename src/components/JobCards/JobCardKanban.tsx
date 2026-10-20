import React from 'react';
import { JobCard, JobStatus } from '../../types';
import { 
  Wrench, 
  User, 
  Car, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Eye, 
  PhoneCall,
  Sparkles,
  Camera
} from 'lucide-react';

interface Props {
  jobCards: JobCard[];
  onSelectJob: (card: JobCard) => void;
  onAdvanceStatus: (id: string, nextStatus: JobStatus) => void;
  onOpenWhatsAppModal: (card: JobCard) => void;
  onOpenDVIModal: (card: JobCard) => void;
}

const KANBAN_STAGES: { status: JobStatus; title: string; color: string; bg: string; border: string }[] = [
  { status: 'Received', title: 'Received / Intake', color: 'text-blue-700', bg: 'bg-blue-50/80 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800/40' },
  { status: 'Diagnosing', title: 'Diagnosing', color: 'text-purple-700', bg: 'bg-purple-50/80 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800/40' },
  { status: 'Awaiting Customer Approval', title: 'Awaiting Approval', color: 'text-amber-700', bg: 'bg-amber-50/80 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800/40' },
  { status: 'Awaiting Parts', title: 'Awaiting Parts', color: 'text-orange-700', bg: 'bg-orange-50/80 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800/40' },
  { status: 'In Progress', title: 'In Progress', color: 'text-emerald-700', bg: 'bg-emerald-50/80 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800/40' },
  { status: 'Quality Check', title: 'Quality Check', color: 'text-cyan-700', bg: 'bg-cyan-50/80 dark:bg-cyan-950/20', border: 'border-cyan-200 dark:border-cyan-800/40' },
  { status: 'Ready for Pickup', title: 'Ready for Pickup', color: 'text-teal-700', bg: 'bg-teal-50/80 dark:bg-teal-950/20', border: 'border-teal-200 dark:border-teal-800/40' },
  { status: 'Delivered', title: 'Delivered / Closed', color: 'text-slate-700', bg: 'bg-slate-100 dark:bg-slate-800/40', border: 'border-slate-200 dark:border-slate-700' },
];

export const JobCardKanban: React.FC<Props> = ({
  jobCards,
  onSelectJob,
  onAdvanceStatus,
  onOpenWhatsAppModal,
  onOpenDVIModal,
}) => {
  const getNextStage = (current: JobStatus): JobStatus | null => {
    switch (current) {
      case 'Received': return 'Diagnosing';
      case 'Diagnosing': return 'Awaiting Customer Approval';
      case 'Awaiting Customer Approval': return 'Awaiting Parts';
      case 'Awaiting Parts': return 'In Progress';
      case 'In Progress': return 'Quality Check';
      case 'Quality Check': return 'Ready for Pickup';
      case 'Ready for Pickup': return 'Delivered';
      case 'Draft': return 'Received';
      case 'Approved': return 'In Progress';
      case 'Painting Booth': return 'Quality Check';
      case 'Ready': return 'Delivered';
      default: return null;
    }
  };

  const getPrevStage = (current: JobStatus): JobStatus | null => {
    switch (current) {
      case 'Diagnosing': return 'Received';
      case 'Awaiting Customer Approval': return 'Diagnosing';
      case 'Awaiting Parts': return 'Awaiting Customer Approval';
      case 'In Progress': return 'Awaiting Parts';
      case 'Quality Check': return 'In Progress';
      case 'Ready for Pickup': return 'Quality Check';
      case 'Delivered': return 'Ready for Pickup';
      default: return null;
    }
  };

  return (
    <div className="overflow-x-auto pb-6">
      <div className="flex gap-4 min-w-[1600px] align-top">
        {KANBAN_STAGES.map(stage => {
          const cardsInStage = jobCards.filter(c => {
            if (stage.status === 'Received') {
              return c.status === 'Received' || c.status === 'Draft';
            }
            if (stage.status === 'In Progress') {
              return c.status === 'In Progress' || c.status === 'Approved' || c.status === 'Painting Booth';
            }
            if (stage.status === 'Ready for Pickup') {
              return c.status === 'Ready for Pickup' || c.status === 'Ready';
            }
            if (stage.status === 'Delivered') {
              return c.status === 'Delivered' || c.status === 'Closed';
            }
            return c.status === stage.status;
          });

          return (
            <div 
              key={stage.status}
              className={`flex-1 min-w-[280px] max-w-[320px] rounded-xl border ${stage.border} ${stage.bg} p-3 flex flex-col gap-3 shadow-xs`}
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color.replace('text-', 'bg-')}`} />
                  <h3 className={`text-xs font-bold ${stage.color}`}>
                    {stage.title}
                  </h3>
                </div>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                  {cardsInStage.length}
                </span>
              </div>

              {/* Stage Column Body */}
              <div className="flex flex-col gap-3 min-h-[400px]">
                {cardsInStage.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center text-slate-400 text-xs">
                    No active jobs in this stage
                  </div>
                ) : (
                  cardsInStage.map(card => {
                    const nextStage = getNextStage(card.status);
                    const prevStage = getPrevStage(card.status);
                    const dviItems = card.dviChecklist || [];
                    const criticalDvi = dviItems.filter(i => i.status === 'Critical').length;
                    const passDvi = dviItems.filter(i => i.status === 'Pass').length;

                    return (
                      <div
                        key={card.id}
                        onClick={() => onSelectJob(card)}
                        className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-lg p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-[#1875bb]"
                      >
                        {/* Header: Job Number & Priority */}
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-mono font-bold text-[#1875bb] group-hover:underline">
                            {card.jobNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            card.priority === 'Urgent'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {card.priority}
                          </span>
                        </div>

                        {/* Customer & Vehicle */}
                        <div className="space-y-1 mb-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{card.vehicle.make} {card.vehicle.model} ({card.vehicle.plateNumber})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{card.customer.name}</span>
                          </div>
                        </div>

                        {/* Complaint Snippet */}
                        {card.customerComplaints && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-md mb-2 border border-slate-100 dark:border-slate-800">
                            "{card.customerComplaints}"
                          </p>
                        )}

                        {/* Badges: DVI & Technician */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2 mb-2">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                            <Wrench className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[100px]">{card.assignedTechnician || 'Unassigned'}</span>
                          </div>
                          
                          {/* DVI Badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDVIModal(card);
                            }}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              criticalDvi > 0
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                                : dviItems.length > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            <FileText className="w-3 h-3" />
                            <span>DVI ({passDvi}/{dviItems.length})</span>
                          </button>
                        </div>

                        {/* Total Cost & Quick Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            QAR {card.totalAmount.toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {/* WhatsApp Approval Trigger */}
                            <button
                              type="button"
                              onClick={() => onOpenWhatsAppModal(card)}
                              title="Send Estimate / WhatsApp"
                              className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Prev Stage */}
                            {prevStage && (
                              <button
                                type="button"
                                onClick={() => onAdvanceStatus(card.id, prevStage)}
                                title={`Move back to ${prevStage}`}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Next Stage */}
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => onAdvanceStatus(card.id, nextStage)}
                                title={`Advance to ${nextStage}`}
                                className="p-1.5 rounded bg-[#1875bb] hover:bg-[#135d96] text-white font-semibold flex items-center gap-1 text-[10px] transition-colors shadow-xs"
                              >
                                <span>Next</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
