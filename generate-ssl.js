const fs = require('fs');
const crypto = require('crypto');
const forge = require('node-forge');

function generateSelfSignedCert() {
    console.log('🔐 Generando certificado SSL autofirmado...');
  
    // Generar par de claves
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // Crear certificado
    const cert = forge.pki.createCertificate();
    
    // Configurar atributos del certificado
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + crypto.randomBytes(8).toString('hex');
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
    // Configurar atributos del sujeto
    const attrs = [
        { name: 'commonName', value: 'localhost' },
        { name: 'countryName', value: 'AR' },
        { name: 'organizationName', value: 'Local Development' },
        { shortName: 'OU', value: 'Development' }
    ];
  
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    
    // Firmar el certificado
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Convertir a formato PEM
    const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
    const certPem = forge.pki.certificateToPem(cert);
    
    // Guardar archivos
    const sslDir = './ssl';
    if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir);
    }
    
    fs.writeFileSync(`${sslDir}/server.key`, privateKeyPem);
    fs.writeFileSync(`${sslDir}/server.cert`, certPem);
    
    console.log('✅ Certificados generados en:', sslDir);
    
    return { key: privateKeyPem, cert: certPem };
}

// Usar openssl si está disponible
function generateWithOpenSSL() {
    const { execSync } = require('child_process');
    const sslDir = './ssl';
  
    if (!fs.existsSync(sslDir)) {
        fs.mkdirSync(sslDir);
    }
  
    try {
        console.log('🔐 Generando certificado SSL con OpenSSL...');
        
        // Generar clave privada
        execSync(`openssl genrsa -out ${sslDir}/server.key 2048`);
        
        // Generar certificado autofirmado
        execSync(`openssl req -new -x509 -key ${sslDir}/server.key -out ${sslDir}/server.cert -days 365 -subj "/C=AR/ST=Buenos Aires/L=Localidad/O=Local Development/CN=localhost"`);
        
        console.log('✅ Certificados generados con OpenSSL en:', sslDir);
        
        return {
            key: fs.readFileSync(`${sslDir}/server.key`),
            cert: fs.readFileSync(`${sslDir}/server.cert`)
        };
    } catch (error) {
        console.log('⚠️  OpenSSL no disponible, usando generador interno...');
        return generateSelfSignedCert();
    }
}

// Ejecutar
try {
    generateWithOpenSSL();
} catch (error) {
    console.error('❌ Error generando certificados:', error.message);
}