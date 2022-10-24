const express = require("express");
const router = express.Router();
const stripPaymentController = require("../controllers/StripPayment.controller");
const PayPalPaymentController = require("../controllers/PaypalPayment.controller");

router.get("/stripe", stripPaymentController.index);
router.post("/stripe/payment", stripPaymentController.payment);
router.post("/paypal/payment", PayPalPaymentController.payment);

module.exports = router;
