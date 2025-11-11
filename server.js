// server.js
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// Almacenamiento en memoria para claves públicas de clientes
const clientPublicKeys = new Map();

// Generar par de claves RSA del servidor
const { publicKey: serverPublicKey, privateKey: serverPrivateKey } = 
  crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

console.log('🔐 Servidor iniciado con cifrado híbrido');
console.log('\n📋 Clave pública del servidor:');
console.log(serverPublicKey);

// 1. Endpoint para obtener la clave pública del servidor
app.get('/api/public-key', (req, res) => {
  res.json({ 
    publicKey: serverPublicKey,
    message: 'Usa esta clave para cifrar tu clave AES'
  });
});

// 2. Endpoint para registrar la clave pública del cliente
app.post('/api/register-client', (req, res) => {
  const { clientId, publicKey } = req.body;
  
  if (!clientId || !publicKey) {
    return res.status(400).json({ error: 'clientId y publicKey son requeridos' });
  }
  
  clientPublicKeys.set(clientId, publicKey);
  
  res.json({ 
    message: 'Cliente registrado exitosamente',
    clientId 
  });
});

// 3. Endpoint para enviar mensaje cifrado al servidor
app.post('/api/send-encrypted', (req, res) => {
  try {
    const { encryptedAESKey, encryptedData, iv, clientId } = req.body;
    
    if (!encryptedAESKey || !encryptedData || !iv) {
      return res.status(400).json({ 
        error: 'Se requieren encryptedAESKey, encryptedData e iv' 
      });
    }
    
    // Descifrar la clave AES con la clave privada RSA del servidor
    const aesKey = crypto.privateDecrypt(
      {
        key: serverPrivateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedAESKey, 'base64')
    );
    
    // Descifrar los datos con AES
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      aesKey,
      Buffer.from(iv, 'base64')
    );
    
    let decryptedData = decipher.update(encryptedData, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');
    
    console.log('📨 Mensaje recibido y descifrado:', decryptedData);
    
    // Preparar respuesta cifrada
    const responseData = {
      status: 'success',
      message: 'Mensaje recibido correctamente',
      originalMessage: decryptedData,
      timestamp: new Date().toISOString()
    };
    
    // Si el cliente proporcionó su ID y tiene clave pública registrada
    if (clientId && clientPublicKeys.has(clientId)) {
      const clientPubKey = clientPublicKeys.get(clientId);
      
      // Generar nueva clave AES para la respuesta
      const responseAESKey = crypto.randomBytes(32);
      const responseIV = crypto.randomBytes(16);
      
      // Cifrar datos de respuesta con AES
      const cipher = crypto.createCipheriv('aes-256-cbc', responseAESKey, responseIV);
      let encryptedResponse = cipher.update(JSON.stringify(responseData), 'utf8', 'base64');
      encryptedResponse += cipher.final('base64');
      
      // Cifrar la clave AES con la clave pública del cliente
      const encryptedResponseKey = crypto.publicEncrypt(
        {
          key: clientPubKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        responseAESKey
      );
      
      return res.json({
        encryptedAESKey: encryptedResponseKey.toString('base64'),
        encryptedData: encryptedResponse,
        iv: responseIV.toString('base64')
      });
    }
    
    // Si no hay clave pública del cliente, enviar sin cifrar
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error al descifrar:', error.message);
    res.status(400).json({ 
      error: 'Error al procesar el mensaje cifrado',
      details: error.message 
    });
  }
});

// 4. Endpoint de ejemplo para datos protegidos
app.get('/api/protected-data', (req, res) => {
  const { clientId } = req.query;
  
  if (!clientId || !clientPublicKeys.has(clientId)) {
    return res.status(400).json({ 
      error: 'Cliente no registrado. Usa /api/register-client primero' 
    });
  }
  
  const clientPubKey = clientPublicKeys.get(clientId);
  
  // Datos sensibles a proteger
  const sensitiveData = {
    userId: 12345,
    username: 'usuario_ejemplo',
    email: 'usuario@ejemplo.com',
    balance: 1500.50,
    timestamp: new Date().toISOString()
  };
  
  // Generar clave AES y IV
  const aesKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  
  // Cifrar datos con AES
  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  let encryptedData = cipher.update(JSON.stringify(sensitiveData), 'utf8', 'base64');
  encryptedData += cipher.final('base64');
  
  // Cifrar la clave AES con RSA
  const encryptedAESKey = crypto.publicEncrypt(
    {
      key: clientPubKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    aesKey
  );
  
  res.json({
    encryptedAESKey: encryptedAESKey.toString('base64'),
    encryptedData: encryptedData,
    iv: iv.toString('base64'),
    message: 'Datos cifrados con tu clave pública'
  });
});

// 5. Endpoint para generar par de claves (útil para Postman)
app.get('/api/generate-keys', (req, res) => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  res.json({
    publicKey,
    privateKey,
    message: 'Guarda estas claves para usarlas en tus pruebas'
  });
});

// 6. Endpoint para ayudar a cifrar un mensaje (para Postman)
app.post('/api/encrypt-helper', (req, res) => {
  try {
    const { message, targetPublicKey } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Se requiere el campo message' });
    }
    
    const publicKeyToUse = targetPublicKey || serverPublicKey;
    
    // Generar clave AES y IV
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    // Cifrar mensaje con AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedData = cipher.update(message, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    
    // Cifrar clave AES con RSA
    const encryptedAESKey = crypto.publicEncrypt(
      {
        key: publicKeyToUse,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      aesKey
    );
    
    res.json({
      encryptedAESKey: encryptedAESKey.toString('base64'),
      encryptedData: encryptedData,
      iv: iv.toString('base64'),
      message: 'Usa estos valores en /api/send-encrypted'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 7. Endpoint para descifrar una respuesta (helper para Postman)
app.post('/api/decrypt-helper', (req, res) => {
  try {
    const { encryptedAESKey, encryptedData, iv, privateKey } = req.body;
    
    if (!encryptedAESKey || !encryptedData || !iv || !privateKey) {
      return res.status(400).json({ 
        error: 'Se requieren: encryptedAESKey, encryptedData, iv, privateKey' 
      });
    }
    
    // Descifrar la clave AES con la clave privada RSA
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedAESKey, 'base64')
    );
    
    // Descifrar los datos con AES
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      aesKey,
      Buffer.from(iv, 'base64')
    );
    
    let decryptedData = decipher.update(encryptedData, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');
    
    res.json({
      decryptedData: decryptedData,
      message: 'Datos descifrados exitosamente'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 8. Endpoint de información
app.get('/api/info', (req, res) => {
  res.json({
    message: 'API de Cifrado Híbrido',
    encryption: {
      asymmetric: 'RSA-2048 con OAEP padding',
      symmetric: 'AES-256-CBC',
      hash: 'SHA-256'
    },
    endpoints: [
      'GET  /api/info - Esta información',
      'GET  /api/public-key - Obtener clave pública del servidor',
      'GET  /api/generate-keys - Generar par de claves RSA',
      'POST /api/register-client - Registrar cliente',
      'POST /api/encrypt-helper - Ayuda a cifrar un mensaje',
      'POST /api/send-encrypted - Enviar mensaje cifrado',
      'POST /api/decrypt-helper - Ayuda a descifrar respuesta',
      'GET  /api/protected-data?clientId=xxx - Obtener datos protegidos'
    ],
    registeredClients: clientPublicKeys.size
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor escuchando en http://localhost:${PORT}`);
  console.log('\n📚 Endpoints disponibles:');
  console.log('  GET  /api/info');
  console.log('  GET  /api/public-key');
  console.log('  GET  /api/generate-keys');
  console.log('  POST /api/register-client');
  console.log('  POST /api/encrypt-helper');
  console.log('  POST /api/send-encrypted');
  console.log('  POST /api/decrypt-helper');
  console.log('  GET  /api/protected-data?clientId=xxx');
  console.log('\n💡 Visita http://localhost:3000/api/info para más información');
});