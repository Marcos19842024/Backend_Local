import LeadExternal from "../domain/lead-external.repository";

export class LeadCreate {
  private leadExternal: LeadExternal;
  
  constructor(repositories: LeadExternal) {
    this.leadExternal = repositories;
  }

  public async sendMessage({
    client,
    message,
    phone,
    pathtofiles,
  }: {
    client: string;
    message: string;
    phone: string;
    pathtofiles: Array<string>;
  }) {
    const responseExSave = await this.leadExternal.sendMsg({ client, message, phone, pathtofiles });//enviar a ws
    return responseExSave;
  }
}