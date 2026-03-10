# API Security Analyzer Front

Frontend minimal en React + TypeScript + Tailwind con un unico formulario para el endpoint:

- `POST /analysis/preview-file`

## Requisitos

- Node.js 20+
- Backend `api-security-analyzer` ejecutandose

## Variables

Archivo `.env`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Ejecutar

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Campos implementados segun Swagger actual

- `file` (requerido)
- `baseUrl` (opcional)
- `projectName` (opcional)
- `crossUserPermutations` (`true|false`)
- `testInjections` (`true|false`)
- `testRateLimit` (`true|false`)
- `requestTimeout` (ms)

## Resultado mostrado

1. `analysisId` devuelto por `preview-file`.
2. Links GET construidos con ese ID (`status`, `results`, `report json/html/pdf`).
3. IDs (`endpointId`) de endpoints con metodo `GET` dentro del bloque `preview.endpoints`.
