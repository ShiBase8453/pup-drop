import {
  useActiveClaimConditionForWallet,
  useAddress,
  useClaimConditions,
  useClaimerProofs,
  useClaimIneligibilityReasons,
  useContract,
  useContractMetadata,
  useTokenSupply,
  Web3Button,
} from "@thirdweb-dev/react";
import { BigNumber, utils } from "ethers";
import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "../styles/Home.module.css";
import { parseIneligibility } from "../utils/parseIneligibility";
import { TOKEN_DROP_ADDRESS } from "../const/yourDetails";

const startTime = new Date();
const endTime = new Date(Date.now() + 60 * 60 * 24 * 20000);
const payload = {
  quantity: 8543, // The quantity of tokens to be minted
  to: useAddress, // Who will receive the tokens
  price: 0, // the price to pay for minting those tokens
  
  mintStartTime: startTime, // can mint anytime from now
  mintEndTime: endTime, // to 48hr from now,
  
};

const Home = () => {
  const tokenAddress = "0x93107eD260c58d5d1c04398f23fC69FDa0D78Bc3";
  const { contract } = useContract(tokenAddress, TOKEN_DROP_ADDRESS);
  const address = useAddress();
  const [quantity, setQuantity] = useState(1);
  const { data: contractMetadata } = useContractMetadata(contract);
  const signedPayload = await contract.erc20.signature.generate(payload);
  const tx = contract.erc20.signature.mint(signedPayload);
  const activeClaimCondition = useActiveClaimConditionForWallet(contract, address);
  const claimerProofs = useClaimerProofs(contract, address || "");
  const claimIneligibilityReasons = useClaimIneligibilityReasons(contract, {
    quantity,
    walletAddress: address || "",
  });

  const claimedSupply = useTokenSupply(contract);

  const totalAvailableSupply = useMemo(() => {
    return BigNumber.from(activeClaimCondition.data?.availableSupply || 1_000_000_000);
  }, [activeClaimCondition.data?.availableSupply]);

  const numberClaimed = useMemo(() => {
    return BigNumber.from(claimedSupply.data?.value || 0).toString();
  }, [claimedSupply]);

  const numberTotal = useMemo(() => {
    const n = totalAvailableSupply.add(
      BigNumber.from(claimedSupply.data?.value || 0)
    );
    if (n.gte(1_000_000_000)) {
      return "";
    }
    return n.toString();
  }, [totalAvailableSupply, claimedSupply]);

  const priceToMint = useMemo(() => {
    if (quantity) {
      const bnPrice = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      return `${utils.formatUnits(
        bnPrice.mul(quantity).toString(),
        activeClaimCondition.data?.currencyMetadata.decimals || 18
      )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
    }
  }, [
    activeClaimCondition.data?.currencyMetadata.decimals,
    activeClaimCondition.data?.currencyMetadata.symbol,
    activeClaimCondition.data?.currencyMetadata.value,
    quantity,
  ]);

  const maxClaimable = useMemo(() => {
    let bnMaxClaimable;
    try {
      bnMaxClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimableSupply || 0
      );
    } catch (e) {
      bnMaxClaimable = BigNumber.from(1_000_000_000);
    }

    let perTransactionClaimable;
    try {
      perTransactionClaimable = BigNumber.from(
        activeClaimCondition.data?.maxClaimablePerWallet || 0
      );
    } catch (e) {
      perTransactionClaimable = BigNumber.from(1_000_000_000);
    }

    if (perTransactionClaimable.lte(bnMaxClaimable)) {
      bnMaxClaimable = perTransactionClaimable;
    }

    const snapshotClaimable = claimerProofs.data?.maxClaimable;

    if (snapshotClaimable) {
      if (snapshotClaimable === "0") {
        // allowed unlimited for the snapshot
        bnMaxClaimable = BigNumber.from(1_000_000_000);
      } else {
        try {
          bnMaxClaimable = BigNumber.from(snapshotClaimable);
        } catch (e) {
          // fall back to default case
        }
      }
    }

    let max;
    if (totalAvailableSupply.lt(bnMaxClaimable)) {
      max = totalAvailableSupply;
    } else {
      max = bnMaxClaimable;
    }

    if (max.gte(1_000_000_000)) {
      return 1_000_000_000;
    }
    return max.toNumber();
  }, [
    claimerProofs.data?.maxClaimable,
    totalAvailableSupply,
    activeClaimCondition.data?.maxClaimableSupply,
    activeClaimCondition.data?.maxClaimablePerWallet,
  ]);

  const isSoldOut = useMemo(() => {
    try {
      return (
        (activeClaimCondition.isSuccess &&
          BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
            0
          )) ||
        numberClaimed === numberTotal
      );
    } catch (e) {
      return false;
    }
  }, [
    activeClaimCondition.data?.availableSupply,
    activeClaimCondition.isSuccess,
    numberClaimed,
    numberTotal,
  ]);

  const canClaim = useMemo(() => {
    return (
      activeClaimCondition.isSuccess &&
      claimIneligibilityReasons.isSuccess &&
      claimIneligibilityReasons.data?.length === 0 &&
      !isSoldOut
    );
  }, [
    activeClaimCondition.isSuccess,
    claimIneligibilityReasons.data?.length,
    claimIneligibilityReasons.isSuccess,
    isSoldOut,
  ]);

  const isLoading = useMemo(() => {
    return activeClaimCondition.isLoading || !contract;
  }, [activeClaimCondition.isLoading, contract]);

  const buttonLoading = useMemo(
    () => isLoading || claimIneligibilityReasons.isLoading,
    [claimIneligibilityReasons.isLoading, isLoading]
  );
  const buttonText = useMemo(() => {
    if (isSoldOut) {
      return "Not Eligible - Trade on a DEX";
    }

    if (canClaim) {
      const pricePerToken = BigNumber.from(
        activeClaimCondition.data?.currencyMetadata.value || 0
      );
      if (pricePerToken.eq(0)) {
        return "Claim";
      }
      return `Claim (${priceToMint})`;
    }
    if (claimIneligibilityReasons.data?.length) {
      return parseIneligibility(claimIneligibilityReasons.data, quantity);
    }
    if (buttonLoading) {
      return "Checking eligibility...";
    }

    return "Claiming not available";
  }, [
    isSoldOut,
    canClaim,
    claimIneligibilityReasons.data,
    buttonLoading,
    activeClaimCondition.data?.currencyMetadata.value,
    priceToMint,
    quantity,
  ]);

  return (
    <div className={styles.container}>
      {/* Check for claim start time */}
      {(activeClaimCondition.isError || (activeClaimCondition.data && activeClaimCondition.data.startTime > new Date())) && (
        <p>Claims starting soon. Please check back later.</p>     
      )}

      {/* Check if claim conditions are not set */}
      {claimConditions.data?.length === 0 || claimConditions.data?.every(cc => cc.maxClaimableSupply === "0") && (
        <p>This drop is not ready to be claimed yet. (No claim condition set)</p>
      )}

        {/* Loading or display */}
        {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* Display metadata */}
          {contractMetadata?.image && (
            <Image
              src={contractMetadata?.image}
              alt={contractMetadata?.name!}
              width={200}
              height={200}
              style={{ objectFit: "contain" }}
            />
          )}

          <h2 className={styles.title}>Claim Tokens</h2>
          <p className={styles.explain}>
            Claim your ShiBase tokens if Eligible!{" "}
            <span className={styles.pink}>{contractMetadata?.name}</span>
          </p>
        </>
      )}


      <hr className={styles.divider} />

      <div className={styles.claimGrid}>
        <input
          type="number"
          placeholder="Enter amount to claim!"
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (value > maxClaimable) {
              setQuantity(maxClaimable);
            } else if (value < 1) {
              setQuantity(1);
            } else {
              setQuantity(value);
            }
          }}
          value={quantity}
          className={`${styles.textInput} ${styles.noGapBottom}`}
        />
        <Web3Button
          theme="dark"
          contractAddress={tokenAddress}
          action={(contract) => contract.erc20.claim(quantity)}
          onSuccess={() => alert("Claimed!")}
          onError={(err) => alert(err)}
        >
          {buttonText}
        </Web3Button>
      </div>
    </div>
  );
};

export default Home;
