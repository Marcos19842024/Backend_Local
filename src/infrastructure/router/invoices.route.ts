import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const router = express.Router();

// multer en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Tipado de archivos esperados
type InvoiceFiles = {
  pdf?: Express.Multer.File[];
  xml?: Express.Multer.File[];
};

/**
 * http://localhost/invoices POST
 */
router.post("/", upload.fields([{ name: "pdf" }, { name: "xml" }]), (req, res) => {
  const { fecha, proveedor, factura, oldFactura } = req.body;
  const baseDir = path.join(process.cwd(), "tmp/invoices", fecha, proveedor);

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const files = req.files as InvoiceFiles | undefined;

  // Renombrar si no se suben archivos nuevos pero cambia la factura
  if (!files?.pdf && !files?.xml && oldFactura && oldFactura !== factura) {
    const oldPdf = path.join(baseDir, `${oldFactura}.pdf`);
    const oldXml = path.join(baseDir, `${oldFactura}.xml`);
    const newPdf = path.join(baseDir, `${factura}.pdf`);
    const newXml = path.join(baseDir, `${factura}.xml`);

    if (fs.existsSync(oldPdf)) fs.renameSync(oldPdf, newPdf);
    if (fs.existsSync(oldXml)) fs.renameSync(oldXml, newXml);

    return res.json({ message: "Archivos renombrados correctamente" });
  }

  // Subir/reemplazar archivos
  if (files?.pdf?.[0]) {
    const filePath = path.join(baseDir, `${factura}.pdf`);
    fs.writeFileSync(filePath, new Uint8Array(files.pdf[0].buffer));
  }

  if (files?.xml?.[0]) {
    const filePath = path.join(baseDir, `${factura}.xml`);
    fs.writeFileSync(filePath, new Uint8Array(files.xml[0].buffer));
  }

  res.json({ message: "Archivos subidos correctamente" });
});

/**
 * http://localhost/invoices/:fecha/:proveedor/:factura DELETE
 */
router.delete("/:fecha/:proveedor/:factura", (req, res) => {
  const { fecha, proveedor, factura } = req.params;
  const baseDir = path.join(process.cwd(), "tmp/invoices", fecha, proveedor);

  const pdfPath = path.join(baseDir, `${factura}.pdf`);
  const xmlPath = path.join(baseDir, `${factura}.xml`);

  try {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);

    // 🗑️ eliminar carpeta si queda vacía
    if (fs.existsSync(baseDir) && fs.readdirSync(baseDir).length === 0) {
      fs.rmdirSync(baseDir, { recursive: true });
    }

    // 🗑️ eliminar carpeta de la fecha si también queda vacía
    const fechaDir = path.join(process.cwd(), "tmp/invoices", fecha);
    if (fs.existsSync(fechaDir) && fs.readdirSync(fechaDir).length === 0) {
      fs.rmdirSync(fechaDir, { recursive: true });
    }

    res.json({ message: "Factura eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar factura:", error);
    res.status(500).json({ message: "Error al eliminar la factura" });
  }
});

/**
 * http://localhost/invoices GET /download-zip
 * Genera reporte en PDF y lo empaqueta con facturas en un ZIP
 */
router.post("/downloadZip", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No se envió ningún PDF");

    // 1) Tomamos el nombre recibido o un default
    const raw = (req.body.pdfName ?? "reporte.pdf").toString();

    // 2) Normalizamos: quitamos acentos y filtramos caracteres
    const cleanedBase = raw
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")   // sin acentos
      .replace(/[^\w.\- ]/g, "")                         // solo [A-Za-z0-9_ .-]
      .replace(/\s+/g, " ")                              // colapsa espacios
      .trim();

    // 3) Aseguramos extensión .pdf
    const pdfName = cleanedBase.toLowerCase().endsWith(".pdf")
      ? cleanedBase
      : `${cleanedBase}.pdf`;

    // 4) Nombre del ZIP
    const zipName = pdfName.replace(/\.pdf$/i, ".zip");

    // Headers
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    // PDF al nivel raíz del ZIP
    archive.append(req.file.buffer, { name: pdfName });

    // Directorio base (ajústalo si tus facturas están en otra ruta)
    const baseDir = path.join(process.cwd(), "tmp", "invoices");
    if (!fs.existsSync(baseDir)) {
      return res.status(400).send("No hay facturas para comprimir");
    }

    // fecha/proveedor
    for (const fecha of fs.readdirSync(baseDir)) {
      const fechaPath = path.join(baseDir, fecha);
      if (!fs.statSync(fechaPath).isDirectory()) continue;

      for (const proveedor of fs.readdirSync(fechaPath)) {
        const proveedorPath = path.join(fechaPath, proveedor);
        if (!fs.statSync(proveedorPath).isDirectory()) continue;

        archive.directory(proveedorPath, `${fecha}/${proveedor}`);
      }
    }

    await archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al generar el ZIP");
  }
});

export {router};