require('dotenv').config();

/**
 * GPRET Oracle Configuration
 * Central configuration for the oracle system
 */

const config = {
  // ============ Server Configuration ============
  server: {
    port: process.env.ORACLE_PORT || 3001,
    host: process.env.ORACLE_HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
  },
  
  // ============ Update Configuration ============
  updates: {
    // Update interval in milliseconds (default: 24 hours)
    interval: parseInt(process.env.ORACLE_UPDATE_INTERVAL) || 24 * 60 * 60 * 1000,
    
    // Initial delay before first update (5 minutes)
    initialDelay: 5 * 60 * 1000,
    
    // Maximum retries for failed updates
    maxRetries: 3,
    
    // Retry delay in milliseconds
    retryDelay: 5 * 60 * 1000,
    
    // Enable/disable automatic updates
    autoUpdate: process.env.AUTO_UPDATE !== 'false'
  },
  
  // ============ Price Configuration ============
  prices: {
    // Base index value
    baseIndex: 1000,
    
    // Maximum price change percentage per update
    maxChangePercent: 10,
    
    // Price precision (decimal places)
    precision: 2,
    
    // Confidence thresholds
    confidence: {
      high: 90,
      medium: 70,
      low: 50
    },
    
    // Price validation
    validation: {
      enabled: true,
      minPrice: 1000,    // Minimum price per sqm in USD
      maxPrice: 50000,   // Maximum price per sqm in USD
      maxVolatility: 20  // Maximum volatility percentage
    }
  },
  
  // ============ Cities Configuration ============
  cities: [
    {
      id: 1,
      name: "New York",
      country: "US",
      coords: "40.7128,-74.0060",
      timezone: "America/New_York",
      weight: 15,  // Higher weight for major markets
      basePriceUSD: 15000,
      active: true
    },
    {
      id: 2,
      name: "London",
      country: "UK",
      coords: "51.5074,-0.1278",
      timezone: "Europe/London",
      weight: 12,
      basePriceUSD: 12000,
      active: true
    },
    {
      id: 3,
      name: "Tokyo",
      country: "JP",
      coords: "35.6762,139.6503",
      timezone: "Asia/Tokyo",
      weight: 10,
      basePriceUSD: 8000,
      active: true
    },
    {
      id: 4,
      name: "Hong Kong",
      country: "HK",
      coords: "22.3193,114.1694",
      timezone: "Asia/Hong_Kong",
      weight: 12,
      basePriceUSD: 18000,
      active: true
    },
    {
      id: 5,
      name: "Singapore",
      country: "SG",
      coords: "1.3521,103.8198",
      timezone: "Asia/Singapore",
      weight: 8,
      basePriceUSD: 14000,
      active: true
    },
    {
      id: 6,
      name: "Paris",
      country: "FR",
      coords: "48.8566,2.3522",
      timezone: "Europe/Paris",
      weight: 10,
      basePriceUSD: 11000,
      active: true
    },
    {
      id: 7,
      name: "Sydney",
      country: "AU",
      coords: "-33.8688,151.2093",
      timezone: "Australia/Sydney",
      weight: 8,
      basePriceUSD: 9000,
      active: true
    },
    {
      id: 8,
      name: "Toronto",
      country: "CA",
      coords: "43.6532,-79.3832",
      timezone: "America/Toronto",
      weight: 7,
      basePriceUSD: 7000,
      active: true
    },
    {
      id: 9,
      name: "Seoul",
      country: "KR",
      coords: "37.5665,126.9780",
      timezone: "Asia/Seoul",
      weight: 8,
      basePriceUSD: 6000,
      active: true
    },
    {
      id: 10,
      name: "Zurich",
      country: "CH",
      coords: "47.3769,8.5417",
      timezone: "Europe/Zurich",
      weight: 10,
      basePriceUSD: 13000,
      active: true
    }
  ],
  
  // ============ Data Sources Configuration ============
  dataSources: [
    {
      id: 1,
      name: "Mock Real Estate API",
      type: "rest",
      endpoint: process.env.MOCK_API_ENDPOINT || "https://api.mockapi.com/real-estate",
      apiKey: process.env.MOCK_API_KEY || "",
      weight: 30,
      timeout: 10000,
      retries: 2,
      active: true,
      rateLimit: {
        requests: 100,
        period: 3600000 // 1 hour
      }
    },
    {
      id: 2,
      name: "Free Property Index",
      type: "rest",
      endpoint: process.env.FREE_PROPERTY_API || "https://api.freepropertyindex.com/v1",
      apiKey: process.env.FREE_PROPERTY_KEY || "",
      weight: 25,
      timeout: 10000,
      retries: 2,
      active: true,
      rateLimit: {
        requests: 50,
        period: 3600000
      }
    },
    {
      id: 3,
      name: "Open Real Estate Data",
      type: "rest",
      endpoint: process.env.OPEN_RE_API || "https://api.openrealestate.org/prices",
      apiKey: process.env.OPEN_RE_KEY || "",
      weight: 25,
      timeout: 10000,
      retries: 2,
      active: true,
      rateLimit: {
        requests: 75,
        period: 3600000
      }
    },
    {
      id: 4,
      name: "Global Property Trends",
      type: "rest",
      endpoint: process.env.GLOBAL_TRENDS_API || "https://api.globalpropertytrends.com/free",
      apiKey: process.env.GLOBAL_TRENDS_KEY || "",
      weight: 20,
      timeout: 10000,
      retries: 2,
      active: true,
      rateLimit: {
        requests: 25,
        period: 3600000
      }
    }
  ],
  
  // ============ Blockchain Configuration ============
  blockchain: {
    networks: {
      hardhat: {
        url: "http://127.0.0.1:8545",
        chainId: 31337,
        gasPrice: "auto"
      },
      goerli: {
        url: process.env.GOERLI_RPC_URL,
        chainId: 5,
        gasPrice: "auto"
      },
      arbitrumOne: {
        url: process.env.ARBITRUM_RPC_URL,
        chainId: 42161,
        gasPrice: "auto"
      }
    },
    
    contracts: {
      gpret: {
        address: process.env.GPRET_TOKEN_ADDRESS || "",
        abi: [] // Will be loaded dynamically
      },
      staking: {
        address: process.env.GPRET_STAKING_ADDRESS || "",
        abi: [] // Will be loaded dynamically
      }
    },
    
    oracle: {
      privateKey: process.env.ORACLE_PRIVATE_KEY || "",
      gasLimit: 500000,
      maxGasPrice: "50000000000", // 50 gwei
      confirmations: 2
    }
  },
  
  // ============ Storage Configuration ============
  storage: {
    dataDirectory: "./oracle-data",
    backupDirectory: "./oracle-backups",
    maxHistoryEntries: 1000,
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours
    compressionEnabled: true
  },
  
  // ============ Logging Configuration ============
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    file: {
      enabled: process.env.LOG_TO_FILE === 'true',
      path: './logs/oracle.log',
      maxSize: '10m',
      maxFiles: 5
    },
    console: {
      enabled: true,
      colorize: true
    }
  },
  
  // ============ Security Configuration ============
  security: {
    apiRateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP"
    },
    cors: {
      origin: process.env.CORS_ORIGINS || "*",
      credentials: true
    },
    jwt: {
      secret: process.env.JWT_SECRET || "gpret-oracle-secret",
      expiresIn: '24h'
    }
  },
  
  // ============ Monitoring Configuration ============
  monitoring: {
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000
    },
    metrics: {
      enabled: process.env.METRICS_ENABLED === 'true',
      endpoint: '/metrics',
      collectDefault: true
    },
    alerts: {
      enabled: process.env.ALERTS_ENABLED === 'true',
      webhook: process.env.ALERT_WEBHOOK || "",
      thresholds: {
        priceChangePercent: 15,
        errorRate: 10,
        responseTime: 5000
      }
    }
  },
  
  // ============ Zero Revenue Confirmation ============
  zeroRevenue: {
    confirmed: true,
    message: "This oracle system generates ZERO revenue and charges NO fees",
    purpose: "Educational and community demonstration only",
    profits: 0,
    fees: 0,
    subscriptionCost: 0
  }
};

// ============ Helper Functions ============

/**
 * Get active cities
 */
config.getActiveCities = () => {
  return config.cities.filter(city => city.active);
};

/**
 * Get active data sources
 */
config.getActiveDataSources = () => {
  return config.dataSources.filter(source => source.active);
};

/**
 * Get city by ID
 */
config.getCityById = (id) => {
  return config.cities.find(city => city.id === id);
};

/**
 * Get data source by ID
 */
config.getDataSourceById = (id) => {
  return config.dataSources.find(source => source.id === id);
};

/**
 * Validate configuration
 */
config.validate = () => {
  const errors = [];
  
  // Check required environment variables for production
  if (config.server.environment === 'production') {
    const required = [
      'ORACLE_PORT',
      'GPRET_TOKEN_ADDRESS',
      'ORACLE_PRIVATE_KEY'
    ];
    
    for (const env of required) {
      if (!process.env[env]) {
        errors.push(`Missing required environment variable: ${env}`);
      }
    }
  }
  
  // Validate cities configuration
  const totalWeight = config.cities.reduce((sum, city) => sum + city.weight, 0);
  if (totalWeight !== 100) {
    console.warn(`Warning: City weights sum to ${totalWeight}, not 100`);
  }
  
  // Validate data sources
  const activeSourcesCount = config.getActiveDataSources().length;
  if (activeSourcesCount === 0) {
    errors.push('No active data sources configured');
  }
  
  return errors;
};

// ============ Environment-specific overrides ============

if (config.server.environment === 'development') {
  // Development-specific settings
  config.updates.interval = 5 * 60 * 1000; // 5 minutes for testing
  config.logging.level = 'debug';
  config.security.apiRateLimit.max = 1000; // More lenient for development
}

if (config.server.environment === 'test') {
  // Test-specific settings
  config.updates.autoUpdate = false;
  config.storage.dataDirectory = './test-data';
  config.logging.console.enabled = false;
}

module.exports = config;