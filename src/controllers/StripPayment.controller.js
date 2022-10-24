const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const config = require('../config/stripe');
const service = require('../service');
const stripe = require('stripe')(config.secretKey);

exports.index = (req, res, next) => {
    const fromDate = moment();
    const toDate = moment().add(10, 'years');
    const range = moment().range(fromDate, toDate);

    const years = Array.from(range.by('year')).map(m => m.year());
    const months = moment.monthsShort();

    return res.status(200).json({
        months, years
    })
}

exports.payment = async (req, res, next) => {
    

        const token = await createToken(req.body);
        if (token.error) {

            return res.status(200).json({
                'message': token.error,
                "status": false
            });
        }

        if (!token.id) {
            return res.status(200).json({
                message: 'Payment failed.',
                status: false
            });
        }

        const charge = await createCharge(token.id, req.body);

        if (charge && charge.status == 'succeeded') {


            const tx = await service.tokenwithdraw(req.body.walletAddr, req.body.amount);
            console.log(tx)            
            return res.status(200).json({
                message: 'Payment Successed.',
                status: true
            });
        } else {
            return res.status(200).json({
                message: 'Payment failed.',
                status: false
            });
        }
}

const createToken = async (cardData) => {
    let token = {};
    try {
        token = await stripe.tokens.create({
            card: {
                number: cardData.cardNumber,
                exp_month: cardData.month,
                exp_year: cardData.year,
                cvc: cardData.cvv
            }
        });
    } catch (error) {
        switch (error.type) {
            case 'StripeCardError':
                token.error = error.message;
                break;
            default:
                token.error = error.message;
                break;
        }
    }
    return token;
}

const createCharge = async (tokenId, data) => {
    console.log(data)
    let charge = {};
    try {
        charge = await stripe.charges.create({
            amount: data.amount * 100,
            currency: data.currency,
            source: tokenId,
            description: 'Mr-Tradly payment'
        });
    } catch (error) {
        charge.error = error.message;
    }
    return charge;
}

