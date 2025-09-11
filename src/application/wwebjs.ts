import { LeadStatus, LeadContact, LeadExternal } from "../domain/wwebjs";

export class StatusCreate {
    private leadStatus: LeadStatus;
    constructor(repositories: LeadStatus) {
        this.leadStatus = repositories;
    }

    public async getStatus(client: string,clientid: string) {
        const responseStatus = await this.leadStatus.getSts(client,clientid);//checar status de la sesion de ws
        return responseStatus;
    }
}

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