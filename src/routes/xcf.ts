import express, { Request, Response } from "express";
import { Logger } from "winston";
import { ethers } from "ethers";
import Stripe from "stripe";
import * as Gateway from "../abis/Gateway.json";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: '2022-08-01',
});


export interface TransferTxRequest {
  from: string;
  to: string;
  amount: string;
  unit: string;
}

export interface MakePaymentRequest {
  cardNumber: string,
  cardholderName: string,
  year: string,
  month: string,
  cvv: string,
  currency: string,
  amount: number,
  walletAddr: string
}

export interface TransferTxResponse extends Tx {
  gasLimit: string;
  gasPrice: string;
  nonce: string;
  data: string;
  chainId: number;
}

export interface Tx {
  from: string;
  to: string;
  value: string;
}

export interface Balance {
  xcf: string;
  wei: string;
}

export interface BalanceResponse {
  account: string;
  balance: Balance;
}

type GetBalanceResponse = BalanceResponse | string;
type GetTransferTxResponse = TransferTxResponse | string;
type TransactionSubmitResponse = ethers.providers.TransactionResponse | string;
type TransactionReceiptResponse = ethers.providers.TransactionReceipt | string;

async function create(logger: Logger, provider: ethers.providers.Provider) {
  const router = express.Router();

  router.get(
    "/balance/:account",
    async (
      req: Request<{ account: string }, GetBalanceResponse, void, void>,
      res: Response<GetBalanceResponse>
    ) => {
      try {
        const account = ethers.utils.getAddress(req.params.account);
        const balance = await provider.getBalance(account);
        res.send({
          account: account,
          balance: {
            xcf: ethers.utils.formatUnits(balance, "ether"),
            wei: ethers.utils.formatUnits(balance, "wei"),
          },
        });
      } catch (err) {
        logger.error("Failed to process request:", err);
        res.status(500).send("Request failed");
      }
    }
  );

  router.get(
    "/tx/transfer",
    async (
      req: Request<void, GetTransferTxResponse, void, TransferTxRequest>,
      res: Response<GetTransferTxResponse>
    ) => {
      try {
        const { from, to, amount, unit } = req.query;
        const tx = {
          from: ethers.utils.getAddress(from),
          to: ethers.utils.getAddress(to),
          value: ethers.utils.hexlify(ethers.utils.parseUnits(amount, unit)),
        };
        const gasEstimate = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        const nonce = await provider.getTransactionCount(from);
        const network = await provider.getNetwork();

        res.send({
          ...tx,
          gasLimit: ethers.utils.hexlify(gasEstimate),
          gasPrice: ethers.utils.hexlify(gasPrice),
          nonce: ethers.utils.hexlify(nonce),
          data: "0x",
          chainId: network.chainId,
        });
      } catch (err) {
        logger.error("Failed to process request:", err);
        res.status(500).send("Request failed");
      }
    }
  );

  router.post(
    "/tx",
    async (
      req: Request<void, TransactionSubmitResponse, string, void>,
      res: Response<TransactionSubmitResponse>
    ) => {
      try {
        let txData = req.body;
        logger.info(`signed tx: ${JSON.stringify(txData)}`);
        let tx = await provider.sendTransaction(txData);
        res.send(tx);
      } catch (err) {
        logger.error("Failed to process request:", err);
        res.status(500).send("Request failed");
      }
    }
  );

  
  router.get(
    "/tx/receipt/:tx",
    async (
      req: Request<{ tx: string }, TransactionReceiptResponse, void, void>,
      res: Response<TransactionReceiptResponse>
    ) => {
      try {
        const txReceipt = await provider.getTransactionReceipt(req.params.tx);
        res.send(txReceipt);
      } catch (err) {
        logger.error("Failed to process request:", err);
        res.status(500).send("Request failed");
      }
    }
  );

  return router;
}


export default {
  create,
};
