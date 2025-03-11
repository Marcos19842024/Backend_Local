import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import container from "../ioc";
import LeadCtrl from "../controller/lead.ctrl";

const router: Router = Router();
const leadCtrl: LeadCtrl = container.get("lead.ctrl");
/**
 * http://localhost/send POST
 */
router.post("/:name", logMiddleware, leadCtrl.sendCtrl);

export { router };