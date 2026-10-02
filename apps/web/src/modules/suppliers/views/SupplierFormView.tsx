import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  FormGrid,
  Notice,
  TextAreaField,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import {
  toFormValues,
  useSaveSupplier,
  useSupplier,
  type SupplierFormValues,
} from '../js/use-suppliers';
import type { Supplier } from '../js/suppliers.service';

export default function SupplierFormView() {
  const { uuid } = useParams();
  const existing = useSupplier(uuid);
  if (uuid && existing.isPending) return <PageSkeleton />;
  if (uuid && existing.error) {
    return (
      <Page title="Proveedor" back="/app/suppliers">
        <Notice tone="danger" title="No se encontró el proveedor">
          {existing.error.message}
        </Notice>
      </Page>
    );
  }
  return <SupplierForm key={uuid ?? 'new'} existing={uuid ? existing.data : null} />;
}

function SupplierForm({ existing }: { existing: Supplier | null | undefined }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState<SupplierFormValues>(() => toFormValues(existing));
  const { submit, errors, formError, saving } = useSaveSupplier(existing, (s) => {
    toast.show(existing ? 'Proveedor actualizado' : 'Proveedor creado');
    navigate(`/app/suppliers/${s.uuid}`, { replace: true });
  });
  const set = (k: keyof SupplierFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <Page
      title={existing ? 'Editar proveedor' : 'Nuevo proveedor'}
      back={existing ? `/app/suppliers/${existing.uuid}` : '/app/suppliers'}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(values);
        }}
      >
        <Card>
          {formError && <Notice tone="danger" title={formError} />}
          <FormGrid>
            <TextField
              label="Nombre"
              value={values.name}
              onChange={set('name')}
              error={errors.name}
              autoComplete="organization"
              required
              autoFocus={!existing}
            />
            <TextField
              label="Persona de contacto"
              value={values.contactName}
              onChange={set('contactName')}
              error={errors.contactName}
              autoComplete="name"
            />
            <TextField
              label="Teléfono"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={set('phone')}
              error={errors.phone}
              autoComplete="tel"
            />
            <TextField
              label="Correo"
              type="email"
              inputMode="email"
              value={values.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />
          </FormGrid>
          <TextAreaField
            label="Notas"
            hint="Días de entrega, condiciones de pago, etc."
            value={values.notes}
            onChange={set('notes')}
            error={errors.notes}
          />
          <Actions>
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {existing ? 'Guardar cambios' : 'Crear proveedor'}
            </Button>
          </Actions>
        </Card>
      </form>
    </Page>
  );
}
