export default interface LeadExternal {
    sendMsg({client, clientid, message, phone, pathtofiles}:{client:string, clientid:string, message:string, phone:string, pathtofiles: Array<string>}):Promise<any>
}