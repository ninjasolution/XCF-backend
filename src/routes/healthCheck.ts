import express, { Request, Response } from "express";
import moment from "moment";
import { Logger } from "winston";

/**
 * @openapi
 *
 * components:
 *   schemas:
 *     health.Status:
 *         properties:
 *           uptime:
 *             type: integer
 *             description: seconds since previous restart
 *           timestamp:
 *             type: string
 *             format: date-time
 *             description: timestamp when status was generated
 */
export interface Status {
  uptime: number;
  timestamp: moment.Moment;
}

async function create(_: Logger) {
  const router = express.Router();

  /**
   * @openapi
   *
   * /health/status:
   *   get:
   *     responses:
   *       200:
   *         description: service status OK
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/health.Status'
   */
  router.get("/status", async (_req: Request, res: Response<Status>) => {
    const status = {
      uptime: Math.floor(process.uptime()),
      timestamp: moment().utc(),
    };
    res.send(status);
  });

  return router;
}

export default {
  create,
};
