import { Router } from "express";
import { logMiddleware } from "../middleware/log";
import multer from "multer";
import fs from "fs";

const router: Router = Router();
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
 * http://localhost/upload POST
 */
router.post("/", logMiddleware, fileUpload, (req, res) => {
  const storageCodeDir = fs.readdirSync(path)
  const data = {
    err: false,
    status: "400",
    statusText: storageCodeDir,
  }
  res.json(data)
});

export { router };