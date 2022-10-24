const settings = require("../config/settings");
const ERC20 = require("../abis/ERC20.json");
const Gateway = require("../abis/Gateway.json");
const Web3 = require('web3')

class Service {

    constructor() {
        this.web3 = null;
        this.account = null;
        this.gatewayContract = null;
        this.xcfContract = null;

        const web3 = new Web3(new Web3.providers.HttpProvider(settings.RPCProvider));
        const account = web3.eth.accounts.privateKeyToAccount(settings.Privatekey)

        this.web3 = web3;
        this.account = account;
        this.gatewayContract = new web3.eth.Contract(Gateway, settings.GatewayAddr);
        this.xcfContract = new web3.eth.Contract(ERC20.abi, settings.XCFAddr);

    }

    async getTokenBalance(address) {
        const balance = await this.xcfContract.methods.balanceOf(address).call();
        return this.web3.utils.fromWei(balance, "ether");
    }

    async getBalance(address) {
        const balance = await this.web3.eth.getBalance(address);
        return this.web3.utils.fromWei(balance, "ether");
    }

    async getPrice() {
        try {
            return await this.gatewayContract.methods.getPriceForUSD().call();
        }catch {
            return 0;
        }
    }

    async tokenwithdraw(address, amount) {
        try {
            const tx = this.gatewayContract.methods.Withdraw(address, this.web3.utils.toWei(amount.toString()));
            return await this.sendTransaction(tx, this.gatewayContract.options.address);
        } catch (err) {
            return err;
        }
    }

    async sendTransaction(tx, contractAddress) {
        this.web3.eth.accounts.wallet.add(settings.Privatekey);
        const gas = await tx.estimateGas({ from: this.account.address });
        const gasPrice = await this.web3.eth.getGasPrice();
        const data = tx.encodeABI();
        const nonce = await this.web3.eth.getTransactionCount(this.account.address);

        const txData = {
            from: this.account.address,
            to: contractAddress,
            data: data,
            gas,
            gasPrice,
            nonce,
        };
        return await this.web3.eth.sendTransaction(txData);
    }

}

module.exports = new Service();
