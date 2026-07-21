import { supabase } from './supabase';

export type AuditLogInput = {
  action: string;
  targetTable: string;
  targetId?: string | null;
  changes?: Record<string, any> | null;
};

export async function logAdminAudit(input: AuditLogInput): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const adminId = session?.user?.id;

    if (!adminId) {
      console.warn('[audit] no admin session, skipping audit log');
      return;
    }

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action: input.action,
      target_table: input.targetTable,
      target_id: input.targetId || null,
      changes: input.changes || null,
    });

    if (error) {
      console.error('[audit] failed to write audit log:', error);
    }
  } catch (err) {
    console.error('[audit] unexpected error:', err);
  }
}
