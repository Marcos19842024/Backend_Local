import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import { image as imageQr } from "qr-image";
import { LeadExternal } from "../../domain/wwebjs";
import { Server } from "socket.io";

/**
 * Extendemos los super poderes de whatsapp-web
 */
class Ws implements LeadExternal {
  private user = process.env.USUARIO;
  private userid = process.env.USUARIOID;
  private status = false;
  private cliente: Client | null = null;
  private isInitialized = false;
  private io: Server | null = null;

  constructor() {
    console.log("✅ WhatsApp Client creado - Esperando activación manual");
  }

  // Método para configurar WebSocket server
  setSocketIO(io: Server) {
    this.io = io;
    console.log("✅ WebSocket configurado para notificaciones QR");
  }

  // Método para notificar actualizaciones del QR
  private notifyQrUpdate() {
    if (this.io) {
      this.io.emit('whatsapp-qr-updated', {
        type: 'QR_UPDATED',
        timestamp: new Date().toISOString(),
        message: 'Nuevo código QR generado'
      });
      console.log('📢 Notificación QR enviada vía WebSocket');
    }
  }

  // Método para notificar cambios de estado
  private notifyStatusUpdate(status: string, message: string) {
    if (this.io) {
      this.io.emit('whatsapp-status', {
        status: status,
        message: message,
        timestamp: new Date().toISOString()
      });
      console.log(`📢 Estado WhatsApp: ${status} - ${message}`);
    }
  }

  /**
   * Iniciar WhatsApp manualmente
   */
  async initializeWhatsApp(): Promise<any> {
    if (this.isInitialized && this.cliente) {
      this.notifyStatusUpdate('connected', 'WhatsApp ya está inicializado');
      return Promise.resolve({
        err: false,
        status: "200",
        statusText: "WhatsApp ya está inicializado"
      });
    }

    try {
      this.cliente = new Client({
        authStrategy: new LocalAuth({
          clientId: this.user
        }),
        puppeteer: {
          //executablePath: "/usr/bin/chromium-browser",
          //headless: true,
          args: [
            "--disable-setuid-sandbox",
            "--unhandled-rejections=strict",
            "--no-sandbox",
          ],
        }
      });

      this.cliente.on("ready", () => {
        this.status = true;
        this.isInitialized = true;
        console.log("✅ LOGIN SUCCESS", this.user, this.userid);
        this.notifyStatusUpdate('connected', 'WhatsApp conectado correctamente');
      });

      this.cliente.on("auth_failure", () => {
        this.status = false;
        this.isInitialized = false;
        console.log("❌ LOGIN FAIL");
        this.notifyStatusUpdate('auth_failure', 'Error de autenticación de WhatsApp');
      });

      this.cliente.on("qr", (qr) => {
        console.log("🔄 Nuevo QR generado");
        this.generateImage(qr);
        // Notificar a todos los clientes conectados
        this.notifyQrUpdate();
        this.notifyStatusUpdate('qr_generated', 'Nuevo código QR generado');
      });

      this.cliente.on("disconnected", (reason) => {
        this.status = false;
        this.isInitialized = false;
        this.cliente = null;
        console.log("🔴 WhatsApp desconectado:", reason);
        this.notifyStatusUpdate('disconnected', `WhatsApp desconectado: ${reason}`);
      });

      await this.cliente.initialize();
      
      this.notifyStatusUpdate('initializing', 'WhatsApp inicializándose...');
      return Promise.resolve({
        err: false,
        status: "200", 
        statusText: "WhatsApp inicializándose..."
      });

    } catch (error: any) {
      console.error("❌ Error inicializando WhatsApp:", error);
      this.notifyStatusUpdate('error', `Error inicializando: ${error.message}`);
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `Error inicializando WhatsApp: ${error.message}`
      });
    }
  }

  /**
   * Enviar mensaje de WS
   * @param lead
   * @returns
   */
  async getContactList(): Promise<any> {
    if(!this.status || !this.cliente) {
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `WhatsApp no está conectado. Estado: ${this.status}, Cliente: ${!!this.cliente}`
      })
    }
    try {
      const contacts = await this.cliente.getContacts();
      return Promise.resolve({
        err: false,
        status: "200",
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
      // Verificar si WhatsApp está activo
      if (!this.cliente || !this.status) {
        return { 
          err: true, 
          status: "500", 
          statusText: "WhatsApp no está conectado. Active WhatsApp primero." 
        };
      }

      const baseUrl = process.env.LOCAL_IP 
        ? `http://${process.env.LOCAL_IP}:${process.env.PORT || '3001'}/`
        : (process.env.URL || 'http://localhost:3001/');
      const url = baseUrl + 'media/';
      const { client, clientid, message, phone, pathtofiles } = lead;
      
      // Validaciones de seguridad
      if (client !== this.user || clientid !== this.userid) {
        const errorText = client !== this.user
          ? `Acceso denegado, ${client} no está registrado`
          : `Acceso denegado, ${clientid} no está registrado`;
        console.log(errorText);
        return { err: true, status: "500", statusText: errorText };
      }

      const phoneId = `${phone}@c.us`;
      const tasks: Promise<any>[] = [];
      
      // Enviar archivos multimedia (en paralelo)
      if (pathtofiles.length > 0) {
        const fileTasks = pathtofiles.map(async (file) => {
          const media = await MessageMedia.fromUrl(url + file, { filename: file });
          return this.cliente!.sendMessage(phoneId, media);
        });
        tasks.push(...fileTasks);
      }
      
      // Enviar mensajes de texto (en paralelo)
      if (message.length > 0) {
        const messageTasks = message.map((msg) =>
          this.cliente!.sendMessage(phoneId, msg)
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
    
    if(this.status && this.cliente) {
      data = {
        err: false,
        status: "200",
        statusText: `Conectado con ${client}`,
      }
    } else {
      data = {
        err: true,
        status: "500",
        statusText: `${client} Desconectado`,
      }
    }
    
    console.log(data.statusText);
    return Promise.resolve(data);
  }

  private generateImage = (base64: string) => {
    const path = `${process.cwd()}/tmp`;
    let qr_png = imageQr(base64, { type: "png", margin: 4 });
    qr_png.pipe(require("fs").createWriteStream(`${path}/qr.png`));
    console.log(`⚡ Nuevo QR generado en: ${path}/qr.png`);
    console.log(`⚡ Notificando a clientes conectados...`);
  };
}

export default Ws;