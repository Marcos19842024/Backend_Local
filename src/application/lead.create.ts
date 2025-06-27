import LeadExternal from "../domain/lead-external.repository";

export class LeadCreate {
  private leadExternal: LeadExternal;
  
  constructor(repositories: LeadExternal) {
    this.leadExternal = repositories;
  }

  public async sendMessage({
    client,
    clientid,
    message,
    phone,
    pathtofiles,
  }: {
    client: string;
    clientid: string;
    message: Array<string>;
    phone: string;
    pathtofiles: Array<string>;
  }) {
    const responseExSave = await this.leadExternal.sendMsg({ client, clientid, message, phone, pathtofiles });//enviar a ws
    return responseExSave;
  }
}