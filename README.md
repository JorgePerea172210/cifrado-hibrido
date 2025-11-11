# 🔐 API con Cifrado Híbrido

API REST desarrollada en Express.js que implementa cifrado híbrido combinando **RSA-2048** (cifrado asimétrico) y **AES-256-CBC** (cifrado simétrico) para comunicación segura.

## Descripción del Funcionamiento

### ¿Qué es el Cifrado Híbrido?

El cifrado híbrido combina dos tipos de cifrado para aprovechar las ventajas de ambos:

1. **Cifrado Asimétrico (RSA-2048)**
   - Se usa para intercambiar claves de forma segura
   - Cada parte tiene un par de claves: pública (compartida) y privada (secreta)
   - Es seguro pero lento para datos grandes

2. **Cifrado Simétrico (AES-256-CBC)**
   - Se usa para cifrar los datos reales
   - Usa una única clave compartida
   - Es muy rápido para grandes volúmenes de datos

### Flujo de Comunicación

```
Cliente                                    Servidor
   |                                          |
   |------ 1. Solicita clave pública -------->|
   |<----- Envía clave pública RSA -----------|
   |                                          |
   |------ 2. Registra su clave pública ----->|
   |                                          |
   |   3. Genera clave AES aleatoria          |
   |   4. Cifra datos con AES                 |
   |   5. Cifra clave AES con RSA pública     |
   |                                          |
   |------ 6. Envía datos + clave cifrados -->|
   |                                          |
   |                                     7. Descifra clave AES con RSA privada
   |                                     8. Descifra datos con clave AES
   |                                     9. Procesa el mensaje
   |                                     10. Cifra respuesta igual que pasos 3-5
   |                                          |
   |<----- 11. Envía respuesta cifrada -------|
   |                                          |
   | 12. Descifra respuesta con su clave privada
```

### Ventajas de este Enfoque

**Seguridad**: La clave AES viaja cifrada con RSA  
**Velocidad**: Los datos se cifran con AES (rápido)  
**Escalabilidad**: Cada cliente tiene sus propias claves  
**Confidencialidad**: Solo el destinatario puede descifrar

## Instalación y Ejecución

### Requisitos Previos

- Node.js v16 o superior
- pnpm (gestor de paquetes)

### Pasos para Ejecutar

1. **Clonar o crear el proyecto**
```bash
mkdir api-cifrado-hibrido
cd api-cifrado-hibrido
```

2. **Crear los archivos necesarios**
   - `package.json` - Configuración del proyecto
   - `server.js` - Código del servidor

3. **Instalar dependencias**
```bash
pnpm install
```

4. **Iniciar el servidor**
```bash
pnpm start
```

5. **Verificar que funciona**

Abre tu navegador en: `http://localhost:3000/api/info`

Si ves un JSON con información de la API, ¡está funcionando! 🎉

## Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/info` | Información general de la API |
| GET | `/api/public-key` | Obtiene la clave pública del servidor |
| GET | `/api/generate-keys` | Genera un par de claves RSA para el cliente |
| POST | `/api/register-client` | Registra la clave pública del cliente |
| POST | `/api/encrypt-helper` | Helper para cifrar mensajes |
| POST | `/api/send-encrypted` | Envía un mensaje cifrado al servidor |
| POST | `/api/decrypt-helper` | Helper para descifrar respuestas |
| GET | `/api/protected-data` | Obtiene datos sensibles cifrados |

## Pruebas con Postman

### Flujo Básico

1. **Generar claves del cliente**
   ```
   GET http://localhost:3000/api/generate-keys
   ```
   Guarda `publicKey` y `privateKey`

2. **Registrar cliente**
   ```
   POST http://localhost:3000/api/register-client
   Body: { "clientId": "test_123", "publicKey": "..." }
   ```

3. **Cifrar mensaje**
   ```
   POST http://localhost:3000/api/encrypt-helper
   Body: { "message": "Hola servidor" }
   ```

4. **Enviar mensaje cifrado**
   ```
   POST http://localhost:3000/api/send-encrypted
   Body: { "clientId": "test_123", "encryptedAESKey": "...", ... }
   ```

5. **Descifrar respuesta**
   ```
   POST http://localhost:3000/api/decrypt-helper
   Body: { "encryptedAESKey": "...", "privateKey": "..." }
   ```

## Tecnologías Utilizadas

- **Express.js** - Framework web
- **Node.js crypto** - Módulo de cifrado nativo
- **RSA-2048** - Algoritmo asimétrico con OAEP padding
- **AES-256-CBC** - Algoritmo simétrico
- **SHA-256** - Función hash

## Estructura del Proyecto

```
api-cifrado-hibrido/
├── package.json      # Configuración y dependencias
├── server.js         # Código principal del servidor
├── README.md         # Este archivo
└── node_modules/     # Dependencias (generado automáticamente)
```

Jorge Iván Perea Cárdenas - IDGS15