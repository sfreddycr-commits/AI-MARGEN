import type { Db } from '../db/db.js';

export interface RolePermissions {
  permissions: Map<string, Set<string>>;
  rank: Map<string, number>;
}

/** Carga la matriz rol → permisos desde la BD (se cachea en memoria al iniciar). */
export async function loadRolePermissions(db: Db): Promise<RolePermissions> {
  const rows = await db.callOne<{ role: string; rank_level: number; permission: string | null }>(
    'sp_role_permissions_list',
  );
  const permissions = new Map<string, Set<string>>();
  const rank = new Map<string, number>();
  for (const r of rows) {
    if (!permissions.has(r.role)) permissions.set(r.role, new Set());
    rank.set(r.role, Number(r.rank_level));
    if (r.permission) permissions.get(r.role)!.add(r.permission);
  }
  return { permissions, rank };
}
