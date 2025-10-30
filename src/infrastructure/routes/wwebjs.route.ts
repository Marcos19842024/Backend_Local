import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import container from "../ioc";
import fs from "fs";
import multer from "multer";
import { StatusCtrl, ContactCtrl, LeadCtrl } from "../controller/wwebjs";

const router: Router = Router();
const statusCtrl: StatusCtrl = container.get("status.ctrl");
const contactCtrl: ContactCtrl = container.get("contact.ctrl");
const leadCtrl: LeadCtrl = container.get("lead.ctrl");
const whatsappInstance = leadCtrl.getLeadExternal();
const path = `${process.cwd()}/tmp/media`;

const diskstorage = multer.diskStorage({
    destination: path,
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})

const fileUpload = multer({
    storage: diskstorage
}).array('files')

/**
 * ENDPOINTS NUEVOS PARA CONTROL MANUAL
 */

/**
 * Iniciar WhatsApp manualmente
 * POST http://localhost/start
 */
router.post("/start", logMiddleware, async (req, res) => {
  try {
    const result = await whatsappInstance.initializeWhatsApp();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      err: true,
      status: "500",
      statusText: `Error iniciando WhatsApp: ${error.message}`
    });
  }
});

/**
 * Detener WhatsApp manualmente  
 * POST http://localhost/stop
 */
router.post("/stop", logMiddleware, async (req, res) => {
  try {
    const result = await whatsappInstance.destroyWhatsApp();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      err: true,
      status: "500", 
      statusText: `Error deteniendo WhatsApp: ${error.message}`
    });
  }
});

/**
 * Obtener estado completo de WhatsApp
 * GET http://localhost/whatsapp/status
 */
router.get("/whatsapp/status", logMiddleware, async (req, res) => {
  try {
    const status = whatsappInstance.getWhatsAppStatus();
    res.json({
      err: false,
      status: "200",
      statusText: "Estado de WhatsApp",
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      err: true,
      status: "500",
      statusText: `Error obteniendo estado: ${error.message}`
    });
  }
});

/**
 * http://localhost/status/:user/:userid GET
 */
router.get("/status/:user/:userid", logMiddleware, statusCtrl.statusCtrl);

/**
 * http://localhost/contact GET
 */
router.get("/contact", logMiddleware, contactCtrl.contactCtrl);

/**
 * http://localhost/upload POST
 */
router.post("/upload", logMiddleware, fileUpload, (req, res) => {
    const storageCodeDir = fs.readdirSync(path)
    const data = {
        err: false,
        status: "400",
        statusText: storageCodeDir,
    }
    res.json(data)
});

/**
 * http://localhost/delete/:name DELETE
 */
router.delete("/:name", logMiddleware, (req, res, _next) => {
    const file = path + "/" + req.params.name;
    fs.access(file, fs.constants.F_OK, (err) => {
        if (err) {
            const data = {
                err: true,
                status: "400",
                statusText: `ERROR ${file} does NOT Exist`
            }
            res.json(data);
        } else {
            fs.unlinkSync(file)
            const storageCodeDir = fs.readdirSync(path)
            const data = {
                err: false,
                status: "200",
                statusText: storageCodeDir
            }
            res.json(data);
        }
    });
});

/**
 * http://localhost/send/:user/:userid POST
 */
router.post("/send/:user/:userid", logMiddleware, leadCtrl.sendCtrl);

export { router };