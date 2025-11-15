import { ContainerBuilder } from "node-dependency-injection";
import Ws from "./repositories/wwebjs";
import { LeadCreate, StatusCreate, ContactCreate } from "../application/wwebjs";
import { LeadCtrl, StatusCtrl, ContactCtrl } from "./controller/wwebjs";

const container = new ContainerBuilder();

container.register("ws", Ws);

const ws = container.get("ws");

container.register("lead.creator", LeadCreate).addArgument(ws);

container.register("status.creator", StatusCreate).addArgument(ws);

container.register("contact.creator", ContactCreate).addArgument(ws);

const leadCreator = container.get("lead.creator");

const statusCreator = container.get("status.creator");

const contactCreator = container.get("contact.creator");

container.register("lead.ctrl", LeadCtrl).addArgument(leadCreator);

container.register("status.ctrl", StatusCtrl).addArgument(statusCreator);

container.register("contact.ctrl", ContactCtrl).addArgument(contactCreator);

export default container;