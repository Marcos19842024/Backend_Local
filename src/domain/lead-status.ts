export default interface LeadStatus {
    getSts(client:string,clientid:string):Promise<any>
}