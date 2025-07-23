// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGPRETOracle Interface
 * @dev Interface for GPRET Oracle system (future expansion)
 */
interface IGPRETOracle {
    
    // Data Structures
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        string source;
        bool isValid;
    }
    
    struct CityData {
        string name;
        uint256 priceIndex;
        uint256 weight;
        bool isActive;
        uint256 lastUpdated;
    }
    
    // Core Oracle Functions
    function updatePrice(uint256 _cityId, uint256 _newPrice) external;
    function updateMultiplePrices(uint256[] memory _cityIds, uint256[] memory _prices) external;
    function validatePriceData(uint256 _cityId, uint256 _price) external view returns (bool);
    
    // Data Retrieval
    function getLatestPrice(uint256 _cityId) external view returns (PriceData memory);
    function getPriceHistory(uint256 _cityId, uint256 _fromTime, uint256 _toTime) 
        external view returns (PriceData[] memory);
    function getGlobalIndex() external view returns (uint256);
    
    // Configuration
    function addDataSource(string memory _sourceName, string memory _endpoint) external;
    function removeDataSource(string memory _sourceName) external;
    function updateCityWeight(uint256 _cityId, uint256 _newWeight) external;
    
    // Validation
    function isAuthorizedUpdater(address _updater) external view returns (bool);
    function getDataSources() external view returns (string[] memory);
    function getUpdateFrequency() external view returns (uint256);
    
    // Admin Functions
    function setAuthorizedUpdater(address _updater, bool _authorized) external;
    function setUpdateFrequency(uint256 _frequency) external;
    function pause() external;
    function unpause() external;
}