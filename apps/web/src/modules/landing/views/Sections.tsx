import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../../core/ui';
import { useSession } from '../../../core/session/js/session-context';
import styles from '../css/landing.module.css';
import page from '../css/pages.module.css';

/** Llamado final a crear la cuenta (SOP §6, sección CTA). */
export function CtaBand() {
  const { me } = useSession();
  return (
    <section className={styles.ctaBand} aria-labelledby="cta-title">
      <div className={`${styles.container} ${styles.ctaInner}`}>
        <h2 id="cta-title" className={styles.ctaTitle}>
          Más control. Más utilidad. Un negocio más rentable.
        </h2>
        <p className={styles.ctaText}>
          Cree su cuenta, registre sus primeros ingredientes y vea el costo real de su primer plato
          hoy mismo.
        </p>
        <div className={styles.heroActions}>
          {me ? (
            <Link to="/app" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              Ir a mi panel
              <Icon name="arrowRight" size={20} />
            </Link>
          ) : (
            <Link to="/registro" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
              Crear cuenta gratis
              <Icon name="arrowRight" size={20} />
            </Link>
          )}
          <Link to="/contacto" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}>
            Hablar con nosotros
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Encabezado de páginas internas del sitio (una sola h1 por página). */
export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className={styles.pageHero}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.pageTitle}>{title}</h1>
        {lead && <p className={styles.heroLead}>{lead}</p>}
        {children}
      </div>
    </section>
  );
}

export interface FaqEntry {
  q: string;
  a: string;
}

/** Preguntas frecuentes con <details> nativo: accesible por teclado y sin JavaScript extra. */
export function Faq({ items }: { items: FaqEntry[] }) {
  return (
    <div className={page.faq}>
      {items.map((f) => (
        <details key={f.q} className={page.faqItem}>
          <summary>
            {f.q}
            <Icon name="chevronDown" size={18} className={page.faqChevron} />
          </summary>
          <p className={page.faqAnswer}>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Documento legal: aviso de borrador, índice (escritorio) y secciones con anclas. */
export function LegalDoc({ updated, sections }: { updated: string; sections: LegalSection[] }) {
  return (
    <section className={styles.section}>
      <div className={`${styles.container} ${page.legal}`}>
        <nav aria-label="Contenido del documento">
          <ol className={page.toc}>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className={page.prose}>
          <p className={page.updated}>Última actualización: {updated}</p>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`}>
              <h2 id={`${s.id}-t`}>
                {i + 1}. {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Aviso visible de que el texto legal aún no fue revisado por un abogado. */
export function DraftNotice() {
  return (
    <div className={page.draft} role="note">
      <Icon name="alert" />
      <div>
        <strong>Borrador pendiente de revisión legal</strong>
        <p className={page.draftText}>
          Este documento es una versión preliminar. Puede cambiar antes de su publicación
          definitiva.
        </p>
      </div>
    </div>
  );
}
