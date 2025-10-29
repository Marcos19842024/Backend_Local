import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";

// Configuración de multer para memoria (más flexible)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10MB
    }
});

const router: Router = Router();
const checklistDir = `${process.cwd()}/tmp/checklists`;

// MANEJAR PREFLIGHT REQUESTS EXPLÍCITAMENTE PARA CADA RUTA
router.options('/save', (req, res) => {
    console.log('✅ Preflight para /checklist/save');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.status(200).end();
});

router.options('/files', (req, res) => {
    console.log('✅ Preflight para /checklist/files');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.status(200).end();
});

router.options('/file/:filename', (req, res) => {
    console.log('✅ Preflight para /checklist/file/:filename');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.status(200).end();
});

// Endpoints específicos para checklist
router.post('/save', upload.array('files'), async (req, res) => {
    try {
        console.log('📨 POST /checklist/save recibido');
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // Guardar archivos en una carpeta de checklist
        if (!fs.existsSync(checklistDir)) {
            fs.mkdirSync(checklistDir, { recursive: true });
        }

        // Mover archivos a la carpeta de checklists
        const savedFiles = [];
        for (const file of files) {
            const filePath = path.join(checklistDir, file.originalname);
            
            // Verificar si el archivo ya existe y crear nombre único
            let finalFilePath = filePath;
            let counter = 1;
            const fileExt = path.extname(file.originalname);
            const fileName = path.basename(file.originalname, fileExt);
            
            while (fs.existsSync(finalFilePath)) {
                finalFilePath = path.join(checklistDir, `${fileName}_${counter}${fileExt}`);
                counter++;
            }
            
            await fs.promises.writeFile(finalFilePath, file.buffer);
            savedFiles.push(path.basename(finalFilePath));
        }

        console.log('✅ Checklist guardado:', savedFiles);
        res.json({ 
            success: true, 
            message: 'Checklist guardado correctamente',
            files: savedFiles 
        });
    } catch (error) {
        console.error('Error saving checklist:', error);
        res.status(500).json({ error: 'Error al guardar el checklist' });
    }
});

router.get('/files', async (req, res) => {
    try {
        console.log('📨 GET /checklist/files recibido');
        
        if (!fs.existsSync(checklistDir)) {
            return res.json([]);
        }

        const files = await fs.promises.readdir(checklistDir);
        const fileList = await Promise.all(
            files.map(async (file) => {
                const filePath = path.join(checklistDir, file);
                const stats = await fs.promises.stat(filePath);
                return {
                    name: file,
                    type: path.extname(file),
                    size: stats.size,
                    modified: stats.mtime,
                    created: stats.birthtime
                };
            })
        );

        // Ordenar por fecha de modificación (más reciente primero)
        fileList.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

        console.log(`✅ Enviando ${fileList.length} archivos de checklist`);
        res.json(fileList);
    } catch (error) {
        console.error('Error loading checklist files:', error);
        res.status(500).json({ error: 'Error al cargar los archivos del checklist' });
    }
});

router.get('/file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        console.log('📨 GET /checklist/file/', filename);
        
        const filePath = path.join(checklistDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // Determinar el tipo de contenido de forma segura
        const ext = path.extname(filename).toLowerCase();
        
        // Objeto con tipos MIME - usando any para evitar errores de TypeScript
        const contentTypes: any = {
            '.pdf': 'application/pdf',
            '.json': 'application/json',
            '.txt': 'text/plain'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        
        res.setHeader('Content-Type', contentType);
        
        if (ext === '.json') {
            // Para JSON, enviar como objeto
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const jsonData = JSON.parse(fileContent);
            res.json(jsonData);
        } else {
            // Para otros archivos, enviar como stream
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        }
    } catch (error) {
        console.error('Error loading checklist file:', error);
        res.status(500).json({ error: 'Error al cargar el archivo del checklist' });
    }
});

router.delete('/file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        console.log('📨 DELETE /checklist/file/', filename);
        
        const filePath = path.join(checklistDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        await fs.promises.unlink(filePath);
        res.json({ success: true, message: 'Archivo eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting checklist file:', error);
        res.status(500).json({ error: 'Error al eliminar el archivo del checklist' });
    }
});

export { router };