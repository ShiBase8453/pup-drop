import { ThirdwebAuth } from "@thirdweb-dev/auth/next";
import { PrivateKeyWallet } from "@thirdweb-dev/auth/evm";

export const { ThirdwebAuthHandler, getUser } = ThirdwebAuth({
  domain: "shibase8453.github.io/pup-drop/",
  wallet: new PrivateKeyWallet(process.env.PRIVATE_KEY || ""),
});

export default ThirdwebAuthHandler();