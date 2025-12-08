import mongoose from 'mongoose';

const DebtorSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    tipoCliente: { type: String, default: 'regular' },
    limiteCredito: { type: Number, default: 0 },
    saldoActual: { type: Number, default: 0 },
    estado: { type: String, enum: ['activo', 'moroso', 'inactivo'], default: 'activo' },
    etiqueta: { type: String, default: '' }
}, {
    timestamps: true
});

export default mongoose.model('Debtor', DebtorSchema);