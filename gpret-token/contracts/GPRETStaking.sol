// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IGPRETStaking.sol";

/**
 * @title GPRETStaking
 * @dev Zero-Reward Staking System for GPRET Token
 * 
 * Key Features:
 * - NO financial rewards or incentives
 * - Community engagement and governance weight
 * - Educational demonstration only
 * - Transparent and auditable
 * 
 * IMPORTANT: This staking system provides ZERO financial rewards.
 * It is purely for community participation and governance purposes.
 */
contract GPRETStaking is ReentrancyGuard, Pausable, Ownable, IGPRETStaking {
    using SafeERC20 for IERC20;
    
    // ============ State Variables ============
    
    /// @dev GPRET token contract
    IERC20 public immutable gpretToken;
    
    /// @dev Total tokens staked in the contract
    uint256 public totalStaked;
    
    /// @dev Total number of stakers
    uint256 public totalStakers;
    
    /// @dev Minimum staking period (7 days)
    uint256 public constant MIN_STAKING_PERIOD = 7 days;
    
    /// @dev Maximum staking period (365 days)
    uint256 public constant MAX_STAKING_PERIOD = 365 days;
    
    /// @dev Staking information for each user
    struct StakeInfo {
        uint256 amount;           // Amount of tokens staked
        uint256 stakingTime;      // When tokens were staked
        uint256 lockPeriod;       // Lock period in seconds
        uint256 governanceWeight; // Weight for governance voting
        bool isActive;            // Whether stake is active
    }
    
    /// @dev User staking information
    mapping(address => StakeInfo[]) public userStakes;
    
    /// @dev User's total staked amount
    mapping(address => uint256) public userTotalStaked;
    
    /// @dev User's governance weight
    mapping(address => uint256) public userGovernanceWeight;
    
    /// @dev Staking periods and their governance multipliers
    mapping(uint256 => uint256) public periodMultipliers;
    
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
    
    // ============ Modifiers ============
    
    modifier validStakeIndex(address user, uint256 stakeIndex) {
        require(stakeIndex < userStakes[user].length, "GPRETStaking: Invalid stake index");
        require(userStakes[user][stakeIndex].isActive, "GPRETStaking: Stake not active");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _gpretToken) {
        require(_gpretToken != address(0), "GPRETStaking: Invalid token address");
        
        gpretToken = IERC20(_gpretToken);
        
        // Initialize period multipliers (governance weight multipliers)
        // Longer staking = higher governance weight (but NO financial rewards)
        periodMultipliers[7 days] = 100;    // 1.00x weight
        periodMultipliers[30 days] = 110;   // 1.10x weight
        periodMultipliers[90 days] = 125;   // 1.25x weight
        periodMultipliers[180 days] = 150;  // 1.50x weight
        periodMultipliers[365 days] = 200;  // 2.00x weight
    }
    
    // ============ Staking Functions ============
    
    /**
     * @dev Stakes GPRET tokens for a specified period
     * @param amount Amount of tokens to stake
     * @param lockPeriod Lock period in seconds
     */
    function stake(uint256 amount, uint256 lockPeriod) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "GPRETStaking: Amount must be greater than 0");
        require(
            lockPeriod >= MIN_STAKING_PERIOD && lockPeriod <= MAX_STAKING_PERIOD,
            "GPRETStaking: Invalid lock period"
        );
        require(
            periodMultipliers[lockPeriod] > 0,
            "GPRETStaking: Unsupported lock period"
        );
        
        // Transfer tokens from user to contract
        gpretToken.safeTransferFrom(msg.sender, address(this), amount);
        
        // Calculate governance weight
        uint256 governanceWeight = (amount * periodMultipliers[lockPeriod]) / 100;
        
        // Create new stake
        StakeInfo memory newStake = StakeInfo({
            amount: amount,
            stakingTime: block.timestamp,
            lockPeriod: lockPeriod,
            governanceWeight: governanceWeight,
            isActive: true
        });
        
        // Add to user's stakes
        userStakes[msg.sender].push(newStake);
        uint256 stakeIndex = userStakes[msg.sender].length - 1;
        
        // Update user totals
        if (userTotalStaked[msg.sender] == 0) {
            totalStakers++;
        }
        
        userTotalStaked[msg.sender] += amount;
        userGovernanceWeight[msg.sender] += governanceWeight;
        totalStaked += amount;
        
        emit TokensStaked(
            msg.sender,
            stakeIndex,
            amount,
            lockPeriod,
            governanceWeight
        );
        
        emit GovernanceWeightUpdated(
            msg.sender,
            userGovernanceWeight[msg.sender] - governanceWeight,
            userGovernanceWeight[msg.sender]
        );
    }
    
    /**
     * @dev Unstakes tokens after lock period expires
     * @param stakeIndex Index of the stake to unstake
     */
    function unstake(uint256 stakeIndex) 
        external 
        nonReentrant 
        validStakeIndex(msg.sender, stakeIndex) 
    {
        StakeInfo storage stakeInfo = userStakes[msg.sender][stakeIndex];
        
        require(
            block.timestamp >= stakeInfo.stakingTime + stakeInfo.lockPeriod,
            "GPRETStaking: Lock period not expired"
        );
        
        uint256 amount = stakeInfo.amount;
        uint256 governanceWeight = stakeInfo.governanceWeight;
        
        // Mark stake as inactive
        stakeInfo.isActive = false;
        
        // Update user totals
        userTotalStaked[msg.sender] -= amount;
        userGovernanceWeight[msg.sender] -= governanceWeight;
        totalStaked -= amount;
        
        if (userTotalStaked[msg.sender] == 0) {
            totalStakers--;
        }
        
        // Transfer tokens back to user
        gpretToken.safeTransfer(msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, stakeIndex, amount);
        
        emit GovernanceWeightUpdated(
            msg.sender,
            userGovernanceWeight[msg.sender] + governanceWeight,
            userGovernanceWeight[msg.sender]
        );
    }
    
    /**
     * @dev Emergency unstake with potential penalties (owner only, for emergencies)
     * @param user User address
     * @param stakeIndex Index of the stake
     */
    function emergencyUnstake(address user, uint256 stakeIndex) 
        external 
        onlyOwner 
        nonReentrant 
        validStakeIndex(user, stakeIndex) 
    {
        StakeInfo storage stakeInfo = userStakes[user][stakeIndex];
        
        uint256 amount = stakeInfo.amount;
        uint256 governanceWeight = stakeInfo.governanceWeight;
        
        // Mark stake as inactive
        stakeInfo.isActive = false;
        
        // Update totals
        userTotalStaked[user] -= amount;
        userGovernanceWeight[user] -= governanceWeight;
        totalStaked -= amount;
        
        if (userTotalStaked[user] == 0) {
            totalStakers--;
        }
        
        // Transfer tokens back to user
        gpretToken.safeTransfer(user, amount);
        
        emit TokensUnstaked(user, stakeIndex, amount);
        emit GovernanceWeightUpdated(
            user,
            userGovernanceWeight[user] + governanceWeight,
            userGovernanceWeight[user]
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Returns user's stake information
     * @param user User address
     * @param stakeIndex Index of the stake
     */
    function getUserStake(address user, uint256 stakeIndex) 
        external 
        view 
        returns (
            uint256 amount,
            uint256 stakingTime,
            uint256 lockPeriod,
            uint256 governanceWeight,
            bool isActive,
            bool canUnstake
        ) 
    {
        require(stakeIndex < userStakes[user].length, "GPRETStaking: Invalid stake index");
        
        StakeInfo memory stakeInfo = userStakes[user][stakeIndex];
        bool canUnstakeNow = (block.timestamp >= stakeInfo.stakingTime + stakeInfo.lockPeriod) && stakeInfo.isActive;
        
        return (
            stakeInfo.amount,
            stakeInfo.stakingTime,
            stakeInfo.lockPeriod,
            stakeInfo.governanceWeight,
            stakeInfo.isActive,
            canUnstakeNow
        );
    }
    
    /**
     * @dev Returns user's total staking information
     * @param user User address
     */
    function getUserTotalInfo(address user) 
        external 
        view 
        returns (
            uint256 totalStakedAmount,
            uint256 totalGovernanceWeight,
            uint256 activeStakes
        ) 
    {
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            if (userStakes[user][i].isActive) {
                activeCount++;
            }
        }
        
        return (
            userTotalStaked[user],
            userGovernanceWeight[user],
            activeCount
        );
    }
    
    /**
     * @dev Returns all user's stakes
     * @param user User address
     */
    function getAllUserStakes(address user) 
        external 
        view 
        returns (StakeInfo[] memory) 
    {
        return userStakes[user];
    }
    
    /**
     * @dev Returns contract statistics
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 _totalStaked,
            uint256 _totalStakers,
            uint256 contractBalance
        ) 
    {
        return (
            totalStaked,
            totalStakers,
            gpretToken.balanceOf(address(this))
        );
    }
    
    /**
     * @dev Returns supported staking periods and their multipliers
     */
    function getStakingPeriods() 
        external 
        view 
        returns (
            uint256[] memory periods,
            uint256[] memory multipliers
        ) 
    {
        periods = new uint256[](5);
        multipliers = new uint256[](5);
        
        periods[0] = 7 days;
        periods[1] = 30 days;
        periods[2] = 90 days;
        periods[3] = 180 days;
        periods[4] = 365 days;
        
        for (uint256 i = 0; i < 5; i++) {
            multipliers[i] = periodMultipliers[periods[i]];
        }
    }
    
    // ============ Admin Functions ============
    
    /**
     * @dev Updates period multiplier (owner only)
     * @param period Staking period in seconds
     * @param multiplier New multiplier (scaled by 100)
     */
    function updatePeriodMultiplier(uint256 period, uint256 multiplier) 
        external 
        onlyOwner 
    {
        require(
            period >= MIN_STAKING_PERIOD && period <= MAX_STAKING_PERIOD,
            "GPRETStaking: Invalid period"
        );
        require(multiplier >= 100 && multiplier <= 500, "GPRETStaking: Invalid multiplier");
        
        uint256 oldMultiplier = periodMultipliers[period];
        periodMultipliers[period] = multiplier;
        
        emit PeriodMultiplierUpdated(period, oldMultiplier, multiplier);
    }
    
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
    
    // ============ Zero Reward Guarantee ============
    
    /**
     * @dev Confirms that this staking system provides zero financial rewards
     */
    function confirmZeroRewards() external pure returns (string memory) {
        return "This staking system provides ZERO financial rewards. Community participation only.";
    }
    
    /**
     * @dev Calculates theoretical APY (always returns 0 for this zero-reward system)
     */
    function getAPY() external pure returns (uint256) {
        return 0; // Always 0% APY - no financial rewards
    }
}