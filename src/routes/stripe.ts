import express, { Request, Response } from "express";
import { Logger } from "winston";
import { ethers } from "ethers";
import Stripe from "stripe";
import config from "../config.json"
import * as Gateway from "../abis/Gateway.json";

const stripe = new Stripe(config.stripeSecretKey, {
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

export interface Tx {
  from: string;
  to: string;
  value: string;
}

export interface TransferTxResponse extends Tx {
  gasLimit: string;
  gasPrice: string;
  nonce: string;
  data: string;
  chainId: number;
}

async function create(logger: Logger, provider: ethers.providers.Provider) {
  const router = express.Router();


  router.post(
    "/payment/method/attach",
    async (
      req: Request<any>,
      res: Response<any>
    ) => {
      try {
        const { paymentMethod } = req.body;

        /* Fetch the Customer Id of current logged in user from the database */
        const customerId = "cus_Mh9LTBDpKwf1k3";

        try {
          const method = await attachMethod({ paymentMethod, customerId });
          console.log(method);
          res.status(200).json({ message: "Payment method attached succesully" });
        } catch (err) {
          console.log(err);
          res.status(400).json({ message: "Could not attach method" });
        }
      } catch (err) {
        logger.error("Failed to process request:", err);
        res.status(500).send("Request failed");
      }
    }
  );

  router.get("/payment/methods", async (req, res) => {
    /* Query database to fetch Stripe Customer Id of current logged in user */
    const customerId = "cus_Mh9LTBDpKwf1k3";
  
    try {
      const paymentMethods = await listCustomerPayMethods(customerId);
      res.status(200).json(paymentMethods);
    } catch (err) {
      console.log(err);
      res.status(500).json("Could not get payment methods");
    }
  })

  router.post("/payment/create", async (req, res) => {
    const { paymentMethod } = req.body;
  
    /* Query database for getting the payment amount and customer id of the current logged in user */
  
    const amount = 1000;
    const currency = "INR";
    const userCustomerId = "cus_Mh9LTBDpKwf1k3";
  
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: currency,
        customer: userCustomerId,
        payment_method: paymentMethod,
        confirmation_method: "manual", // For 3D Security
        description: "Buy Product",
      });
  
      /* Add the payment intent record to your datbase if required */
      res.status(200).json(paymentIntent);
    } catch (err) {
      console.log(err);
      res.status(500).json("Could not create payment");
    }
  })

  router.post("/payment/confirm", async (req, res) => {
    const { paymentIntent, paymentMethod } = req.body;
    try {
      const intent = await stripe.paymentIntents.confirm(paymentIntent, {
        payment_method: paymentMethod,
      });
  
      /* Update the status of the payment to indicate confirmation */
      res.status(200).json(intent);
    } catch (err) {
      console.error(err);
      res.status(500).json("Could not confirm payment");
    }
  })


  return router;
}


async function createStripeCustomer({ name, email, phone }: {name: string, email: string, phone: string}) {
  return new Promise(async (resolve, reject) => {
    try {
      const Customer = await stripe.customers.create({
        name: name,
        email: email,
        phone: phone,
      });

      resolve(Customer);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
}

async function listCustomerPayMethods(customerId: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const paymentMethods = await stripe.customers.listPaymentMethods(customerId, {
        type: "card",
      });
      resolve(paymentMethods);
    } catch (err) {
      reject(err);
    }
  });
}

const attachMethod = ({ paymentMethod, customerId }: {paymentMethod: any, customerId: string}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const paymentMethodAttach = await stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId,
      });
      resolve(paymentMethodAttach);
    } catch (err) {
      reject(err);
    }
  });
}


const getDetails = async (id: string, method: string) => {
  const paymentIntent = await stripe.paymentIntents.confirm(
    id,
    { payment_method: method }
  );
  return paymentIntent;
}


export default {
  create,
};
