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
    getTendencias,
    getRegistrosExcel,
    searchClientes,
    getPeriodosDisponibles,
    getComparativaPorPeriodo,
    getDeudasPorPeriodo,
    getResumenComparativo
} from '../controller/debtorsController';

const router = Router();

// Rutas básicas de clientes
router.get('/clientes', getClientes);
router.get('/clientes/buscar', searchClientes);
router.get('/clientes/:id', getClienteById);
router.post('/clientes', createCliente);
router.put('/clientes/:id', updateCliente);
router.delete('/clientes/:id', deleteCliente);

// Métricas y dashboard
router.get('/metricas', getMetricas);
router.get('/tendencias', getTendencias);

// Comparativas e historial
router.post('/procesar-comparativa', procesarExcelComparativa);
router.get('/comparativa-periodo', getComparativaPorPeriodo);
router.get('/historial/:clienteId', getHistorialCliente);
router.get('/registros-excel', getRegistrosExcel);
router.get('/periodos', getPeriodosDisponibles);

// NUEVAS RUTAS para el frontend
router.get('/deudas/por-periodo', getDeudasPorPeriodo);
router.get('/deudas/comparativa', getComparativaPorPeriodo);
router.get('/deudas/resumen-comparativo', getResumenComparativo);
router.post('/deudas/procesar-excel-comparativa', procesarExcelComparativa);
router.get('/deudas/historial/:clienteId', getHistorialCliente);

export { router };