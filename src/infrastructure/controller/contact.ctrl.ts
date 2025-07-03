import { Request, Response } from "express";
import { ContactCreate } from "../../application/contact.create";

class ContactCtrl {
  constructor(private readonly contactCreator: ContactCreate) {}

  public contactCtrl = async (req: Request, res: Response) => {
    const response = await this.contactCreator.getContact();
    res.json(response);
  };
}

export default ContactCtrl;