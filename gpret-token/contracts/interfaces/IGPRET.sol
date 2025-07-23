// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGPRET Interface
 * @dev Interface for GPRET token contract
 */
interface IGPRET {
    
    // View Functions
    function TOTAL_SUPPLY() external view returns (uint256);
    function VOTING_PERIOD() external view returns (uint256);
    function PROPOSAL_THRESHOLD() external view returns (uint256);
    function MIN_VOTING_DELAY() external view returns (uint256);
    
    function cityCount() external view returns (uint256);
    function globalPriceIndex() external view returns (uint256);
    function oracleAddress() external view returns (address);
    function lastUpdateTimestamp() external view returns (uint256);
    function proposalCount() external view returns (uint256);
    
    // Oracle Functions
    function setOracleAddress(address _oracle) external;
    function updateCityPrice(uint256 _cityId, uint256 _newPriceIndex) external;
    
    // Governance Functions
    function createProposal(string memory _description) external returns (uint256);
    function vote(uint256 _proposalId, bool _support) external;
    function executeProposal(uint256 _proposalId) external;
    
    // View Functions
    function getCityInfo(uint256 _cityId) 
        external 
        view 
        returns (
            string memory name, 
            uint256 priceIndex, 
            uint256 weight, 
            bool isActive, 
            uint256 lastUpdated
        );
    
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
        );
    
    function getAllCities() 
        external 
        view 
        returns (
            string[] memory names,
            uint256[] memory priceIndices,
            uint256[] memory weights,
            bool[] memory activeStates
        );
    
    // Zero Revenue Functions
    function validateZeroRevenue() external view returns (bool);
    function getRevenueStructure() external pure returns (string memory);
    function calculateTransactionFee(uint256 amount) external pure returns (uint256);
    function getProtocolRevenue() external pure returns (uint256);
    
    // Admin Functions
    function pause() external;
    function unpause() external;
    function updateCityWeight(uint256 _cityId, uint256 _newWeight) external;
    function toggleCityStatus(uint256 _cityId) external;
}