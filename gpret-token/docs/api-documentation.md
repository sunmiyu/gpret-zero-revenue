# GPRET API Documentation

**Version 1.0 | January 2025**

## Overview

The GPRET API provides free, open access to global prime real estate price data tracked by the GPRET oracle system. This RESTful API offers real-time and historical price information for 10 major global cities, completely free of charge in alignment with GPRET's zero-revenue philosophy.

## Base URL

```
Development: http://localhost:3001
Production: https://api.gpret.org (Coming Soon)
```

## Authentication

**No authentication required** - All endpoints are public and free to use.

## Rate Limiting

- **Limit**: 100 requests per hour per IP address
- **Headers**: Rate limit information included in response headers
- **Exceeded**: HTTP 429 status code when limit exceeded

## Response Format

### Success Response
```json
{
    "success": true,
    "data": { ... },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Error description",
    "code": "ERROR_CODE",
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Maintenance mode |

---

## Endpoints

### Health Check

Check the API server status and availability.

```http
GET /health
```

#### Response
```json
{
    "status": "healthy",
    "timestamp": "2025-01-20T10:00:00.000Z",
    "uptime": 86400,
    "version": "1.0.0",
    "database": "connected",
    "oracle": "active"
}
```

#### Example
```bash
curl -X GET "http://localhost:3001/health"
```

---

### Get Latest Prices

Retrieve the most recent price data for all tracked cities.

```http
GET /api/prices/latest
```

#### Response
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
                "lastUpdate": "2025-01-20T10:00:00.000Z",
                "changePercent": 2.5,
                "coordinates": "40.7128,-74.0060"
            },
            {
                "id": 2,
                "name": "London",
                "country": "UK",
                "averagePrice": 12300,
                "confidence": 88,
                "sources": 3,
                "lastUpdate": "2025-01-20T10:00:00.000Z",
                "changePercent": -1.2,
                "coordinates": "51.5074,-0.1278"
            }
            // ... additional cities
        ]
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### Field Descriptions
- `globalIndex`: Weighted average price index (base 1000)
- `averagePrice`: Average price per square meter in USD
- `confidence`: Data reliability score (0-100)
- `sources`: Number of data sources used
- `changePercent`: 24-hour price change percentage

#### Example
```bash
curl -X GET "http://localhost:3001/api/prices/latest"
```

```javascript
// JavaScript example
fetch('/api/prices/latest')
    .then(response => response.json())
    .then(data => {
        console.log('Global Index:', data.data.globalIndex);
        console.log('Cities:', data.data.cities.length);
    });
```

---

### Get City Price

Retrieve detailed price information for a specific city.

```http
GET /api/prices/city/{cityId}
```

#### Parameters
- `cityId` (integer): City identifier (1-10)

#### Response
```json
{
    "success": true,
    "data": {
        "id": 1,
        "name": "New York",
        "country": "US",
        "coordinates": "40.7128,-74.0060",
        "timezone": "America/New_York",
        "averagePrice": 15750,
        "confidence": 92,
        "sources": 3,
        "lastUpdate": "2025-01-20T10:00:00.000Z",
        "changePercent": 2.5,
        "weight": 15,
        "isActive": true,
        "prices": [
            {
                "source": "Real Estate API A",
                "price": 15800,
                "weight": 30,
                "confidence": 90,
                "lastUpdate": "2025-01-20T09:45:00.000Z"
            },
            {
                "source": "Market Data Provider B",
                "price": 15700,
                "weight": 35,
                "confidence": 95,
                "lastUpdate": "2025-01-20T09:50:00.000Z"
            },
            {
                "source": "Property Index C",
                "price": 15750,
                "weight": 35,
                "confidence": 88,
                "lastUpdate": "2025-01-20T09:55:00.000Z"
            }
        ],
        "statistics": {
            "min": 15700,
            "max": 15800,
            "standardDeviation": 50,
            "median": 15750
        }
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### City IDs
| ID | City | Country |
|----|------|---------|
| 1 | New York | US |
| 2 | London | UK |
| 3 | Tokyo | JP |
| 4 | Hong Kong | HK |
| 5 | Singapore | SG |
| 6 | Paris | FR |
| 7 | Sydney | AU |
| 8 | Toronto | CA |
| 9 | Seoul | KR |
| 10 | Zurich | CH |

#### Example
```bash
curl -X GET "http://localhost:3001/api/prices/city/1"
```

```python
# Python example
import requests

response = requests.get('http://localhost:3001/api/prices/city/1')
data = response.json()

if data['success']:
    city_data = data['data']
    print(f"City: {city_data['name']}")
    print(f"Price: ${city_data['averagePrice']}/sqm")
    print(f"Confidence: {city_data['confidence']}%")
```

---

### Get Global Index

Retrieve the current global price index value.

```http
GET /api/index/global
```

#### Response
```json
{
    "success": true,
    "data": {
        "globalIndex": 1050.25,
        "baseIndex": 1000,
        "timestamp": "2025-01-20T10:00:00.000Z",
        "citiesCount": 10,
        "changePercent": 5.025,
        "trend": "increasing",
        "calculation": {
            "method": "weighted_average",
            "weights": "equal",
            "lastCalculated": "2025-01-20T10:00:00.000Z"
        }
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### Example
```bash
curl -X GET "http://localhost:3001/api/index/global"
```

---

### Get Price History

Retrieve historical price data for analysis and trending.

```http
GET /api/prices/history
```

#### Query Parameters
- `limit` (integer, optional): Number of records to return (default: 30, max: 365)
- `cityId` (integer, optional): Filter by specific city (1-10)
- `days` (integer, optional): Number of days back from current date

#### Response
```json
{
    "success": true,
    "data": [
        {
            "timestamp": "2025-01-20T10:00:00.000Z",
            "globalIndex": 1050.25,
            "citiesCount": 10,
            "averageConfidence": 89.2,
            "cities": [
                {
                    "id": 1,
                    "name": "New York",
                    "price": 15750,
                    "confidence": 92
                }
                // ... additional cities if cityId not specified
            ]
        },
        {
            "timestamp": "2025-01-19T10:00:00.000Z",
            "globalIndex": 1048.75,
            "citiesCount": 10,
            "averageConfidence": 87.8
            // ...
        }
        // ... additional historical records
    ],
    "count": 30,
    "period": {
        "start": "2025-01-20T10:00:00.000Z",
        "end": "2024-12-21T10:00:00.000Z",
        "days": 30
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### Examples
```bash
# Get last 7 days of data
curl -X GET "http://localhost:3001/api/prices/history?limit=7"

# Get last 30 days for New York only
curl -X GET "http://localhost:3001/api/prices/history?limit=30&cityId=1"

# Get last 90 days of global data
curl -X GET "http://localhost:3001/api/prices/history?days=90"
```

---

### Get Cities List

Retrieve information about all tracked cities.

```http
GET /api/cities
```

#### Response
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "name": "New York",
            "country": "US",
            "coordinates": "40.7128,-74.0060",
            "timezone": "America/New_York",
            "weight": 15,
            "isActive": true,
            "basePriceUSD": 15000,
            "marketInfo": {
                "description": "Manhattan Premium Districts",
                "marketSize": "large",
                "liquidity": "high"
            }
        },
        {
            "id": 2,
            "name": "London",
            "country": "UK",
            "coordinates": "51.5074,-0.1278",
            "timezone": "Europe/London",
            "weight": 12,
            "isActive": true,
            "basePriceUSD": 12000,
            "marketInfo": {
                "description": "Central London Prime Areas",
                "marketSize": "large",
                "liquidity": "high"
            }
        }
        // ... additional cities
    ],
    "count": 10,
    "totalWeight": 100,
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### Example
```bash
curl -X GET "http://localhost:3001/api/cities"
```

---

### Manual Price Update

Trigger a manual price update (useful for testing and emergency updates).

```http
POST /api/update/prices
```

#### Request Body
```json
{
    "force": false,
    "cities": [1, 2, 3],
    "reason": "Manual update requested"
}
```

#### Parameters
- `force` (boolean, optional): Override minimum update interval
- `cities` (array, optional): Specific cities to update (default: all)
- `reason` (string, optional): Reason for manual update

#### Response
```json
{
    "success": true,
    "message": "Price update completed successfully",
    "data": {
        "timestamp": "2025-01-20T10:00:00.000Z",
        "citiesUpdated": 10,
        "citiesRequested": 10,
        "globalIndex": 1050.25,
        "updateDuration": 15.5,
        "errors": [],
        "warnings": [],
        "sources": {
            "successful": 3,
            "failed": 0,
            "total": 3
        }
    }
}
```

#### Example
```bash
curl -X POST "http://localhost:3001/api/update/prices" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Testing manual update"}'
```

---

### Get Server Statistics

Retrieve server performance and operational statistics.

```http
GET /api/stats
```

#### Response
```json
{
    "success": true,
    "data": {
        "server": {
            "uptime": 86400,
            "version": "1.0.0",
            "environment": "production",
            "nodeVersion": "18.19.0",
            "memory": {
                "used": 45.6,
                "total": 512,
                "percentage": 8.9
            },
            "cpu": {
                "usage": 15.2,
                "cores": 2
            }
        },
        "oracle": {
            "lastUpdate": "2025-01-20T10:00:00.000Z",
            "totalUpdates": 365,
            "successRate": 99.7,
            "averageUpdateTime": 12.5,
            "activeSources": 3,
            "dataFreshness": 0.5
        },
        "api": {
            "totalRequests": 125000,
            "requestsToday": 2500,
            "averageResponseTime": 150,
            "errorRate": 0.1,
            "popularEndpoints": [
                {
                    "endpoint": "/api/prices/latest",
                    "requests": 45000,
                    "percentage": 36
                },
                {
                    "endpoint": "/api/prices/city/*",
                    "requests": 35000,
                    "percentage": 28
                }
            ]
        },
        "data": {
            "citiesTracked": 10,
            "historicalRecords": 365,
            "averageConfidence": 89.2,
            "lastGlobalIndex": 1050.25,
            "priceVolatility": 2.8
        }
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### Example
```bash
curl -X GET "http://localhost:3001/api/stats"
```

---

## SDK Examples

### JavaScript/Node.js SDK

```javascript
class GPRETClient {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
    }
    
    async request(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`GPRET API Error: ${error.message}`);
        }
    }
    
    // Get latest prices for all cities
    async getLatestPrices() {
        return await this.request('/api/prices/latest');
    }
    
    // Get price for specific city
    async getCityPrice(cityId) {
        return await this.request(`/api/prices/city/${cityId}`);
    }
    
    // Get global price index
    async getGlobalIndex() {
        return await this.request('/api/index/global');
    }
    
    // Get price history
    async getPriceHistory(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.cityId) params.append('cityId', options.cityId);
        if (options.days) params.append('days', options.days);
        
        const query = params.toString();
        return await this.request(`/api/prices/history${query ? '?' + query : ''}`);
    }
    
    // Get all cities
    async getCities() {
        return await this.request('/api/cities');
    }
    
    // Check server health
    async getHealth() {
        return await this.request('/health');
    }
}

// Usage example
const gpret = new GPRETClient();

async function example() {
    try {
        // Get latest prices
        const latest = await gpret.getLatestPrices();
        console.log('Global Index:', latest.data.globalIndex);
        
        // Get New York prices
        const nyPrices = await gpret.getCityPrice(1);
        console.log('New York Price:', nyPrices.data.averagePrice);
        
        // Get price history
        const history = await gpret.getPriceHistory({ limit: 7 });
        console.log('7-day history:', history.data.length, 'records');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

example();
```

### Python SDK

```python
import requests
from typing import Optional, Dict, List
import json

class GPRETClient:
    def __init__(self, base_url: str = 'http://localhost:3001'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def _request(self, endpoint: str) -> Dict:
        """Make HTTP request to API endpoint"""
        try:
            response = self.session.get(f"{self.base_url}{endpoint}")
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"GPRET API Error: {str(e)}")
    
    def get_latest_prices(self) -> Dict:
        """Get latest prices for all cities"""
        return self._request('/api/prices/latest')
    
    def get_city_price(self, city_id: int) -> Dict:
        """Get price for specific city"""
        if not 1 <= city_id <= 10:
            raise ValueError("City ID must be between 1 and 10")
        return self._request(f'/api/prices/city/{city_id}')
    
    def get_global_index(self) -> Dict:
        """Get global price index"""
        return self._request('/api/index/global')
    
    def get_price_history(self, limit: Optional[int] = None, 
                         city_id: Optional[int] = None,
                         days: Optional[int] = None) -> Dict:
        """Get price history with optional filters"""
        params = []
        if limit:
            params.append(f"limit={limit}")
        if city_id:
            params.append(f"cityId={city_id}")
        if days:
            params.append(f"days={days}")
        
        endpoint = '/api/prices/history'
        if params:
            endpoint += '?' + '&'.join(params)
        
        return self._request(endpoint)
    
    def get_cities(self) -> Dict:
        """Get all tracked cities"""
        return self._request('/api/cities')
    
    def get_health(self) -> Dict:
        """Check server health"""
        return self._request('/health')

# Usage example
if __name__ == "__main__":
    gpret = GPRETClient()
    
    try:
        # Get latest prices
        latest = gpret.get_latest_prices()
        print(f"Global Index: {latest['data']['globalIndex']}")
        
        # Get specific city
        ny_data = gpret.get_city_price(1)
        print(f"New York Price: ${ny_data['data']['averagePrice']}/sqm")
        
        # Get price history
        history = gpret.get_price_history(limit=30)
        print(f"Historical records: {len(history['data'])}")
        
        # List all cities
        cities = gpret.get_cities()
        for city in cities['data']:
            print(f"{city['name']}: {city['country']}")
            
    except Exception as e:
        print(f"Error: {e}")
```

### React Hook

```javascript
import { useState, useEffect, useCallback } from 'react';

// Custom hook for GPRET API data
export function useGPRETData() {
    const [data, setData] = useState({
        latest: null,
        globalIndex: null,
        cities: null,
        loading: true,
        error: null
    });
    
    const [refreshKey, setRefreshKey] = useState(0);
    
    const baseURL = process.env.REACT_APP_GPRET_API_URL || 'http://localhost:3001';
    
    const fetchData = useCallback(async () => {
        try {
            setData(prev => ({ ...prev, loading: true, error: null }));
            
            // Fetch multiple endpoints in parallel
            const [latestRes, indexRes, citiesRes] = await Promise.all([
                fetch(`${baseURL}/api/prices/latest`),
                fetch(`${baseURL}/api/index/global`),
                fetch(`${baseURL}/api/cities`)
            ]);
            
            const [latest, globalIndex, cities] = await Promise.all([
                latestRes.json(),
                indexRes.json(),
                citiesRes.json()
            ]);
            
            setData({
                latest: latest.success ? latest.data : null,
                globalIndex: globalIndex.success ? globalIndex.data : null,
                cities: cities.success ? cities.data : null,
                loading: false,
                error: null
            });
            
        } catch (error) {
            setData(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }));
        }
    }, [baseURL, refreshKey]);
    
    const refresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    
    useEffect(() => {
        fetchData();
        
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        
        return () => clearInterval(interval);
    }, [fetchData]);
    
    return { ...data, refresh };
}

// Usage in component
function GPRETDashboard() {
    const { latest, globalIndex, cities, loading, error, refresh } = useGPRETData();
    
    if (loading) return <div>Loading GPRET data...</div>;
    if (error) return <div>Error: {error}</div>;
    
    return (
        <div>
            <h1>GPRET Real Estate Index</h1>
            
            {globalIndex && (
                <div>
                    <h2>Global Index: {globalIndex.globalIndex.toFixed(2)}</h2>
                    <p>Change: {globalIndex.changePercent > 0 ? '+' : ''}{globalIndex.changePercent}%</p>
                </div>
            )}
            
            {latest && (
                <div>
                    <h3>City Prices</h3>
                    {latest.cities.map(city => (
                        <div key={city.id}>
                            <strong>{city.name}</strong>: ${city.averagePrice.toLocaleString()}/sqm
                            <span style={{ color: city.changePercent > 0 ? 'green' : 'red' }}>
                                ({city.changePercent > 0 ? '+' : ''}{city.changePercent}%)
                            </span>
                        </div>
                    ))}
                </div>
            )}
            
            <button onClick={refresh}>Refresh Data</button>
        </div>
    );
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Invalid City ID
```json
{
    "success": false,
    "error": "City not found",
    "code": "CITY_NOT_FOUND",
    "details": {
        "cityId": 15,
        "validRange": "1-10"
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### 2. Rate Limit Exceeded
```json
{
    "success": false,
    "error": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
        "limit": 100,
        "window": "1 hour",
        "resetTime": "2025-01-20T11:00:00.000Z"
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

#### 3. Service Unavailable
```json
{
    "success": false,
    "error": "Oracle system temporarily unavailable",
    "code": "ORACLE_UNAVAILABLE",
    "details": {
        "estimatedRecovery": "2025-01-20T10:15:00.000Z",
        "lastSuccessfulUpdate": "2025-01-20T09:00:00.000Z"
    },
    "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### Error Handling Best Practices

```javascript
// JavaScript error handling example
async function safeAPICall() {
    try {
        const response = await fetch('/api/prices/latest');
        
        if (!response.ok) {
            // Handle HTTP errors
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error} (${errorData.code})`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            // Handle API-level errors
            throw new Error(`Request failed: ${data.error}`);
        }
        
        return data.data;
        
    } catch (error) {
        if (error.name === 'TypeError') {
            // Network error
            console.error('Network error:', error.message);
            throw new Error('Unable to connect to GPRET API');
        } else {
            // API or other error
            console.error('API error:', error.message);
            throw error;
        }
    }
}
```

---

## WebSocket API (Coming Soon)

Real-time price updates via WebSocket connection.

### Connection
```javascript
const ws = new WebSocket('wss://api.gpret.org/ws');

ws.onopen = function() {
    console.log('Connected to GPRET WebSocket');
    
    // Subscribe to price updates
    ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['prices', 'global-index']
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    switch(data.type) {
        case 'price-update':
            console.log('Price update:', data.city, data.newPrice);
            break;
        case 'index-update':
            console.log('Global index:', data.newIndex);
            break;
    }
};
```

---

## API Changelog

### Version 1.0.0 (January 2025)
- Initial API release
- Core endpoints for price data
- City-specific data retrieval
- Historical data access
- Manual update functionality
- Server statistics endpoint

### Planned Features
- **Version 1.1.0** (Q2 2025)
  - WebSocket real-time updates
  - Enhanced filtering options
  - Data export formats (CSV, JSON)
  - Webhook notifications

- **Version 1.2.0** (Q3 2025)
  - GraphQL endpoint
  - Advanced analytics endpoints
  - Custom time range queries
  - Price prediction endpoints (experimental)

---

## Community and Support

### Documentation
- **API Documentation**: This document
- **Technical Specs**: `/docs/technical-specs.md`
- **Whitepaper**: `/docs/whitepaper.md`

### Community Channels
- **Discord**: [Community Server] (Coming Soon)
- **GitHub**: [Repository Issues](https://github.com/[USERNAME]/gpret-token/issues)
- **Email**: community@gpret.org (Coming Soon)

### Reporting Issues
1. Check existing GitHub issues
2. Provide detailed error information
3. Include request/response examples
4. Specify API version and environment

### Contributing
- API improvements welcome via GitHub PRs
- Documentation updates appreciated
- Bug reports help improve reliability
- Feature requests considered by community vote

---

## Terms of Use

### Free Usage
- All API endpoints are completely free
- No registration or API keys required
- Unlimited usage within rate limits
- Commercial usage permitted

### Data Accuracy Disclaimer
- Data provided for informational purposes only
- Multiple sources used but accuracy not guaranteed
- Not suitable for financial trading decisions
- Community-driven data validation

### Zero Revenue Guarantee
- No charges, fees, or subscriptions
- No premium tiers or paid features
- Completely free and open access
- Maintained by community contributions

### Fair Use Policy
- Respect rate limits
- No attempt to overwhelm servers
- Cache responses when possible
- Report abuse to maintain service quality

---

**API Version**: 1.0.0  
**Last Updated**: January 2025  
**Support**: GitHub Issues

**Remember**: GPRET API is completely free and will always remain free. This aligns with our zero-revenue philosophy and commitment to open, accessible real estate data for everyone.