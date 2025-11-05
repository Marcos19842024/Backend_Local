import { Cliente, CreateClienteRequest, CreateMascotaRequest, CreateMovimientoRequest, Mascota, Movimiento, TipoCliente } from "../types/debtors";

export class DebtorsModel {
    private clientes: Map<string, Cliente> = new Map();
    private movimientos: Map<string, Movimiento> = new Map();
    private mascotas: Map<string, Mascota> = new Map();

    constructor() {
        this.inicializarDatosEjemplo();
    }

    private inicializarDatosEjemplo(): void {
        // Datos de ejemplo para pruebas
        const clienteEjemplo: Cliente = {
            id: '1',
            nombre: 'Juan Pérez',
            tipoCliente: TipoCliente.RECEPCION,
            limiteCredito: 5000,
            saldoInicial: 0,
            mascotas: [],
            movimientos: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.clientes.set(clienteEjemplo.id, clienteEjemplo);
    }

    // 👥 MÉTODOS PARA CLIENTES
    async obtenerClientes(): Promise<Cliente[]> {
        return Array.from(this.clientes.values());
    }

    async obtenerClientePorId(id: string): Promise<Cliente | null> {
        return this.clientes.get(id) || null;
    }

    async obtenerClientePorNombre(nombre: string): Promise<Cliente | null> {
        for (const cliente of this.clientes.values()) {
            if (cliente.nombre.toLowerCase() === nombre.toLowerCase()) {
                return cliente;
            }
        }
        return null;
    }

    async crearCliente(clienteData: CreateClienteRequest): Promise<Cliente> {
        const id = this.generarId();
        const now = new Date();

        const nuevoCliente: Cliente = {
            id,
            nombre: clienteData.nombre,
            tipoCliente: clienteData.tipoCliente,
            limiteCredito: clienteData.limiteCredito,
            saldoInicial: clienteData.saldoInicial || 0,
            metaPagoMensual: clienteData.saldoInicial,
            mascotas: [],
            movimientos: [],
            createdAt: now,
            updatedAt: now
        };

        this.clientes.set(id, nuevoCliente);
        return nuevoCliente;
    }

    async actualizarCliente(id: string, clienteData: Partial<Cliente>): Promise<Cliente | null> {
        const cliente = this.clientes.get(id);
        if (!cliente) {
            return null;
        }

        const clienteActualizado: Cliente = {
            ...cliente,
            ...clienteData,
            updatedAt: new Date()
        };

        this.clientes.set(id, clienteActualizado);
        return clienteActualizado;
    }

    async eliminarCliente(id: string): Promise<boolean> {
        const cliente = this.clientes.get(id);
        if (!cliente) {
            return false;
        }

        // Eliminar movimientos y mascotas asociadas
        for (const movimiento of cliente.movimientos) {
            this.movimientos.delete(movimiento.id);
        }

        for (const mascota of cliente.mascotas) {
            this.mascotas.delete(mascota.id);
        }

        this.clientes.delete(id);
        return true;
    }

    // 🐾 MÉTODOS PARA MASCOTAS
    async agregarMascota(clienteId: string, mascotaData: CreateMascotaRequest): Promise<Mascota | null> {
        const cliente = this.clientes.get(clienteId);
        if (!cliente) {
            return null;
        }

        const mascotaId = this.generarId();
        const now = new Date();

        const nuevaMascota: Mascota = {
            id: mascotaId,
            nombre: mascotaData.nombre,
            especie: mascotaData.especie,
            clienteId,
            createdAt: now
        };

        this.mascotas.set(mascotaId, nuevaMascota);
        cliente.mascotas.push(nuevaMascota);
        cliente.updatedAt = now;

        return nuevaMascota;
    }

    async eliminarMascota(clienteId: string, mascotaId: string): Promise<boolean> {
        const cliente = this.clientes.get(clienteId);
        if (!cliente) {
            return false;
        }

        const mascotaIndex = cliente.mascotas.findIndex(m => m.id === mascotaId);
        if (mascotaIndex === -1) {
            return false;
        }

        cliente.mascotas.splice(mascotaIndex, 1);
        this.mascotas.delete(mascotaId);
        cliente.updatedAt = new Date();

        return true;
    }

    // 💰 MÉTODOS PARA MOVIMIENTOS
    async registrarMovimiento(clienteId: string, movimientoData: CreateMovimientoRequest): Promise<Movimiento | null> {
        const cliente = this.clientes.get(clienteId);
        if (!cliente) {
            return null;
        }

        const movimientoId = this.generarId();
        const now = new Date();

        const nuevoMovimiento: Movimiento = {
            id: movimientoId,
            fecha: new Date(movimientoData.fecha),
            tipo: movimientoData.tipo,
            concepto: movimientoData.concepto,
            categoria: movimientoData.categoria,
            mascota: movimientoData.mascota,
            monto: movimientoData.monto,
            clienteId,
            createdAt: now
        };

        this.movimientos.set(movimientoId, nuevoMovimiento);
        cliente.movimientos.push(nuevoMovimiento);
        cliente.updatedAt = now;

        return nuevoMovimiento;
    }

    async obtenerMovimientosCliente(clienteId: string, año?: number, mes?: number): Promise<Movimiento[]> {
        const cliente = this.clientes.get(clienteId);
        if (!cliente) {
            return [];
        }

        let movimientos = cliente.movimientos;

        if (año && mes) {
            movimientos = movimientos.filter(mov => {
                const fecha = new Date(mov.fecha);
                return fecha.getFullYear() === año && fecha.getMonth() + 1 === mes;
            });
        }

        return movimientos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    }

    // 📊 MÉTODOS PARA REPORTES
    async generarReporteTipoCliente(tipoCliente: TipoCliente, año: number, mes: number): Promise<any> {
        const clientesFiltrados = Array.from(this.clientes.values())
        .filter(cliente => cliente.tipoCliente === tipoCliente);

        const clientesDetalle = await Promise.all(
            clientesFiltrados.map(async (cliente) => {
                const movimientosMes = await this.obtenerMovimientosCliente(cliente.id, año, mes);
                
                const totalConsumos = movimientosMes
                .filter(mov => mov.tipo === 'CONSUMO')
                .reduce((sum, mov) => sum + mov.monto, 0);

                const totalAbonos = movimientosMes
                .filter(mov => mov.tipo === 'ABONO')
                .reduce((sum, mov) => sum + Math.abs(mov.monto), 0);

                const saldoInicial = this.calcularSaldoInicial(cliente, año, mes);
                const saldoFinal = saldoInicial + totalConsumos - totalAbonos;
                const diferencia = totalAbonos - totalConsumos;

                const consumosPorCategoria = this.analizarConsumosPorCategoria(movimientosMes);
                const consumosPorMascota = this.analizarConsumosPorMascota(movimientosMes);

                return {
                    nombre: cliente.nombre,
                    saldoInicial,
                    consumosMes: totalConsumos,
                    abonosMes: totalAbonos,
                    saldoFinal,
                    diferencia,
                    estado: diferencia > 0 ? 'MEJORÓ' : 'EMPEORÓ',
                    alertas: this.generarAlertas(cliente, saldoFinal),
                    consumosPorCategoria,
                    consumosPorMascota
                };
            })
        );

        const resumenCategorias = this.calcularResumenCategorias(clientesDetalle);
        const totales = this.calcularTotales(clientesDetalle);

        return {
            tipoCliente: tipoCliente.toString(),
            periodo: `${mes.toString().padStart(2, '0')}/${año}`,
            fechaExportacion: new Date().toLocaleString('es-MX'),
            totalClientes: clientesFiltrados.length,
            clientesDetalle,
            resumenCategorias,
            totales
        };
    }

    async obtenerMetricasGlobales(año: number, mes: number): Promise<any> {
        const tiposCliente = Object.values(TipoCliente);
        const metricas = {
            totalClientes: 0,
            totalAdeudo: 0,
            totalConsumos: 0,
            totalAbonos: 0,
            porTipo: {} as Record<string, any>
        };

        for (const tipo of tiposCliente) {
            const reporte = await this.generarReporteTipoCliente(tipo, año, mes);
            
            metricas.porTipo[tipo] = {
                totalClientes: reporte.totalClientes,
                totalAdeudo: reporte.totales.totalAdeudo,
                totalConsumos: reporte.totales.totalConsumos,
                totalAbonos: reporte.totales.totalAbonos
            };

            metricas.totalClientes += reporte.totalClientes;
            metricas.totalAdeudo += reporte.totales.totalAdeudo;
            metricas.totalConsumos += reporte.totales.totalConsumos;
            metricas.totalAbonos += reporte.totales.totalAbonos;
        }

        return metricas;
    }

    // 🔧 MÉTODOS PRIVADOS DE APOYO
    private generarId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private calcularSaldoInicial(cliente: Cliente, año: number, mes: number): number {
        const inicioMes = new Date(año, mes - 1, 1);
        let saldo = cliente.saldoInicial;

        // Sumar movimientos anteriores al mes actual
        cliente.movimientos.forEach(mov => {
            if (new Date(mov.fecha) < inicioMes) {
                saldo += mov.monto;
            }
        });

        return saldo;
    }

    private analizarConsumosPorCategoria(movimientos: Movimiento[]): Record<string, number> {
        const categorias: Record<string, number> = {};
        
        movimientos.forEach(mov => {
            if (mov.tipo === 'CONSUMO') {
                const categoria = mov.categoria;
                categorias[categoria] = (categorias[categoria] || 0) + mov.monto;
            }
        });
        
        return categorias;
    }

    private analizarConsumosPorMascota(movimientos: Movimiento[]): Record<string, number> {
        const mascotas: Record<string, number> = {};
        
        movimientos.forEach(mov => {
            if (mov.tipo === 'CONSUMO') {
                const mascota = mov.mascota || 'No especificada';
                mascotas[mascota] = (mascotas[mascota] || 0) + mov.monto;
            }
        });
        
        return mascotas;
    }

    private generarAlertas(cliente: Cliente, saldoActual: number): string[] {
        const alertas: string[] = [];

        // Alerta por límite de crédito (80%)
        if (saldoActual > cliente.limiteCredito * 0.8) {
            const porcentaje = (saldoActual / cliente.limiteCredito) * 100;
            alertas.push(`⚠️ Crédito al ${porcentaje.toFixed(1)}% del límite`);
        }

        // Alerta por saldo alto
        if (saldoActual > 3000) {
            alertas.push(`💰 Saldo elevado: $${saldoActual.toFixed(2)}`);
        }

        return alertas;
    }

    private calcularResumenCategorias(clientesDetalle: any[]): Record<string, number> {
        const resumen: Record<string, number> = {};

        clientesDetalle.forEach(cliente => {
            Object.entries(cliente.consumosPorCategoria).forEach(([categoria, monto]) => {
                resumen[categoria] = (resumen[categoria] || 0) + (monto as number);
            });
        });

        return resumen;
    }

    private calcularTotales(clientesDetalle: any[]): { totalAdeudo: number; totalConsumos: number; totalAbonos: number } {
        return clientesDetalle.reduce(
            (totales, cliente) => ({
                totalAdeudo: totales.totalAdeudo + cliente.saldoFinal,
                totalConsumos: totales.totalConsumos + cliente.consumosMes,
                totalAbonos: totales.totalAbonos + cliente.abonosMes
            }),
            { totalAdeudo: 0, totalConsumos: 0, totalAbonos: 0 }
        );
    }
}

export const debtorsModel = new DebtorsModel();