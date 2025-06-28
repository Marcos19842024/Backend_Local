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
        executablePath: "/usr/bin/chromium-browser",
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

  async sendMsg(lead: { client: string; clientid: string; message: Array<string>; phone: string; pathtofiles: Array<string> }): Promise<any> {
    try {
      const url = process.env.URL + 'media/';
      const { client, clientid, message, phone, pathtofiles } = lead;
      var result;
      if(client !== this.user) {
        console.log(`Acceso denegado, ${client} no está registrado`);
        return Promise.resolve({
          err: true,
          status: "500",
          statusText: `Acceso denegado, ${client} no está registrado`
        })
      }
      if(clientid !== this.userid) {
        console.log(`Acceso denegado, ${clientid} no está registrado`);
        return Promise.resolve({
          err: true,
          status: "500",
          statusText: `Acceso denegado, ${clientid} no está registrado`
        })
      }
      if(!this.status) {
        console.log(`Esperando la conexión con ${client}`);
        return Promise.resolve({
          err: true,
          status: "500",
          statusText: `Esperando la conexión con ${client}`
        })
      }
      if(pathtofiles?.length > 0) {
        let pathtofile = url + pathtofiles[0];
        let filename = pathtofiles[0];
        result = await this.cliente.sendMessage(`${phone}@c.us`, await MessageMedia.fromUrl(pathtofile,{filename}));
        if(pathtofiles.length > 1) {
          for(let i = 1; i < pathtofiles.length; i++) {
            let pathtofile = url + pathtofiles[i];
            let filename = pathtofiles[i];
            result = await this.cliente.sendMessage(`${phone}@c.us`, await MessageMedia.fromUrl(pathtofile,{filename}));
          };
        }
      }
      if(message?.length > 0) {
        result = await this.cliente.sendMessage(`${phone}@c.us`, message[0]);
        if(message.length > 1) {
          for(let i = 1; i < message.length; i++) {
            result = await this.cliente.sendMessage(`${phone}@c.us`, message[i]);
          };
        }
      }
      const response = result && result.id && result.id.id ? { id: result.id.id } : { id: null };
      return Promise.resolve(response);
    } catch (e: any) {
      return Promise.resolve({ error: e.message });
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