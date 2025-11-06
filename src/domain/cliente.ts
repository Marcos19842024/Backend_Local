import { Schema, model } from 'mongoose';

export enum TipoCliente {
    RECEPCION = 'RECEPCION',
    ADMINISTRACION = 'ADMINISTRACION', 
    COLABORADOR = 'COLABORADOR'
}

// Schema SIN tipos genéricos para evitar errores
const clienteSchema = new Schema({
    nombre: String,
    tipoCliente: String,
    limiteCredito: Number,
    saldoInicial: { type: Number, default: 0 },
    metaPagoMensual: Number,
    mascotas: [{
        nombre: String,
        especie: String,
        createdAt: { type: Date, default: Date.now }
    }],
    movimientos: [{
        fecha: { type: Date, default: Date.now },
        tipo: String,
        concepto: String,
        categoria: String,
        mascota: String,
        monto: Number,
        createdAt: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

export const Cliente = model('Cliente', clienteSchema);

// Interface básica SIN relaciones complejas con Mongoose
export interface IClienteBasic {
    _id?: any;
    nombre: string;
    tipoCliente: TipoCliente;
    limiteCredito: number;
    saldoInicial: number;
    metaPagoMensual?: number;
    mascotas?: any[];
    movimientos?: any[];
    createdAt?: Date;
    updatedAt?: Date;
}