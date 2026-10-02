import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { contactInput } from '@aimargen/schemas';
import { errorMessage } from '../../../core/js/api-client';
import { serverFieldErrors, validate, type FieldErrors } from '../../../core/js/form';
import { useSession } from '../../../core/session/js/session-context';
import { landingService, type ContactPayload, type ContactResult } from './landing.service';

/** Controlador del sitio público: SEO por página, menú móvil, sesión y formulario de contacto. */

export const SITE_ORIGIN = 'https://aimargen.com';
export const CONTACT_EMAIL = 'contacto@aimargen.com';

interface SeoOptions {
  /** Título de la página (sin la marca). */
  title: string;
  description: string;
  /** Ruta canónica, ej. "/precios". */
  path: string;
  /** La portada usa el título completo, sin el sufijo "| AImargen". */
  rawTitle?: boolean;
  /** Datos estructurados (schema.org) de la página, ej. FAQPage. */
  jsonLd?: Record<string, unknown>;
}

const JSON_LD_ID = 'page-jsonld';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Actualiza título, descripción, Open Graph, Twitter y URL canónica de la página pública. */
export function useSeo({ title, description, path, rawTitle = false, jsonLd }: SeoOptions) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null;
  useEffect(() => {
    document.getElementById(JSON_LD_ID)?.remove();
    if (!ld) return;
    const script = document.createElement('script');
    script.id = JSON_LD_ID;
    script.type = 'application/ld+json';
    script.textContent = ld;
    document.head.appendChild(script);
    return () => script.remove();
  }, [ld]);

  useEffect(() => {
    const fullTitle = rawTitle ? title : `${title} | AImargen`;
    const url = `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
    document.title = fullTitle;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:locale', 'es_CR');
    setMeta('name', 'twitter:description', description);
    setCanonical(url);
    // Al salir del sitio público (ej. a /app) no se deja una URL canónica que no corresponde.
    return () => document.head.querySelector('link[rel="canonical"]')?.remove();
  }, [title, description, path, rawTitle]);
}

/** Estado del encabezado público: menú móvil y acceso según la sesión. */
export function usePublicHeader() {
  const { me, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname + location.hash);
  // Al navegar se cierra el menú (ajuste de estado durante el render, sin efecto).
  const current = location.pathname + location.hash;
  if (current !== lastPath) {
    setLastPath(current);
    if (menuOpen) setMenuOpen(false);
  }
  return {
    signedIn: status === 'authenticated' && !!me,
    menuOpen,
    openMenu: () => setMenuOpen(true),
    closeMenu: () => setMenuOpen(false),
  };
}

/** Lleva al inicio al cambiar de página, o a la sección indicada por el ancla (#como-funciona). */
export function useScrollToHash() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}

export interface ContactFormValues {
  name: string;
  email: string;
  business: string;
  message: string;
  /** Campo trampa: oculto y siempre vacío para personas reales. */
  website: string;
}

const emptyContact: ContactFormValues = {
  name: '',
  email: '',
  business: '',
  message: '',
  website: '',
};

export function useContactForm() {
  const [values, setValues] = useState<ContactFormValues>(emptyContact);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useMutation<ContactResult, Error, ContactPayload>({
    mutationFn: (input) => landingService.sendContact(input),
  });

  const set = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = () => {
    setFormError(null);
    const v = validate(contactInput, {
      name: values.name,
      email: values.email,
      business: values.business.trim() || null,
      message: values.message,
      website: values.website || undefined,
    });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) setErrors(fields);
        else setFormError(errorMessage(e));
      },
    });
  };

  const reset = () => {
    setValues(emptyContact);
    setErrors({});
    setFormError(null);
    mutation.reset();
  };

  return {
    values,
    set,
    errors,
    formError,
    submit,
    reset,
    sending: mutation.isPending,
    sent: mutation.isSuccess,
  };
}

/** Año actual para el pie de página. */
export function currentYear(): number {
  return new Date().getFullYear();
}
