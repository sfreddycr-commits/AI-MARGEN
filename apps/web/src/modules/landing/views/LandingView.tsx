import { Link } from 'react-router';
import { Icon, type IconName } from '../../../core/ui';
import { useSeo } from '../js/use-landing';
import { ProductMockup } from './ProductMockup';
import { CtaBand } from './Sections';
import styles from '../css/landing.module.css';

const PROBLEMS: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'trendUp',
    title: 'Ingredientes que suben de precio',
    text: 'El pollo, el aceite o el café cambian de precio y el menú sigue igual durante meses.',
  },
  {
    icon: 'trash',
    title: 'Merma que nadie cuenta',
    text: 'Lo que se pierde al limpiar, cortar o cocinar también se paga, aunque no llegue al plato.',
  },
  {
    icon: 'products',
    title: 'Empaque olvidado',
    text: 'La caja, el vaso, la tapa y la bolsa de cada pedido para llevar suman más de lo que parece.',
  },
  {
    icon: 'users',
    title: 'Mano de obra sin calcular',
    text: 'El tiempo de preparación tiene un costo. Si no se incluye, la ganancia real es menor.',
  },
  {
    icon: 'eye',
    title: 'Precios puestos “a ojo”',
    text: 'Se cobra lo que cobra el vecino o lo que se siente bien, sin saber cuánto queda de verdad.',
  },
  {
    icon: 'alert',
    title: 'Margen confundido con multiplicador',
    text: 'Sumarle 40% al costo no es lo mismo que ganar 40% del precio. AImargen le muestra la diferencia.',
  },
];

const FEATURES: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'ingredients',
    title: 'Ingredientes y compras',
    text: 'Registre lo que compra y a quién. El costo de cada insumo se actualiza con sus compras y guarda su historial.',
  },
  {
    icon: 'products',
    title: 'Recetas con costo real',
    text: 'Arme cada plato con sus cantidades, merma, empaque y mano de obra. Vea el costo por porción al instante.',
  },
  {
    icon: 'costs',
    title: 'Precio y margen',
    text: 'Defina el margen que quiere ganar y obtenga el precio sugerido, o revise el margen real del precio actual.',
  },
  {
    icon: 'scenarios',
    title: 'Escenarios y punto de equilibrio',
    text: 'Pruebe qué pasa si sube un insumo o vende más. Sepa cuántas unidades necesita para cubrir sus costos fijos.',
  },
  {
    icon: 'reports',
    title: 'Reportes en PDF y Excel',
    text: 'Costos, márgenes y compras en reportes claros, listos para compartir con su socio o su contador.',
  },
  {
    icon: 'ai',
    title: 'Asistente con IA',
    text: 'Pregunte en palabras sencillas, capture facturas con una foto y cree recetas escribiendo.',
  },
];

const STEPS = [
  {
    title: 'Registre lo que compra',
    text: 'Agregue sus ingredientes con el precio y la presentación en que los compra.',
  },
  {
    title: 'Construya su receta',
    text: 'Indique cuánto lleva cada plato, con merma, empaque y mano de obra.',
  },
  {
    title: 'AImargen calcula el costo real',
    text: 'Convierte unidades y obtiene el costo total y el costo por porción.',
  },
  {
    title: 'Elija el margen deseado',
    text: 'Defina cuánto quiere ganar sobre el precio de venta.',
  },
  {
    title: 'Obtenga precio, utilidad y escenarios',
    text: 'Vea el precio sugerido, la utilidad por unidad y qué pasa si algo cambia.',
  },
];

const QUESTIONS = [
  '¿Cuál producto tiene menor margen?',
  '¿Qué ingrediente subió más este mes?',
  '¿A qué precio debo vender el casado para ganar 45%?',
  '¿Qué pasa si vendo 40 unidades al día?',
  '¿Qué productos debo revisar esta semana?',
];

const BUSINESSES: Array<{ icon: IconName; label: string }> = [
  { icon: 'building', label: 'Restaurantes' },
  { icon: 'home', label: 'Sodas' },
  { icon: 'pulse', label: 'Cafeterías' },
  { icon: 'grid', label: 'Panaderías' },
  { icon: 'calendar', label: 'Reposterías' },
  { icon: 'send', label: 'Food trucks' },
  { icon: 'users', label: 'Catering y eventos' },
  { icon: 'ai', label: 'Emprendimientos gastronómicos' },
];

export default function LandingView() {
  useSeo({
    title: 'AImargen — Sepa cuánto cuesta. Sepa cuánto gana.',
    rawTitle: true,
    description:
      'Calcule el costo real de cada plato, defina precios rentables y conozca su margen. Para restaurantes, sodas, cafeterías y panaderías en Costa Rica.',
    path: '/',
  });

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={`${styles.container} ${styles.heroGrid}`}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Costos, precios y márgenes para negocios de comida</p>
            <h1 id="hero-title" className={styles.heroTitle}>
              <span>Sepa cuánto cuesta.</span>{' '}
              <span className={styles.heroAccent}>Sepa cuánto gana.</span>
            </h1>
            <p className={styles.heroLead}>
              Calcule el costo real de sus recetas, defina precios rentables y tome mejores
              decisiones sin complicarse con contabilidad.
            </p>
            <div className={styles.heroActions}>
              <Link to="/registro" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
                Crear cuenta gratis
                <Icon name="arrowRight" size={20} />
              </Link>
              <Link
                to="/#como-funciona"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnLg}`}
              >
                Ver cómo funciona
              </Link>
            </div>
            <ul className={styles.heroPoints}>
              <li>
                <Icon name="check" size={18} />
                Pensado para Costa Rica, en colones
              </li>
              <li>
                <Icon name="check" size={18} />
                Funciona en el celular y en la computadora
              </li>
            </ul>
          </div>
          <div className={styles.heroVisual}>
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* ---------- Problema ---------- */}
      <section className={styles.section} aria-labelledby="problema-title">
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>El problema</p>
            <h2 id="problema-title" className={styles.sectionTitle}>
              ¿Está seguro de cuánto gana con cada producto?
            </h2>
            <p className={styles.sectionLead}>
              En muchos negocios de comida el precio se define una vez y no se revisa más. Mientras
              tanto, los costos cambian.
            </p>
          </header>
          <ul className={styles.cards3}>
            {PROBLEMS.map((p) => (
              <li key={p.title} className={styles.card}>
                <span className={`${styles.cardIcon} ${styles.cardIconMuted}`}>
                  <Icon name={p.icon} />
                </span>
                <h3 className={styles.cardTitle}>{p.title}</h3>
                <p className={styles.cardText}>{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- Funcionalidades ---------- */}
      <section
        className={`${styles.section} ${styles.sectionTinted}`}
        aria-labelledby="funciones-title"
      >
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Funciones</p>
            <h2 id="funciones-title" className={styles.sectionTitle}>
              Todo lo necesario para ponerle precio a su menú
            </h2>
          </header>
          <ul className={styles.cards3}>
            {FEATURES.map((f) => (
              <li key={f.title} className={styles.card}>
                <span className={styles.cardIcon}>
                  <Icon name={f.icon} />
                </span>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardText}>{f.text}</p>
              </li>
            ))}
          </ul>
          <p className={styles.sectionMore}>
            <Link to="/funciones" className={styles.textLink}>
              Ver todas las funciones
              <Icon name="arrowRight" size={18} />
            </Link>
          </p>
        </div>
      </section>

      {/* ---------- Cómo funciona ---------- */}
      <section id="como-funciona" className={styles.section} aria-labelledby="como-title">
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Cómo funciona</p>
            <h2 id="como-title" className={styles.sectionTitle}>
              De la factura al precio en cinco pasos
            </h2>
          </header>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={`${styles.stepNum} num`} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardText}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- IA ---------- */}
      <section
        id="ia"
        className={`${styles.section} ${styles.sectionDeep}`}
        aria-labelledby="ia-title"
      >
        <div className={`${styles.container} ${styles.aiGrid}`}>
          <div>
            <p className={`${styles.eyebrow} ${styles.eyebrowOnDark}`}>AImargen IA</p>
            <h2 id="ia-title" className={`${styles.sectionTitle} ${styles.onDark}`}>
              Pregúntele a su negocio.
            </h2>
            <p className={`${styles.sectionLead} ${styles.onDarkMuted}`}>
              La IA le ahorra trabajo y le explica sus números en palabras sencillas. La IA no
              inventa sus números: consulta los datos y el motor de cálculo de AImargen antes de
              responder.
            </p>
            <ul className={styles.aiList}>
              <li>
                <Icon name="ai" />
                <span>
                  <strong>Pregunte a su negocio.</strong> Márgenes, costos, ingredientes que
                  subieron y productos para revisar.
                </span>
              </li>
              <li>
                <Icon name="camera" />
                <span>
                  <strong>Facturas por foto.</strong> Tome una foto de la factura y la IA propone
                  las líneas de compra para que usted las revise.
                </span>
              </li>
              <li>
                <Icon name="edit" />
                <span>
                  <strong>Recetas por texto.</strong> Escriba “un casado lleva 150 g de arroz…” y
                  obtenga un borrador de receta.
                </span>
              </li>
            </ul>
            <p className={styles.aiRule}>
              <Icon name="shield" size={20} />
              La IA propone, usted confirma. Nada se guarda sin su aprobación.
            </p>
          </div>
          <div className={styles.chat} aria-label="Ejemplos de preguntas">
            {QUESTIONS.map((q) => (
              <p key={q} className={styles.chatBubble}>
                {q}
              </p>
            ))}
            <p className={styles.chatAnswer}>
              <Icon name="ai" size={18} />
              <span>
                Consulto sus productos y el motor de cálculo antes de responder. Si falta un dato,
                se lo digo en lugar de suponerlo.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Negocios ---------- */}
      <section className={styles.section} aria-labelledby="negocios-title">
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Para quién es</p>
            <h2 id="negocios-title" className={styles.sectionTitle}>
              Hecho para negocios de comida de todos los tamaños
            </h2>
            <p className={styles.sectionLead}>
              Desde una soda de barrio hasta un restaurante con varias personas en el equipo.
            </p>
          </header>
          <ul className={styles.business}>
            {BUSINESSES.map((b) => (
              <li key={b.label}>
                <Icon name={b.icon} size={20} />
                {b.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
