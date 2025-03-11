import LeadStatus from "../domain/lead-status";

export class StatusCreate {
  private leadStatus: LeadStatus;
  constructor(repositories: LeadStatus) {
    this.leadStatus = repositories;
  }

  public async getStatus(client: string) {
    const responseStatus = await this.leadStatus.getSts(client);//checar status de la sesion de ws
    return responseStatus;
  }
}