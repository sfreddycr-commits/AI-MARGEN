import { useMemo, useState } from 'react';
import { supplierInput, type SupplierInput } from '@aimargen/schemas';
import { useEntityMutation, useLocalItem, useLocalList } from '../../../core/data/js/use-entity';
import { serverFieldErrors, validate, type FieldErrors } from '../../../core/js/form';
import { errorMessage } from '../../../core/js/api-client';
import { suppliersService, type Supplier } from './suppliers.service';

/** Controlador del módulo: estado de pantalla, filtros, validación y llamadas al servicio. */

export function useSupplierList() {
  const [q, setQ] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const query = useLocalList<Supplier>('suppliers', { includeArchived: true });
  const items = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es');
    return (query.data ?? []).filter(
      (s) =>
        s.archived === showArchived &&
        (!term ||
          s.name.toLocaleLowerCase('es').includes(term) ||
          (s.contactName ?? '').toLocaleLowerCase('es').includes(term)),
    );
  }, [query.data, q, showArchived]);
  const archivedCount = (query.data ?? []).filter((s) => s.archived).length;
  return { ...query, items, q, setQ, showArchived, setShowArchived, archivedCount };
}

export function useSupplier(uuid: string | undefined) {
  return useLocalItem<Supplier>('suppliers', uuid, `/suppliers/${uuid}`);
}

export interface SupplierFormValues {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
}

export function toFormValues(s?: Supplier | null): SupplierFormValues {
  return {
    name: s?.name ?? '',
    contactName: s?.contactName ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    notes: s?.notes ?? '',
  };
}

export function useSaveSupplier(existing: Supplier | null | undefined, onSaved: (s: Supplier) => void) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useEntityMutation<SupplierInput, Supplier>({
    entities: ['suppliers'],
    mutationFn: (input) =>
      existing ? suppliersService.update(existing.uuid, input) : suppliersService.create(input),
    onSuccess: onSaved,
  });

  const submit = (values: SupplierFormValues) => {
    setFormError(null);
    const v = validate(supplierInput, {
      ...values,
      email: values.email.trim() || null,
      rowVersion: existing?.rowVersion,
    });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) setErrors(fields);
        else setFormError(errorMessage(e));
      },
    });
  };

  return { submit, errors, formError, saving: mutation.isPending };
}

export function useArchiveSupplier() {
  return useEntityMutation<{ uuid: string; archived: boolean }, Supplier>({
    entities: ['suppliers'],
    mutationFn: ({ uuid, archived }) =>
      archived ? suppliersService.archive(uuid) : suppliersService.restore(uuid),
  });
}
