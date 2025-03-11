export default interface LeadExternal {
    sendMsg({client, message, phone, pathtofiles}:{client:string, message:string, phone:string, pathtofiles: Array<string>}):Promise<any>
}