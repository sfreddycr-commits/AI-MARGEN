import { useState } from 'react';
import { useLocalList } from '../../../core/data/js/use-entity';
import { errorMessage } from '../../../core/js/api-client';
import { todayIso } from '../../../core/js/form';
import { useTenant } from '../../../core/session/js/session-context';
import { useToast } from '../../../core/ui';
import {
  REPORTS,
  reportsService,
  type ReportDef,
  type ReportFormat,
  type ReportId,
} from './reports.service';

/** Controlador de reportes: permisos, parámetros, estado de descarga por botón y errores. */

export const FORMAT_LABEL: Record<ReportFormat, string> = {
  pdf: 'PDF',
  xlsx: 'Excel',
  csv: 'CSV',
  json: 'JSON',
};

interface ProductOption {
  uuid: string;
  name: string;
  archived: boolean;
}

function firstOfMonth(): string {
  return `${todayIso().slice(0, 8)}01`;
}

export function useReports() {
  const { can, feature } = useTenant();
  const toast = useToast();
  const canExport = can('reports.export');
  const xlsxEnabled = feature('reports.xlsx');
  const products = useLocalList<ProductOption>('products', { enabled: can('products.read') });

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayIso);
  const [product, setProduct] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<'from' | 'to' | 'product', string>>>({});

  const reports: Array<ReportDef & { visibleFormats: ReportFormat[] }> = REPORTS.map((r) => ({
    ...r,
    visibleFormats: r.formats.filter((f) => f !== 'xlsx' || xlsxEnabled),
  }));

  const download = async (id: ReportId, format: ReportFormat) => {
    const def = REPORTS.find((r) => r.id === id);
    const params: { from?: string; to?: string; product?: string } = {};
    if (def?.params === 'dateRange') {
      if (from && to && from > to) {
        setErrors({ to: 'La fecha final debe ser igual o posterior a la inicial.' });
        return;
      }
      params.from = from || undefined;
      params.to = to || undefined;
    }
    if (def?.params === 'product') {
      if (!product) {
        setErrors({ product: 'Elija el producto.' });
        return;
      }
      params.product = product;
    }
    setErrors({});
    setPending(`${id}:${format}`);
    try {
      await reportsService.download(id, format, params);
      toast.show(`${def?.title ?? 'Reporte'} descargado`);
    } catch (e) {
      toast.show(errorMessage(e), { tone: 'error' });
    } finally {
      setPending(null);
    }
  };

  return {
    reports,
    canExport,
    from,
    setFrom,
    to,
    setTo,
    product,
    setProduct,
    products: products.data ?? [],
    productsPending: products.isPending && can('products.read'),
    errors,
    download,
    isPending: (id: ReportId, format: ReportFormat) => pending === `${id}:${format}`,
    busy: pending !== null,
  };
}
