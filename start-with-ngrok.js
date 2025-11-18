const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Función para verificar e iniciar MongoDB local con Brew
async function startMongoDBLocal() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Verificando estado de MongoDB local...');
    
    // Primero verificar si MongoDB ya está corriendo
    const checkProcess = spawn('brew', ['services', 'list'], { 
      stdio: 'pipe' 
    });

    let mongoRunning = false;
    let mongoInstalled = false;

    checkProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('mongodb/brew/mongodb-community') || output.includes('mongodb-community')) {
        mongoInstalled = true;
        if (output.includes('started') || output.includes('running')) {
          mongoRunning = true;
        }
      }
    });

    checkProcess.on('close', () => {
      if (!mongoInstalled) {
        console.log('❌ MongoDB no está instalado con Brew');
        console.log('💡 Ejecuta: brew install mongodb/brew/mongodb-community');
        reject(new Error('MongoDB no instalado'));
        return;
      }

      if (mongoRunning) {
        console.log('✅ MongoDB ya está ejecutándose');
        resolve();
      } else {
        console.log('🚀 Iniciando MongoDB con Brew services...');
        startMongoService().then(resolve).catch(reject);
      }
    });

    checkProcess.on('error', (error) => {
      console.log('❌ Error al verificar servicios Brew:', error.message);
      reject(error);
    });
  });
}

// Función para actualizar el .env del frontend con la URL de ngrok
function updateFrontendEnv(ngrokUrl) {
  try {
    const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
    const backendEnvPath = path.join(__dirname, '.env');
    
    let backendUrl = ngrokUrl;
    if (ngrokUrl.startsWith('http://') && ngrokUrl.includes('ngrok')) {
      backendUrl = ngrokUrl.replace('http://', 'https://');
      console.log('🔄 Convirtiendo ngrok a HTTPS:', backendUrl);
    }
    
    backendUrl = `${backendUrl}/`;
    
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
    
    fs.writeFileSync(frontendEnvPath, envContent, 'utf8');
    console.log('✅ Frontend .env actualizado:');
    console.log('   🌐 URL:', backendUrl);
    console.log('   👤 USUARIO:', user);
    console.log('   🆔 USUARIOID:', userid);
    
  } catch (error) {
    console.log('⚠️  No se pudo actualizar el .env del frontend:', error.message);
  }
}

console.log('🚀 INICIANDO SISTEMA CON NGROK');
console.log('========================================\n');

async function startSystem() {
  const port = 3001;

  try {
    console.log('📦 Compilando TypeScript...');
    
    const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
    
    buildProcess.on('close', (code) => {
      if (code !== 0) {
        console.log('❌ Error en la compilación');
        return process.exit(1);
      }
      
      console.log('✅ Compilación completada');
      console.log('🚀 Iniciando servidor backend...\n');

      const backend = spawn('node', ['dist/app.js'], { 
        stdio: 'inherit',
        env: { 
          ...process.env, 
          PORT: port.toString(),
          NODE_ENV: 'production'
        }
      });

      // Esperar para que el backend esté listo
      setTimeout(() => {
        console.log('\n🌐 INICIANDO NGROK...');
        console.log('   🔗 URL pública permanente\n');
        
        const ngrok = spawn('ngrok', ['http', port.toString(), '--log=stdout'], { 
          stdio: 'pipe'
        });

        let ngrokUrlFound = false;

        ngrok.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Ngrok:', output);
          
          if (output.includes('url=https://') && !ngrokUrlFound) {
            const urlMatch = output.match(/url=(https:\/\/[a-zA-Z0-9-]+\.ngrok(-free)?\.app)/);

            if (urlMatch) {
              ngrokUrlFound = true;
              const publicUrl = urlMatch[1];
              updateFrontendEnv(publicUrl);
              
              console.log('🔄 Espera 5 segundos para que el backend procese los cambios...');
              
              setTimeout(() => {
                restartFrontendServer();
              }, 2000);

              setTimeout(() => {
                try {
                  console.log('🌐 Abriendo navegador...');
                  spawn('open', [publicUrl]);
                } catch (err) {
                  console.log('📱 Abre manualmente:', publicUrl);
                }
              }, 5000);
            }
          }
        });

        ngrok.stderr.on('data', (data) => {
          console.error('Ngrok Error:', data.toString());
        });

      }, 10000);
    });

  } catch (error) {
    console.log('❌ Error crítico al iniciar el sistema:', error.message);
    console.log('\n💡 SOLUCIONES:');
    console.log('   1. Iniciar MongoDB manualmente: brew services start mongodb/brew/mongodb-community');
    console.log('   2. Verificar estado: brew services list');
    console.log('   3. O ejecutar sin base de datos (funcionalidad limitada)');
    process.exit(1);
  }
}

function restartFrontendServer() {
  try {
    console.log('🔄 Reiniciando servidor frontend...');
    
    const restartProcess = spawn('npm', ['run', 'dev'], { 
      stdio: 'inherit',
      cwd: path.join(__dirname, 'dist/Ecommerce_Local')
    });
    
    restartProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Frontend recargado con nueva configuración');
      } else {
        console.log('⚠️ No se pudo reiniciar el frontend automáticamente');
      }
    });
  } catch (error) {
    console.log('⚠️ Error al reiniciar frontend:', error.message);
  }
}

process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo sistema...');
  process.exit(0);
});

startSystem().catch(console.error);