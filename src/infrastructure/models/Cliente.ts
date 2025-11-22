import mongoose from 'mongoose';

const ClienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    tipoCliente: {
        type: String,
        enum: ['regular', 'preferencial', 'corporativo'],
        default: 'regular'
    },
    limiteCredito: {
        type: Number,
        required: true,
        min: 0
    },
    saldoActual: {
        type: Number,
        default: 0,
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
    estado: {
        type: String,
        enum: ['activo', 'inactivo', 'moroso'],
        default: 'activo'
    },
    etiqueta: {
        type: String,
        default: ''
    },
    ultimaActualizacion: {
        type: Date,
        default: Date.now
    },
    periodoActual: {
        type: String
    },
    historialRapido: [{
        periodo: String,
        deudaTotal: Number,
        fechaConsulta: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Índices
ClienteSchema.index({ nombre: 'text' });
ClienteSchema.index({ estado: 1 });
ClienteSchema.index({ etiqueta: 1 });

// Exportar sin tipos
const Cliente = mongoose.model('Cliente', ClienteSchema);
export default Cliente;