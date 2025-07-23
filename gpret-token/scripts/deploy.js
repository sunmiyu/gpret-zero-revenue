const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting GPRET deployment...");
  console.log("Network:", network.name);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
  
  if (balance.isZero()) {
    throw new Error("❌ Deployer account has no balance!");
  }
  
  console.log("\n📋 Deployment Summary:");
  console.log("=" .repeat(50));
  
  // ============ Deploy GPRET Token ============
  console.log("1️⃣ Deploying GPRET Token...");
  
  const GPRET = await ethers.getContractFactory("GPRET");
  const gpret = await GPRET.deploy();
  await gpret.deployed();
  
  console.log("✅ GPRET Token deployed to:", gpret.address);
  console.log("   Transaction hash:", gpret.deployTransaction.hash);
  
  // Wait for confirmation
  await gpret.deployTransaction.wait(2);
  
  // ============ Deploy Staking Contract ============
  console.log("\n2️⃣ Deploying GPRET Staking...");
  
  const GPRETStaking = await ethers.getContractFactory("GPRETStaking");
  const gpretStaking = await GPRETStaking.deploy(gpret.address);
  await gpretStaking.deployed();
  
  console.log("✅ GPRET Staking deployed to:", gpretStaking.address);
  console.log("   Transaction hash:", gpretStaking.deployTransaction.hash);
  
  // Wait for confirmation
  await gpretStaking.deployTransaction.wait(2);
  
  // ============ Configuration ============
  console.log("\n3️⃣ Configuring contracts...");
  
  // Set deployer as initial oracle (temporary)
  console.log("   Setting initial oracle...");
  const setOracleTx = await gpret.setOracle(deployer.address);
  await setOracleTx.wait(1);
  console.log("   ✅ Oracle set to:", deployer.address);
  
  // ============ Verification ============
  console.log("\n4️⃣ Verifying deployment...");
  
  // Verify token details
  const name = await gpret.name();
  const symbol = await gpret.symbol();
  const totalSupply = await gpret.totalSupply();
  const decimals = await gpret.decimals();
  
  console.log("   Token Name:", name);
  console.log("   Token Symbol:", symbol);
  console.log("   Total Supply:", ethers.utils.formatEther(totalSupply));
  console.log("   Decimals:", decimals);
  
  // Verify staking contract
  const stakingToken = await gpretStaking.gpretToken();
  const totalStaked = await gpretStaking.totalStaked();
  
  console.log("   Staking Token:", stakingToken);
  console.log("   Total Staked:", ethers.utils.formatEther(totalStaked));
  
  // ============ Save Deployment Info ============
  console.log("\n5️⃣ Saving deployment information...");
  
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId || "unknown",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      GPRET: {
        address: gpret.address,
        txHash: gpret.deployTransaction.hash,
        blockNumber: gpret.deployTransaction.blockNumber
      },
      GPRETStaking: {
        address: gpretStaking.address,
        txHash: gpretStaking.deployTransaction.hash,
        blockNumber: gpretStaking.deployTransaction.blockNumber
      }
    },
    verification: {
      tokenName: name,
      tokenSymbol: symbol,
      totalSupply: totalSupply.toString(),
      decimals: decimals,
      oracle: deployer.address
    }
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info
  const filename = `${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("   ✅ Deployment info saved to:", filepath);
  
  // ============ Gas Usage Report ============
  console.log("\n6️⃣ Gas usage report:");
  
  const gpretReceipt = await ethers.provider.getTransactionReceipt(gpret.deployTransaction.hash);
  const stakingReceipt = await ethers.provider.getTransactionReceipt(gpretStaking.deployTransaction.hash);
  const oracleReceipt = await ethers.provider.getTransactionReceipt(setOracleTx.hash);
  
  const totalGasUsed = gpretReceipt.gasUsed.add(stakingReceipt.gasUsed).add(oracleReceipt.gasUsed);
  
  console.log("   GPRET Token Gas:", gpretReceipt.gasUsed.toString());
  console.log("   Staking Contract Gas:", stakingReceipt.gasUsed.toString());
  console.log("   Oracle Setup Gas:", oracleReceipt.gasUsed.toString());
  console.log("   Total Gas Used:", totalGasUsed.toString());
  
  // ============ Next Steps ============
  console.log("\n🎉 Deployment completed successfully!");
  console.log("=" .repeat(50));
  console.log("\n📋 Contract Addresses:");
  console.log("   GPRET Token:", gpret.address);
  console.log("   GPRET Staking:", gpretStaking.address);
  
  console.log("\n🔗 Next Steps:");
  console.log("   1. Verify contracts on block explorer");
  console.log("   2. Set up proper oracle system");
  console.log("   3. Transfer ownership if needed");
  console.log("   4. Create liquidity pools");
  console.log("   5. Update frontend with contract addresses");
  
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("\n💡 Local Development:");
    console.log("   - Contracts deployed to local network");
    console.log("   - Use these addresses in your frontend");
    console.log("   - Oracle is set to deployer address");
  } else {
    console.log("\n⚠️  Production Checklist:");
    console.log("   - [ ] Verify contracts on Etherscan/Arbiscan");
    console.log("   - [ ] Set up proper oracle infrastructure");
    console.log("   - [ ] Transfer ownership to multisig");
    console.log("   - [ ] Test all functions on testnet first");
    console.log("   - [ ] Update documentation with addresses");
  }
  
  console.log("\n✨ GPRET Zero Revenue Token - Deployed Successfully!");
  console.log("Remember: This token generates ZERO revenue! 📈❌💰");
}

// Error handling
main()
  .then(() => {
    console.log("\n🏁 Deployment script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });