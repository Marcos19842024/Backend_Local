import { Router } from 'express';
import { debtorsController } from '../controller/debtors';
const router = Router();

// 👥 RUTAS DE CLIENTES
router.get('/clientes', debtorsController.getClientes);
router.get('/clientes/buscar', debtorsController.getClienteByNombre);
router.get('/clientes/:id', debtorsController.getClienteById);
router.post('/clientes', debtorsController.createCliente);
router.put('/clientes/:id', debtorsController.updateCliente);
router.delete('/clientes/:id', debtorsController.deleteCliente);

// 🐾 RUTAS DE MASCOTAS
router.post('/clientes/:clienteId/mascotas', debtorsController.addMascota);
router.delete('/clientes/:clienteId/mascotas/:mascotaId', debtorsController.deleteMascota);

// 💰 RUTAS DE MOVIMIENTOS
router.post('/clientes/:clienteId/movimientos', debtorsController.addMovimiento);
router.get('/clientes/:clienteId/movimientos', debtorsController.getMovimientos);

// 📊 RUTAS DE REPORTES
router.get('/reportes/tipo-cliente', debtorsController.getReporteTipoCliente);
router.get('/reportes/metricas-globales', debtorsController.getMetricasGlobales);

export { router };