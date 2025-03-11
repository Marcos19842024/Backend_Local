import { Request, Response } from "express";
import { StatusCreate } from "../../application/status.create";

class StatusCtrl {
  constructor(private readonly statusCreator: StatusCreate) {}

  public statusCtrl = async (req: Request, res: Response) => {
    const client = req.params.name;
    const response = await this.statusCreator.getStatus(client);
    res.json(response);
  };
}

export default StatusCtrl;