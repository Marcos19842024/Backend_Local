// app.ts - VERSIÓN COMPLETA CORREGIDA
import "dotenv/config"
import express from "express"
import cors from "cors"
import router from "./infrastructure/routes"
import open from "open"
import os from "os"

const port = parseInt(process.env.PORT || '3001')
const path = `${process.cwd()}/`
const app = express()
var history = require('connect-history-api-fallback')

// Función para obtener IP automáticamente
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();

  for (const interfaceName of Object.keys(interfaces)) {
    const interfaceInfo = interfaces[interfaceName];
    if (interfaceInfo) {
      for (const info of interfaceInfo) {
        if (info.family === 'IPv4' && !info.internal && info.address.startsWith('192.168.')) {
          return info.address;
        }
      }
    }
  }
  
  for (const interfaceName of Object.keys(interfaces)) {
    const interfaceInfo = interfaces[interfaceName];
    if (interfaceInfo) {
      for (const info of interfaceInfo) {
        if (info.family === 'IPv4' && !info.internal) {
          return info.address;
        }
      }
    }
  }
  
  return 'localhost';
}

// CONFIGURACIÓN CORS MÁS FLEXIBLE
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requests sin origin (como los de ngrok o apps móviles)
    if (!origin) {
      console.log('✅ CORS permitido (sin origin): posiblemente ngrok o app móvil');
      return callback(null, true);
    }
    
    // En desarrollo, permitir todos los orígenes
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ CORS permitido (desarrollo):', origin);
      return callback(null, true);
    }
      
    // En producción, usar la lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      /https:\/\/[a-zA-Z0-9-]+\.ngrok-free\.app/,
      /https:\/\/[a-zA-Z0-9-]+\.ngrok\.io/,
      /https:\/\/[a-zA-Z0-9-]+\.ngrok\.app/,
    ];

    if (allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') return origin === pattern;
      if (pattern instanceof RegExp) return pattern.test(origin);
      return false;
    })) {
      console.log('✅ CORS permitido:', origin);
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key'
  ],
  exposedHeaders: [
    'Content-Length', 
    'Content-Type',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// MIDDLEWARE CORS - DEBE SER EL PRIMERO
app.use(cors(corsOptions));

// Manejar preflight requests explícitamente para todas las rutas
app.options('*', cors(corsOptions));

// Middleware para logging de requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'undefined'} - Host: ${req.headers.host}`);
  next();
});

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: false, limit: '50mb' }))

// ROUTES
app.use(`/`, router)

// Config endpoint - CORREGIDO PARA MIXED CONTENT
app.get('/api/config', (req, res) => {
  const clientOrigin = req.headers.origin;
  const clientHost = req.headers.host;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  console.log('🔧 Config solicitada desde:');
  console.log('   - Origin:', clientOrigin || 'undefined');
  console.log('   - Host:', clientHost);
  console.log('   - IP:', clientIP);
  
  // Determinar la URL base para el cliente
  let apiUrl = `http://${getLocalIP()}:${port}`;
  
  // Si el cliente viene de ngrok, usar HTTPS y el mismo host
  if (clientOrigin && clientOrigin.includes('ngrok')) {
    apiUrl = clientOrigin; // Esto ya incluye https://
    console.log('   🔄 Usando URL ngrok (desde origin):', apiUrl);
  } else if (clientHost && clientHost.includes('ngrok')) {
    // Si el host es de ngrok pero el origin es undefined
    apiUrl = `https://${clientHost}`;
    console.log('   🔄 Usando host ngrok con HTTPS:', apiUrl);
  }
  
  const config = {
    apiUrl: apiUrl,
    backendIp: getLocalIP(),
    backendPort: port,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    clientInfo: {
      origin: clientOrigin,
      host: clientHost,
      ip: clientIP
    }
  };
  
  console.log('✅ Configuración enviada:', config.apiUrl);
  res.json(config);
});

// Static files - DESPUÉS de las rutas API
app.use(history())
app.use(express.static(path + 'dist/Ecommerce_Local/dist/'))
app.use(express.static(path + 'tmp'))

// Configuración con IP automática
const HOST = '0.0.0.0'  // Escucha en todas las interfaces
const localIP = getLocalIP()
const localURL = `http://${localIP}:${port}`
const publicURL = `https://checklist.mitunnel.cloudflare.com`

// Servidor HTTP
app.listen(port, HOST, () => {
  console.log('🚀 Servidor ejecutándose:')
  console.log(`📍 Local: http://localhost:${port}`)
  console.log(`🌐 Red: ${localURL}`)
  console.log(`🌍 Público: ${publicURL}`)
  console.log('✅ CORS configurado para:')
  console.log('   - Ngrok (*.ngrok-free.app, *.ngrok.io, *.ngrok.app)')
  console.log('   - Localhost (3000, 3001, 5173)')
  console.log('   - Requests sin origin (ngrok/apps móviles)')
  console.log('   - IPs locales (192.168.x.x, 10.x.x.x, 172.16-31.x.x)')
  console.log('====================================')
})

// Abrir automáticamente con la IP correcta
open(localURL)