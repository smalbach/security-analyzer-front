# PLAN DE IMPLEMENTACION: Testing de APIs Locales — Web + Tauri

## 1. Contexto y Problema

### Arquitectura actual
```
┌───────────────────┐         ┌──────────────────────────┐
│  Frontend React   │  REST   │  Backend NestJS           │
│  (Vite, puerto    │────────>│  (puerto 3008)            │
│   5173)           │  WS     │                           │
│                   │<────────│  - Ejecuta tests HTTP     │
└───────────────────┘         │    con Axios contra APIs  │
                              │  - PostgreSQL (resultados)│
                              │  - Claude AI (analisis)   │
                              │  - Puppeteer (reportes)   │
                              └──────────┬────────────────┘
                                         │
                                         │ HTTP (Axios)
                                         ▼
                              ┌──────────────────────────┐
                              │  API Objetivo             │
                              │  (la API que se testea)   │
                              └──────────────────────────┘
```

### Problema
El backend NestJS es quien ejecuta las peticiones HTTP de seguridad contra la API objetivo.
Si el backend esta desplegado en un servidor remoto, **no puede alcanzar** APIs que corren en:
- `localhost:3000` del usuario
- Contenedores Docker locales
- IPs de red local (`192.168.x.x`)

### Objetivo
- Empaquetar el frontend como app de escritorio con **Tauri**
- Mantener el **backend remoto** para almacenar resultados, AI analysis, reportes
- Permitir testear **APIs locales** desde la app de escritorio
- La version **web** sigue funcionando para APIs publicas

---

## 2. Arquitectura Propuesta

```
┌──────────────────────────────────────────────────────────────┐
│  TAURI APP (Escritorio del usuario)                           │
│                                                               │
│  ┌────────────────────┐     ┌──────────────────────────────┐ │
│  │  Frontend React     │     │  Local Runner Agent           │ │
│  │  (WebView nativo)   │     │  (Node.js sidecar)            │ │
│  │                     │     │                               │ │
│  │  - Misma UI web     │     │  Puerto: 3009                 │ │
│  │  - Detecta Tauri    │     │                               │ │
│  │  - Toggle modo      │     │  Responsabilidades:           │ │
│  │    local/remoto     │────>│  1. Recibir test plans        │ │
│  │                     │     │  2. Ejecutar HTTP requests    │ │
│  └─────────┬──────────┘     │     contra APIs locales       │ │
│            │                 │  3. Enviar resultados al      │ │
│            │                 │     backend remoto             │ │
│            │                 │                               │ │
│            │                 │  Reutiliza:                   │ │
│            │                 │  - http-client.ts             │ │
│            │                 │  - test-strategies.ts         │ │
│            │                 └──────────┬───────────────────┘ │
└────────────┼────────────────────────────┼─────────────────────┘
             │                            │
             │  REST + WebSocket          │  POST /api/v1/test-runs/:id/local-results
             │  (todo el CRUD normal)     │
             ▼                            ▼
┌──────────────────────────────────────────────────────────────┐
│  BACKEND REMOTO (Servidor)                                    │
│                                                               │
│  NestJS + PostgreSQL + Claude AI + Puppeteer                  │
│                                                               │
│  Flujo API PUBLICA (sin cambios):                             │
│    Backend ejecuta tests directamente                         │
│                                                               │
│  Flujo API LOCAL (nuevo):                                     │
│    1. Crea test plan (no ejecuta)                             │
│    2. Devuelve plan al frontend/local-runner                  │
│    3. Recibe resultados via POST /local-results               │
│    4. Almacena, analiza con AI, genera reportes               │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Fases de Implementacion

---

### FASE 1: Inicializar Tauri en el frontend (2-3 dias)

#### 1.1 Instalar dependencias de Tauri

**Archivo**: `api-security-analyzer-front/package.json`

Agregar al `devDependencies`:
```json
{
  "@tauri-apps/cli": "^2.0.0",
  "@tauri-apps/api": "^2.0.0"
}
```

Ejecutar:
```bash
cd api-security-analyzer-front
npm install -D @tauri-apps/cli @tauri-apps/api
npx tauri init
```

#### 1.2 Configurar tauri.conf.json

**Archivo nuevo**: `api-security-analyzer-front/src-tauri/tauri.conf.json`

```json
{
  "$schema": "https://raw.githubusercontent.com/nicovrc/tauri-build/refs/heads/master/tooling/cli/schema.json",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "title": "Katapult Security Analyzer",
    "identifier": "com.katapult.security",
    "windows": [
      {
        "title": "Katapult Security Analyzer",
        "width": 1400,
        "height": 900,
        "minWidth": 1024,
        "minHeight": 680,
        "resizable": true,
        "fullscreen": false,
        "decorations": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' http://localhost:* https://* wss://*; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "shell": {
      "sidecar": true,
      "scope": [
        {
          "name": "local-runner",
          "sidecar": true
        }
      ]
    }
  }
}
```

#### 1.3 Crear main.rs basico

**Archivo nuevo**: `api-security-analyzer-front/src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Archivo nuevo**: `api-security-analyzer-front/src-tauri/Cargo.toml`

```toml
[package]
name = "katapult-security"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["shell-sidecar"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

#### 1.4 Verificacion Fase 1

```bash
cd api-security-analyzer-front
npx tauri dev
```

Debe abrir una ventana nativa con la app React cargada desde localhost:5173.
- Verificar que la UI se renderiza correctamente
- Verificar que puede conectarse al backend remoto
- Verificar que el login funciona
- Verificar que la navegacion funciona

---

### FASE 2: Deteccion de entorno y configuracion dinamica (1-2 dias)

#### 2.1 Crear modulo de deteccion de entorno

**Archivo nuevo**: `api-security-analyzer-front/src/lib/environment.ts`

```typescript
/**
 * Detecta si la app corre dentro de Tauri (desktop) o en navegador (web).
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * URL base del backend remoto.
 * En desarrollo usa el proxy de Vite (/api).
 * En produccion usa la variable de entorno.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    // En desarrollo, Vite proxy redirige /api al backend
    return '';
  }
  return import.meta.env.VITE_API_URL || 'https://api.security.katapult.com';
}

/**
 * URL del Local Runner Agent (solo disponible en Tauri).
 * Corre como sidecar en localhost:3009.
 */
export const LOCAL_RUNNER_URL = 'http://localhost:3009';

/**
 * Puerto por defecto del Local Runner.
 */
export const LOCAL_RUNNER_PORT = 3009;
```

#### 2.2 Modificar api.ts para usar deteccion de entorno

**Archivo existente**: `api-security-analyzer-front/src/lib/api.ts`

Buscar donde se construye la base URL del ApiClient y reemplazar con `getApiBaseUrl()`:

```typescript
import { getApiBaseUrl } from './environment';

// En el constructor de ApiClient o donde se defina la base URL:
const baseUrl = getApiBaseUrl();
```

Asegurar que todas las llamadas fetch usan la base URL correcta.

#### 2.3 Corregir proxy en vite.config.ts

**Archivo existente**: `api-security-analyzer-front/vite.config.ts`

El proxy actual apunta a puerto 3000 pero el backend usa 3008. Corregir:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3008',  // Corregido de 3000 a 3008
    changeOrigin: true,
    secure: false,
  },
  '/socket.io': {
    target: 'http://localhost:3008',
    changeOrigin: true,
    ws: true,
  }
}
```

#### 2.4 Verificacion Fase 2

- `npm run dev` funciona igual que antes (proxy corregido)
- `npx tauri dev` abre la app y se conecta al backend
- `isTauri()` retorna `true` en Tauri, `false` en navegador
- Console.log de `getApiBaseUrl()` muestra la URL correcta en ambos entornos

---

### FASE 3: Extraer logica compartida de tests (2-3 dias)

El backend tiene toda la logica de tests en:
- `api-security-analyzer/src/modules/runner/http-client.ts` — Cliente HTTP con Axios
- `api-security-analyzer/src/modules/runner/test-strategies.ts` — Todas las estrategias de test (SQL injection, XSS, BOLA, etc.)
- `api-security-analyzer/src/modules/runner/runner.service.ts` — Orquestacion del pipeline de 4 pasos

Necesitamos que el Local Runner reutilice esta logica sin duplicarla.

#### 3.1 Crear paquete compartido

**Directorio nuevo**: `packages/security-test-core/`

```
packages/
└── security-test-core/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts              # Re-exports
    │   ├── http-client.ts        # Copiado y adaptado del backend
    │   ├── test-strategies.ts    # Copiado y adaptado del backend
    │   ├── runner-pipeline.ts    # Logica de orquestacion extraida
    │   └── types/
    │       ├── index.ts
    │       ├── test-plan.ts      # TestPlan, EndpointTestConfig
    │       ├── test-result.ts    # TestResult, SecurityCheck
    │       └── http.ts           # HttpRequest, HttpResponse
    └── dist/                     # Output compilado
```

**`packages/security-test-core/package.json`**:
```json
{
  "name": "@katapult/security-test-core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.9.0"
  }
}
```

#### 3.2 Definir tipos del protocolo

**Archivo nuevo**: `packages/security-test-core/src/types/test-plan.ts`

```typescript
/**
 * Plan de test generado por el backend.
 * El Local Runner lo recibe y ejecuta cada test.
 */
export interface TestPlan {
  /** ID del test run en la base de datos del backend */
  runId: string;
  /** ID del proyecto */
  projectId: string;
  /** URL base de la API a testear */
  baseUrl: string;
  /** Endpoints a testear con sus configuraciones */
  endpoints: EndpointTestConfig[];
  /** Credenciales para tests de autenticacion */
  credentials: CredentialConfig[];
  /** Configuracion global del runner */
  settings: RunnerSettings;
}

export interface EndpointTestConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  /** URL completa (baseUrl + path) */
  fullUrl: string;
  requiresAuth: boolean;
  /** Body de ejemplo para POST/PUT/PATCH */
  sampleBody?: Record<string, unknown>;
  /** Headers adicionales */
  headers?: Record<string, string>;
  /** Roles que tienen acceso a este endpoint */
  allowedRoles?: string[];
}

export interface CredentialConfig {
  roleId: string;
  roleName: string;
  /** Endpoint de login */
  loginUrl: string;
  /** Cuerpo del login request */
  loginBody: Record<string, unknown>;
  /** Ruta al token en la respuesta del login (ej: "data.accessToken") */
  tokenPath?: string;
}

export interface RunnerSettings {
  /** Timeout por request en ms (default: 10000) */
  requestTimeout: number;
  /** Maximo de requests concurrentes (default: 5) */
  maxConcurrent: number;
  /** Iteraciones para test de rate limiting (default: 20) */
  rateLimitIterations: number;
  /** Tests habilitados */
  enabledTests: TestType[];
}

export type TestType =
  | 'no-auth'
  | 'bola'
  | 'bfla'
  | 'injection-sql'
  | 'injection-nosql'
  | 'injection-xss'
  | 'mass-assignment'
  | 'rate-limiting'
  | 'method-tampering'
  | 'jwt-attacks'
  | 'verbose-errors'
  | 'content-type';
```

**Archivo nuevo**: `packages/security-test-core/src/types/test-result.ts`

```typescript
/**
 * Resultado de un test ejecutado por el Local Runner.
 * Se envia al backend para almacenamiento.
 */
export interface TestResult {
  runId: string;
  endpointId: string;
  endpointUrl: string;
  endpointMethod: string;
  checks: SecurityCheck[];
  /** Timestamp de inicio de ejecucion */
  startedAt: string;
  /** Timestamp de fin de ejecucion */
  completedAt: string;
}

export interface SecurityCheck {
  /** Tipo de test (ej: 'sql-injection', 'bola', 'no-auth') */
  testType: string;
  /** Nombre legible del test */
  testName: string;
  /** pass = sin vulnerabilidad, fail = vulnerabilidad detectada, error = test fallo */
  status: 'pass' | 'fail' | 'error' | 'warning';
  /** Severidad de la vulnerabilidad encontrada */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Descripcion del resultado */
  description: string;
  /** Detalles del request/response para evidencia */
  evidence?: {
    request: { method: string; url: string; headers?: Record<string, string>; body?: unknown };
    response: { status: number; headers?: Record<string, string>; body?: unknown; responseTime: number };
  };
  /** Rol/credencial usado en el test (si aplica) */
  credential?: string;
  /** Payload inyectado (si aplica) */
  payload?: string;
}

/**
 * Batch de resultados enviado al backend.
 */
export interface LocalResultsBatch {
  runId: string;
  results: TestResult[];
  /** Progreso total (0-100) */
  progress: number;
  /** true si es el ultimo batch */
  isComplete: boolean;
}
```

#### 3.3 Adaptar http-client.ts para el paquete compartido

**Archivo nuevo**: `packages/security-test-core/src/http-client.ts`

Copiar la logica de `api-security-analyzer/src/modules/runner/http-client.ts` pero:
- Remover dependencias de NestJS (`@nestjs/axios`, `@nestjs/common`)
- Usar Axios directamente
- Hacerlo una clase standalone:

```typescript
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

export interface HttpClientOptions {
  timeout: number;
  maxConcurrent: number;
}

export interface HttpTestRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface HttpTestResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  responseTime: number;
  error?: string;
}

export class SecurityHttpClient {
  private client: AxiosInstance;

  constructor(options: HttpClientOptions) {
    this.client = axios.create({
      timeout: options.timeout,
      validateStatus: () => true, // No lanzar error por ningun status code
      maxRedirects: 5,
    });
  }

  async execute(request: HttpTestRequest): Promise<HttpTestResponse> {
    const startTime = Date.now();
    try {
      const config: AxiosRequestConfig = {
        method: request.method as any,
        url: request.url,
        headers: request.headers,
        data: request.body,
      };

      const response = await this.client.request(config);

      return {
        status: response.status,
        headers: response.headers as Record<string, string>,
        body: response.data,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 0,
        headers: {},
        body: null,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async executeRaw(request: HttpTestRequest): Promise<HttpTestResponse> {
    // Para enviar payloads malformados (strings raw en vez de JSON)
    // Misma logica que execute pero sin serializar el body
    return this.execute(request);
  }
}
```

#### 3.4 Adaptar test-strategies.ts

**Archivo nuevo**: `packages/security-test-core/src/test-strategies.ts`

Copiar toda la logica de `api-security-analyzer/src/modules/runner/test-strategies.ts` (~1100 lineas) pero:
- Remover decoradores NestJS (`@Injectable()`, etc.)
- Recibir `SecurityHttpClient` como parametro en vez de inyeccion de dependencias
- Exportar cada estrategia como funcion pura:

```typescript
import type { SecurityHttpClient, HttpTestRequest, HttpTestResponse } from './http-client';
import type { SecurityCheck, EndpointTestConfig, CredentialConfig } from './types';

// Cada funcion recibe el cliente HTTP, el endpoint y las credenciales,
// y retorna un array de SecurityCheck results

export async function testNoAuth(
  client: SecurityHttpClient,
  endpoint: EndpointTestConfig,
): Promise<SecurityCheck[]> { /* ... */ }

export async function testBola(
  client: SecurityHttpClient,
  endpoint: EndpointTestConfig,
  credentials: CredentialConfig[],
  tokens: Map<string, string>,
): Promise<SecurityCheck[]> { /* ... */ }

export async function testSqlInjection(
  client: SecurityHttpClient,
  endpoint: EndpointTestConfig,
  token?: string,
): Promise<SecurityCheck[]> { /* ... */ }

// ... etc para cada tipo de test
```

#### 3.5 Actualizar backend para usar el paquete compartido

**Archivos a modificar en el backend** (`api-security-analyzer`):

1. `package.json` — agregar dependencia:
   ```json
   "@katapult/security-test-core": "file:../packages/security-test-core"
   ```

2. `src/modules/runner/runner.service.ts` — importar de `@katapult/security-test-core` en vez de los archivos locales

3. Eliminar archivos locales duplicados (o mantenerlos como re-exports del paquete compartido)

#### 3.6 Verificacion Fase 3

```bash
cd packages/security-test-core
npm run build
# Debe compilar sin errores

cd ../../api-security-analyzer
npm install
npm run build
# Backend debe compilar y funcionar igual que antes

npm run test
# Tests existentes deben pasar
```

---

### FASE 4: Crear el Local Runner Agent (3-5 dias)

#### 4.1 Estructura del Local Runner

**Directorio nuevo**: `api-security-analyzer-local-runner/`

```
api-security-analyzer-local-runner/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # Entry point — inicia el servidor
│   ├── server.ts                 # Express mini-server (puerto 3009)
│   ├── routes/
│   │   ├── health.ts             # GET /health — health check
│   │   ├── execute.ts            # POST /execute — recibe TestPlan, ejecuta tests
│   │   └── status.ts             # GET /status/:runId — estado de ejecucion actual
│   ├── executor.ts               # Orquesta la ejecucion de tests usando security-test-core
│   ├── result-reporter.ts        # Envia resultados al backend remoto
│   ├── auth-handler.ts           # Maneja autenticacion contra API local
│   └── progress-emitter.ts       # Emite progreso via SSE o polling
├── dist/
└── bin/
    └── local-runner              # Ejecutable compilado con pkg
```

#### 4.2 Entry point del Local Runner

**Archivo nuevo**: `api-security-analyzer-local-runner/src/index.ts`

```typescript
import { createServer } from './server';

const PORT = process.env.LOCAL_RUNNER_PORT || 3009;

async function main() {
  const server = await createServer();

  server.listen(PORT, () => {
    console.log(`[Local Runner] Listening on port ${PORT}`);
    console.log(`[Local Runner] Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Local Runner] Shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('[Local Runner] Interrupted, shutting down...');
    server.close(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error('[Local Runner] Fatal error:', error);
  process.exit(1);
});
```

#### 4.3 Servidor Express

**Archivo nuevo**: `api-security-analyzer-local-runner/src/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { healthRoute } from './routes/health';
import { executeRoute } from './routes/execute';
import { statusRoute } from './routes/status';

export async function createServer() {
  const app = express();

  // Solo acepta requests de localhost (seguridad)
  app.use(cors({
    origin: [
      'http://localhost:5173',    // Vite dev
      'tauri://localhost',         // Tauri app
      'https://tauri.localhost',   // Tauri app (alternativo)
    ],
  }));

  app.use(express.json({ limit: '10mb' }));

  // Rutas
  app.get('/health', healthRoute);
  app.post('/execute', executeRoute);
  app.get('/status/:runId', statusRoute);

  return app;
}
```

#### 4.4 Ruta /execute — Recibir y ejecutar TestPlan

**Archivo nuevo**: `api-security-analyzer-local-runner/src/routes/execute.ts`

```typescript
import type { Request, Response } from 'express';
import type { TestPlan } from '@katapult/security-test-core';
import { TestExecutor } from '../executor';
import { ResultReporter } from '../result-reporter';

// Map de ejecuciones activas
const activeRuns = new Map<string, TestExecutor>();

export async function executeRoute(req: Request, res: Response) {
  const plan: TestPlan = req.body;

  if (!plan.runId || !plan.endpoints?.length) {
    return res.status(400).json({ error: 'Invalid test plan' });
  }

  if (activeRuns.has(plan.runId)) {
    return res.status(409).json({ error: 'Test run already in progress' });
  }

  // Configurar el reporter que envia resultados al backend remoto
  const backendUrl = req.headers['x-backend-url'] as string;
  const authToken = req.headers['authorization'] as string;

  if (!backendUrl) {
    return res.status(400).json({ error: 'Missing x-backend-url header' });
  }

  const reporter = new ResultReporter(backendUrl, authToken);
  const executor = new TestExecutor(plan, reporter);

  activeRuns.set(plan.runId, executor);

  // Responder inmediatamente, ejecutar async
  res.status(202).json({
    message: 'Test execution started',
    runId: plan.runId,
    totalEndpoints: plan.endpoints.length,
  });

  // Ejecutar en background
  try {
    await executor.run();
  } finally {
    activeRuns.delete(plan.runId);
  }
}
```

#### 4.5 Executor — Orquestacion de tests

**Archivo nuevo**: `api-security-analyzer-local-runner/src/executor.ts`

```typescript
import {
  SecurityHttpClient,
  testNoAuth,
  testBola,
  testSqlInjection,
  testNoSqlInjection,
  testXss,
  testMassAssignment,
  testRateLimiting,
  testMethodTampering,
  testJwtAttacks,
  testBfla,
  testVerboseErrors,
  testContentType,
  type TestPlan,
  type TestResult,
  type SecurityCheck,
  type EndpointTestConfig,
} from '@katapult/security-test-core';
import type { ResultReporter } from './result-reporter';
import { AuthHandler } from './auth-handler';

export class TestExecutor {
  private client: SecurityHttpClient;
  private plan: TestPlan;
  private reporter: ResultReporter;
  private aborted = false;

  constructor(plan: TestPlan, reporter: ResultReporter) {
    this.plan = plan;
    this.reporter = reporter;
    this.client = new SecurityHttpClient({
      timeout: plan.settings.requestTimeout,
      maxConcurrent: plan.settings.maxConcurrent,
    });
  }

  async run(): Promise<void> {
    const { endpoints, credentials, settings } = this.plan;
    const total = endpoints.length;

    // Paso 1: Autenticacion — obtener tokens para cada credencial
    const authHandler = new AuthHandler(this.client);
    const tokens = await authHandler.authenticate(credentials);

    // Paso 2: Ejecutar tests por endpoint
    for (let i = 0; i < total; i++) {
      if (this.aborted) break;

      const endpoint = endpoints[i];
      const startedAt = new Date().toISOString();
      const checks: SecurityCheck[] = [];

      // Ejecutar cada tipo de test habilitado
      for (const testType of settings.enabledTests) {
        if (this.aborted) break;

        try {
          const testChecks = await this.executeTestType(
            testType,
            endpoint,
            credentials,
            tokens,
          );
          checks.push(...testChecks);
        } catch (error) {
          checks.push({
            testType,
            testName: testType,
            status: 'error',
            severity: 'info',
            description: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      }

      const result: TestResult = {
        runId: this.plan.runId,
        endpointId: endpoint.id,
        endpointUrl: endpoint.fullUrl,
        endpointMethod: endpoint.method,
        checks,
        startedAt,
        completedAt: new Date().toISOString(),
      };

      // Enviar resultado al backend
      const progress = Math.round(((i + 1) / total) * 100);
      await this.reporter.sendResults({
        runId: this.plan.runId,
        results: [result],
        progress,
        isComplete: i === total - 1,
      });
    }
  }

  abort(): void {
    this.aborted = true;
  }

  private async executeTestType(
    testType: string,
    endpoint: EndpointTestConfig,
    credentials: any[],
    tokens: Map<string, string>,
  ): Promise<SecurityCheck[]> {
    switch (testType) {
      case 'no-auth':
        return testNoAuth(this.client, endpoint);
      case 'bola':
        return testBola(this.client, endpoint, credentials, tokens);
      case 'injection-sql':
        return testSqlInjection(this.client, endpoint, tokens.values().next().value);
      case 'injection-nosql':
        return testNoSqlInjection(this.client, endpoint, tokens.values().next().value);
      case 'injection-xss':
        return testXss(this.client, endpoint, tokens.values().next().value);
      case 'mass-assignment':
        return testMassAssignment(this.client, endpoint, tokens.values().next().value);
      case 'rate-limiting':
        return testRateLimiting(this.client, endpoint, tokens.values().next().value);
      case 'method-tampering':
        return testMethodTampering(this.client, endpoint, tokens.values().next().value);
      case 'jwt-attacks':
        return testJwtAttacks(this.client, endpoint, tokens.values().next().value);
      case 'bfla':
        return testBfla(this.client, endpoint, credentials, tokens);
      case 'verbose-errors':
        return testVerboseErrors(this.client, endpoint, tokens.values().next().value);
      case 'content-type':
        return testContentType(this.client, endpoint, tokens.values().next().value);
      default:
        return [];
    }
  }
}
```

#### 4.6 Result Reporter — Enviar resultados al backend

**Archivo nuevo**: `api-security-analyzer-local-runner/src/result-reporter.ts`

```typescript
import axios from 'axios';
import type { LocalResultsBatch } from '@katapult/security-test-core';

export class ResultReporter {
  private backendUrl: string;
  private authToken: string;

  constructor(backendUrl: string, authToken: string) {
    this.backendUrl = backendUrl;
    this.authToken = authToken;
  }

  async sendResults(batch: LocalResultsBatch): Promise<void> {
    const url = `${this.backendUrl}/api/v1/test-runs/${batch.runId}/local-results`;

    try {
      await axios.post(url, batch, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authToken,
        },
        timeout: 30000,
      });
    } catch (error) {
      console.error(
        `[Reporter] Failed to send results for run ${batch.runId}:`,
        error instanceof Error ? error.message : error,
      );
      // Reintentar una vez
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await axios.post(url, batch, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.authToken,
          },
          timeout: 30000,
        });
      } catch (retryError) {
        console.error('[Reporter] Retry also failed:', retryError);
        throw retryError;
      }
    }
  }
}
```

#### 4.7 Empaquetar como ejecutable

**Agregar a** `api-security-analyzer-local-runner/package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "package": "pkg dist/index.js --targets node18-win-x64,node18-macos-x64,node18-linux-x64 --output bin/local-runner"
  },
  "devDependencies": {
    "pkg": "^5.8.0"
  }
}
```

#### 4.8 Verificacion Fase 4

```bash
cd api-security-analyzer-local-runner
npm run build
node dist/index.js

# En otra terminal:
curl http://localhost:3009/health
# Debe retornar: { "status": "ok", "version": "1.0.0" }

# Test con plan de prueba:
curl -X POST http://localhost:3009/execute \
  -H "Content-Type: application/json" \
  -H "x-backend-url: http://localhost:3008" \
  -H "Authorization: Bearer <token>" \
  -d '{"runId":"test-123","endpoints":[...],"credentials":[],"settings":{...}}'
# Debe retornar 202 y empezar a ejecutar tests
```

---

### FASE 5: Integrar Local Runner como sidecar de Tauri (2-3 dias)

#### 5.1 Compilar y ubicar el sidecar

```bash
cd api-security-analyzer-local-runner
npm run package
# Genera: bin/local-runner-win-x64.exe, bin/local-runner-macos-x64, bin/local-runner-linux-x64

# Copiar al directorio de sidecars de Tauri:
cp bin/local-runner-win-x64.exe ../api-security-analyzer-front/src-tauri/binaries/local-runner-x86_64-pc-windows-msvc.exe
cp bin/local-runner-macos-x64 ../api-security-analyzer-front/src-tauri/binaries/local-runner-aarch64-apple-darwin
cp bin/local-runner-linux-x64 ../api-security-analyzer-front/src-tauri/binaries/local-runner-x86_64-unknown-linux-gnu
```

Nota: Los nombres de archivo deben seguir la convencion de Tauri: `{sidecar-name}-{target-triple}`.

#### 5.2 Actualizar main.rs para lanzar el sidecar

**Archivo**: `api-security-analyzer-front/src-tauri/src/main.rs`

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Lanzar el Local Runner como sidecar
            let sidecar = app.shell().sidecar("local-runner").unwrap();
            let (mut rx, _child) = sidecar.spawn().expect("Failed to spawn local runner");

            // Log output del sidecar
            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        tauri::shell::CommandEvent::Stdout(line) => {
                            println!("[Local Runner] {}", String::from_utf8_lossy(&line));
                        }
                        tauri::shell::CommandEvent::Stderr(line) => {
                            eprintln!("[Local Runner Error] {}", String::from_utf8_lossy(&line));
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 5.3 Frontend: Comunicacion con Local Runner

**Archivo nuevo**: `api-security-analyzer-front/src/lib/localRunner.ts`

```typescript
import { isTauri, LOCAL_RUNNER_URL } from './environment';

/**
 * Verifica si el Local Runner esta disponible.
 * Solo funciona en Tauri.
 */
export async function checkLocalRunner(): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const res = await fetch(`${LOCAL_RUNNER_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Envia un TestPlan al Local Runner para ejecucion local.
 */
export async function executeLocalTestPlan(
  plan: unknown,
  backendUrl: string,
  authToken: string,
): Promise<{ success: boolean; message: string }> {
  if (!isTauri()) {
    return { success: false, message: 'Local runner only available in desktop app' };
  }

  try {
    const res = await fetch(`${LOCAL_RUNNER_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-backend-url': backendUrl,
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(plan),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message };
    }

    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    return { success: false, message: error.error || 'Execution failed' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Consulta el estado de una ejecucion en curso.
 */
export async function getLocalRunStatus(runId: string): Promise<{
  status: 'running' | 'completed' | 'error' | 'not-found';
  progress: number;
}> {
  try {
    const res = await fetch(`${LOCAL_RUNNER_URL}/status/${runId}`);
    if (res.ok) return res.json();
    return { status: 'not-found', progress: 0 };
  } catch {
    return { status: 'error', progress: 0 };
  }
}
```

#### 5.4 Verificacion Fase 5

```bash
cd api-security-analyzer-front
npx tauri dev
```

1. La app se abre y el Local Runner arranca automaticamente
2. En la consola de Tauri se ve: `[Local Runner] Listening on port 3009`
3. Desde la app, `checkLocalRunner()` retorna `true`
4. Si se cierra la app, el proceso del Local Runner tambien se cierra

---

### FASE 6: Modificar Backend para modo local (2-3 dias)

#### 6.1 Nuevo endpoint para recibir resultados locales

**Archivo a modificar**: `api-security-analyzer/src/modules/test-runs/test-runs.controller.ts`

Agregar nuevo endpoint:

```typescript
@Post(':runId/local-results')
@UseGuards(JwtAuthGuard)
async receiveLocalResults(
  @Param('projectId') projectId: string,
  @Param('runId') runId: string,
  @Body() batch: LocalResultsBatchDto,
  @Req() req: AuthenticatedRequest,
) {
  // 1. Validar que el test run pertenece al usuario
  // 2. Validar que el test run esta en modo 'local'
  // 3. Almacenar los resultados (misma logica que el modo remoto)
  // 4. Si batch.isComplete, trigger AI analysis
  // 5. Emitir progreso via WebSocket al frontend

  return this.testRunsService.processLocalResults(
    projectId,
    runId,
    req.user.id,
    batch,
  );
}
```

#### 6.2 Nuevo DTO para resultados locales

**Archivo nuevo**: `api-security-analyzer/src/modules/test-runs/dto/local-results.dto.ts`

```typescript
import { IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SecurityCheckDto {
  @IsString() testType: string;
  @IsString() testName: string;
  @IsString() status: 'pass' | 'fail' | 'error' | 'warning';
  @IsString() severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  @IsString() description: string;
  evidence?: any;
  credential?: string;
  payload?: string;
}

export class TestResultDto {
  @IsString() runId: string;
  @IsString() endpointId: string;
  @IsString() endpointUrl: string;
  @IsString() endpointMethod: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => SecurityCheckDto)
  checks: SecurityCheckDto[];
  @IsString() startedAt: string;
  @IsString() completedAt: string;
}

export class LocalResultsBatchDto {
  @IsString() runId: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => TestResultDto)
  results: TestResultDto[];
  @IsNumber() progress: number;
  @IsBoolean() isComplete: boolean;
}
```

#### 6.3 Agregar campo executionMode al modelo TestRun

**Archivo a modificar**: `api-security-analyzer/src/modules/test-runs/entities/test-run.entity.ts`

Agregar columna:
```typescript
@Column({
  type: 'enum',
  enum: ['remote', 'local'],
  default: 'remote',
})
executionMode: 'remote' | 'local';
```

#### 6.4 Endpoint para generar TestPlan (modo local)

**Archivo a modificar**: `api-security-analyzer/src/modules/test-runs/test-runs.controller.ts`

Agregar nuevo endpoint o modificar el existente de start:

```typescript
@Post(':runId/plan')
@UseGuards(JwtAuthGuard)
async getTestPlan(
  @Param('projectId') projectId: string,
  @Param('runId') runId: string,
  @Req() req: AuthenticatedRequest,
) {
  // Genera el TestPlan sin ejecutar los tests
  // El frontend/local-runner lo recibe y lo ejecuta localmente
  return this.testRunsService.generateTestPlan(projectId, runId, req.user.id);
}
```

#### 6.5 Modificar test-runs.service.ts

**Archivo a modificar**: `api-security-analyzer/src/modules/test-runs/test-runs.service.ts`

Agregar metodos:

```typescript
/**
 * Genera un TestPlan para ejecucion local (sin ejecutar tests).
 */
async generateTestPlan(projectId: string, runId: string, userId: string): Promise<TestPlan> {
  // 1. Cargar el test run, proyecto, endpoints y credenciales
  // 2. Construir el TestPlan con toda la configuracion
  // 3. Retornar el plan sin ejecutar
}

/**
 * Procesa resultados recibidos del Local Runner.
 */
async processLocalResults(
  projectId: string,
  runId: string,
  userId: string,
  batch: LocalResultsBatchDto,
): Promise<void> {
  // 1. Validar ownership
  // 2. Convertir y almacenar resultados (misma estructura que modo remoto)
  // 3. Actualizar progreso del test run
  // 4. Emitir progreso via WebSocket
  // 5. Si isComplete:
  //    a. Calcular summary (passed, failed, scores)
  //    b. Trigger AI analysis con Claude
  //    c. Marcar test run como 'completed'
}
```

#### 6.6 Agregar CORS para Tauri

**Archivo a modificar**: `api-security-analyzer/src/main.ts`

```typescript
app.enableCors({
  origin: [
    process.env.APP_FRONTEND_URL || 'http://localhost:5173',
    'tauri://localhost',
    'https://tauri.localhost',
  ],
  credentials: true,
});
```

#### 6.7 Verificacion Fase 6

```bash
cd api-security-analyzer
npm run build
npm run start:dev

# Test del nuevo endpoint:
curl -X POST http://localhost:3008/api/v1/projects/<id>/test-runs/<id>/local-results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"runId":"...","results":[...],"progress":100,"isComplete":true}'
```

---

### FASE 7: UI — Modo local en el frontend (2-3 dias)

#### 7.1 Indicador de Local Runner disponible

**Archivo a modificar**: `api-security-analyzer-front/src/components/project-detail/TestRunsTab.tsx`

Agregar en la UI de crear test run:
- Toggle "Execution Mode": Remote / Local
- Si `isTauri()` es false, deshabilitar opcion "Local"
- Si `isTauri()` es true, verificar `checkLocalRunner()` y mostrar estado:
  - Verde: "Local Runner connected"
  - Rojo: "Local Runner not available"
- Si modo Local seleccionado, al hacer "Start Test Run":
  1. Crear test run en backend con `executionMode: 'local'`
  2. Obtener TestPlan via `GET /test-runs/:id/plan`
  3. Enviar plan al Local Runner via `executeLocalTestPlan()`
  4. Mostrar progreso normalmente (el backend emite via WebSocket cuando recibe resultados)

#### 7.2 Badge de modo en vista de test run

**Archivo a modificar**: `api-security-analyzer-front/src/pages/TestRunPage.tsx`

Agregar badge junto al status badge:
```tsx
{run.executionMode === 'local' ? (
  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-0.5 text-sm text-amber-300">
    Local
  </span>
) : null}
```

#### 7.3 Settings del proyecto — URL local

**Archivo a modificar**: `api-security-analyzer-front/src/components/project-detail/SettingsTab.tsx`

Agregar seccion para configurar:
- "API Location": Cloud / Local
- Si Local: campo para URL base (default: `http://localhost:3000`)
- Boton "Test Connection" que hace un ping a la URL

#### 7.4 Verificacion Fase 7

1. Abrir app en Tauri
2. Ir a un proyecto > Test Runs
3. Verificar que aparece el toggle Remote/Local
4. Verificar que el badge "Local Runner connected" aparece en verde
5. Crear test run en modo Local contra API en localhost:3000
6. Verificar que el progreso se muestra en tiempo real
7. Verificar que los resultados aparecen cuando termina
8. Abrir la misma app en el navegador web
9. Verificar que el toggle Local esta deshabilitado con mensaje

---

### FASE 8: Build de produccion y distribucion (2-3 dias)

#### 8.1 Build del Local Runner
```bash
cd api-security-analyzer-local-runner
npm run build
npm run package
# Resultado: bin/local-runner-{platform}
```

#### 8.2 Build de Tauri
```bash
cd api-security-analyzer-front
npm run tauri build
# Resultado:
#   Windows: src-tauri/target/release/bundle/msi/Katapult-Security_1.0.0_x64.msi
#   macOS:   src-tauri/target/release/bundle/dmg/Katapult-Security_1.0.0_aarch64.dmg
#   Linux:   src-tauri/target/release/bundle/appimage/Katapult-Security_1.0.0_amd64.AppImage
```

#### 8.3 Auto-updater (opcional)

Configurar en `tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": ["https://releases.katapult.com/security/{{target}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "<tu-clave-publica>"
    }
  }
}
```

#### 8.4 Verificacion final

1. Instalar el .msi / .dmg / .AppImage en una maquina limpia
2. Abrir la app
3. Verificar que el Local Runner arranca (icono verde)
4. Login con cuenta existente
5. Crear proyecto con API local
6. Ejecutar test run en modo Local
7. Verificar resultados completos
8. Ejecutar test run en modo Remote contra API publica
9. Verificar que ambos modos funcionan

---

## Resumen de archivos

### Archivos NUEVOS a crear
| Ruta | Descripcion |
|------|-------------|
| `api-security-analyzer-front/src-tauri/` | Directorio completo de Tauri |
| `api-security-analyzer-front/src/lib/environment.ts` | Deteccion de entorno |
| `api-security-analyzer-front/src/lib/localRunner.ts` | Comunicacion con local runner |
| `packages/security-test-core/` | Paquete compartido de logica de tests |
| `api-security-analyzer-local-runner/` | Agente local runner completo |
| `back/.../dto/local-results.dto.ts` | DTO para resultados locales |

### Archivos EXISTENTES a modificar
| Ruta | Cambio |
|------|--------|
| `front/package.json` | Agregar deps Tauri |
| `front/vite.config.ts` | Corregir proxy port 3000→3008 |
| `front/src/lib/api.ts` | Usar getApiBaseUrl() |
| `front/.../TestRunsTab.tsx` | Toggle modo local/remoto |
| `front/.../TestRunPage.tsx` | Badge modo ejecucion |
| `front/.../SettingsTab.tsx` | Config URL local |
| `back/src/main.ts` | CORS para Tauri |
| `back/.../test-runs.controller.ts` | Endpoints /plan y /local-results |
| `back/.../test-runs.service.ts` | generateTestPlan(), processLocalResults() |
| `back/.../test-run.entity.ts` | Campo executionMode |
| `back/package.json` | Dep @katapult/security-test-core |

---

## Prerequisitos del sistema

- **Rust** (para compilar Tauri): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Node.js** >= 18
- **pkg** (para empaquetar local runner): `npm install -g pkg`
- **WebView2** (Windows, generalmente ya instalado en Windows 11)
