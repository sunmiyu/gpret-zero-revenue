# GPRET Technical Specifications

**Version 1.0 | January 2025**

---

## Overview

This document provides comprehensive technical specifications for the GPRET (Global Prime Real Estate Token) system, including smart contract architecture, API specifications, deployment requirements, and integration guidelines.

## Table of Contents

1. [Smart Contract Specifications](#1-smart-contract-specifications)
2. [Oracle System Architecture](#2-oracle-system-architecture)
3. [API Documentation](#3-api-documentation)
4. [Deployment Configuration](#4-deployment-configuration)
5. [Integration Guidelines](#5-integration-guidelines)
6. [Security Specifications](#6-security-specifications)
7. [Performance Requirements](#7-performance-requirements)
8. [Testing Specifications](#8-testing-specifications)

---

## 1. Smart Contract Specifications

### 1.1 GPRET Token Contract

#### Contract Details
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GPRET is ERC20, ERC20Burnable, Pausable, Ownable, ReentrancyGuard
```

#### Token Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| Name | "Global Prime Real Estate Token" | Full token name |
| Symbol | "GPRET" | Token symbol |
| Decimals | 18 | Standard ERC20 decimals |
| Total Supply | 1,000,000,000 × 10^18 | Fixed supply, no inflation |
| Initial Distribution | 100% to deployer | Single initial mint |

#### Core Functions

##### Price Tracking Functions
```solidity
function updatePriceIndex(uint256 newIndex) external onlyOracle;
function updateCityPrice(uint256 cityId, uint256 newPriceIndex) external onlyOracle;
function getPriceInfo() external view returns (uint256 index, uint256 lastUpdate);
function getCityInfo(uint256 cityId) external view returns (string memory name, uint256 priceIndex, uint256 weight, bool isActive);
```

##### Governance Functions
```solidity
function createProposal(string memory description, uint256 votingPeriod) external returns (uint256);
function vote(uint256 proposalId, bool support) external;
function getProposal(uint256 proposalId) external view returns (...);
```

##### Administrative Functions
```solidity
function setOracle(address newOracle) external onlyOwner;
function addCity(uint256 cityId, string memory name, uint256 weight) external onlyOwner;
function pause() external onlyOwner;
function unpause() external onlyOwner;
```

#### State Variables

##### Price Tracking
```solidity
uint256 public realEstatePriceIndex;     // Current global index (scaled by 1e18)
uint256 public lastPriceUpdate;          // Last update timestamp
uint256 public constant MIN_UPDATE_INTERVAL = 24 hours;
address public priceOracle;              // Authorized oracle address
```

##### Governance
```solidity
uint256 public proposalCounter;          // Total proposals created
mapping(uint256 => Proposal) public proposals;
mapping(uint256 => mapping(address => bool)) public hasVoted;
mapping(uint256 => mapping(address => bool)) public voteChoice;
```

##### City Data
```solidity
struct CityData {
    string name;
    uint256 priceIndex;
    uint256 weight;
    bool isActive;
}
mapping(uint256 => CityData) public cities;
uint256[] public activeCityIds;
```

#### Events
```solidity
event PriceIndexUpdated(uint256 indexed newIndex, uint256 timestamp);
event OracleUpdated(address indexed oldOracle, address indexed newOracle);
event CityAdded(uint256 indexed cityId, string name, uint256 weight);
event CityUpdated(uint256 indexed cityId, uint256 newPriceIndex);
event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
```

### 1.2 GPRET Staking Contract

#### Contract Details
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GPRETStaking is ReentrancyGuard, Pausable, Ownable
```

#### Staking Parameters
| Parameter | Value | Description |
|-----------|-------|-------------|
| Minimum Stake | 1 GPRET | Minimum staking amount |
| Maximum Stake | Total Supply | No upper limit |
| Lock Periods | 7, 30, 90, 180, 365 days | Available staking periods |
| Governance Multipliers | 1.0x, 1.1x, 1.25x, 1.5x, 2.0x | Voting weight multipliers |
| Rewards | 0% APY | Explicitly zero rewards |

#### Core Functions

##### Staking Operations
```solidity
function stake(uint256 amount, uint256 lockPeriod) external;
function unstake(uint256 stakeIndex) external;
function emergencyUnstake(address user, uint256 stakeIndex) external onlyOwner;
```

##### View Functions
```solidity
function getUserStake(address user, uint256 stakeIndex) external view returns (...);
function getUserTotalInfo(address user) external view returns (...);
function getAllUserStakes(address user) external view returns (StakeInfo[] memory);
function getContractStats() external view returns (...);
function getStakingPeriods() external view returns (uint256[] memory, uint256[] memory);
```

#### State Variables
```solidity
IERC20 public immutable gpretToken;      // GPRET token address
uint256 public totalStaked;              // Total tokens staked
uint256 public totalStakers;             // Number of unique stakers
mapping(address => StakeInfo[]) public userStakes;
mapping(address => uint256) public userTotalStaked;
mapping(address => uint256) public userGovernanceWeight;
mapping(uint256 => uint256) public periodMultipliers;
```

#### Stake Info Structure
```solidity
struct StakeInfo {
    uint256 amount;           // Amount of tokens staked
    uint256 stakingTime;      // When tokens were staked
    uint256 lockPeriod;       // Lock period in seconds
    uint256 governanceWeight; // Weight for governance voting
    bool isActive;            // Whether stake is active
}
```

### 1.3 Interface Specifications

#### IGPRET Interface
Complete interface for GPRET token contract with all external functions and events.

#### IGPRETStaking Interface
Complete interface for staking contract with staking operations and view functions.

#### IGPRETOracle Interface
Interface specification for oracle system integration (future implementation).

---

## 2. Oracle System Architecture

### 2.1 System Components

#### Data Collection Layer
```javascript
class GPRETOracleCollector {
    constructor() {
        this.cities = [...];           // 10 tracked cities
        this.dataSources = [...];      // Free API sources
        this.baseIndex = 1000;         // Starting index value
    }
}
```

#### Data Sources Configuration
```javascript
const dataSources = [
    {
        name: "Mock Real Estate API",
        endpoint: "https://api.mockapi.com/real-estate",
        weight: 30,
        active: true
    },
    // ... additional sources
];
```

### 2.2 City Configuration

#### Tracked Cities
| ID | City | Country | Base Price (USD/sqm) | Weight |
|----|------|---------|---------------------|--------|
| 1 | New York | US | $15,000 | 15% |
| 2 | London | UK | $12,000 | 12% |
| 3 | Tokyo | JP | $8,000 | 10% |
| 4 | Hong Kong | HK | $18,000 | 12% |
| 5 | Singapore | SG | $14,000 | 8% |
| 6 | Paris | FR | $11,000 | 10% |
| 7 | Sydney | AU | $9,000 | 8% |
| 8 | Toronto | CA | $7,000 | 7% |
| 9 | Seoul | KR | $6,000 | 8% |
| 10 | Zurich | CH | $13,000 | 10% |

### 2.3 Data Collection Process

#### Collection Workflow
1. **Source Polling**: Query each active data source
2. **Data Validation**: Cross-reference multiple sources
3. **Price Calculation**: Calculate weighted averages
4. **Index Generation**: Compute global price index
5. **Blockchain Update**: Submit to smart contract
6. **Storage**: Save historical data

#### Update Frequency
- **Minimum Interval**: 24 hours
- **Typical Frequency**: Daily at UTC midnight
- **Emergency Updates**: Manual trigger available
- **Batch Operations**: Multiple cities updated together

### 2.4 API Server Specifications

#### Server Configuration
```javascript
const config = {
    server: {
        port: 3001,
        host: 'localhost',
        environment: 'development'
    },
    updates: {
        interval: 24 * 60 * 60 * 1000,  // 24 hours
        maxRetries: 3,
        retryDelay: 5 * 60 * 1000       // 5 minutes
    }
};
```

---

## 3. API Documentation

### 3.1 REST API Endpoints

#### Base URL
```
Development: http://localhost:3001
Production: https://api.gpret.org
```

#### Authentication
No authentication required - all endpoints are public and free.

### 3.2 Endpoint Specifications

#### Health Check
```http
GET /health
```

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2025-01-20T10:00:00.000Z",
    "uptime": 3600,
    "version": "1.0.0"
}
```

#### Latest Prices
```http
GET /api/prices/latest
```

**Response:**
```json
{
    "success": true,
    "data": {
        "timestamp": "2025-01-20T10:00:00.000Z",
        "globalIndex": 1050.25,
        "cities": [
            {
                "id": 1,
                "name": "New York",
                "country": "US",
                "averagePrice": 15750,
                "confidence": 92,
                "sources": 3,
                "lastUpdate": "2025-01-20T10:00:00.000Z"
            }
            // ... additional cities
        ]
    }
}
```

#### City-Specific Price
```http
GET /api/prices/city/:cityId
```

**Parameters:**
- `cityId` (integer): City ID (1-10)

**Response:**
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "New York",
        "country": "US",
        "averagePrice": 15750,
        "confidence": 92,
        "sources": 3,
        "lastUpdate": "2025-01-20T10:00:00.000Z",
        "prices": [
            {
                "source": "Source A",
                "price": 15800,
                "weight": 30,
                "confidence": 90
            }
            // ... additional sources
        ]
    }
}
```

#### Global Index
```http
GET /api/index/global
```

**Response:**
```json
{
    "success": true,
    "data": {
        "globalIndex": 1050.25,
        "timestamp": "2025-01-20T10:00:00.000Z",
        "citiesCount": 10
    }
}
```

#### Price History
```http
GET /api/prices/history?limit=30
```

**Query Parameters:**
- `limit` (integer, optional): Number of historical records (default: 30)

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "timestamp": "2025-01-20T10:00:00.000Z",
            "globalIndex": 1050.25,
            "citiesCount": 10
        }
        // ... additional historical records
    ],
    "count": 30
}
```

#### Manual Price Update
```http
POST /api/update/prices
```

**Response:**
```json
{
    "success": true,
    "message": "Price update completed",
    "data": {
        "timestamp": "2025-01-20T10:00:00.000Z",
        "citiesUpdated": 10,
        "globalIndex": 1050.25,
        "errors": 0
    }
}
```

### 3.3 Error Responses

#### Error Format
```json
{
    "success": false,
    "error": "Error message",
    "code": "ERROR_CODE",
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### HTTP Status Codes
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

---

## 4. Deployment Configuration

### 4.1 Network Configuration

#### Supported Networks
```javascript
const networks = {
    hardhat: {
        url: "http://127.0.0.1:8545",
        chainId: 31337,
        gas: 12000000
    },
    goerli: {
        url: process.env.GOERLI_RPC_URL,
        chainId: 5,
        gas: 6000000
    },
    arbitrumOne: {
        url: process.env.ARBITRUM_RPC_URL,
        chainId: 42161,
        gas: "auto"
    }
};
```

#### Primary Deployment
- **Network**: Arbitrum One
- **Chain ID**: 42161
- **Gas Strategy**: Auto optimization
- **Confirmation Blocks**: 2

### 4.2 Deployment Scripts

#### Main Deployment
```bash
# Deploy to testnet
npx hardhat run scripts/deploy.js --network goerli

# Deploy to mainnet
npx hardhat run scripts/deploy.js --network arbitrumOne
```

#### Contract Verification
```bash
# Verify contracts
npx hardhat run scripts/verify.js --network arbitrumOne
```

### 4.3 Environment Variables

#### Required Variables
```bash
# Blockchain Configuration
PRIVATE_KEY=your_deployer_private_key
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
ETHERSCAN_API_KEY=your_etherscan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key

# Oracle Configuration
ORACLE_PORT=3001
ORACLE_UPDATE_INTERVAL=86400000

# Contract Addresses (post-deployment)
GPRET_TOKEN_ADDRESS=0x...
GPRET_STAKING_ADDRESS=0x...
```

### 4.4 Gas Optimization

#### Deployment Costs (Estimated)
| Contract | Gas Used | Cost (20 gwei) |
|----------|----------|----------------|
| GPRET Token | ~2,500,000 | ~0.05 ETH |
| GPRET Staking | ~1,800,000 | ~0.036 ETH |
| Configuration | ~200,000 | ~0.004 ETH |
| **Total** | **~4,500,000** | **~0.09 ETH** |

---

## 5. Integration Guidelines

### 5.1 Contract Integration

#### Web3 Integration Example
```javascript
import { ethers } from 'ethers';

// Contract ABI and address
const GPRET_ABI = [...];
const GPRET_ADDRESS = "0x...";

// Initialize contract
const provider = new ethers.providers.JsonRpcProvider();
const contract = new ethers.Contract(GPRET_ADDRESS, GPRET_ABI, provider);

// Read price data
async function getCurrentIndex() {
    const [index, lastUpdate] = await contract.getPriceInfo();
    return {
        index: ethers.utils.formatEther(index),
        lastUpdate: lastUpdate.toNumber()
    };
}
```

#### City Data Integration
```javascript
async function getCityData(cityId) {
    const [name, priceIndex, weight, isActive] = await contract.getCityInfo(cityId);
    return {
        name,
        priceIndex: ethers.utils.formatEther(priceIndex),
        weight: weight.toNumber(),
        isActive
    };
}
```

### 5.2 API Integration

#### JavaScript SDK Example
```javascript
class GPRETClient {
    constructor(baseURL = 'https://api.gpret.org') {
        this.baseURL = baseURL;
    }
    
    async getLatestPrices() {
        const response = await fetch(`${this.baseURL}/api/prices/latest`);
        return await response.json();
    }
    
    async getCityPrice(cityId) {
        const response = await fetch(`${this.baseURL}/api/prices/city/${cityId}`);
        return await response.json();
    }
    
    async getGlobalIndex() {
        const response = await fetch(`${this.baseURL}/api/index/global`);
        return await response.json();
    }
}
```

#### Python Integration
```python
import requests

class GPRETClient:
    def __init__(self, base_url='https://api.gpret.org'):
        self.base_url = base_url
    
    def get_latest_prices(self):
        response = requests.get(f'{self.base_url}/api/prices/latest')
        return response.json()
    
    def get_city_price(self, city_id):
        response = requests.get(f'{self.base_url}/api/prices/city/{city_id}')
        return response.json()
    
    def get_global_index(self):
        response = requests.get(f'{self.base_url}/api/index/global')
        return response.json()
```

### 5.3 Frontend Integration

#### React Hook Example
```javascript
import { useState, useEffect } from 'react';

function useGPRETPrice() {
    const [priceData, setPriceData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        async function fetchPrice() {
            try {
                const response = await fetch('/api/prices/latest');
                const data = await response.json();
                setPriceData(data);
            } catch (error) {
                console.error('Failed to fetch price data:', error);
            } finally {
                setLoading(false);
            }
        }
        
        fetchPrice();
        const interval = setInterval(fetchPrice, 60000); // Update every minute
        
        return () => clearInterval(interval);
    }, []);
    
    return { priceData, loading };
}
```

---

## 6. Security Specifications

### 6.1 Smart Contract Security

####