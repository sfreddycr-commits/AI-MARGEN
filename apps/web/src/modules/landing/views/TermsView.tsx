import { Link } from 'react-router';
import { CONTACT_EMAIL, useSeo } from '../js/use-landing';
import { DraftNotice, LegalDoc, PageHero, type LegalSection } from './Sections';

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

/**
 * Términos y condiciones — BORRADOR para Costa Rica. Debe revisarlos un abogado antes de
 * publicarse como definitivos; los datos del titular están pendientes.
 */
const SECTIONS: LegalSection[] = [
  {
    id: 'aceptacion',
    title: 'Aceptación',
    body: (
      <>
        <p>
          Estos términos regulan el uso del sitio aimargen.com y de la aplicación AImargen (el
          “Servicio”), operado por AImargen (razón social, cédula jurídica y domicilio pendientes de
          completar en la revisión legal).
        </p>
        <p>
          Al crear una cuenta o usar el Servicio, usted acepta estos términos y nuestra{' '}
          <Link to="/privacidad">política de privacidad</Link>. Si actúa en nombre de un negocio,
          declara que tiene autorización para aceptarlos en su nombre.
        </p>
      </>
    ),
  },
  {
    id: 'servicio',
    title: 'Qué es AImargen',
    body: (
      <p>
        AImargen es una herramienta en línea para que negocios de alimentos registren ingredientes,
        compras, proveedores y recetas, y calculen costos, precios sugeridos, márgenes, utilidad,
        escenarios y punto de equilibrio. Incluye funciones de inteligencia artificial que ayudan a
        capturar información y a interpretar los resultados.
      </p>
    ),
  },
  {
    id: 'cuenta',
    title: 'Su cuenta',
    body: (
      <ul>
        <li>Debe ser mayor de 18 años y brindar información veraz y actualizada.</li>
        <li>
          Es responsable de mantener la confidencialidad de su contraseña y de toda actividad
          realizada desde su cuenta.
        </li>
        <li>Debe avisarnos de inmediato a {mail} si sospecha de un acceso no autorizado.</li>
      </ul>
    ),
  },
  {
    id: 'equipo',
    title: 'Su negocio y su equipo',
    body: (
      <p>
        La persona que crea el negocio en AImargen es su propietaria dentro del Servicio. Puede
        invitar a otras personas y asignarles roles con distintos permisos. El propietario es
        responsable de las personas que invita y de los permisos que les otorga, y de retirar el
        acceso a quienes ya no deban tenerlo.
      </p>
    ),
  },
  {
    id: 'uso',
    title: 'Uso aceptable',
    body: (
      <>
        <p>Usted se compromete a no:</p>
        <ul>
          <li>Usar el Servicio para fines ilícitos o contrarios a estos términos.</li>
          <li>
            Intentar acceder a información de otros negocios, a cuentas ajenas o a partes del
            sistema para las que no tiene permiso.
          </li>
          <li>
            Interferir con el funcionamiento del Servicio, sobrecargarlo de forma intencional o
            evadir sus medidas de seguridad.
          </li>
          <li>
            Subir archivos con software malicioso o contenido que infrinja derechos de terceros.
          </li>
          <li>Revender o sublicenciar el Servicio sin nuestra autorización por escrito.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Sus datos',
    body: (
      <p>
        La información que usted registra en AImargen le pertenece. Nos otorga únicamente el permiso
        necesario para almacenarla, procesarla y mostrarla con el fin de prestarle el Servicio.
        Puede descargar reportes en cualquier momento y solicitarnos una copia de la información de
        su negocio. El tratamiento de datos personales se rige por la{' '}
        <Link to="/privacidad">política de privacidad</Link>.
      </p>
    ),
  },
  {
    id: 'calculos',
    title: 'Cálculos y decisiones',
    body: (
      <>
        <p>
          AImargen calcula a partir de la información que usted ingresa. La exactitud de los
          resultados depende de que esa información (precios, cantidades, mermas, costos fijos) sea
          correcta y esté actualizada.
        </p>
        <p>
          Los resultados son una herramienta de apoyo para decidir y no constituyen asesoría
          contable, tributaria, financiera ni legal. Las decisiones de precios y de su negocio son
          suyas.
        </p>
      </>
    ),
  },
  {
    id: 'ia',
    title: 'Inteligencia artificial',
    body: (
      <p>
        Las funciones de IA pueden interpretar mal una foto o un texto. Por eso la IA propone y
        usted confirma: nada se guarda sin su revisión. Las cifras financieras provienen siempre del
        motor de cálculo de AImargen y de sus datos, no de la IA. Usted es responsable de revisar
        las propuestas antes de aceptarlas.
      </p>
    ),
  },
  {
    id: 'precios',
    title: 'Planes y precios',
    body: (
      <>
        <p>
          Los planes y precios del Servicio están por definir. Mientras tanto, puede usar AImargen
          sin costo y sin registrar un medio de pago.
        </p>
        <p>
          Cuando se definan los planes, los publicaremos en la{' '}
          <Link to="/precios">página de precios</Link> y le avisaremos con anticipación. Ningún
          cobro se aplicará sin su aceptación expresa. Los precios incluirán o indicarán los
          impuestos aplicables, como el impuesto al valor agregado.
        </p>
      </>
    ),
  },
  {
    id: 'disponibilidad',
    title: 'Disponibilidad y cambios del Servicio',
    body: (
      <p>
        Trabajamos para que el Servicio esté disponible de forma continua, pero puede haber
        interrupciones por mantenimiento, fallas de terceros o causas fuera de nuestro control.
        Podemos mejorar, modificar o retirar funciones; si un cambio afecta de forma importante su
        uso, se lo informaremos con anticipación razonable.
      </p>
    ),
  },
  {
    id: 'propiedad',
    title: 'Propiedad intelectual',
    body: (
      <p>
        El software, la marca AImargen, el diseño y los contenidos del Servicio pertenecen a
        AImargen o a sus licenciantes. Estos términos no le otorgan ningún derecho sobre ellos,
        salvo el de usar el Servicio conforme a lo aquí establecido.
      </p>
    ),
  },
  {
    id: 'terminacion',
    title: 'Suspensión y cierre de la cuenta',
    body: (
      <>
        <p>
          Puede dejar de usar el Servicio y solicitar el cierre de su cuenta en cualquier momento
          escribiendo a {mail}.
        </p>
        <p>
          Podemos suspender o cerrar una cuenta que incumpla estos términos o ponga en riesgo la
          seguridad del Servicio o de otros usuarios. Salvo casos graves o urgentes, le avisaremos
          antes y le daremos oportunidad de descargar su información.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilidad',
    title: 'Limitación de responsabilidad',
    body: (
      <p>
        En la medida permitida por la ley, AImargen no será responsable por pérdidas de ganancias o
        daños indirectos derivados de decisiones tomadas con base en información incorrecta o
        incompleta ingresada en el Servicio, ni por interrupciones causadas por terceros o por
        fuerza mayor. Nada en estos términos limita los derechos que le correspondan como consumidor
        según la Ley N.° 7472, Ley de Promoción de la Competencia y Defensa Efectiva del Consumidor.
      </p>
    ),
  },
  {
    id: 'ley',
    title: 'Ley aplicable y jurisdicción',
    body: (
      <p>
        Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier controversia
        se someterá a los tribunales competentes de Costa Rica, sin perjuicio de los mecanismos de
        resolución de conflictos que la ley ponga a su disposición como consumidor.
      </p>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios a estos términos',
    body: (
      <p>
        Podemos actualizar estos términos. Si los cambios son importantes, se lo avisaremos por
        correo o dentro de la aplicación antes de que entren en vigor. Si continúa usando el
        Servicio después de esa fecha, se entenderá que acepta la nueva versión.
      </p>
    ),
  },
  {
    id: 'contacto',
    title: 'Contacto',
    body: (
      <p>
        Para consultas sobre estos términos, escríbanos a {mail} o use nuestro{' '}
        <Link to="/contacto">formulario de contacto</Link>.
      </p>
    ),
  },
];

export default function TermsView() {
  useSeo({
    title: 'Términos y condiciones',
    description:
      'Condiciones de uso de AImargen, la herramienta de costos, precios y márgenes para negocios de comida en Costa Rica.',
    path: '/terminos',
  });

  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Términos y condiciones"
        lead="Las reglas para usar AImargen, explicadas de la forma más clara posible."
      >
        <DraftNotice />
      </PageHero>
      <LegalDoc updated="2 de octubre de 2026" sections={SECTIONS} />
    </>
  );
}
