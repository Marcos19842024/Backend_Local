import { ContainerBuilder } from "node-dependency-injection";
import Ws from "./repositories/ws";
import { LeadCreate } from "../application/lead.create";
import LeadCtrl from "./controller/lead.ctrl";
import { StatusCreate } from "../application/status.create";
import StatusCtrl from "./controller/status.ctrl";

const container = new ContainerBuilder();

container.register("ws", Ws);

const ws = container.get("ws");

container.register("lead.creator", LeadCreate).addArgument(ws);

container.register("status.creator", StatusCreate).addArgument(ws);

const leadCreator = container.get("lead.creator");

const statusCreator = container.get("status.creator");

container.register("lead.ctrl", LeadCtrl).addArgument(leadCreator);

container.register("status.ctrl", StatusCtrl).addArgument(statusCreator);

export default container;