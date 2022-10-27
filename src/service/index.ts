import config from "../config.json"
import ERC20 from "../abis/ERC20.json";
import Gateway from "../abis/Gateway.json"
import { ethers } from "ethers";

class Service {

    web3: any;
    account: any;
    gatewayContract: any;
    xcfContract: any;

    constructor() {
        const provider = new ethers.providers.JsonRpcProvider(config.RPCProvider);

        const wallet = new ethers.Wallet(config.Privatekey);
        this.account = wallet.connect(provider);

        this.gatewayContract = new ethers.Contract(
            config.GatewayAddr,
            Gateway,
            this.account
        )

        this.xcfContract = new ethers.Contract(
            config.XCFAddr,
            ERC20.abi,
            this.account
        )

    }

    async getBalance(address: string) {
        const balance = await this.xcfContract.balanceOf(address)
        return ethers.utils.formatUnits(balance);
    }


    async withdraw(to: string, amount: number) {
        
        return await this.gatewayContract.withdraw(to, ethers.utils.formatEther(amount));
    }

}

module.exports = new Service();
