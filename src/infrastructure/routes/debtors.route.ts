import debtorsController from '../controller/debtorsController';
import { Router } from 'express';

const router: Router = Router();

// =============================================
// 🔥 RUTAS EXISTENTES
// =============================================

// 👥 CLIENTES
router.get('/clientes', debtorsController.getClientes);
router.get('/clientes/:id', debtorsController.getClienteById);
router.post('/clientes', debtorsController.createCliente);
router.put('/clientes/:id', debtorsController.updateCliente);
router.delete('/clientes/:id', debtorsController.deleteCliente);

// 📊 MÉTRICAS
router.get('/metricas', debtorsController.getMetricas);
router.get('/tendencias', debtorsController.getTendencias);

// 📊 DEUDAS
router.get('/deudas/comparativa', debtorsController.getComparativaPorPeriodo);
router.get('/deudas/por-periodo', debtorsController.getDeudasPorPeriodo);
router.get('/deudas/historial/:clienteId', debtorsController.getHistorialCliente);
router.post('/deudas/procesar-excel-comparativa', debtorsController.procesarExcelComparativa);
router.get('/deudas/resumen-comparativo', debtorsController.getResumenComparativo);

// 📄 REGISTROS EXCEL EXISTENTES
router.get('/registros-excel', debtorsController.getRegistrosExcel);

// 🔍 BÚSQUEDA
router.get('/clientes/buscar', debtorsController.searchDebtorsClientes);

// =============================================
// 🔥 NUEVAS RUTAS PARA EXCELREGISTRO
// =============================================

// Obtener registros de Excel por fecha específica
router.get('/registros-excel/fecha/:fecha', debtorsController.getRegistrosExcelPorFecha);

// Obtener todas las fechas disponibles de Excel
router.get('/registros-excel/fechas', debtorsController.getFechasDisponiblesExcel);

// Obtener el último Excel subido
router.get('/registros-excel/ultimo', debtorsController.getUltimoExcel);

// Obtener comparativa entre dos fechas
router.get('/registros-excel/comparativa', debtorsController.getComparativaExcel);

export { router };