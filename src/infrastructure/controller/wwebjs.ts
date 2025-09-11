import { Request, Response } from "express";
import { ContactCreate, LeadCreate, StatusCreate } from "../../application/wwebjs";

export class StatusCtrl {
  constructor(private readonly statusCreator: StatusCreate) {}

  public statusCtrl = async (req: Request, res: Response) => {
    const client = req.params.user;
    const clientid = req.params.userid;
    const response = await this.statusCreator.getStatus(client,clientid);
    res.json(response);
  };
}

export class ContactCtrl {
  constructor(private readonly contactCreator: ContactCreate) {}

  public contactCtrl = async (req: Request, res: Response) => {
    const response = await this.contactCreator.getContact();
    res.json(response);
  };
}

export class LeadCtrl {
  constructor(private readonly leadCreator: LeadCreate) {}

  public sendCtrl = async (req: Request, res: Response) => {
    const { message, phone, pathtofiles } = req.body;
    const client = req.params.user;
    const clientid = req.params.userid;
    const response = await this.leadCreator.sendMessage({ client, clientid, message, phone, pathtofiles })
    res.send(response);
  };
}