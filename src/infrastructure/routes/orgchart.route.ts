import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

const router = express.Router();

const DATA_PATH = path.join(process.cwd(), "tmp/orgchart/orgData.json");

// Configuración de multer para la subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Crear carpeta para el empleado si no existe
        const employeeName = req.params.employeeName;
        const uploadPath = path.join(process.cwd(), 'tmp/orgchart', 'employees', employeeName);

        if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Mantener el nombre original del archivo
        cb(null, file.originalname);
    }
});

// Filtrar solo archivos PDF y Word
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF y Word'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10MB
    }
});

// Leer datos del JSON
const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

// Guardar datos en JSON
const saveData = (data: any) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");

/**
 * http://localhost/orgchart GET
 */
router.get("/", (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "No se pudo leer el archivo" });
    }
});

/**
 * http://localhost/orgchart POST
 */
router.post("/", (req, res) => {
    try {
        saveData(req.body);
        res.json({ message: "Organigrama guardado correctamente" });
    } catch (err) {
        res.status(500).json({ error: "No se pudo guardar el archivo" });
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

        res.status(200).send();
    } catch (error) {
        console.error("Error al subir archivo:", error);
        res.status(500).json({ error: "Error al subir el archivo" });
    }
});

/**
 * Obtener archivos de un empleado específico
 * http://localhost/orgchart/employees/:employeeName GET
 */
router.get("/employees/:employeeName", (req, res) => {
    try {
        const employeeName = req.params.employeeName;
        const employeePath = path.join(process.cwd(), 'tmp/orgchart', 'employees', employeeName);
        
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

/**
 * Eliminar archivo de un empleado
 * http://localhost/orgchart/employees/:employeeName/:fileName DELETE
 */
router.delete("/employees/:employeeName/:fileName", (req, res) => {
    try {
        const { employeeName, fileName } = req.params;
        const filePath = path.join(process.cwd(), 'tmp/orgchart', 'employees', employeeName, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        fs.unlinkSync(filePath);
        res.json({ message: "Archivo eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar archivo:", error);
        res.status(500).json({ error: "Error al eliminar el archivo" });
    }
});

export { router };