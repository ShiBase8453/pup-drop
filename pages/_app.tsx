import React from "react";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import Head from "next/head";
import ThirdwebGuideFooter from "../components/guide/ThirdwebGuideFooter";
import "../styles/globals.css";
import { AppProps } from "next/app";

// This is the chain your dApp will work on.
const activeChain = "base";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider 
    clientId={process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID}
    activeChain={activeChain}>
      <Head>
        <title>ShiBase Token Airdrop</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="Claim your SHI and be Based."
        />
        <meta
          name="keywords"
          content="Airdrop, ShiBase, Base, Thirdweb"
        />
      </Head>
      <Component {...pageProps} />
      <ThirdwebGuideFooter />
    </ThirdwebProvider>
  );
}

export default MyApp;
