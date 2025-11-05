import { Request, Response } from 'express';
import { CreateClienteRequest, CreateMascotaRequest, CreateMovimientoRequest, TipoCliente } from '../../types/debtors';
import { debtorsModel } from '../../application/debtors';

export class DebtorsController {
    // 👥 CLIENTES
    async getClientes(req: Request, res: Response) {
        try {
            const clientes = await debtorsModel.obtenerClientes();
            res.json(clientes);
        } catch (error) {
            console.error('Error obteniendo clientes:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async getClienteById(req: Request, res: Response) {
        try {
        const { id } = req.params;
        const cliente = await debtorsModel.obtenerClientePorId(id);
        
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        res.json(cliente);
        } catch (error) {
            console.error('Error obteniendo cliente:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async getClienteByNombre(req: Request, res: Response) {
        try {
            const { nombre } = req.query;
            
            if (!nombre || typeof nombre !== 'string') {
                return res.status(400).json({ error: 'Nombre de cliente requerido' });
            }
            
            const cliente = await debtorsModel.obtenerClientePorNombre(nombre);
            
            if (!cliente) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.json(cliente);
        } catch (error) {
            console.error('Error buscando cliente:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async createCliente(req: Request, res: Response) {
        try {
            const clienteData: CreateClienteRequest = req.body;
            
            // Validaciones básicas
            if (!clienteData.nombre || !clienteData.tipoCliente) {
                return res.status(400).json({ error: 'Nombre y tipo de cliente son requeridos' });
            }

            if (clienteData.limiteCredito <= 0) {
                return res.status(400).json({ error: 'El límite de crédito debe ser mayor a 0' });
            }

            const nuevoCliente = await debtorsModel.crearCliente(clienteData);
            res.status(201).json(nuevoCliente);
        } catch (error) {
            console.error('Error creando cliente:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async updateCliente(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const clienteData = req.body;
            
            const clienteActualizado = await debtorsModel.actualizarCliente(id, clienteData);
            
            if (!clienteActualizado) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.json(clienteActualizado);
        } catch (error) {
            console.error('Error actualizando cliente:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async deleteCliente(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const eliminado = await debtorsModel.eliminarCliente(id);
            
            if (!eliminado) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.status(204).send();
        } catch (error) {
            console.error('Error eliminando cliente:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // 🐾 MASCOTAS
    async addMascota(req: Request, res: Response) {
        try {
            const { clienteId } = req.params;
            const mascotaData: CreateMascotaRequest = req.body;
            
            if (!mascotaData.nombre || !mascotaData.especie) {
                return res.status(400).json({ error: 'Nombre y especie de la mascota son requeridos' });
            }

            const nuevaMascota = await debtorsModel.agregarMascota(clienteId, mascotaData);
            
            if (!nuevaMascota) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.status(201).json(nuevaMascota);
        } catch (error) {
            console.error('Error agregando mascota:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async deleteMascota(req: Request, res: Response) {
        try {
            const { clienteId, mascotaId } = req.params;
            const eliminado = await debtorsModel.eliminarMascota(clienteId, mascotaId);
            
            if (!eliminado) {
                return res.status(404).json({ error: 'Mascota o cliente no encontrado' });
            }
            
            res.status(204).send();
        } catch (error) {
            console.error('Error eliminando mascota:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // 💰 MOVIMIENTOS
    async addMovimiento(req: Request, res: Response) {
        try {
            const { clienteId } = req.params;
            const movimientoData: CreateMovimientoRequest = req.body;
            
            // Validaciones
            if (!movimientoData.tipo || !movimientoData.concepto || !movimientoData.categoria || !movimientoData.monto) {
                return res.status(400).json({ error: 'Todos los campos del movimiento son requeridos' });
            }

            if (movimientoData.monto <= 0) {
                return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
            }

            const nuevoMovimiento = await debtorsModel.registrarMovimiento(clienteId, movimientoData);
            
            if (!nuevoMovimiento) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            
            res.status(201).json(nuevoMovimiento);
        } catch (error) {
            console.error('Error registrando movimiento:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async getMovimientos(req: Request, res: Response) {
        try {
            const { clienteId } = req.params;
            const { año, mes } = req.query;
            
            const añoNum = año ? parseInt(año as string) : undefined;
            const mesNum = mes ? parseInt(mes as string) : undefined;
            
            const movimientos = await debtorsModel.obtenerMovimientosCliente(clienteId, añoNum, mesNum);
            res.json(movimientos);
        } catch (error) {
            console.error('Error obteniendo movimientos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    // 📊 REPORTES
    async getReporteTipoCliente(req: Request, res: Response) {
        try {
            const { tipo } = req.query;
            const { año, mes } = req.query;
            
            if (!tipo || !año || !mes) {
                return res.status(400).json({ error: 'Tipo, año y mes son requeridos' });
            }

            const añoNum = parseInt(año as string);
            const mesNum = parseInt(mes as string);
            
            if (isNaN(añoNum) || isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
                return res.status(400).json({ error: 'Año y mes deben ser válidos' });
            }

            const tipoCliente = tipo as TipoCliente;
            if (!Object.values(TipoCliente).includes(tipoCliente)) {
                return res.status(400).json({ error: 'Tipo de cliente inválido' });
            }

            const reporte = await debtorsModel.generarReporteTipoCliente(tipoCliente, añoNum, mesNum);
            res.json(reporte);
        } catch (error) {
            console.error('Error generando reporte:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }

    async getMetricasGlobales(req: Request, res: Response) {
        try {
            const { año, mes } = req.query;
            
            if (!año || !mes) {
                return res.status(400).json({ error: 'Año y mes son requeridos' });
            }

            const añoNum = parseInt(año as string);
            const mesNum = parseInt(mes as string);
            
            if (isNaN(añoNum) || isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
                return res.status(400).json({ error: 'Año y mes deben ser válidos' });
            }

            const metricas = await debtorsModel.obtenerMetricasGlobales(añoNum, mesNum);
            res.json(metricas);
        } catch (error) {
            console.error('Error obteniendo métricas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
}

export const debtorsController = new DebtorsController();