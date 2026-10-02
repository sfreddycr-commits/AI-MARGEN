import { StatusBadge } from '../../../core/ui';
import { STATUS_META } from '../js/use-products';
import type { ProductStatus } from '../js/products.service';

/** Estado de rentabilidad con ícono + texto (nunca solo color). */
export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = STATUS_META[status];
  return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>;
}
