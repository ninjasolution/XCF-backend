import http from "node:http";
import { URL } from "node:url";
import dotenv from "dotenv";
import { Command } from "commander";
import winston, { format, Logger } from "winston";
import { providers } from "ethers";
import Config from "./config";
import app from "./app";

type CliArgs = {
  gateway: string;
  listen: string;
};

function defaultPort(protocol: string) {
  switch (protocol) {
    case "http:":
      return 80;
    case "https:":
      return 443;
    default:
      throw Error(`Unsupported protocol: ${protocol}`);
  }
}

async function run(config: Config, logger: Logger, args: CliArgs) {
  const listenUrl = new URL(args.listen);
  const gateway = new URL(args.gateway);

  if (listenUrl.protocol != "http:") {
    throw Error(`Unsupported listen protocol: ${listenUrl.protocol}`);
  }

  let bindPort = listenUrl.port
    ? parseInt(listenUrl.port)
    : defaultPort(listenUrl.protocol);
  let bindHostname = listenUrl.hostname;

  let provider: providers.Provider;

  if (gateway.protocol == "ws:" || gateway.protocol == "wss:") {
    provider = new providers.WebSocketProvider(gateway.toString());
  } else if (gateway.protocol == "http:" || gateway.protocol == "https:") {
    provider = new providers.JsonRpcProvider(gateway.toString());
  } else {
    throw Error(`Invalid gateway address: ${gateway}`);
  }

  let appInstance = await app.create(config, logger, provider);

  return new Promise((resolve, reject) => {
    const server = http.createServer(appInstance);

    server.on("listening", () => {
      logger.info(
        `App is up and running at ${listenUrl.protocol}//${bindHostname}:${bindPort}`
      );
    });

    server.on("error", (err) => {
      reject(err);
    });

    server.on("close", () => {
      resolve(null);
    });

    server.listen(bindPort, bindHostname);
  });
}

let appName;

if (process.env.npm_package_name) {
  appName = process.env.npm_package_name;
} else {
  appName = require("../package.json").name;
}

let appVersion;

if (process.env.npm_package_version) {
  appVersion = process.env.npm_package_version;
} else {
  appVersion = require("../package.json").version;
}

dotenv.config();

const logger = winston.createLogger({
  defaultMeta: { appLabel: "app" },
  levels: winston.config.syslog.levels,
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(
    format.label({ label: "app" }),
    format.printf(
      (info) =>
        `${info.level.toUpperCase()} [${info.component || info.appLabel}] ${
          info.message
        }`
    )
  ),
  transports: [new winston.transports.Console()],
});

const appArgs = new Command();

appArgs
  .version(appVersion)
  .option(
    "-g, --gateway <gateway-address>",
    "Ethereum node address that should be used as the gateway",
    "ws://localhost:8545"
  )
  .option(
    "-l, --listen <URL>",
    "Listen to address",
    process.env.GW_LISTEN ?? "http://127.0.0.1:8080"
  );

run(
  {
    appName,
    appVersion,
    servers: [
      {
        url: new URL("http://localhost:3000/"),
        description: "Local Dev Server",
      },
    ],
  },
  logger,
  appArgs.parse(process.argv).opts()
)
  .then(() => {
    logger.info("App done");
    process.exit(0);
  })
  .catch((err) => {
    logger.error("App failed: ", err);
    process.exit(1);
  });
