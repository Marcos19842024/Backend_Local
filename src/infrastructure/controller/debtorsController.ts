import { Request, Response } from 'express';
import Debtor from '../models/Debtor';
import Deuda from '../models/Deuda';
import RegistroExcel from '../models/RegistroExcel';
import ExcelRegistro from '../models/ExcelRegistro';
import HistorialDeuda from '../models/HistorialDeuda';

// =============================================
// 🔥 CONTROLADORES EXISTENTES (CLIENTES)
// =============================================

export const getClientes = async (req: Request, res: Response) => {
    try {
        const clientes = await Debtor.find().sort({ nombre: 1 });
        res.status(200).json(clientes);
    } catch (error) {
        console.error('Error obteniendo clientes:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo clientes' 
        });
    }
};

export const getClienteById = async (req: Request, res: Response) => {
    try {
        const cliente = await Debtor.findById(req.params.id);
        if (!cliente) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }
        res.status(200).json(cliente);
    } catch (error) {
        console.error('Error obteniendo cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo cliente' 
        });
    }
};

export const createCliente = async (req: Request, res: Response) => {
    try {
        const cliente = new Debtor(req.body);
        await cliente.save();
        res.status(201).json({
            success: true,
            message: 'Cliente creado exitosamente',
            data: cliente
        });
    } catch (error) {
        console.error('Error creando cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error creando cliente' 
        });
    }
};

export const updateCliente = async (req: Request, res: Response) => {
    try {
        const cliente = await Debtor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!cliente) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }
        res.status(200).json({
            success: true,
            message: 'Cliente actualizado exitosamente',
            data: cliente
        });
    } catch (error) {
        console.error('Error actualizando cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error actualizando cliente' 
        });
    }
};

export const deleteCliente = async (req: Request, res: Response) => {
    try {
        const cliente = await Debtor.findByIdAndDelete(req.params.id);
        if (!cliente) {
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente no encontrado' 
            });
        }
        res.status(200).json({
            success: true,
            message: 'Cliente eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando cliente:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error eliminando cliente' 
        });
    }
};

// =============================================
// 🔥 CONTROLADORES EXISTENTES (MÉTRICAS)
// =============================================

export const getMetricas = async (req: Request, res: Response) => {
    try {
        const totalClientes = await Debtor.countDocuments();
        const clientesActivos = await Debtor.countDocuments({ estado: 'activo' });
        const clientesMorosos = await Debtor.countDocuments({ estado: 'moroso' });
        
        const carteraTotal = await Debtor.aggregate([
            { $group: { _id: null, total: { $sum: "$saldoActual" } } }
        ]);
        
        res.status(200).json({
            totalClientes,
            clientesActivos,
            clientesMorosos,
            carteraTotal: carteraTotal[0]?.total || 0
        });
    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo métricas' 
        });
    }
};

export const getTendencias = async (req: Request, res: Response) => {
    try {
        const tendencias = await Deuda.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m", date: "$createdAt" }
                    },
                    totalDeuda: { $sum: "$deuda" },
                    cantidadRegistros: { $sum: 1 }
                }
            },
            { $sort: { _id: -1 } },
            { $limit: 12 }
        ]);
        
        res.status(200).json(tendencias);
    } catch (error) {
        console.error('Error obteniendo tendencias:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo tendencias' 
        });
    }
};

// =============================================
// 🔥 CONTROLADORES EXISTENTES (DEUDAS)
// =============================================

export const getComparativaPorPeriodo = async (req: Request, res: Response) => {
    try {
        const { periodo, tipo } = req.query;
        
        if (!periodo || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Parámetros periodo y tipo son requeridos'
            });
        }
        
        // Tu lógica existente aquí...
        const deudas = await Deuda.find({
            periodo: periodo as string,
            tipoPeriodo: tipo as string
        });
        
        res.status(200).json({
            success: true,
            periodo,
            tipo,
            datos: deudas
        });
        
    } catch (error) {
        console.error('Error en getComparativaPorPeriodo:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo comparativa'
        });
    }
};

export const getDeudasPorPeriodo = async (req: Request, res: Response) => {
    try {
        const { periodo, tipo } = req.query;
        
        if (!periodo || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Parámetros periodo y tipo son requeridos'
            });
        }
        
        // Agrupar por cliente
        const deudasAgrupadas = await Deuda.aggregate([
            {
                $match: {
                    periodo: periodo as string,
                    tipoPeriodo: tipo as string
                }
            },
            {
                $group: {
                    _id: "$clienteNombre",
                    clienteId: { $first: "$clienteId" },
                    deudaTotal: { $sum: "$deuda" },
                    registros: { $push: "$$ROOT" }
                }
            },
            {
                $project: {
                    clienteNombre: "$_id",
                    clienteId: 1,
                    deudaTotal: 1,
                    registros: 1
                }
            }
        ]);
        
        res.status(200).json({
            success: true,
            periodo,
            tipo,
            totalRegistros: deudasAgrupadas.reduce((sum: number, item: any) => sum + item.registros.length, 0),
            totalClientes: deudasAgrupadas.length,
            totalDeuda: deudasAgrupadas.reduce((sum: number, item: any) => sum + item.deudaTotal, 0),
            deudas: deudasAgrupadas
        });
        
    } catch (error) {
        console.error('Error en getDeudasPorPeriodo:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo deudas por período'
        });
    }
};

export const getHistorialCliente = async (req: Request, res: Response) => {
    try {
        const { clienteId } = req.params;
        const { fechaInicio, fechaFin } = req.query;
        
        let filtro: any = { clienteId };
        
        if (fechaInicio && fechaFin) {
            filtro.createdAt = {
                $gte: new Date(fechaInicio as string),
                $lte: new Date(fechaFin as string)
            };
        }
        
        const historial = await HistorialDeuda.find(filtro)
            .sort({ createdAt: -1 })
            .limit(100);
        
        res.status(200).json(historial);
    } catch (error) {
        console.error('Error obteniendo historial:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo historial del cliente'
        });
    }
};

export const getResumenComparativo = async (req: Request, res: Response) => {
    try {
        const { tipo, fecha } = req.query;
        
        // Tu lógica existente aquí...
        res.status(200).json({
            success: true,
            message: 'Resumen comparativo'
        });
        
    } catch (error) {
        console.error('Error en getResumenComparativo:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo resumen comparativo'
        });
    }
};

// =============================================
// 🔥 CONTROLADOR EXISTENTE DE PROCESAR EXCEL (MODIFICADO)
// =============================================

export const procesarExcelComparativa = async (req: Request, res: Response) => {
    try {
        const { datos, periodo, tipo } = req.body;
        
        if (!datos || !Array.isArray(datos)) {
            return res.status(400).json({
                success: false,
                message: 'Datos inválidos o vacíos'
            });
        }
        
        console.log(`📊 Procesando ${datos.length} registros para ${periodo} (${tipo})`);
        
        // 1. GUARDAR EN REGISTROEXCEL (EXISTENTE)
        const registrosParaGuardar = datos.map((item: any, index: number) => ({
            periodo: periodo,
            tipoPeriodo: tipo,
            fechaAlbaran: item.fechaAlbaran || '',
            clienteNombre: item.clienteNombre || '',
            totalImporte: item.totalImporte || 0,
            cobradoLinea: item.cobradoLinea || 0,
            deuda: item.deuda || 0,
            paciente: item.paciente || '',
            etiqueta: item.etiqueta || '',
            clienteId: item.clienteId || null
        }));
        
        await RegistroExcel.insertMany(registrosParaGuardar);
        
        // 2. ACTUALIZAR O CREAR CLIENTES
        let clientesNuevos = 0;
        let clientesActualizados = 0;
        
        for (const registro of datos) {
            if (!registro.clienteNombre) continue;
            
            const clienteExistente = await Debtor.findOne({
                nombre: { $regex: new RegExp(`^${registro.clienteNombre}$`, 'i') }
            });
            
            if (clienteExistente) {
                // Actualizar cliente existente
                clienteExistente.saldoActual = registro.deuda || 0;
                clienteExistente.estado = registro.deuda > 0 ? 'moroso' : 'activo';
                clienteExistente.etiqueta = registro.etiqueta || clienteExistente.etiqueta;
                
                await clienteExistente.save();
                clientesActualizados++;
                
                // Guardar en historial
                const historial = new HistorialDeuda({
                    clienteId: clienteExistente._id,
                    clienteNombre: clienteExistente.nombre,
                    monto: registro.deuda || 0,
                    descripcion: `Actualización desde Excel ${periodo}`,
                    tipo: 'actualizacion'
                });
                await historial.save();
                
            } else {
                // Crear nuevo cliente
                const nuevoCliente = new Debtor({
                    nombre: registro.clienteNombre,
                    tipoCliente: 'regular',
                    limiteCredito: 0,
                    saldoActual: registro.deuda || 0,
                    estado: registro.deuda > 0 ? 'moroso' : 'activo',
                    etiqueta: registro.etiqueta || ''
                });
                
                await nuevoCliente.save();
                clientesNuevos++;
            }
        }
        
        // 3. 🔥 NUEVO: GUARDAR EN EXCELREGISTRO PARA COMPARATIVAS
        let fechaParaGuardar = '';
        
        if (tipo === 'dia' && periodo.match(/^\d{4}-\d{2}-\d{2}$/)) {
            fechaParaGuardar = periodo;
        } else {
            fechaParaGuardar = new Date().toISOString().split('T')[0];
        }
        
        // Calcular estadísticas
        const totalDeuda = datos.reduce((sum: number, d: any) => sum + (d.deuda || 0), 0);
        const clientesUnicos = [...new Set(
            datos.map((d: any) => d.clienteNombre?.toLowerCase().trim()).filter(Boolean)
        )].length;
        
        // Buscar si ya existe ExcelRegistro para esta fecha
        let excelRegistro = await ExcelRegistro.findOne({ fecha: fechaParaGuardar });
        
        const registrosExcelRegistro = datos.map((d: any) => ({
            fechaAlbaran: d.fechaAlbaran || '',
            clienteNombre: d.clienteNombre || 'Sin nombre',
            totalImporte: d.totalImporte || 0,
            cobradoLinea: d.cobradoLinea || 0,
            deuda: d.deuda || 0,
            paciente: d.paciente || '',
            etiqueta: d.etiqueta || '',
            clienteId: d.clienteId || null,
            periodo: periodo,
            tipoPeriodo: tipo
        }));
        
        if (excelRegistro) {
            // Actualizar: combinar y eliminar duplicados
            const registrosExistentes = excelRegistro.registros || [];
            const todosRegistros = [...registrosExistentes, ...registrosExcelRegistro];
            
            // Eliminar duplicados (mismo cliente y misma fechaAlbaran)
            const mapaUnicos = new Map();
            todosRegistros.forEach(reg => {
                const clave = `${reg.clienteNombre}-${reg.fechaAlbaran}`;
                if (!mapaUnicos.has(clave) || reg.deuda > (mapaUnicos.get(clave)?.deuda || 0)) {
                    mapaUnicos.set(clave, reg);
                }
            });
            
            const registrosUnicos = Array.from(mapaUnicos.values());
            const totalDeudaActualizado = registrosUnicos.reduce((sum: number, r: any) => sum + (r.deuda || 0), 0);
            const clientesUnicosActualizado = [...new Set(
                registrosUnicos.map((r: any) => r.clienteNombre?.toLowerCase().trim())
            )].length;
            
            // @ts-ignore - Ignorar error de tipo de Mongoose
            excelRegistro.registros = registrosUnicos;
            excelRegistro.totalRegistros = registrosUnicos.length;
            excelRegistro.totalClientes = clientesUnicosActualizado;
            excelRegistro.totalDeuda = totalDeudaActualizado;
            excelRegistro.procesado = true;
            excelRegistro.fechaSubida = new Date();
            
            await excelRegistro.save();
            console.log(`✅ ExcelRegistro actualizado para ${fechaParaGuardar}`);
            
        } else {
            // @ts-ignore - Ignorar error de tipo complejo de Mongoose
            excelRegistro = new ExcelRegistro({
                fecha: fechaParaGuardar,
                nombreArchivo: `excel-${fechaParaGuardar}`,
                registros: registrosExcelRegistro,
                totalRegistros: datos.length,
                totalClientes: clientesUnicos,
                totalDeuda: totalDeuda,
                procesado: true,
                usuario: 'sistema'
            });
            
            await excelRegistro.save();
            console.log(`✅ ExcelRegistro creado para ${fechaParaGuardar}`);
        }
        
        // 4. RESPONDER
        res.status(200).json({
            success: true,
            message: 'Excel procesado y guardado correctamente',
            fechaGuardada: fechaParaGuardar,
            estadisticas: {
                registrosExcelGuardados: datos.length,
                clientesNuevos,
                clientesActualizados,
                totalDeuda,
                clientesUnicos
            }
        });
        
    } catch (error: any) {
        console.error('Error en procesarExcelComparativa:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando Excel: ' + error.message
        });
    }
};

// =============================================
// 🔥 NUEVOS CONTROLADORES PARA EXCELREGISTRO
// =============================================

export const getRegistrosExcelPorFecha = async (req: Request, res: Response) => {
    try {
        const { fecha } = req.params;
        
        if (!fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de fecha inválido. Use YYYY-MM-DD'
            });
        }
        
        const excelRegistro = await ExcelRegistro.findOne({ fecha });
        
        if (!excelRegistro) {
            return res.status(404).json({
                success: false,
                message: `No se encontró Excel para la fecha ${fecha}`,
                fecha,
                registros: [],
                totalRegistros: 0,
                totalClientes: 0,
                totalDeuda: 0
            });
        }
        
        res.status(200).json({
            success: true,
            ...excelRegistro.toObject()
        });
        
    } catch (error) {
        console.error('Error en getRegistrosExcelPorFecha:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo registros por fecha'
        });
    }
};

export const getFechasDisponiblesExcel = async (req: Request, res: Response) => {
    try {
        const fechas = await ExcelRegistro.find()
            .select('fecha fechaSubida nombreArchivo totalRegistros totalDeuda')
            .sort({ fecha: -1 })
            .lean();
        
        res.status(200).json(fechas);
        
    } catch (error) {
        console.error('Error en getFechasDisponiblesExcel:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo fechas disponibles'
        });
    }
};

export const getUltimoExcel = async (req: Request, res: Response) => {
    try {
        const ultimoExcel = await ExcelRegistro.findOne()
            .sort({ fecha: -1 })
            .lean();
        
        if (!ultimoExcel) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron Excel subidos',
                registros: [],
                totalRegistros: 0,
                totalClientes: 0,
                totalDeuda: 0
            });
        }
        
        res.status(200).json({
            success: true,
            ...ultimoExcel
        });
        
    } catch (error) {
        console.error('Error en getUltimoExcel:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo último Excel'
        });
    }
};

export const getComparativaExcel = async (req: Request, res: Response) => {
    try {
        const { fechaActual, fechaAnterior } = req.query;
        
        if (!fechaActual || !fechaAnterior) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren fechaActual y fechaAnterior'
            });
        }
        
        // Normalizar posibles arrays y valores a string para evitar errores de tipo
                        const fechaActualStr = Array.isArray(fechaActual) ? String(fechaActual[0]) : String(fechaActual ?? '');
                        const fechaAnteriorStr = Array.isArray(fechaAnterior) ? String(fechaAnterior[0]) : String(fechaAnterior ?? '');
                        
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaActualStr) || !/^\d{4}-\d{2}-\d{2}$/.test(fechaAnteriorStr)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Formato de fecha inválido. Use YYYY-MM-DD'
                    });
                }
                
                // Obtener ambos Excel
                const [excelActual, excelAnterior] = await Promise.all([
                    ExcelRegistro.findOne({ fecha: fechaActualStr }),
                    ExcelRegistro.findOne({ fecha: fechaAnteriorStr })
                ]);
                
                if (!excelActual) {
                    return res.status(404).json({
                        success: false,
                        message: `No se encontró Excel para la fecha ${fechaActualStr}`
                    });
                }
                
                // Preparar respuesta base
                const response: any = {
                    success: true,
                    fechaActual: fechaActualStr,
                    fechaAnterior: fechaAnteriorStr,
                    tieneDatosActual: !!excelActual,
                    tieneDatosAnterior: !!excelAnterior
                };
        
        // Si no hay datos anteriores, devolver solo los actuales
        if (!excelAnterior) {
            const comparativaSimple = excelActual.registros.map((registro: any) => ({
                clienteId: registro.clienteId,
                clienteNombre: registro.clienteNombre,
                deudaActual: registro.deuda || 0,
                deudaAnterior: 0,
                variacion: registro.deuda || 0,
                porcentajeVariacion: 100,
                estado: 'nuevo',
                tieneRegistrosAnteriores: false
            }));
            
            return res.status(200).json({
                ...response,
                comparativa: comparativaSimple,
                resumen: {
                    totalDeudaActual: excelActual.totalDeuda || 0,
                    totalDeudaAnterior: 0,
                    totalVariacion: excelActual.totalDeuda || 0,
                    totalPorcentajeVariacion: 100,
                    totalClientes: comparativaSimple.length,
                    conteoEstados: {
                        nuevo: comparativaSimple.length,
                        liquidado: 0,
                        aumento: 0,
                        disminucion: 0,
                        estable: 0
                    }
                }
            });
        }
        
        // Crear mapas para búsqueda rápida
        const mapaActual = new Map();
        const mapaAnterior = new Map();
        
        // Llenar mapa actual
        excelActual.registros.forEach((reg: any) => {
            const clave = reg.clienteNombre?.toLowerCase().trim() || 'sin-nombre';
            mapaActual.set(clave, {
                clienteId: reg.clienteId,
                clienteNombre: reg.clienteNombre,
                deuda: reg.deuda || 0,
                registroCompleto: reg
            });
        });
        
        // Llenar mapa anterior
        excelAnterior.registros.forEach((reg: any) => {
            const clave = reg.clienteNombre?.toLowerCase().trim() || 'sin-nombre';
            mapaAnterior.set(clave, {
                clienteId: reg.clienteId,
                clienteNombre: reg.clienteNombre,
                deuda: reg.deuda || 0,
                registroCompleto: reg
            });
        });
        
        // 1. Clientes que están en ACTUAL
        const comparativa: any[] = [];
        const clientesProcesados = new Set();
        
        mapaActual.forEach((clienteActual: any, clave: string) => {
            const clienteAnterior = mapaAnterior.get(clave);
            
            const deudaActual = clienteActual.deuda || 0;
            const deudaAnterior = clienteAnterior ? clienteAnterior.deuda : 0;
            const variacion = deudaActual - deudaAnterior;
            
            let porcentajeVariacion = 0;
            if (deudaAnterior > 0) {
                porcentajeVariacion = (variacion / deudaAnterior) * 100;
            } else if (deudaActual > 0) {
                porcentajeVariacion = 100;
            }
            
            let estado = 'estable';
            if (!clienteAnterior && deudaActual > 0) {
                estado = 'nuevo';
            } else if (clienteAnterior && deudaActual === 0) {
                estado = 'liquidado';
            } else if (variacion > 0) {
                estado = 'aumento';
            } else if (variacion < 0) {
                estado = 'disminucion';
            }
            
            comparativa.push({
                clienteId: clienteActual.clienteId,
                clienteNombre: clienteActual.clienteNombre,
                deudaActual,
                deudaAnterior,
                variacion,
                porcentajeVariacion,
                estado,
                tieneRegistrosAnteriores: !!clienteAnterior,
                fechaAlbaranActual: clienteActual.registroCompleto?.fechaAlbaran,
                fechaAlbaranAnterior: clienteAnterior?.registroCompleto?.fechaAlbaran
            });
            
            clientesProcesados.add(clave);
        });
        
        // 2. Clientes que estaban en ANTERIOR pero NO en ACTUAL (liquidaron)
        mapaAnterior.forEach((clienteAnterior: any, clave: string) => {
            if (!clientesProcesados.has(clave)) {
                comparativa.push({
                    clienteId: clienteAnterior.clienteId,
                    clienteNombre: clienteAnterior.clienteNombre,
                    deudaActual: 0,
                    deudaAnterior: clienteAnterior.deuda || 0,
                    variacion: -(clienteAnterior.deuda || 0),
                    porcentajeVariacion: -100,
                    estado: 'liquidado',
                    tieneRegistrosAnteriores: true,
                    fechaAlbaranActual: null,
                    fechaAlbaranAnterior: clienteAnterior.registroCompleto?.fechaAlbaran
                });
            }
        });
        
        // Calcular resumen
        const totalDeudaActual = excelActual.totalDeuda || 0;
        const totalDeudaAnterior = excelAnterior.totalDeuda || 0;
        const totalVariacion = totalDeudaActual - totalDeudaAnterior;
        const totalPorcentajeVariacion = totalDeudaAnterior > 0 
            ? (totalVariacion / totalDeudaAnterior) * 100 
            : (totalVariacion > 0 ? 100 : 0);
        
        // Contar estados
        const conteoEstados = {
            nuevo: comparativa.filter(c => c.estado === 'nuevo').length,
            liquidado: comparativa.filter(c => c.estado === 'liquidado').length,
            aumento: comparativa.filter(c => c.estado === 'aumento').length,
            disminucion: comparativa.filter(c => c.estado === 'disminucion').length,
            estable: comparativa.filter(c => c.estado === 'estable').length
        };
        
        res.status(200).json({
            ...response,
            comparativa,
            resumen: {
                totalDeudaActual,
                totalDeudaAnterior,
                totalVariacion,
                totalPorcentajeVariacion,
                totalClientes: comparativa.length,
                conteoEstados
            }
        });
        
    } catch (error) {
        console.error('Error en getComparativaExcel:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo comparativa'
        });
    }
};

// =============================================
// 🔥 CONTROLADORES EXISTENTES (REGISTROS EXCEL)
// =============================================

export const getRegistrosExcel = async (req: Request, res: Response) => {
    try {
        const { periodo, cliente, page = 1, limit = 50 } = req.query;
        
        let filtro: any = {};
        
        if (periodo) filtro.periodo = periodo as string;
        if (cliente) {
            filtro.clienteNombre = { $regex: cliente as string, $options: 'i' };
        }
        
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        
        // Solución al problema de Promise.all - usar any[] explícitamente
        const [registros, total] = await Promise.all<any>([
            RegistroExcel.find(filtro).skip(skip).limit(parseInt(limit as string)).exec(),
            RegistroExcel.countDocuments(filtro).exec()
        ]);
        
        res.status(200).json({
            success: true,
            data: registros,
            pagination: {
                page: parseInt(page as string),
                limit: parseInt(limit as string),
                total,
                pages: Math.ceil(total / parseInt(limit as string))
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo registros Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo registros Excel'
        });
    }
};

// =============================================
// 🔥 BÚSQUEDA DE CLIENTES
// =============================================

export const searchDebtorsClientes = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        
        if (!q || (q as string).trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Término de búsqueda requerido'
            });
        }
        
        const clientes = await Debtor.find({
            nombre: { $regex: q as string, $options: 'i' }
        }).limit(20);
        
        res.status(200).json(clientes);
    } catch (error) {
        console.error('Error buscando clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error buscando clientes'
        });
    }
};

export default {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    getMetricas,
    getTendencias,
    getComparativaPorPeriodo,
    getDeudasPorPeriodo,
    getHistorialCliente,
    getResumenComparativo,
    procesarExcelComparativa,
    getRegistrosExcel,
    searchDebtorsClientes,
    getRegistrosExcelPorFecha,
    getFechasDisponiblesExcel,
    getUltimoExcel,
    getComparativaExcel
};