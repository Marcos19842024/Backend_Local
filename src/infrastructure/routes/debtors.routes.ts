import { Router } from 'express';
import {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    getMetricas,
    procesarExcelComparativa,
    getHistorialCliente,
    getTendencias
} from '../controller/debtorsController';

const router = Router();

// Rutas básicas de clientes
router.get('/clientes', getClientes);
router.get('/clientes/:id', getClienteById);
router.post('/clientes', createCliente);
router.put('/clientes/:id', updateCliente);
router.delete('/clientes/:id', deleteCliente);

// Métricas
router.get('/metricas', getMetricas);

// Comparativas e historial
router.post('/procesar-comparativa', procesarExcelComparativa);
router.get('/historial/:clienteId', getHistorialCliente);
router.get('/tendencias', getTendencias);

export { router };