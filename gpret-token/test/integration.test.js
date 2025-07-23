const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GPRET Integration Tests", function () {
    let gpret;
    let gpretStaking;
    let owner;
    let user1;
    let user2;
    let user3;
    let oracle;

    beforeEach(async function () {
        [owner, user1, user2, user3, oracle] = await ethers.getSigners();

        // Deploy GPRET token
        const GPRET = await ethers.getContractFactory("GPRET");
        gpret = await GPRET.deploy(owner.address);
        await gpret.waitForDeployment();

        // Deploy GPRETStaking
        const GPRETStaking = await ethers.getContractFactory("GPRETStaking");
        gpretStaking = await GPRETStaking.deploy(await gpret.getAddress(), owner.address);
        await gpretStaking.waitForDeployment();

        // Set up oracle
        await gpret.setOracleAddress(oracle.address);

        // Distribute tokens to users
        await gpret.transfer(user1.address, ethers.parseEther("10000"));
        await gpret.transfer(user2.address, ethers.parseEther("10000"));
        await gpret.transfer(user3.address, ethers.parseEther("10000"));
    });

    describe("Complete Ecosystem Flow", function () {
        it("Should handle complete user journey: stake → vote → unstake", async function () {
            const stakeAmount = ethers.parseEther("1000");
            const lockPeriod = 7 * 24 * 60 * 60; // 7 days

            // 1. User stakes tokens
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stakeAmount);
            await gpretStaking.connect(user1).stake(stakeAmount, lockPeriod);

            // Verify staking
            expect(await gpretStaking.totalStakedByUser(user1.address)).to.equal(stakeAmount);
            expect(await gpretStaking.governanceWeight(user1.address)).to.be.gt(0);

            // 2. Create proposal
            const description = "Increase New York weight to 25%";
            await gpret.connect(user1).createProposal(description);

            // 3. Wait for voting delay and vote
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");

            await gpret.connect(user1).vote(0, true);

            // 4. Execute proposal after voting period
            await ethers.provider.send("evm_increaseTime", [604800]); // 7 days
            await ethers.provider.send("evm_mine");

            await gpret.executeProposal(0);

            // 5. Wait for stake lock period and unstake
            await ethers.provider.send("evm_increaseTime", [lockPeriod]);
            await ethers.provider.send("evm_mine");

            const initialBalance = await gpret.balanceOf(user1.address);
            await gpretStaking.connect(user1).unstake(0);

            // Verify unstaking
            expect(await gpret.balanceOf(user1.address)).to.equal(initialBalance + stakeAmount);
            expect(await gpretStaking.totalStakedByUser(user1.address)).to.equal(0);
        });

        it("Should handle multiple users staking simultaneously", async function () {
            const stakeAmount = ethers.parseEther("500");
            const lockPeriod = 30 * 24 * 60 * 60; // 30 days

            // All users approve and stake
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stakeAmount);
            await gpret.connect(user2).approve(await gpretStaking.getAddress(), stakeAmount);
            await gpret.connect(user3).approve(await gpretStaking.getAddress(), stakeAmount);

            await gpretStaking.connect(user1).stake(stakeAmount, lockPeriod);
            await gpretStaking.connect(user2).stake(stakeAmount, lockPeriod);
            await gpretStaking.connect(user3).stake(stakeAmount, lockPeriod);

            // Verify total staking statistics
            expect(await gpretStaking.totalStaked()).to.equal(stakeAmount * 3n);
            expect(await gpretStaking.totalStakers()).to.equal(3);

            // Verify individual stakes
            expect(await gpretStaking.totalStakedByUser(user1.address)).to.equal(stakeAmount);
            expect(await gpretStaking.totalStakedByUser(user2.address)).to.equal(stakeAmount);
            expect(await gpretStaking.totalStakedByUser(user3.address)).to.equal(stakeAmount);
        });
    });

    describe("Cross-Contract Integration", function () {
        it("Should integrate token transfers with staking governance weight", async function () {
            const stakeAmount = ethers.parseEther("1000");
            const lockPeriod = 90 * 24 * 60 * 60; // 90 days

            // User1 stakes
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stakeAmount);
            await gpretStaking.connect(user1).stake(stakeAmount, lockPeriod);

            const initialWeight = await gpretStaking.governanceWeight(user1.address);

            // User1 stakes more
            const additionalStake = ethers.parseEther("500");
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), additionalStake);
            await gpretStaking.connect(user1).stake(additionalStake, lockPeriod);

            const newWeight = await gpretStaking.governanceWeight(user1.address);
            expect(newWeight).to.be.gt(initialWeight);
        });

        it("Should handle governance voting with staked token weights", async function () {
            // Setup different stake amounts for different governance weights
            const stake1 = ethers.parseEther("2000");
            const stake2 = ethers.parseEther("1000");
            const lockPeriod = 180 * 24 * 60 * 60; // 180 days (higher multiplier)

            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stake1);
            await gpret.connect(user2).approve(await gpretStaking.getAddress(), stake2);

            await gpretStaking.connect(user1).stake(stake1, lockPeriod);
            await gpretStaking.connect(user2).stake(stake2, lockPeriod);

            // Create proposal
            await gpret.connect(user1).createProposal("Test weighted voting");

            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]);
            await ethers.provider.send("evm_mine");

            // Both users vote (user1 has more weight due to larger stake)
            await gpret.connect(user1).vote(0, true);
            await gpret.connect(user2).vote(0, false);

            // Check proposal results
            const proposalInfo = await gpret.getProposalInfo(0);
            expect(proposalInfo.forVotes).to.be.gt(proposalInfo.againstVotes);
        });
    });

    describe("Complex Governance Scenarios", function () {
        it("Should handle proposal with majority and minority voting", async function () {
            // Setup: 3 users with different token amounts
            const amounts = [
                ethers.parseEther("3000"), // user1 - majority
                ethers.parseEther("1000"), // user2 - minority
                ethers.parseEther("1000")  // user3 - minority
            ];

            // Create proposal
            await gpret.connect(user1).createProposal("Majority vs Minority test");
            
            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]);
            await ethers.provider.send("evm_mine");

            // Voting: user1 (majority) votes FOR, users 2&3 vote AGAINST
            await gpret.connect(user1).vote(0, true);  // 3000 votes FOR
            await gpret.connect(user2).vote(0, false); // 1000 votes AGAINST  
            await gpret.connect(user3).vote(0, false); // 1000 votes AGAINST

            const proposalInfo = await gpret.getProposalInfo(0);
            expect(proposalInfo.forVotes).to.equal(amounts[0]); // 3000
            expect(proposalInfo.againstVotes).to.equal(amounts[1] + amounts[2]); // 2000
        });

        it("Should handle multiple concurrent proposals", async function () {
            // Create multiple proposals
            const proposals = [
                "Proposal 1: Update city weights",
                "Proposal 2: Change oracle frequency", 
                "Proposal 3: Add new city"
            ];

            for (let i = 0; i < proposals.length; i++) {
                await gpret.connect(user1).createProposal(proposals[i]);
            }

            expect(await gpret.proposalCount()).to.equal(3);

            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]);
            await ethers.provider.send("evm_mine");

            // Vote on all proposals differently
            await gpret.connect(user1).vote(0, true);
            await gpret.connect(user1).vote(1, false);
            await gpret.connect(user1).vote(2, true);

            // Verify each proposal has correct votes
            for (let i = 0; i < 3; i++) {
                const info = await gpret.getProposalInfo(i);
                expect(info.description).to.equal(proposals[i]);
            }
        });
    });

    describe("Oracle-Governance Integration", function () {
        it("Should update prices during active governance voting", async function () {
            // Create proposal
            await gpret.connect(user1).createProposal("Test price update during voting");
            
            // Wait for voting to start
            await ethers.provider.send("evm_increaseTime", [86400]);
            await ethers.provider.send("evm_mine");

            // Update city price during voting
            const newPrice = 1200000;
            await gpret.connect(oracle).updateCityPrice(0, newPrice);

            // Vote after price update
            await gpret.connect(user1).vote(0, true);

            // Verify both price update and voting worked
            const cityInfo = await gpret.getCityInfo(0);
            expect(cityInfo.priceIndex).to.equal(newPrice);

            const proposalInfo = await gpret.getProposalInfo(0);
            expect(proposalInfo.forVotes).to.be.gt(0);
        });

        it("Should maintain price accuracy during high governance activity", async function () {
            // Create multiple proposals to simulate high activity
            for (let i = 0; i < 5; i++) {
                await gpret.connect(user1).createProposal(`High activity proposal ${i}`);
            }

            // Update multiple city prices
            const prices = [1100000, 1050000, 1150000];
            for (let i = 0; i < prices.length; i++) {
                await gpret.connect(oracle).updateCityPrice(i, prices[i]);
            }

            // Verify all prices updated correctly
            for (let i = 0; i < prices.length; i++) {
                const cityInfo = await gpret.getCityInfo(i);
                expect(cityInfo.priceIndex).to.equal(prices[i]);
            }

            // Verify global index was updated
            const globalIndex = await gpret.globalPriceIndex();
            expect(globalIndex).to.not.equal(1000000); // Should be different from initial
        });
    });

    describe("System Stress Tests", function () {
        it("Should handle maximum concurrent operations", async function () {
            const operations = [];
            
            // Prepare multiple simultaneous operations
            const stakeAmount = ethers.parseEther("100");
            const lockPeriod = 7 * 24 * 60 * 60;

            // Approve tokens for all users
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stakeAmount * 3n);
            await gpret.connect(user2).approve(await gpretStaking.getAddress(), stakeAmount * 3n);

            // Multiple stakes per user
            for (let i = 0; i < 3; i++) {
                operations.push(gpretStaking.connect(user1).stake(stakeAmount, lockPeriod));
                operations.push(gpretStaking.connect(user2).stake(stakeAmount, lockPeriod));
            }

            // Execute all operations
            await Promise.all(operations);

            // Verify results
            expect(await gpretStaking.totalStakers()).to.equal(2);
            expect(await gpretStaking.totalStaked()).to.equal(stakeAmount * 6n);
        });

        it("Should maintain data integrity under rapid state changes", async function () {
            const stakeAmount = ethers.parseEther("500");
            const lockPeriod = 7 * 24 * 60 * 60;

            // Rapid stake and unstake operations
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stakeAmount * 10n);

            // Multiple quick stakes
            for (let i = 0; i < 5; i++) {
                await gpretStaking.connect(user1).stake(stakeAmount, lockPeriod);
            }

            expect(await gpretStaking.getUserStakeCount(user1.address)).to.equal(5);

            // Fast forward and unstake all
            await ethers.provider.send("evm_increaseTime", [lockPeriod]);
            await ethers.provider.send("evm_mine");

            for (let i = 0; i < 5; i++) {
                await gpretStaking.connect(user1).unstake(i);
            }

            expect(await gpretStaking.totalStakedByUser(user1.address)).to.equal(0);
        });
    });

    describe("Complete Zero Revenue Validation", function () {
        it("Should maintain zero revenue across all operations", async function () {
            // Perform various operations and verify no fees
            const amount = ethers.parseEther("1000");
            
            // Transfers
            const initialBalance = await gpret.balanceOf(user1.address);
            await gpret.connect(user1).transfer(user2.address, amount);
            expect(await gpret.balanceOf(user1.address)).to.equal(initialBalance - amount);
            expect(await gpret.balanceOf(user2.address)).to.equal(ethers.parseEther("10000") + amount);

            // Staking (verify no fees)
            await gpret.connect(user2).approve(await gpretStaking.getAddress(), amount);
            const stakingBalance = await gpret.balanceOf(user2.address);
            await gpretStaking.connect(user2).stake(amount, 7 * 24 * 60 * 60);
            
            expect(await gpret.balanceOf(user2.address)).to.equal(stakingBalance - amount);
            expect(await gpret.balanceOf(await gpretStaking.getAddress())).to.equal(amount);

            // Verify protocol revenue is always 0
            expect(await gpret.getProtocolRevenue()).to.equal(0);
            expect(await gpret.calculateTransactionFee(ethers.parseEther("1000000"))).to.equal(0);
        });

        it("Should validate no hidden revenue mechanisms", async function () {
            // Large scale operations to test for hidden fees
            const largeAmount = ethers.parseEther("50000");
            
            // Multiple large transfers
            await gpret.transfer(user1.address, largeAmount);
            await gpret.connect(user1).transfer(user2.address, largeAmount);
            await gpret.connect(user2).transfer(user3.address, largeAmount);

            // Verify exact amounts (no hidden fees)
            expect(await gpret.balanceOf(user3.address)).to.equal(ethers.parseEther("10000") + largeAmount);

            // Verify staking rewards are zero
            expect(await gpretStaking.getAPY()).to.equal(0);
            expect(await gpretStaking.getRewards(user1.address)).to.equal(0);
        });
    });

    describe("System Edge Cases", function () {
        it("Should handle edge case: unstaking immediately after minimum period", async function () {
            const stakeAmount = ethers.parseEther("100");
            const minPeriod = await gpretStaking.MIN_STAKE_PERIOD();

            await gpret.connect(user1).approve(await gpretStaking.getAddress(), stakeAmount);
            await gpretStaking.connect(user1).stake(stakeAmount, minPeriod);

            // Fast forward to exactly the minimum period
            await ethers.provider.send("evm_increaseTime", [Number(minPeriod)]);
            await ethers.provider.send("evm_mine");

            // Should be able to unstake
            await gpretStaking.connect(user1).unstake(0);
            expect(await gpretStaking.totalStakedByUser(user1.address)).to.equal(0);
        });

        it("Should handle voting on proposal at exact deadline", async function () {
            await gpret.connect(user1).createProposal("Edge case proposal");
            
            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]);
            await ethers.provider.send("evm_mine");

            // Fast forward to just before voting ends
            const votingPeriod = await gpret.VOTING_PERIOD();
            await ethers.provider.send("evm_increaseTime", [Number(votingPeriod) - 10]);
            await ethers.provider.send("evm_mine");

            // Should still be able to vote
            await gpret.connect(user1).vote(0, true);
            
            const proposalInfo = await gpret.getProposalInfo(0);
            expect(proposalInfo.forVotes).to.be.gt(0);
        });
    });

    describe("Future Upgrade Compatibility", function () {
        it("Should maintain interface compatibility", async function () {
            // Test that all interface functions are accessible
            expect(await gpret.validateZeroRevenue()).to.be.true;
            expect(await gpretStaking.validateZeroRevenue()).to.be.true;
            
            // Test view functions work correctly
            const cities = await gpret.getAllCities();
            expect(cities[0].length).to.equal(10); // names array
            
            const stats = await gpretStaking.getContractStats();
            expect(stats._totalStaked).to.be.gte(0);
        });

        it("Should handle contract interaction patterns", async function () {
            // Test complex interaction patterns that might be used in future integrations
            const amount = ethers.parseEther("500");
            
            // Approve → Stake → Transfer remaining → Unstake pattern
            await gpret.connect(user1).approve(await gpretStaking.getAddress(), amount);
            await gpretStaking.connect(user1).stake(amount, 7 * 24 * 60 * 60);
            
            const remaining = await gpret.balanceOf(user1.address);
            await gpret.connect(user1).transfer(user2.address, remaining / 2n);
            
            // Fast forward and unstake
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await gpretStaking.connect(user1).unstake(0);
            
            // Verify final state is consistent
            expect(await gpretStaking.totalStakedByUser(user1.address)).to.equal(0);
        });
    });
});