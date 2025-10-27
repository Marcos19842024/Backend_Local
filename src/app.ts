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

// Configuración CORS para desarrollo y producción
app.use(cors({
  origin: function (origin, callback) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      // URLs locales
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      
      // IPs locales
      /http:\/\/192\.168\.\d+\.\d+:?\d*/,
      /http:\/\/10\.\d+\.\d+\.\d+:?\d*/,
      /http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:?\d*/,
      
      // Ngrok URLs
      /https:\/\/[a-f0-9]+\.ngrok-free\.app/,
      /https:\/\/[a-f0-9-]+\.ngrok\.io/,
      
      // LocalTunnel URLs
      /https:\/\/[a-z-]+\.loca\.lt/,
      
      // Cloudflare Tunnel URLs
      /https:\/\/[a-z-]+\.mitunnel\.cloudflare\.com/,
      
      // Serveo URLs
      /https:\/\/[a-z-]+\.serveo\.net/
    ];

    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);

    // Verificar si el origin está permitido
    if (allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return origin === pattern;
      } else if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return false;
    })) {
      callback(null, true);
    } else {
      console.log('🚫 CORS bloqueado para origen:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json())
app.use(express.urlencoded({extended: false, limit: '50mb' }))
app.use(`/`,router)
app.get('/api/config', (req, res) => {
  const config = {
    apiUrl: `http://${getLocalIP()}:${port}`,
    backendIp: getLocalIP(),
    backendPort: port,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
  console.log('🔧 Configuración solicitada:', config.apiUrl);
  res.json(config);
});
app.use(history())
app.use(express.static(path + 'dist/Ecommerce_Local/dist/'))
app.use(express.static(path + 'tmp'))

// Configuración con IP automática
const HOST = '0.0.0.0'  // Escucha en todas las interfaces
const localIP = getLocalIP()
const localURL = `http://${localIP}:${port}`
const publicURL = `https://checklist.mitunnel.cloudflare.com`

// Servidor HTTP (existente)
app.listen(port, HOST, () => {
    console.log('🚀 Servidor ejecutándose:')
    console.log(`📍 Local: http://localhost:${port}`)
    console.log(`🌐 Red: ${localURL}`)
    console.log(`🌍 Público: ${publicURL}`)
    console.log('====================================')
})

// Abrir automáticamente con la IP correcta
open(localURL)