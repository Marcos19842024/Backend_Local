export interface Cliente {
    id: string;
    nombre: string;
    tipoCliente: TipoCliente;
    limiteCredito: number;
    saldoInicial: number;
    metaPagoMensual?: number;
    mascotas: Mascota[];
    movimientos: Movimiento[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Mascota {
    id: string;
    nombre: string;
    especie: string;
    clienteId: string;
    createdAt: Date;
}

export interface Movimiento {
    id: string;
    fecha: Date;
    tipo: 'CONSUMO' | 'ABONO';
    concepto: string;
    categoria: CategoriaType;
    mascota?: string;
    monto: number;
    clienteId: string;
    createdAt: Date;
}

export enum TipoCliente {
    RECEPCION = 'RECEPCION',
    ADMINISTRACION = 'ADMINISTRACION',
    COLABORADORES = 'COLABORADORES'
}

export type CategoriaType = 
    | 'ESTETICA'
    | 'PENSION'
    | 'TRANSPORTE'
    | 'HOSPITALIZACION'
    | 'CIRUGIAS'
    | 'LABORATORIOS'
    | 'CONSULTAS'
    | 'TRATAMIENTOS'
    | 'FARMACIA'
    | 'TIENDA';

export interface CreateClienteRequest {
    nombre: string;
    tipoCliente: TipoCliente;
    limiteCredito: number;
    saldoInicial?: number;
}

export interface CreateMovimientoRequest {
    fecha: string;
    tipo: 'CONSUMO' | 'ABONO';
    concepto: string;
    categoria: CategoriaType;
    mascota?: string;
    monto: number;
}

export interface CreateMascotaRequest {
    nombre: string;
    especie: string;
}

export interface ReporteTipoCliente {
    tipoCliente: string;
    periodo: string;
    fechaExportacion: string;
    totalClientes: number;
    clientesDetalle: ClienteDetalle[];
    resumenCategorias: Record<string, number>;
    totales: TotalesTipo;
}

export interface ClienteDetalle {
    nombre: string;
    saldoInicial: number;
    consumosMes: number;
    abonosMes: number;
    saldoFinal: number;
    diferencia: number;
    estado: string;
    alertas: string[];
    consumosPorCategoria: Record<string, number>;
    consumosPorMascota: Record<string, number>;
}

export interface TotalesTipo {
    totalAdeudo: number;
    totalConsumos: number;
    totalAbonos: number;
}

export interface MetricasGlobales {
    totalClientes: number;
    totalAdeudo: number;
    totalConsumos: number;
    totalAbonos: number;
    porTipo: Record<string, {
        totalClientes: number;
        totalAdeudo: number;
        totalConsumos: number;
        totalAbonos: number;
    }>;
}