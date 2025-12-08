import mongoose from 'mongoose';

const HistorialDeudaSchema = new mongoose.Schema({
    clienteId: { type: String, required: true },
    clienteNombre: { type: String, required: true },
    monto: { type: Number, required: true },
    descripcion: { type: String },
    tipo: { type: String, enum: ['deuda', 'pago', 'actualizacion'], default: 'deuda' }
}, {
    timestamps: true
});

export default mongoose.model('HistorialDeuda', HistorialDeudaSchema);