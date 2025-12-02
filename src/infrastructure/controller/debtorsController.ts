import { Request, Response } from 'express';
import Cliente from '../../infrastructure/models/Cliente';
import HistorialDeuda from '../../infrastructure/models/HistorialDeuda';
import RegistroExcel from '../models/RegistroExcel';

// Interfaces para tipado
interface RegistroExcelType {
    _id?: any;
    periodo: string;
    tipoPeriodo: string;
    fechaAlbaran?: string;
    clienteNombre: string;
    totalImporte: number;
    cobradoLinea: number;
    deuda: number;
    paciente?: string;
    etiqueta?: string;
    fechaProcesamiento: Date;
}

interface ComparativaItem {
    clienteNombre: string;
    deudaActual: number;
    deudaAnterior: number;
    variacion: number;
    porcentajeVariacion: number;
    periodoActual: string;
    periodoAnterior: string;
}

interface ResumenComparativa {
    periodoActual: string;
    periodoAnterior: string;
    totalDeudaActual: number;
    totalDeudaAnterior: number;
    totalVariacion: number;
    totalPorcentajeVariacion: number;
    totalClientes: number;
    clientesConAumento: number;
    clientesConDisminucion: number;
    clientesEstables: number;
}

// Función para obtener el período anterior según el tipo de período
const obtenerPeriodoAnterior = (periodoActual: string, tipoPeriodo: string): string => {
    try {
        switch (tipoPeriodo) {
            case 'dia':
                // Formato: "2024-01-15"
                const [anioDia, mesDia, dia] = periodoActual.split('-').map(Number);
                const fechaActual = new Date(anioDia, mesDia - 1, dia);
                const fechaAnterior = new Date(fechaActual);
                fechaAnterior.setDate(fechaActual.getDate() - 1);
                
                const anioAntDia = fechaAnterior.getFullYear();
                const mesAntDia = (fechaAnterior.getMonth() + 1).toString().padStart(2, '0');
                const diaAnt = fechaAnterior.getDate().toString().padStart(2, '0');
                return `${anioAntDia}-${mesAntDia}-${diaAnt}`;

            case 'semana':
                // Formato: "2024-W03"
                const [anioSemana, semanaStr] = periodoActual.split('-W');
                const numeroSemana = parseInt(semanaStr);
                let anioAntSemana = parseInt(anioSemana);
                let semanaAnterior = numeroSemana - 1;
                
                if (semanaAnterior === 0) {
                    // Si es la semana 1, la anterior es la última semana del año anterior
                    anioAntSemana -= 1;
                    // Calcular última semana del año anterior (puede ser 52 o 53)
                    const ultimoDiaAnio = new Date(anioAntSemana, 11, 31);
                    const primerDiaAnio = new Date(anioAntSemana, 0, 1);
                    const diasTranscurridos = Math.floor((ultimoDiaAnio.getTime() - primerDiaAnio.getTime()) / (24 * 60 * 60 * 1000));
                    semanaAnterior = Math.ceil((diasTranscurridos + primerDiaAnio.getDay() + 1) / 7);
                }
                
                return `${anioAntSemana}-W${semanaAnterior.toString().padStart(2, '0')}`;

            case 'mes':
            default:
                // Formato: "2024-01"
                const [anioMes, mes] = periodoActual.split('-').map(Number);
                let anioAntMes = anioMes;
                let mesAnterior = mes - 1;
                
                if (mesAnterior === 0) {
                    mesAnterior = 12;
                    anioAntMes -= 1;
                }
                
                return `${anioAntMes}-${mesAnterior.toString().padStart(2, '0')}`;
        }
    } catch (error) {
        console.error('Error calculando período anterior:', error);
        return periodoActual; // Fallback
    }
};

// NUEVO CONTROLADOR: Obtener comparativa por período
export const getComparativaPorPeriodo = async (req: Request, res: Response) => {
    try {
        const periodoRaw = req.query.periodo;
        const tipoPeriodoRaw = req.query.tipoPeriodo;

        const periodo = typeof periodoRaw === 'string'
            ? periodoRaw
            : Array.isArray(periodoRaw) && periodoRaw.length > 0
                ? periodoRaw[0]
                : undefined;

        const tipoPeriodo = typeof tipoPeriodoRaw === 'string'
            ? tipoPeriodoRaw
            : Array.isArray(tipoPeriodoRaw) && tipoPeriodoRaw.length > 0
                ? tipoPeriodoRaw[0]
                : 'mes';

        if (!periodo || typeof periodo !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'El parámetro periodo es requerido'
            });
        }

        // Validar tipoPeriodo
                if (!(typeof tipoPeriodo === 'string' && ['dia', 'semana', 'mes'].includes(tipoPeriodo))) {
                    return res.status(400).json({
                        success: false,
                        error: 'tipoPeriodo debe ser: dia, semana o mes'
                    });
                }

        // Obtener período anterior
        const periodoAnterior = obtenerPeriodoAnterior(periodo, tipoPeriodo);

        // SOLUCIÓN: Separar las promesas para evitar el error de tipos complejos
        const registrosActualPromise = RegistroExcel.find({ 
            periodo: periodo,
            tipoPeriodo: tipoPeriodo 
        }).exec();

        const registrosAnteriorPromise = RegistroExcel.find({ 
            periodo: periodoAnterior,
            tipoPeriodo: tipoPeriodo 
        }).exec();

        // Ejecutar promesas separadamente
        const registrosActual = await registrosActualPromise;
        const registrosAnterior = await registrosAnteriorPromise;

        // Crear mapa de registros por cliente para el período actual
        const mapaActual = new Map<string, RegistroExcelType>();
        registrosActual.forEach((registro: RegistroExcelType) => {
            const clave = registro.clienteNombre.toLowerCase();
            const existing = mapaActual.get(clave);
            if (!existing || registro.fechaProcesamiento > existing.fechaProcesamiento) {
                mapaActual.set(clave, registro);
            }
        });

        // Crear mapa de registros por cliente para el período anterior
        const mapaAnterior = new Map<string, RegistroExcelType>();
        registrosAnterior.forEach((registro: RegistroExcelType) => {
            const clave = registro.clienteNombre.toLowerCase();
            const existing = mapaAnterior.get(clave);
            if (!existing || registro.fechaProcesamiento > existing.fechaProcesamiento) {
                mapaAnterior.set(clave, registro);
            }
        });

        // Generar comparativa
        const comparativa: ComparativaItem[] = [];
        const clientesProcesados = new Set<string>();

        // Procesar clientes del período actual
        for (const [clienteNombre, registroActual] of mapaActual) {
            clientesProcesados.add(clienteNombre);
            
            const registroAnterior = mapaAnterior.get(clienteNombre);
            const deudaActual = registroActual.deuda;
            const deudaAnterior = registroAnterior?.deuda || 0;
            const variacion = deudaActual - deudaAnterior;
            const porcentajeVariacion = deudaAnterior > 0 ? (variacion / deudaAnterior) * 100 : 0;

            comparativa.push({
                clienteNombre: registroActual.clienteNombre,
                deudaActual,
                deudaAnterior,
                variacion,
                porcentajeVariacion,
                periodoActual: periodo,
                periodoAnterior
            });
        }

        // Procesar clientes que solo están en el período anterior
        for (const [clienteNombre, registroAnterior] of mapaAnterior) {
            if (!clientesProcesados.has(clienteNombre)) {
                comparativa.push({
                    clienteNombre: registroAnterior.clienteNombre,
                    deudaActual: 0,
                    deudaAnterior: registroAnterior.deuda,
                    variacion: -registroAnterior.deuda,
                    porcentajeVariacion: -100,
                    periodoActual: periodo,
                    periodoAnterior
                });
            }
        }

        // Calcular resumen
        const totalDeudaActual = comparativa.reduce((sum, item) => sum + item.deudaActual, 0);
        const totalDeudaAnterior = comparativa.reduce((sum, item) => sum + item.deudaAnterior, 0);
        const totalVariacion = totalDeudaActual - totalDeudaAnterior;
        const totalPorcentajeVariacion = totalDeudaAnterior > 0 ? (totalVariacion / totalDeudaAnterior) * 100 : 0;

        const resumen: ResumenComparativa = {
            periodoActual: periodo,
            periodoAnterior,
            totalDeudaActual,
            totalDeudaAnterior,
            totalVariacion,
            totalPorcentajeVariacion,
            totalClientes: comparativa.length,
            clientesConAumento: comparativa.filter(item => item.variacion > 0).length,
            clientesConDisminucion: comparativa.filter(item => item.variacion < 0).length,
            clientesEstables: comparativa.filter(item => item.variacion === 0).length
        };

        res.json({
            success: true,
            comparativa,
            resumen
        });

    } catch (error) {
        console.error('Error en getComparativaPorPeriodo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al obtener comparativa'
        });
    }
};

// ProcesarExcelComparativa - MEJORADO
export const procesarExcelComparativa = async (req: Request, res: Response) => {
    try {
        const { excelData, periodo, tipoPeriodo = 'mes' } = req.body;

        console.log('📥 Datos recibidos en backend:', {
            tieneExcelData: !!excelData,
            tienePeriodo: !!periodo,
            tipoPeriodo: tipoPeriodo,
            tipoExcelData: typeof excelData,
            excelDataCount: excelData?.length
        });

        // Validaciones mejoradas
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

        // Validar tipoPeriodo
                if (!(typeof tipoPeriodo === 'string' && ['dia', 'semana', 'mes'].includes(tipoPeriodo))) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'tipoPeriodo debe ser: dia, semana o mes' 
                    });
                }

        // Validación de datos mejorada
        const datosValidos = excelData.filter(row => {
            if (!row || typeof row !== 'object') {
                console.log('❌ Fila no es objeto válido:', row);
                return false;
            }
            
            const tieneCliente = row.clienteNombre && 
                               typeof row.clienteNombre === 'string' && 
                               row.clienteNombre.trim() !== '';
            
            const tieneDeuda = typeof row.deuda === 'number' && !isNaN(row.deuda);
            const tieneTotalImporte = typeof row.totalImporte === 'number' && !isNaN(row.totalImporte);
            const tieneCobradoLinea = typeof row.cobradoLinea === 'number' && !isNaN(row.cobradoLinea);
            
            const tieneAlgunValorNumerico = tieneDeuda || tieneTotalImporte || tieneCobradoLinea;
            
            return tieneCliente && tieneAlgunValorNumerico;
        });

        console.log(`📊 Resultado validación: ${datosValidos.length} válidos de ${excelData.length} totales`);

        if (datosValidos.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: `No hay datos válidos para procesar. Se requieren clienteNombre y al menos un campo numérico.` 
            });
        }

        console.log(`✅ Datos válidos para procesar: ${datosValidos.length} registros`);

        let clientesActualizados = 0;
        let clientesCreados = 0;
        let registrosGuardados = 0;

        // 1. GUARDAR REGISTROS DEL EXCEL (MEJORADO con manejo de errores por lote)
        const registrosParaGuardar = datosValidos.map(row => ({
            periodo: periodo,
            tipoPeriodo: tipoPeriodo,
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
            // Usar insertMany con ordered: false para que continúe aunque falle algún documento
            const resultado = await RegistroExcel.insertMany(registrosParaGuardar, { ordered: false });
            registrosGuardados = resultado.length;
            console.log(`✅ Registros Excel guardados: ${registrosGuardados}`);
        } catch (error: any) {
            // Manejar errores de inserción parcial
            if (error.writeErrors) {
                registrosGuardados = registrosParaGuardar.length - error.writeErrors.length;
                console.log(`⚠️ Registros guardados parcialmente: ${registrosGuardados} de ${registrosParaGuardar.length}`);
            } else {
                console.error('❌ Error al guardar registros Excel:', error);
            }
        }

        // 2. PROCESAR CLIENTES CON COMPARATIVA POR PERÍODO (MEJORADO con Promise.all)
        const procesarClientes = datosValidos.map(async (row) => {
            try {
                const nombreCliente = row.clienteNombre.trim();
                const deudaActual = row.deuda || 0;

                let cliente = await Cliente.findOne({ 
                    nombre: { $regex: new RegExp(`^${nombreCliente}$`, 'i') } 
                });

                if (cliente) {
                    // OBTENER DEUDA DEL PERÍODO ANTERIOR para comparativa
                    const periodoAnterior = obtenerPeriodoAnterior(periodo, tipoPeriodo);
                    
                    // Buscar registros del período anterior para este cliente
                    const registroAnterior = await RegistroExcel.findOne({
                        clienteNombre: { $regex: new RegExp(`^${nombreCliente}$`, 'i') },
                        periodo: periodoAnterior,
                        tipoPeriodo: tipoPeriodo
                    }).sort({ fechaProcesamiento: -1 });

                    const deudaAnterior = registroAnterior?.deuda || cliente.saldoActual;
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
                    return { tipo: 'actualizado', nombre: nombreCliente };
                } else {
                    // Crear nuevo cliente (sin datos anteriores para comparar)
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
                    return { tipo: 'creado', nombre: nombreCliente };
                }
            } catch (error) {
                console.error(`❌ Error procesando cliente ${row.clienteNombre}:`, error);
                return { tipo: 'error', nombre: row.clienteNombre, error };
            }
        });

        // SOLUCIÓN: Usar ejecución separada para evitar problemas de tipos
        const resultados = await Promise.allSettled(procesarClientes);
        
        // Contar resultados
        resultados.forEach(resultado => {
            if (resultado.status === 'fulfilled') {
                const value = resultado.value;
                if (value.tipo === 'actualizado') clientesActualizados++;
                if (value.tipo === 'creado') clientesCreados++;
            }
        });

        console.log(`✅ Procesamiento completado:`, {
            registrosGuardados,
            clientesActualizados,
            clientesCreados,
            periodo,
            tipoPeriodo
        });

        res.status(200).json({
            success: true,
            message: `Comparativa ${tipoPeriodo} procesada exitosamente`,
            datosProcesados: datosValidos.length,
            periodo: periodo,
            tipoPeriodo: tipoPeriodo,
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

// Obtener períodos disponibles
export const getPeriodosDisponibles = async (req: Request, res: Response) => {
    try {
        const periodos = await RegistroExcel.aggregate([
            {
                $group: {
                    _id: {
                        periodo: "$periodo",
                        tipoPeriodo: "$tipoPeriodo"
                    },
                    fechaProcesamiento: { $max: "$fechaProcesamiento" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "fechaProcesamiento": -1 }
            }
        ]);

        res.json({
            success: true,
            periodos: periodos.map(p => ({
                periodo: p._id.periodo,
                tipoPeriodo: p._id.tipoPeriodo,
                fechaProcesamiento: p.fechaProcesamiento,
                registrosCount: p.count
            }))
        });
    } catch (error) {
        console.error('Error obteniendo períodos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener períodos disponibles'
        });
    }
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
        const { id } = req.params;
        
        console.log('🔍 Intentando eliminar cliente con ID:', id);
        
        const deleted = await Cliente.findByIdAndDelete(id);
        
        if (!deleted) {
            console.log('❌ Cliente no encontrado con ID:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Cliente no encontrado' 
            });
        }
        
        console.log('✅ Cliente eliminado:', deleted.nombre);
        
        res.json({ 
            success: true,
            message: 'Cliente eliminado correctamente',
            data: { id: deleted._id, nombre: deleted.nombre }
        });
        
    } catch (error) {
        console.error('❌ Error eliminando cliente:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor al eliminar cliente' 
        });
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