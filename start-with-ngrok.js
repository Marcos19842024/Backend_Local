const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Función para actualizar el .env del frontend con la URL de ngrok
function updateFrontendEnv(ngrokUrl) {
  try {
    const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
    
    // Asegurar que la URL use HTTPS para ngrok
    let backendUrl = ngrokUrl;
    if (ngrokUrl.startsWith('http://') && ngrokUrl.includes('ngrok')) {
      // Forzar HTTPS para ngrok
      backendUrl = ngrokUrl.replace('http://', 'https://');
      console.log('🔄 Convirtiendo ngrok a HTTPS:', backendUrl);
    }
    
    backendUrl = `${backendUrl}/`;
    
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
    console.log('✅ Frontend .env actualizado con URL Ngrok:', backendUrl);
    
  } catch (error) {
    console.log('⚠️  No se pudo actualizar el .env del frontend:', error.message);
  }
}

// Función para iniciar la base de datos
async function startDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🗄️  Iniciando base de datos MongoDB...');
    
    const dbProcess = spawn('npm', ['run', 'db:start'], { 
      stdio: 'inherit' 
    });

    dbProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Base de datos iniciada correctamente');
        // Esperar 3 segundos para que la BD esté completamente lista
        setTimeout(resolve, 3000);
      } else {
        console.log('❌ Error al iniciar la base de datos');
        reject(new Error('No se pudo iniciar la base de datos'));
      }
    });

    dbProcess.on('error', (error) => {
      console.log('❌ Error al ejecutar db:start:', error.message);
      reject(error);
    });
  });
}

// Función para probar la conexión a la base de datos
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
        reject(new Error('Conexión a la base de datos falló'));
      }
    });

    testProcess.on('error', (error) => {
      console.log('❌ Error al probar conexión:', error.message);
      reject(error);
    });
  });
}

console.log('🚀 INICIANDO SISTEMA CON NGROK');
console.log('========================================\n');

async function startSystem() {
  const port = 3001;

  try {
    // 1. Iniciar base de datos
    await startDatabase();
    
    // 2. Probar conexión a la base de datos
    await testDatabaseConnection();

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

      // Manejar errores del backend
      backend.on('error', (error) => {
        console.log('❌ Error al iniciar el backend:', error.message);
      });

      // Esperar un poco más para que el backend esté completamente listo
      setTimeout(() => {
        console.log('\n🌐 INICIANDO NGROK...');
        console.log('   🔗 URL pública permanente\n');
        
        const ngrok = spawn('ngrok', ['http', port.toString(), '--log=stdout'], { 
          stdio: 'pipe'
        });

        let ngrokUrlFound = false;

        ngrok.stdout.on('data', (data) => {
          const output = data.toString();
          console.log('Ngrok:', output); // Debug
          
          // Capturar la URL de Ngrok
          if (output.includes('url=https://') && !ngrokUrlFound) {
            const urlMatch = output.match(/url=(https:\/\/[a-zA-Z0-9-]+\.ngrok(-free)?\.app)/);

            if (urlMatch) {
              ngrokUrlFound = true;
              const publicUrl = urlMatch[1];
              
              // ✅ ACTUALIZAR .env DEL FRONTEND CON LA URL DE NGROK
              updateFrontendEnv(publicUrl);
              
              console.log('🔄 Espera 5 segundos para que el backend procese los cambios...');
              
              // 🔄 REINICIAR SERVIDOR FRONTEND PARA APLICAR CAMBIOS
              setTimeout(() => {
                restartFrontendServer();
              }, 2000);

              // Abrir en el navegador después de esperar
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

      }, 10000); // Aumentar a 10 segundos para asegurar que el backend esté listo
    });

  } catch (error) {
    console.log('❌ Error crítico al iniciar el sistema:', error.message);
    console.log('💡 Asegúrate de que Docker esté ejecutándose y que el contenedor "mongodb" exista');
    process.exit(1);
  }
}

function restartFrontendServer() {
  try {
    console.log('🔄 Reiniciando servidor frontend...');
    
    // Enviar señal para recargar la configuración
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