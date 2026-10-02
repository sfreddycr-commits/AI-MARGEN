import { Actions, Button, Card, TextAreaField } from '../../../core/ui';
import { Page } from '../../../core/shell/views/Page';
import { PageSkeleton } from '../../../core/shell/views/PageSkeleton';
import { RECIPE_PLACEHOLDER, useAiAccess, useRecipeFromText } from '../js/use-ai';
import { AiDisabledState, SafetyNote } from './AiParts';
import styles from '../css/ai.module.css';

export default function AiRecipeView() {
  const access = useAiAccess();
  if (access.loading) return <PageSkeleton />;
  const blocked = !access.enabled
    ? undefined
    : !access.recipe
      ? 'feature'
      : access.limitReached
        ? 'limit'
        : null;
  return (
    <Page
      title="Receta desde texto"
      description="Escriba la receta como se la explicaría a alguien de su cocina. AImargen busca sus ingredientes y arma un borrador."
      back="/app/ai"
    >
      {blocked !== null ? (
        <AiDisabledState isAdmin={access.isAdmin} reason={blocked} />
      ) : (
        <RecipeForm />
      )}
    </Page>
  );
}

function RecipeForm() {
  const f = useRecipeFromText();
  return (
    <form
      className={styles.narrow}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        f.submit();
      }}
    >
      <SafetyNote />
      <Card>
        <TextAreaField
          label="Receta"
          hint="Incluya cantidad y unidad de cada ingrediente, y las porciones si rinde más de una."
          placeholder={RECIPE_PLACEHOLDER}
          rows={6}
          value={f.text}
          onChange={(e) => f.setText(e.target.value)}
          error={f.error ?? undefined}
          maxLength={2000}
          autoFocus
        />
        <p className={styles.footnote}>
          La IA nunca inventa costos: usa los de sus ingredientes registrados y le avisa de los que
          faltan.
        </p>
        <Actions>
          <Button type="submit" icon="ai" loading={f.loading}>
            Crear borrador
          </Button>
        </Actions>
      </Card>
    </form>
  );
}
