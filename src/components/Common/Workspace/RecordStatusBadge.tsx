import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Archive, 
  XCircle, 
  Send, 
  Wrench, 
  Check, 
  ShieldAlert,
  CreditCard,
  DollarSign,
  Truck,
  Car
} from 'lucide-react';

export interface RecordStatusBadgeProps {
  status: string;
  type?: 'job_card' | 'customer' | 'vehicle' | 'supplier' | 'invoice' | 'estimate' | 'po' | 'general';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RecordStatusBadge: React.FC<RecordStatusBadgeProps> = ({
  status,
  type = 'general',
  size = 'md',
  className = ''
}) => {
  const normStatus = (status || 'Draft').trim();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
  let IconComponent = FileText;

  // Specific mappings
  switch (normStatus.toLowerCase()) {
    // Draft / Pending
    case 'draft':
    case 'new':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20';
      IconComponent = Clock;
      break;

    // In Progress / Active
    case 'in progress':
    case 'active':
    case 'diagnosing':
    case 'approved':
    case 'ordered':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/20';
      IconComponent = Wrench;
      break;

    // Waiting / Action Required
    case 'waiting for approval':
    case 'waiting for parts':
    case 'awaiting parts':
    case 'awaiting customer approval':
    case 'partial':
    case 'partially received':
      colorClasses = 'bg-orange-50 text-orange-800 border-orange-300 ring-1 ring-orange-400/20';
      IconComponent = AlertCircle;
      break;

    // Completed / Ready
    case 'completed':
    case 'ready':
    case 'ready for pickup':
    case 'received':
    case 'paid':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/20';
      IconComponent = CheckCircle2;
      break;

    // Invoiced / Billing
    case 'invoiced':
      colorClasses = 'bg-indigo-50 text-indigo-800 border-indigo-300 ring-1 ring-indigo-400/20';
      IconComponent = CreditCard;
      break;

    // Closed
    case 'closed':
      colorClasses = 'bg-slate-100 text-slate-800 border-slate-400 ring-1 ring-slate-400/20';
      IconComponent = Check;
      break;

    // Cancelled / Void / Error
    case 'cancelled':
    case 'rejected':
    case 'void':
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/20';
      IconComponent = XCircle;
      break;

    // Archived
    case 'archived':
    case 'inactive':
      colorClasses = 'bg-zinc-100 text-zinc-600 border-zinc-300';
      IconComponent = Archive;
      break;

    // Customer Account Types
    case 'credit':
      colorClasses = 'bg-purple-50 text-purple-800 border-purple-300';
      IconComponent = CreditCard;
      break;
    case 'cash':
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-300';
      IconComponent = DollarSign;
      break;

    default:
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
      IconComponent = FileText;
      break;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold'
  }[size];

  const SafeIcon = (typeof IconComponent === 'function' || (typeof IconComponent === 'object' && IconComponent !== null)) ? IconComponent : FileText;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border shadow-2xs ${sizeClasses} ${colorClasses} ${className}`}
    >
      <SafeIcon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5'} />
      <span>{normStatus}</span>
    </span>
  );
};

export default RecordStatusBadge;
