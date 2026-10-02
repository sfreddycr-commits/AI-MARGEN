import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  KeyValue,
  Notice,
  StatusBadge,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import { formatDate } from '../../../core/js/format';
import { useArchiveSupplier, useSupplier } from '../js/use-suppliers';
import styles from '../css/suppliers.module.css';

export default function SupplierDetailView() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useSession();
  const { data: s, isPending, error } = useSupplier(uuid);
  const archive = useArchiveSupplier();
  const [confirm, setConfirm] = useState(false);

  if (isPending) return <PageSkeleton />;
  if (error || !s) {
    return (
      <Page title="Proveedor" back="/app/suppliers">
        <Notice tone="danger" title="No se encontró el proveedor">
          {error?.message}
        </Notice>
      </Page>
    );
  }
  const canWrite = can('suppliers.write');

  const toggleArchive = () =>
    archive.mutate(
      { uuid: s.uuid, archived: !s.archived },
      {
        onSuccess: () => {
          setConfirm(false);
          toast.show(s.archived ? 'Proveedor restaurado' : 'Proveedor archivado');
        },
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <Page
      title={s.name}
      back="/app/suppliers"
      action={
        canWrite &&
        !s.archived && (
          <Button variant="secondary" icon="edit" onClick={() => navigate(`/app/suppliers/${s.uuid}/edit`)}>
            Editar
          </Button>
        )
      }
    >
      {s.archived && (
        <Notice tone="warning" title="Proveedor archivado">
          No aparece al registrar compras. Puede restaurarlo cuando quiera.
        </Notice>
      )}
      <div className={styles.detailGrid}>
        <Card title="Contacto">
          <div>
            <KeyValue label="Persona de contacto" value={s.contactName ?? '—'} />
            <KeyValue
              label="Teléfono"
              value={s.phone ? <a href={`tel:${s.phone}`}>{s.phone}</a> : '—'}
            />
            <KeyValue
              label="Correo"
              value={s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : '—'}
            />
          </div>
          {s.notes && <p className={styles.notes}>{s.notes}</p>}
        </Card>
        <Card title="Compras">
          <div>
            <KeyValue label="Compras registradas" value={s.purchasesCount} />
            <KeyValue label="Última compra" value={formatDate(s.lastPurchaseAt)} />
          </div>
          <Actions>
            <Button
              variant="secondary"
              icon="purchases"
              onClick={() => navigate(`/app/purchases?supplier=${s.uuid}`)}
            >
              Ver compras
            </Button>
          </Actions>
        </Card>
      </div>
      {s.isDemo && <StatusBadge tone="info">Dato de demostración</StatusBadge>}
      {canWrite && (
        <Actions>
          <Button
            variant="ghost"
            icon={s.archived ? 'restore' : 'archive'}
            onClick={() => (s.archived ? toggleArchive() : setConfirm(true))}
            loading={archive.isPending && s.archived}
          >
            {s.archived ? 'Restaurar proveedor' : 'Archivar proveedor'}
          </Button>
        </Actions>
      )}
      <ConfirmSheet
        open={confirm}
        title="¿Archivar proveedor?"
        message={
          <p>
            Sus compras anteriores se conservan. Dejará de aparecer al registrar compras nuevas.
          </p>
        }
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={toggleArchive}
        onClose={() => setConfirm(false)}
      />
    </Page>
  );
}
