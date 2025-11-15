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
  private initializationInProgress = false; // 🔥 Nueva bandera para controlar inicialización
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor() {
    console.log("✅ WhatsApp Client creado - Esperando activación manual");
  }

  // 🔥 Método mejorado para prevenir múltiples inicializaciones
  async initializeWhatsApp(): Promise<any> {
    // Si ya está inicializado, retornar éxito
    if (this.isInitialized && this.cliente && this.status) {
      console.log("✅ WhatsApp ya está inicializado y conectado");
      return Promise.resolve({
        err: false,
        status: "200",
        statusText: "WhatsApp ya está inicializado y conectado"
      });
    }

    // Si hay una inicialización en progreso, evitar duplicados
    if (this.initializationInProgress) {
      console.log("🔄 Inicialización ya en progreso, ignorando solicitud duplicada");
      return Promise.resolve({
        err: false,
        status: "200", 
        statusText: "Inicialización en progreso"
      });
    }

    this.initializationInProgress = true;

    try {
      // Si ya existe un cliente pero no está conectado, limpiarlo
      if (this.cliente && !this.status) {
        console.log("🧹 Limpiando cliente anterior no conectado");
        try {
          await this.cliente.destroy();
        } catch (error) {
          console.log("⚠️ Error limpiando cliente anterior:", error);
        }
        this.cliente = null;
      }

      // Crear nueva instancia solo si no existe
      if (!this.cliente) {
        this.cliente = new Client({
          authStrategy: new LocalAuth({
            clientId: this.user,
            dataPath: `${process.cwd()}/.wwebjs_auth_${this.user}` // 🔥 Path único por usuario
          }),
          puppeteer: {
            headless: true,
            args: [
              "--disable-setuid-sandbox",
              "--unhandled-rejections=strict",
              "--no-sandbox",
              "--disable-extensions",
              "--disable-gpu",
              "--disable-dev-shm-usage",
              "--disable-setuid-sandbox"
            ],
          },
          takeoverOnConflict: false, // 🔥 Evitar toma de control conflictiva
          restartOnAuthFail: false, // 🔥 No reiniciar automáticamente
        });

        this.setupEventListeners();
      }

      await this.cliente.initialize();
      
      this.notifyStatusUpdate('initializing', 'WhatsApp inicializándose...');
      return Promise.resolve({
        err: false,
        status: "200", 
        statusText: "WhatsApp inicializándose..."
      });

    } catch (error: any) {
      console.error("❌ Error inicializando WhatsApp:", error);
      this.initializationInProgress = false;
      this.notifyStatusUpdate('error', `Error inicializando: ${error.message}`);
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `Error inicializando WhatsApp: ${error.message}`
      });
    }
  }

  // 🔥 Configurar event listeners una sola vez
  private setupEventListeners() {
    if (!this.cliente) return;

    this.cliente.on("ready", () => {
      this.status = true;
      this.isInitialized = true;
      this.initializationInProgress = false;
      this.reconnectAttempts = 0; // Resetear contador de reconexiones
      console.log("✅ LOGIN SUCCESS", this.user, this.userid);
      this.notifyStatusUpdate('connected', 'WhatsApp conectado correctamente');
    });

    this.cliente.on("auth_failure", (message) => {
      this.status = false;
      this.isInitialized = false;
      this.initializationInProgress = false;
      console.log("❌ LOGIN FAIL:", message);
      this.notifyStatusUpdate('auth_failure', `Error de autenticación: ${message}`);
    });

    this.cliente.on("qr", (qr) => {
      console.log("🔄 Nuevo QR generado - Sesión anterior cerrada");
      this.generateImage(qr);
      this.notifyQrUpdate();
      this.notifyStatusUpdate('qr_generated', 'Nuevo código QR generado - Escanee para conectar');
    });

    this.cliente.on("disconnected", (reason) => {
      this.status = false;
      this.isInitialized = false;
      this.initializationInProgress = false;
      this.cliente = null;
      console.log("🔴 WhatsApp desconectado:", reason);
      
      // 🔥 Intentar reconexión automática solo si no fue desconexión manual
      if (reason !== 'LOGOUT' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Intentando reconexión automática (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        setTimeout(() => {
          if (!this.status) {
            this.initializeWhatsApp().catch(console.error);
          }
        }, 5000);
      }
      
      this.notifyStatusUpdate('disconnected', `WhatsApp desconectado: ${reason}`);
    });

    this.cliente.on("authenticated", () => {
      console.log("🔑 WhatsApp autenticado correctamente");
      this.notifyStatusUpdate('authenticated', 'WhatsApp autenticado - Conectando...');
    });

    this.cliente.on("loading_screen", (percent, message) => {
      console.log(`📱 Cargando WhatsApp: ${percent}% - ${message}`);
      this.notifyStatusUpdate('loading', `Cargando: ${percent}% - ${message}`);
    });
  }

  // 🔥 Método mejorado para desconectar
  async disconnectWhatsApp(): Promise<any> {
    try {
      this.reconnectAttempts = this.maxReconnectAttempts; // Evitar reconexión automática
      
      if (this.cliente) {
        // Destruir el cliente completamente
        await this.cliente.destroy();
        this.cliente = null;
        this.status = false;
        this.isInitialized = false;
        this.initializationInProgress = false;
        
        console.log("🔴 WhatsApp desconectado manualmente");
        this.notifyStatusUpdate('disconnected', 'WhatsApp desconectado manualmente');
        
        return Promise.resolve({
          err: false,
          status: "200",
          statusText: "WhatsApp desconectado correctamente"
        });
      } else {
        return Promise.resolve({
          err: false,
          status: "200", 
          statusText: "WhatsApp ya estaba desconectado"
        });
      }
    } catch (error: any) {
      console.error("❌ Error desconectando WhatsApp:", error);
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `Error desconectando WhatsApp: ${error.message}`
      });
    }
  }

  // 🔥 Método mejorado para forzar nueva autenticación
  async forceReconnect(): Promise<any> {
    try {
      console.log("🔄 Forzando nueva autenticación...");
      
      // Primero desconectar completamente
      await this.disconnectWhatsApp();
      
      // Limpiar datos de autenticación específicos del usuario
      const authPath = `${process.cwd()}/.wwebjs_auth_${this.user}`;
      if (require("fs").existsSync(authPath)) {
        require("fs").rmSync(authPath, { recursive: true, force: true });
        console.log("🧹 Datos de autenticación eliminados:", authPath);
      }
      
      // Esperar un momento antes de reiniciar
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reiniciar WhatsApp con nueva sesión
      console.log("🔄 Iniciando nueva sesión de WhatsApp...");
      return await this.initializeWhatsApp();
      
    } catch (error: any) {
      console.error("❌ Error en reconexión forzada:", error);
      return Promise.resolve({
        err: true,
        status: "500",
        statusText: `Error en reconexión: ${error.message}`
      });
    }
  }

  setSocketIO(io: Server) {
    this.io = io;
    console.log("✅ WebSocket configurado para notificaciones QR");
  }

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
  };
}

export default Ws;