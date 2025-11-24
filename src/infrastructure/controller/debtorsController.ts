import { Request, Response } from 'express';
import Cliente from '../../infrastructure/models/Cliente';
import HistorialDeuda from '../../infrastructure/models/HistorialDeuda';
import RegistroExcel from '../models/RegistroExcel';

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

export const getRegistrosExcel = async (req: Request, res: Response) => {
    try {
        const { periodo, cliente, page = 1, limit = 50 } = req.query;
        
        let query: any = {};
        
        if (periodo) query.periodo = periodo;
        if (cliente) {
            query.clienteNombre = { $regex: cliente, $options: 'i' };
        }

        const registros = await RegistroExcel.find(query)
            .sort({ fechaProcesamiento: -1 })
            .limit(Number(limit) * 1)
            .skip((Number(page) - 1) * Number(limit));

        const total = await RegistroExcel.countDocuments(query);

        res.json({
            success: true,
            registros,
            totalPages: Math.ceil(total / Number(limit)),
            currentPage: Number(page),
            total
        });

    } catch (error) {
        console.error('Error al obtener registros Excel:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener registros Excel'
        });
    }
};

export const procesarExcelComparativa = async (req: Request, res: Response) => {
    console.log('🎯 === ENDPOINT /procesar-comparativa INICIADO ===');
    
    try {
        const { excelData, periodo } = req.body;

        console.log('📥 Datos recibidos en backend:', {
            tieneExcelData: !!excelData,
            tienePeriodo: !!periodo,
            tipoExcelData: typeof excelData,
            excelDataCount: excelData?.length
        });

        // Validar datos requeridos
        if (!excelData || !Array.isArray(excelData)) {
            return res.status(400).json({ 
                success: false,
                error: 'Datos de Excel no válidos: excelData debe ser un array' 
            });
        }

        if (!periodo) {
            return res.status(400).json({ 
                success: false,
                error: 'Período es requerido' 
            });
        }

        // VALIDACIÓN CORREGIDA - MÁS FLEXIBLE
        const datosValidos = excelData.filter(row => {
            if (!row || typeof row !== 'object') {
                console.log('❌ Fila no es objeto válido:', row);
                return false;
            }
            
            // Verificar que tenga clienteNombre (campo requerido)
            const tieneCliente = row.clienteNombre && 
                               typeof row.clienteNombre === 'string' && 
                               row.clienteNombre.trim() !== '';
            
            // Verificar que tenga al menos un campo numérico válido
            const tieneDeuda = typeof row.deuda === 'number' && !isNaN(row.deuda);
            const tieneTotalImporte = typeof row.totalImporte === 'number' && !isNaN(row.totalImporte);
            const tieneCobradoLinea = typeof row.cobradoLinea === 'number' && !isNaN(row.cobradoLinea);
            
            const tieneAlgunValorNumerico = tieneDeuda || tieneTotalImporte || tieneCobradoLinea;
            
            console.log(`🔍 Validando fila:`, {
                cliente: row.clienteNombre,
                tieneCliente,
                tieneDeuda,
                tieneTotalImporte,
                tieneCobradoLinea,
                tieneAlgunValorNumerico,
                deuda: row.deuda,
                totalImporte: row.totalImporte,
                cobradoLinea: row.cobradoLinea
            });
            
            return tieneCliente && tieneAlgunValorNumerico;
        });

        console.log(`📊 Resultado validación: ${datosValidos.length} válidos de ${excelData.length} totales`);

        if (datosValidos.length === 0) {
            console.log('❌ No hay datos válidos después del filtrado');
            if (excelData.length > 0) {
                console.log('🔍 Primer registro para diagnóstico:', excelData[0]);
                console.log('🔍 Tipos de datos del primer registro:', {
                    clienteNombre: typeof excelData[0].clienteNombre,
                    deuda: typeof excelData[0].deuda,
                    totalImporte: typeof excelData[0].totalImporte,
                    cobradoLinea: typeof excelData[0].cobradoLinea
                });
            }
            return res.status(400).json({ 
                success: false,
                error: `No hay datos válidos para procesar. Se requieren clienteNombre y al menos un campo numérico (deuda, totalImporte o cobradoLinea). ${excelData.length} registros recibidos pero 0 válidos.` 
            });
        }

        console.log(`✅ Datos válidos para procesar: ${datosValidos.length} registros`);

        let clientesActualizados = 0;
        let clientesCreados = 0;
        let registrosGuardados = 0;

        // 1. GUARDAR REGISTROS DEL EXCEL
        const registrosParaGuardar = datosValidos.map(row => ({
            periodo: periodo,
            fechaAlbaran: row.fechaAlbaran || '',
            clienteNombre: row.clienteNombre.trim(),
            totalImporte: row.totalImporte || 0,
            cobradoLinea: row.cobradoLinea || 0,
            deuda: row.deuda || 0,
            paciente: row.paciente || '',
            etiqueta: row.etiqueta || '',
            fechaProcesamiento: new Date()
        }));

        try {
            await RegistroExcel.insertMany(registrosParaGuardar);
            registrosGuardados = registrosParaGuardar.length;
            console.log(`✅ Registros Excel guardados: ${registrosGuardados}`);
        } catch (error) {
            console.error('❌ Error al guardar registros Excel:', error);
        }

        // 2. PROCESAR CLIENTES
        for (const row of datosValidos) {
            try {
                const nombreCliente = row.clienteNombre.trim();
                const deudaActual = row.deuda || 0;

                let cliente = await Cliente.findOne({ 
                    nombre: { $regex: new RegExp(`^${nombreCliente}$`, 'i') } 
                });

                if (cliente) {
                    // Actualizar cliente existente
                    const deudaAnterior = cliente.saldoActual;
                    const variacion = deudaActual - deudaAnterior;
                    const porcentajeVariacion = deudaAnterior > 0 ? (variacion / deudaAnterior) * 100 : 0;

                    await Cliente.findByIdAndUpdate(
                        cliente._id,
                        {
                            saldoActual: deudaActual,
                            deudaAnterior: deudaAnterior,
                            variacion: variacion,
                            porcentajeVariacion: porcentajeVariacion,
                            ultimaActualizacion: new Date(),
                            estado: deudaActual > 0 ? 'moroso' : 'activo',
                            ...(row.etiqueta && { etiqueta: row.etiqueta })
                        }
                    );
                    clientesActualizados++;
                } else {
                    // Crear nuevo cliente
                    await Cliente.create({
                        nombre: nombreCliente,
                        tipoCliente: 'regular',
                        limiteCredito: 0,
                        saldoActual: deudaActual,
                        estado: deudaActual > 0 ? 'moroso' : 'activo',
                        etiqueta: row.etiqueta || '',
                        deudaAnterior: 0,
                        variacion: 0,
                        porcentajeVariacion: 0,
                        ultimaActualizacion: new Date()
                    });
                    clientesCreados++;
                }
            } catch (error) {
                console.error(`❌ Error procesando cliente ${row.clienteNombre}:`, error);
            }
        }

        console.log(`✅ Procesamiento completado:`, {
            registrosGuardados,
            clientesActualizados,
            clientesCreados,
            periodo
        });

        res.status(200).json({
            success: true,
            message: `Comparativa procesada exitosamente`,
            datosProcesados: datosValidos.length,
            periodo: periodo,
            estadisticas: {
                registrosExcelGuardados: registrosGuardados,
                clientesActualizados: clientesActualizados,
                clientesCreados: clientesCreados,
                totalClientesAfectados: clientesActualizados + clientesCreados
            }
        });

    } catch (error) {
        console.error('❌ Error en procesarExcelComparativa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor: ' + (error instanceof Error ? error.message : 'Error desconocido')
        });
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

// 🔍 BÚSQUEDA DE CLIENTES POR NOMBRE
export const searchClientes = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
        }

        const clientes = await Cliente.find({
            nombre: { $regex: q, $options: 'i' }
        }).sort({ nombre: 1 });

        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar clientes' });
    }
};

// 📊 TENDENCIAS DE DEUDA
export const getTendencias = async (req: Request, res: Response) => {
    try {
        // Obtener tendencias de los últimos 6 meses
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

        const tendencias = await Cliente.aggregate([
            {
                $group: {
                    _id: null,
                    totalClientes: { $sum: 1 },
                    totalDeudaActual: { $sum: '$saldoActual' },
                    totalDeudaAnterior: { $sum: '$deudaAnterior' },
                    promedioDeuda: { $avg: '$saldoActual' },
                    clientesConDeuda: {
                        $sum: {
                            $cond: [{ $gt: ['$saldoActual', 0] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const resultado = tendencias[0] || {
            totalClientes: 0,
            totalDeudaActual: 0,
            totalDeudaAnterior: 0,
            promedioDeuda: 0,
            clientesConDeuda: 0
        };

        // Calcular variación
        resultado.variacionTotal = resultado.totalDeudaActual - resultado.totalDeudaAnterior;
        resultado.porcentajeVariacion = resultado.totalDeudaAnterior > 0 ? 
            (resultado.variacionTotal / resultado.totalDeudaAnterior) * 100 : 0;

        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener tendencias' });
    }
};