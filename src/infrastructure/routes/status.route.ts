import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import container from "../ioc";
import StatusCtrl from "../controller/status.ctrl";

const router: Router = Router();
const statusCtrl: StatusCtrl = container.get("status.ctrl");
/**
 * http://localhost/status GET
 */
router.get("/:user/:userid", logMiddleware, statusCtrl.statusCtrl);

export { router };