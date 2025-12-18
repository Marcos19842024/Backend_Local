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

// Verificar si hay certificados SSL
function hasSSLCertificates() {
  const sslDir = './ssl';
  return fs.existsSync(path.join(sslDir, 'server.key')) && fs.existsSync(path.join(sslDir, 'server.cert'));
}

// Función para actualizar el .env del frontend
function updateFrontendEnv(ip, port, useHttps = false) {
  const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
  const backendEnvPath = path.join(__dirname, '.env');

  try {
    const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
    const backendUrl = useHttps ? `https://${ip}:${port}/` : `http://${ip}:${port}/`;
    
    // Leer variables del .env del backend
    let user = '';
    let userid = '';
    
    if (fs.existsSync(backendEnvPath)) {
      const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
      
      // Buscar USUARIO
      const userMatch = backendEnvContent.match(/USUARIO=(.*)/);
      if (userMatch) user = userMatch[1].trim();
      
      // Buscar USUARIOID
      const useridMatch = backendEnvContent.match(/USUARIOID=(.*)/);
      if (useridMatch) userid = useridMatch[1].trim();
    }
    
    console.log('🔍 Valores encontrados:');
    console.log('   USUARIO:', user || 'No encontrado');
    console.log('   USUARIOID:', userid || 'No encontrado');

    // Leer el archivo .env actual
    let envContent = '';
    if (fs.existsSync(frontendEnvPath)) {
      envContent = fs.readFileSync(frontendEnvPath, 'utf8');
    }

    // Actualizar o agregar las variables
    if (envContent.includes('VITE_URL_SERVER=') && envContent.includes('VITE_USUARIO=') && envContent.includes('VITE_USUARIOID=')) {
      envContent = envContent.replace(/VITE_URL_SERVER=.*/, `VITE_URL_SERVER=${backendUrl}`);
      envContent = envContent.replace(/VITE_USUARIO=.*/, `VITE_USUARIO=${user}`);
      envContent = envContent.replace(/VITE_USUARIOID=.*/, `VITE_USUARIOID=${userid}`);
    } else {
      envContent += `\nVITE_URL_SERVER=${backendUrl}\nVITE_USUARIO=${user}\nVITE_USUARIOID=${userid}\n`;
    }
    
    // Agregar variable para HTTPS
    if (envContent.includes('VITE_HTTPS=')) {
      envContent = envContent.replace(/VITE_HTTPS=.*/, `VITE_HTTPS=${useHttps}`);
    } else {
      envContent += `VITE_HTTPS=${useHttps}\n`;
    }
    
    fs.writeFileSync(frontendEnvPath, envContent, 'utf8');
    console.log('✅ Frontend .env actualizado:');
    console.log('   🌐 URL:', backendUrl);
    console.log('   🔐 HTTPS:', useHttps);
    console.log('   👤 USUARIO:', user);
    console.log('   🆔 USUARIOID:', userid);
    
  } catch (error) {
    console.log('⚠️  No se pudo actualizar el .env del frontend:', error.message);
  }
}

async function startServer() {
  const ip = getLocalIP();
  const availablePort = await findAvailablePort(3001);
  const useHttps = hasSSLCertificates();
  const url = useHttps ? `https://${ip}:${availablePort}` : `http://${ip}:${availablePort}`;
  
  console.log(`🚀 Iniciando servidor...`);
  console.log(`   📍 IP: ${ip}`);
  console.log(`   🚪 Puerto: ${availablePort}`);
  console.log(`   🔐 HTTPS: ${useHttps ? 'Habilitado ✅' : 'Deshabilitado ⚠️'}`);
  
  if (!useHttps) {
    console.log('\n⚠️  ADVERTENCIA: SSL no configurado');
    console.log('   Para habilitar HTTPS, ejecuta:');
    console.log('   node generate-ssl.js');
    console.log('   o');
    console.log('   openssl req -x509 -newkey rsa:4096 -keyout ssl/server.key -out ssl/server.cert -days 365 -nodes -subj "/CN=localhost"');
  }
  
  // ✅ ACTUALIZAR .env DEL FRONTEND
  updateFrontendEnv(ip, availablePort, useHttps);

  // Ejecutar el servidor TypeScript
  const server = spawn('npx', ['ts-node', './dist/app.js'], { 
    stdio: 'inherit',
    env: { 
      ...process.env,
      LOCAL_IP: ip,
      PORT: availablePort.toString(),
      NODE_ENV: 'development'
    }
  });

  // Abrir automáticamente en el navegador (con retardo mayor)
  setTimeout(() => {
    try {
      const { exec } = require('child_process');
      const browserUrl = useHttps ? `https://localhost:${availablePort}` : url;
      
      console.log(`\n🌐 Intentando abrir navegador en: ${browserUrl}`);
      
      exec(`open ${browserUrl}`, (error) => {
        if (error) {
          console.log(`⚠️  No se pudo abrir automáticamente`);
          console.log(`\n📋 URLs disponibles:`);
          console.log(`   🔗 Local (IP): ${url}`);
          console.log(`   🔗 Localhost: ${useHttps ? `https://localhost:${availablePort}` : `http://localhost:${availablePort}`}`);
        } else {
          console.log(`🌐 Navegador abierto en: ${browserUrl}`);
        }
      });
    } catch (err) {
      console.log(`\n📋 URLs disponibles:`);
      console.log(`   🔗 Local (IP): ${url}`);
      console.log(`   🔗 Localhost: ${useHttps ? `https://localhost:${availablePort}` : `http://localhost:${availablePort}`}`);
    }
  }, 5000);

  server.on('close', (code) => {
    console.log(`\nServidor terminado con código: ${code}`);
  });
}

startServer().catch(console.error);