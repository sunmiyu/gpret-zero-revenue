// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IGPRETStaking.sol";

/**
 * @title GPRETStaking
 * @dev Zero-reward staking contract for GPRET governance participation
 * @notice This contract provides NO financial rewards - only governance weight
 */
contract GPRETStaking is ReentrancyGuard, Pausable, Ownable, IGPRETStaking {
    using SafeERC20 for IERC20;
    
    // Events - 이벤트 선언 추가
    event TokensStaked(
        address indexed user,
        uint256 amount,
        uint256 lockPeriod,
        uint256 unlockTime,
        uint256 governanceMultiplier
    );
    
    event TokensUnstaked(
        address indexed user,
        uint256 amount,
        uint256 stakeIndex,
        uint256 timestamp
    );
    
    event GovernanceWeightUpdated(
        address indexed user,
        uint256 oldWeight,
        uint256 newWeight,
        uint256 timestamp
    );
    
    event PeriodMultiplierUpdated(
        uint256 period,
        uint256 oldMultiplier,
        uint256 newMultiplier,
        uint256 timestamp
    );
    
    // Constants
    uint256 public constant MIN_STAKE_PERIOD = 7 days;
    uint256 public constant MAX_STAKE_PERIOD = 365 days;
    uint256 public constant BASE_GOVERNANCE_WEIGHT = 10000; // 1.0x in basis points
    uint256 public constant MAX_GOVERNANCE_WEIGHT = 20000;  // 2.0x in basis points
    
    // State variables
    IERC20 public immutable gpretToken;
    
    mapping(address => StakeInfo[]) private userStakes;
    mapping(address => uint256) public totalStakedByUser;
    mapping(address => uint256) public governanceWeight;
    
    uint256 public totalStaked;
    uint256 public totalStakers;
    
    // Period multipliers for governance weight (in basis points)
    mapping(uint256 => uint256) public periodMultipliers;
    
    // Zero revenue validation
    mapping(string => bool) public zeroRevenueValidation;
    
    // Emergency settings
    bool public emergencyUnstakeEnabled;
    
    constructor(address _gpretToken, address initialOwner) Ownable(initialOwner) {
        require(_gpretToken != address(0), "Invalid token address");
        gpretToken = IERC20(_gpretToken);
        
        // Initialize zero revenue validation
        zeroRevenueValidation["NO_REWARDS"] = true;
        zeroRevenueValidation["NO_YIELD"] = true;
        zeroRevenueValidation["NO_FEES"] = true;
        zeroRevenueValidation["GOVERNANCE_ONLY"] = true;
        
        // Initialize period multipliers
        _initializePeriodMultipliers();
    }
    
    function _initializePeriodMultipliers() private {
        periodMultipliers[7 days] = 10000;    // 1.0x
        periodMultipliers[30 days] = 11000;   // 1.1x
        periodMultipliers[90 days] = 13000;   // 1.3x
        periodMultipliers[180 days] = 16000;  // 1.6x
        periodMultipliers[365 days] = 20000;  // 2.0x
    }
    
    function stake(uint256 _amount, uint256 _lockPeriod) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(_amount > 0, "Amount must be greater than 0");
        require(_lockPeriod >= MIN_STAKE_PERIOD, "Lock period too short");
        require(_lockPeriod <= MAX_STAKE_PERIOD, "Lock period too long");
        require(periodMultipliers[_lockPeriod] > 0, "Invalid lock period");
        
        // Transfer tokens from user
        gpretToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // Check if this is user's first stake
        bool isNewStaker = userStakes[msg.sender].length == 0;
        
        // Create stake info
        StakeInfo memory newStake = StakeInfo({
            amount: _amount,
            startTime: block.timestamp,
            lockPeriod: _lockPeriod,
            governanceMultiplier: periodMultipliers[_lockPeriod],
            isActive: true
        });
        
        userStakes[msg.sender].push(newStake);
        totalStakedByUser[msg.sender] += _amount;
        totalStaked += _amount;
        
        if (isNewStaker) {
            totalStakers++;
        }
        
        // Update governance weight
        _updateGovernanceWeight(msg.sender);
        
        emit TokensStaked(
            msg.sender,
            _amount,
            _lockPeriod,
            block.timestamp + _lockPeriod,
            periodMultipliers[_lockPeriod]
        );
    }
    
    function unstake(uint256 _stakeIndex) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        require(_stakeIndex < userStakes[msg.sender].length, "Invalid stake index");
        
        StakeInfo storage stakeInfo = userStakes[msg.sender][_stakeIndex];
        require(stakeInfo.isActive, "Stake already withdrawn");
        
        if (!emergencyUnstakeEnabled) {
            require(
                block.timestamp >= stakeInfo.startTime + stakeInfo.lockPeriod,
                "Stake still locked"
            );
        }
        
        uint256 amount = stakeInfo.amount;
        stakeInfo.isActive = false;
        
        totalStakedByUser[msg.sender] -= amount;
        totalStaked -= amount;
        
        // Check if user has no more active stakes
        if (totalStakedByUser[msg.sender] == 0) {
            totalStakers--;
        }
        
        // Update governance weight
        _updateGovernanceWeight(msg.sender);
        
        // Transfer tokens back to user
        gpretToken.safeTransfer(msg.sender, amount);
        
        emit TokensUnstaked(
            msg.sender,
            amount,
            _stakeIndex,
            block.timestamp
        );
    }
    
    function _updateGovernanceWeight(address _user) private {
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < userStakes[_user].length; i++) {
            StakeInfo storage stakeInfo = userStakes[_user][i]; // 변수명 수정
            if (stakeInfo.isActive) {
                uint256 stakeWeight = stakeInfo.amount * stakeInfo.governanceMultiplier / BASE_GOVERNANCE_WEIGHT;
                totalWeight += stakeWeight;
            }
        }
        
        uint256 oldWeight = governanceWeight[_user];
        governanceWeight[_user] = totalWeight;
        
        emit GovernanceWeightUpdated(
            _user,
            oldWeight,
            totalWeight,
            block.timestamp
        );
    }
    
    // View Functions
    function getUserStakeCount(address _user) external view returns (uint256) {
        return userStakes[_user].length;
    }
    
    function getUserStake(address _user, uint256 _index) 
        external 
        view 
        returns (StakeInfo memory) 
    {
        require(_index < userStakes[_user].length, "Invalid stake index");
        return userStakes[_user][_index];
    }
    
    function getAllUserStakes(address _user) 
        external 
        view 
        returns (StakeInfo[] memory) 
    {
        return userStakes[_user];
    }
    
    function getStakeUnlockTime(address _user, uint256 _index) 
        external 
        view 
        returns (uint256) 
    {
        require(_index < userStakes[_user].length, "Invalid stake index");
        StakeInfo storage stakeInfo = userStakes[_user][_index]; // 변수명 수정
        return stakeInfo.startTime + stakeInfo.lockPeriod;
    }
    
    function isStakeUnlocked(address _user, uint256 _index) 
        external 
        view 
        returns (bool) 
    {
        require(_index < userStakes[_user].length, "Invalid stake index");
        StakeInfo storage stakeInfo = userStakes[_user][_index]; // 변수명 수정
        return block.timestamp >= stakeInfo.startTime + stakeInfo.lockPeriod || emergencyUnstakeEnabled;
    }
    
    function getUserActiveStakes(address _user) 
        external 
        view 
        returns (StakeInfo[] memory activeStakes) 
    {
        uint256 activeCount = 0;
        
        // Count active stakes
        for (uint256 i = 0; i < userStakes[_user].length; i++) {
            if (userStakes[_user][i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active stakes
        activeStakes = new StakeInfo[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < userStakes[_user].length; i++) {
            if (userStakes[_user][i].isActive) {
                activeStakes[currentIndex] = userStakes[_user][i];
                currentIndex++;
            }
        }
    }
    
    function calculateGovernanceWeight(address _user) 
        external 
        view 
        returns (uint256) 
    {
        return governanceWeight[_user];
    }
    
    function getContractStats() 
        external 
        view 
        returns (
            uint256 _totalStaked,
            uint256 _totalStakers,
            uint256 _averageStakeAmount,
            uint256 _contractBalance
        ) 
    {
        _totalStaked = totalStaked;
        _totalStakers = totalStakers;
        _averageStakeAmount = totalStakers > 0 ? totalStaked / totalStakers : 0;
        _contractBalance = gpretToken.balanceOf(address(this));
    }
    
    // Zero Revenue Validation
    function validateZeroRevenue() external view returns (bool) {
        return zeroRevenueValidation["NO_REWARDS"] && 
               zeroRevenueValidation["NO_YIELD"] && 
               zeroRevenueValidation["NO_FEES"] && 
               zeroRevenueValidation["GOVERNANCE_ONLY"];
    }
    
    function getAPY() external pure returns (uint256) {
        return 0; // Always 0% APY - Zero Revenue
    }
    
    function getRewards(address) external pure returns (uint256) {
        return 0; // Always 0 rewards - Zero Revenue
    }
    
    function claimRewards() external pure {
        revert("No rewards available - Zero Revenue contract");
    }
    
    function calculateRewards(address) external pure returns (uint256) {
        return 0; // Always 0 rewards - Zero Revenue
    }
    
    // Admin Functions
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function setEmergencyUnstake(bool _enabled) external onlyOwner {
        emergencyUnstakeEnabled = _enabled;
    }
    
    function updatePeriodMultiplier(uint256 _period, uint256 _multiplier) 
        external 
        onlyOwner 
    {
        require(_period >= MIN_STAKE_PERIOD, "Period too short");
        require(_period <= MAX_STAKE_PERIOD, "Period too long");
        require(_multiplier >= BASE_GOVERNANCE_WEIGHT, "Multiplier too low");
        require(_multiplier <= MAX_GOVERNANCE_WEIGHT, "Multiplier too high");
        
        uint256 oldMultiplier = periodMultipliers[_period];
        periodMultipliers[_period] = _multiplier;
        
        emit PeriodMultiplierUpdated(
            _period,
            oldMultiplier,
            _multiplier,
            block.timestamp
        );
    }
    
    // Emergency function - should never be used in normal circumstances
    function emergencyWithdraw(address _to, uint256 _amount) 
        external 
        onlyOwner 
    {
        require(emergencyUnstakeEnabled, "Emergency mode not enabled");
        require(_to != address(0), "Invalid address");
        require(_amount <= gpretToken.balanceOf(address(this)), "Insufficient balance");
        
        gpretToken.safeTransfer(_to, _amount);
    }
}