import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import nodemailer from "nodemailer";
import archiver from "archiver";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const ruta = `${process.cwd()}/tmp/orgchart`
const DATA_PATH = path.join(ruta,"orgData.json");
const rutaBase = path.join(ruta,"employees")

// Función para leer datos del JSON
const readData = () => {
    if (!fs.existsSync(DATA_PATH)) {
        return { employees: [] };
    }
    return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
};

// Función para guardar datos en JSON
const saveData = (data: any) => {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log("Organigrama actualizado correctamente")
};

// Función para crear carpeta de empleado
const createEmployeeFolder = (employeeName: string) => {
    const employeePath = path.join(rutaBase, employeeName);
    if (!fs.existsSync(employeePath)) {
        fs.mkdirSync(employeePath, { recursive: true });
        console.log("Se creó la carpeta ", employeeName)
    }
    return employeePath;
};

// Función para eliminar carpeta de empleado
const deleteEmployeeFolder = (employeeName: string) => {
    const employeePath = path.join(rutaBase, employeeName);
    if (fs.existsSync(employeePath)) {
        // Eliminar todos los archivos primero
        const files = fs.readdirSync(employeePath);
        files.forEach(file => {
            fs.unlinkSync(path.join(employeePath, file));
        });
        // Eliminar la carpeta
        fs.rmdirSync(employeePath);
        console.log("Se eliminó le empleado ", employeeName)
    }
};

// Función para renombrar carpeta de empleado
const renameEmployeeFolder = (oldName: string, newName: string) => {
    const oldPath = path.join(rutaBase, oldName);
    const newPath = path.join(rutaBase, newName);
    
    if (fs.existsSync(oldPath)) {
        // Si la nueva carpeta ya existe, eliminarla primero
        if (fs.existsSync(newPath)) {
            deleteEmployeeFolder(newName);
        }
        // Renombrar la carpeta
        fs.renameSync(oldPath, newPath);
        console.log("Se cambió ", oldName, "por ", newName)
        return true;
    }
    return false;
};

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const employeeName = req.params.employeeName;
        const uploadPath = createEmployeeFolder(employeeName);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

// Filtrar solo archivos PDF
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10MB
    }
});

/**
 * Función recursiva para obtener todos los empleados de la estructura jerárquica
 */
const getAllEmployees = (node: any): any[] => {
    const employees: any[] = [];
    
    if (node && node.name) {
        employees.push({
            id: node.id,
            name: node.name,
        });
    }
    
    if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => {
            employees.push(...getAllEmployees(child));
        });
    }
    
    return employees;
};

/**
 * Encuentra empleados renombrados comparando datos antiguos y nuevos
 */
const findRenamedEmployees = (oldData: any, newData: any) => {
    const renamed: { oldName: string; newName: string }[] = [];
    
    // Obtener todos los empleados de ambas estructuras
    const oldEmployees = getAllEmployees(oldData);
    const newEmployees = getAllEmployees(newData);
    
    // Buscar por ID
    const oldEmployeesById: { [key: string]: any } = {};
    oldEmployees.forEach((emp: any) => {
        if (emp.id) oldEmployeesById[emp.id] = emp;
    });

    newEmployees.forEach((newEmp: any) => {
        if (newEmp.id && oldEmployeesById[newEmp.id]) {
            const oldEmp = oldEmployeesById[newEmp.id];
            if (oldEmp.name !== newEmp.name) {
                renamed.push({ oldName: oldEmp.name, newName: newEmp.name });
            }
        }
    });

    return renamed;
};

// Configurar transporte de correo
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Función auxiliar para limpieza
function cleanup(tmpZipPath: string | null) {
    if (tmpZipPath && fs.existsSync(tmpZipPath)) {
        try {
            fs.unlinkSync(tmpZipPath);
            console.log("Archivo temporal eliminado:", tmpZipPath);
        } catch (err) {
            console.error("Error eliminando ZIP temporal:", err);
        }
    }
}

/**
 * Configuración de multer para MyDocuments
 */
const myDocumentsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderName = req.params.folderName;
        const subfolder = req.body.subfolder || ''; // Nueva: soporte para subcarpetas
        
        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'orgchart/mydocuments/contratacion',
            'leyes': 'orgchart/mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'orgchart/mydocuments/reportes y memorandums',
            'router': 'orgchart/mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return cb(new Error('Carpeta no válida'), '');
        }

        let uploadPath = path.join(ruta, actualFolderPath);
        
        // Si hay subcarpeta, agregarla a la ruta
        if (subfolder) {
            uploadPath = path.join(uploadPath, subfolder);
        }
        
        // Crear la carpeta si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log(`Carpeta creada: ${uploadPath}`);
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, sanitizedName);
    }
});

// Filtrar tipos de archivo permitidos para MyDocuments
const myDocumentsFileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se permiten: PDF, Word, Excel, PowerPoint, imágenes y texto'));
    }
};

const uploadMyDocuments = multer({
    storage: myDocumentsStorage,
    fileFilter: myDocumentsFileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // Límite de 50MB
    }
});

/**
 * Función recursiva para obtener la estructura de carpetas y archivos
 */
const getFolderStructure = (folderPath: string, basePath: string, folderName: string) => {
    const structure: any = {
        name: path.basename(folderPath),
        path: folderPath.replace(basePath, '').replace(/\\/g, '/'),
        type: 'folder',
        items: []
    };

    if (fs.existsSync(folderPath)) {
        const items = fs.readdirSync(folderPath, { withFileTypes: true });
        
        items.forEach(item => {
            const itemPath = path.join(folderPath, item.name);
        
            if (item.isDirectory()) {
                // Es una subcarpeta - llamada recursiva
                const subFolder = getFolderStructure(itemPath, basePath, folderName);
                structure.items.push(subFolder);
            } else if (item.isFile() && !item.name.startsWith('.')) {
                // Es un archivo
                const stats = fs.statSync(itemPath);
                const fileExt = path.extname(item.name).toLowerCase().replace('.', '');
                
                structure.items.push({
                    name: item.name,
                    path: `/orgchart/mydocuments/${folderName}${structure.path}/${item.name}`.replace(/\/\//g, '/'),
                    fullPath: structure.path ? `${structure.path}/${item.name}` : item.name,
                    size: stats.size,
                    uploadDate: stats.mtime,
                    type: fileExt,
                    isFile: true
                });
            }
        });
    }
    
    return structure;
};

/**
 * Función para crear subcarpetas
 */
const createSubfolder = (folderPath: string, subfolderName: string) => {
    const subfolderPath = path.join(folderPath, subfolderName);
  
    if (!fs.existsSync(subfolderPath)) {
        fs.mkdirSync(subfolderPath, { recursive: true });
        console.log(`Subcarpeta creada: ${subfolderPath}`);
        return true;
    }
    return false;
};

/**
 * Obtener el organigrama inicialmente
 * http://localhost/orgchart GET
 */
router.get("/", (req, res) => {
    try {
        const data = readData();
        res.json(data);
        console.log("Lista de empleados cargada")
    } catch (err) {
        res.status(500).json({ error: "No se pudo leer el archivo" });
        console.log("No se pudo leer el archivo")
    }
});

/**
 * Guarda el organigrama y gestiona carpetas de empleados (función addChild, editNode y deleteNode)
 * http://localhost/orgchart POST
 */
router.post("/", (req, res) => {
    try {
        const newData = req.body;
        const oldData = readData();
        
        // 1. Detectar empleados renombrados
        const renamedEmployees = findRenamedEmployees(oldData, newData);
        
        // 2. Renombrar carpetas de empleados
        renamedEmployees.forEach(({ oldName, newName }) => {
            if (oldName && newName) {
                renameEmployeeFolder(oldName, newName);
            }
        });
        
        // 3. Guardar los nuevos datos
        saveData(newData);
    
        // 4. Obtener todos los empleados de la nueva estructura
        const allNewEmployees = getAllEmployees(newData);
        const allOldEmployees = getAllEmployees(oldData);
        
        // 5. Crear carpetas para nuevos empleados
        const newEmployees = allNewEmployees.filter(newEmp => 
            !allOldEmployees.some(oldEmp => oldEmp.id === newEmp.id)
        );
        
        newEmployees.forEach(employee => {
            if (employee.name) {
                createEmployeeFolder(employee.name);
            }
        });
        
        // 6. Identificar empleados eliminados y borrar sus carpetas
        const deletedEmployees = allOldEmployees.filter(oldEmp => 
            !allNewEmployees.some(newEmp => newEmp.id === oldEmp.id) &&
            !renamedEmployees.some(renamed => renamed.oldName === oldEmp.name)
        );
        
        deletedEmployees.forEach(employee => {
            if (employee.name) {
                deleteEmployeeFolder(employee.name);
            }
        });
        
        res.json({ 
            message: "Organigrama guardado correctamente",
            renamed: renamedEmployees.length,
            created: newEmployees.length,
            deleted: deletedEmployees.length
        });
        
        console.log("Organigrama guardado correctamente",
            "renamed: ", renamedEmployees.length,
            "created: ", newEmployees.length,
            "deleted: ", deletedEmployees.length);
            
    } catch (err) {
        console.error("Error al guardar organigrama:", err);
        res.status(500).json({ error: "No se pudo guardar el archivo" });
    }
});

/************************************
 * **********************************
 * Estas rutas son para el FileViewer
 * **********************************
 * *********************************/

/**
 * Obtener archivos de un empleado específico
 * http://localhost/orgchart/employees/:employeeName GET
 */
router.get("/employees/:employeeName", (req, res) => {
    try {
        const employeeName = req.params.employeeName;
        const employeePath = path.join(rutaBase, employeeName);
        
        if (!fs.existsSync(employeePath)) {
            return res.json([]);
        }

        const files = fs.readdirSync(employeePath).map(file => {
            const filePath = path.join(employeePath, file);
            const stats = fs.statSync(filePath);
            
            return {
                name: file,
                path: `/employees/${employeeName}/${file}`,
                size: stats.size,
                uploadDate: stats.mtime
            };
        });

        res.json(files);
    } catch (error) {
        console.error("Error al obtener archivos:", error);
        res.status(500).json({ error: "Error al obtener los archivos" });
    }
});

router.get("/employees/:employeeName/:fileName", (req, res) => {
    try {
        const { employeeName, fileName } = req.params;
        const filePath = path.join(rutaBase, employeeName, fileName);
        
        console.log(`Buscando archivo: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
            console.log(`Archivo no encontrado: ${filePath}`);
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        // Si es un archivo JSON, leer y parsear
        if (fileName.endsWith('.json')) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            try {
                const jsonData = JSON.parse(fileContent);
                console.log(`JSON cargado correctamente: ${fileName}`);
                res.json(jsonData);
            } catch (parseError) {
                console.error(`Error parseando JSON ${fileName}:`, parseError);
                res.status(500).json({ error: "Error al parsear el archivo JSON" });
            }
        } else {
            // Para otros archivos, enviar el archivo directamente
            res.sendFile(filePath);
        }
    } catch (error) {
        console.error("Error al obtener archivo:", error);
        res.status(500).json({ error: "Error al obtener el archivo" });
    }
});

/**
 * Subir archivo para un empleado específico
 * http://localhost/orgchart/employees/:employeeName POST
 */
router.post("/employees/:employeeName", upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se proporcionó ningún archivo" });
        }

        // Guardar el JSON si existe
        if (req.body.jsonData) {
            const jsonData = JSON.parse(req.body.jsonData);
            
            // Usar el mismo nombre base que el PDF pero con extensión .json
            const pdfNameWithoutExt = path.parse(req.file.originalname).name;
            const jsonFileName = `${pdfNameWithoutExt}.json`;
            const jsonPath = path.join(rutaBase, req.params.employeeName, jsonFileName);
            
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
            
            console.log(`Archivos del empleado "${req.params.employeeName}" guardados correctamente`);
        }

        res.status(200).send();
    } catch (error) {
        console.error("Error al subir archivo:", error);
        res.status(500).json({ error: "Error al subir el archivo" });
    }
});

/**
 * Eliminar archivo de un empleado
 * http://localhost/orgchart/employees/:employeeName/:fileName DELETE
 */
router.delete("/employees/:employeeName/:fileName", (req, res) => {
    try {
        const { employeeName, fileName } = req.params;
        const filePath = path.join(rutaBase, employeeName, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        fs.unlinkSync(filePath);

        // Eliminar también el JSON correspondiente si existe
        if (fileName.endsWith('.pdf')) {
            const jsonFileName = fileName.replace('.pdf', '.json');
            const jsonFilePath = path.join(rutaBase, employeeName, jsonFileName);
            
            // Verificar si existe el archivo JSON antes de eliminarlo
            if (fs.existsSync(jsonFilePath)) {
                fs.unlinkSync(jsonFilePath);
            }
        }
        
        res.json({ message: "Archivo eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar archivo:", error);
        res.status(500).json({ error: "Error al eliminar el archivo" });
    }
});

/**
 * Genera un ZIP con el expediente con el expediente del empleado
 * http://localhost/orgchart/download&SendMailZip/:employeeName GET
 */
/**
 * Solo enviar por correo (retorna JSON)
 */
router.post("/send-mail-zip/:employeeName", async (req, res) => {
    let tmpZipPath: string | null = null;
    
    try {
        const { employeeName } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email es requerido" });
        }

        // 📦 Crear directorio tmp si no existe
        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // 📂 Ruta del archivo ZIP
        tmpZipPath = path.join(tmpDir, `${employeeName}_${Date.now()}.zip`);

        // Verificar que el empleado existe
        const employeePath = path.join(rutaBase, employeeName);
        if (!fs.existsSync(employeePath)) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        // Crear ZIP
        const output = fs.createWriteStream(tmpZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(employeePath, employeeName);
        
        await archive.finalize();

        // Esperar a que se complete la escritura
        await new Promise<void>((resolve, reject) => {
            output.on('close', () => resolve());
            output.on('error', (error) => reject(error));
        });

        console.log('ZIP creado en:', tmpZipPath);

        // Verificar que el archivo ZIP se creó correctamente
        if (!fs.existsSync(tmpZipPath)) {
            throw new Error("No se pudo crear el archivo ZIP");
        }

        // 🔔 Enviar correo
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: `📦 Expediente de ${employeeName} (ZIP)`,
                text: `Se adjunta el expediente de ${employeeName} comprimido en ZIP.`,
                attachments: [
                    {
                        filename: `${employeeName}.zip`,
                        path: tmpZipPath, // ✅ Ahora tmpZipPath no es null
                        contentType: "application/zip",
                    },
                ],
            };

            await transporter.sendMail(mailOptions);
            console.log('Correo enviado a:', email);
            
            res.json({
                success: true,
                message: "Expediente enviado por correo correctamente",
                emailSent: true
            });
            
        } catch (mailError) {
            console.error('Error enviando correo:', mailError);
            res.status(500).json({
                success: false,
                message: "Error al enviar el correo",
                error: mailError instanceof Error ? mailError.message : String(mailError)
            });
        } finally {
            // Limpiar archivo temporal
            cleanup(tmpZipPath);
        }

    } catch (err) {
        console.error('Error en el proceso:', err);
        cleanup(tmpZipPath);
        res.status(500).json({
            success: false,
            message: "Error al procesar la solicitud",
            error: err instanceof Error ? err.message : String(err)
        });
    }
});

/**
 * Solo descargar (retorna archivo ZIP)
 */
router.get("/download-zip/:employeeName", async (req, res) => {
    let tmpZipPath: string | null = null;
    
    try {
        const { employeeName } = req.params;

        // 📦 Crear directorio tmp si no existe
        const tmpDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // 📂 Ruta del archivo ZIP
        tmpZipPath = path.join(tmpDir, `${employeeName}_${Date.now()}.zip`);

        // Verificar que el empleado existe
        const employeePath = path.join(rutaBase, employeeName);
        if (!fs.existsSync(employeePath)) {
            return res.status(404).json({ message: "Empleado no encontrado" });
        }

        // Crear ZIP
        const output = fs.createWriteStream(tmpZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(employeePath, employeeName);
        
        await archive.finalize();

        // Esperar a que se complete la escritura
        await new Promise<void>((resolve, reject) => {
            output.on('close', () => resolve());
            output.on('error', (error) => reject(error));
        });

        console.log('ZIP creado en:', tmpZipPath);

        // Verificar que el archivo ZIP se creó correctamente
        if (!fs.existsSync(tmpZipPath)) {
            throw new Error("No se pudo crear el archivo ZIP");
        }

        console.log('Enviando ZIP para descarga...');
        
        // Configurar headers para descarga
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${employeeName}.zip"`);
        
        // Stream el archivo directamente
        const fileStream = fs.createReadStream(tmpZipPath);
        fileStream.pipe(res);
        
        // Limpiar después de enviar
        fileStream.on('close', () => {
            cleanup(tmpZipPath);
        });
        
        fileStream.on('error', (error) => {
            console.error('Error streaming file:', error);
            cleanup(tmpZipPath);
            res.status(500).end();
        });

    } catch (err) {
        console.error('Error en el proceso:', err);
        cleanup(tmpZipPath);
        res.status(500).json({
            success: false,
            message: "Error al procesar la solicitud",
            error: err instanceof Error ? err.message : String(err)
        });
    }
});

/************************************
 * **********************************
 * Estas rutas son para MyDocuments
 * **********************************
 * *********************************/

/**
 * Obtener archivos de una carpeta específica en MyDocuments
 * http://localhost/orgchart/mydocuments/:folderName GET
 */
router.get("/mydocuments/:folderName", (req, res) => {
    try {
        const folderName = req.params.folderName;
        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y protocolos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        const folderPath = path.join(ruta, actualFolderPath);
        
        // Crear la carpeta si no existe
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`Carpeta creada: ${folderPath}`);
            return res.json([]);
        }

        const files = fs.readdirSync(folderPath)
            .filter(file => !file.startsWith('.')) // Excluir archivos ocultos
            .map(file => {
                const filePath = path.join(folderPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    url: `/orgchart/mydocuments/${folderName}/${file}`,
                    size: stats.size,
                    uploadDate: stats.mtime,
                    type: path.extname(file).toLowerCase().replace('.', '')
                };
            });

        res.json(files);
    } catch (error) {
        console.error("Error al obtener archivos de MyDocuments:", error);
        res.status(500).json({ error: "Error al obtener los archivos" });
    }
});

/**
 * Obtener un archivo específico de MyDocuments
 * http://localhost/orgchart/mydocuments/:folderName/:fileName GET
 */
router.get("/mydocuments/:folderName/:fileName", (req, res) => {
    try {
        const { folderName, fileName } = req.params;
        
        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        const filePath = path.join(ruta, actualFolderPath, fileName);
        console.log(`Buscando archivo en MyDocuments: ${filePath}`);

        if (!fs.existsSync(filePath)) {
            console.log(`Archivo no encontrado: ${filePath}`);
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        // Si es un archivo JSON, leer y parsear
        if (fileName.endsWith('.json')) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            try {
                const jsonData = JSON.parse(fileContent);
                console.log(`JSON cargado correctamente de MyDocuments: ${fileName}`);
                res.json(jsonData);
            } catch (parseError) {
                console.error(`Error parseando JSON ${fileName}:`, parseError);
                res.status(500).json({ error: "Error al parsear el archivo JSON" });
            }
        } else {
            // Para otros archivos, enviar el archivo directamente
            res.sendFile(filePath);
        }
    } catch (error) {
        console.error("Error al obtener archivo de MyDocuments:", error);
        res.status(500).json({ error: "Error al obtener el archivo" });
    }
});

/**
 * Subir archivo a una carpeta específica en MyDocuments
 * http://localhost/orgchart/mydocuments/:folderName POST
 */
router.post("/mydocuments/:folderName", uploadMyDocuments.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se proporcionó ningún archivo" });
        }

        console.log(`Archivo subido a MyDocuments: ${req.file.originalname} en carpeta ${req.params.folderName}`);
        
        res.status(200).json({ 
            message: "Archivo subido correctamente",
            file: {
                name: req.file.filename,
                size: req.file.size,
                url: `/orgchart/mydocuments/${req.params.folderName}/${req.file.filename}`
            }
        });
    } catch (error) {
        console.error("Error al subir archivo a MyDocuments:", error);
        res.status(500).json({ error: "Error al subir el archivo" });
    }
});

/**
 * Eliminar archivo de MyDocuments
 * http://localhost/orgchart/mydocuments/:folderName/:fileName DELETE
 */
router.delete("/mydocuments/:folderName/:fileName", (req, res) => {
    try {
        const { folderName, fileName } = req.params;
        
        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        const filePath = path.join(ruta, actualFolderPath, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        fs.unlinkSync(filePath);
        console.log(`Archivo eliminado de MyDocuments: ${filePath}`);

        res.json({ message: "Archivo eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar archivo de MyDocuments:", error);
        res.status(500).json({ error: "Error al eliminar el archivo" });
    }
});

/**
 * Obtener todas las carpetas de MyDocuments con su contenido
 * http://localhost/orgchart/mydocuments GET
 */
router.get("/mydocuments", (req, res) => {
    try {
        const myDocumentsPath = path.join(ruta, "mydocuments");
        
        // Crear la estructura base si no existe
        if (!fs.existsSync(myDocumentsPath)) {
            fs.mkdirSync(myDocumentsPath, { recursive: true });
            
            // Crear subcarpetas
            const subfolders = [
                'contratacion',
                'leyes, procedimientos y procedimientos',
                'reportes y memorandums',
                'router'
            ];
            
            subfolders.forEach(folder => {
                const folderPath = path.join(myDocumentsPath, folder);
                fs.mkdirSync(folderPath, { recursive: true });
            });
            
            console.log("Estructura de MyDocuments creada");
            return res.json({ folders: [] });
        }

        // Leer las carpetas existentes
        const folders = fs.readdirSync(myDocumentsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const folderPath = path.join(myDocumentsPath, dirent.name);
                const files = fs.readdirSync(folderPath)
                    .filter(file => !file.startsWith('.'))
                    .map(file => {
                        const filePath = path.join(folderPath, file);
                        const stats = fs.statSync(filePath);
                        return {
                            name: file,
                            size: stats.size,
                            uploadDate: stats.mtime,
                            type: path.extname(file).toLowerCase().replace('.', '')
                        };
                    });

                return {
                    name: dirent.name,
                    fileCount: files.length,
                    files: files
                };
            });

        res.json({ folders });
    } catch (error) {
        console.error("Error al obtener carpetas de MyDocuments:", error);
        res.status(500).json({ error: "Error al obtener las carpetas" });
    }
});

/**
 * Obtener estructura completa de carpetas y subcarpetas
 * http://localhost/orgchart/mydocuments-structure/:folderName GET
 */
router.get("/mydocuments-structure/:folderName", (req, res) => {
    try {
        const folderName = req.params.folderName;
        
        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        const folderPath = path.join(ruta, actualFolderPath);
        
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            return res.json({ name: folderName, path: '', type: 'folder', items: [] });
        }

        const structure = getFolderStructure(folderPath, path.join(ruta, 'mydocuments'), folderName);
        res.json(structure);
        
    } catch (error) {
        console.error("Error al obtener estructura de carpetas:", error);
        res.status(500).json({ error: "Error al obtener la estructura de carpetas" });
    }
});

/**
 * Crear subcarpeta
 * http://localhost/orgchart/mydocuments/:folderName/subfolder POST
 */
router.post("/mydocuments/:folderName/subfolder", (req, res) => {
    try {
        const folderName = req.params.folderName;
        const { subfolderName, parentPath = '' } = req.body;

        if (!subfolderName) {
        return res.status(400).json({ error: "Nombre de subcarpeta requerido" });
        }

        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        let fullPath = path.join(ruta, actualFolderPath);
        
        // Si hay ruta padre, agregarla
        if (parentPath) {
            fullPath = path.join(fullPath, parentPath);
        }
        
        // Crear la subcarpeta
        const created = createSubfolder(fullPath, subfolderName);
        
        if (created) {
            res.json({ message: "Subcarpeta creada correctamente", path: parentPath ? `${parentPath}/${subfolderName}` : subfolderName });
        } else {
            res.status(400).json({ error: "La subcarpeta ya existe" });
        }
        
    } catch (error) {
        console.error("Error al crear subcarpeta:", error);
        res.status(500).json({ error: "Error al crear la subcarpeta" });
    }
});

/**
 * Eliminar subcarpeta
 * http://localhost/orgchart/mydocuments/:folderName/subfolder DELETE
 */
router.delete("/mydocuments/:folderName/subfolder", (req, res) => {
    try {
        const folderName = req.params.folderName;
        const { subfolderPath } = req.body;

        if (!subfolderPath) {
            return res.status(400).json({ error: "Ruta de subcarpeta requerida" });
        }

        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        const fullPath = path.join(ruta, actualFolderPath, subfolderPath);
        
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: "Subcarpeta no encontrada" });
        }

        // Verificar que es un directorio
        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: "La ruta especificada no es una carpeta" });
        }

        // Eliminar recursivamente
        fs.rmSync(fullPath, { recursive: true, force: true });
        
        res.json({ message: "Subcarpeta eliminada correctamente" });
        
    } catch (error) {
        console.error("Error al eliminar subcarpeta:", error);
        res.status(500).json({ error: "Error al eliminar la subcarpeta" });
    }
});

/**
 * Obtener archivos de una subcarpeta específica
 * http://localhost/orgchart/mydocuments/:folderName/files GET
 */
router.get("/mydocuments/:folderName/files", (req, res) => {
    try {
        const folderName = req.params.folderName;
        const subfolder = req.query.subfolder as string || '';

        // Mapear los nombres de carpetas a las rutas reales
        const folderMap = {
            'contratacion': 'mydocuments/contratacion',
            'leyes': 'mydocuments/leyes, procedimientos y procedimientos',
            'reportes': 'mydocuments/reportes y memorandums',
            'router': 'mydocuments/router'
        };

        const actualFolderPath = folderMap[folderName];
        if (!actualFolderPath) {
            return res.status(404).json({ error: "Carpeta no encontrada" });
        }

        let folderPath = path.join(ruta, actualFolderPath);
        
        // Si hay subcarpeta, agregarla a la ruta
        if (subfolder) {
            folderPath = path.join(folderPath, subfolder);
        }
        
        // Crear la carpeta si no existe
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`Carpeta creada: ${folderPath}`);
            return res.json([]);
        }

        const files = fs.readdirSync(folderPath)
        .filter(file => !file.startsWith('.')) // Excluir archivos ocultos
        .map(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            
            // Solo archivos, no carpetas
            if (stats.isFile()) {
                return {
                    name: file,
                    url: `/orgchart/mydocuments/${folderName}/${file}`,
                    fullPath: subfolder ? `${subfolder}/${file}` : file,
                    size: stats.size,
                    uploadDate: stats.mtime,
                    type: path.extname(file).toLowerCase().replace('.', ''),
                    folder: folderName,
                    subfolder: subfolder || ''
                };
            }
            return null;
        })
        .filter(Boolean); // Remover nulls

        res.json(files);
    } catch (error) {
        console.error("Error al obtener archivos de subcarpeta:", error);
        res.status(500).json({ error: "Error al obtener los archivos" });
    }
});

export { router };