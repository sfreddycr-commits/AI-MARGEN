# ADR-0011 — Design system, shell y navegación por etapas

- **Estado:** Aceptado — 2026-10-01
- **Dirección visual** (SOP §6, §32): claro, azul eléctrico `#1F5EFF` sobre lienzo frío `#F3F6FB`,
  azul profundo `#0A1A3F` para títulos y navegación activa, verde solo para señales positivas.
  Vidrio sutil únicamente en la navegación (sidebar y barra inferior).
- **Elemento distintivo:** la _barra de margen_ (`MarginBar`): costo | margen sobre el precio, con la
  meta marcada. Se usa en todo lugar donde aparece un precio. El isotipo de marca repite esa idea.
  Las proporciones salen del margen calculado por el motor; la UI no calcula.
- **Tipografía:** Inter 4 variable autoalojada (subconjunto latino + ₡, 101 KB) con todas las features.
  `cv08` (I con remates) es obligatoria: sin ella "AImargen" se lee "Almargen".
  Cifras con `tabular-nums`.
- **Componentes** (`apps/web/src/core/ui`): Button/IconButton, TextField/NumberField (teclado decimal,
  formato CR), Sheet (bottom sheet móvil / panel lateral desktop con `<dialog>`), Skeleton, EmptyState,
  StatusBadge y Notice (ícono + texto, nunca solo color), Toast, Icon (íconos propios, offline).
- **Formato numérico** (`core/js/format.ts`): `₡1.666,67`; lectura tolerante de "10.000", "1.500,75", "2,5".
  Es solo presentación; los valores viajan como string decimal con punto.
- **Navegación** (`core/router/navigation.ts`): registro único con `status: 'ready' | 'upcoming'`.
  Producción muestra solo módulos listos (SOP regla 21: sin botones sin función). En desarrollo,
  `VITE_SHOW_UPCOMING=true` muestra los pendientes deshabilitados para revisar el layout.
  Cada etapa pasa su módulo a `ready` al cumplir su gate.
- **Catálogo de componentes** `/app/componentes`: solo en desarrollo; excluido del build de producción.
