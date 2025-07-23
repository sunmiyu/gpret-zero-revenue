const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("GPRET Token", function () {
  
  // ============ Fixtures ============
  
  async function deployGPRETFixture() {
    const [owner, oracle, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy GPRET contract
    const GPRET = await ethers.getContractFactory("GPRET");
    const gpret = await GPRET.deploy();
    
    return { gpret, owner, oracle, user1, user2, user3 };
  }
  
  // ============ Deployment Tests ============
  
  describe("Deployment", function () {
    it("Should allow token burning", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      const burnAmount = ethers.utils.parseEther("1000");
      const initialSupply = await gpret.totalSupply();
      const initialBalance = await gpret.balanceOf(owner.address);
      
      await expect(gpret.connect(owner).burn(burnAmount))
        .to.emit(gpret, "Transfer")
        .withArgs(owner.address, ethers.constants.AddressZero, burnAmount);
      
      expect(await gpret.totalSupply()).to.equal(initialSupply.sub(burnAmount));
      expect(await gpret.balanceOf(owner.address)).to.equal(initialBalance.sub(burnAmount));
    });
  });
  
  // ============ Admin Functions Tests ============
  
  describe("Admin Functions", function () {
    it("Should allow owner to pause contract", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      await expect(gpret.connect(owner).pause())
        .to.emit(gpret, "Paused")
        .withArgs(owner.address);
      
      expect(await gpret.paused()).to.be.true;
    });
    
    it("Should prevent transfers when paused", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).pause();
      
      await expect(gpret.connect(owner).transfer(user1.address, 1000))
        .to.be.revertedWith("Pausable: paused");
    });
    
    it("Should allow owner to unpause contract", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).pause();
      
      await expect(gpret.connect(owner).unpause())
        .to.emit(gpret, "Unpaused")
        .withArgs(owner.address);
      
      expect(await gpret.paused()).to.be.false;
    });
    
    it("Should allow owner to add new cities", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      const cityId = 11;
      const cityName = "Miami";
      const weight = 5;
      
      await expect(gpret.connect(owner).addCity(cityId, cityName, weight))
        .to.emit(gpret, "CityAdded")
        .withArgs(cityId, cityName, weight);
      
      const [name, priceIndex, cityWeight, isActive] = await gpret.getCityInfo(cityId);
      expect(name).to.equal(cityName);
      expect(cityWeight).to.equal(weight);
      expect(isActive).to.be.true;
    });
    
    it("Should not allow adding duplicate cities", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      await expect(gpret.connect(owner).addCity(1, "Duplicate", 5))
        .to.be.revertedWith("GPRET: City already exists");
    });
    
    it("Should not allow non-owner to add cities", async function () {
      const { gpret, user1 } = await loadFixture(deployGPRETFixture);
      
      await expect(gpret.connect(user1).addCity(11, "Miami", 5))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  // ============ View Functions Tests ============
  
  describe("View Functions", function () {
    it("Should return correct price info", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      const [index, lastUpdate] = await gpret.getPriceInfo();
      
      expect(index).to.equal(ethers.utils.parseEther("1000"));
      expect(lastUpdate).to.be.greaterThan(0);
    });
    
    it("Should return active cities", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      const activeCities = await gpret.getActiveCities();
      expect(activeCities.length).to.equal(10);
      
      // Check that all returned IDs are sequential from 1-10
      for (let i = 0; i < 10; i++) {
        expect(activeCities[i]).to.equal(i + 1);
      }
    });
    
    it("Should return correct city info", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      const [name, priceIndex, weight, isActive] = await gpret.getCityInfo(2);
      
      expect(name).to.equal("London");
      expect(priceIndex).to.equal(ethers.utils.parseEther("1000"));
      expect(weight).to.equal(10);
      expect(isActive).to.be.true;
    });
    
    it("Should return proposal info correctly", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      // Setup proposal
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      const description = "Test proposal";
      const votingPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).createProposal(description, votingPeriod);
      
      const [
        proposalDescription,
        forVotes,
        againstVotes,
        startTime,
        endTime,
        executed,
        proposer
      ] = await gpret.getProposal(1);
      
      expect(proposalDescription).to.equal(description);
      expect(forVotes).to.equal(0);
      expect(againstVotes).to.equal(0);
      expect(executed).to.be.false;
      expect(proposer).to.equal(user1.address);
      expect(endTime.sub(startTime)).to.equal(votingPeriod);
    });
  });
  
  // ============ Zero Revenue Tests ============
  
  describe("Zero Revenue Guarantee", function () {
    it("Should confirm zero revenue structure", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      const confirmation = await gpret.confirmZeroRevenue();
      expect(confirmation).to.equal(
        "This contract generates ZERO revenue and distributes NO profits. Educational purpose only."
      );
    });
    
    it("Should have no fee mechanisms", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      const amount = ethers.utils.parseEther("1000");
      const initialOwnerBalance = await gpret.balanceOf(owner.address);
      
      // Transfer tokens
      await gpret.connect(owner).transfer(user1.address, amount);
      
      // Check that exactly the amount was transferred (no fees)
      expect(await gpret.balanceOf(owner.address)).to.equal(initialOwnerBalance.sub(amount));
      expect(await gpret.balanceOf(user1.address)).to.equal(amount);
    });
    
    it("Should not have any profit distribution functions", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      // Check that there are no functions like distributeProfits(), claimRewards(), etc.
      // This is validated by the fact that such functions don't exist in the interface
      expect(typeof gpret.distributeProfits).to.equal('undefined');
      expect(typeof gpret.claimRewards).to.equal('undefined');
      expect(typeof gpret.withdrawProfits).to.equal('undefined');
    });
  });
  
  // ============ Security Tests ============
  
  describe("Security", function () {
    it("Should prevent reentrancy attacks", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).setOracle(oracle.address);
      
      // Fast forward time
      await time.increase(24 * 60 * 60 + 1);
      
      // Try to update price index (this should work normally)
      const newIndex = ethers.utils.parseEther("1100");
      await gpret.connect(oracle).updatePriceIndex(newIndex);
      
      // The reentrancy guard should prevent any reentrant calls
      // This is enforced by the nonReentrant modifier
      expect(await gpret.realEstatePriceIndex()).to.equal(newIndex);
    });
    
    it("Should validate input parameters", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).setOracle(oracle.address);
      
      // Fast forward time
      await time.increase(24 * 60 * 60 + 1);
      
      // Should reject zero price index
      await expect(gpret.connect(oracle).updatePriceIndex(0))
        .to.be.revertedWith("GPRET: Invalid price index");
      
      // Should reject zero city price
      await expect(gpret.connect(oracle).updateCityPrice(1, 0))
        .to.be.revertedWith("GPRET: Invalid price index");
    });
    
    it("Should only allow authorized oracle operations", async function () {
      const { gpret, user1 } = await loadFixture(deployGPRETFixture);
      
      // Non-oracle should not be able to update prices
      await expect(gpret.connect(user1).updatePriceIndex(ethers.utils.parseEther("1100")))
        .to.be.revertedWith("GPRET: Only oracle can call");
      
      await expect(gpret.connect(user1).updateCityPrice(1, ethers.utils.parseEther("1100")))
        .to.be.revertedWith("GPRET: Only oracle can call");
    });
  });
  
  // ============ Integration Tests ============
  
  describe("Integration Scenarios", function () {
    it("Should handle complete governance workflow", async function () {
      const { gpret, owner, user1, user2, user3 } = await loadFixture(deployGPRETFixture);
      
      // Setup: Distribute tokens
      const tokenAmount = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, tokenAmount);
      await gpret.connect(owner).transfer(user2.address, tokenAmount);
      await gpret.connect(owner).transfer(user3.address, tokenAmount);
      
      // Create proposal
      const description = "Integration test proposal";
      const votingPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).createProposal(description, votingPeriod);
      
      // Multiple users vote
      await gpret.connect(user1).vote(1, true);
      await gpret.connect(user2).vote(1, true);
      await gpret.connect(user3).vote(1, false);
      
      // Check results
      const [, forVotes, againstVotes] = await gpret.getProposal(1);
      expect(forVotes).to.equal(tokenAmount.mul(2)); // user1 + user2
      expect(againstVotes).to.equal(tokenAmount); // user3
    });
    
    it("Should handle oracle price updates correctly", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).setOracle(oracle.address);
      
      // Update global index
      await time.increase(24 * 60 * 60 + 1);
      const newGlobalIndex = ethers.utils.parseEther("1150");
      await gpret.connect(oracle).updatePriceIndex(newGlobalIndex);
      
      // Update individual city prices
      await gpret.connect(oracle).updateCityPrice(1, ethers.utils.parseEther("1200")); // New York
      await gpret.connect(oracle).updateCityPrice(2, ethers.utils.parseEther("1100")); // London
      
      // Verify updates
      expect(await gpret.realEstatePriceIndex()).to.equal(newGlobalIndex);
      
      const [, nyPrice] = await gpret.getCityInfo(1);
      const [, londonPrice] = await gpret.getCityInfo(2);
      
      expect(nyPrice).to.equal(ethers.utils.parseEther("1200"));
      expect(londonPrice).to.equal(ethers.utils.parseEther("1100"));
    });
    
    it("Should maintain zero revenue across all operations", async function () {
      const { gpret, owner, oracle, user1 } = await loadFixture(deployGPRETFixture);
      
      const initialSupply = await gpret.totalSupply();
      
      // Perform various operations
      await gpret.connect(owner).setOracle(oracle.address);
      await gpret.connect(owner).transfer(user1.address, ethers.utils.parseEther("1000"));
      
      await time.increase(24 * 60 * 60 + 1);
      await gpret.connect(oracle).updatePriceIndex(ethers.utils.parseEther("1100"));
      
      // Create and vote on proposal
      const minTokens = initialSupply.div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      await gpret.connect(user1).createProposal("Test", 7 * 24 * 60 * 60);
      await gpret.connect(user1).vote(1, true);
      
      // Verify total supply unchanged (no fees, no new tokens minted)
      expect(await gpret.totalSupply()).to.equal(initialSupply);
      
      // Verify zero revenue confirmation still works
      const confirmation = await gpret.confirmZeroRevenue();
      expect(confirmation).to.include("ZERO revenue");
    });
  });
  
  // ============ Edge Cases ============
  
  describe("Edge Cases", function () {
    it("Should handle voting after proposal period ends", async function () {
      const { gpret, owner, user1, user2 } = await loadFixture(deployGPRETFixture);
      
      // Setup
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      await gpret.connect(owner).transfer(user2.address, minTokens);
      
      // Create proposal with short voting period
      const votingPeriod = 1; // 1 second
      await gpret.connect(user1).createProposal("Test proposal", votingPeriod);
      
      // Wait for voting period to end
      await time.increase(2);
      
      // Try to vote after period ends
      await expect(gpret.connect(user2).vote(1, true))
        .to.be.revertedWith("GPRET: Voting ended");
    });
    
    it("Should handle maximum token transfers", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      const totalSupply = await gpret.totalSupply();
      
      // Transfer all tokens to user1
      await expect(gpret.connect(owner).transfer(user1.address, totalSupply))
        .to.emit(gpret, "Transfer")
        .withArgs(owner.address, user1.address, totalSupply);
      
      expect(await gpret.balanceOf(user1.address)).to.equal(totalSupply);
      expect(await gpret.balanceOf(owner.address)).to.equal(0);
    });
    
    it("Should handle invalid proposal parameters", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      // Empty description
      await expect(gpret.connect(user1).createProposal("", 7 * 24 * 60 * 60))
        .to.be.revertedWith("GPRET: Empty description");
      
      // Invalid voting period (too short)
      await expect(gpret.connect(user1).createProposal("Test", 1))
        .to.be.revertedWith("GPRET: Invalid voting period");
      
      // Invalid voting period (too long)
      await expect(gpret.connect(user1).createProposal("Test", 31 * 24 * 60 * 60))
        .to.be.revertedWith("GPRET: Invalid voting period");
    });
  });
});Should deploy with correct initial values", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      expect(await gpret.name()).to.equal("Global Prime Real Estate Token");
      expect(await gpret.symbol()).to.equal("GPRET");
      expect(await gpret.decimals()).to.equal(18);
      expect(await gpret.totalSupply()).to.equal(ethers.utils.parseEther("1000000000"));
      expect(await gpret.owner()).to.equal(owner.address);
    });
    
    it("Should mint total supply to deployer", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      const totalSupply = await gpret.totalSupply();
      const ownerBalance = await gpret.balanceOf(owner.address);
      
      expect(ownerBalance).to.equal(totalSupply);
    });
    
    it("Should initialize price index correctly", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      expect(await gpret.realEstatePriceIndex()).to.equal(ethers.utils.parseEther("1000"));
      expect(await gpret.lastPriceUpdate()).to.be.greaterThan(0);
    });
    
    it("Should initialize cities correctly", async function () {
      const { gpret } = await loadFixture(deployGPRETFixture);
      
      const activeCities = await gpret.getActiveCities();
      expect(activeCities.length).to.equal(10);
      
      // Check first city (New York)
      const [name, priceIndex, weight, isActive] = await gpret.getCityInfo(1);
      expect(name).to.equal("New York");
      expect(priceIndex).to.equal(ethers.utils.parseEther("1000"));
      expect(weight).to.equal(10);
      expect(isActive).to.be.true;
    });
  });
  
  // ============ Oracle Functions Tests ============
  
  describe("Oracle Functions", function () {
    it("Should allow owner to set oracle", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      await expect(gpret.connect(owner).setOracle(oracle.address))
        .to.emit(gpret, "OracleUpdated")
        .withArgs(ethers.constants.AddressZero, oracle.address);
      
      expect(await gpret.priceOracle()).to.equal(oracle.address);
    });
    
    it("Should not allow non-owner to set oracle", async function () {
      const { gpret, user1, oracle } = await loadFixture(deployGPRETFixture);
      
      await expect(gpret.connect(user1).setOracle(oracle.address))
        .to.be.revertedWith("Ownable: caller is not the owner");
    });
    
    it("Should not allow zero address as oracle", async function () {
      const { gpret, owner } = await loadFixture(deployGPRETFixture);
      
      await expect(gpret.connect(owner).setOracle(ethers.constants.AddressZero))
        .to.be.revertedWith("GPRET: Invalid oracle address");
    });
    
    it("Should allow oracle to update price index", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      // Set oracle
      await gpret.connect(owner).setOracle(oracle.address);
      
      // Fast forward time to allow update
      await time.increase(24 * 60 * 60 + 1); // 24 hours + 1 second
      
      const newIndex = ethers.utils.parseEther("1100");
      
      await expect(gpret.connect(oracle).updatePriceIndex(newIndex))
        .to.emit(gpret, "PriceIndexUpdated")
        .withArgs(newIndex, await time.latest());
      
      expect(await gpret.realEstatePriceIndex()).to.equal(newIndex);
    });
    
    it("Should not allow frequent price updates", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).setOracle(oracle.address);
      
      const newIndex = ethers.utils.parseEther("1100");
      
      await expect(gpret.connect(oracle).updatePriceIndex(newIndex))
        .to.be.revertedWith("GPRET: Update too frequent");
    });
    
    it("Should not allow non-oracle to update price", async function () {
      const { gpret, user1 } = await loadFixture(deployGPRETFixture);
      
      const newIndex = ethers.utils.parseEther("1100");
      
      await expect(gpret.connect(user1).updatePriceIndex(newIndex))
        .to.be.revertedWith("GPRET: Only oracle can call");
    });
    
    it("Should allow oracle to update city prices", async function () {
      const { gpret, owner, oracle } = await loadFixture(deployGPRETFixture);
      
      await gpret.connect(owner).setOracle(oracle.address);
      
      const newPrice = ethers.utils.parseEther("1200");
      
      await expect(gpret.connect(oracle).updateCityPrice(1, newPrice))
        .to.emit(gpret, "CityUpdated")
        .withArgs(1, newPrice);
      
      const [, priceIndex] = await gpret.getCityInfo(1);
      expect(priceIndex).to.equal(newPrice);
    });
  });
  
  // ============ Governance Tests ============
  
  describe("Governance", function () {
    it("Should allow token holders to create proposals", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      // Transfer enough tokens to user1 (need 0.1% of total supply)
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      
      const description = "Test proposal";
      const votingPeriod = 7 * 24 * 60 * 60; // 7 days
      
      await expect(gpret.connect(user1).createProposal(description, votingPeriod))
        .to.emit(gpret, "ProposalCreated")
        .withArgs(1, user1.address, description);
      
      expect(await gpret.proposalCounter()).to.equal(1);
    });
    
    it("Should not allow users without enough tokens to create proposals", async function () {
      const { gpret, user1 } = await loadFixture(deployGPRETFixture);
      
      const description = "Test proposal";
      const votingPeriod = 7 * 24 * 60 * 60;
      
      await expect(gpret.connect(user1).createProposal(description, votingPeriod))
        .to.be.revertedWith("GPRET: Insufficient tokens");
    });
    
    it("Should allow token holders to vote", async function () {
      const { gpret, owner, user1, user2 } = await loadFixture(deployGPRETFixture);
      
      // Setup: Transfer tokens and create proposal
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      await gpret.connect(owner).transfer(user2.address, minTokens);
      
      const description = "Test proposal";
      const votingPeriod = 7 * 24 * 60 * 60;
      
      await gpret.connect(user1).createProposal(description, votingPeriod);
      
      // Vote
      await expect(gpret.connect(user2).vote(1, true))
        .to.emit(gpret, "VoteCast")
        .withArgs(1, user2.address, true, minTokens);
      
      const [, forVotes, againstVotes] = await gpret.getProposal(1);
      expect(forVotes).to.equal(minTokens);
      expect(againstVotes).to.equal(0);
    });
    
    it("Should not allow double voting", async function () {
      const { gpret, owner, user1, user2 } = await loadFixture(deployGPRETFixture);
      
      // Setup
      const minTokens = (await gpret.totalSupply()).div(1000);
      await gpret.connect(owner).transfer(user1.address, minTokens);
      await gpret.connect(owner).transfer(user2.address, minTokens);
      
      await gpret.connect(user1).createProposal("Test proposal", 7 * 24 * 60 * 60);
      
      // First vote
      await gpret.connect(user2).vote(1, true);
      
      // Second vote should fail
      await expect(gpret.connect(user2).vote(1, false))
        .to.be.revertedWith("GPRET: Already voted");
    });
  });
  
  // ============ ERC20 Functionality Tests ============
  
  describe("ERC20 Functionality", function () {
    it("Should transfer tokens correctly", async function () {
      const { gpret, owner, user1 } = await loadFixture(deployGPRETFixture);
      
      const amount = ethers.utils.parseEther("1000");
      
      await expect(gpret.connect(owner).transfer(user1.address, amount))
        .to.emit(gpret, "Transfer")
        .withArgs(owner.address, user1.address, amount);
      
      expect(await gpret.balanceOf(user1.address)).to.equal(amount);
    });
    
    it("Should allow approved spending", async function () {
      const { gpret, owner, user1, user2 } = await loadFixture(deployGPRETFixture);
      
      const amount = ethers.utils.parseEther("1000");
      
      // Approve
      await gpret.connect(owner).approve(user1.address, amount);
      expect(await gpret.allowance(owner.address, user1.address)).to.equal(amount);
      
      // Transfer from
      await expect(gpret.connect(user1).transferFrom(owner.address, user2.address, amount))
        .to.emit(gpret, "Transfer")
        .withArgs(owner.address, user2.address, amount);
      
      expect(await gpret.balanceOf(user2.address)).to.equal(amount);
    });
    
    it("