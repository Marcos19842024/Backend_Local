export interface LeadStatus {
    getSts(client:string,clientid:string):Promise<any>
}

export interface LeadContact {
    getContactList():Promise<any>
}

export interface LeadExternal {
    sendMsg({client, clientid, message, phone, pathtofiles}:{client:string, clientid:string, message:Array<string>, phone:string, pathtofiles: Array<string>}):Promise<any>
}