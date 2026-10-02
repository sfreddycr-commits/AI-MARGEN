import { useState } from 'react';
import {
  Actions,
  Button,
  ConfirmSheet,
  EmptyState,
  IconButton,
  Notice,
  Segmented,
  Sheet,
  Skeleton,
  TextField,
  useToast,
} from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { errorMessage } from '../../../core/js/api-client';
import { useArchiveCategory, useCategories, useSaveCategory } from '../js/use-settings';
import type { Category, CategoryKind } from '../js/settings.service';
import styles from '../css/settings.module.css';

const KIND_TEXT: Record<CategoryKind, { plural: string; example: string }> = {
  ingredient: { plural: 'ingredientes', example: 'Ej.: Lácteos, Carnes, Verduras' },
  product: { plural: 'productos', example: 'Ej.: Desayunos, Bebidas, Postres' },
};

export default function CategoriesView() {
  const toast = useToast();
  const [kind, setKind] = useState<CategoryKind>('ingredient');
  const list = useCategories(kind);
  const archive = useArchiveCategory();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toArchive, setToArchive] = useState<Category | null>(null);
  const text = KIND_TEXT[kind];

  const doArchive = (category: Category) =>
    archive.mutate(
      { kind, category, archived: true },
      {
        onSuccess: () => {
          setToArchive(null);
          toast.show(`Categoría "${category.name}" archivada`, {
            action: {
              label: 'Deshacer',
              onClick: () =>
                archive.mutate(
                  { kind, category, archived: false },
                  {
                    onSuccess: () => toast.show('Categoría restaurada'),
                    onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
                  },
                ),
            },
            durationMs: 8000,
          });
        },
        onError: (e) => toast.show(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <Page
      title="Categorías"
      description="Agrupe ingredientes y productos para encontrarlos y compararlos más fácil."
      back="/app/settings"
      action={
        list.canWrite && (
          <Button icon="plus" onClick={() => setEditing('new')}>
            Nueva
          </Button>
        )
      }
    >
      <Segmented
        label="Tipo de categoría"
        hideLabel
        value={kind}
        onChange={setKind}
        options={[
          { value: 'ingredient', label: 'Ingredientes' },
          { value: 'product', label: 'Productos' },
        ]}
      />
      {list.error && (
        <Notice tone="danger" title="No se pudieron cargar las categorías">
          {list.error.message}
        </Notice>
      )}
      {list.isPending ? (
        <ul className={styles.categoryList} aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.categoryRow}>
              <Skeleton width="50%" />
            </li>
          ))}
        </ul>
      ) : list.items.length === 0 ? (
        <EmptyState
          icon="grid"
          title={`Sin categorías de ${text.plural}`}
          description={`Cree la primera para ordenar sus ${text.plural}. ${text.example}.`}
          action={
            list.canWrite && (
              <Button icon="plus" onClick={() => setEditing('new')}>
                Crear categoría
              </Button>
            )
          }
        />
      ) : (
        <ul className={styles.categoryList} aria-label={`Categorías de ${text.plural}`}>
          {list.items.map((c) => (
            <li key={c.uuid} className={styles.categoryRow}>
              <span className={styles.categoryName}>{c.name}</span>
              {list.canWrite && (
                <>
                  <IconButton
                    icon="edit"
                    label={`Renombrar ${c.name}`}
                    onClick={() => setEditing(c)}
                  />
                  <IconButton
                    icon="archive"
                    label={`Archivar ${c.name}`}
                    onClick={() => setToArchive(c)}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {!list.canWrite && !list.isPending && (
        <p className={styles.help}>Su rol puede ver estas categorías, pero no cambiarlas.</p>
      )}

      {editing && (
        <CategorySheet
          key={editing === 'new' ? `new-${kind}` : editing.uuid}
          kind={kind}
          existing={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmSheet
        open={toArchive !== null}
        title="¿Archivar categoría?"
        message={
          <p>
            &quot;{toArchive?.name}&quot; dejará de aparecer al crear o editar {text.plural}. Los{' '}
            {text.plural} que ya la usan no se modifican.
          </p>
        }
        confirmLabel="Archivar"
        danger
        loading={archive.isPending}
        onConfirm={() => toArchive && doArchive(toArchive)}
        onClose={() => setToArchive(null)}
      />
    </Page>
  );
}

function CategorySheet({
  kind,
  existing,
  onClose,
}: {
  kind: CategoryKind;
  existing: Category | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? '');
  const save = useSaveCategory(() => {
    toast.show(existing ? 'Categoría renombrada' : 'Categoría creada');
    onClose();
  });
  const text = KIND_TEXT[kind];

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? 'Renombrar categoría' : `Nueva categoría de ${text.plural}`}
      footer={
        <Actions>
          <Button variant="secondary" onClick={onClose} disabled={save.saving}>
            Cancelar
          </Button>
          <Button type="submit" form="category-form" loading={save.saving}>
            {existing ? 'Guardar' : 'Crear'}
          </Button>
        </Actions>
      }
    >
      <form
        id="category-form"
        noValidate
        className={styles.sheetForm}
        onSubmit={(e) => {
          e.preventDefault();
          save.submit(kind, name, existing);
        }}
      >
        {save.formError && <Notice tone="danger" title={save.formError} />}
        <TextField
          label="Nombre"
          hint={text.example}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={save.errors.name}
          autoFocus
          autoComplete="off"
        />
      </form>
    </Sheet>
  );
}
