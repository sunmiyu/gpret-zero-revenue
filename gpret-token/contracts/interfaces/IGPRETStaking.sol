// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGPRETStaking
 * @dev Interface for GPRET Zero-Reward Staking System
 */
interface IGPRETStaking {
    
    // ============ Structs ============
    
    struct StakeInfo {
        uint256 amount;           // Amount of tokens staked
        uint256 stakingTime;      // When tokens were staked
        uint256 lockPeriod;       // Lock period in seconds
        uint256 governanceWeight; // Weight for governance voting
        bool isActive;            // Whether stake is active
    }
    
    // ============ Events ============
    
    event TokensStaked(
        address indexed user,
        uint256 indexed stakeIndex,
        uint256 amount,
        uint256 lockPeriod,
        uint256 governanceWeight
    );
    
    event TokensUnstaked(
        address indexed user,
        uint256 indexed stakeIndex,
        uint256 amount
    );
    
    event GovernanceWeightUpdated(
        address indexed user,
        uint256 oldWeight,
        uint256 newWeight
    );
    
    event PeriodMultiplierUpdated(
        uint256 indexed period,
        uint256 oldMultiplier,
        uint256 newMultiplier
    );
    
    // ============ Staking Functions ============
    
    /**
     * @dev Stakes GPRET tokens for a specified period
     * @param amount Amount of tokens to stake
     * @param lockPeriod Lock period in seconds
     */
    function stake(uint256 amount, uint256 lockPeriod) external;
    
    /**
     * @dev Unstakes tokens after lock period expires
     * @param stakeIndex Index of the stake to unstake
     */
    function unstake(uint256 stakeIndex) external;
    
    /**
     * @dev Emergency unstake (owner only)
     * @param user User address
     * @param stakeIndex Index of the stake
     */
    function emergencyUnstake(address user, uint256 stakeIndex) external;
    
    // ============ View Functions ============
    
    /**
     * @dev Returns user's stake information
     * @param user User address
     * @param stakeIndex Index of the stake
     * @return amount Staked amount
     * @return stakingTime When tokens were staked
     * @return lockPeriod Lock period in seconds
     * @return governanceWeight Governance weight
     * @return isActive Whether stake is active
     * @return canUnstake Whether tokens can be unstaked now
     */
    function getUserStake(address user, uint256 stakeIndex) external view returns (
        uint256 amount,
        uint256 stakingTime,
        uint256 lockPeriod,
        uint256 governanceWeight,
        bool isActive,
        bool canUnstake
    );
    
    /**
     * @dev Returns user's total staking information
     * @param user User address
     * @return totalStakedAmount Total staked tokens
     * @return totalGovernanceWeight Total governance weight
     * @return activeStakes Number of active stakes
     */
    function getUserTotalInfo(address user) external view returns (
        uint256 totalStakedAmount,
        uint256 totalGovernanceWeight,
        uint256 activeStakes
    );
    
    /**
     * @dev Returns all user's stakes
     * @param user User address
     * @return Array of StakeInfo structs
     */
    function getAllUserStakes(address user) external view returns (StakeInfo[] memory);
    
    /**
     * @dev Returns contract statistics
     * @return _totalStaked Total tokens staked in contract
     * @return _totalStakers Total number of stakers
     * @return contractBalance Contract token balance
     */
    function getContractStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalStakers,
        uint256 contractBalance
    );
    
    /**
     * @dev Returns supported staking periods and their multipliers
     * @return periods Array of supported periods
     * @return multipliers Array of corresponding multipliers
     */
    function getStakingPeriods() external view returns (
        uint256[] memory periods,
        uint256[] memory multipliers
    );
    
    // ============ Admin Functions ============
    
    /**
     * @dev Updates period multiplier
     * @param period Staking period in seconds
     * @param multiplier New multiplier (scaled by 100)
     */
    function updatePeriodMultiplier(uint256 period, uint256 multiplier) external;
    
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
     * @dev Returns GPRET token address
     */
    function gpretToken() external view returns (address);
    
    /**
     * @dev Returns total staked amount
     */
    function totalStaked() external view returns (uint256);
    
    /**
     * @dev Returns total number of stakers
     */
    function totalStakers() external view returns (uint256);
    
    /**
     * @dev Returns minimum staking period
     */
    function MIN_STAKING_PERIOD() external view returns (uint256);
    
    /**
     * @dev Returns maximum staking period
     */
    function MAX_STAKING_PERIOD() external view returns (uint256);
    
    /**
     * @dev Returns user's total staked amount
     * @param user User address
     */
    function userTotalStaked(address user) external view returns (uint256);
    
    /**
     * @dev Returns user's governance weight
     * @param user User address
     */
    function userGovernanceWeight(address user) external view returns (uint256);
    
    /**
     * @dev Returns period multiplier for a given period
     * @param period Staking period
     */
    function periodMultipliers(uint256 period) external view returns (uint256);
    
    // ============ Zero Reward Confirmation ============
    
    /**
     * @dev Confirms zero reward structure
     * @return Confirmation message
     */
    function confirmZeroRewards() external pure returns (string memory);
    
    /**
     * @dev Returns APY (always 0 for zero-reward system)
     * @return APY percentage (always 0)
     */
    function getAPY() external pure returns (uint256);
}