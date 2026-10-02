import { Icon, type IconName } from '../../../core/ui';
import { useSeo } from '../js/use-landing';
import { CtaBand, PageHero } from './Sections';
import styles from '../css/landing.module.css';
import page from '../css/pages.module.css';

const FEATURES: Array<{ icon: IconName; title: string; text: string; points: string[] }> = [
  {
    icon: 'ingredients',
    title: 'Ingredientes e insumos',
    text: 'Su lista de ingredientes, empaques y materiales con el costo por unidad siempre a mano.',
    points: [
      'Registre cómo los compra (saco de 25 kg, caja de 12 unidades, galón) y cómo los usa.',
      'Conversión automática de unidades: kilos, gramos, litros, mililitros y unidades.',
      'Costo unitario calculado a partir del precio y la presentación de compra.',
    ],
  },
  {
    icon: 'suppliers',
    title: 'Compras y proveedores',
    text: 'Cada compra actualiza el costo del ingrediente y queda en el historial.',
    points: [
      'Directorio de proveedores con sus datos de contacto.',
      'Historial de precios por ingrediente para ver qué subió y cuándo.',
      'Capture facturas con una foto y revise las líneas antes de guardarlas.',
    ],
  },
  {
    icon: 'products',
    title: 'Recetas y productos',
    text: 'Arme cada plato, bebida o postre con sus cantidades exactas.',
    points: [
      'Recetas con rendimiento en porciones y porcentaje de merma.',
      'Empaque y mano de obra por producto.',
      'Copie una receta para crear variaciones sin empezar de cero.',
    ],
  },
  {
    icon: 'costs',
    title: 'Costos reales',
    text: 'El costo total y el costo por porción, calculados con los precios de sus últimas compras.',
    points: [
      'Desglose línea por línea: qué ingrediente pesa más en el costo.',
      'Costos indirectos y fijos del negocio incluidos en el cálculo.',
      'Los costos se recalculan cuando cambia el precio de un ingrediente.',
    ],
  },
  {
    icon: 'pulse',
    title: 'Precio inteligente',
    text: 'Obtenga el precio de venta a partir del margen que quiere ganar o de un multiplicador.',
    points: [
      'Precio por margen deseado o por multiplicador del costo.',
      'Compare su precio actual con el precio sugerido.',
      'Aviso claro cuando un precio queda por debajo del costo.',
    ],
  },
  {
    icon: 'trendUp',
    title: 'Margen y utilidad',
    text: 'Sepa cuánto gana de verdad con cada producto que vende.',
    points: [
      'Utilidad por unidad y margen real sobre el precio.',
      'Meta de margen del negocio para detectar productos que quedan cortos.',
      'Barra de margen que muestra de un vistazo cuánto es costo y cuánto ganancia.',
    ],
  },
  {
    icon: 'scenarios',
    title: 'Escenarios',
    text: 'Pruebe cambios antes de hacerlos en su negocio.',
    points: [
      '¿Qué pasa si el pollo sube 15%?',
      '¿Y si vendo 40 unidades al día en lugar de 30?',
      'Compare el resultado con su situación actual.',
    ],
  },
  {
    icon: 'grid',
    title: 'Punto de equilibrio',
    text: 'Cuántas unidades necesita vender para cubrir sus costos fijos del mes.',
    points: [
      'Registre alquiler, salarios, servicios y otros gastos fijos.',
      'Punto de equilibrio en unidades y en ventas.',
      'Explicado en palabras sencillas, sin términos contables.',
    ],
  },
  {
    icon: 'reports',
    title: 'Reportes',
    text: 'Información clara para revisar el negocio o compartirla.',
    points: [
      'Costos, márgenes y precios por producto.',
      'Compras e historial de precios de ingredientes.',
      'Descarga en PDF y Excel.',
    ],
  },
  {
    icon: 'ai',
    title: 'IA AImargen',
    text: 'Un asistente que entiende su negocio y le ahorra trabajo. La IA propone, usted confirma.',
    points: [
      'Pregúntele a su negocio en palabras sencillas.',
      'Facturas por foto y recetas escritas como las diría en la cocina.',
      'No inventa números: consulta sus datos y el motor de cálculo antes de responder.',
    ],
  },
];

export default function FeaturesView() {
  useSeo({
    title: 'Funciones',
    description:
      'Ingredientes, compras, recetas, costo por porción, precio por margen, escenarios, punto de equilibrio, reportes e IA. Todo lo que AImargen hace por su negocio de comida.',
    path: '/funciones',
  });

  return (
    <>
      <PageHero
        eyebrow="Funciones"
        title="Todo lo necesario para ponerle precio a su menú"
        lead="AImargen convierte cálculos complejos en decisiones simples. Estas son las herramientas que tiene a su disposición."
      />

      <section className={styles.section} aria-label="Lista de funciones">
        <div className={styles.container}>
          <ol className={page.featureList}>
            {FEATURES.map((f, i) => (
              <li key={f.title} className={page.feature}>
                <div className={page.featureHead}>
                  <span className={styles.cardIcon}>
                    <Icon name={f.icon} />
                  </span>
                  <span className={`${page.featureNum} num`} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className={styles.cardTitle}>{f.title}</h2>
                <p className={styles.cardText}>{f.text}</p>
                <ul className={page.bullets}>
                  {f.points.map((p) => (
                    <li key={p}>
                      <Icon name="check" size={16} />
                      {p}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
