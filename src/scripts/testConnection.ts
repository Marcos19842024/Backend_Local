import mongoose from 'mongoose';

async function testConnection() {
    try {
        console.log('🔌 Probando conexión a MongoDB...');
        
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_local';
        console.log('📡 Conectando a:', MONGODB_URI);
        
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        
        console.log('✅ Conexión exitosa a MongoDB!');
        
        // Verificar que la conexión tiene la base de datos
        if (mongoose.connection.db) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            console.log('📂 Colecciones encontradas:');
            if (collections.length > 0) {
                    collections.forEach(collection => {
                    console.log('   -', collection.name);
                });
            } else {
                console.log('   (No hay colecciones)');
            }
        } else {
            console.log('⚠️  Conexión establecida pero no se pudo acceder a la base de datos');
        }
        
    } catch (error: any) {
        console.error('❌ Error de conexión:');
        console.error('   Mensaje:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 SOLUCIÓN: MongoDB no está corriendo.');
            console.error('   Ejecuta: docker start mongodb');
            console.error('   O instala MongoDB localmente');
        } else if (error.name === 'MongoServerSelectionError') {
            console.error('\n💡 SOLUCIÓN: No se puede conectar al servidor MongoDB.');
            console.error('   Verifica que MongoDB esté corriendo en el puerto 27017');
        }
        
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            console.log('🔌 Conexión cerrada');
        }
        process.exit(0);
    }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
    testConnection();
}

export { testConnection };