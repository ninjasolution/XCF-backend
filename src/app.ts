import express, { Express } from "express";
import bodyParser from "body-parser";

import { Logger } from "winston";
import expressWinston from "express-winston";

import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";

import { providers } from "ethers";

import Config from "./config";
import healthCheck from "./routes/healthCheck";
import xcf from "./routes/xcf";
import stripe from "./routes/stripe";

async function create(
  config: Config,
  logger: Logger,
  provider: providers.Provider
) {
  const options = {
    swaggerDefinition: {
      openapi: "3.0.0",
      info: {
        title: config.appName,
        version: config.appVersion,
      },
      servers: config.servers,
    },
    apis: ["./src/routes/*.ts"],
  };

  const swaggerSpec = swaggerJSDoc(options);
  const app: Express = express();

  app.disable("x-powered-by");

  app.use(bodyParser.json());
  app.use(bodyParser.text());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(
    expressWinston.logger({
      winstonInstance: logger.child({ component: "http" }),
      expressFormat: true,
    })
  );

  app.use("/xcf", await xcf.create(logger, provider));
  app.use("/stripe", await stripe.create(logger, provider));
  app.use("/health", await healthCheck.create(logger));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  return app;
}

export default {
  create,
};
