import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { Button, Icon, Notice, TextAreaField, TextField } from '../../../core/ui';
import { CONTACT_EMAIL, useContactForm, useSeo } from '../js/use-landing';
import { PageHero } from './Sections';
import styles from '../css/landing.module.css';
import page from '../css/pages.module.css';

export default function ContactView() {
  useSeo({
    title: 'Contacto',
    description:
      '¿Tiene preguntas sobre AImargen? Escríbanos y le responderemos por correo. Costos, precios y márgenes para negocios de comida en Costa Rica.',
    path: '/contacto',
  });
  const form = useContactForm();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <>
      <PageHero
        eyebrow="Contacto"
        title="Hablemos de su negocio"
        lead="¿Tiene una pregunta, una sugerencia o quiere saber si AImargen le sirve? Escríbanos y le responderemos por correo."
      />

      <section className={styles.section}>
        <div className={`${styles.container} ${page.contactGrid}`}>
          <div className={page.formCard}>
            {form.sent ? (
              <div
                className={page.success}
                role="status"
                tabIndex={-1}
                ref={(el) => el?.focus({ preventScroll: false })}
              >
                <span className={page.successIcon}>
                  <Icon name="check" size={28} />
                </span>
                <h2 className={page.formTitle}>¡Mensaje enviado!</h2>
                <p className={styles.cardText}>
                  Gracias por escribirnos. Le responderemos al correo que nos indicó lo antes
                  posible.
                </p>
                <Button variant="secondary" onClick={form.reset}>
                  Enviar otro mensaje
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate aria-labelledby="contact-form-title">
                <div className={page.formFields}>
                  <h2 id="contact-form-title" className={page.formTitle}>
                    Envíenos un mensaje
                  </h2>
                  {form.formError && (
                    <Notice tone="danger" title="No se pudo enviar el mensaje">
                      {form.formError}
                    </Notice>
                  )}
                  <TextField
                    label="Su nombre"
                    name="name"
                    autoComplete="name"
                    value={form.values.name}
                    onChange={(e) => form.set('name', e.target.value)}
                    error={form.errors.name}
                    maxLength={120}
                    required
                  />
                  <TextField
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={form.values.email}
                    onChange={(e) => form.set('email', e.target.value)}
                    error={form.errors.email}
                    hint="Le responderemos a este correo."
                    required
                  />
                  <TextField
                    label="Nombre del negocio (opcional)"
                    name="business"
                    autoComplete="organization"
                    value={form.values.business}
                    onChange={(e) => form.set('business', e.target.value)}
                    error={form.errors.business}
                    maxLength={120}
                  />
                  <TextAreaField
                    label="Mensaje"
                    name="message"
                    rows={5}
                    value={form.values.message}
                    onChange={(e) => form.set('message', e.target.value)}
                    error={form.errors.message}
                    hint="Cuéntenos qué tipo de negocio tiene y en qué le podemos ayudar."
                    maxLength={2000}
                    required
                  />
                  {/* Campo trampa anti-spam: invisible para personas, siempre vacío. */}
                  <div className={page.honeypot} aria-hidden="true">
                    <label htmlFor="contact-website">Sitio web</label>
                    <input
                      id="contact-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.values.website}
                      onChange={(e) => form.set('website', e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="lg" block loading={form.sending} icon="send">
                    Enviar mensaje
                  </Button>
                  <p className={page.privacyNote}>
                    Usaremos sus datos solo para responder su consulta. Más información en nuestra{' '}
                    <Link to="/privacidad">política de privacidad</Link>.
                  </p>
                </div>
              </form>
            )}
          </div>

          <aside className={page.contactAside} aria-label="Otras formas de contacto">
            <p className={page.contactItem}>
              <Icon name="mail" />
              <span>
                <strong>Correo</strong>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </span>
            </p>
            <p className={page.contactItem}>
              <Icon name="history" />
              <span>
                <strong>Respuesta</strong>
                Respondemos por correo en días hábiles.
              </span>
            </p>
            <p className={page.contactItem}>
              <Icon name="building" />
              <span>
                <strong>Hecho en Costa Rica</strong>
                Pensado para negocios de comida costarricenses, en colones y en español.
              </span>
            </p>
            <p className={page.contactItem}>
              <Icon name="ai" />
              <span>
                <strong>¿Ya tiene cuenta?</strong>
                Puede preguntarle al asistente de IA dentro de la aplicación sobre sus costos y
                márgenes.
              </span>
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
