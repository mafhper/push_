[English](README.md) | [Português (Brasil)](README.pt-BR.md) | [Español](README.es.md)

# Push_

Push_ es un dashboard de atención para repositorios en GitHub, construido para una tarea principal: mostrar primero lo que necesita acción.

Funciona en dos modos:
- `localhost`: modo local seguro, con token de GitHub solo en memoria para descubrir repositorios y obtener diagnósticos más ricos
- `GitHub Pages`: modo público por snapshot, con datos estáticos y sin flujo de token en el navegador

## Por qué existe

Muchos dashboards personales desperdician espacio con métricas de vanidad. Push_ está guiado por señales operativas:
- alertas abiertos
- salud degradada del repositorio
- fallos de workflow
- actividad detenida
- movimiento reciente entre los repositorios observados

## Capacidades clave

- Dashboard guiado por atención, ordenado por presión de problema y movimiento reciente
- Página de detalle por repositorio con contexto de health, workflow, security y commits recientes
- Inspección de perfil público sin token para repositorios públicos
- Publicación por snapshot para un runtime seguro en Pages
- Soporte de idioma para `en`, `pt-BR` y `es`
- Detección automática del idioma del navegador con override manual en settings

## Modos de runtime

### Modo local seguro

- Acepta token de GitHub solo en `localhost`
- Mantiene el token solo en memoria de la pestaña activa
- Permite descubrir repositorios públicos accesibles y elegir qué entra al dashboard

### Modo público por snapshot

- Sirve JSON estático generado por adelantado
- Nunca acepta token en el navegador
- Mantiene deep links e inspección de repositorio público de forma segura

## Instalación

```bash
npm ci
```

Opcional, pero recomendado:

```bash
npm run hooks:install
```

Eso instala el hook versionado en `.githooks/pre-push`, para que cada `push` ejecute primero el gate local.

## Uso local

Iniciar la aplicación:

```bash
npm run dev
```

Iniciar con una sincronización nueva de snapshot:

```bash
npm run dev:snapshot
```

Generar los datos de snapshot manualmente:

```bash
npm run data:sync
```

## Snapshot y modo público

- El sitio publicado lee datos de snapshot desde `data/`
- La generación de snapshot puede ejecutarse localmente o en GitHub Actions
- El modo de perfil público puede inspeccionar datos públicos de GitHub sin autenticación

## Modelo de seguridad

- El runtime publicado en GitHub Pages no acepta token
- Ningún token se persiste en `localStorage`, `sessionStorage`, cookies ni en el bundle estático
- El modo local seguro mantiene credenciales solo en memoria
- Las validaciones sensibles bloquean regresiones comunes antes del `push`

## Validación y gates de calidad

Comandos principales:

```bash
npm run lint
npm run type-check
npm run test:ci
npm run validate
```

Cobertura del gate:
- lint y tipado estático
- tests
- integridad de claves de locale y validación de jerga reservada
- consistencia de documentación
- comprobaciones de patrones seguros de código
- comprobaciones de patrones del repositorio
- auditoría del build público

El workflow de GitHub Pages usa el mismo punto de entrada:

```bash
npm run audit
```
