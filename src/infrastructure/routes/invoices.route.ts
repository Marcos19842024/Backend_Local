import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const ruta = `${process.cwd()}/tmp/invoices`
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
  const baseDir = path.join(ruta, fecha, proveedor);

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
  const baseDir = path.join(ruta, fecha, proveedor);

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
    const fechaDir = path.join(ruta, fecha);
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
// Configurar transporte de correo
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/download-send-mail-zip", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No se envió ningún PDF");

    const send = req.body.send === "true";
    const download = req.body.download === "true";
    // Normalización de nombre
    const raw = (req.body.pdfName ?? "reporte de gastos.pdf").toString();
    const cleanedBase = raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.\- ]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const pdfName = cleanedBase.toLowerCase().endsWith(".pdf")
      ? cleanedBase
      : `${cleanedBase}.pdf`;

    const zipName = pdfName.replace(/\.pdf$/i, ".zip");

    // 📦 Ruta temporal para guardar ZIP antes de enviar
    const tmpZipPath = path.join(process.cwd(), "tmp", zipName);

    // Creamos el ZIP en disco en lugar de enviarlo directo
    const output = fs.createWriteStream(tmpZipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    // Agregamos el PDF recibido
    archive.append(req.file.buffer, { name: pdfName });

    // Directorio base de facturas
    if (!fs.existsSync(ruta)) {
      return res.status(400).send("No hay facturas para comprimir");
    }

    // Añadimos carpetas fecha/proveedor al ZIP
    for (const fecha of fs.readdirSync(ruta)) {
      const fechaPath = path.join(ruta, fecha);
      if (!fs.statSync(fechaPath).isDirectory()) continue;

      for (const proveedor of fs.readdirSync(fechaPath)) {
        const proveedorPath = path.join(fechaPath, proveedor);
        if (!fs.statSync(proveedorPath).isDirectory()) continue;

        archive.directory(proveedorPath, `${fecha}/${proveedor}`);
      }
    }

    await archive.finalize();

    // 🔔 Cuando se termine de escribir el ZIP, enviamos correo
    output.on("close", async () => {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_TO,
          subject: `📦 ${zipName.replace(".zip", "")} (ZIP)`,
          text: "Se adjunta el reporte de gastos comprimido en ZIP.",
          attachments: [
            {
              filename: zipName,
              path: tmpZipPath,
              contentType: "application/zip",
            },
          ],
        };

        if (send) {
          await transporter.sendMail(mailOptions);
        }

        if (download) {
          // 📤 Enviar ZIP al frontend
          res.download(tmpZipPath, zipName, async (err) => {
            if (err) {
              console.error("Error enviando ZIP al frontend:", err);
            }

            // 🧹 Borramos carpeta invoices después de mandar respuesta
            fs.rm(ruta, { recursive: true, force: true }, (err) => {
              if (err) console.error("Error eliminando invoices:", err);
              else console.log("Carpeta invoices eliminada ✅");
            });

            // 🧹 También borramos el zip temporal
            fs.unlink(tmpZipPath, (err) => {
              if (err) console.error("Error eliminando ZIP temporal:", err);
            });
          });
        }
      } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).send("Error enviando el ZIP por correo");
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al generar el ZIP");
  }
});

export { router };