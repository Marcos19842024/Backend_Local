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
router.delete("/delete/:name", logMiddleware, (req, res, _next) => {
    const file = path + req.params.name;
    fs.exists(file, function(exists) {
        if (!exists) {
            const data = {
                err: true,
                status: "400",
                statusText: "ERROR File does NOT Exists"
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