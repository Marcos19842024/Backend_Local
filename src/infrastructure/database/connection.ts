import mongoose from 'mongoose';

class Database {
    private static instance: Database;
    private isConnected: boolean = false;

    private constructor() {}

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        try {
            const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce_local';
            
            await mongoose.connect(MONGODB_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            this.isConnected = true;
            console.log('✅ Conectado a MongoDB');

        } catch (error) {
            console.error('❌ Error conectando a MongoDB:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (!this.isConnected) return;
        
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('🔌 Desconectado de MongoDB');
    }

    public getConnectionStatus(): boolean {
        return this.isConnected;
    }
}

export default Database;