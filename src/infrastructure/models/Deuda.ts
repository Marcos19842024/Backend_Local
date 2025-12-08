import mongoose from 'mongoose';

const DeudaSchema = new mongoose.Schema({
    periodo: { type: String, required: true },
    tipoPeriodo: { type: String, enum: ['dia', 'semana', 'mes'], default: 'mes' },
    fechaAlbaran: { type: String },
    clienteNombre: { type: String, required: true },
    clienteId: { type: String },
    totalImporte: { type: Number, default: 0 },
    cobradoLinea: { type: Number, default: 0 },
    deuda: { type: Number, default: 0 },
    paciente: { type: String },
    etiqueta: { type: String }
}, {
    timestamps: true
});

export default mongoose.model('Deuda', DeudaSchema);