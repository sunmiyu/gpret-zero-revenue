const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("GPRET Staking", function () {
  
  // ============ Fixtures ============
  
  async function deployStakingFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy GPRET token first
    const GPRET = await ethers.getContractFactory("GPRET");
    const gpret = await GPRET.deploy();
    
    // Deploy staking contract
    const GPRETStaking = await ethers.getContractFactory("GPRETStaking");
    const staking = await GPRETStaking.deploy(gpret.address);
    
    // Transfer some tokens to users for testing
    const userAmount = ethers.utils.parseEther("10000");
    await gpret.connect(owner).transfer(user1.address, userAmount);
    await gpret.connect(owner).transfer(user2.address, userAmount);
    await gpret.connect(owner).transfer(user3.address, userAmount);
    
    return { gpret, staking, owner, user1, user2, user3 };
  }
  
  // ============ Deployment Tests ============
  
  describe("Deployment", function () {
    it("Should deploy with correct token address", async function () {
      const { gpret, staking } = await loadFixture(deployStakingFixture);
      
      expect(await staking.gpretToken()).to.equal(gpret.address);
    });
    
    it("Should initialize with zero staked amount", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      expect(await staking.totalStaked()).to.equal(0);
      expect(await staking.totalStakers()).to.equal(0);
    });
    
    it("Should set correct period multipliers", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      expect(await staking.periodMultipliers(7 * 24 * 60 * 60)).to.equal(100);   // 7 days = 1.00x
      expect(await staking.periodMultipliers(30 * 24 * 60 * 60)).to.equal(110);  // 30 days = 1.10x
      expect(await staking.periodMultipliers(90 * 24 * 60 * 60)).to.equal(125);  // 90 days = 1.25x
      expect(await staking.periodMultipliers(180 * 24 * 60 * 60)).to.equal(150); // 180 days = 1.50x
      expect(await staking.periodMultipliers(365 * 24 * 60 * 60)).to.equal(200); // 365 days = 2.00x
    });
  });
  
  // ============ Staking Tests ============
  
  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60; // 7 days
      
      // Approve staking contract
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      
      // Stake tokens
      await expect(staking.connect(user1).stake(stakeAmount, lockPeriod))
        .to.emit(staking, "TokensStaked")
        .withArgs(user1.address, 0, stakeAmount, lockPeriod, stakeAmount); // 1.00x multiplier
      
      // Check staking state
      expect(await staking.totalStaked()).to.equal(stakeAmount);
      expect(await staking.totalStakers()).to.equal(1);
      expect(await staking.userTotalStaked(user1.address)).to.equal(stakeAmount);
      expect(await staking.userGovernanceWeight(user1.address)).to.equal(stakeAmount);
    });
    
    it("Should calculate governance weight correctly", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 365 * 24 * 60 * 60; // 365 days (2.00x multiplier)
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      
      const expectedWeight = stakeAmount.mul(200).div(100); // 2.00x multiplier
      
      await expect(staking.connect(user1).stake(stakeAmount, lockPeriod))
        .to.emit(staking, "TokensStaked")
        .withArgs(user1.address, 0, stakeAmount, lockPeriod, expectedWeight);
      
      expect(await staking.userGovernanceWeight(user1.address)).to.equal(expectedWeight);
    });
    
    it("Should reject staking with invalid periods", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      
      // Too short period
      await expect(staking.connect(user1).stake(stakeAmount, 6 * 24 * 60 * 60))
        .to.be.revertedWith("GPRET: Invalid lock period");
      
      // Too long period
      await expect(staking.connect(user1).stake(stakeAmount, 366 * 24 * 60 * 60))
        .to.be.revertedWith("GPRET: Invalid lock period");
      
      // Unsupported period
      await expect(staking.connect(user1).stake(stakeAmount, 15 * 24 * 60 * 60))
        .to.be.revertedWith("GPRET: Unsupported lock period");
    });
    
    it("Should reject staking zero amount", async function () {
      const { staking, user1 } = await loadFixture(deployStakingFixture);
      
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await expect(staking.connect(user1).stake(0, lockPeriod))
        .to.be.revertedWith("GPRETStaking: Amount must be greater than 0");
    });
    
    it("Should allow multiple stakes from same user", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("500");
      const lockPeriod1 = 7 * 24 * 60 * 60;
      const lockPeriod2 = 30 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(2));
      
      // First stake
      await staking.connect(user1).stake(stakeAmount, lockPeriod1);
      
      // Second stake
      await staking.connect(user1).stake(stakeAmount, lockPeriod2);
      
      expect(await staking.userTotalStaked(user1.address)).to.equal(stakeAmount.mul(2));
      expect(await staking.totalStakers()).to.equal(1); // Same user
      
      // Check individual stakes
      const [amount1, , , weight1, active1] = await staking.getUserStake(user1.address, 0);
      const [amount2, , , weight2, active2] = await staking.getUserStake(user1.address, 1);
      
      expect(amount1).to.equal(stakeAmount);
      expect(amount2).to.equal(stakeAmount);
      expect(weight1).to.equal(stakeAmount); // 1.00x multiplier
      expect(weight2).to.equal(stakeAmount.mul(110).div(100)); // 1.10x multiplier
      expect(active1).to.be.true;
      expect(active2).to.be.true;
    });
  });
  
  // ============ Unstaking Tests ============
  
  describe("Unstaking", function () {
    it("Should allow unstaking after lock period", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      // Stake tokens
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Fast forward past lock period
      await time.increase(lockPeriod + 1);
      
      // Unstake
      await expect(staking.connect(user1).unstake(0))
        .to.emit(staking, "TokensUnstaked")
        .withArgs(user1.address, 0, stakeAmount);
      
      // Check state
      expect(await staking.totalStaked()).to.equal(0);
      expect(await staking.totalStakers()).to.equal(0);
      expect(await staking.userTotalStaked(user1.address)).to.equal(0);
      expect(await staking.userGovernanceWeight(user1.address)).to.equal(0);
      
      // Check tokens returned
      expect(await gpret.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("10000"));
    });
    
    it("Should not allow unstaking before lock period", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Try to unstake immediately
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("GPRETStaking: Lock period not expired");
      
      // Try after partial period
      await time.increase(lockPeriod / 2);
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("GPRETStaking: Lock period not expired");
    });
    
    it("Should not allow unstaking invalid stake index", async function () {
      const { staking, user1 } = await loadFixture(deployStakingFixture);
      
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("GPRETStaking: Invalid stake index");
    });
    
    it("Should not allow unstaking already unstaked tokens", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      await time.increase(lockPeriod + 1);
      await staking.connect(user1).unstake(0);
      
      // Try to unstake again
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("GPRETStaking: Stake not active");
    });
    
    it("Should handle partial unstaking correctly", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("500");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      // Create two stakes
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(2));
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      await time.increase(lockPeriod + 1);
      
      // Unstake only first stake
      await staking.connect(user1).unstake(0);
      
      // Check that only one stake was unstaked
      expect(await staking.userTotalStaked(user1.address)).to.equal(stakeAmount);
      expect(await staking.totalStaked()).to.equal(stakeAmount);
      expect(await staking.totalStakers()).to.equal(1); // Still has one active stake
      
      // Check stake status
      const [, , , , active1] = await staking.getUserStake(user1.address, 0);
      const [, , , , active2] = await staking.getUserStake(user1.address, 1);
      
      expect(active1).to.be.false;
      expect(active2).to.be.true;
    });
  });
  
  // ============ Emergency Unstaking Tests ============
  
  describe("Emergency Unstaking", function () {
    it("Should allow owner to emergency unstake", async function () {
      const { gpret, staking, owner, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 365 * 24 * 60 * 60; // Long period
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Emergency unstake without waiting for lock period
      await expect(staking.connect(owner).emergencyUnstake(user1.address, 0))
        .to.emit(staking, "TokensUnstaked")
        .withArgs(user1.address, 0, stakeAmount);
      
      // Check tokens returned
      expect(await gpret.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("10000"));
    });
    
    it("Should not allow non-owner to emergency unstake", async function () {
      const { gpret, staking, user1, user2 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      await expect(staking.connect(user2).emergencyUnstake(user1.address, 0))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  // ============ View Functions Tests ============
  
  describe("View Functions", function () {
    it("Should return correct user stake info", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 30 * 24 * 60 * 60; // 30 days
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      const stakeTx = await staking.connect(user1).stake(stakeAmount, lockPeriod);
      const stakeTime = (await ethers.provider.getBlock(stakeTx.blockNumber)).timestamp;
      
      const [amount, stakingTime, period, weight, active, canUnstake] = 
        await staking.getUserStake(user1.address, 0);
      
      expect(amount).to.equal(stakeAmount);
      expect(stakingTime).to.equal(stakeTime);
      expect(period).to.equal(lockPeriod);
      expect(weight).to.equal(stakeAmount.mul(110).div(100)); // 1.10x multiplier
      expect(active).to.be.true;
      expect(canUnstake).to.be.false; // Lock period not expired
    });
    
    it("Should return correct user total info", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("500");
      
      // Create multiple stakes
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(3));
      
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);   // 1.00x
      await staking.connect(user1).stake(stakeAmount, 30 * 24 * 60 * 60);  // 1.10x
      await staking.connect(user1).stake(stakeAmount, 90 * 24 * 60 * 60);  // 1.25x
      
      const [totalStaked, totalWeight, activeStakes] = 
        await staking.getUserTotalInfo(user1.address);
      
      expect(totalStaked).to.equal(stakeAmount.mul(3));
      expect(activeStakes).to.equal(3);
      
      // Calculate expected total weight
      const expectedWeight = stakeAmount.mul(100).div(100)  // 1.00x
        .add(stakeAmount.mul(110).div(100))                  // 1.10x
        .add(stakeAmount.mul(125).div(100));                 // 1.25x
      
      expect(totalWeight).to.equal(expectedWeight);
    });
    
    it("Should return contract stats correctly", async function () {
      const { gpret, staking, user1, user2 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      // Multiple users stake
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await gpret.connect(user2).approve(staking.address, stakeAmount);
      
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      await staking.connect(user2).stake(stakeAmount, lockPeriod);
      
      const [totalStaked, totalStakers, contractBalance] = 
        await staking.getContractStats();
      
      expect(totalStaked).to.equal(stakeAmount.mul(2));
      expect(totalStakers).to.equal(2);
      expect(contractBalance).to.equal(stakeAmount.mul(2));
    });
    
    it("Should return staking periods correctly", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      const [periods, multipliers] = await staking.getStakingPeriods();
      
      expect(periods.length).to.equal(5);
      expect(multipliers.length).to.equal(5);
      
      expect(periods[0]).to.equal(7 * 24 * 60 * 60);
      expect(periods[1]).to.equal(30 * 24 * 60 * 60);
      expect(periods[2]).to.equal(90 * 24 * 60 * 60);
      expect(periods[3]).to.equal(180 * 24 * 60 * 60);
      expect(periods[4]).to.equal(365 * 24 * 60 * 60);
      
      expect(multipliers[0]).to.equal(100);
      expect(multipliers[1]).to.equal(110);
      expect(multipliers[2]).to.equal(125);
      expect(multipliers[3]).to.equal(150);
      expect(multipliers[4]).to.equal(200);
    });
    
    it("Should return all user stakes", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("500");
      
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(2));
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);
      await staking.connect(user1).stake(stakeAmount, 30 * 24 * 60 * 60);
      
      const allStakes = await staking.getAllUserStakes(user1.address);
      
      expect(allStakes.length).to.equal(2);
      expect(allStakes[0].amount).to.equal(stakeAmount);
      expect(allStakes[1].amount).to.equal(stakeAmount);
      expect(allStakes[0].isActive).to.be.true;
      expect(allStakes[1].isActive).to.be.true;
    });
  });
  
  // ============ Admin Functions Tests ============
  
  describe("Admin Functions", function () {
    it("Should allow owner to update period multipliers", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      
      const newPeriod = 14 * 24 * 60 * 60; // 14 days
      const newMultiplier = 105; // 1.05x
      
      await expect(staking.connect(owner).updatePeriodMultiplier(newPeriod, newMultiplier))
        .to.emit(staking, "PeriodMultiplierUpdated")
        .withArgs(newPeriod, 0, newMultiplier);
      
      expect(await staking.periodMultipliers(newPeriod)).to.equal(newMultiplier);
    });
    
    it("Should not allow invalid multiplier updates", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      
      const period = 7 * 24 * 60 * 60;
      
      // Too low multiplier
      await expect(staking.connect(owner).updatePeriodMultiplier(period, 50))
        .to.be.revertedWith("GPRETStaking: Invalid multiplier");
      
      // Too high multiplier
      await expect(staking.connect(owner).updatePeriodMultiplier(period, 600))
        .to.be.revertedWith("GPRETStaking: Invalid multiplier");
    });
    
    it("Should allow owner to pause/unpause", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      
      // Pause
      await expect(staking.connect(owner).pause())
        .to.emit(staking, "Paused")
        .withArgs(owner.address);
      
      expect(await staking.paused()).to.be.true;
      
      // Unpause
      await expect(staking.connect(owner).unpause())
        .to.emit(staking, "Unpaused")
        .withArgs(owner.address);
      
      expect(await staking.paused()).to.be.false;
    });
    
    it("Should prevent staking when paused", async function () {
      const { gpret, staking, owner, user1 } = await loadFixture(deployStakingFixture);
      
      await staking.connect(owner).pause();
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      
      await expect(staking.connect(user1).stake(stakeAmount, lockPeriod))
        .to.be.revertedWith("Pausable: paused");
    });
  });
  
  // ============ Zero Reward Tests ============
  
  describe("Zero Reward Guarantee", function () {
    it("Should confirm zero rewards", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      const confirmation = await staking.confirmZeroRewards();
      expect(confirmation).to.equal(
        "This staking system provides ZERO financial rewards. Community participation only."
      );
    });
    
    it("Should always return 0% APY", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      expect(await staking.getAPY()).to.equal(0);
    });
    
    it("Should not distribute any rewards during staking", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      const initialBalance = await gpret.balanceOf(user1.address);
      
      // Stake tokens
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Wait for lock period
      await time.increase(lockPeriod + 1);
      
      // Unstake
      await staking.connect(user1).unstake(0);
      
      // Check that user received exactly the same amount back (no rewards)
      const finalBalance = await gpret.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance);
    });
    
    it("Should have no reward distribution functions", async function () {
      const { staking } = await loadFixture(deployStakingFixture);
      
      // Verify that reward-related functions don't exist
      expect(typeof staking.claimRewards).to.equal('undefined');
      expect(typeof staking.distributeRewards).to.equal('undefined');
      expect(typeof staking.calculateRewards).to.equal('undefined');
      expect(typeof staking.pendingRewards).to.equal('undefined');
    });
  });
  
  // ============ Security Tests ============
  
  describe("Security", function () {
    it("Should prevent reentrancy attacks", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      // Normal staking should work
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // The nonReentrant modifier should prevent any reentrant calls
      expect(await staking.userTotalStaked(user1.address)).to.equal(stakeAmount);
    });
    
    it("Should validate input parameters", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      
      // Invalid period (too short)
      await expect(staking.connect(user1).stake(stakeAmount, 1))
        .to.be.revertedWith("GPRETStaking: Invalid lock period");
      
      // Invalid amount (zero)
      await expect(staking.connect(user1).stake(0, 7 * 24 * 60 * 60))
        .to.be.revertedWith("GPRETStaking: Amount must be greater than 0");
    });
    
    it("Should handle token transfer failures gracefully", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("20000"); // More than user has
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      
      // Should fail due to insufficient balance
      await expect(staking.connect(user1).stake(stakeAmount, lockPeriod))
        .to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
  
  // ============ Integration Tests ============
  
  describe("Integration Scenarios", function () {
    it("Should handle complex multi-user staking scenario", async function () {
      const { gpret, staking, user1, user2, user3 } = await loadFixture(deployStakingFixture);
      
      const stakeAmounts = [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("500")
      ];
      
      const lockPeriods = [
        7 * 24 * 60 * 60,    // 7 days
        30 * 24 * 60 * 60,   // 30 days
        365 * 24 * 60 * 60   // 365 days
      ];
      
      const users = [user1, user2, user3];
      
      // All users stake
      for (let i = 0; i < 3; i++) {
        await gpret.connect(users[i]).approve(staking.address, stakeAmounts[i]);
        await staking.connect(users[i]).stake(stakeAmounts[i], lockPeriods[i]);
      }
      
      // Check total stats
      const totalExpected = stakeAmounts[0].add(stakeAmounts[1]).add(stakeAmounts[2]);
      expect(await staking.totalStaked()).to.equal(totalExpected);
      expect(await staking.totalStakers()).to.equal(3);
      
      // Check individual governance weights
      expect(await staking.userGovernanceWeight(user1.address)).to.equal(stakeAmounts[0]); // 1.00x
      expect(await staking.userGovernanceWeight(user2.address)).to.equal(stakeAmounts[1].mul(110).div(100)); // 1.10x
      expect(await staking.userGovernanceWeight(user3.address)).to.equal(stakeAmounts[2].mul(200).div(100)); // 2.00x
    });
    
    it("Should handle sequential unstaking correctly", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("500");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      // Create 3 stakes
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(3));
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Fast forward
      await time.increase(lockPeriod + 1);
      
      // Unstake middle stake first
      await staking.connect(user1).unstake(1);
      
      expect(await staking.userTotalStaked(user1.address)).to.equal(stakeAmount.mul(2));
      
      // Unstake remaining stakes
      await staking.connect(user1).unstake(0);
      await staking.connect(user1).unstake(2);
      
      expect(await staking.userTotalStaked(user1.address)).to.equal(0);
      expect(await staking.totalStakers()).to.equal(0);
      
      // All tokens should be returned
      expect(await gpret.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("10000"));
    });
  });
  
  // ============ Edge Cases ============
  
  describe("Edge Cases", function () {
    it("Should handle maximum stake amounts", async function () {
      const { gpret, staking, owner } = await loadFixture(deployStakingFixture);
      
      const maxAmount = await gpret.totalSupply();
      const lockPeriod = 7 * 24 * 60 * 60;
      
      // Give owner all tokens and try to stake everything
      await gpret.connect(owner).approve(staking.address, maxAmount);
      
      await expect(staking.connect(owner).stake(maxAmount, lockPeriod))
        .to.emit(staking, "TokensStaked")
        .withArgs(owner.address, 0, maxAmount, lockPeriod, maxAmount);
      
      expect(await staking.totalStaked()).to.equal(maxAmount);
    });
    
    it("Should handle unstaking with zero balance edge case", async function () {
      const { gpret, staking, owner, user1 } = await loadFixture(deployStakingFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      
      // Transfer user's remaining tokens away
      const remainingBalance = await gpret.balanceOf(user1.address);
      await gpret.connect(user1).transfer(owner.address, remainingBalance);
      
      // Fast forward and unstake
      await time.increase(lockPeriod + 1);
      await staking.connect(user1).unstake(0);
      
      // User should get their staked tokens back
      expect(await gpret.balanceOf(user1.address)).to.equal(stakeAmount);
    });
  });
});