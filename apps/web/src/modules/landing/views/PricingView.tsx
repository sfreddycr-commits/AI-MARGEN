import { Link } from 'react-router';
import { Icon } from '../../../core/ui';
import { useSeo } from '../js/use-landing';
import { CtaBand, Faq, PageHero, type FaqEntry } from './Sections';
import styles from '../css/landing.module.css';
import page from '../css/pages.module.css';

/**
 * Planes preparados, no fijados (SOP §49): se muestran las etapas previstas sin precios ni
 * límites numéricos inventados. Cuando el modelo comercial se defina, se completan aquí.
 */
const PLANS = [
  {
    name: 'Para empezar',
    audience: 'Negocios pequeños que quieren conocer el costo real de su menú.',
    points: [
      'Ingredientes, proveedores y compras',
      'Recetas con costo por porción',
      'Precio sugerido, margen y utilidad',
    ],
  },
  {
    name: 'Para crecer',
    audience: 'Negocios que revisan precios con frecuencia y quieren apoyo de la IA.',
    points: [
      'Todo lo del plan anterior',
      'Escenarios y punto de equilibrio',
      'Asistente con IA y facturas por foto',
    ],
  },
  {
    name: 'Para equipos',
    audience: 'Negocios con varias personas que registran compras y recetas.',
    points: [
      'Todo lo del plan anterior',
      'Usuarios con roles y permisos',
      'Reportes para compartir con socios o contador',
    ],
  },
];

/** Límites que podrán variar entre planes (SOP §49). */
const LIMITS = [
  'Usuarios',
  'Productos',
  'Recetas',
  'Facturas leídas con IA',
  'Consultas a la IA',
  'Exportaciones',
  'Almacenamiento',
];

const FAQ: FaqEntry[] = [
  {
    q: '¿Cuánto cuesta AImargen?',
    a: 'Los precios de los planes todavía están por definir. Hoy puede crear su cuenta gratis y empezar a usar AImargen. Publicaremos los precios en esta página antes de que exista cualquier cobro.',
  },
  {
    q: '¿Necesito una tarjeta de crédito para registrarme?',
    a: 'No. Para crear la cuenta solo se le pide su nombre, su correo y una contraseña.',
  },
  {
    q: '¿Me van a cobrar sin avisarme?',
    a: 'No. Ningún cobro se aplicará sin aviso previo y sin que usted acepte el plan y su precio.',
  },
  {
    q: '¿Qué va a cambiar entre un plan y otro?',
    a: 'Principalmente los límites de uso: cantidad de usuarios, productos y recetas, facturas leídas con IA, consultas a la IA, exportaciones y almacenamiento.',
  },
  {
    q: '¿Puedo sacar mi información si dejo de usar AImargen?',
    a: 'Sí. Sus datos son suyos. Puede descargar reportes en PDF y Excel y solicitarnos una copia de la información de su negocio.',
  },
  {
    q: '¿Funciona en el celular?',
    a: 'Sí. AImargen funciona en el navegador del celular, la tableta o la computadora, y puede instalarse en la pantalla de inicio como una app.',
  },
  {
    q: '¿Puedo invitar a mi equipo?',
    a: 'Sí. Puede invitar a otras personas y asignarles un rol: administrador, gerente, operador o solo lectura. Cada rol ve y hace solo lo que le corresponde.',
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Cada negocio está aislado de los demás, las contraseñas se guardan cifradas y se hacen respaldos automáticos. Puede leer el detalle en la página de seguridad.',
  },
];

export default function PricingView() {
  useSeo({
    title: 'Precios',
    description:
      'Planes de AImargen para restaurantes, sodas, cafeterías y panaderías. Los precios están por definir: cree su cuenta gratis hoy, sin tarjeta.',
    path: '/precios',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  });

  return (
    <>
      <PageHero
        eyebrow="Precios"
        title="Planes pensados para cada etapa de su negocio"
        lead="Estamos definiendo los planes junto con los primeros negocios que usan AImargen. Mientras tanto, puede crear su cuenta gratis."
      />

      <section className={styles.section} aria-labelledby="planes-title">
        <div className={styles.container}>
          <div className={page.notice} role="note">
            <Icon name="info" />
            <div>
              <p>
                <strong>Precios por definir.</strong> Ningún cobro se aplicará sin aviso previo y
                sin su aceptación.
              </p>
              <p className={page.noticeMuted}>
                Las funciones de cada plan pueden ajustarse antes del lanzamiento.
              </p>
            </div>
          </div>

          <h2 id="planes-title" className="srOnly">
            Planes
          </h2>
          <ul className={page.plans}>
            {PLANS.map((p) => (
              <li key={p.name} className={page.plan}>
                <div>
                  <h3 className={page.planName}>{p.name}</h3>
                  <p className={page.planFor}>{p.audience}</p>
                </div>
                <span className={page.planPrice}>
                  <Icon name="history" size={16} />
                  Precio por definir
                </span>
                <ul className={page.bullets}>
                  {p.points.map((pt) => (
                    <li key={pt}>
                      <Icon name="check" size={16} />
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/registro"
                  className={`${styles.btn} ${styles.btnSecondary} ${page.planAction}`}
                >
                  Crear cuenta gratis
                </Link>
              </li>
            ))}
          </ul>

          <div className={page.limits}>
            <h3 className={page.limitsTitle}>Qué podrá variar entre planes</h3>
            <ul className={page.chips}>
              {LIMITS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionTinted}`} aria-labelledby="faq-title">
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Preguntas frecuentes</p>
            <h2 id="faq-title" className={styles.sectionTitle}>
              Lo que suelen preguntarnos
            </h2>
          </header>
          <Faq items={FAQ} />
        </div>
      </section>

      <CtaBand />
    </>
  );
}
