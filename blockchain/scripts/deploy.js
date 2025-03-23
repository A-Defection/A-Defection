// Deployment script for Narrative platform contracts
const hre = require("hardhat");

async function main() {
  console.log("Deploying Narrative platform contracts...");

  // Get contract factories
  const NarrativeToken = await hre.ethers.getContractFactory("NarrativeToken");
  const NarrativeNFT = await hre.ethers.getContractFactory("NarrativeNFT");
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");

  // Deploy NarrativeToken
  console.log("Deploying NarrativeToken...");
  const narrativeToken = await NarrativeToken.deploy();
  await narrativeToken.deployed();
  console.log("NarrativeToken deployed to:", narrativeToken.address);

  // Deploy NarrativeNFT
  console.log("Deploying NarrativeNFT...");
  const narrativeNFT = await NarrativeNFT.deploy();
  await narrativeNFT.deployed();
  console.log("NarrativeNFT deployed to:", narrativeNFT.address);

  // Deploy PredictionMarket with NarrativeToken address
  console.log("Deploying PredictionMarket...");
  const predictionMarket = await PredictionMarket.deploy(narrativeToken.address);
  await predictionMarket.deployed();
  console.log("PredictionMarket deployed to:", predictionMarket.address);

  // Set up roles
  console.log("Setting up contract roles...");
  
  // Grant MINTER_ROLE to PredictionMarket for NarrativeToken
  const MINTER_ROLE = await narrativeToken.MINTER_ROLE();
  await narrativeToken.grantRole(MINTER_ROLE, predictionMarket.address);
  console.log("Granted MINTER_ROLE to PredictionMarket");

  console.log("Deployment complete!");
  
  // Write deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    narrativeToken: narrativeToken.address,
    narrativeNFT: narrativeNFT.address,
    predictionMarket: predictionMarket.address,
    deploymentTime: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Deployment info written to deployment-info.json");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 