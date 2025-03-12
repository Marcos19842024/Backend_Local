export class Lead {
  readonly client: string;
  readonly clientid: string;
  readonly message: string;
  readonly phone: string;
  readonly pathtofiles: Array<string>;

  constructor({ client, clientid, message, phone, pathtofiles }: { client: string; clientid:string; message: string; phone: string; pathtofiles: Array<string> }) {
    this.client = client;
    this.clientid = clientid;
    this.message = message;
    this.phone = phone; 
    this.pathtofiles = pathtofiles;
  }
}