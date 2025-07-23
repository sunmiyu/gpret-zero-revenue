// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IGPRET.sol";

/**
 * @title GPRET (Global Prime Real Estate Token)
 * @dev Zero Revenue ERC20 Token for Real Estate Price Tracking
 * 
 * Key Features:
 * - Tracks global prime real estate prices
 * - Zero revenue model (no fees, no profits)
 * - Community governance
 * - Educational/demonstration purpose only
 * 
 * IMPORTANT: This token generates ZERO revenue and has no profit mechanism.
 * It is purely for educational and community purposes.
 */
contract GPRET is ERC20, ERC20Burnable, Pausable, Ownable, ReentrancyGuard, IGPRET {
    
    // ============ State Variables ============
    
    /// @dev Total supply is fixed at 1 billion tokens
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    
    /// @dev Real estate price index (scaled by 1e18)
    uint256 public realEstatePriceIndex;
    
    /// @dev Last update timestamp
    uint256 public lastPriceUpdate;
    
    /// @dev Minimum time between price updates (24 hours)
    uint256 public constant MIN_UPDATE_INTERVAL = 24 hours;
    
    /// @dev Oracle address authorized to update prices
    address public priceOracle;
    
    /// @dev Governance proposal counter
    uint256 public proposalCounter;
    
    /// @dev City data structure
    struct CityData {
        string name;
        uint256 priceIndex;
        uint256 weight;
        bool isActive;
    }
    
    /// @dev Governance proposal structure
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        address proposer;
    }
    
    /// @dev Mapping of city ID to city data
    mapping(uint256 => CityData) public cities;
    
    /// @dev Array of active city IDs
    uint256[] public activeCityIds;
    
    /// @dev Mapping of proposal ID to proposal data
    mapping(uint256 => Proposal) public proposals;
    
    /// @dev Mapping of user votes on proposals
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteChoice; // true = for, false = against
    
    // ============ Events ============
    
    event PriceIndexUpdated(uint256 indexed newIndex, uint256 timestamp);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event CityAdded(uint256 indexed cityId, string name, uint256 weight);
    event CityUpdated(uint256 indexed cityId, uint256 newPriceIndex);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    
    // ============ Modifiers ============
    
    modifier onlyOracle() {
        require(msg.sender == priceOracle, "GPRET: Only oracle can call");
        _;
    }
    
    modifier validProposal(uint256 proposalId) {
        require(proposalId <= proposalCounter, "GPRET: Invalid proposal ID");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() ERC20("Global Prime Real Estate Token", "GPRET") {
        // Mint total supply to deployer
        _mint(msg.sender, TOTAL_SUPPLY);
        
        // Initialize with current timestamp
        lastPriceUpdate = block.timestamp;
        realEstatePriceIndex = 1000 * 10**18; // Start at index 1000
        
        // Initialize default cities
        _initializeCities();
        
        emit PriceIndexUpdated(realEstatePriceIndex, block.timestamp);
    }
    
    // ============ Oracle Functions ============
    
    /**
     * @dev Updates the real estate price index
     * @param newIndex New price index value
     */
    function updatePriceIndex(uint256 newIndex) external onlyOracle nonReentrant {
        require(
            block.timestamp >= lastPriceUpdate + MIN_UPDATE_INTERVAL,
            "GPRET: Update too frequent"
        );
        require(newIndex > 0, "GPRET: Invalid price index");
        
        realEstatePriceIndex = newIndex;
        lastPriceUpdate = block.timestamp;
        
        emit PriceIndexUpdated(newIndex, block.timestamp);
    }
    
    /**
     * @dev Updates individual city price data
     * @param cityId ID of the city to update
     * @param newPriceIndex New price index for the city
     */
    function updateCityPrice(uint256 cityId, uint256 newPriceIndex) 
        external 
        onlyOracle 
        nonReentrant 
    {
        require(cities[cityId].isActive, "GPRET: City not active");
        require(newPriceIndex > 0, "GPRET: Invalid price index");
        
        cities[cityId].priceIndex = newPriceIndex;
        
        emit CityUpdated(cityId, newPriceIndex);
    }
    
    /**
     * @dev Sets the oracle address
     * @param newOracle New oracle address
     */
    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "GPRET: Invalid oracle address");
        
        address oldOracle = priceOracle;
        priceOracle = newOracle;
        
        emit OracleUpdated(oldOracle, newOracle);
    }
    
    // ============ Governance Functions ============
    
    /**
     * @dev Creates a new governance proposal
     * @param description Description of the proposal
     * @param votingPeriod Voting period in seconds
     */
    function createProposal(string memory description, uint256 votingPeriod) 
        external 
        returns (uint256) 
    {
        require(balanceOf(msg.sender) >= TOTAL_SUPPLY / 1000, "GPRET: Insufficient tokens"); // 0.1% minimum
        require(bytes(description).length > 0, "GPRET: Empty description");
        require(votingPeriod >= 1 days && votingPeriod <= 30 days, "GPRET: Invalid voting period");
        
        proposalCounter++;
        
        proposals[proposalCounter] = Proposal({
            id: proposalCounter,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executed: false,
            proposer: msg.sender
        });
        
        emit ProposalCreated(proposalCounter, msg.sender, description);
        
        return proposalCounter;
    }
    
    /**
     * @dev Casts a vote on a proposal
     * @param proposalId ID of the proposal
     * @param support True for "for", false for "against"
     */
    function vote(uint256 proposalId, bool support) 
        external 
        validProposal(proposalId) 
        nonReentrant 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.startTime, "GPRET: Voting not started");
        require(block.timestamp <= proposal.endTime, "GPRET: Voting ended");
        require(!hasVoted[proposalId][msg.sender], "GPRET: Already voted");
        
        uint256 voterBalance = balanceOf(msg.sender);
        require(voterBalance > 0, "GPRET: No voting power");
        
        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = support;
        
        if (support) {
            proposal.forVotes += voterBalance;
        } else {
            proposal.againstVotes += voterBalance;
        }
        
        emit VoteCast(proposalId, msg.sender, support, voterBalance);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Returns current price index and last update time
     */
    function getPriceInfo() external view returns (uint256 index, uint256 lastUpdate) {
        return (realEstatePriceIndex, lastPriceUpdate);
    }
    
    /**
     * @dev Returns city information
     * @param cityId ID of the city
     */
    function getCityInfo(uint256 cityId) 
        external 
        view 
        returns (string memory name, uint256 priceIndex, uint256 weight, bool isActive) 
    {
        CityData memory city = cities[cityId];
        return (city.name, city.priceIndex, city.weight, city.isActive);
    }
    
    /**
     * @dev Returns all active city IDs
     */
    function getActiveCities() external view returns (uint256[] memory) {
        return activeCityIds;
    }
    
    /**
     * @dev Returns proposal information
     * @param proposalId ID of the proposal
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        validProposal(proposalId)
        returns (
            string memory description,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            address proposer
        ) 
    {
        Proposal memory proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.proposer
        );
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Pauses the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpauses the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Adds a new city for tracking
     * @param cityId Unique city identifier
     * @param name City name
     * @param weight Weight in the overall index
     */
    function addCity(uint256 cityId, string memory name, uint256 weight) 
        external 
        onlyOwner 
    {
        require(!cities[cityId].isActive, "GPRET: City already exists");
        require(bytes(name).length > 0, "GPRET: Empty city name");
        require(weight > 0, "GPRET: Invalid weight");
        
        cities[cityId] = CityData({
            name: name,
            priceIndex: 1000 * 10**18, // Default starting index
            weight: weight,
            isActive: true
        });
        
        activeCityIds.push(cityId);
        
        emit CityAdded(cityId, name, weight);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Initializes default cities
     */
    function _initializeCities() internal {
        // Initialize 10 major cities with equal weight
        string[10] memory cityNames = [
            "New York", "London", "Tokyo", "Hong Kong", "Singapore",
            "Paris", "Sydney", "Toronto", "Seoul", "Zurich"
        ];
        
        for (uint256 i = 0; i < 10; i++) {
            cities[i + 1] = CityData({
                name: cityNames[i],
                priceIndex: 1000 * 10**18,
                weight: 10, // Equal weight of 10%
                isActive: true
            });
            activeCityIds.push(i + 1);
            
            emit CityAdded(i + 1, cityNames[i], 10);
        }
    }
    
    /**
     * @dev Override required by Solidity
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
    
    // ============ Zero Revenue Guarantee ============
    
    /**
     * @dev This function exists solely to make it explicit that this contract
     * generates zero revenue and has no profit mechanism
     */
    function confirmZeroRevenue() external pure returns (string memory) {
        return "This contract generates ZERO revenue and distributes NO profits. Educational purpose only.";
    }
}