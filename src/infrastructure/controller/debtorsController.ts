import { Request, Response } from 'express';
import Cliente from '../../infrastructure/models/Cliente';
import HistorialDeuda from '../../infrastructure/models/HistorialDeuda';

// Función helper para evitar problemas de tipos
const safeMap = (array: any[], mapper: (item: any) => any) => {
    const result = [];
    for (const item of array) {
        result.push(mapper(item));
    }
    return result;
};

export const getClientes = async (req: Request, res: Response) => {
    try {
        const clientes = await Cliente.find().sort({ nombre: 1 });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los clientes' });
    }
};

export const getClienteById = async (req: Request, res: Response) => {
    try {
        const cliente = await Cliente.findById(req.params.id);
        if (!cliente) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el cliente' });
    }
};

export const createCliente = async (req: Request, res: Response) => {
    try {
        const cliente = new Cliente(req.body);
        const saved = await cliente.save();
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el cliente' });
    }
};

export const updateCliente = async (req: Request, res: Response) => {
    try {
        const updated = await Cliente.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el cliente' });
    }
};

export const deleteCliente = async (req: Request, res: Response) => {
    try {
        const deleted = await Cliente.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ error: 'Cliente no encontrado' });
            return;
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
};

export const getMetricas = async (req: Request, res: Response) => {
    try {
        const total = await Cliente.countDocuments();
        const activos = await Cliente.countDocuments({ estado: 'activo' });
        const morosos = await Cliente.countDocuments({ estado: 'moroso' });
        
        const cartera = await Cliente.aggregate([
            { $group: { _id: null, total: { $sum: '$saldoActual' } } }
        ]);
        
        res.json({
            totalClientes: total,
            clientesActivos: activos,
            clientesMorosos: morosos,
            carteraTotal: cartera[0]?.total || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las métricas' });
    }
};

export const procesarExcelComparativa = async (req: Request, res: Response) => {
    try {
        const { data, periodo } = req.body;
        
        if (!data || !periodo) {
            res.status(400).json({ error: 'Datos inválidos' });
            return;
        }

        // Implementación básica
        res.json({ 
            message: 'Procesamiento básico completado',
            periodo,
            clientesProcesados: data.length 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar comparativa' });
    }
};

export const getHistorialCliente = async (req: Request, res: Response) => {
    try {
        const historial = await HistorialDeuda.find({ clienteId: req.params.clienteId })
            .sort({ periodo: -1 })
            .limit(12);
        
        res.json({ historial });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial' });
    }
};

export const getTendencias = async (req: Request, res: Response) => {
    try {
        const tendencias = await Cliente.aggregate([
            {
                $group: {
                    _id: null,
                    totalClientes: { $sum: 1 },
                    totalDeuda: { $sum: '$saldoActual' }
                }
            }
        ]);
        
        res.json(tendencias[0] || { totalClientes: 0, totalDeuda: 0 });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tendencias' });
    }
};