require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
      gas: 12000000,
      blockGasLimit: 12000000,
      allowUnlimitedContractSize: true,
    },
    
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    
    goerli: {
      url: process.env.GOERLI_RPC_URL || "https://goerli.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 5,
      gas: 6000000,
      gasPrice: "auto",
    },
    
    arbitrumGoerli: {
      url: process.env.ARBITRUM_GOERLI_RPC_URL || "https://goerli-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421613,
      gas: "auto",
      gasPrice: "auto",
    },
    
    arbitrumOne: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161,
      gas: "auto",
      gasPrice: "auto",
    },
    
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
      gas: "auto",
      gasPrice: "auto",
    },
  },
  
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      arbitrumGoerli: process.env.ARBISCAN_API_KEY,
    },
    customChains: [
      {
        network: "arbitrumGoerli",
        chainId: 421613,
        urls: {
          apiURL: "https://api-goerli.arbiscan.io/api",
          browserURL: "https://goerli.arbiscan.io/"
        }
      }
    ]
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  
  mocha: {
    timeout: 40000,
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};