import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config(); // Cargar variables de entorno

const resetDatabase = async (): Promise<void> => {
  let client: MongoClient;

  try {
    // Conexión a MongoDB
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/debtors-app';
    client = new MongoClient(connectionString);
    
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db();

    // Listar todas las colecciones existentes
    const collections = await db.listCollections().toArray();
    console.log('📋 Colecciones existentes:', collections.map(c => c.name));

    // Eliminar todas las colecciones de la aplicación anterior
    const collectionsToDelete = [
      'clientes',
      'users', 
      'invoices',
      'checklists',
      'orgcharts',
      'mydocuments'
      // Agrega aquí cualquier otra colección que quieras eliminar
    ];

    for (const collectionName of collectionsToDelete) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          await collection.drop();
          console.log(`🗑️  Colección '${collectionName}' eliminada (${count} documentos)`);
        } else {
          console.log(`ℹ️  Colección '${collectionName}' ya está vacía`);
        }
      } catch (error) {
        console.log(`ℹ️  Colección '${collectionName}' no existe o no se pudo eliminar`);
      }
    }

    // Crear colecciones nuevas con índices
    console.log('🔄 Creando nuevas colecciones...');

    // Colección de clientes
    const clientesCollection = db.collection('clientes');
    await clientesCollection.createIndex({ nombre: 1 }, { unique: true });
    await clientesCollection.createIndex({ tipoCliente: 1 });
    await clientesCollection.createIndex({ estado: 1 });
    console.log('✅ Colección "clientes" creada con índices');

    // Insertar datos de ejemplo
    const clientesEjemplo = [
      {
        nombre: 'Empresa ABC S.A.',
        tipoCliente: 'corporativo',
        limiteCredito: 50000,
        saldoActual: 15000,
        estado: 'activo',
        contacto: {
          email: 'contacto@empresaabc.com',
          telefono: '+1234567890',
          direccion: 'Av. Principal 123'
        },
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      },
      {
        nombre: 'Comercial XYZ Ltda.',
        tipoCliente: 'preferencial',
        limiteCredito: 25000,
        saldoActual: 8000,
        estado: 'activo',
        contacto: {
          email: 'info@comercialxyz.com',
          telefono: '+0987654321',
          direccion: 'Calle Secundaria 456'
        },
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      },
      {
        nombre: 'Distribuidora Norte',
        tipoCliente: 'regular',
        limiteCredito: 10000,
        saldoActual: 12000,
        estado: 'moroso',
        contacto: {
          email: 'ventas@distribuidoranorte.com',
          telefono: '+1122334455',
          direccion: 'Zona Industrial 789'
        },
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      }
    ];

    await clientesCollection.insertMany(clientesEjemplo);
    console.log(`✅ ${clientesEjemplo.length} clientes de ejemplo insertados`);

    // Verificar la creación
    const totalClientes = await clientesCollection.countDocuments();
    console.log(`📊 Total de clientes en la base de datos: ${totalClientes}`);

    console.log('🎉 Base de datos resetada exitosamente!');
    console.log('🚀 La aplicación está lista para usar con MongoDB');

  } catch (error) {
    console.error('❌ Error al resetear la base de datos:', error);
    throw error;
  } finally {
    if (client!) {
      await client.close();
      console.log('🔌 Conexión a MongoDB cerrada');
    }
  }
};

// Ejecutar el reset si se llama directamente
if (require.main === module) {
  resetDatabase().catch(console.error);
}

export { resetDatabase };