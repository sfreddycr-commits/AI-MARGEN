import { useEffect } from 'react';
import { Brand } from '../../auth/views/Brand';
import { STEPS, useWizard } from '../js/use-onboarding';
import { StepBusiness } from './StepBusiness';
import { StepSettings } from './StepSettings';
import { StepIngredient } from './StepIngredient';
import { StepRecipe } from './StepRecipe';
import { StepResult } from './StepResult';
import styles from '../css/onboarding.module.css';

/** Asistente de bienvenida (SOP §8): de cero a un primer resultado útil en pocos minutos. */
export default function OnboardingView() {
  const w = useWizard();
  const current = STEPS[w.step - 1]!;

  useEffect(() => {
    document.title = `Paso ${w.step} de ${STEPS.length}: ${current.label} | AImargen`;
  }, [w.step, current.label]);

  return (
    <div className={styles.layout}>
      <header className={styles.top}>
        <Brand />
        <p className={styles.stepCount}>
          Paso {w.step} de {STEPS.length}
          <span className="srOnly">: {current.label}</span>
        </p>
      </header>

      <nav className={styles.progress} aria-label="Progreso de la configuración">
        <ol className={styles.progressList}>
          {STEPS.map((s) => {
            const state = s.n < w.step ? 'done' : s.n === w.step ? 'current' : 'todo';
            return (
              <li
                key={s.n}
                className={`${styles.progressItem} ${styles[state]}`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className={styles.progressBar} aria-hidden="true" />
                <span className={styles.progressLabel}>
                  {s.label}
                  {state === 'done' && <span className="srOnly"> (completado)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <main className={styles.main} id="contenido">
        {w.step === 1 && <StepBusiness userName={w.userName} onDone={w.next} />}
        {w.step === 2 && <StepSettings onDone={w.next} onBack={w.back} />}
        {w.step === 3 && (
          <StepIngredient
            created={w.ingredient}
            currency={w.currency}
            onDone={(i) => {
              w.setIngredient(i);
              w.next();
            }}
            onNext={w.next}
            onBack={w.back}
            onSkip={w.next}
          />
        )}
        {w.step === 4 && (
          <StepRecipe
            created={w.ingredient}
            saved={w.product}
            onNext={w.next}
            currency={w.currency}
            onDone={(p) => {
              w.setProduct(p);
              w.next();
            }}
            onBack={w.back}
            onSkip={() => {
              w.setProduct(null);
              w.next();
            }}
          />
        )}
        {w.step === 5 && <StepResult product={w.product} currency={w.currency} onBack={w.back} />}
      </main>
    </div>
  );
}
