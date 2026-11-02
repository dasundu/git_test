import http from "http";
import { config } from "./config";
import { createApp } from "./app";
import { initRealtime } from "./realtime";

const server = http.createServer(createApp());
initRealtime(server);
server.listen(config.port, () => console.log(`API listening on :${config.port}`));
