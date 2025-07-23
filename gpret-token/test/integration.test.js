// Check balances
      expect(await gpret.balanceOf(user1.address)).to.equal(initialBalance.sub(stakeAmount));
      expect(await gpret.balanceOf(staking.address)).to.equal(stakeAmount);
      expect(await staking.totalStaked()).to.equal(stakeAmount);
      
      // Unstake after lock period
      await time.increase(7 * 24 * 60 * 60 + 1);
      await staking.connect(user1).unstake(0);
      
      // Verify balance restoration
      expect(await gpret.balanceOf(user1.address)).to.equal(initialBalance);
      expect(await gpret.balanceOf(staking.address)).to.equal(0);
      expect(await staking.totalStaked()).to.equal(0);
    });
  });
  
  // ============ Multi-User Governance Tests ============
  
  describe("Complex Governance Scenarios", function () {
    it("Should handle large-scale voting with multiple proposals", async function () {
      const { gpret, staking, owner, user1, user2, user3, user4, user5 } = await loadFixture(deployFullSystemFixture);
      
      // Setup: Give users tokens and create stakes for governance weight
      const users = [user1, user2, user3, user4, user5];
      const stakeAmounts = [
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("2000"),
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("1500"),
        ethers.utils.parseEther("800")
      ];
      
      // Users stake with different periods for different weights
      for (let i = 0; i < users.length; i++) {
        const period = [7, 30, 90, 180, 365][i] * 24 * 60 * 60;
        await gpret.connect(users[i]).approve(staking.address, stakeAmounts[i]);
        await staking.connect(users[i]).stake(stakeAmounts[i], period);
      }
      
      // Give users minimum tokens to create proposals
      const minTokens = (await gpret.totalSupply()).div(1000);
      for (const user of users) {
        await gpret.connect(owner).transfer(user.address, minTokens);
      }
      
      // Create multiple proposals
      const proposals = [
        "Add Dubai as new tracked city",
        "Update oracle data sources",
        "Modify governance voting period"
      ];
      
      for (let i = 0; i < 3; i++) {
        await gpret.connect(users[i]).createProposal(proposals[i], 7 * 24 * 60 * 60);
      }
      
      // Complex voting patterns
      // Proposal 1: 3 for, 2 against
      await gpret.connect(user1).vote(1, true);
      await gpret.connect(user2).vote(1, true);
      await gpret.connect(user3).vote(1, true);
      await gpret.connect(user4).vote(1, false);
      await gpret.connect(user5).vote(1, false);
      
      // Proposal 2: 2 for, 3 against
      await gpret.connect(user1).vote(2, false);
      await gpret.connect(user2).vote(2, false);
      await gpret.connect(user3).vote(2, false);
      await gpret.connect(user4).vote(2, true);
      await gpret.connect(user5).vote(2, true);
      
      // Proposal 3: Mixed voting
      await gpret.connect(user1).vote(3, true);
      await gpret.connect(user2).vote(3, false);
      await gpret.connect(user3).vote(3, true);
      // user4 and user5 don't vote
      
      // Verify voting results
      const [, proposal1For, proposal1Against] = await gpret.getProposal(1);
      const [, proposal2For, proposal2Against] = await gpret.getProposal(2);
      const [, proposal3For, proposal3Against] = await gpret.getProposal(3);
      
      // Calculate expected votes (balance at time of voting)
      const user1Balance = await gpret.balanceOf(user1.address);
      const user2Balance = await gpret.balanceOf(user2.address);
      const user3Balance = await gpret.balanceOf(user3.address);
      const user4Balance = await gpret.balanceOf(user4.address);
      const user5Balance = await gpret.balanceOf(user5.address);
      
      expect(proposal1For).to.equal(user1Balance.add(user2Balance).add(user3Balance));
      expect(proposal1Against).to.equal(user4Balance.add(user5Balance));
      
      expect(proposal2For).to.equal(user4Balance.add(user5Balance));
      expect(proposal2Against).to.equal(user1Balance.add(user2Balance).add(user3Balance));
      
      expect(proposal3For).to.equal(user1Balance.add(user3Balance));
      expect(proposal3Against).to.equal(user2Balance);
    });
    
    it("Should prevent double voting across multiple proposals", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployFullSystemFixture);
      
      // Setup user with proposal creation ability
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens.mul(2));
      
      // Create two proposals
      await gpret.connect(user1).createProposal("Proposal 1", 7 * 24 * 60 * 60);
      await gpret.connect(user1).createProposal("Proposal 2", 7 * 24 * 60 * 60);
      
      // User can vote on both proposals (different proposals)
      await expect(gpret.connect(user1).vote(1, true)).to.not.be.reverted;
      await expect(gpret.connect(user1).vote(2, false)).to.not.be.reverted;
      
      // But cannot vote twice on same proposal
      await expect(gpret.connect(user1).vote(1, false))
        .to.be.revertedWith("GPRET: Already voted");
    });
    
    it("Should handle governance with staking weights correctly", async function () {
      const { gpret, staking, owner, user1, user2, user3 } = await loadFixture(deployFullSystemFixture);
      
      // Users stake with different periods for different governance weights
      const baseAmount = ethers.utils.parseEther("1000");
      
      await gpret.connect(user1).approve(staking.address, baseAmount);
      await gpret.connect(user2).approve(staking.address, baseAmount);
      await gpret.connect(user3).approve(staking.address, baseAmount);
      
      // Different staking periods = different governance influence
      await staking.connect(user1).stake(baseAmount, 7 * 24 * 60 * 60);    // 1.00x weight
      await staking.connect(user2).stake(baseAmount, 90 * 24 * 60 * 60);   // 1.25x weight  
      await staking.connect(user3).stake(baseAmount, 365 * 24 * 60 * 60);  // 2.00x weight
      
      // Give proposal creation ability
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      // Create proposal
      await gpret.connect(user1).createProposal("Test staking governance", 7 * 24 * 60 * 60);
      
      // All vote "for" - but their token balances determine vote weight, not staking weight
      const user1Balance = await gpret.balanceOf(user1.address);
      const user2Balance = await gpret.balanceOf(user2.address);  
      const user3Balance = await gpret.balanceOf(user3.address);
      
      await gpret.connect(user1).vote(1, true);
      await gpret.connect(user2).vote(1, true);
      await gpret.connect(user3).vote(1, true);
      
      const [, forVotes] = await gpret.getProposal(1);
      const expectedVotes = user1Balance.add(user2Balance).add(user3Balance);
      
      expect(forVotes).to.equal(expectedVotes);
      
      // Verify staking weights are separate from voting weights
      expect(await staking.userGovernanceWeight(user1.address)).to.equal(baseAmount);
      expect(await staking.userGovernanceWeight(user2.address)).to.equal(baseAmount.mul(125).div(100));
      expect(await staking.userGovernanceWeight(user3.address)).to.equal(baseAmount.mul(2));
    });
  });
  
  // ============ Oracle-Governance Integration Tests ============
  
  describe("Oracle and Governance Integration", function () {
    it("Should allow governance to propose oracle changes", async function () {
      const { gpret, oracle, owner, user1, user2 } = await loadFixture(deployFullSystemFixture);
      
      // Setup governance participants
      const minTokens = (await gpret.totalSupply()).div(500); // 0.2% for stronger voting power
      await gpret.connect(owner).transfer(user1.address, minTokens);
      await gpret.connect(owner).transfer(user2.address, minTokens);
      
      // Current oracle
      expect(await gpret.priceOracle()).to.equal(oracle.address);
      
      // Create proposal to change oracle policy
      const proposalDescription = "Update oracle data source validation criteria";
      await gpret.connect(user1).createProposal(proposalDescription, 7 * 24 * 60 * 60);
      
      // Community votes
      await gpret.connect(user1).vote(1, true);
      await gpret.connect(user2).vote(1, true);
      
      // Check proposal passed with community support
      const [, forVotes, againstVotes] = await gpret.getProposal(1);
      expect(forVotes).to.be.greaterThan(againstVotes);
      expect(forVotes).to.equal(minTokens.mul(2)); // Both users voted for
      
      // Oracle continues to function during governance
      await time.increase(24 * 60 * 60 + 1);
      const newIndex = ethers.utils.parseEther("1050");
      
      await expect(gpret.connect(oracle).updatePriceIndex(newIndex))
        .to.emit(gpret, "PriceIndexUpdated")
        .withArgs(newIndex, await time.latest());
    });
    
    it("Should maintain oracle functionality during governance votes", async function () {
      const { gpret, oracle, owner, user1 } = await loadFixture(deployFullSystemFixture);
      
      // Start governance process
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      await gpret.connect(user1).createProposal("Add new price validation", 7 * 24 * 60 * 60);
      
      // Oracle updates during governance (should work normally)
      await time.increase(24 * 60 * 60 + 1);
      
      // Update global index
      await gpret.connect(oracle).updatePriceIndex(ethers.utils.parseEther("1100"));
      
      // Update individual cities
      await gpret.connect(oracle).updateCityPrice(1, ethers.utils.parseEther("1200"));
      await gpret.connect(oracle).updateCityPrice(2, ethers.utils.parseEther("1050"));
      
      // Vote on proposal
      await gpret.connect(user1).vote(1, true);
      
      // Oracle can still update after voting
      await time.increase(24 * 60 * 60 + 1);
      await gpret.connect(oracle).updateCityPrice(3, ethers.utils.parseEther("950"));
      
      // Verify all updates worked
      expect(await gpret.realEstatePriceIndex()).to.equal(ethers.utils.parseEther("1100"));
      
      const [, nyPrice] = await gpret.getCityInfo(1);
      const [, londonPrice] = await gpret.getCityInfo(2);
      const [, tokyoPrice] = await gpret.getCityInfo(3);
      
      expect(nyPrice).to.equal(ethers.utils.parseEther("1200"));
      expect(londonPrice).to.equal(ethers.utils.parseEther("1050"));
      expect(tokyoPrice).to.equal(ethers.utils.parseEther("950"));
    });
  });
  
  // ============ Stress Tests ============
  
  describe("System Stress Tests", function () {
    it("Should handle maximum concurrent operations", async function () {
      const { gpret, staking, oracle, owner, user1, user2, user3, user4, user5 } = await loadFixture(deployFullSystemFixture);
      
      const users = [user1, user2, user3, user4, user5];
      const stakeAmount = ethers.utils.parseEther("800");
      
      // All users stake simultaneously with different periods
      const periods = [7, 30, 90, 180, 365].map(days => days * 24 * 60 * 60);
      
      for (let i = 0; i < users.length; i++) {
        await gpret.connect(users[i]).approve(staking.address, stakeAmount);
        await staking.connect(users[i]).stake(stakeAmount, periods[i]);
      }
      
      // Give users proposal power
      const minTokens = (await gpret.totalSupply()).div(1000);
      for (const user of users) {
        await gpret.connect(owner).transfer(user.address, minTokens);
      }
      
      // Create multiple proposals
      const proposals = [
        "Add new city: Dubai",
        "Update oracle frequency",
        "Modify governance parameters",
        "Add new staking periods",
        "Update city weights"
      ];
      
      for (let i = 0; i < proposals.length; i++) {
        await gpret.connect(users[i]).createProposal(proposals[i], 7 * 24 * 60 * 60);
      }
      
      // Everyone votes on all proposals
      for (let proposalId = 1; proposalId <= 5; proposalId++) {
        for (let userIndex = 0; userIndex < users.length; userIndex++) {
          const support = (userIndex + proposalId) % 2 === 0; // Mixed voting pattern
          await gpret.connect(users[userIndex]).vote(proposalId, support);
        }
      }
      
      // Oracle updates during chaos
      await time.increase(24 * 60 * 60 + 1);
      await gpret.connect(oracle).updatePriceIndex(ethers.utils.parseEther("1300"));
      
      // Mass unstaking (for eligible stakes)
      await time.increase(7 * 24 * 60 * 60 + 1); // Wait for shortest lock period
      
      await staking.connect(user1).unstake(0); // user1 had 7-day period
      
      // Verify system integrity
      expect(await staking.totalStakers()).to.equal(4); // 4 users still staking
      expect(await gpret.proposalCounter()).to.equal(5); // All proposals created
      expect(await gpret.realEstatePriceIndex()).to.equal(ethers.utils.parseEther("1300"));
    });
    
    it("Should maintain accuracy under rapid state changes", async function () {
      const { gpret, staking, oracle, user1, user2 } = await loadFixture(deployFullSystemFixture);
      
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Rapid staking and unstaking
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(3));
      
      // Create multiple stakes rapidly
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);
      
      expect(await staking.userTotalStaked(user1.address)).to.equal(stakeAmount.mul(3));
      
      // Rapid oracle updates
      await time.increase(24 * 60 * 60 + 1);
      
      for (let i = 1; i <= 10; i++) {
        const newPrice = ethers.utils.parseEther((1000 + i * 10).toString());
        await gpret.connect(oracle).updateCityPrice(i, newPrice);
      }
      
      await gpret.connect(oracle).updatePriceIndex(ethers.utils.parseEther("1200"));
      
      // Rapid unstaking
      await time.increase(7 * 24 * 60 * 60 + 1);
      
      await staking.connect(user1).unstake(0);
      await staking.connect(user1).unstake(1);
      await staking.connect(user1).unstake(2);
      
      // Verify final state consistency
      expect(await staking.userTotalStaked(user1.address)).to.equal(0);
      expect(await staking.totalStaked()).to.equal(0);
      expect(await gpret.realEstatePriceIndex()).to.equal(ethers.utils.parseEther("1200"));
      expect(await gpret.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("5000")); // Original amount
    });
  });
  
  // ============ Zero Revenue Validation ============
  
  describe("Complete Zero Revenue Validation", function () {
    it("Should maintain zero revenue across all system interactions", async function () {
      const { gpret, staking, oracle, owner, user1, user2 } = await loadFixture(deployFullSystemFixture);
      
      const initialTotalSupply = await gpret.totalSupply();
      const user1InitialBalance = await gpret.balanceOf(user1.address);
      const user2InitialBalance = await gpret.balanceOf(user2.address);
      
      // Complete user journey with all features
      
      // 1. Staking
      const stakeAmount = ethers.utils.parseEther("1000");
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await gpret.connect(user2).approve(staking.address, stakeAmount);
      
      await staking.connect(user1).stake(stakeAmount, 30 * 24 * 60 * 60);
      await staking.connect(user2).stake(stakeAmount, 90 * 24 * 60 * 60);
      
      // 2. Governance participation
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      await gpret.connect(user1).createProposal("Zero revenue validation test", 7 * 24 * 60 * 60);
      await gpret.connect(user1).vote(1, true);
      await gpret.connect(user2).vote(1, false);
      
      // 3. Oracle operations
      await time.increase(24 * 60 * 60 + 1);
      await gpret.connect(oracle).updatePriceIndex(ethers.utils.parseEther("1150"));
      await gpret.connect(oracle).updateCityPrice(1, ethers.utils.parseEther("1250"));
      
      // 4. Token transfers
      const transferAmount = ethers.utils.parseEther("500");
      await gpret.connect(user1).transfer(user2.address, transferAmount);
      
      // 5. Unstaking
      await time.increase(30 * 24 * 60 * 60 + 1);
      await staking.connect(user1).unstake(0);
      
      await time.increase(60 * 24 * 60 * 60 + 1);
      await staking.connect(user2).unstake(0);
      
      // ============ ZERO REVENUE VERIFICATION ============
      
      // Total supply must remain exactly the same (no new tokens minted as rewards)
      expect(await gpret.totalSupply()).to.equal(initialTotalSupply);
      
      // User balances: only transfers should affect them, no rewards
      const user1FinalBalance = await gpret.balanceOf(user1.address);
      const user2FinalBalance = await gpret.balanceOf(user2.address);
      
      const expectedUser1Balance = user1InitialBalance.add(minTokens).sub(transferAmount);
      const expectedUser2Balance = user2InitialBalance.add(transferAmount);
      
      expect(user1FinalBalance).to.equal(expectedUser1Balance);
      expect(user2FinalBalance).to.equal(expectedUser2Balance);
      
      // No accumulated fees anywhere
      expect(await gpret.balanceOf(staking.address)).to.equal(0);
      expect(await gpret.balanceOf(gpret.address)).to.equal(0);
      
      // Staking APY must be 0
      expect(await staking.getAPY()).to.equal(0);
      
      // Confirm zero revenue messages
      expect(await gpret.confirmZeroRevenue()).to.include("ZERO revenue");
      expect(await staking.confirmZeroRewards()).to.include("ZERO financial rewards");
    });
    
    it("Should have no hidden profit mechanisms", async function () {
      const { gpret, staking } = await loadFixture(deployFullSystemFixture);
      
      // Verify contracts have no profit-generating functions
      expect(typeof gpret.distributeProfits).to.equal('undefined');
      expect(typeof gpret.claimRewards).to.equal('undefined');
      expect(typeof gpret.withdrawProfits).to.equal('undefined');
      expect(typeof gpret.collectFees).to.equal('undefined');
      
      expect(typeof staking.claimRewards).to.equal('undefined');
      expect(typeof staking.distributeProfits).to.equal('undefined');
      expect(typeof staking.calculateRewards).to.equal('undefined');
      expect(typeof staking.pendingRewards).to.equal('undefined');
      
      // Verify zero revenue confirmations
      const gpretConfirmation = await gpret.confirmZeroRevenue();
      const stakingConfirmation = await staking.confirmZeroRewards();
      
      expect(gpretConfirmation).to.equal(
        "This contract generates ZERO revenue and distributes NO profits. Educational purpose only."
      );
      expect(stakingConfirmation).to.equal(
        "This staking system provides ZERO financial rewards. Community participation only."
      );
      
      // APY always zero
      expect(await staking.getAPY()).to.equal(0);
    });
  });
  
  // ============ Edge Cases and Error Handling ============
  
  describe("System Edge Cases", function () {
    it("Should handle contract interactions with zero balances", async function () {
      const { gpret, staking, owner, user1 } = await loadFixture(deployFullSystemFixture);
      
      // Transfer all user tokens away
      const userBalance = await gpret.balanceOf(user1.address);
      await gpret.connect(user1).transfer(owner.address, userBalance);
      
      expect(await gpret.balanceOf(user1.address)).to.equal(0);
      
      // Try to stake with zero balance - should fail
      await expect(staking.connect(user1).stake(1000, 7 * 24 * 60 * 60))
        .to.be.reverted; // Will fail on transfer
      
      // Try to create proposal with zero balance - should fail
      await expect(gpret.connect(user1).createProposal("Test", 7 * 24 * 60 * 60))
        .to.be.revertedWith("GPRET: Insufficient tokens");
      
      // Try to vote with zero balance - should fail
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      await gpret.connect(user1).createProposal("Test", 7 * 24 * 60 * 60);
      
      // Transfer tokens away again
      await gpret.connect(user1).transfer(owner.address, minTokens);
      
      await expect(gpret.connect(user1).vote(1, true))
        .to.be.revertedWith("GPRET: No voting power");
    });
    
    it("Should handle maximum values correctly", async function () {
      const { gpret, staking, oracle, owner } = await loadFixture(deployFullSystemFixture);
      
      // Test with maximum possible values
      const maxUint256 = ethers.constants.MaxUint256;
      
      // Oracle price updates with very large numbers
      await time.increase(24 * 60 * 60 + 1);
      
      // Should not overflow with reasonable large numbers
      const largePrice = ethers.utils.parseEther("1000000"); // 1M per sqm
      await gpret.connect(oracle).updatePriceIndex(largePrice);
      await gpret.connect(oracle).updateCityPrice(1, largePrice);
      
      expect(await gpret.realEstatePriceIndex()).to.equal(largePrice);
      
      // Test staking with large amounts (up to total supply)
      const totalSupply = await gpret.totalSupply();
      
      await gpret.connect(owner).approve(staking.address, totalSupply);
      await staking.connect(owner).stake(totalSupply, 7 * 24 * 60 * 60);
      
      expect(await staking.userTotalStaked(owner.address)).to.equal(totalSupply);
      expect(await staking.totalStaked()).to.equal(totalSupply);
    });
  });
  
  // ============ Future Compatibility Tests ============
  
  describe("Future Upgrade Compatibility", function () {
    it("Should maintain state consistency for future upgrades", async function () {
      const { gpret, staking, oracle, owner, user1 } = await loadFixture(deployFullSystemFixture);
      
      // Create complex state that future upgrades must preserve
      
      // 1. Multiple stakes with different periods
      const stakeAmount = ethers.utils.parseEther("500");
      await gpret.connect(user1).approve(staking.address, stakeAmount.mul(3));
      
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);
      await staking.connect(user1).stake(stakeAmount, 90 * 24 * 60 * 60);
      await staking.connect(user1).stake(stakeAmount, 365 * 24 * 60 * 60);
      
      // 2. Governance proposals with votes
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      await gpret.connect(user1).createProposal("Future compatibility test", 7 * 24 * 60 * 60);
      await gpret.connect(user1).vote(1, true);
      
      // 3. Oracle state with updated prices
      await time.increase(24 * 60 * 60 + 1);
      await gpret.connect(oracle).updatePriceIndex(ethers.utils.parseEther("1100"));
      
      for (let i = 1; i <= 10; i++) {
        await gpret.connect(oracle).updateCityPrice(i, ethers.utils.parseEther((1000 + i * 50).toString()));
      }
      
      // 4. Multiple city additions
      await gpret.connect(owner).addCity(11, "Dubai", 5);
      await gpret.connect(owner).addCity(12, "Mumbai", 3);
      
      // Verify all state is preserved and accessible
      const [totalStaked, totalStakers] = await staking.getContractStats();
      expect(totalStaked).to.equal(stakeAmount.mul(3));
      expect(totalStakers).to.equal(1);
      
      const [description, forVotes] = await gpret.getProposal(1);
      expect(description).to.equal("Future compatibility test");
      expect(forVotes).to.be.greaterThan(0);
      
      const activeCities = await gpret.getActiveCities();
      expect(activeCities.length).to.equal(12); // Original 10 + 2 new
      
      expect(await gpret.realEstatePriceIndex()).to.equal(ethers.utils.parseEther("1100"));
    });
  });
});const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("GPRET Integration Tests", function () {
  
  // ============ Fixtures ============
  
  async function deployFullSystemFixture() {
    const [owner, oracle, user1, user2, user3, user4, user5] = await ethers.getSigners();
    
    // Deploy GPRET token
    const GPRET = await ethers.getContractFactory("GPRET");
    const gpret = await GPRET.deploy();
    
    // Deploy staking contract
    const GPRETStaking = await ethers.getContractFactory("GPRETStaking");
    const staking = await GPRETStaking.deploy(gpret.address);
    
    // Set oracle
    await gpret.connect(owner).setOracle(oracle.address);
    
    // Distribute tokens to users
    const userAmount = ethers.utils.parseEther("5000");
    for (const user of [user1, user2, user3, user4, user5]) {
      await gpret.connect(owner).transfer(user.address, userAmount);
    }
    
    return { gpret, staking, owner, oracle, user1, user2, user3, user4, user5 };
  }
  
  // ============ Full System Integration Tests ============
  
  describe("Complete Ecosystem Flow", function () {
    it("Should handle complete user journey: stake, vote, unstake", async function () {
      const { gpret, staking, owner, user1, user2 } = await loadFixture(deployFullSystemFixture);
      
      // Phase 1: Users stake tokens
      const stakeAmount = ethers.utils.parseEther("1000");
      const lockPeriod = 30 * 24 * 60 * 60; // 30 days
      
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await gpret.connect(user2).approve(staking.address, stakeAmount);
      
      await staking.connect(user1).stake(stakeAmount, lockPeriod);
      await staking.connect(user2).stake(stakeAmount, lockPeriod);
      
      // Phase 2: Create governance proposal
      const proposalDescription = "Integrate new city: Amsterdam";
      const votingPeriod = 7 * 24 * 60 * 60; // 7 days
      
      // Transfer enough tokens to create proposal
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      await expect(gpret.connect(user1).createProposal(proposalDescription, votingPeriod))
        .to.emit(gpret, "ProposalCreated")
        .withArgs(1, user1.address, proposalDescription);
      
      // Phase 3: Users vote on proposal
      await expect(gpret.connect(user1).vote(1, true))
        .to.emit(gpret, "VoteCast");
      
      await expect(gpret.connect(user2).vote(1, false))
        .to.emit(gpret, "VoteCast");
      
      // Phase 4: Check voting results
      const [, forVotes, againstVotes] = await gpret.getProposal(1);
      const user1Balance = await gpret.balanceOf(user1.address);
      const user2Balance = await gpret.balanceOf(user2.address);
      
      expect(forVotes).to.equal(user1Balance);
      expect(againstVotes).to.equal(user2Balance);
      
      // Phase 5: Unstake after lock period
      await time.increase(lockPeriod + 1);
      
      await expect(staking.connect(user1).unstake(0))
        .to.emit(staking, "TokensUnstaked");
        
      await expect(staking.connect(user2).unstake(0))
        .to.emit(staking, "TokensUnstaked");
      
      // Phase 6: Verify final state
      expect(await staking.totalStaked()).to.equal(0);
      expect(await staking.totalStakers()).to.equal(0);
    });
    
    it("Should handle oracle price updates with staking governance", async function () {
      const { gpret, staking, oracle, user1, user2 } = await loadFixture(deployFullSystemFixture);
      
      // Users stake tokens for governance weight
      const stakeAmount = ethers.utils.parseEther("2000");
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await gpret.connect(user2).approve(staking.address, stakeAmount);
      
      // Different lock periods = different governance weights
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);    // 1.00x weight
      await staking.connect(user2).stake(stakeAmount, 365 * 24 * 60 * 60);  // 2.00x weight
      
      // Oracle updates prices
      await time.increase(24 * 60 * 60 + 1); // Wait for oracle update window
      
      // Update global index
      const newGlobalIndex = ethers.utils.parseEther("1200");
      await expect(gpret.connect(oracle).updatePriceIndex(newGlobalIndex))
        .to.emit(gpret, "PriceIndexUpdated")
        .withArgs(newGlobalIndex, await time.latest());
      
      // Update city prices
      await gpret.connect(oracle).updateCityPrice(1, ethers.utils.parseEther("1300")); // New York
      await gpret.connect(oracle).updateCityPrice(2, ethers.utils.parseEther("1100")); // London
      
      // Verify price updates
      expect(await gpret.realEstatePriceIndex()).to.equal(newGlobalIndex);
      
      const [, nyPrice] = await gpret.getCityInfo(1);
      const [, londonPrice] = await gpret.getCityInfo(2);
      
      expect(nyPrice).to.equal(ethers.utils.parseEther("1300"));
      expect(londonPrice).to.equal(ethers.utils.parseEther("1100"));
      
      // Verify stakers have different governance weights
      const user1Weight = await staking.userGovernanceWeight(user1.address);
      const user2Weight = await staking.userGovernanceWeight(user2.address);
      
      expect(user1Weight).to.equal(stakeAmount); // 1.00x
      expect(user2Weight).to.equal(stakeAmount.mul(2)); // 2.00x
    });
  });
  
  // ============ Cross-Contract Interaction Tests ============
  
  describe("Token-Staking Integration", function () {
    it("Should track governance weight correctly across multiple stakes", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployFullSystemFixture);
      
      const amounts = [
        ethers.utils.parseEther("500"),
        ethers.utils.parseEther("1000"),
        ethers.utils.parseEther("1500")
      ];
      
      const periods = [
        7 * 24 * 60 * 60,    // 1.00x
        90 * 24 * 60 * 60,   // 1.25x
        365 * 24 * 60 * 60   // 2.00x
      ];
      
      const totalAmount = amounts.reduce((sum, amt) => sum.add(amt), ethers.utils.parseEther("0"));
      await gpret.connect(user1).approve(staking.address, totalAmount);
      
      // Create multiple stakes
      for (let i = 0; i < 3; i++) {
        await staking.connect(user1).stake(amounts[i], periods[i]);
      }
      
      // Calculate expected total governance weight
      const expectedWeight = amounts[0]                              // 500 * 1.00x
        .add(amounts[1].mul(125).div(100))                          // 1000 * 1.25x
        .add(amounts[2].mul(200).div(100));                         // 1500 * 2.00x
      
      expect(await staking.userGovernanceWeight(user1.address)).to.equal(expectedWeight);
      expect(await staking.userTotalStaked(user1.address)).to.equal(totalAmount);
    });
    
    it("Should maintain token balance consistency during staking operations", async function () {
      const { gpret, staking, user1 } = await loadFixture(deployFullSystemFixture);
      
      const initialBalance = await gpret.balanceOf(user1.address);
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Stake tokens
      await gpret.connect(user1).approve(staking.address, stakeAmount);
      await staking.connect(user1).stake(stakeAmount, 7 * 24 * 60 * 60);
      
      // Check balances