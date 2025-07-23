const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GPRET Token", function () {
    let gpret;
    let gpretStaking;
    let owner;
    let addr1;
    let addr2;
    let oracle;

    beforeEach(async function () {
        [owner, addr1, addr2, oracle] = await ethers.getSigners();

        // Deploy GPRET token
        const GPRET = await ethers.getContractFactory("GPRET");
        gpret = await GPRET.deploy(owner.address);
        await gpret.waitForDeployment();

        // Deploy GPRETStaking
        const GPRETStaking = await ethers.getContractFactory("GPRETStaking");
        gpretStaking = await GPRETStaking.deploy(await gpret.getAddress(), owner.address);
        await gpretStaking.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should deploy with correct initial values", async function () {
            expect(await gpret.name()).to.equal("Global Prime Real Estate Token");
            expect(await gpret.symbol()).to.equal("GPRET");
            expect(await gpret.totalSupply()).to.equal(ethers.parseEther("1000000000"));
            expect(await gpret.owner()).to.equal(owner.address);
            expect(await gpret.globalPriceIndex()).to.equal(1000000);
            expect(await gpret.cityCount()).to.equal(10);
        });

        it("Should initialize cities correctly", async function () {
            const cityInfo = await gpret.getCityInfo(0);
            expect(cityInfo.name).to.equal("New York");
            expect(cityInfo.weight).to.equal(200000);
            expect(cityInfo.isActive).to.be.true;
        });

        it("Should validate zero revenue structure", async function () {
            expect(await gpret.validateZeroRevenue()).to.be.true;
            expect(await gpret.calculateTransactionFee(1000)).to.equal(0);
            expect(await gpret.getProtocolRevenue()).to.equal(0);
        });
    });

    describe("Oracle Functions", function () {
        beforeEach(async function () {
            await gpret.setOracleAddress(oracle.address);
        });

        it("Should set oracle address", async function () {
            expect(await gpret.oracleAddress()).to.equal(oracle.address);
        });

        it("Should update city price from oracle", async function () {
            const newPrice = 1100000;
            
            await expect(gpret.connect(oracle).updateCityPrice(0, newPrice))
                .to.emit(gpret, "CityUpdated")
                .withArgs(0, newPrice);

            const cityInfo = await gpret.getCityInfo(0);
            expect(cityInfo.priceIndex).to.equal(newPrice);
        });

        it("Should update global price index", async function () {
            const initialIndex = await gpret.globalPriceIndex();
            
            await gpret.connect(oracle).updateCityPrice(0, 1100000);
            
            const newIndex = await gpret.globalPriceIndex();
            expect(newIndex).to.not.equal(initialIndex);
        });

        it("Should only allow oracle to update prices", async function () {
            await expect(gpret.connect(addr1).updateCityPrice(0, 1100000))
                .to.be.revertedWith("Only oracle can update prices");
        });

        it("Should reject invalid city IDs", async function () {
            await expect(gpret.connect(oracle).updateCityPrice(99, 1100000))
                .to.be.revertedWith("Invalid city ID");
        });

        it("Should reject zero price index", async function () {
            await expect(gpret.connect(oracle).updateCityPrice(0, 0))
                .to.be.revertedWith("Invalid price index");
        });
    });

    describe("Governance", function () {
        beforeEach(async function () {
            // Transfer some tokens to addr1 for proposals
            await gpret.transfer(addr1.address, ethers.parseEther("2000"));
        });

        it("Should create proposal with sufficient tokens", async function () {
            const description = "Test proposal";
            
            await expect(gpret.connect(addr1).createProposal(description))
                .to.emit(gpret, "ProposalCreated")
                .withArgs(0, addr1.address, description);
            
            expect(await gpret.proposalCount()).to.equal(1);
        });

        it("Should reject proposal with insufficient tokens", async function () {
            await expect(gpret.connect(addr2).createProposal("Test"))
                .to.be.revertedWith("Insufficient tokens");
        });

        it("Should allow voting on active proposal", async function () {
            await gpret.connect(addr1).createProposal("Test proposal");
            
            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            const weight = await gpret.balanceOf(addr1.address);
            
            await expect(gpret.connect(addr1).vote(0, true))
                .to.emit(gpret, "VoteCast")
                .withArgs(0, addr1.address, true, weight);
        });

        it("Should execute proposal after voting period", async function () {
            await gpret.connect(addr1).createProposal("Test proposal");
            
            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            // Vote
            await gpret.connect(addr1).vote(0, true);
            
            // Wait for voting period to end
            await ethers.provider.send("evm_increaseTime", [604800]); // 7 days
            await ethers.provider.send("evm_mine");
            
            await expect(gpret.executeProposal(0))
                .to.emit(gpret, "ProposalExecuted")
                .withArgs(0);
        });

        it("Should prevent double voting", async function () {
            await gpret.connect(addr1).createProposal("Test proposal");
            
            // Wait for voting delay
            await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
            await ethers.provider.send("evm_mine");
            
            await gpret.connect(addr1).vote(0, true);
            
            await expect(gpret.connect(addr1).vote(0, false))
                .to.be.revertedWith("Already voted");
        });
    });

    describe("ERC20 Functions", function () {
        it("Should transfer tokens between accounts", async function () {
            const amount = ethers.parseEther("100");
            
            await expect(gpret.transfer(addr1.address, amount))
                .to.emit(gpret, "Transfer")
                .withArgs(owner.address, addr1.address, amount);
            
            expect(await gpret.balanceOf(addr1.address)).to.equal(amount);
        });

        it("Should approve and transfer from", async function () {
            const amount = ethers.parseEther("100");
            
            await gpret.approve(addr1.address, amount);
            expect(await gpret.allowance(owner.address, addr1.address)).to.equal(amount);
            
            await gpret.connect(addr1).transferFrom(owner.address, addr2.address, amount);
            expect(await gpret.balanceOf(addr2.address)).to.equal(amount);
        });

        it("Should burn tokens", async function () {
            const amount = ethers.parseEther("100");
            const initialSupply = await gpret.totalSupply();
            
            await gpret.burn(amount);
            
            expect(await gpret.totalSupply()).to.equal(initialSupply - amount);
            expect(await gpret.balanceOf(owner.address)).to.equal(initialSupply - amount);
        });
    });

    describe("Admin Functions", function () {
        it("Should pause and unpause contract", async function () {
            await gpret.pause();
            
            await expect(gpret.transfer(addr1.address, ethers.parseEther("100")))
                .to.be.revertedWithCustomError(gpret, "EnforcedPause");
            
            await gpret.unpause();
            
            await gpret.transfer(addr1.address, ethers.parseEther("100"));
            expect(await gpret.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
        });

        it("Should update city weight", async function () {
            const newWeight = 250000;
            
            await gpret.updateCityWeight(0, newWeight);
            
            const cityInfo = await gpret.getCityInfo(0);
            expect(cityInfo.weight).to.equal(newWeight);
        });

        it("Should toggle city status", async function () {
            await gpret.toggleCityStatus(0);
            
            const cityInfo = await gpret.getCityInfo(0);
            expect(cityInfo.isActive).to.be.false;
        });

        it("Should only allow owner to perform admin functions", async function () {
            await expect(gpret.connect(addr1).pause())
                .to.be.revertedWithCustomError(gpret, "OwnableUnauthorizedAccount");
            
            await expect(gpret.connect(addr1).updateCityWeight(0, 250000))
                .to.be.revertedWithCustomError(gpret, "OwnableUnauthorizedAccount");
        });
    });

    describe("View Functions", function () {
        it("Should return all cities information", async function () {
            const [names, prices, weights, activeStates] = await gpret.getAllCities();
            
            expect(names.length).to.equal(10);
            expect(names[0]).to.equal("New York");
            expect(weights[0]).to.equal(200000);
            expect(activeStates[0]).to.be.true;
        });

        it("Should return proposal information", async function () {
            await gpret.transfer(addr1.address, ethers.parseEther("2000"));
            await gpret.connect(addr1).createProposal("Test proposal");
            
            const proposalInfo = await gpret.getProposalInfo(0);
            expect(proposalInfo.proposer).to.equal(addr1.address);
            expect(proposalInfo.description).to.equal("Test proposal");
            expect(proposalInfo.executed).to.be.false;
        });
    });

    describe("Zero Revenue Validation", function () {
        it("Should maintain zero revenue structure", async function () {
            expect(await gpret.validateZeroRevenue()).to.be.true;
            
            const revenueStructure = await gpret.getRevenueStructure();
            expect(revenueStructure).to.include("ZERO_REVENUE");
            
            expect(await gpret.calculateTransactionFee(ethers.parseEther("1000"))).to.equal(0);
            expect(await gpret.getProtocolRevenue()).to.equal(0);
        });

        it("Should have no hidden fees or profits", async function () {
            // Transfer large amount to test for hidden fees
            const amount = ethers.parseEther("100000");
            const initialBalance = await gpret.balanceOf(owner.address);
            
            await gpret.transfer(addr1.address, amount);
            
            const finalBalance = await gpret.balanceOf(owner.address);
            expect(finalBalance).to.equal(initialBalance - amount);
            
            expect(await gpret.balanceOf(addr1.address)).to.equal(amount);
        });
    });

    describe("Integration with Staking", function () {
        beforeEach(async function () {
            // Approve staking contract to spend tokens
            await gpret.approve(await gpretStaking.getAddress(), ethers.parseEther("1000"));
        });

        it("Should allow tokens to be staked", async function () {
            const amount = ethers.parseEther("100");
            const lockPeriod = 7 * 24 * 60 * 60; // 7 days
            
            await expect(gpretStaking.stake(amount, lockPeriod))
                .to.emit(gpretStaking, "TokensStaked")
                .withArgs(owner.address, amount, lockPeriod, await ethers.provider.getBlock("latest").then(b => b.timestamp + lockPeriod + 1), 10000);
            
            expect(await gpret.balanceOf(await gpretStaking.getAddress())).to.equal(amount);
            expect(await gpretStaking.totalStakedByUser(owner.address)).to.equal(amount);
        });
    });

    describe("Security Tests", function () {
        it("Should prevent unauthorized oracle updates", async function () {
            await expect(gpret.connect(addr1).setOracleAddress(addr1.address))
                .to.be.revertedWithCustomError(gpret, "OwnableUnauthorizedAccount");
        });

        it("Should prevent invalid price updates", async function () {
            await gpret.setOracleAddress(oracle.address);
            
            await expect(gpret.connect(oracle).updateCityPrice(0, 0))
                .to.be.revertedWith("Invalid price index");
        });

        it("Should handle edge cases in governance", async function () {
            await expect(gpret.connect(addr1).createProposal(""))
                .to.be.revertedWith("Empty description");
        });
    });
});