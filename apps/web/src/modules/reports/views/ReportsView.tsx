import { Button, Card, FormGrid, Icon, Notice, SelectField, TextField } from '../../../core/ui';
import type { IconName } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { FORMAT_LABEL, useReports } from '../js/use-reports';
import type { ReportFormat, ReportId } from '../js/reports.service';
import styles from '../css/reports.module.css';

const REPORT_ICON: Record<ReportId, IconName> = {
  products: 'products',
  profitability: 'costs',
  'product-sheet': 'file',
  ingredients: 'ingredients',
  purchases: 'purchases',
  suppliers: 'suppliers',
  'break-even': 'scenarios',
  backup: 'shield',
};

const FORMAT_ICON: Record<ReportFormat, IconName> = {
  pdf: 'file',
  xlsx: 'grid',
  csv: 'download',
  json: 'download',
};

export default function ReportsView() {
  const r = useReports();

  return (
    <Page
      title="Reportes"
      description="Descargue sus números para imprimir, compartir con su contador o guardar un respaldo. Todas las cifras salen de sus datos actuales."
      back="/app/mas"
    >
      {!r.canExport && (
        <Notice tone="info" title="Solo puede ver el catálogo">
          Su rol no incluye descargar reportes. Pida acceso al dueño o administrador del negocio.
        </Notice>
      )}
      <ul className={styles.grid}>
        {r.reports.map((rep) => (
          <li key={rep.id}>
            <Card className={styles.card}>
              <div className={styles.head}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon name={REPORT_ICON[rep.id]} size={22} />
                </span>
                <div className={styles.headText}>
                  <h2 className={styles.title}>{rep.title}</h2>
                  <p className={styles.desc}>{rep.description}</p>
                </div>
              </div>

              {rep.params === 'dateRange' && (
                <FormGrid>
                  <TextField
                    type="date"
                    label="Desde"
                    value={r.from}
                    max={r.to || undefined}
                    onChange={(e) => r.setFrom(e.target.value)}
                    error={r.errors.from}
                  />
                  <TextField
                    type="date"
                    label="Hasta"
                    value={r.to}
                    min={r.from || undefined}
                    onChange={(e) => r.setTo(e.target.value)}
                    error={r.errors.to}
                  />
                </FormGrid>
              )}
              {rep.params === 'product' && (
                <SelectField
                  label="Producto"
                  value={r.product}
                  onChange={(e) => r.setProduct(e.target.value)}
                  placeholder={
                    r.productsPending
                      ? 'Cargando productos…'
                      : r.products.length
                        ? 'Elija un producto'
                        : 'Aún no tiene productos'
                  }
                  options={r.products.map((p) => ({ value: p.uuid, label: p.name }))}
                  error={r.errors.product}
                />
              )}

              {r.canExport && (
                <div className={styles.formats} role="group" aria-label={`Descargar ${rep.title}`}>
                  {rep.visibleFormats.map((f) => (
                    <Button
                      key={f}
                      variant={f === rep.visibleFormats[0] ? 'primary' : 'secondary'}
                      icon={FORMAT_ICON[f]}
                      loading={r.isPending(rep.id, f)}
                      disabled={r.busy && !r.isPending(rep.id, f)}
                      onClick={() => void r.download(rep.id, f)}
                      aria-label={`Descargar ${rep.title} en ${FORMAT_LABEL[f]}`}
                    >
                      {FORMAT_LABEL[f]}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </Page>
  );
}
