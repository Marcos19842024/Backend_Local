import { Request, Response } from "express";
import { LeadCreate } from "../../application/lead.create";

class LeadCtrl {
  constructor(private readonly leadCreator: LeadCreate) {}

  public sendCtrl = async (req: Request, res: Response) => {
    const { message, phone, pathtofiles } = req.body;
    const client = req.params.user;
    const clientid = req.params.userid;
    const response = await this.leadCreator.sendMessage({ client, clientid, message, phone, pathtofiles })
    res.send(response);
  };
}

export default LeadCtrl;