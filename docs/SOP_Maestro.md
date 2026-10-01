# AImargen.com — SOP Maestro de Desarrollo Full-Stack

**Versión:** 1.0  
**Fecha base:** 2026-10-01  
**Producto:** AImargen.com  
**Tipo de producto:** SaaS multi-tenant para costos, precios, márgenes y rentabilidad de negocios de alimentos  
**Stack obligatorio:** React + Node.js + MySQL 8 + PWA mobile-first  
**Idioma inicial:** Español  
**Moneda predeterminada:** CRC / ₡  
**Objetivo de este documento:** ser la especificación principal y el SOP de construcción para un agente de inteligencia artificial de desarrollo, desde repositorio vacío hasta producción.

---

# 0. ORDEN MAESTRA PARA EL AGENTE DE DESARROLLO

Actúa como **arquitecto de software, diseñador UX/UI, desarrollador full-stack senior, especialista en seguridad, QA, DevOps y producto**.

Construye **AImargen.com** desde cero hasta producción siguiendo este documento como fuente de verdad.

No construyas un mockup. No entregues únicamente pantallas estáticas. Debes entregar una aplicación **realmente funcional, persistente, multi-tenant, segura, probada, mobile-first y lista para despliegue**.

## Reglas no negociables

1. Construir por etapas.
2. No avanzar dejando errores críticos abiertos.
3. Cada etapa debe terminar con implementación, pruebas, correcciones, evidencia, documentación breve y verificación de regresión.
4. Nunca duplicar fórmulas financieras o de costos en la UI.
5. Todas las fórmulas viven en un **motor de cálculo único y reutilizable**.
6. La IA **no inventa costos, precios, márgenes, compras ni cantidades**.
7. La IA debe consultar herramientas o servicios internos antes de responder sobre datos del negocio.
8. Todo dato de negocio debe pertenecer obligatoriamente a un `tenant_id`.
9. Ningún usuario de un tenant puede leer o modificar datos de otro tenant.
10. Toda operación sensible debe tener auditoría.
11. El diseño es mobile-first.
12. En móvil debe sentirse como una **app nativa**, no como un sitio web reducido.
13. Debe funcionar como PWA instalable.
14. Los formularios deben ser cortos y claros.
15. Los mensajes de error deben estar en español.
16. No aceptar valores negativos cuando no tengan sentido.
17. No permitir división entre cero.
18. No guardar contraseñas en texto plano.
19. No borrar historial que afecte trazabilidad.
20. No exponer secretos en frontend, logs o repositorio.
21. No dejar botones sin función.
22. No usar datos falsos en producción.
23. Mantener separación estricta entre UI, lógica de negocio, persistencia e IA.
24. La solución debe ser económica, mantenible y preparada para crecer.
25. No convertir AImargen en un POS. **AImargen es una plataforma de costos, precios, márgenes y rentabilidad.**

---

# 1. VISIÓN DEL PRODUCTO

AImargen.com es una aplicación SaaS extremadamente sencilla para que restaurantes, sodas, cafeterías, panaderías, reposterías y otros pequeños negocios de alimentos puedan:

- registrar ingredientes e insumos;
- registrar compras y proveedores;
- conservar historial de precios;
- construir recetas y productos;
- calcular costos reales;
- calcular costo por porción;
- incorporar empaque;
- incorporar mano de obra;
- incorporar costos indirectos;
- incorporar merma;
- definir precio por margen;
- definir precio por multiplicador;
- conocer utilidad real;
- conocer margen real;
- simular escenarios;
- calcular punto de equilibrio;
- recibir alertas;
- generar reportes;
- exportar y respaldar datos;
- recibir asistencia inteligente mediante IA.

La aplicación debe permitir que una persona sin conocimientos contables pueda entender:

> cuánto cuesta realmente lo que vende, cuánto debería cobrar y cuánto gana.

---

# 2. PROPUESTA DE VALOR

## Mensaje principal

**Sepa cuánto cuesta. Sepa cuánto gana.**

## Mensajes secundarios

- Costos reales.
- Precios inteligentes.
- Margen y utilidad.
- Escenarios y punto de equilibrio.
- Reportes claros.
- Decisiones basadas en datos reales.

## Posicionamiento

AImargen no es un sistema contable pesado.

Debe sentirse como una herramienta moderna que convierte cálculos complejos en decisiones simples.

---

# 3. ALCANCE DEL PRODUCTO

## Incluido

- Landing page pública.
- Registro.
- Inicio de sesión.
- Recuperación de contraseña.
- Verificación de correo.
- Onboarding inicial.
- Multi-tenancy.
- Dashboard del tenant.
- Dashboard del administrador global.
- Gestión de usuarios.
- Gestión de roles.
- Ingredientes.
- Unidades.
- Conversiones.
- Compras.
- Proveedores.
- Historial.
- Recetas.
- Productos.
- Porciones.
- Merma.
- Empaque.
- Mano de obra.
- Costos indirectos.
- Costos totales.
- Precio por margen.
- Precio por multiplicador.
- Utilidad.
- Margen real.
- Escenarios.
- Costos fijos.
- Costos variables.
- Punto de equilibrio.
- Dashboard.
- Alertas.
- Reportes.
- Exportación.
- Respaldo.
- PWA.
- Modo instalable.
- IA asistente.
- Lectura inteligente de facturas.
- Creación asistida de recetas.
- Recomendaciones de margen y precio.
- Preguntas conversacionales sobre datos del tenant.
- Auditoría.
- Logs.
- Seguridad.
- QA.
- CI/CD.
- Despliegue.

## Fuera de alcance de la primera versión

- POS.
- Caja.
- Facturación electrónica.
- Control de mesas.
- Delivery.
- Pedidos.
- Inventario transaccional tipo ERP.
- Nómina.
- Contabilidad fiscal.
- Marketplace.
- Ventas reales en tiempo real, salvo futura integración externa.
- Recomendaciones basadas en ventas reales si no existe una fuente de ventas.

---

# 4. ARQUITECTURA GENERAL

## Frontend

- React.
- TypeScript.
- Vite.
- React Router.
- TanStack Query.
- Zustand o Context únicamente para estado global ligero.
- React Hook Form.
- Zod.
- Tailwind CSS.
- Componentes reutilizables.
- PWA.
- Service Worker.
- IndexedDB para cache/offline controlado.
- Diseño responsive mobile-first.

## Backend

- Node.js.
- TypeScript.
- Framework recomendado: Fastify o NestJS.
- API REST versionada `/api/v1`.
- Validación de entrada con Zod, Valibot o esquema equivalente.
- OpenAPI.
- Arquitectura modular.
- Servicios separados para autenticación, tenants, usuarios, ingredientes, compras, proveedores, recetas, precios, escenarios, reportes, IA y auditoría.

## Base de datos

- MySQL 8.
- Migraciones versionadas.
- Foreign keys.
- Índices.
- Campos de auditoría.
- Soft delete cuando corresponda.
- Restricción obligatoria por `tenant_id`.

## Infraestructura opcional recomendada

- Redis para rate limiting, caché, colas, sesiones si se requieren y jobs.
- S3-compatible storage para facturas, PDFs, exportaciones y backups lógicos.
- BullMQ o sistema de jobs equivalente.

---

# 5. MODELO MULTI-TENANT

## Entidades principales

### Tenant

Representa un negocio.

Campos mínimos:

- `id`
- `uuid`
- `name`
- `slug`
- `legal_name`
- `email`
- `phone`
- `country`
- `currency`
- `timezone`
- `status`
- `plan`
- `created_at`
- `updated_at`

### Usuario

- `id`
- `uuid`
- `tenant_id`
- `name`
- `email`
- `password_hash`
- `role_id`
- `status`
- `email_verified_at`
- `last_login_at`
- `created_at`
- `updated_at`

### Roles base

- `super_admin`
- `tenant_owner`
- `tenant_admin`
- `manager`
- `operator`
- `viewer`

## Reglas de aislamiento

Toda tabla de datos operativos debe tener `tenant_id`.

Nunca aceptar un `tenant_id` del frontend como fuente de autoridad.

El backend debe obtener el tenant desde sesión, JWT, API key o contexto autenticado.

Toda consulta debe filtrar por tenant.

Agregar pruebas automáticas que intenten leer, editar o borrar datos de otro tenant, adivinar UUIDs o cambiar `tenant_id` manualmente. Todas deben fallar.

---

# 6. LANDING PAGE PÚBLICA

Ruta: `/`

## Objetivo

Convertir visitantes en registros.

## Estilo

- tema claro;
- premium;
- limpio;
- blanco;
- azul eléctrico;
- gris muy claro;
- glassmorphism sutil;
- bordes redondeados;
- sombras ligeras;
- tipografía Inter o equivalente;
- fotografías realistas de negocios gastronómicos;
- sin apariencia de ERP antiguo.

## Header

Logo AImargen.

Navegación:

- Inicio
- Funcionalidades
- Cómo funciona
- Beneficios
- Precios
- Preguntas
- Ingresar

CTA: **Comenzar ahora**

## Hero

Headline:

**Sepa cuánto cuesta.  
Sepa cuánto gana.**

Subheadline:

> Calcule el costo real de sus recetas, defina precios rentables y tome mejores decisiones sin complicarse con contabilidad.

CTAs:

- **Probar gratis**
- **Ver cómo funciona**

Mostrar mockup desktop y móvil.

Indicadores visuales:

- costo por porción;
- precio sugerido;
- utilidad;
- margen.

## Sección problema

Título: **¿Está seguro de cuánto gana con cada producto?**

Problemas:

- ingredientes que suben de precio;
- merma ignorada;
- empaque olvidado;
- mano de obra no calculada;
- precio fijado “a ojo”;
- margen confundido con multiplicador.

## Sección funcionalidades

1. Ingredientes e insumos.
2. Compras y proveedores.
3. Recetas y productos.
4. Costos reales.
5. Precio inteligente.
6. Margen y utilidad.
7. Escenarios.
8. Punto de equilibrio.
9. Reportes.
10. IA AImargen.

## Sección “Cómo funciona”

1. Registre lo que compra.
2. Construya su receta.
3. AImargen calcula el costo real.
4. Elija el margen deseado.
5. Obtenga precio, utilidad y escenarios.

## Sección IA

Título: **Pregúntele a su negocio.**

Ejemplos:

- “¿Cuál producto tiene menor margen?”
- “¿Qué ingrediente subió más?”
- “¿A qué precio debo vender para ganar 45%?”
- “¿Qué pasa si vendo 40 unidades al día?”
- “¿Qué productos debo revisar esta semana?”

Aclaración:

> La IA no inventa sus números. Consulta los datos y el motor de cálculo de AImargen antes de responder.

## Sección negocios

- restaurantes;
- sodas;
- cafeterías;
- panaderías;
- reposterías;
- food trucks;
- catering;
- emprendimientos gastronómicos.

## Sección CTA

**Más control. Más utilidad. Un negocio más rentable.**

Botón: **Comenzar ahora**

Texto: **Prueba gratuita · Sin tarjeta de crédito** si el modelo comercial finalmente lo permite.

## Footer

- Producto
- Funcionalidades
- Precios
- Seguridad
- Privacidad
- Términos
- Contacto
- Login

---

# 7. AUTENTICACIÓN

## Rutas

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`

## Login

Branding: **AImargen**

Claim: **Sepa cuánto cuesta. Sepa cuánto gana.**

Campos:

- correo;
- contraseña;
- mostrar/ocultar contraseña;
- recordarme.

Acciones:

- ingresar;
- recuperar contraseña;
- ir a registro.

Estados:

- loading;
- error de credenciales;
- cuenta bloqueada;
- correo no verificado;
- error de red.

Nunca revelar si una cuenta existe durante recuperación de contraseña.

---

# 8. REGISTRO Y ONBOARDING

## Registro

Campos mínimos:

- nombre;
- correo;
- contraseña;
- confirmar contraseña.

## Onboarding

### Paso 1 — Negocio

- nombre;
- tipo de negocio;
- país;
- moneda;
- zona horaria.

### Paso 2 — Configuración base

- margen objetivo predeterminado;
- días operativos;
- costos fijos opcionales.

### Paso 3 — Primer ingrediente

Guía simple.

### Paso 4 — Primera receta

Guía simple.

### Paso 5 — Resultado

Mostrar costo y precio sugerido.

Objetivo: el usuario debe llegar a un resultado útil en pocos minutos.

---

# 9. SHELL DE LA APLICACIÓN

Rutas autenticadas: `/app/...`

## Desktop

Sidebar:

- Inicio
- Ingredientes
- Compras
- Proveedores
- Productos y recetas
- Precio y margen
- Escenarios
- Reportes
- AImargen AI
- Configuración

## Mobile

Bottom navigation primaria:

- Inicio
- Productos
- Costos
- IA
- Más

El resto va en una vista “Más”.

## Reglas mobile native feel

- navegación inferior fija;
- gestos naturales;
- sheets;
- drawers;
- modales tipo bottom-sheet;
- botones grandes;
- estados skeleton;
- feedback háptico cuando sea soportado;
- safe areas;
- evitar tablas horizontales;
- cards;
- pull-to-refresh si aplica;
- inputs optimizados;
- teclado numérico para montos;
- no depender de hover;
- targets táctiles de mínimo 44 px;
- transiciones cortas;
- navegación instantánea;
- soporte offline parcial.

---

# 10. DASHBOARD DEL TENANT

Ruta: `/app`

## KPIs

- cantidad de productos;
- productos sin precio;
- productos bajo margen objetivo;
- costo promedio;
- utilidad estimada del escenario activo;
- punto de equilibrio.

## Secciones

### Alertas

- ingredientes sin costo;
- recetas incompletas;
- precios por debajo del costo;
- margen debajo del objetivo;
- aumentos importantes de costo;
- productos que requieren revisión.

### Accesos rápidos

- Nuevo ingrediente
- Registrar compra
- Nueva receta
- Nuevo escenario
- Preguntar a AImargen
- Crear reporte

### Insights IA

Ejemplos:

> “3 productos bajaron de su margen objetivo.”

> “El queso mozzarella aumentó 12% en los últimos 30 días.”

> “Revisar el precio de Cheesecake podría recuperar su margen objetivo.”

---

# 11. DASHBOARD ADMINISTRATIVO GLOBAL

Ruta protegida: `/admin`

Solo `super_admin`.

## Módulos

### Tenants

- listar;
- buscar;
- filtrar;
- crear;
- activar;
- suspender;
- ver detalle;
- ver plan;
- ver uso;
- ver última actividad.

### Usuarios globales

- localizar usuario;
- tenant;
- rol;
- estado;
- actividad.

### Métricas SaaS

- tenants activos;
- usuarios activos;
- nuevos registros;
- uso de IA;
- almacenamiento;
- exportaciones;
- errores;
- jobs fallidos.

### Seguridad

- auditoría;
- intentos fallidos;
- sesiones;
- bloqueos;
- eventos sospechosos.

### IA

- consumo por tenant;
- tokens;
- costo;
- acciones;
- errores;
- tool calls.

### Feature flags

Permitir activar funciones por tenant.

---

# 12. INGREDIENTES E INSUMOS

Ruta: `/app/ingredients`

Campos:

- nombre;
- categoría;
- unidad de compra;
- cantidad;
- precio;
- fecha;
- proveedor;
- rendimiento;
- merma;
- costo unitario;
- estado.

Unidades mínimas:

- g
- kg
- ml
- l
- unidad

Conversiones:

- 1 kg = 1000 g
- 1 l = 1000 ml

No convertir unidades incompatibles sin factor definido.

Funciones:

- crear;
- editar;
- archivar;
- buscar;
- filtrar;
- historial de costo;
- última compra;
- proveedor actual.

---

# 13. PROVEEDORES

Ruta: `/app/suppliers`

Campos:

- nombre;
- contacto;
- teléfono;
- email;
- notas;
- estado.

Funciones:

- crear;
- editar;
- archivar;
- ver compras;
- ver historial de precios.

---

# 14. COMPRAS

Ruta: `/app/purchases`

Registrar:

- ingrediente;
- proveedor;
- cantidad;
- unidad;
- precio;
- fecha.

Regla: una nueva compra puede actualizar el costo vigente del ingrediente, pero nunca debe destruir el historial.

---

# 15. RECETAS Y PRODUCTOS

Ruta: `/app/products`

Campos:

- nombre;
- categoría;
- porciones;
- ingredientes;
- cantidades;
- empaque;
- mano de obra;
- indirectos;
- merma;
- precio actual;
- margen objetivo.

Funciones:

- crear;
- editar;
- duplicar;
- archivar;
- buscar;
- filtrar.

Cada producto debe mostrar inmediatamente:

- costo total;
- costo por porción;
- precio;
- utilidad;
- margen.

Duplicar receta debe crear una copia independiente.

---

# 16. MOTOR DE CÁLCULO

Crear paquete o módulo aislado: `packages/calculation-engine` o equivalente.

No depender de React.

No depender directamente de HTTP.

Debe ser testeable como librería pura.

## Fórmulas base

### Costo unitario

`precio_compra / cantidad_comprada`

### Costo utilizado

`cantidad_utilizada × costo_unitario`

### Costo base

`suma de ingredientes`

### Costo total

`ingredientes + empaque + mano_obra + indirectos + merma`

### Costo por porción

`costo_total / porciones`

### Precio por margen

`costo / (1 - margen)`

### Precio por multiplicador

`costo × multiplicador`

### Utilidad

`precio - costo`

### Margen real

`utilidad / precio`

### Punto de equilibrio

`costos_fijos / (precio - costo_variable_unitario)`

## Reglas

- usar Decimal, no floating point financiero simple;
- redondeo configurable;
- no división entre cero;
- validar margen;
- soportar moneda;
- retornar desglose;
- retornar warnings.

---

# 17. PRECIO Y RENTABILIDAD

Ruta: `/app/pricing`

Mostrar:

- precio actual;
- margen actual;
- margen objetivo;
- precio calculado por margen;
- multiplicador;
- precio calculado por multiplicador;
- utilidad por unidad;
- margen real;
- diferencia entre precio actual y recomendado.

Debe explicar visualmente: **margen ≠ multiplicador**.

---

# 18. ESCENARIOS

Ruta: `/app/scenarios`

Campos:

- nombre;
- precio;
- unidades/día;
- días/mes;
- costos fijos;
- costo variable unitario.

Resultados:

- ingresos estimados;
- costos estimados;
- utilidad estimada;
- punto de equilibrio en unidades;
- punto de equilibrio en dinero.

Regla: un escenario nunca modifica receta ni precio base.

---

# 19. REPORTES

Ruta: `/app/reports`

## Reportes

- ficha de producto;
- lista de productos con costo y precio;
- rentabilidad;
- punto de equilibrio;
- ingredientes y costos;
- historial de compras;
- comparativo de proveedores.

## Exportaciones

- PDF;
- CSV;
- XLSX cuando sea viable;
- backup completo.

---

# 20. AImargen AI

Ruta: `/app/ai`

## Principio fundamental

**La IA interpreta. AImargen calcula.**

Nunca permitir que el LLM sea la fuente de verdad financiera.

## Capacidades MVP

1. Preguntar a AImargen.
2. Crear receta por lenguaje natural.
3. Analizar factura.
4. Explicar margen.
5. Simular escenarios.
6. Recomendar revisión de precios.
7. Detectar cambios relevantes.
8. Resumir reportes.

---

# 21. TOOL CALLING PARA IA

Crear un AI Gateway interno.

El modelo no accede directamente a MySQL.

Solo llama herramientas autorizadas.

## Herramientas mínimas

### Lectura

- `get_tenant_summary`
- `search_ingredients`
- `get_ingredient`
- `get_ingredient_price_history`
- `search_products`
- `get_product`
- `get_product_cost_breakdown`
- `get_product_margin`
- `get_purchase_history`
- `get_supplier_history`
- `get_scenario`
- `calculate_break_even`
- `compare_margin_options`
- `list_low_margin_products`

### Escritura segura

- `draft_recipe`
- `create_recipe_from_confirmed_draft`
- `draft_purchase_from_invoice`
- `confirm_purchase_import`
- `create_scenario`

## Regla de confirmación

Toda acción que cree o modifique datos a partir de IA debe usar:

1. propuesta;
2. revisión;
3. confirmación explícita;
4. ejecución;
5. auditoría.

---

# 22. IA — PREGUNTAR A SU NEGOCIO

Ejemplos soportados:

- “¿Cuál producto tiene menor margen?”
- “¿Qué ingredientes subieron más?”
- “¿Qué productos están por debajo del 40%?”
- “¿Cuánto debo cobrar para ganar 45%?”
- “¿Qué pasa si vendo 40 unidades a ₡5.500?”
- “¿Cuál proveedor me ha vendido más barato este ingrediente?”
- “¿Qué recetas tienen datos incompletos?”
- “Explíqueme por qué bajó mi margen.”

La respuesta debe usar datos reales, mencionar faltantes, explicar de forma sencilla, mostrar cálculo y permitir una acción siguiente.

Nunca inventar, asumir precios, asumir ventas ni asegurar hechos no disponibles.

---

# 23. IA — CAPTURA INTELIGENTE DE FACTURAS

## Flujo

1. Usuario toma foto o sube factura.
2. Backend almacena archivo temporal.
3. OCR/visión extrae proveedor, fecha, productos, cantidades, unidades y precios.
4. IA intenta vincular cada línea con ingrediente existente.
5. Mostrar preview editable.
6. Usuario confirma.
7. Crear compra.
8. Actualizar costo vigente según reglas.
9. Mantener historial.
10. Registrar auditoría.

Nunca guardar automáticamente sin confirmación.

---

# 24. IA — CREACIÓN DE RECETAS POR LENGUAJE NATURAL

Entrada ejemplo:

> “Hamburguesa clásica: 180 g de carne, 1 pan, 30 g de queso, 20 g de salsa y una caja de ₡180.”

Flujo:

1. interpretar;
2. buscar ingredientes;
3. detectar faltantes;
4. proponer cantidades;
5. nunca inventar costos;
6. crear borrador;
7. usuario revisa;
8. confirmar;
9. motor calcula.

---

# 25. IA — RECOMENDACIONES DE PRECIO

La recomendación puede usar:

- costo actual;
- margen objetivo;
- historial de costos;
- variación reciente;
- empaque;
- mano de obra;
- indirectos;
- merma.

Ejemplo:

> “El costo del producto aumentó 14%. Su precio no cambió y el margen cayó de 46% a 37%.”

Mostrar escenarios calculados por el motor.

No afirmar demanda, precio de mercado, ventas esperadas o producto más vendido a menos que exista una fuente externa o integración explícita.

---

# 26. SISTEMA DE ALERTAS

Alertas mínimas:

- precio menor al costo;
- producto sin precio;
- producto bajo margen objetivo;
- ingrediente sin costo;
- receta sin porciones;
- compra con dato inválido;
- incremento significativo de ingrediente;
- escenario con margen negativo.

La IA puede traducir una alerta técnica a lenguaje sencillo.

---

# 27. BASE DE DATOS — TABLAS SUGERIDAS

- `tenants`
- `plans`
- `subscriptions`
- `users`
- `roles`
- `permissions`
- `role_permissions`
- `user_sessions`
- `ingredients`
- `ingredient_categories`
- `units`
- `unit_conversions`
- `suppliers`
- `purchases`
- `purchase_items`
- `ingredient_price_history`
- `products`
- `product_categories`
- `recipes`
- `recipe_items`
- `product_cost_components`
- `pricing_profiles`
- `scenarios`
- `fixed_costs`
- `reports`
- `exports`
- `uploaded_documents`
- `ai_conversations`
- `ai_messages`
- `ai_tool_calls`
- `ai_usage`
- `alerts`
- `audit_logs`
- `feature_flags`
- `tenant_settings`

Agregar PK, FK, índices, unique constraints, tenant isolation y timestamps.

---

# 28. API

Base: `/api/v1`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/verify-email`

## Tenant

- `GET /tenant`
- `PATCH /tenant`
- `GET /tenant/settings`
- `PATCH /tenant/settings`

## Ingredients

CRUD.

## Suppliers

CRUD.

## Purchases

CRUD controlado.

## Products

CRUD.

## Recipes

CRUD.

## Pricing

- calculate;
- compare;
- breakdown.

## Scenarios

CRUD + calculate.

## Reports

generate + download.

## AI

- `/ai/chat`
- `/ai/tools/...`
- `/ai/invoice/analyze`
- `/ai/recipe/draft`
- `/ai/insights`

## Admin

- `/admin/tenants`
- `/admin/users`
- `/admin/metrics`
- `/admin/audit`
- `/admin/ai-usage`

---

# 29. SEGURIDAD

## Autenticación

Preferir:

- access token corto;
- refresh token seguro;
- cookies `HttpOnly`;
- `Secure`;
- `SameSite`.

## Contraseñas

- Argon2id o bcrypt con costo seguro.
- Nunca texto plano.
- Política razonable.
- Rate limiting.

## Protección

- CORS estricto;
- CSRF según estrategia;
- headers de seguridad;
- validación server-side;
- sanitización;
- prevención SQL injection mediante ORM/query builder parametrizado;
- upload validation;
- MIME validation;
- límites de tamaño;
- antivirus opcional;
- rate limit;
- brute force protection;
- auditoría.

## Secretos

Solo variables de entorno. Nunca commit.

---

# 30. PWA

## Requisitos

- manifest;
- iconos;
- splash;
- service worker;
- instalación;
- offline shell;
- cache strategy;
- actualización segura.

## Offline

Permitir como mínimo:

- abrir app;
- ver datos cacheados recientes;
- trabajar en borradores seguros cuando sea viable.

No ejecutar operaciones financieras críticas offline si no existe una estrategia de sincronización segura.

---

# 31. UX MOBILE-FIRST

Diseñar primero en `390 × 844` y después desktop `1440 × 900`.

Reglas:

- máximo una acción principal por pantalla;
- forms cortos;
- sticky action cuando ayude;
- bottom sheets;
- tarjetas;
- teclado correcto;
- autocompletado;
- búsqueda;
- filtros en sheet;
- skeletons;
- empty states;
- errores útiles;
- confirmaciones claras;
- navegación inferior;
- soporte notch/safe area;
- sin microtexto ilegible.

---

# 32. SISTEMA VISUAL

## Marca

AImargen.

## Personalidad

- clara;
- tecnológica;
- confiable;
- rentable;
- sencilla;
- premium.

## Tema

Claro.

## Colores

Definir tokens.

Sugerencia:

- azul primario;
- azul profundo;
- blanco;
- gris frío;
- verde únicamente para señales positivas;
- rojo solo alertas;
- ámbar advertencias.

No depender del color para significado.

---

# 33. ACCESIBILIDAD

- WCAG AA como objetivo;
- contraste;
- focus visible;
- navegación teclado;
- labels;
- aria;
- lectura screen reader;
- tamaños táctiles;
- estados no comunicados solo por color.

---

# 34. OBSERVABILIDAD

Implementar:

- logs estructurados;
- request ID;
- error tracking;
- métricas;
- health endpoint;
- readiness;
- liveness.

Registrar login, errores, jobs, exportaciones, tool calls y acciones administrativas.

Nunca registrar contraseñas, tokens completos, secretos o archivos sensibles innecesariamente.

---

# 35. AUDITORÍA

Tabla `audit_logs`.

Guardar:

- tenant;
- user;
- acción;
- entidad;
- entity_id;
- before;
- after;
- IP;
- user agent;
- timestamp.

Especialmente en cambios de precio, compras, recetas, roles, tenant settings, acciones IA confirmadas y acciones admin.

---

# 36. BACKUPS

- backup automático MySQL;
- retención definida;
- prueba de restauración;
- exportación tenant;
- archivos en storage;
- cifrado en tránsito;
- cifrado en reposo cuando sea viable.

---

# 37. TESTING

## Unit

Motor de cálculo.

Pruebas mínimas:

1. 5 kg por ₡10.000 → ₡2.000/kg.
2. 250 g → ₡500 cuando corresponde según costo unitario.
3. ₡10.000 / 10 porciones → ₡1.000.
4. costo ₡1.000, margen 40% → ₡1.666,67.
5. precio ₡2.000, costo ₡1.200 → utilidad ₡800 y margen 40%.
6. precio menor al costo → warning.
7. división entre cero → error controlado.
8. margen inválido → error.
9. duplicar receta → copia independiente.
10. nueva compra → recalcula sin destruir historial.

## Integration

- auth;
- tenant isolation;
- CRUD;
- calculations;
- export;
- AI tool gateway.

## E2E

- registro;
- onboarding;
- primer ingrediente;
- compra;
- receta;
- precio;
- escenario;
- reporte;
- IA.

## Visual

Desktop: `1440 × 900`

Mobile: `390 × 844`

---

# 38. PRUEBAS MULTI-TENANT OBLIGATORIAS

Crear Tenant A y Tenant B.

Comprobar:

- usuario A no ve ingredientes B;
- usuario A no ve recetas B;
- usuario A no descarga reportes B;
- usuario A no llama AI tools sobre B;
- UUID manipulado falla;
- admin tenant no accede al panel global.

---

# 39. PRUEBAS IA

Validar:

- si falta dato, no inventa;
- si herramienta falla, informa;
- si usuario pide precio, consulta herramienta;
- si usuario pide modificar, requiere confirmación;
- tool call respeta tenant;
- prompt injection no permite cambiar tenant;
- documento malicioso no altera instrucciones del sistema;
- salida se valida.

---

# 40. CI/CD

Pipeline mínimo:

1. install;
2. lint;
3. typecheck;
4. unit tests;
5. integration tests;
6. build;
7. security scan;
8. dependency audit;
9. migration check;
10. artifact.

No desplegar si falla gate crítico.

---

# 41. ENTORNOS

- local;
- test;
- staging;
- production.

Nunca usar la base de producción para pruebas.

---

# 42. ESTRUCTURA DE REPOSITORIO SUGERIDA

```text
aimargen/
├─ apps/
│  ├─ web/
│  └─ api/
├─ packages/
│  ├─ calculation-engine/
│  ├─ ui/
│  ├─ schemas/
│  ├─ config/
│  └─ types/
├─ database/
│  ├─ migrations/
│  ├─ seeds/
│  └─ docs/
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ qa/
│  ├─ security/
│  └─ handoffs/
├─ infra/
├─ scripts/
├─ .github/
└─ README.md
```

Monorepo recomendado con pnpm workspaces.

---

# 43. ETAPAS DE DESARROLLO

## Etapa 0 — Preparación

- repo;
- monorepo;
- lint;
- prettier;
- TypeScript;
- env;
- Docker local;
- MySQL;
- Redis opcional;
- CI.

**Gate:** proyecto compila.

## Etapa 1 — Fundación

- design system;
- router;
- API base;
- DB;
- migrations;
- layout;
- PWA base;
- observabilidad.

**Gate:** web + API + DB operativos.

## Etapa 2 — Landing

- landing completa;
- responsive;
- SEO;
- CTA;
- legal placeholders.

**Gate:** Lighthouse aceptable y mobile correcto.

## Etapa 3 — Auth + Multi-tenant

- registro;
- login;
- verify;
- reset;
- tenant creation;
- roles;
- middleware;
- isolation tests.

**Gate:** pruebas cross-tenant PASS.

## Etapa 4 — Onboarding

- negocio;
- moneda;
- settings;
- primer ingrediente;
- primera receta.

**Gate:** nuevo usuario logra primer cálculo.

## Etapa 5 — Ingredientes, unidades, proveedores y compras

- CRUD;
- historial;
- conversiones;
- purchase update.

**Gate:** cálculos base PASS.

## Etapa 6 — Recetas

- receta;
- items;
- porciones;
- costos adicionales;
- duplicar;
- archivar.

**Gate:** costo real PASS.

## Etapa 7 — Precio y margen

- margen;
- multiplicador;
- utilidad;
- desglose.

**Gate:** fórmulas oficiales PASS.

## Etapa 8 — Escenarios

- simulador;
- costos fijos;
- variable;
- equilibrio.

**Gate:** escenarios nunca modifican base.

## Etapa 9 — Dashboard

- KPIs;
- alertas;
- quick actions;
- insight cards.

**Gate:** todos los datos provienen de backend.

## Etapa 10 — Reportes

- PDF;
- CSV;
- XLSX;
- backup.

**Gate:** exportaciones correctas.

## Etapa 11 — IA base

- AI gateway;
- provider abstraction;
- tool calling;
- chat;
- auditoría;
- usage.

**Gate:** IA no puede leer otro tenant.

## Etapa 12 — Facturas IA

- upload;
- vision/OCR;
- matching;
- draft;
- confirmation.

**Gate:** nunca guarda sin confirmar.

## Etapa 13 — Recetas IA

- natural language;
- ingredient matching;
- draft;
- confirmation.

**Gate:** nunca inventa costo faltante.

## Etapa 14 — Insights IA

- margin alerts;
- cost variation;
- explanations;
- scenario assistance.

**Gate:** toda cifra rastreable.

## Etapa 15 — Admin global

- tenants;
- users;
- metrics;
- audit;
- AI usage;
- flags.

**Gate:** solo super_admin.

## Etapa 16 — Mobile native polish

- bottom navigation;
- sheets;
- safe area;
- keyboard;
- performance;
- PWA install;
- offline shell.

**Gate:** prueba real en teléfono.

## Etapa 17 — Seguridad

- threat review;
- auth hardening;
- headers;
- rate limit;
- upload controls;
- dependency scan.

**Gate:** cero vulnerabilidades críticas conocidas.

## Etapa 18 — QA final

- regression;
- E2E;
- mobile;
- desktop;
- accessibility;
- performance.

## Etapa 19 — Staging

- migrations;
- seed demo;
- smoke tests;
- backups;
- monitoring.

## Etapa 20 — Producción

- deploy;
- DNS;
- SSL;
- health;
- backup;
- rollback;
- release notes.

---

# 44. CRITERIOS DE ACEPTACIÓN FINALES

No declarar terminado hasta que:

- [ ] Landing funciona.
- [ ] Registro funciona.
- [ ] Login funciona.
- [ ] Recuperación funciona.
- [ ] Multi-tenant probado.
- [ ] Dashboard global funciona.
- [ ] Dashboard tenant funciona.
- [ ] Ingredientes funcionan.
- [ ] Compras funcionan.
- [ ] Proveedores funcionan.
- [ ] Conversiones funcionan.
- [ ] Recetas funcionan.
- [ ] Duplicar receta funciona.
- [ ] Historial se conserva.
- [ ] Costo total es correcto.
- [ ] Costo por porción es correcto.
- [ ] Margen es correcto.
- [ ] Multiplicador es correcto.
- [ ] Utilidad es correcta.
- [ ] Punto de equilibrio es correcto.
- [ ] Escenarios funcionan.
- [ ] Reportes funcionan.
- [ ] Exportación funciona.
- [ ] IA consulta herramientas.
- [ ] IA no inventa datos faltantes.
- [ ] Facturas IA requieren confirmación.
- [ ] Recetas IA requieren confirmación.
- [ ] Auditoría funciona.
- [ ] Backups existen.
- [ ] PWA es instalable.
- [ ] Mobile se siente como app.
- [ ] Desktop funciona.
- [ ] 390×844 QA PASS.
- [ ] 1440×900 QA PASS.
- [ ] No hay botones sin función.
- [ ] No hay errores críticos conocidos.
- [ ] CI PASS.
- [ ] Seguridad PASS.
- [ ] Producción verificada.

---

# 45. DEFINITION OF DONE POR FEATURE

Una feature solo está terminada si:

1. tiene UI;
2. tiene backend;
3. tiene persistencia;
4. valida permisos;
5. valida tenant;
6. maneja errores;
7. funciona móvil;
8. funciona desktop;
9. tiene pruebas;
10. no rompe otras features;
11. tiene auditoría si aplica;
12. tiene documentación mínima.

---

# 46. REGLA DE ENTREGA DEL AGENTE

Después de cada etapa, reportar:

```text
ETAPA:
ESTADO:
BRANCH:
COMMIT/SHA:
IMPLEMENTADO:
PRUEBAS:
RESULTADO:
BUGS ABIERTOS:
RIESGOS:
SIGUIENTE ETAPA:
```

No afirmar PASS sin ejecutar la prueba correspondiente.

---

# 47. DATOS DEMO

Crear un tenant demo:

**Café AImargen Demo**

Ingredientes:

- Café
- Leche
- Azúcar
- Pan
- Carne
- Queso
- Salsa
- Empaque

Productos:

- Cappuccino
- Hamburguesa clásica
- Cheesecake
- Lomo en salsa de hongos

Usar datos explícitamente marcados como demo.

---

# 48. SEO Y PÁGINAS PÚBLICAS

Crear:

- `/`
- `/pricing`
- `/features`
- `/security`
- `/privacy`
- `/terms`
- `/contact`

SEO:

- metadata;
- Open Graph;
- sitemap;
- robots;
- structured data cuando aplique.

---

# 49. MODELO DE PLANES — PREPARADO, NO FIJADO

La arquitectura debe soportar planes sin definir precios finales.

Posibles límites:

- usuarios;
- productos;
- recetas;
- facturas IA;
- consultas IA;
- exportaciones;
- almacenamiento.

Feature flags por plan.

---

# 50. PRINCIPIO FINAL DEL PRODUCTO

AImargen debe hacer que una persona que hoy fija precios “a ojo” pueda pasar a trabajar con datos reales sin sentirse dentro de un sistema contable complicado.

La experiencia debe transmitir:

**Claridad. Control. Confianza. Rentabilidad.**

La inteligencia artificial debe reducir trabajo y explicar información.

El motor de AImargen debe seguir siendo la fuente de verdad.

---

# 51. PROMPT CORTO PARA INICIAR AL AGENTE

Usa este documento como fuente de verdad y construye AImargen.com completo desde cero.

Empieza por **Etapa 0 — Preparación** y no avances automáticamente a la siguiente etapa sin terminar los gates de la etapa actual.

Antes de programar:

1. resume la arquitectura que vas a implementar;
2. propone el árbol inicial del monorepo;
3. identifica decisiones que requieran ADR;
4. identifica riesgos de multi-tenancy;
5. define los primeros gates de CI;
6. crea el plan de trabajo de Etapa 0.

Después comienza la implementación real.

No reduzcas el alcance a un prototipo visual.  
No sustituyas funcionalidad por placeholders.  
No declares pruebas que no ejecutaste.  
No inventes requisitos de negocio fuera de este documento.  
Cuando una decisión técnica no esté especificada, elige la alternativa más estable, económica, segura y mantenible y documéntala.
