import mongoose from 'mongoose';

const RegistroExcelSchema = new mongoose.Schema({
    periodo: { type: String, required: true },
    tipoPeriodo: { type: String, enum: ['dia', 'semana', 'mes'], default: 'mes' },
    fechaAlbaran: { type: String },
    clienteNombre: { type: String, required: true },
    totalImporte: { type: Number, default: 0 },
    cobradoLinea: { type: Number, default: 0 },
    deuda: { type: Number, default: 0 },
    paciente: { type: String },
    etiqueta: { type: String },
    fechaProcesamiento: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Índice para búsquedas eficientes
RegistroExcelSchema.index({ periodo: 1, clienteNombre: 1 });

export default mongoose.model('RegistroExcel', RegistroExcelSchema);