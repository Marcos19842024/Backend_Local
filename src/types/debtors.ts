import { TipoCliente } from '../domain/cliente';

export { TipoCliente } from '../domain/cliente';

// Interfaces para requests (sin enum duplicado)
export interface CreateClienteRequest {
    nombre: string;
    tipoCliente: TipoCliente;
    limiteCredito: number;
    saldoInicial?: number;
    metaPagoMensual?: number;
}

export interface CreateMascotaRequest {
    nombre: string;
    especie: string;
}

export interface CreateMovimientoRequest {
    fecha: string;
    tipo: 'CONSUMO' | 'ABONO';
    concepto: string;
    categoria: string;
    mascota?: string;
    monto: number;
}