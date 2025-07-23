// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGPRETStaking Interface
 * @dev Interface for GPRET staking contract
 */
interface IGPRETStaking {
    
    // Struct
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriod;
        uint256 governanceMultiplier;
        bool isActive;
    }
    
    // Constants
    function MIN_STAKE_PERIOD() external view returns (uint256);
    function MAX_STAKE_PERIOD() external view returns (uint256);
    function BASE_GOVERNANCE_WEIGHT() external view returns (uint256);
    function MAX_GOVERNANCE_WEIGHT() external view returns (uint256);
    
    // State Variables
    function totalStaked() external view returns (uint256);
    function totalStakers() external view returns (uint256);
    function emergencyUnstakeEnabled() external view returns (bool);
    
    function totalStakedByUser(address user) external view returns (uint256);
    function governanceWeight(address user) external view returns (uint256);
    function periodMultipliers(uint256 period) external view returns (uint256);
    
    // Main Functions
    function stake(uint256 _amount, uint256 _lockPeriod) external;
    function unstake(uint256 _stakeIndex) external;
    
    // View Functions
    function getUserStakeCount(address _user) external view returns (uint256);
    function getUserStake(address _user, uint256 _index) external view returns (StakeInfo memory);
    function getAllUserStakes(address _user) external view returns (StakeInfo[] memory);
    function getStakeUnlockTime(address _user, uint256 _index) external view returns (uint256);
    function isStakeUnlocked(address _user, uint256 _index) external view returns (bool);
    function getUserActiveStakes(address _user) external view returns (StakeInfo[] memory);
    function calculateGovernanceWeight(address _user) external view returns (uint256);
    
    function getContractStats() 
        external 
        view 
        returns (
            uint256 _totalStaked,
            uint256 _totalStakers,
            uint256 _averageStakeAmount,
            uint256 _contractBalance
        );
    
    // Zero Revenue Functions
    function validateZeroRevenue() external view returns (bool);
    function getAPY() external pure returns (uint256);
    function getRewards(address user) external pure returns (uint256);
    function claimRewards() external pure;
    function calculateRewards(address user) external pure returns (uint256);
    
    // Admin Functions
    function pause() external;
    function unpause() external;
    function setEmergencyUnstake(bool _enabled) external;
    function updatePeriodMultiplier(uint256 _period, uint256 _multiplier) external;
    function emergencyWithdraw(address _to, uint256 _amount) external;
}