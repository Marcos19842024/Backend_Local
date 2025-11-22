import mongoose from 'mongoose';

const HistorialDeudaSchema = new mongoose.Schema({
    clienteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cliente',
        required: true
    },
    clienteNombre: {
        type: String,
        required: true,
        trim: true
    },
    periodo: {
        type: String,
        required: true
    },
    deudaTotal: {
        type: Number,
        required: true,
        min: 0
    },
    deudaAnterior: {
        type: Number,
        default: 0,
        min: 0
    },
    variacion: {
        type: Number,
        default: 0
    },
    porcentajeVariacion: {
        type: Number,
        default: 0
    },
    totalRegistros: {
        type: Number,
        default: 0
    },
    registrosPendientes: {
        type: Number,
        default: 0
    },
    montoPromedio: {
        type: Number,
        default: 0
    },
    fuente: {
        type: String,
        enum: ['excel', 'sistema'],
        default: 'excel'
    },
    fechaProcesamiento: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Índices
HistorialDeudaSchema.index({ clienteId: 1, periodo: 1 });
HistorialDeudaSchema.index({ fechaProcesamiento: -1 });

const HistorialDeuda = mongoose.model('HistorialDeuda', HistorialDeudaSchema);
export default HistorialDeuda;