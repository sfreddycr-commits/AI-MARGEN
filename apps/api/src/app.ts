import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { APP_VERSION, type AppConfig } from './core/config/config.js';
import type { Db } from './core/db/db.js';
import { registerErrorHandler } from './core/http/error-handler.js';
import { buildRequestContext } from './core/http/request-context.js';
import { createMetrics, instrumentHttp, type Metrics } from './core/observability/metrics.js';
import { createAuditService } from './core/audit/audit.service.js';
import { createAccessTokenCodec } from './core/auth/tokens.js';
import { loadRolePermissions } from './core/auth/permissions.js';
import { createSessionCookies, registerAuth } from './core/auth/auth.plugin.js';
import { createMailer, type Mailer } from './core/mail/mailer.js';
import { createStorage, type Storage } from './core/storage/storage.js';
import { createCostingService } from './core/costing/costing.service.js';
import type { Services } from './core/services.js';
import { createAiProvider, type AiProvider } from './modules/ai/provider.js';
// Módulos
import { createSystemModel } from './modules/system/system.model.js';
import { createSystemController } from './modules/system/system.controller.js';
import { systemRoutes } from './modules/system/system.routes.js';
import { createAuthModel } from './modules/auth/auth.model.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { createTenantModel } from './modules/tenant/tenant.model.js';
import { createTenantController } from './modules/tenant/tenant.controller.js';
import { tenantRoutes } from './modules/tenant/tenant.routes.js';
import { createCatalogModel } from './modules/catalog/catalog.model.js';
import { createCatalogController } from './modules/catalog/catalog.controller.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { createSupplierModel } from './modules/suppliers/suppliers.model.js';
import { createSupplierController } from './modules/suppliers/suppliers.controller.js';
import { supplierRoutes } from './modules/suppliers/suppliers.routes.js';
import { createIngredientModel } from './modules/ingredients/ingredients.model.js';
import { createIngredientController } from './modules/ingredients/ingredients.controller.js';
import { ingredientRoutes } from './modules/ingredients/ingredients.routes.js';
import { createPurchaseModel } from './modules/purchases/purchases.model.js';
import { createPurchaseController } from './modules/purchases/purchases.controller.js';
import { purchaseRoutes } from './modules/purchases/purchases.routes.js';
import { createProductModel } from './modules/products/products.model.js';
import { createProductController } from './modules/products/products.controller.js';
import { productRoutes } from './modules/products/products.routes.js';
import { createPricingController } from './modules/pricing/pricing.controller.js';
import { pricingRoutes } from './modules/pricing/pricing.routes.js';
import { createPlanningModel } from './modules/planning/planning.model.js';
import { createPlanningController } from './modules/planning/planning.controller.js';
import { planningRoutes } from './modules/planning/planning.routes.js';
import { createDashboardModel } from './modules/dashboard/dashboard.model.js';
import { createDashboardController } from './modules/dashboard/dashboard.controller.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { createSyncController } from './modules/sync/sync.controller.js';
import { syncRoutes } from './modules/sync/sync.routes.js';
import { createReportModel } from './modules/reports/reports.model.js';
import { createReportController } from './modules/reports/reports.controller.js';
import { reportRoutes } from './modules/reports/reports.routes.js';
import { createAiModel } from './modules/ai/ai.model.js';
import { createAiController } from './modules/ai/ai.controller.js';
import { aiRoutes } from './modules/ai/ai.routes.js';
import { createAdminModel } from './modules/admin/admin.model.js';
import { createAdminController } from './modules/admin/admin.controller.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { devRoutes } from './modules/dev/dev.routes.js';

export interface BuildAppDeps {
  config: AppConfig;
  db: Db;
  /** Inyección para pruebas. */
  metrics?: Metrics;
  mailer?: Mailer;
  storage?: Storage;
  ai?: AiProvider | null;
}

/**
 * Construye la app Fastify sin escuchar en un puerto (permite pruebas con `app.inject`).
 * Cada módulo se arma como: model(db) → controller(model, servicios) → routes(controller).
 */
export async function buildApp(deps: BuildAppDeps): Promise<FastifyInstance> {
  const { config, db } = deps;
  const isProduction = config.NODE_ENV === 'production';
  const metrics = deps.metrics ?? createMetrics(config.NODE_ENV !== 'test');

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      // Nunca registrar secretos ni credenciales (SOP §34).
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.newPassword',
          '*.currentPassword',
          '*.token',
          '*.refreshToken',
        ],
        censor: '[REDACTADO]',
      },
    },
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      return typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming)
        ? incoming
        : randomUUID();
    },
    requestIdHeader: false,
    trustProxy: true,
    bodyLimit: 1_048_576,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Antes de cualquier plugin: los contextos hijos heredan el manejador al crearse.
  registerErrorHandler(app, metrics);

  app.decorateRequest('ctx', null as never);
  app.addHook('onRequest', async (req) => {
    req.ctx = buildRequestContext(req);
  });
  app.addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
    if (req.url.startsWith('/api/')) reply.header('cache-control', 'no-store');
  });
  instrumentHttp(app, metrics);

  await app.register(helmet, {
    // La API solo devuelve JSON; la CSP de la web la define el servidor estático.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });
  await app.register(cookie);
  await app.register(multipart, {
    limits: { fileSize: config.UPLOAD_MAX_MB * 1024 * 1024, files: 1, fields: 5 },
  });
  if (config.RATE_LIMIT_ENABLED)
    await app.register(rateLimit, {
      global: true,
      max: config.RATE_LIMIT_MAX,
      timeWindow: '1 minute',
      // Se lanza como error para que el manejador central responda en español con requestId.
      errorResponseBuilder: (_req, ctx) =>
        Object.assign(new Error('rate limited'), { statusCode: ctx.statusCode }),
    });

  if (config.API_DOCS ?? !isProduction) {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'AImargen API',
          description: 'API v1 de AImargen. Montos como string decimal. Errores en español.',
          version: APP_VERSION,
        },
        servers: [{ url: '/' }],
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/api/docs' });
  }

  // --- Servicios compartidos ---
  const services: Services = {
    config,
    db,
    log: app.log,
    mailer: deps.mailer ?? createMailer(config, app.log),
    storage: deps.storage ?? createStorage(config),
    audit: createAuditService(db),
    codec: createAccessTokenCodec(config.JWT_ACCESS_SECRET),
    roles: await loadRolePermissions(db).catch((err) => {
      app.log.error({ err }, 'no se pudo cargar la matriz de permisos');
      return { permissions: new Map(), rank: new Map() };
    }),
    ai: deps.ai === undefined ? createAiProvider(config) : deps.ai,
  };
  app.decorate('services', services);
  app.decorate('audit', services.audit);
  registerAuth(app, { codec: services.codec, roles: services.roles, config });
  const cookies = createSessionCookies(config);
  const costing = createCostingService(db);

  // --- Modelos ---
  const authModel = createAuthModel(db);
  const tenantModel = createTenantModel(db);
  const ingredientModel = createIngredientModel(db);
  const productModel = createProductModel(db);

  // --- Controladores ---
  const auth = createAuthController(authModel, tenantModel, services);
  const tenant = createTenantController(tenantModel, authModel, services);
  const catalog = createCatalogController(createCatalogModel(db), services);
  const suppliers = createSupplierController(createSupplierModel(db), services);
  const ingredients = createIngredientController(ingredientModel, tenantModel, costing, services);
  const purchases = createPurchaseController(
    createPurchaseModel(db),
    ingredientModel,
    tenantModel,
    costing,
    services,
  );
  const products = createProductController(productModel, ingredientModel, tenantModel, services);
  const pricing = createPricingController(products);
  const planning = createPlanningController(createPlanningModel(db), products, services);
  const dashboard = createDashboardController(
    createDashboardModel(db),
    products,
    planning,
    tenantModel,
  );
  const reports = createReportController(
    createReportModel(db),
    { products, ingredients, planning, purchases, tenants: tenantModel },
    services,
  );
  const ai = createAiController(
    createAiModel(db),
    {
      products,
      ingredients,
      purchases,
      planning,
      dashboard,
      pricing,
      suppliers,
      tenants: tenantModel,
    },
    services,
  );
  const admin = createAdminController(createAdminModel(db), services);
  const system = createSystemController(createSystemModel(db), APP_VERSION);

  await app.register(
    async (v1) => {
      await v1.register(
        systemRoutes({
          controller: system,
          metrics,
          metricsToken: config.METRICS_TOKEN,
          isProduction,
        }),
      );
      await v1.register(authRoutes(auth, cookies));
      await v1.register(tenantRoutes(tenant, auth, cookies));
      await v1.register(catalogRoutes(catalog));
      await v1.register(supplierRoutes(suppliers));
      await v1.register(ingredientRoutes(ingredients));
      await v1.register(purchaseRoutes(purchases));
      await v1.register(productRoutes(products));
      await v1.register(pricingRoutes(pricing));
      await v1.register(planningRoutes(planning));
      await v1.register(dashboardRoutes(dashboard));
      await v1.register(syncRoutes(createSyncController(db)));
      await v1.register(reportRoutes(reports));
      await v1.register(aiRoutes(ai));
      await v1.register(adminRoutes(admin));
      await v1.register(publicRoutes(db));
      if (config.DEV_OUTBOX && !isProduction) await v1.register(devRoutes(services.mailer));
    },
    { prefix: '/api/v1' },
  );

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    audit: ReturnType<typeof createAuditService>;
    services: Services;
  }
}
