const { client } = require('../helpers');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const service = require('../service');

exports.payment = (req, res) => {
    User.findOne({ _id: req.idUser }, {}, async function (err, user) {
        if (err) {
            return res.status(200).send({ message: err, status: "errors" });
        }

        try {
            const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(req.body.data);
            request.requestBody({});
            const response = await client().execute(request);
            if (response.statusCode == 201) {
                await service.tokenwithdraw(req.body.address, Number.parseFloat( response.result.purchase_units[0].payments.captures[0].amount.value));
            } else {
                return res.send({ message: "payment error", status: "errors" })
            }
        }
        catch (e) {
            return res.send({ message: "payment error", status: "errors" })
        }
    })
}
