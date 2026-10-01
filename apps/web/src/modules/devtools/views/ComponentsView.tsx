import { useState } from 'react';
import { parseLocaleDecimal } from '../../../core/js/format';
import {
  Button,
  EmptyState,
  MarginBar,
  Notice,
  NumberField,
  Sheet,
  Skeleton,
  StatusBadge,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import styles from '../css/components.module.css';

/**
 * Catálogo del design system (solo en desarrollo). Sirve para QA visual en 390×844 y 1440×900.
 * Los valores mostrados son ejemplos fijos para revisar estilos; no son datos de negocio.
 */
export default function ComponentsView() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const parsed = price ? parseLocaleDecimal(price) : '';

  return (
    <Page
      title="Componentes"
      description="Catálogo del design system. Solo visible en desarrollo."
      back="/app/mas"
    >
      <section className={styles.section} aria-labelledby="ds-buttons">
        <h2 id="ds-buttons" className={styles.sectionTitle}>
          Botones
        </h2>
        <div className={styles.row}>
          <Button onClick={() => toast.show('Cambios guardados')}>Guardar cambios</Button>
          <Button variant="secondary" icon="plus" onClick={() => setOpen(true)}>
            Abrir hoja
          </Button>
          <Button
            variant="ghost"
            onClick={() => toast.show('No se pudo conectar', { tone: 'error' })}
          >
            Probar error
          </Button>
          <Button loading>Guardando</Button>
          <Button disabled>Deshabilitado</Button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-fields">
        <h2 id="ds-fields" className={styles.sectionTitle}>
          Campos
        </h2>
        <div className={styles.grid}>
          <TextField label="Nombre del ingrediente" placeholder="Ej. Queso mozzarella" />
          <NumberField
            kind="money"
            label="Precio de compra"
            placeholder="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            hint={parsed ? `Se guardará como ${parsed}` : 'Puede escribir 10.000 o 1.500,75'}
            error={
              price && parsed === null
                ? 'Ingrese un monto válido, por ejemplo 10.000 o 1.500,75.'
                : undefined
            }
          />
          <NumberField kind="percent" label="Margen objetivo" placeholder="40" />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-margin">
        <h2 id="ds-margin" className={styles.sectionTitle}>
          Barra de margen
        </h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Saludable, sobre la meta</p>
            <MarginBar cost="1000" price="2000" margin="0.5" target="0.4" />
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Debajo del objetivo</p>
            <MarginBar cost="1450" price="2000" margin="0.275" target="0.4" />
          </div>
          <div className={styles.card}>
            <p className={styles.cardTitle}>Precio menor al costo</p>
            <MarginBar cost="2300" price="2000" margin="-0.15" target="0.4" />
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-status">
        <h2 id="ds-status" className={styles.sectionTitle}>
          Estados y avisos
        </h2>
        <div className={styles.row}>
          <StatusBadge tone="positive">Sobre la meta</StatusBadge>
          <StatusBadge tone="warning">Revisar precio</StatusBadge>
          <StatusBadge tone="danger">Pierde dinero</StatusBadge>
          <StatusBadge tone="neutral">Sin precio</StatusBadge>
        </div>
        <Notice tone="warning" title="3 ingredientes no tienen costo">
          Las recetas que los usan no pueden calcular su costo real.
        </Notice>
        <div className={styles.card}>
          <Skeleton width="40%" height={20} />
          <Skeleton />
          <Skeleton width="80%" />
        </div>
        <EmptyState
          icon="ingredients"
          title="Aún no tiene ingredientes"
          description="Registre lo que compra para que AImargen calcule el costo de sus recetas."
          action={<Button icon="plus">Agregar ingrediente</Button>}
        />
      </section>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo ingrediente"
        footer={
          <Button
            block
            size="lg"
            onClick={() => {
              setOpen(false);
              toast.show('Ingrediente guardado');
            }}
          >
            Guardar ingrediente
          </Button>
        }
      >
        <div className={styles.grid}>
          <TextField label="Nombre" placeholder="Ej. Harina" autoFocus />
          <NumberField kind="money" label="Precio de compra" placeholder="0" />
          <NumberField label="Cantidad comprada" placeholder="1" suffix="kg" />
        </div>
      </Sheet>
    </Page>
  );
}
