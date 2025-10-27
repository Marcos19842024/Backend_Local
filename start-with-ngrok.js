const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

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
          const urlMatch = output.match(/url=(https:\/\/[a-f0-9]+\.ngrok-free\.app)/);
          if (urlMatch) {
            const publicUrl = urlMatch[1];
            console.log('\n🎉 ✅ URL PÚBLICA NGROK:', publicUrl);
            console.log('========================================');
            console.log('📱 ACCESO DESDE CUALQUIER DISPOSITIVO:');
            console.log(`   ${publicUrl}`);
            console.log(`   ${publicUrl}/checklist`);
            console.log(`   ${publicUrl}/api/config`);
            console.log('========================================\n');
            
            // Abrir en el navegador
            setTimeout(() => {
              spawn('open', [publicUrl]);
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