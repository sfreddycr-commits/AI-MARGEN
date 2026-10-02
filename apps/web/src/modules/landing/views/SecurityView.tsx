import { Link } from 'react-router';
import { Icon, type IconName } from '../../../core/ui';
import { CONTACT_EMAIL, useSeo } from '../js/use-landing';
import { CtaBand, PageHero } from './Sections';
import styles from '../css/landing.module.css';
import page from '../css/pages.module.css';

/** Medidas que AImargen aplica hoy (SOP §29, §35, §36). Sin promesas que el sistema no cumpla. */
const MEASURES: Array<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'lock',
    title: 'Contraseñas protegidas con Argon2id',
    text: 'Nunca guardamos su contraseña tal cual. Se almacena transformada con Argon2id, un método diseñado para resistir intentos de adivinarla. Ni nuestro equipo puede verla.',
  },
  {
    icon: 'shield',
    title: 'Sesiones en cookies cifradas',
    text: 'Su sesión vive en cookies HttpOnly cifradas, que el código de las páginas no puede leer. El acceso dura poco y se renueva de forma segura.',
  },
  {
    icon: 'building',
    title: 'Cada negocio, aislado',
    text: 'La información de su negocio está separada de la de los demás. Cada consulta se limita al negocio de la sesión activa; nadie de otro negocio puede ver sus datos.',
  },
  {
    icon: 'users',
    title: 'Roles y permisos',
    text: 'Propietario, administrador, gerente, operador o solo lectura. Cada persona de su equipo ve y modifica solo lo que su rol le permite.',
  },
  {
    icon: 'history',
    title: 'Registro de auditoría',
    text: 'Los cambios importantes —precios, compras, recetas, roles, configuración y acciones confirmadas de la IA— quedan registrados con quién, cuándo y qué cambió.',
  },
  {
    icon: 'archive',
    title: 'Respaldos diarios',
    text: 'La base de datos se respalda automáticamente todos los días para poder recuperar la información ante una falla.',
  },
  {
    icon: 'send',
    title: 'Conexión cifrada (HTTPS)',
    text: 'Toda la comunicación entre su dispositivo y AImargen viaja cifrada.',
  },
  {
    icon: 'alert',
    title: 'Protección contra abusos',
    text: 'Limitamos los intentos de inicio de sesión y las solicitudes repetidas, y bloqueamos temporalmente una cuenta ante intentos fallidos sucesivos.',
  },
  {
    icon: 'ai',
    title: 'La IA solo ve su negocio',
    text: 'El asistente consulta únicamente la información del negocio de su sesión. Nunca guarda ni modifica nada sin que usted lo revise y lo confirme.',
  },
];

const TIPS = [
  'Use una contraseña larga que no utilice en otros sitios.',
  'Dé a cada persona de su equipo su propia cuenta y el rol mínimo que necesita.',
  'Cierre la sesión en computadoras compartidas.',
  'Revise sus precios y compras con regularidad; los cambios quedan registrados.',
];

export default function SecurityView() {
  useSeo({
    title: 'Seguridad',
    description:
      'Cómo protege AImargen la información de su negocio: contraseñas con Argon2id, cookies cifradas, aislamiento por negocio, roles, auditoría, respaldos diarios y una IA que nunca guarda sin su confirmación.',
    path: '/seguridad',
  });

  return (
    <>
      <PageHero
        eyebrow="Seguridad"
        title="Sus números son suyos. Los cuidamos como tal."
        lead="Sus costos, precios y proveedores son información sensible de su negocio. Estas son las medidas que aplicamos para protegerla."
      />

      <section className={styles.section} aria-labelledby="medidas-title">
        <div className={styles.container}>
          <h2 id="medidas-title" className="srOnly">
            Medidas de seguridad
          </h2>
          <ul className={page.measures}>
            {MEASURES.map((m) => (
              <li key={m.title} className={page.measure}>
                <span className={page.measureIcon}>
                  <Icon name={m.icon} />
                </span>
                <div className={page.measureBody}>
                  <h3 className={styles.cardTitle}>{m.title}</h3>
                  <p className={styles.cardText}>{m.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={`${styles.section} ${styles.sectionTinted}`}
        aria-labelledby="usted-title"
      >
        <div className={styles.container}>
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>Buenas prácticas</p>
            <h2 id="usted-title" className={styles.sectionTitle}>
              Lo que usted puede hacer
            </h2>
          </header>
          <ul className={`${page.tips} ${page.bullets}`}>
            {TIPS.map((t) => (
              <li key={t}>
                <Icon name="check" size={16} />
                {t}
              </li>
            ))}
          </ul>
          <p className={`${styles.sectionLead} ${styles.sectionMore}`}>
            ¿Encontró un problema de seguridad? Escríbanos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.textLink}>
              {CONTACT_EMAIL}
            </a>
            . También puede leer nuestra{' '}
            <Link to="/privacidad" className={styles.textLink}>
              política de privacidad
            </Link>
            .
          </p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
