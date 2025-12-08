import mongoose from 'mongoose';

const excelRegistroSchema = new mongoose.Schema({
    fecha: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fechaSubida: {
        type: Date,
        default: Date.now
    },
    nombreArchivo: String,
    registros: [{
        fechaAlbaran: String,
        clienteNombre: String,
        totalImporte: Number,
        cobradoLinea: Number,
        deuda: Number,
        paciente: String,
        etiqueta: String,
        clienteId: String,
        periodo: String,
        tipoPeriodo: String
    }],
    totalRegistros: Number,
    totalClientes: Number,
    totalDeuda: Number,
    procesado: {
        type: Boolean,
        default: false
    },
    usuario: {
        type: String,
        default: 'sistema'
    },
    metadata: {
        periodoOriginal: String,
        tipoPeriodoOriginal: String
    }
}, {
    timestamps: true
});

export default mongoose.model('ExcelRegistro', excelRegistroSchema);