import { debtorsRepository } from '../infrastructure/repositories/debtors';
import { TipoCliente } from '../domain/cliente';

export class DebtorsModel {
  
    async obtenerClientes() {
        return await debtorsRepository.obtenerClientes();
    }

    async obtenerClientePorId(id: string) {
        return await debtorsRepository.obtenerClientePorId(id);
    }

    async obtenerClientePorNombre(nombre: string) {
        return await debtorsRepository.obtenerClientePorNombre(nombre);
    }

    async crearCliente(clienteData: any) {
        return await debtorsRepository.crearCliente(clienteData);
    }

    async actualizarCliente(id: string, clienteData: any) {
        return await debtorsRepository.actualizarCliente(id, clienteData);
    }

    async eliminarCliente(id: string) {
        return await debtorsRepository.eliminarCliente(id);
    }

    async agregarMascota(clienteId: string, mascotaData: any) {
        return await debtorsRepository.agregarMascota(clienteId, mascotaData);
    }

    async eliminarMascota(clienteId: string, mascotaId: string) {
        return await debtorsRepository.eliminarMascota(clienteId, mascotaId);
    }

    async registrarMovimiento(clienteId: string, movimientoData: any) {
        return await debtorsRepository.registrarMovimiento(clienteId, movimientoData);
    }

    async obtenerMovimientosCliente(clienteId: string, año?: number, mes?: number) {
        return await debtorsRepository.obtenerMovimientosCliente(clienteId, año, mes);
    }

    async generarReporteTipoCliente(tipoCliente: TipoCliente, año: number, mes: number) {
        const clientes = await this.obtenerClientes();
        const clientesFiltrados = clientes.filter((cliente: any) => cliente.tipoCliente === tipoCliente);
        
        return {
            tipoCliente,
            periodo: `${mes}/${año}`,
            totalClientes: clientesFiltrados.length,
            clientes: clientesFiltrados
        };
    }

    async obtenerMetricasGlobales(año: number, mes: number) {
        const clientes = await this.obtenerClientes();
        
        return {
            totalClientes: clientes.length,
            totalAdeudo: clientes.reduce((sum: number, cliente: any) => sum + (cliente.saldoInicial || 0), 0),
            porTipo: {
                RECEPCION: clientes.filter((c: any) => c.tipoCliente === TipoCliente.RECEPCION).length,
                ADMINISTRACION: clientes.filter((c: any) => c.tipoCliente === TipoCliente.ADMINISTRACION).length,
                COLABORADOR: clientes.filter((c: any) => c.tipoCliente === TipoCliente.COLABORADOR).length
            }
        };
    }
}

export const debtorsModel = new DebtorsModel();