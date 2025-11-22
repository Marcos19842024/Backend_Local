import mongoose from 'mongoose';

const excelRowSchema = new mongoose.Schema({
    fechaAlbaran: {
        type: String,
        trim: true
    },
    clienteNombre: {
        type: String,
        required: true,
        trim: true
    },
    totalImporte: {
        type: Number,
        default: 0,
        min: 0
    },
    cobradoLinea: {
        type: Number,
        default: 0,
        min: 0
    },
    deuda: {
        type: Number,
        default: 0,
        min: 0
    },
    paciente: {
        type: String,
        trim: true
    },
    etiqueta: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Índices para mejor performance
excelRowSchema.index({ clienteNombre: 'text' });
excelRowSchema.index({ etiqueta: 1 });

export default mongoose.model('ExcelRow', excelRowSchema);