import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import { exec } from 'child_process';

const router: Router = Router();

/**
 * http://localhost/start POST
 */
router.post("/run-script", logMiddleware, (req, res) => {
  exec('sh start.sh', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.status(500).send('Error ejecutando script');
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    res.send(`Script ejecutado con éxito. Salida: ${stdout}`);
  });
});

export { router };