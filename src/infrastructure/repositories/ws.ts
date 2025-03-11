import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import { image as imageQr } from "qr-image";
import LeadExternal from "../../domain/lead-external.repository";

/**
 * Extendemos los super poderes de whatsapp-web
 */
class Ws implements LeadExternal {
  private id = process.env.ID;
  private status = false;
  private cliente: Client;

  constructor() {
    this.cliente = new Client({
      authStrategy: new LocalAuth({
        clientId: this.id
      }),
      puppeteer: {
        //executablePath: "/usr/bin/chromium-browser",
        headless: true,
        args: [
          "--disable-setuid-sandbox",
          "--unhandled-rejections=strict",
          //"--no-sandbox",
        ],
      }
    });

    this.cliente.initialize();

    this.cliente.on("ready", () => {
      this.status = true;
      console.log("LOGIN SUCCESS");
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
  async sendMsg(lead: { client: string; message: string; phone: string; pathtofiles: Array<string> }): Promise<any> {
    try {
      const url = process.env.URL + 'media/';
      const { client, message, phone, pathtofiles } = lead;
      var result;
      if(client !== this.id) {
        return Promise.resolve({ error: `Acces denied, ${client} is not registered` });
      }
      if(!`${this.status}`) return Promise.resolve({ error: `WAIT LOGIN TO ${client}` });
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
      result = await this.cliente.sendMessage(`${phone}@c.us`, message);
      const response = { id: result.id.id };
      return Promise.resolve(response);
    } catch (e: any) {
      return Promise.resolve({ error: e.message });
    }
  }

  async getSts(client: string): Promise<any> {
    let data;
    if(client !== this.id) {
      data = {
        err: true,
        status: "500",
        statusText: `Acces denied, ${client} is not registered`
      }
      return Promise.resolve(data);
    }
    if(this.status) {
      data = {
        err: false,
        status: "400",
        statusTex: `Connected to ${client}`
      }
    } else {
      data = {
        err: true,
        status: "500",
        statusText: `${client} Offline`
      }
    }
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