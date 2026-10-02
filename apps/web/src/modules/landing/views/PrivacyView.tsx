import { Link } from 'react-router';
import { CONTACT_EMAIL, useSeo } from '../js/use-landing';
import { DraftNotice, LegalDoc, PageHero, type LegalSection } from './Sections';

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

/**
 * Política de privacidad — BORRADOR para Costa Rica (Ley 8968 y su reglamento).
 * Debe revisarla un abogado antes de publicarse como definitiva; los datos del titular
 * (razón social, cédula jurídica, domicilio) están pendientes.
 */
const SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Responsable de la base de datos',
    body: (
      <>
        <p>
          AImargen (en adelante, “AImargen”, “nosotros”) es el responsable de la base de datos en la
          que se almacena la información personal que usted nos entrega al usar el sitio
          aimargen.com y la aplicación AImargen (el “Servicio”).
        </p>
        <p>
          Razón social, cédula jurídica y domicilio del titular: pendientes de completar en la
          revisión legal. Para cualquier consulta sobre privacidad puede escribirnos a {mail}.
        </p>
        <p>
          Esta política se rige por la Ley N.° 8968, Ley de Protección de la Persona frente al
          Tratamiento de sus Datos Personales, y su reglamento.
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Datos que recopilamos',
    body: (
      <>
        <p>Recopilamos solo la información necesaria para prestar el Servicio:</p>
        <ul>
          <li>
            <strong>Datos de la cuenta:</strong> nombre, correo electrónico y contraseña. La
            contraseña se guarda transformada con un algoritmo seguro (Argon2id); nunca en texto
            legible.
          </li>
          <li>
            <strong>Datos del negocio:</strong> nombre, tipo de negocio, país, moneda, zona horaria
            y, si los indica, teléfono y correo del negocio.
          </li>
          <li>
            <strong>Información operativa:</strong> ingredientes, proveedores y sus datos de
            contacto, compras, recetas, productos, precios, costos fijos, escenarios y reportes que
            usted registra.
          </li>
          <li>
            <strong>Archivos:</strong> fotos o documentos de facturas que usted sube para que la IA
            los lea.
          </li>
          <li>
            <strong>Conversaciones con la IA:</strong> las preguntas que hace al asistente y sus
            respuestas.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP, tipo de navegador y dispositivo, fechas
            de acceso y registros de auditoría de las acciones realizadas en la cuenta.
          </li>
          <li>
            <strong>Formulario de contacto:</strong> nombre, correo, nombre del negocio (opcional),
            mensaje y dirección IP.
          </li>
        </ul>
        <p>
          No solicitamos datos sensibles en los términos de la Ley 8968 (por ejemplo, origen racial,
          opiniones políticas, convicciones religiosas, salud u orientación sexual). Le pedimos no
          incluirlos en el Servicio.
        </p>
      </>
    ),
  },
  {
    id: 'finalidades',
    title: 'Para qué usamos sus datos',
    body: (
      <ul>
        <li>Crear y administrar su cuenta y la de su negocio.</li>
        <li>
          Calcular costos, precios, márgenes, escenarios y reportes a partir de la información que
          usted registra.
        </li>
        <li>Prestar las funciones de inteligencia artificial que usted solicite.</li>
        <li>
          Enviarle correos necesarios para el Servicio: verificación de cuenta, recuperación de
          contraseña, invitaciones y avisos importantes.
        </li>
        <li>Responder sus consultas enviadas por el formulario de contacto o por correo.</li>
        <li>
          Proteger el Servicio: prevenir accesos no autorizados, fraude y abuso, y mantener
          registros de auditoría.
        </li>
        <li>Mejorar el Servicio a partir de información agregada que no lo identifica.</li>
      </ul>
    ),
  },
  {
    id: 'consentimiento',
    title: 'Consentimiento',
    body: (
      <>
        <p>
          Al crear una cuenta o enviar el formulario de contacto, usted otorga su consentimiento
          expreso, libre e informado para el tratamiento de sus datos con las finalidades descritas
          en esta política, conforme al artículo 5 de la Ley 8968.
        </p>
        <p>
          Puede revocar su consentimiento en cualquier momento escribiendo a {mail}. La revocación
          no afecta el tratamiento realizado antes de ella, y puede implicar que no podamos seguir
          prestándole el Servicio.
        </p>
      </>
    ),
  },
  {
    id: 'ia',
    title: 'Inteligencia artificial',
    body: (
      <>
        <p>
          Cuando usted usa una función de IA, enviamos a nuestro proveedor de inteligencia
          artificial (actualmente Anthropic) únicamente la información de su negocio necesaria para
          atender esa solicitud. La IA solo puede consultar los datos del negocio de su sesión.
        </p>
        <p>
          Las cifras financieras no las inventa la IA: provienen de sus datos y del motor de cálculo
          de AImargen. La IA propone y usted confirma: ninguna propuesta se guarda sin su revisión y
          aprobación.
        </p>
      </>
    ),
  },
  {
    id: 'compartir',
    title: 'Con quién compartimos sus datos',
    body: (
      <>
        <p>No vendemos ni alquilamos sus datos personales. Solo los compartimos con:</p>
        <ul>
          <li>
            Proveedores que nos ayudan a operar el Servicio (alojamiento, almacenamiento de
            archivos, envío de correos e inteligencia artificial), bajo obligaciones de
            confidencialidad y solo para esos fines.
          </li>
          <li>
            Las personas de su propio negocio a quienes usted invite, según el rol que les asigne.
          </li>
          <li>
            Autoridades competentes, cuando exista una orden o una obligación legal que así lo
            requiera.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'transferencias',
    title: 'Transferencias internacionales',
    body: (
      <p>
        Algunos de nuestros proveedores pueden estar ubicados fuera de Costa Rica. En esos casos
        procuramos que ofrezcan un nivel de protección adecuado y que traten la información solo
        para prestarnos sus servicios.
      </p>
    ),
  },
  {
    id: 'conservacion',
    title: 'Cuánto tiempo conservamos los datos',
    body: (
      <p>
        Conservamos sus datos mientras su cuenta esté activa. Si solicita cerrar su cuenta,
        eliminaremos o anonimizaremos la información en un plazo razonable, salvo la que debamos
        conservar por obligación legal o para la defensa de reclamos. Los respaldos se eliminan
        conforme a su ciclo de rotación. Los mensajes del formulario de contacto se conservan solo
        el tiempo necesario para atender la consulta.
      </p>
    ),
  },
  {
    id: 'seguridad',
    title: 'Seguridad',
    body: (
      <p>
        Aplicamos medidas técnicas y organizativas para proteger su información: contraseñas
        transformadas con Argon2id, sesiones en cookies cifradas, aislamiento entre negocios, roles
        y permisos, registros de auditoría, respaldos diarios y conexión cifrada (HTTPS). Puede ver
        el detalle en nuestra <Link to="/seguridad">página de seguridad</Link>.
      </p>
    ),
  },
  {
    id: 'derechos',
    title: 'Sus derechos',
    body: (
      <>
        <p>Conforme a la Ley 8968, usted tiene derecho a:</p>
        <ul>
          <li>
            <strong>Acceso:</strong> saber qué datos suyos tenemos y cómo los usamos.
          </li>
          <li>
            <strong>Rectificación:</strong> corregir datos inexactos o incompletos.
          </li>
          <li>
            <strong>Supresión:</strong> pedir que eliminemos sus datos cuando ya no sean necesarios
            o cuando su tratamiento no se ajuste a la ley.
          </li>
          <li>
            <strong>Revocación del consentimiento:</strong> retirar su autorización en cualquier
            momento.
          </li>
        </ul>
        <p>
          Para ejercerlos, escríbanos a {mail} desde el correo de su cuenta e indique su solicitud.
          Responderemos dentro de los plazos que establece la ley. La gestión es gratuita.
        </p>
        <p>
          Si considera que no atendimos su solicitud adecuadamente, puede acudir a la Agencia de
          Protección de Datos de los Habitantes (PRODHAB).
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies y almacenamiento en su dispositivo',
    body: (
      <p>
        Usamos únicamente cookies necesarias para mantener su sesión iniciada de forma segura. Para
        que la aplicación funcione más rápido y con conexión inestable, guardamos una copia de
        trabajo de los datos de su negocio en el almacenamiento del navegador; esa copia se borra al
        cerrar la sesión. No usamos cookies de publicidad.
      </p>
    ),
  },
  {
    id: 'terceros',
    title: 'Datos de terceros que usted registra',
    body: (
      <p>
        Si registra datos de otras personas —por ejemplo, el contacto de un proveedor o el nombre de
        un colaborador al que invita— usted declara que tiene autorización para hacerlo y que les
        informará sobre este tratamiento.
      </p>
    ),
  },
  {
    id: 'menores',
    title: 'Personas menores de edad',
    body: (
      <p>
        El Servicio está dirigido a personas mayores de 18 años que administran o trabajan en un
        negocio. No recopilamos a sabiendas datos de personas menores de edad.
      </p>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios a esta política',
    body: (
      <p>
        Podemos actualizar esta política. Si los cambios son importantes, se lo avisaremos por
        correo o dentro de la aplicación antes de que entren en vigor. La fecha de la última
        actualización aparece al inicio del documento.
      </p>
    ),
  },
  {
    id: 'contacto',
    title: 'Contacto',
    body: (
      <p>
        Para cualquier consulta sobre esta política o sobre sus datos, escríbanos a {mail} o use
        nuestro <Link to="/contacto">formulario de contacto</Link>.
      </p>
    ),
  },
];

export default function PrivacyView() {
  useSeo({
    title: 'Política de privacidad',
    description:
      'Cómo AImargen recopila, usa y protege los datos personales, conforme a la Ley 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica.',
    path: '/privacidad',
  });

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Política de privacidad"
        lead="Qué datos recopilamos, para qué los usamos y cómo puede ejercer sus derechos."
      >
        <DraftNotice />
      </PageHero>
      <LegalDoc updated="2 de octubre de 2026" sections={SECTIONS} />
    </>
  );
}
