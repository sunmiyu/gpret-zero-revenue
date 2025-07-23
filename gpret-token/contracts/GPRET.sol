// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IGPRET.sol";

/**
 * @title GPRET (Global Prime Real Estate Token)
 * @dev Zero Revenue DeFi token tracking global real estate prices
 * @notice This contract implements a zero-profit structure for educational purposes
 */
contract GPRET is ERC20, ERC20Burnable, Pausable, Ownable, ReentrancyGuard, IGPRET {

     // Events - 이 부분을 추가해야 합니다!
    event PriceIndexUpdated(uint256 indexed newIndex, uint256 timestamp);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event CityAdded(uint256 indexed cityId, string name, uint256 weight);
    event CityUpdated(uint256 indexed cityId, uint256 newPriceIndex);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    
    // Constants
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant PROPOSAL_THRESHOLD = 1000 * 10**18; // 1000 tokens to create proposal
    uint256 public constant MIN_VOTING_DELAY = 1 days;
    
    // State variables
    mapping(uint256 => City) public cities;
    uint256 public cityCount;
    uint256 public globalPriceIndex;
    address public oracleAddress;
    uint256 public lastUpdateTimestamp;
    
    // Governance
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public votingWeight;
    uint256 public proposalCount;
    
    // Zero Revenue Validation
    mapping(string => bool) public zeroRevenueValidation;
    
    // Structs
    struct City {
        string name;
        uint256 priceIndex;
        uint256 weight;
        bool isActive;
        uint256 lastUpdated;
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool passed;
        mapping(address => bool) hasVoted;
    }
    
    // Constructor with initialOwner for OpenZeppelin v5
    constructor(address initialOwner) 
        ERC20("Global Prime Real Estate Token", "GPRET") 
        Ownable(initialOwner)
    {
        _mint(initialOwner, TOTAL_SUPPLY);
        
        // Initialize zero revenue validation
        zeroRevenueValidation["NO_FEES"] = true;
        zeroRevenueValidation["NO_PROFITS"] = true;
        zeroRevenueValidation["NO_REWARDS"] = true;
        zeroRevenueValidation["EDUCATIONAL_PURPOSE"] = true;
        
        // Initialize with 10 major global cities
        _initializeCities();
        
        globalPriceIndex = 1000000; // Base index: 1,000,000
        lastUpdateTimestamp = block.timestamp;
    }
    
    // Initialize cities with weights
    function _initializeCities() private {
        _addCity("New York", 200000); // 20% weight
        _addCity("London", 150000);   // 15% weight
        _addCity("Tokyo", 120000);    // 12% weight
        _addCity("Hong Kong", 100000); // 10% weight
        _addCity("Singapore", 80000);  // 8% weight
        _addCity("Sydney", 80000);     // 8% weight
        _addCity("Toronto", 70000);    // 7% weight
        _addCity("Dubai", 70000);      // 7% weight
        _addCity("Paris", 70000);      // 7% weight
        _addCity("Frankfurt", 60000);  // 6% weight
    }
    
    function _addCity(string memory _name, uint256 _weight) private {
        cities[cityCount] = City({
            name: _name,
            priceIndex: 1000000, // Base index
            weight: _weight,
            isActive: true,
            lastUpdated: block.timestamp
        });
        
        emit CityAdded(cityCount, _name, _weight);
        cityCount++;
    }
    
    // Oracle Functions
    function setOracleAddress(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle address");
        address oldOracle = oracleAddress;
        oracleAddress = _oracle;
        emit OracleUpdated(oldOracle, _oracle);
    }
    
    function updateCityPrice(uint256 _cityId, uint256 _newPriceIndex) 
        external 
        nonReentrant 
    {
        require(msg.sender == oracleAddress, "Only oracle can update prices");
        require(_cityId < cityCount, "Invalid city ID");
        require(cities[_cityId].isActive, "City not active");
        require(_newPriceIndex > 0, "Invalid price index");
        
        cities[_cityId].priceIndex = _newPriceIndex;
        cities[_cityId].lastUpdated = block.timestamp;
        
        _updateGlobalIndex();
        
        emit CityUpdated(_cityId, _newPriceIndex);
    }
    
    function _updateGlobalIndex() private {
        uint256 newIndex = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < cityCount; i++) {
            if (cities[i].isActive) {
                newIndex += cities[i].priceIndex * cities[i].weight;
                totalWeight += cities[i].weight;
            }
        }
        
        if (totalWeight > 0) {
            globalPriceIndex = newIndex / totalWeight;
            lastUpdateTimestamp = block.timestamp;
            emit PriceIndexUpdated(globalPriceIndex, block.timestamp);
        }
    }
    
    // Governance Functions
    function createProposal(string memory _description) 
        external 
        returns (uint256) 
    {
        require(balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Insufficient tokens");
        require(bytes(_description).length > 0, "Empty description");
        
        uint256 proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];
        
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = _description;
        proposal.startTime = block.timestamp + MIN_VOTING_DELAY;
        proposal.endTime = proposal.startTime + VOTING_PERIOD;
        proposal.executed = false;
        proposal.passed = false;
        
        emit ProposalCreated(proposalId, msg.sender, _description);
        return proposalId;
    }
    
    function vote(uint256 _proposalId, bool _support) external {
        require(_proposalId < proposalCount, "Invalid proposal");
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        require(!proposal.executed, "Proposal executed");
        
        uint256 weight = balanceOf(msg.sender);
        require(weight > 0, "No voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (_support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }
        
        emit VoteCast(_proposalId, msg.sender, _support, weight);
    }
    
    function executeProposal(uint256 _proposalId) external {
        require(_proposalId < proposalCount, "Invalid proposal");
        Proposal storage proposal = proposals[_proposalId];
        
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        
        proposal.executed = true;
        proposal.passed = proposal.forVotes > proposal.againstVotes;
        
        emit ProposalExecuted(_proposalId);
    }
    
    // View Functions
    function getCityInfo(uint256 _cityId) 
        external 
        view 
        returns (string memory name, uint256 priceIndex, uint256 weight, bool isActive, uint256 lastUpdated) 
    {
        require(_cityId < cityCount, "Invalid city ID");
        City storage city = cities[_cityId];
        return (city.name, city.priceIndex, city.weight, city.isActive, city.lastUpdated);
    }
    
    function getProposalInfo(uint256 _proposalId) 
        external 
        view 
        returns (
            address proposer,
            string memory description,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool passed
        ) 
    {
        require(_proposalId < proposalCount, "Invalid proposal");
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.proposer,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.passed
        );
    }
    
    function getAllCities() external view returns (
        string[] memory names,
        uint256[] memory priceIndices,
        uint256[] memory weights,
        bool[] memory activeStates
    ) {
        names = new string[](cityCount);
        priceIndices = new uint256[](cityCount);
        weights = new uint256[](cityCount);
        activeStates = new bool[](cityCount);
        
        for (uint256 i = 0; i < cityCount; i++) {
            names[i] = cities[i].name;
            priceIndices[i] = cities[i].priceIndex;
            weights[i] = cities[i].weight;
            activeStates[i] = cities[i].isActive;
        }
    }
    
    // Zero Revenue Validation Functions
    function validateZeroRevenue() external view returns (bool) {
        return zeroRevenueValidation["NO_FEES"] && 
               zeroRevenueValidation["NO_PROFITS"] && 
               zeroRevenueValidation["NO_REWARDS"] && 
               zeroRevenueValidation["EDUCATIONAL_PURPOSE"];
    }
    
    function getRevenueStructure() external pure returns (string memory) {
        return "ZERO_REVENUE: No fees, no profits, no rewards. Educational purpose only.";
    }
    
    function calculateTransactionFee(uint256) external pure returns (uint256) {
        return 0; // Always zero fees
    }
    
    function getProtocolRevenue() external pure returns (uint256) {
        return 0; // Always zero protocol revenue
    }
    
    // Admin Functions (Emergency only)
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function updateCityWeight(uint256 _cityId, uint256 _newWeight) 
        external 
        onlyOwner 
    {
        require(_cityId < cityCount, "Invalid city ID");
        require(_newWeight > 0, "Invalid weight");
        
        cities[_cityId].weight = _newWeight;
        _updateGlobalIndex();
    }
    
    function toggleCityStatus(uint256 _cityId) external onlyOwner {
        require(_cityId < cityCount, "Invalid city ID");
        cities[_cityId].isActive = !cities[_cityId].isActive;
        _updateGlobalIndex();
    }
    
    // Override required functions for OpenZeppelin v5
    function _update(address from, address to, uint256 value)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, value);
    }
}