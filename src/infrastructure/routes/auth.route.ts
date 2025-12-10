import { Router } from "express";
import { logMiddleware } from "../middleware/log";
const path = require('path');
const fs = require('fs');

const router = Router();
router.use(logMiddleware);

// Ruta para verificar contraseña de administrador
router.post('/verify', async (req, res) => {
    const backendEnvPath = path.join(__dirname, '.env');

    try {
        const { password } = req.body;
        let correctPassword = '';
    
        if (fs.existsSync(backendEnvPath)) {
            const backendEnvContent = fs.readFileSync(backendEnvPath, 'utf8');
            
            // Buscar PASSWORD en el archivo .env
            const passwordMatch = backendEnvContent.match(/PASSWORD=(.*)/);
            if (passwordMatch) correctPassword = passwordMatch[1].trim();
        }
        
        if (!password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Contraseña requerida' 
            });
        }
        
        if (password === correctPassword) {
            return res.json({ 
                success: true, 
                message: 'Autenticación exitosa' 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta' 
            });
        }
    } catch (error) {
        console.error('Error en verificación:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

export { router };