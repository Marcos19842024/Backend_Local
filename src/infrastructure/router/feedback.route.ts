import { Router } from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logMiddleware } from "../middleware/log";

dotenv.config();
const router: Router = Router();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
/**
 * http://localhost/feedback POST
 */
router.post("/", logMiddleware, async (req, res) => {
    const { rating, comment, email } = req.body;

    if (!rating || !comment) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const mailOptions = {
        from: `"Formulario Web" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO,
        subject: "📝 Nueva evaluación recibida",
        html: `
            <h2>Nuevo feedback del cliente</h2>
            <p><strong>Calificación:</strong> ${rating} ⭐</p>
            <p><strong>Comentario:</strong> ${comment}</p>
            ${email ? `<p><strong>Email de contacto:</strong> ${email}</p>` : ""}
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Correo enviado correctamente" });
    } catch (error) {
        console.error("Error enviando correo:", error);
        res.status(500).json({ error: "No se pudo enviar el correo" });
    }
});

export { router };