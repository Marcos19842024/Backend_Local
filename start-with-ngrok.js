const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Función para actualizar el .env del frontend con la URL de ngrok
function updateFrontendEnv(ngrokUrl) {
  try {
    const frontendEnvPath = path.join(__dirname, 'dist/Ecommerce_Local/.env');
    const backendUrl = `${ngrokUrl}/`;
    
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

console.log('🚀 INICIANDO SISTEMA CON NGROK');
console.log('========================================\n');

async function startSystem() {
  const port = 3001;

  console.log('📦 Compilando TypeScript...');
  
  const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });
  
  buildProcess.on('close', (code) => {
    if (code !== 0) return process.exit(1);
    
    console.log('✅ Compilación completada');
    console.log('🚀 Iniciando servidor backend...\n');

    const backend = spawn('node', ['dist/app.js'], { 
      stdio: 'inherit',
      env: { ...process.env, PORT: port.toString() }
    });

    setTimeout(() => {
      console.log('\n🌐 INICIANDO NGROK...');
      console.log('   🔗 URL pública permanente\n');
      
      const ngrok = spawn('ngrok', ['http', port.toString(), '--log=stdout'], { 
        stdio: 'pipe'
      });

      ngrok.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Capturar la URL de Ngrok
        if (output.includes('url=https://')) {
          const urlMatch = output.match(/url=(https:\/\/[a-f0-9-]+\.ngrok(-free)?\.app)/);
          if (urlMatch) {
            const publicUrl = urlMatch[1];
            console.log('\n🎉 ✅ URL PÚBLICA NGROK:', publicUrl);
            console.log('========================================');
            console.log('📱 ACCESO DESDE CUALQUIER DISPOSITIVO:');
            console.log(`   ${publicUrl}`);
            console.log(`   ${publicUrl}/checklist`);
            console.log(`   ${publicUrl}/api/config`);
            console.log('========================================\n');
            
            // ✅ ACTUALIZAR .env DEL FRONTEND CON LA URL DE NGROK
            updateFrontendEnv(publicUrl);
            
            // Abrir en el navegador
            setTimeout(() => {
              try {
                spawn('open', [publicUrl]);
              } catch (err) {
                console.log('📱 Abre manualmente:', publicUrl);
              }
            }, 3000);
          }
        }
      });

    }, 8000);
  });
}

process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo sistema...');
  process.exit(0);
});

startSystem().catch(console.error);