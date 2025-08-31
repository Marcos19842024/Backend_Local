import express from "express";
import fs from "fs";
import path from "path";
import { logMiddleware } from "../middleware/log";

const router = express.Router();

const DATA_PATH = path.join(__dirname, "orgData.json");

// Leer datos del JSON
const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));

// Guardar datos en JSON
const saveData = (data: any) =>
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");

// GET: obtener organigrama
router.get("/", logMiddleware, (req, res) => {
    try {
        const data = readData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "No se pudo leer el archivo" });
    }
});

// POST: actualizar organigrama
router.post("/", logMiddleware, (req, res) => {
    try {
        saveData(req.body);
        res.json({ message: "Organigrama guardado correctamente" });
    } catch (err) {
        res.status(500).json({ error: "No se pudo guardar el archivo" });
    }
});

export { router };