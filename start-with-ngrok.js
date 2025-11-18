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

// Función para iniciar el servicio MongoDB
async function startMongoService() {
  return new Promise((resolve, reject) => {
    const startProcess = spawn('brew', ['services', 'start', 'mongodb/brew/mongodb-community'], { 
      stdio: 'inherit' 
    });

    startProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ MongoDB iniciado correctamente');
        console.log('⏳ Esperando que MongoDB esté listo...');
        // Esperar 5 segundos para que MongoDB esté completamente inicializado
        setTimeout(resolve, 5000);
      } else {
        // Intentar método alternativo
        console.log('🔄 Intentando método alternativo...');
        startMongoManual().then(resolve).catch(reject);
      }
    });

    startProcess.on('error', (error) => {
      console.log('❌ Error al iniciar con brew services:', error.message);
      startMongoManual().then(resolve).catch(reject);
    });
  });
}

// Método alternativo para iniciar MongoDB
async function startMongoManual() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Iniciando MongoDB manualmente...');
    
    const manualProcess = spawn('mongod', ['--config', '/usr/local/etc/mongod.conf'], { 
      stdio: 'inherit',
      detached: true // Ejecutar en proceso separado
    });

    manualProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ MongoDB iniciado manualmente');
        setTimeout(resolve, 5000);
      } else {
        console.log('⚠️  Verificando si MongoDB ya está ejecutándose en segundo plano...');
        // Verificar conexión directa
        testMongoConnection().then(resolve).catch(reject);
      }
    });

    manualProcess.on('error', (error) => {
      console.log('❌ Error al iniciar MongoDB manualmente:', error.message);
      testMongoConnection().then(resolve).catch(reject);
    });
  });
}

// Función para probar conexión directa a MongoDB
async function testMongoConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Probando conexión directa a MongoDB...');
    
    const net = require('net');
    const client = new net.Socket();
    
    client.setTimeout(5000);
    
    client.connect(27017, 'localhost', () => {
      console.log('✅ Conexión exitosa a MongoDB en localhost:27017');
      client.destroy();
      resolve();
    });
    
    client.on('timeout', () => {
      console.log('❌ Timeout conectando a MongoDB');
      client.destroy();
      reject(new Error('No se pudo conectar a MongoDB'));
    });
    
    client.on('error', (error) => {
      console.log('❌ Error de conexión a MongoDB:', error.message);
      client.destroy();
      
      // Preguntar si continuar sin base de datos
      console.log('\n💡 ¿Quieres continuar sin base de datos? (s/n)');
      process.stdin.once('data', (data) => {
        const answer = data.toString().trim().toLowerCase();
        if (answer === 's' || answer === 'y' || answer === 'si' || answer === 'yes') {
          console.log('🔄 Continuando sin base de datos...');
          resolve();
        } else {
          reject(new Error('Conexión a MongoDB falló'));
        }
      });
    });
  });
}

// Función para iniciar base de datos
async function startDatabase() {
  try {
    await startMongoDBLocal();
    console.log('✅ Base de datos MongoDB lista');
  } catch (error) {
    console.log('⚠️  No se pudo iniciar MongoDB:', error.message);
    console.log('🔄 Intentando continuar sin verificación de base de datos...');
    // Continuar sin base de datos
  }
}

// Función para probar conexión a la base de datos
async function testDatabaseConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Probando conexión a la base de datos...');
    
    const testProcess = spawn('npm', ['run', 'db:test'], { 
      stdio: 'inherit' 
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Conexión a la base de datos exitosa');
        resolve();
      } else {
        console.log('❌ Error en la conexión a la base de datos');
        
        // Preguntar si continuar sin base de datos
        console.log('💡 ¿Quieres continuar sin base de datos? (s/n)');
        process.stdin.once('data', (data) => {
          const answer = data.toString().trim().toLowerCase();
          if (answer === 's' || answer === 'y' || answer === 'si' || answer === 'yes') {
            console.log('🔄 Continuando sin base de datos...');
            resolve();
          } else {
            reject(new Error('Conexión a la base de datos falló'));
          }
        });
      }
    });

    testProcess.on('error', (error) => {
      console.log('❌ Error al probar conexión:', error.message);
      reject(error);
    });
  });
}

// Función para actualizar el .env del frontend con la URL de ngrok
function updateFrontendEnv(ngrokUrl) {
  try {
    const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
    
    let backendUrl = ngrokUrl;
    if (ngrokUrl.startsWith('http://') && ngrokUrl.includes('ngrok')) {
      backendUrl = ngrokUrl.replace('http://', 'https://');
      console.log('🔄 Convirtiendo ngrok a HTTPS:', backendUrl);
    }
    
    backendUrl = `${backendUrl}/`;
    
    let envContent = '';
    if (fs.existsSync(frontendEnvPath)) {
      envContent = fs.readFileSync(frontendEnvPath, 'utf8');
    }

    if (envContent.includes('VITE_URL_SERVER=')) {
      envContent = envContent.replace(
        /VITE_URL_SERVER=.*/,
        `VITE_URL_SERVER=${backendUrl}`
      );
    } else {
      envContent += `\nVITE_URL_SERVER=${backendUrl}\n`;
    }
    
    fs.writeFileSync(frontendEnvPath, envContent, 'utf8');
    console.log('✅ Frontend .env actualizado con URL Ngrok:', backendUrl);
    
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