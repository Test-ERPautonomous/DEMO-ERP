import { Request } from 'express';
import { supabaseDb } from './supabaseDb';

export interface AuditParams {
  userId?: string;
  userName?: string;
  role?: string;
  module: string;
  action: string;
  recordId?: string;
  previousValue?: any;
  newValue?: any;
  details?: string;
  ipAddress?: string;
}

export function recordAuditLog(params: AuditParams) {
  try {
    const id = `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();
    
    supabaseDb.recordAuditLog({
      id,
      timestamp,
      userId: params.userId || 'system',
      userName: params.userName || 'System Process',
      role: params.role || 'system',
      module: params.module,
      action: params.action,
      recordId: params.recordId || null,
      previousValue: params.previousValue,
      newValue: params.newValue,
      details: params.details || null,
      ipAddress: params.ipAddress || '127.0.0.1'
    });
  } catch (err) {
    console.warn('[Audit Log Notice]', err);
  }
}

export function auditFromReq(req: Request, module: string, action: string, recordId?: string, previousValue?: any, newValue?: any, details?: string) {
  const user = (req as any).user;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  recordAuditLog({
    userId: user?.id,
    userName: user?.full_name || user?.username,
    role: user?.role,
    module,
    action,
    recordId,
    previousValue,
    newValue,
    details,
    ipAddress: Array.isArray(ip) ? ip[0] : (ip as string)
  });
}
