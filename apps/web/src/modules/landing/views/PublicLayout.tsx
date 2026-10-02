import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Icon, Sheet, Skeleton } from '../../../core/ui';
import { CONTACT_EMAIL, currentYear, usePublicHeader, useScrollToHash } from '../js/use-landing';
import { Brand } from './Brand';
import styles from '../css/public-layout.module.css';

const NAV = [
  { to: '/funciones', label: 'Funciones' },
  { to: '/#como-funciona', label: 'Cómo funciona' },
  { to: '/#ia', label: 'IA' },
  { to: '/precios', label: 'Precios' },
  { to: '/seguridad', label: 'Seguridad' },
];

function PageFallback() {
  return (
    <div className={styles.fallback} aria-busy="true" aria-label="Cargando">
      <Skeleton height={40} width="70%" />
      <Skeleton height={18} width="90%" />
      <Skeleton height={18} width="60%" />
    </div>
  );
}

/** Estructura del sitio público: encabezado con vidrio, contenido y pie de página. */
export default function PublicLayout() {
  const { signedIn, menuOpen, openMenu, closeMenu } = usePublicHeader();
  useScrollToHash();

  return (
    <div className={styles.site}>
      <a href="#contenido" className={styles.skip}>
        Saltar al contenido
      </a>

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brandLink} aria-label="AImargen, ir al inicio">
            <Brand />
          </Link>

          <nav className={styles.nav} aria-label="Sitio">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive && !n.to.includes('#') ? styles.navActive : ''}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.headerActions}>
            {signedIn ? (
              <Link to="/app" className={`${styles.cta} ${styles.ctaPrimary}`}>
                Ir a mi panel
              </Link>
            ) : (
              <>
                <Link to="/login" className={styles.login}>
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className={`${styles.cta} ${styles.ctaPrimary} ${styles.ctaHeader}`}
                >
                  Crear cuenta gratis
                </Link>
              </>
            )}
            <button
              type="button"
              className={styles.menuButton}
              onClick={openMenu}
              aria-label="Abrir menú"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
            >
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onClose={closeMenu} title="Menú">
        <nav className={styles.sheetNav} aria-label="Sitio">
          <Link to="/" className={styles.sheetLink}>
            Inicio
          </Link>
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={styles.sheetLink}>
              {n.label}
              <Icon name="chevronRight" size={18} />
            </Link>
          ))}
          <Link to="/contacto" className={styles.sheetLink}>
            Contacto
            <Icon name="chevronRight" size={18} />
          </Link>
        </nav>
        <div className={styles.sheetActions}>
          {signedIn ? (
            <Link to="/app" className={`${styles.cta} ${styles.ctaPrimary} ${styles.ctaBlock}`}>
              Ir a mi panel
            </Link>
          ) : (
            <>
              <Link
                to="/registro"
                className={`${styles.cta} ${styles.ctaPrimary} ${styles.ctaBlock}`}
              >
                Crear cuenta gratis
              </Link>
              <Link
                to="/login"
                className={`${styles.cta} ${styles.ctaSecondary} ${styles.ctaBlock}`}
              >
                Iniciar sesión
              </Link>
            </>
          )}
        </div>
      </Sheet>

      <main id="contenido" className={styles.main} tabIndex={-1}>
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Brand />
            <p className={styles.footerTagline}>Sepa cuánto cuesta. Sepa cuánto gana.</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.footerMail}>
              <Icon name="mail" size={18} />
              {CONTACT_EMAIL}
            </a>
          </div>
          <nav className={styles.footerCols} aria-label="Pie de página">
            <div>
              <h2 className={styles.footerTitle}>Producto</h2>
              <ul className={styles.footerList}>
                <li>
                  <Link to="/funciones">Funciones</Link>
                </li>
                <li>
                  <Link to="/#como-funciona">Cómo funciona</Link>
                </li>
                <li>
                  <Link to="/precios">Precios</Link>
                </li>
                <li>
                  <Link to="/seguridad">Seguridad</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={styles.footerTitle}>Legal</h2>
              <ul className={styles.footerList}>
                <li>
                  <Link to="/privacidad">Privacidad</Link>
                </li>
                <li>
                  <Link to="/terminos">Términos</Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className={styles.footerTitle}>Cuenta</h2>
              <ul className={styles.footerList}>
                <li>
                  <Link to="/registro">Crear cuenta</Link>
                </li>
                <li>
                  <Link to="/login">Iniciar sesión</Link>
                </li>
                <li>
                  <Link to="/contacto">Contacto</Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>© {currentYear()} AImargen</span>
          <span>Hecho en Costa Rica</span>
        </div>
      </footer>
    </div>
  );
}
