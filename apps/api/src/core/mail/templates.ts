import type { MailMessage } from './mailer.js';

/**
 * Plantillas de correo en español. Texto plano + HTML simple compatible con clientes de correo.
 */
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function layout(title: string, intro: string, cta: string, url: string, outro: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:20px;font-weight:bold;color:#0a1a3f;padding-bottom:16px">AImargen</td></tr>
<tr><td style="font-size:22px;font-weight:bold;color:#0a1a3f;padding-bottom:12px">${escape(title)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-bottom:24px">${escape(intro)}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${escape(url)}" style="display:inline-block;background:#1f5eff;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:10px">${escape(cta)}</a></td></tr>
<tr><td style="font-size:14px;line-height:1.5;color:#5a667a">${escape(outro)}</td></tr>
<tr><td style="font-size:12px;color:#7d889b;padding-top:24px;word-break:break-all">Si el botón no funciona, copie este enlace: ${escape(url)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function verifyEmailMessage(to: string, name: string, url: string): MailMessage {
  const intro = `Hola ${name}, confirme su correo para activar su cuenta de AImargen.`;
  const outro = 'El enlace vence en 24 horas. Si usted no creó esta cuenta, ignore este correo.';
  return {
    to,
    template: 'verify_email',
    subject: 'Confirme su correo en AImargen',
    text: `${intro}\n\nConfirmar correo: ${url}\n\n${outro}`,
    html: layout('Confirme su correo', intro, 'Confirmar correo', url, outro),
  };
}

export function resetPasswordMessage(to: string, name: string, url: string): MailMessage {
  const intro = `Hola ${name}, recibimos una solicitud para cambiar su contraseña.`;
  const outro =
    'El enlace vence en 1 hora. Si usted no lo pidió, ignore este correo: su contraseña no cambia.';
  return {
    to,
    template: 'reset_password',
    subject: 'Cambie su contraseña de AImargen',
    text: `${intro}\n\nCambiar contraseña: ${url}\n\n${outro}`,
    html: layout('Cambie su contraseña', intro, 'Cambiar contraseña', url, outro),
  };
}

export function inviteMessage(
  to: string,
  name: string,
  business: string,
  url: string,
): MailMessage {
  const intro = `Hola ${name}, le invitaron a usar AImargen en ${business}. Cree su contraseña para entrar.`;
  const outro = 'La invitación vence en 7 días.';
  return {
    to,
    template: 'invite',
    subject: `Invitación a ${business} en AImargen`,
    text: `${intro}\n\nAceptar invitación: ${url}\n\n${outro}`,
    html: layout('Le invitaron a AImargen', intro, 'Aceptar invitación', url, outro),
  };
}
