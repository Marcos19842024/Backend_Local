import { Cliente } from "../../domain/cliente";

export class DebtorsRepository {
  
    async obtenerClientes() {
        try {
            // Usar any para evitar problemas de tipos
            const clientes: any = await Cliente.find().sort({ nombre: 1 });
            return clientes.map((c: any) => this.convertirCliente(c));
        } catch (error) {
            console.error('Error obteniendo clientes:', error);
            return [];
        }
    }

    async obtenerClientePorId(id: string) {
        try {
            const cliente: any = await Cliente.findById(id);
            return cliente ? this.convertirCliente(cliente) : null;
        } catch (error) {
            console.error('Error obteniendo cliente por ID:', error);
            return null;
        }
    }

    async obtenerClientePorNombre(nombre: string) {
        try {
            const cliente: any = await Cliente.findOne({ 
                nombre: { $regex: nombre, $options: 'i' } 
            });
            return cliente ? this.convertirCliente(cliente) : null;
        } catch (error) {
            console.error('Error obteniendo cliente por nombre:', error);
            return null;
        }
    }

    async crearCliente(clienteData: any) {
        try {
            const cliente = new Cliente({
                ...clienteData,
                mascotas: [],
                movimientos: []
            });
            const saved: any = await cliente.save();
            return this.convertirCliente(saved);
        } catch (error) {
            console.error('Error creando cliente:', error);
            throw error;
        }
    }

    async actualizarCliente(id: string, clienteData: any) {
        try {
            const cliente: any = await Cliente.findByIdAndUpdate(
                id,
                { ...clienteData },
                { new: true }
            );
            return cliente ? this.convertirCliente(cliente) : null;
        } catch (error) {
            console.error('Error actualizando cliente:', error);
            return null;
        }
    }

    async eliminarCliente(id: string) {
        try {
            const result = await Cliente.findByIdAndDelete(id);
            return result !== null;
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            return false;
        }
    }

    async agregarMascota(clienteId: string, mascotaData: any) {
        try {
            const cliente: any = await Cliente.findByIdAndUpdate(
                clienteId,
                { $push: { mascotas: mascotaData } },
                { new: true }
            );
            return cliente ? this.convertirCliente(cliente) : null;
        } catch (error) {
            console.error('Error agregando mascota:', error);
            return null;
        }
    }

    async eliminarMascota(clienteId: string, mascotaId: string) {
        try {
            const result = await Cliente.findByIdAndUpdate(
                clienteId,
                { $pull: { mascotas: { _id: mascotaId } } }
            );
            return result !== null;
        } catch (error) {
            console.error('Error eliminando mascota:', error);
            return false;
        }
    }

    async registrarMovimiento(clienteId: string, movimientoData: any) {
        try {
            const cliente: any = await Cliente.findByIdAndUpdate(
                clienteId,
                { $push: { movimientos: movimientoData } },
                { new: true }
            );
            return cliente ? this.convertirCliente(cliente) : null;
        } catch (error) {
            console.error('Error registrando movimiento:', error);
            return null;
        }
    }

    async obtenerMovimientosCliente(clienteId: string, año?: number, mes?: number) {
        try {
            const cliente: any = await Cliente.findById(clienteId);
            if (!cliente) return [];

            const movimientos = JSON.parse(JSON.stringify(cliente.movimientos || []));

            let movimientosFiltrados = movimientos;

            if (año && mes) {
                const inicioMes = new Date(año, mes - 1, 1);
                const finMes = new Date(año, mes, 0, 23, 59, 59);

                movimientosFiltrados = movimientosFiltrados.filter((mov: any) => {
                    const fechaMov = new Date(mov.fecha);
                    return fechaMov >= inicioMes && fechaMov <= finMes;
                });
            }

            return movimientosFiltrados.sort((a: any, b: any) => 
                new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
            );
        } catch (error) {
            console.error('Error obteniendo movimientos:', error);
            return [];
        }
    }

    // Método helper para convertir documento Mongoose a objeto plano
    private convertirCliente(cliente: any) {
        const obj = cliente.toObject ? cliente.toObject() : cliente;
        return {
            _id: obj._id,
            nombre: obj.nombre || '',
            tipoCliente: obj.tipoCliente,
            limiteCredito: obj.limiteCredito || 0,
            saldoInicial: obj.saldoInicial || 0,
            metaPagoMensual: obj.metaPagoMensual,
            mascotas: obj.mascotas || [],
            movimientos: obj.movimientos || [],
            createdAt: obj.createdAt,
            updatedAt: obj.updatedAt
        };
    }
}

export const debtorsRepository = new DebtorsRepository();