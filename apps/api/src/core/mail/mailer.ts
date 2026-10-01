import nodemailer from 'nodemailer';
import type { FastifyBaseLogger } from 'fastify';
import type { AppConfig } from '../config/config.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Plantilla, para logs y la bandeja de desarrollo. */
  template: string;
}

export interface Mailer {
  send(msg: MailMessage): Promise<void>;
  /** Solo driver 'log': últimos correos enviados (pruebas y desarrollo). */
  outbox?: MailMessage[];
}

/**
 * Correo transaccional. 'smtp' sirve para cualquier proveedor (Amazon SES, Brevo, Postmark,
 * Resend, Mailgun…). 'log' no envía: guarda en memoria y registra el asunto (desarrollo/pruebas).
 */
export function createMailer(config: AppConfig, log: FastifyBaseLogger): Mailer {
  if (config.MAIL_DRIVER === 'smtp') {
    const transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
    });
    return {
      async send(msg) {
        await transport.sendMail({
          from: config.MAIL_FROM,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
        });
        log.info({ template: msg.template }, 'correo enviado');
      },
    };
  }
  const outbox: MailMessage[] = [];
  return {
    outbox,
    async send(msg) {
      outbox.push(msg);
      if (outbox.length > 200) outbox.shift();
      log.info({ template: msg.template, to: msg.to }, 'correo (driver log, no enviado)');
    },
  };
}
