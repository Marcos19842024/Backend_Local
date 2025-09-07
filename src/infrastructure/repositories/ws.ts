import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import { image as imageQr } from "qr-image";
import LeadExternal from "../../domain/lead-external.repository";

/**
 * Extendemos los super poderes de whatsapp-web
 */
class Ws implements LeadExternal {
  private user = process.env.USUARIO;
  private userid = process.env.USUARIOID;
  private status = false;
  private cliente: Client;

  constructor() {
    this.cliente = new Client({
      authStrategy: new LocalAuth({
        clientId: this.user
      }),
      puppeteer: {
        //executablePath: "/usr/bin/chromium-browser",
        headless: true,
        args: [
          "--disable-setuid-sandbox",
          "--unhandled-rejections=strict",
          "--no-sandbox",
        ],
      }
    });

    this.cliente.initialize();

    this.cliente.on("ready", () => {
      this.status = true;
      console.log("LOGIN SUCCESS",this.user,this.userid);
    });

    this.cliente.on("auth_failure", () => {
      this.status = false;
      console.log("LOGIN FAIL");
    });

    this.cliente.on("qr", (qr) => {
      this.generateImage(qr);
    });
  }

  /**
   * Enviar mensaje de WS
   * @param lead
   * @returns
   */
  async getContactList(): Promise<any> {
    if(!this.status) {
      console.log(`Esperando la conexión con el cliente`);
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `Esperando la conexión con el cliente`
      })
    }
    try {
      const contacts = await this.cliente.getContacts();
      return Promise.resolve({
        err: false,
        status: "400",
        statusText: contacts,
      })
    } catch (error) {
      console.error('Error al obtener los contactos:', error);
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `Error al obtener los contactos: ${error}`
      })
    }
  }

  async sendMsg(lead: {
    client: string;
    clientid: string;
    message: string[];
    phone: string;
    pathtofiles: string[];
  }): Promise<any> {
    try {
      const url = process.env.URL + 'media/';
      const { client, clientid, message, phone, pathtofiles } = lead;
      // Validaciones de seguridad
      if (client !== this.user || clientid !== this.userid) {
        const errorText = client !== this.user
          ? `Acceso denegado, ${client} no está registrado`
          : `Acceso denegado, ${clientid} no está registrado`;
        console.log(errorText);
        return { err: true, status: "500", statusText: errorText };
      }
      // Estado de conexión
      if (!this.status) {
        const statusText = `Esperando la conexión con ${client}`;
        console.log(statusText);
        return { err: true, status: "500", statusText };
      }
      const phoneId = `${phone}@c.us`;
      const tasks: Promise<any>[] = [];
      // Enviar archivos multimedia (en paralelo)
      if (pathtofiles.length > 0) {
        const fileTasks = pathtofiles.map(async (file) => {
          const media = await MessageMedia.fromUrl(url + file, { filename: file });
          return this.cliente.sendMessage(phoneId, media);
        });
        tasks.push(...fileTasks);
      }
      // Enviar mensajes de texto (en paralelo)
      if (message.length > 0) {
        const messageTasks = message.map((msg) =>
          this.cliente.sendMessage(phoneId, msg)
        );
        tasks.push(...messageTasks);
      }
      // Ejecutar todas las tareas en paralelo
      const results = await Promise.allSettled(tasks);
      // Log o análisis de resultados (opcional)
      results.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          console.log(`✅ Mensaje ${i + 1} enviado correctamente`);
        } else {
          console.error(`❌ Error en mensaje ${i + 1}`, res.reason);
        }
      });
      return { err: false, status: "200", statusText: "Mensajes procesados", results };
    } catch (e: any) {
      console.error('❌ Error en sendMsg:', e.message);
      return { error: e.message };
    }
  }

  async getSts(client: string, clientid: string): Promise<any> {
    let data;
    if(client !== this.user) {
      data = {
        err: true,
        status: "500",
        statusText: `Acceso denegado, ${client} no está registrado`
      }
      console.log(`Acceso denegado, ${client} no está registrado`);
      return Promise.resolve(data);
    }
    if(clientid !== this.userid) {
      data = {
        err: true,
        status: "500",
        statusText: `Acceso denegado, ${clientid} no está registrado`
      }
      console.log(`Acceso denegado, ${clientid} no está registrado`);
      return Promise.resolve(data);
    }
    if(this.status) {
      data = {
        err: false,
        status: "400",
        statusText: `Conectado con ${client}`
      }
    } else {
      data = {
        err: true,
        status: "500",
        statusText: `${client} Desconectado`
      }
    }
    console.log(data.statusText);
    return Promise.resolve(data);
  }

  private generateImage = (base64: string) => {
    const path = `${process.cwd()}/tmp`;
    let qr_png = imageQr(base64, { type: "png", margin: 4 });
    qr_png.pipe(require("fs").createWriteStream(`${path}/qr.png`));
    console.log(`⚡ Escanea el codigo QR que esta en la carepta tmp⚡`);
    console.log(`⚡ Recuerda que el QR se actualiza cada minuto ⚡'`);
  };

}

export default Ws;