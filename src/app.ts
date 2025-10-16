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

app.use(cors())
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
const HOST = '0.0.0.0'
const localIP = getLocalIP()
const localURL = `http://${localIP}:${port}`

app.listen(port, HOST, () => {
    console.log('🚀 Servidor ejecutándose:')
    console.log(`📍 Local: http://localhost:${port}`)
    console.log(`🌐 Red: ${localURL}`)
    console.log(`📱 Accesible desde: ${localURL}`)
    console.log('====================================')
})

// Abrir automáticamente con la IP correcta
open(localURL)