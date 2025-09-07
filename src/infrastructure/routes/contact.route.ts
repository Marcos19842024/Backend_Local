import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import container from "../ioc";
import ContactCtrl from "../controller/contact.ctrl";

const router: Router = Router();
const contactCtrl: ContactCtrl = container.get("contact.ctrl");
/**
 * http://localhost/contact GET
 */
router.get("/", logMiddleware, contactCtrl.contactCtrl);

export { router };