const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const interfaceName of Object.keys(interfaces)) {
    const interfaceInfo = interfaces[interfaceName];
    for (const info of interfaceInfo) {
      if (info.family === 'IPv4' && !info.internal && info.address.startsWith('192.168.')) {
        return info.address;
      }
    }
  }
  
  return 'localhost';
}

function findAvailablePort(startPort = 3001) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Función para actualizar el .env del frontend
function updateFrontendEnv(ip, port) {
  try {
    const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
    const backendUrl = `http://${ip}:${port}/`;
    
    // Leer el archivo .env actual
    let envContent = '';
    if (fs.existsSync(frontendEnvPath)) {
      envContent = fs.readFileSync(frontendEnvPath, 'utf8');
    }

    // Actualizar o agregar la variable VITE_URL_SERVER
    if (envContent.includes('VITE_URL_SERVER=')) {
      // Reemplazar la URL existente
      envContent = envContent.replace(
        /VITE_URL_SERVER=.*/,
        `VITE_URL_SERVER=${backendUrl}`
      );
    } else {
      // Agregar nueva variable
      envContent += `\nVITE_URL_SERVER=${backendUrl}\n`;
    }
    
    // Escribir el archivo actualizado
    fs.writeFileSync(frontendEnvPath, envContent, 'utf8');
    console.log('✅ Frontend .env actualizado:', backendUrl);
    
  } catch (error) {
    console.log('⚠️  No se pudo actualizar el .env del frontend:', error.message);
  }
}

async function startServer() {
  const ip = getLocalIP();
  const availablePort = await findAvailablePort(3001);
  const url = `http://${ip}:${availablePort}`;

  console.log('========================================');
  console.log('🛒 ECOMMERCE - DETECCIÓN AUTOMÁTICA DE IP');
  console.log('========================================');
  console.log(`📍 IP Detectada: ${ip}`);
  console.log(`🌐 Puerto: ${availablePort}`);
  console.log(`📱 URL de acceso:`);
  console.log(`   ${url}`);
  console.log('========================================');
  
  // ✅ ACTUALIZAR .env DEL FRONTEND
  updateFrontendEnv(ip, availablePort);
  
  // console.log('🚀 Iniciando servidor...\n');

  // Abrir automáticamente en el navegador
  // setTimeout(() => {
  //   try {
  //     const { exec } = require('child_process');
  //     exec(`open ${url}`, (error) => {
  //       if (error) {
  //         console.log(`⚠️  No se pudo abrir automáticamente`);
  //         console.log(`📱 Accede manualmente a: ${url}`);
  //       } else {
  //         console.log(`🌐 Navegador abierto en: ${url}`);
  //       }
  //     });
  //   } catch (err) {
  //     console.log(`📱 Accede manualmente a: ${url}`);
  //   }
  // }, 3000);

  // Ejecutar el servidor TypeScript
  const server = spawn('npx', ['ts-node', './dist/app.js'], { 
    stdio: 'inherit',
    env: { 
      ...process.env,
      LOCAL_IP: ip,
      PORT: availablePort.toString()
    }
  });

  server.on('close', (code) => {
    console.log(`\nServidor terminado con código: ${code}`);
  });
}

startServer().catch(console.error);