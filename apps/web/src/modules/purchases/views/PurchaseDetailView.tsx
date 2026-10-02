import { useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Actions,
  Button,
  Card,
  ConfirmSheet,
  KeyValue,
  List,
  ListRow,
  Notice,
  Stat,
  StatusBadge,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { useSession, useTenant } from '../../../core/session/js/session-context';
import { errorMessage } from '../../../core/js/api-client';
import {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatMoney,
  unitLabel,
} from '../../../core/js/format';
import { moneyPerUnit } from '../../ingredients/js/units';
import { useOpenDocument, usePurchase, useVoidPurchase } from '../js/use-purchases';
import styles from '../css/purchases.module.css';

const qty = (v: string | null) => (v === null ? '—' : formatDecimal(v, 3).replace(/,?0+$/, ''));

export default function PurchaseDetailView() {
  const { uuid } = useParams();
  const toast = useToast();
  const { can } = useSession();
  const { currency } = useTenant();
  const { data: p, isPending, error } = usePurchase(uuid);
  const voidMutation = useVoidPurchase();
  const doc = useOpenDocument();
  const [confirm, setConfirm] = useState(false);

  if (isPending) return <PageSkeleton />;
  if (error || !p) {
    return (
      <Page title="Compra" back="/app/purchases">
        <Notice tone="danger" title="No se encontró la compra">
          {error?.message}
        </Notice>
      </Page>
    );
  }

  const doVoid = () =>
    voidMutation.mutate(p.uuid, {
      onSuccess: () => {
        setConfirm(false);
        toast.show('Compra anulada. Costos y recetas recalculados.');
      },
      onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
    });

  return (
    <Page title={p.supplierName ?? 'Compra sin proveedor'} back="/app/purchases">
      {p.voided && (
        <Notice tone="warning" title="Compra anulada">
          Anulada el {formatDateTime(p.voidedAt)}. Ya no cuenta para el costo de sus ingredientes.
        </Notice>
      )}

      <div className={styles.summary}>
        <div className={styles.stats}>
          <Stat
            label="Total"
            value={p.total === null ? '—' : formatMoney(p.total, currency)}
            caption={p.items.length === 1 ? '1 ingrediente' : `${p.items.length} ingredientes`}
          />
          <Stat
            label="Fecha"
            value={formatDate(p.purchasedAt)}
            caption={p.reference ?? 'Sin referencia'}
          />
        </div>
        <div className={styles.badges}>
          {p.voided && <StatusBadge tone="danger">Anulada</StatusBadge>}
          {p.source === 'invoice_ai' ? (
            <StatusBadge tone="info">Factura IA</StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Registro manual</StatusBadge>
          )}
          {p.isDemo && <StatusBadge tone="info">Dato de demostración</StatusBadge>}
        </div>
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.lines} aria-labelledby="purchase-items-title">
          <h2 id="purchase-items-title" className={styles.sectionTitle}>
            Ingredientes comprados
          </h2>
          <List label="Ingredientes comprados">
            {p.items.map((it, idx) => (
              <ListRow
                key={`${it.ingredientUuid}-${idx}`}
                to={`/app/ingredients/${it.ingredientUuid}`}
                icon="ingredients"
                title={it.ingredientName}
                subtitle={`${qty(it.quantity)} ${unitLabel(it.unit)} · ${moneyPerUnit(it.unitCost, it.ingredientUnit, currency)}`}
                value={it.lineTotal === null ? '—' : formatMoney(it.lineTotal, currency)}
              />
            ))}
          </List>
        </section>

        <Card title="Detalle">
          <div>
            <KeyValue
              label="Proveedor"
              value={
                p.supplierUuid ? (
                  <Link to={`/app/suppliers/${p.supplierUuid}`}>{p.supplierName}</Link>
                ) : (
                  '—'
                )
              }
            />
            <KeyValue label="Referencia" value={p.reference ?? '—'} />
            <KeyValue
              label="Origen"
              value={p.source === 'invoice_ai' ? 'Factura leída con IA' : 'Registro manual'}
            />
            <KeyValue label="Registrada" value={formatDateTime(p.createdAt)} />
          </div>
          {p.notes && <p className={styles.notes}>{p.notes}</p>}
          {doc.error && <Notice tone="danger" title={doc.error} />}
          {p.documentUuid && (
            <Actions>
              <Button
                variant="secondary"
                icon="file"
                loading={doc.opening}
                onClick={() => void doc.open(p.documentUuid!)}
              >
                Ver factura
              </Button>
            </Actions>
          )}
        </Card>
      </div>

      {can('purchases.write') && !p.voided && (
        <Actions>
          <Button variant="ghost" icon="close" onClick={() => setConfirm(true)}>
            Anular compra
          </Button>
        </Actions>
      )}

      <ConfirmSheet
        open={confirm}
        title="¿Anular esta compra?"
        message={
          <>
            <p>
              Los ingredientes vuelven al costo que tenían antes y sus recetas se recalculan. La
              compra queda en el historial marcada como anulada.
            </p>
            <p>Esta acción no se puede deshacer. Si se equivocó, anúlela y regístrela de nuevo.</p>
          </>
        }
        confirmLabel="Anular compra"
        danger
        loading={voidMutation.isPending}
        onConfirm={doVoid}
        onClose={() => setConfirm(false)}
      />
    </Page>
  );
}
