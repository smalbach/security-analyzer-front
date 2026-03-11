# API Security Analyzer Front

Frontend en React + TypeScript + Tailwind para ejecutar el flujo completo desde `POST /analysis/preview-file`.

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

## Flujo implementado

1. Formulario de upload con todos los campos de Swagger para `preview-file`.
2. Inicio de analisis y obtencion de `analysisId`.
3. Polling automatico cada 5 segundos a `GET /analysis/{id}/status`.
4. Barra de progreso animada usando `progress.percentage`.
5. Al completar, carga de `GET /analysis/{id}/results`.
6. Descarga de reportes JSON/HTML/PDF.
7. Visualizador JSON con filtros por endpoint, metodo, severidad, resultado, categoria y busqueda.
