# Web: estructura de módulos y convenciones

La web es una SPA (React 19 + Vite) que **renderiza todas las vistas en el cliente**; la API solo
entrega JSON. Cada módulo vive en `apps/web/src/modules/<modulo>/` con tres capas y un archivo de rutas:

```
modules/<modulo>/
  views/   Componentes de pantalla (.tsx). Solo presentación: leen el estado del controlador.
  js/      <modulo>.service.ts → "modelo" del cliente: tipos de la API y llamadas HTTP.
           use-<modulo>.ts     → "controlador": estado de pantalla, filtros, validación, mutaciones.
  css/     <modulo>.module.css → estilos del módulo (CSS Modules, solo tokens; sin colores literales).
  routes.tsx                   → rutas del módulo (vistas con React.lazy).
```

Referencia completa: `modules/suppliers` (listado con búsqueda/filtros, detalle, alta/edición, archivar).

## Núcleo compartido (`src/core`)

| Pieza | Uso |
| --- | --- |
| `core/js/api-client.ts` | `api.get/post/put/patch/delete`, `downloadFile`, `fetchObjectUrl`, `qs`, `errorMessage`. Renueva la sesión ante 401 (una sola renovación compartida; maneja 409 `REFRESH_IN_PROGRESS`). Envía `X-Requested-With`. |
| `core/session/js/session-context.ts` | `useSession()` → `me`, `can(perm)`, `feature(flag)`, `logout`, `reload`, `store`, `engine`. `useTenant()` → negocio y moneda. |
| `core/session/views/Guards.tsx` | `RequirePermission` para envolver vistas en `routes.tsx`. |
| `core/data/js/use-entity.ts` | `useLocalList(entity)` / `useLocalItem` leen IndexedDB (sincronizado); `useApi(key, path)` consulta directa; `useEntityMutation({ entities, mutationFn })` hace write-through + sincronización. |
| `core/js/form.ts` | `validate(schema, values)` con los **mismos esquemas zod de la API** (`@aimargen/schemas`), `serverFieldErrors`, `inputToDecimal("1.500,75") → "1500.75"`, `percentInputToFraction("35") → "0.35"`, `fractionToPercentInput`, `formatInputNumber`, `todayIso`. |
| `core/js/format.ts` | `formatMoney(v, currency)` → `₡1.666,67`, `formatPercent(fraction)`, `formatDecimal`, `formatDate`, `formatDateTime`, `unitLabel`. |
| `core/ui` | `Button`, `IconButton`, `TextField`, `NumberField` (kind money/quantity/percent), `SelectField`, `TextAreaField`, `Checkbox`, `Segmented`, `SearchField`, `FormGrid`, `Card`, `List`/`ListRow`, `Stat`/`StatGrid`, `KeyValue`, `DataTable`, `ConfirmSheet`, `Actions`, `Chips`, `Sheet`, `MarginBar`, `Skeleton`, `EmptyState`, `StatusBadge`, `Notice`, `useToast`, `Icon`. |
| `core/shell/views/Page.tsx` | Estructura de pantalla: título, descripción, **una** acción principal, `back` en móvil. |

## Sincronización local (ADR-0007)

Entidades en IndexedDB: `ingredients`, `suppliers`, `products`, `fixed_costs`, `scenarios`,
`ingredient_categories`, `product_categories`. Momentos: al iniciar, write-through tras cada
mutación propia, al volver a la pestaña, cada 60 s visible, al reconectar. Al cerrar sesión se borra.
Detalles con cálculos en vivo (desglose de receta, historial de precios) se piden a la API.

## Reglas

- Montos y cantidades viajan como **string decimal** (`"1500.75"`). La UI nunca calcula costos ni
  márgenes: usa lo que devuelve la API (motor de cálculo único). Para vista previa usar los endpoints
  de cálculo (`/products/preview`, `/pricing/calculate`, `/scenarios/calculate`).
- `tenant_id` nunca se envía; la API lo toma de la sesión.
- Textos en español de Costa Rica, trato de "usted", sin jerga técnica.
- Móvil primero (390 px): objetivos táctiles ≥ 44 px, una acción principal por pantalla,
  `inputMode="decimal"` en números, estados de carga (skeleton), vacío (con acción) y error.
- Estados nunca solo por color: ícono + texto (`StatusBadge`).
- Acciones destructivas con `ConfirmSheet`; confirmaciones con `useToast`.
- Ocultar acciones sin permiso (`can('x.write')`) y proteger rutas con `RequirePermission`.
