const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const GPRETOracleCollector = require('./price-collector');
require('dotenv').config();

/**
 * GPRET Oracle Server
 * Provides REST API for real estate price data
 * Runs automated price collection
 */
class GPRETOracleServer {
  constructor() {
    this.app = express();
    this.port = process.env.ORACLE_PORT || 3001;
    this.collector = new GPRETOracleCollector();
    this.updateInterval = process.env.ORACLE_UPDATE_INTERVAL || 24 * 60 * 60 * 1000; // 24 hours
    this.dataPath = path.join(__dirname, '..', '..', 'oracle-data');
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startScheduledUpdates();
  }
  
  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }
  
  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
      });
    });
    
    // Get latest price data
    this.app.get('/api/prices/latest', (req, res) => {
      try {
        const data = this.getLatestData();
        if (!data) {
          return res.status(404).json({ error: 'No price data available' });
        }
        
        res.json({
          success: true,
          data: data,
          timestamp: data.timestamp
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // Get specific city price
    this.app.get('/api/prices/city/:cityId', (req, res) => {
      try {
        const cityId = parseInt(req.params.cityId);
        const data = this.getLatestData();
        
        if (!data) {
          return res.status(404).json({ error: 'No price data available' });
        }
        
        const cityData = data.cities.find(city => city.id === cityId);
        
        if (!cityData) {
          return res.status(404).json({ error: 'City not found' });
        }
        
        res.json({
          success: true,
          data: cityData,
          timestamp: data.timestamp
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // Get global index
    this.app.get('/api/index/global', (req, res) => {
      try {
        const data = this.getLatestData();
        
        if (!data) {
          return res.status(404).json({ error: 'No index data available' });
        }
        
        res.json({
          success: true,
          data: {
            globalIndex: data.globalIndex,
            timestamp: data.timestamp,
            citiesCount: data.cities.length
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // Get price history
    this.app.get('/api/prices/history', (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 30;
        const history = this.getPriceHistory(limit);
        
        res.json({
          success: true,
          data: history,
          count: history.length
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // Get all cities
    this.app.get('/api/cities', (req, res) => {
      try {
        const cities = this.collector.cities.map(city => ({
          id: city.id,
          name: city.name,
          country: city.country
        }));
        
        res.json({
          success: true,
          data: cities,
          count: cities.length
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // Trigger manual price update (POST)
    this.app.post('/api/update/prices', async (req, res) => {
      try {
        console.log('📡 Manual price update triggered');
        
        const results = await this.collector.collectAllPrices();
        
        res.json({
          success: true,
          message: 'Price update completed',
          data: {
            timestamp: results.timestamp,
            citiesUpdated: results.cities.length,
            globalIndex: results.globalIndex,
            errors: results.errors.length
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // Get server statistics
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.collector.getPriceStats();
        const latestData = this.getLatestData();
        
        res.json({
          success: true,
          data: {
            server: {
              uptime: process.uptime(),
              memory: process.memoryUsage(),
              version: '1.0.0'
            },
            prices: stats,
            lastUpdate: latestData ? latestData.timestamp : null,
            citiesTracked: this.collector.cities.length
          }
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
    });
    
    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'GPRET Oracle API',
        version: '1.0.0',
        description: 'Real estate price data API for GPRET token',
        endpoints: {
          'GET /health': 'Server health check',
          'GET /api/prices/latest': 'Get latest price data for all cities',
          'GET /api/prices/city/:cityId': 'Get price data for specific city',
          'GET /api/index/global': 'Get global price index',
          'GET /api/prices/history': 'Get price history (query: limit)',
          'GET /api/cities': 'Get list of all tracked cities',
          'POST /api/update/prices': 'Trigger manual price update',
          'GET /api/stats': 'Get server and price statistics'
        },
        zeroRevenue: 'This API provides free data - no charges or fees',
        contact: 'https://github.com/[YOUR_USERNAME]/gpret-token'
      });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET /health',
          'GET /api/prices/latest',
          'GET /api/prices/city/:cityId',
          'GET /api/index/global',
          'GET /api/prices/history',
          'GET /api/cities',
          'POST /api/update/prices',
          'GET /api/stats'
        ]
      });
    });
    
    // Error handler
    this.app.use((error, req, res, next) => {
      console.error('Server error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    });
  }
  
  /**
   * Get latest price data from file
   */
  getLatestData() {
    try {
      const latestPath = path.join(this.dataPath, 'latest.json');
      
      if (!fs.existsSync(latestPath)) {
        return null;
      }
      
      const data = fs.readFileSync(latestPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading latest data:', error);
      return null;
    }
  }
  
  /**
   * Get price history
   */
  getPriceHistory(limit = 30) {
    try {
      const historyPath = path.join(this.dataPath, 'price-history.json');
      
      if (!fs.existsSync(historyPath)) {
        return [];
      }
      
      const data = fs.readFileSync(historyPath, 'utf8');
      const history = JSON.parse(data);
      
      return history.slice(-limit);
    } catch (error) {
      console.error('Error reading price history:', error);
      return [];
    }
  }
  
  /**
   * Start scheduled price updates
   */
  startScheduledUpdates() {
    console.log(`⏰ Starting scheduled updates every ${this.updateInterval / 1000 / 60 / 60} hours`);
    
    // Run initial update after 5 minutes
    setTimeout(() => {
      this.runScheduledUpdate();
    }, 5 * 60 * 1000);
    
    // Set recurring updates
    setInterval(() => {
      this.runScheduledUpdate();
    }, this.updateInterval);
  }
  
  /**
   * Run scheduled price update
   */
  async runScheduledUpdate() {
    try {
      console.log('🔄 Running scheduled price update...');
      
      const results = await this.collector.collectAllPrices();
      
      console.log(`✅ Scheduled update completed - Global Index: ${results.globalIndex}`);
      
      if (results.errors.length > 0) {
        console.log(`⚠️  Update had ${results.errors.length} errors`);
      }
      
    } catch (error) {
      console.error('❌ Scheduled update failed:', error);
    }
  }
  
  /**
   * Start the server
   */
  start() {
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
    
    this.app.listen(this.port, () => {
      console.log('🚀 GPRET Oracle Server Started');
      console.log('================================');
      console.log(`🌐 Server: http://localhost:${this.port}`);
      console.log(`📊 API: http://localhost:${this.port}/api`);
      console.log(`❤️  Health: http://localhost:${this.port}/health`);
      console.log(`📈 Latest Prices: http://localhost:${this.port}/api/prices/latest`);
      console.log(`🌍 Global Index: http://localhost:${this.port}/api/index/global`);
      console.log('');
      console.log('🔄 Scheduled Updates: Every 24 hours');
      console.log('💰 Revenue Model: FREE (Zero Cost)');
      console.log('🎯 Purpose: Educational & Community');
      console.log('');
      console.log('✅ Oracle server ready!');
    });
  }
  
  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('\n🛑 Shutting down GPRET Oracle Server...');
    process.exit(0);
  }
}

// ============ Main Execution ============

if (require.main === module) {
  const server = new GPRETOracleServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => server.shutdown());
  process.on('SIGTERM', () => server.shutdown());
  
  // Start server
  server.start();
}

module.exports = GPRETOracleServer;