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

// Función auxiliar para limpieza
function cleanup(tmpZipPath: fs.PathLike, invoicesPath: fs.PathLike) {
  // 🧹 Borramos carpeta invoices
  fs.rm(invoicesPath, { recursive: true, force: true }, (err) => {
    if (err) console.error("Error eliminando invoices:", err);
    else console.log("Carpeta invoices eliminada ✅");
  });

  // 🧹 Borramos el zip temporal
  if (tmpZipPath && fs.existsSync(tmpZipPath)) {
    fs.unlink(tmpZipPath, (err) => {
      if (err) console.error("Error eliminando ZIP temporal:", err);
    });
  }
}

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
    // Eliminar archivos PDF y XML
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);

    // Función helper para eliminar directorios vacíos de forma segura
    const removeDirIfEmpty = (dirPath: string) => {
      if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
        fs.rmdirSync(dirPath);
        return true;
      }
      return false;
    };

    // Eliminar directorios si están vacíos
    if (removeDirIfEmpty(baseDir)) {
      removeDirIfEmpty(path.join(ruta, fecha));
    }

    res.json({ message: "Factura eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar factura:", error);
    res.status(500).json({ 
      message: "Error al eliminar la factura",
      error: error instanceof Error ? error.message : String(error)
    });
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
  let tmpZipPath: any = null;
  
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
    tmpZipPath = path.join(process.cwd(), "tmp", zipName);

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

    // Esperamos a que el archivo ZIP se termine de escribir
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', (error) => reject(error));
    });

    // 🔔 Enviar correo si está solicitado
    if (send) {
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

      await transporter.sendMail(mailOptions);
    }

    // 📤 Enviar respuesta al frontend
    if (download) {
      // Enviar ZIP para descargar
      res.download(tmpZipPath, zipName, async (err) => {
        // Limpieza después de enviar la respuesta
        cleanup(tmpZipPath, ruta);
        if (err) {
          console.error("Error enviando ZIP al frontend:", err);
        }
      });
    } else {
      // Solo enviar por correo - enviar respuesta JSON
      res.json({
        success: true,
        message: send ? "Reporte enviado por correo correctamente" : "Operación completada",
        emailSent: send
      });
      
      // Limpieza después de enviar la respuesta
      cleanup(tmpZipPath, ruta);
    }

  } catch (err) {
    
    // Limpieza en caso de error
    if (tmpZipPath && fs.existsSync(tmpZipPath)) {
      fs.unlinkSync(tmpZipPath);
    }
    
    res.status(500).json({
      success: false,
      message: "Error al procesar la solicitud",
      error: typeof err === "object" && err !== null && "message" in err ? (err as any).message : String(err)
    });
  }
});

export { router };