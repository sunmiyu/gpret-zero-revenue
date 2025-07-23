// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGPRETOracle
 * @dev Interface for GPRET Price Oracle System
 */
interface IGPRETOracle {
    
    // ============ Structs ============
    
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;
        string source;
    }
    
    struct CityPriceInfo {
        uint256 cityId;
        string cityName;
        uint256 currentPrice;
        uint256 lastUpdate;
        uint256 changePercent;
        bool isActive;
    }
    
    // ============ Events ============
    
    event PriceUpdated(
        uint256 indexed cityId,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timestamp,
        string source
    );
    
    event GlobalIndexUpdated(
        uint256 oldIndex,
        uint256 newIndex,
        uint256 timestamp
    );
    
    event OracleAuthorized(address indexed oracle, bool authorized);
    
    event DataSourceAdded(
        uint256 indexed sourceId,
        string name,
        string endpoint,
        uint256 weight
    );
    
    event DataSourceUpdated(
        uint256 indexed sourceId,
        bool isActive,
        uint256 newWeight
    );
    
    event PriceValidationFailed(
        uint256 indexed cityId,
        uint256 submittedPrice,
        uint256 expectedRange,
        string reason
    );
    
    // ============ Oracle Functions ============
    
    /**
     * @dev Updates price for a specific city
     * @param cityId ID of the city
     * @param newPrice New price value
     * @param confidence Confidence level (0-100)
     * @param source Data source identifier
     */
    function updateCityPrice(
        uint256 cityId,
        uint256 newPrice,
        uint256 confidence,
        string memory source
    ) external;
    
    /**
     * @dev Updates multiple city prices in batch
     * @param cityIds Array of city IDs
     * @param prices Array of new prices
     * @param confidences Array of confidence levels
     * @param source Data source identifier
     */
    function updateMultiplePrices(
        uint256[] memory cityIds,
        uint256[] memory prices,
        uint256[] memory confidences,
        string memory source
    ) external;
    
    /**
     * @dev Calculates and updates the global price index
     */
    function updateGlobalIndex() external;
    
    // ============ Admin Functions ============
    
    /**
     * @dev Authorizes or deauthorizes an oracle address
     * @param oracle Oracle address
     * @param authorized Whether to authorize
     */
    function setOracleAuthorization(address oracle, bool authorized) external;
    
    /**
     * @dev Adds a new data source
     * @param name Data source name
     * @param endpoint API endpoint
     * @param weight Weight in price calculation
     * @return sourceId ID of the new data source
     */
    function addDataSource(
        string memory name,
        string memory endpoint,
        uint256 weight
    ) external returns (uint256 sourceId);
    
    /**
     * @dev Updates data source configuration
     * @param sourceId ID of the data source
     * @param isActive Whether source is active
     * @param newWeight New weight for the source
     */
    function updateDataSource(
        uint256 sourceId,
        bool isActive,
        uint256 newWeight
    ) external;
    
    /**
     * @dev Sets price validation parameters
     * @param cityId City ID
     * @param minPrice Minimum acceptable price
     * @param maxPrice Maximum acceptable price
     * @param maxChangePercent Maximum change percentage per update
     */
    function setPriceValidation(
        uint256 cityId,
        uint256 minPrice,
        uint256 maxPrice,
        uint256 maxChangePercent
    ) external;
    
    // ============ View Functions ============
    
    /**
     * @dev Returns current price for a city
     * @param cityId ID of the city
     * @return price Current price
     * @return lastUpdate Last update timestamp
     * @return confidence Confidence level
     */
    function getCityPrice(uint256 cityId) external view returns (
        uint256 price,
        uint256 lastUpdate,
        uint256 confidence
    );
    
    /**
     * @dev Returns detailed city price information
     * @param cityId ID of the city
     * @return CityPriceInfo struct with detailed information
     */
    function getCityPriceInfo(uint256 cityId) external view returns (CityPriceInfo memory);
    
    /**
     * @dev Returns price history for a city
     * @param cityId ID of the city
     * @param limit Maximum number of records to return
     * @return Array of PriceData structs
     */
    function getPriceHistory(uint256 cityId, uint256 limit) external view returns (PriceData[] memory);
    
    /**
     * @dev Returns current global price index
     * @return index Current global index
     * @return lastUpdate Last update timestamp
     */
    function getGlobalIndex() external view returns (uint256 index, uint256 lastUpdate);
    
    /**
     * @dev Returns all active city prices
     * @return cityIds Array of city IDs
     * @return prices Array of current prices
     * @return lastUpdates Array of last update timestamps
     */
    function getAllCityPrices() external view returns (
        uint256[] memory cityIds,
        uint256[] memory prices,
        uint256[] memory lastUpdates
    );
    
    /**
     * @dev Returns data source information
     * @param sourceId ID of the data source
     * @return name Source name
     * @return endpoint API endpoint
     * @return weight Weight in calculation
     * @return isActive Whether source is active
     * @return lastUsed Last time source was used
     */
    function getDataSource(uint256 sourceId) external view returns (
        string memory name,
        string memory endpoint,
        uint256 weight,
        bool isActive,
        uint256 lastUsed
    );
    
    /**
     * @dev Returns all authorized oracle addresses
     * @return Array of authorized oracle addresses
     */
    function getAuthorizedOracles() external view returns (address[] memory);
    
    /**
     * @dev Checks if an address is an authorized oracle
     * @param oracle Address to check
     * @return Whether the address is authorized
     */
    function isAuthorizedOracle(address oracle) external view returns (bool);
    
    /**
     * @dev Returns oracle statistics
     * @return totalUpdates Total number of price updates
     * @return totalSources Number of data sources
     * @return averageConfidence Average confidence level
     * @return lastGlobalUpdate Last global index update
     */
    function getOracleStats() external view returns (
        uint256 totalUpdates,
        uint256 totalSources,
        uint256 averageConfidence,
        uint256 lastGlobalUpdate
    );
    
    // ============ Constants ============
    
    /**
     * @dev Returns minimum update interval
     */
    function MIN_UPDATE_INTERVAL() external view returns (uint256);
    
    /**
     * @dev Returns maximum price change percentage
     */
    function MAX_PRICE_CHANGE_PERCENT() external view returns (uint256);
    
    /**
     * @dev Returns minimum confidence level
     */
    function MIN_CONFIDENCE_LEVEL() external view returns (uint256);
    
    /**
     * @dev Returns price precision (decimals)
     */
    function PRICE_PRECISION() external view returns (uint256);
}