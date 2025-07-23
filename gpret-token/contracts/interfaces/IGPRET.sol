// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IGPRET
 * @dev Interface for GPRET (Global Prime Real Estate Token)
 */
interface IGPRET is IERC20 {
    
    // ============ Events ============
    
    event PriceIndexUpdated(uint256 indexed newIndex, uint256 timestamp);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event CityAdded(uint256 indexed cityId, string name, uint256 weight);
    event CityUpdated(uint256 indexed cityId, uint256 newPriceIndex);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    
    // ============ Oracle Functions ============
    
    /**
     * @dev Updates the real estate price index
     * @param newIndex New price index value
     */
    function updatePriceIndex(uint256 newIndex) external;
    
    /**
     * @dev Updates individual city price data
     * @param cityId ID of the city to update
     * @param newPriceIndex New price index for the city
     */
    function updateCityPrice(uint256 cityId, uint256 newPriceIndex) external;
    
    /**
     * @dev Sets the oracle address
     * @param newOracle New oracle address
     */
    function setOracle(address newOracle) external;
    
    // ============ Governance Functions ============
    
    /**
     * @dev Creates a new governance proposal
     * @param description Description of the proposal
     * @param votingPeriod Voting period in seconds
     * @return Proposal ID
     */
    function createProposal(string memory description, uint256 votingPeriod) external returns (uint256);
    
    /**
     * @dev Casts a vote on a proposal
     * @param proposalId ID of the proposal
     * @param support True for "for", false for "against"
     */
    function vote(uint256 proposalId, bool support) external;
    
    // ============ View Functions ============
    
    /**
     * @dev Returns current price index and last update time
     * @return index Current price index
     * @return lastUpdate Last update timestamp
     */
    function getPriceInfo() external view returns (uint256 index, uint256 lastUpdate);
    
    /**
     * @dev Returns city information
     * @param cityId ID of the city
     * @return name City name
     * @return priceIndex Current price index
     * @return weight Weight in overall calculation
     * @return isActive Whether city is active
     */
    function getCityInfo(uint256 cityId) external view returns (
        string memory name,
        uint256 priceIndex,
        uint256 weight,
        bool isActive
    );
    
    /**
     * @dev Returns all active city IDs
     * @return Array of active city IDs
     */
    function getActiveCities() external view returns (uint256[] memory);
    
    /**
     * @dev Returns proposal information
     * @param proposalId ID of the proposal
     * @return description Proposal description
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return startTime Voting start time
     * @return endTime Voting end time
     * @return executed Whether proposal was executed
     * @return proposer Address of proposer
     */
    function getProposal(uint256 proposalId) external view returns (
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        address proposer
    );
    
    // ============ Admin Functions ============
    
    /**
     * @dev Adds a new city for tracking
     * @param cityId Unique city identifier
     * @param name City name
     * @param weight Weight in the overall index
     */
    function addCity(uint256 cityId, string memory name, uint256 weight) external;
    
    /**
     * @dev Pauses the contract
     */
    function pause() external;
    
    /**
     * @dev Unpauses the contract
     */
    function unpause() external;
    
    // ============ Constants ============
    
    /**
     * @dev Returns total supply constant
     */
    function TOTAL_SUPPLY() external view returns (uint256);
    
    /**
     * @dev Returns minimum update interval
     */
    function MIN_UPDATE_INTERVAL() external view returns (uint256);
    
    /**
     * @dev Returns current real estate price index
     */
    function realEstatePriceIndex() external view returns (uint256);
    
    /**
     * @dev Returns last price update timestamp
     */
    function lastPriceUpdate() external view returns (uint256);
    
    /**
     * @dev Returns oracle address
     */
    function priceOracle() external view returns (address);
    
    /**
     * @dev Returns proposal counter
     */
    function proposalCounter() external view returns (uint256);
    
    // ============ Zero Revenue Confirmation ============
    
    /**
     * @dev Confirms zero revenue structure
     * @return Confirmation message
     */
    function confirmZeroRevenue() external pure returns (string memory);
}