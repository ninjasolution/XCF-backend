import fs from "node:fs";
import process from "node:process";

import { Command } from "commander";

import { ethers } from "ethers";

interface CliArgs {
  gateway: string;
  transaction: string;
  key: string;
  passwords: string | null;
}

function readJsonFile(file: fs.PathLike): Promise<object> {
  return readFile(file).then((data) => {
    return JSON.parse(data);
  });
}

function readFile(file: fs.PathLike): Promise<string> {
  return new Promise((resolve) => {
    fs.readFile(file, "utf8", function (err, data) {
      if (err) {
        throw err;
      }
      resolve(data);
    });
  });
}

function isPrivateKey(keyData: string) {
  return keyData.startsWith("0x");
}

async function createWallet(keyData: string, passwordsFile: string | null) {
  if (typeof keyData == "string" && isPrivateKey(keyData)) {
    // Expecting the spec to be private key as a string
    return new ethers.Wallet(keyData);
  } else if (passwordsFile == null) {
    throw Error("passwords file not provided");
  } else {
    // Read wallet data into a string, do not parse into JSON
    return Promise.all([readFile(passwordsFile), readFile(keyData)]).then(
      ([passwords, walletJson]: [string, any]) => {
        //  Try to decrypt the wallet with each password
        return Promise.any(
          passwords
            .trim()
            .split("\n")
            .map((password) =>
              ethers.Wallet.fromEncryptedJson(walletJson, password)
            )
        );
      }
    );
  }
}

async function run(args: CliArgs) {
  let provider: ethers.providers.Provider;

  if (args.gateway.startsWith("ws")) {
    provider = new ethers.providers.WebSocketProvider(args.gateway);
  } else if (args.gateway.startsWith("http")) {
    provider = new ethers.providers.JsonRpcProvider(args.gateway);
  } else {
    throw Error(`Invalid gateway address: ${args.gateway}`);
  }

  // TODO: create signer wihtout needing gateway connection
  const signer = await createWallet(args.key, args.passwords).then((wallet) => {
    return wallet.connect(provider);
  });

  const tx = JSON.parse(args.transaction);

  console.log(await signer.signTransaction(tx));
}

let appVersion;

if (process.env.npm_package_version) {
  appVersion = process.env.npm_package_version;
} else {
  appVersion = require("../package.json").version;
}

const appArgs = new Command();

appArgs
  .version(appVersion)
  .option(
    "-g, --gateway <gateway-address>",
    "Ethereum node address that should be used as the gateway",
    "ws://localhost:8545"
  )
  .requiredOption("-t, --transaction <transaction>", "transaction data")
  .requiredOption(
    "-k, --key <key>",
    "private key or location of the wallet json file"
  )
  .option(
    "-p, --passwords <passwords>",
    "file where to read passwords, needed if passing a key using wallet json file"
  );

run(appArgs.parse(process.argv).opts())
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed: ", err);
    process.exit(1);
  });
