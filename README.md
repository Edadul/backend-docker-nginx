# Backend API + Nginx con Docker Compose

## 1. Descripción de la solución

API REST desarrollada con **Node.js 24, Express 5 y TypeScript**, empaquetada en una imagen Docker multi-stage y publicada detrás de **Nginx**, que actúa como reverse proxy. Ambos servicios se orquestan con **Docker Compose**.

La API expone los siguientes endpoints:

| Método | Ruta                 | Descripción                                   |
| ------ | -------------------- | --------------------------------------------- |
| GET    | `/health`            | Health check del servicio                     |
| GET    | `/api/products`      | Lista todos los productos (datos mock)        |
| GET    | `/api/products/:id`  | Obtiene un producto por id (400 / 404 si falla) |

El contenedor de la API **no publica puertos al host**: el único punto de entrada es Nginx en el puerto `8080`.

## 2. Arquitectura implementada

```
                 Host (tu máquina)
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │   curl http://localhost:8080                             │
  │              │                                           │
  │              │  ports: "8080:8080"                       │
  │  ┌───────────┼──── red: backend-docker-nginx_default ──┐ │
  │  │           ▼                                         │ │
  │  │   ┌───────────────┐   proxy_pass    ┌────────────┐  │ │
  │  │   │    nginx      │ ──────────────▶ │    api     │  │ │
  │  │   │  :8080        │  http://api:3000│  :3000     │  │ │
  │  │   │ (reverse proxy)│                │ (Express)  │  │ │
  │  │   └───────────────┘                 └────────────┘  │ │
  │  │                                   expose: "3000"    │ │
  │  └─────────────────────────────────────────────────────┘ │
  └──────────────────────────────────────────────────────────┘
```

**Estructura del proyecto**

```
.
├── Dockerfile              # Imagen multi-stage de la API (builder + runner)
├── compose.yml             # Orquestación de api + nginx
├── nginx/nginx.conf        # Configuración del reverse proxy
├── src/
│   ├── main.ts             # Punto de entrada (lee PORT)
│   ├── app.ts              # Creación de la app Express
│   ├── routes.ts           # Router /api
│   └── modules/
│       ├── health/         # GET /health
│       └── products/       # routes → controller → repository → mock
├── package.json
└── tsconfig.json
```

**Componentes**

- **`api`** — Se construye desde el `Dockerfile`:
  - Etapa `builder`: instala todas las dependencias con pnpm y compila TypeScript a `dist/`.
  - Etapa `runner`: instala solo dependencias de producción y copia `dist/` desde el builder, generando una imagen final más liviana.
  - Escucha en el puerto `3000` (variable `PORT`) y solo lo expone dentro de la red de Docker (`expose`).
- **`nginx`** — Imagen `nginx:stable-alpine` con `nginx/nginx.conf` montado en solo lectura. Escucha en `8080`, reenvía todo el tráfico a `http://api:3000` y agrega las cabeceras `Host`, `X-Real-IP`, `X-Forwarded-For` y `X-Forwarded-Proto`. Publica el puerto `8080` al host y depende de `api` (`depends_on`).
- **Red** — Compose crea automáticamente la red bridge `backend-docker-nginx_default`, donde cada servicio se resuelve por su nombre gracias al DNS interno de Docker.

## 3. Instrucciones para ejecutar el proyecto

**Requisitos:** Docker y Docker Compose v2.

```bash
# 1. Clonar el repositorio y entrar a la carpeta
git clone <url-del-repositorio>
cd backend-docker-nginx

# 2. Construir las imágenes y levantar los servicios en segundo plano
docker compose up -d --build

# 3. Verificar que ambos contenedores estén corriendo
docker compose ps

# 4. Probar la API a través de Nginx
curl http://localhost:8080/health
curl http://localhost:8080/api/products
curl http://localhost:8080/api/products/1

# 5. Detener y eliminar los contenedores y la red
docker compose down
```

**Ejecución local sin Docker (opcional):**

```bash
pnpm install
pnpm run build
pnpm start        # http://localhost:3000
```

## 4. Comandos Docker utilizados

| Comando | Propósito |
| ------- | --------- |
| `docker compose up -d --build` | Construye la imagen de la API y levanta todos los servicios en segundo plano |
| `docker compose ps` | Lista los contenedores del proyecto, su estado y puertos |
| `docker compose logs api` / `docker compose logs nginx` | Muestra los logs de cada servicio |
| `docker compose logs -f` | Sigue los logs en tiempo real |
| `docker compose exec nginx wget -qO- http://api:3000/health` | Prueba la comunicación interna nginx → api por nombre de servicio |
| `docker compose restart nginx` | Reinicia Nginx tras modificar `nginx.conf` |
| `docker compose down` | Detiene y elimina contenedores y red |
| `docker build -t backend-api .` | Construye solo la imagen de la API |
| `docker images` | Lista las imágenes locales |
| `docker network ls` | Lista las redes (incluye `backend-docker-nginx_default`) |
| `docker network inspect backend-docker-nginx_default` | Muestra los contenedores conectados a la red y sus IPs |

## 5. `ports` vs `expose`

| | `ports` | `expose` |
| --- | --- | --- |
| Formato | `"HOST:CONTENEDOR"` (ej. `"8080:8080"`) | `"PUERTO"` (ej. `"3000"`) |
| Accesible desde el host | ✅ Sí | ❌ No |
| Accesible desde otros contenedores de la misma red | ✅ Sí | ✅ Sí |
| Uso en este proyecto | `nginx` → `8080:8080` | `api` → `3000` |

- **`ports`** publica (mapea) un puerto del contenedor en un puerto de la máquina host. Por eso `http://localhost:8080` llega a Nginx.
- **`expose`** solo documenta/declara el puerto para la red interna de Docker; **no** lo abre al host. La API es alcanzable por Nginx (`api:3000`), pero no directamente desde fuera.

Así se logra que **Nginx sea el único punto de entrada** y la API quede aislada. Se ve en `docker compose ps`: `api` muestra `3000/tcp` (sin mapeo) y `nginx` muestra `0.0.0.0:8080->8080/tcp`.

> Nota: dentro de una red definida por el usuario (como la que crea Compose), los contenedores pueden comunicarse por cualquier puerto en el que escuche el servicio, aunque no esté en `expose`. Aun así, `expose` es buena práctica porque documenta qué puerto usa el servicio.

## 6. `localhost` vs nombre del servicio Docker

Cada contenedor tiene **su propio namespace de red**, así que `localhost` (`127.0.0.1` / `::1`) significa cosas distintas según dónde se use:

| Desde dónde | `localhost` apunta a… | Cómo llegar a la API |
| --- | --- | --- |
| Host (tu máquina) | El propio host | `http://localhost:8080` (vía el puerto publicado de Nginx) |
| Contenedor `nginx` | El propio contenedor de Nginx | `http://api:3000` (nombre del servicio) |
| Contenedor `api` | El propio contenedor de la API | — |

- **`localhost`** dentro de un contenedor **no es el host ni otro contenedor**: es el mismo contenedor. Si Nginx hace `proxy_pass http://localhost:3000`, busca un proceso en el puerto 3000 *dentro del contenedor de Nginx*, donde no hay nada.
- **El nombre del servicio** (`api`) es resuelto por el **DNS interno de Docker** a la IP del contenedor en la red de Compose. Por eso `nginx.conf` usa `proxy_pass http://api:3000;`.

## 7. Evidencias de las pruebas realizadas

### Estado de los contenedores

```text
$ docker compose ps
NAME      IMAGE                     COMMAND                  SERVICE   STATUS         PORTS
api       backend-docker-nginx-api  "docker-entrypoint.s…"   api       Up 5 minutes   3000/tcp
nginx     nginx:stable-alpine       "/docker-entrypoint.…"   nginx     Up 5 minutes   80/tcp, 0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp
```

```text
$ docker compose logs api
api  | Server is running on port 3000
```

### Health check a través de Nginx

```text
$ curl -i http://localhost:8080/health
HTTP/1.1 200 OK
Server: nginx/1.30.5
Content-Type: application/json; charset=utf-8

{"status":"OK","message":"Health check passed","service":"Backend API","timestamp":"2026-09-27T21:31:55.130Z"}
```

La cabecera `Server: nginx/1.30.5` confirma que la respuesta pasó por el reverse proxy.

### Listado de productos

```text
$ curl -i http://localhost:8080/api/products
HTTP/1.1 200 OK
Server: nginx/1.30.5
Content-Type: application/json; charset=utf-8

[{"id":1,"name":"Mouse","description":"Description for Product 1","price":29.99,"stock":100},{"id":2,"name":"Keyboard","description":"Description for Product 2","price":49.99,"stock":50},{"id":3,"name":"Monitor","description":"Description for Product 3","price":199.99,"stock":20}]
```

### Producto por id

```text
$ curl -i http://localhost:8080/api/products/2
HTTP/1.1 200 OK
{"id":2,"name":"Keyboard","description":"Description for Product 2","price":49.99,"stock":50}

$ curl -i http://localhost:8080/api/products/99
HTTP/1.1 404 Not Found
{"message":"Product not found"}

$ curl -i http://localhost:8080/api/products/abc
HTTP/1.1 400 Bad Request
{"message":"Invalid product ID"}
```

### La API no es accesible directamente desde el host (`expose`)

```text
$ curl http://localhost:3000/health
curl: (7) Failed to connect to localhost port 3000 after 0 ms: Could not connect to server
```

### Comunicación interna por nombre de servicio

```text
$ docker compose exec nginx wget -qO- http://api:3000/health
{"status":"OK","message":"Health check passed","service":"Backend API","timestamp":"2026-09-27T21:31:55.420Z"}
```

## 8. Troubleshooting: error producido durante el ejercicio

### Síntoma

Se cambió en `nginx/nginx.conf` la línea

```nginx
proxy_pass http://api:3000;
```

por

```nginx
proxy_pass http://localhost:3000;
```

Tras reiniciar Nginx, cualquier petición devolvía **502 Bad Gateway**:

```text
$ curl -i http://localhost:8080/health
HTTP/1.1 502 Bad Gateway
Server: nginx/1.30.5
Content-Type: text/html

<html>
<head><title>502 Bad Gateway</title></head>
<body>
<center><h1>502 Bad Gateway</h1></center>
<hr><center>nginx/1.30.5</center>
```

### Diagnóstico

Los logs de Nginx (`docker compose logs nginx`) mostraban:

```text
[error] 30#30: *1 connect() failed (111: Connection refused) while connecting to upstream,
  client: 172.18.0.1, server: nginx, request: "GET /health HTTP/1.1",
  upstream: "http://127.0.0.1:3000/health", host: "localhost:8080"
```

- `502 Bad Gateway` indica que **Nginx sí recibió la petición**, pero **no pudo conectarse al upstream** (la API).
- `Connection refused` hacia `127.0.0.1:3000` confirma que Nginx intentaba conectarse a **su propio contenedor**, donde no hay nada escuchando en el puerto 3000.
- La API seguía funcionando correctamente: `docker compose exec nginx wget -qO- http://api:3000/health` respondía bien.

### Causa

Dentro de un contenedor, `localhost` apunta al propio contenedor (ver [sección 6](#6-localhost-vs-nombre-del-servicio-docker)). La API corre en **otro** contenedor, por lo que debe alcanzarse por el **nombre del servicio** definido en `compose.yml`, que el DNS interno de Docker resuelve a la IP correcta.

### Solución

Restaurar el nombre del servicio en `nginx/nginx.conf` y reiniciar Nginx:

```nginx
proxy_pass http://api:3000;
```

```bash
docker compose restart nginx
curl -i http://localhost:8080/health   # HTTP/1.1 200 OK
```
