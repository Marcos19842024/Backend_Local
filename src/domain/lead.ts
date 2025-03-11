export class Lead {
  readonly client: string;
  readonly message: string;
  readonly phone: string;
  readonly pathtofiles: Array<string>;

  constructor({ client, message, phone, pathtofiles }: { client: string; message: string; phone: string; pathtofiles: Array<string> }) {
    this.client = client;
    this.message = message;
    this.phone = phone; 
    this.pathtofiles = pathtofiles;
  }
}