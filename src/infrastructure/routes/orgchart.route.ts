import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

const router = express.Router();

const DATA_PATH = path.join(process.cwd(), "tmp/orgchart/orgData.json");

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
    const employeePath = path.join(process.cwd(), 'tmp/orgchart', 'employees', employeeName);
    if (!fs.existsSync(employeePath)) {
        fs.mkdirSync(employeePath, { recursive: true });
        console.log("Se creó la carpeta ", employeeName)
    }
    return employeePath;
};

// Función para eliminar carpeta de empleado
const deleteEmployeeFolder = (employeeName: string) => {
    const employeePath = path.join(process.cwd(), 'tmp/orgchart', 'employees', employeeName);
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
    const oldPath = path.join(process.cwd(), 'tmp/orgchart', 'employees', oldName);
    const newPath = path.join(process.cwd(), 'tmp/orgchart', 'employees', newName);
    
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

/**
 * Función recursiva para obtener todos los empleados de la estructura jerárquica
 */
const getAllEmployees = (node: any): any[] => {
    const employees: any[] = [];
    
    if (node && node.name) {
        employees.push({
            id: node.id,
            name: node.name,
            alias: node.alias
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

/**
 * Actualizar empleado específico (función edit)
 * http://localhost/orgchart/employees/:oldName PUT
 */
// router.put("/employees/:oldName", (req, res) => {
//     try {
//         const oldName = req.params.oldName;
//         const { newName, ...otherData } = req.body;

//         const data = readData();
        
//         // Función recursiva para encontrar y actualizar empleado
//         const updateEmployeeInTree = (node: any): boolean => {
//             if (node.name === oldName) {
//                 if (newName && newName !== oldName) {
//                     renameEmployeeFolder(oldName, newName);
//                     node.name = newName;
//                 }
//                 Object.assign(node, otherData);
//                 return true;
//             }
            
//             if (node.children && Array.isArray(node.children)) {
//                 for (let i = 0; i < node.children.length; i++) {
//                     if (updateEmployeeInTree(node.children[i])) {
//                         return true;
//                     }
//                 }
//             }
            
//             return false;
//         };
        
//         const updated = updateEmployeeInTree(data);
        
//         if (!updated) {
//             console.log("Empleado no encontrado")
//             return res.status(404).json({ error: "Empleado no encontrado" });
//         }
        
//         saveData(data);
//         res.json({ message: "Empleado actualizado correctamente" });
//         console.log("Empleado actualizado correctamente");
        
//     } catch (error) {
//         console.error("Error al actualizar empleado:", error);
//         res.status(500).json({ error: "Error al actualizar el empleado" });
//     }
// });

/**
 * Eliminar empleado específico y su carpeta (funcion delete)
 * http://localhost/orgchart/employees/:employeeName DELETE
 */
// router.delete("/employees/:employeeName", (req, res) => {
//     try {
//         const employeeName = req.params.employeeName;
        
//         // Función recursiva para eliminar empleado del árbol
//         const deleteEmployeeFromTree = (node: any): boolean => {
//             if (node.children && Array.isArray(node.children)) {
//                 const index = node.children.findIndex((child: any) => child.name === employeeName);
//                 if (index !== -1) {
//                     node.children.splice(index, 1);
//                     return true;
//                 }
                
//                 for (let i = 0; i < node.children.length; i++) {
//                     if (deleteEmployeeFromTree(node.children[i])) {
//                         return true;
//                     }
//                 }
//             }
//             return false;
//         };
        
//         const data = readData();
//         const deleted = deleteEmployeeFromTree(data);
        
//         if (!deleted) {
//             return res.status(404).json({ error: "Empleado no encontrado" });
//         }
        
//         saveData(data);
        
//         // Eliminar carpeta del empleado
//         deleteEmployeeFolder(employeeName);
//         console.log("Empleado eliminado correctamente");
//         res.status(200).json({ message: "Empleado eliminado correctamente" });
        
//     } catch (error) {
//         console.error("Error al eliminar empleado:", error);
//         res.status(500).json({ error: "Error al eliminar el empleado" });
//     }
// });

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