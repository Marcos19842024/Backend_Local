import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import fs from "fs";

const router: Router = Router();
/**
 * http://localhost/delete DELETE
 */
router.delete("/:name", logMiddleware, (req, res, _next) => {
  const path = `${process.cwd()}/tmp/media/`;
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

export { router };