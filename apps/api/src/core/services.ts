import type { FastifyBaseLogger } from 'fastify';
import type { AppConfig } from './config/config.js';
import type { Db } from './db/db.js';
import type { Mailer } from './mail/mailer.js';
import type { Storage } from './storage/storage.js';
import type { AuditService } from './audit/audit.service.js';
import type { AccessTokenCodec } from './auth/tokens.js';
import type { RolePermissions } from './auth/permissions.js';
import type { AiProvider } from '../modules/ai/provider.js';

/** Servicios compartidos que reciben los controladores (inyección explícita, fácil de probar). */
export interface Services {
  config: AppConfig;
  db: Db;
  log: FastifyBaseLogger;
  mailer: Mailer;
  storage: Storage;
  audit: AuditService;
  codec: AccessTokenCodec;
  roles: RolePermissions;
  ai: AiProvider | null;
}
