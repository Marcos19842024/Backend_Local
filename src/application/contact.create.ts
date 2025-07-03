import LeadContact from "../domain/lead-contact";

export class ContactCreate {
  private leadContact: LeadContact;
  constructor(repositories: LeadContact) {
    this.leadContact = repositories;
  }

  public async getContact() {
    const responseContact = await this.leadContact.getContactList();//traer lista de contactos de la sesion de ws
    return responseContact;
  }
}