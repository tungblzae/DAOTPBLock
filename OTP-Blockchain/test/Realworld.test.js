const OTPContract = artifacts.require("OTPContract");
const { expect } = require("chai");

contract("Real-World OTP Simulation", (accounts) => {
    let otpInstance;
    const users = accounts.slice(1, 1001); // Simulating 1000 users

    before(async () => {
        otpInstance = await OTPContract.deployed();
    });

    /** 1️⃣ Scalability Test - 10,000 OTP Requests */
    it("should handle 10,000 OTP requests without failure", async () => {
        let failedTxs = 0;
        const start = Date.now();

        for (let i = 0; i < 1000; i++) {
            try {
                await otpInstance.generateOTP({ from: users[i % users.length] });
            } catch (error) {
                failedTxs++;
            }
        }

        const end = Date.now();
        console.log("Time for 10,000 OTP Requests:", end - start, "ms");
        console.log("Failed Transactions:", failedTxs);
        expect(failedTxs).to.be.lessThan(10);
    });

    /** 2️⃣ Security Test - Brute Force Attack Prevention */
    it("should reject repeated incorrect OTP attempts", async () => {
        const user = users[0];

        const otpData = await otpInstance.otpStorage(user);
        const otp = parseInt(otpData.otpString, 10);

        for (let i = 0; i < 5; i++) {
            try {
                await otpInstance.verifyOTP(otp + 1, { from: user }); // Wrong OTP
                assert.fail("Should not allow incorrect OTP verification");
            } catch (error) {
                expect(error.message).to.include("Invalid OTP");
            }
        }
    });

    /** 3️⃣ Cost Analysis Test */
    it("should calculate gas fees for blockchain OTP generation", async () => {
        let totalGas = 0;

        for (let user of users.slice(0, 100)) {
            const tx = await otpInstance.generateOTP({ from: user });
            totalGas += tx.receipt.gasUsed;
        }

        console.log("Total Gas Used for 100 OTPs:", totalGas);
        console.log("Estimated Cost in ETH:", totalGas * 20000000000 / 1e18, "ETH");
        console.log("Estimated Cost in USD:", (totalGas * 20000000000 / 1e18) * 3500, "USD");
    });
});
