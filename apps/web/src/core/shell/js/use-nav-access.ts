import { useSession } from '../../session/js/session-context';
import type { NavAccess } from '../../router/navigation';

/** Permisos de navegación del usuario actual. */
export function useNavAccess(): NavAccess {
  const { can, isSuperAdmin, me } = useSession();
  return {
    can: (p) => (p === 'platform.admin' ? isSuperAdmin : can(p)),
    platformOnly: isSuperAdmin && !me?.tenant,
  };
}
