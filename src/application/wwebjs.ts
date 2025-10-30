import Ws from "../infrastructure/repositories/ws";

export class StatusCreate {
    constructor(private readonly leadExternal: Ws) {}

    getLeadExternal(): Ws {
        return this.leadExternal;
    }

    async getStatus(user: string, userid: string): Promise<any> {
        return await this.leadExternal.getSts(user, userid);
    }
}

export class ContactCreate {
    constructor(private readonly leadExternal: Ws) {}

    getLeadExternal(): Ws {
        return this.leadExternal;
    }

    async getContact(): Promise<any> {
        return await this.leadExternal.getContactList();
    }
}

export class LeadCreate {
    constructor(private readonly leadExternal: Ws) {}

    getLeadExternal(): Ws {
        return this.leadExternal;
    }

    async sendMessage(lead: {
        client: string;
        clientid: string;
        message: string[];
        phone: string;
        pathtofiles: string[];
    }): Promise<any> {
        return await this.leadExternal.sendMsg(lead);
    }
}