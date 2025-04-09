const OTPContract = artifacts.require("OTPContract");
const { expect } = require("chai");

contract("OTP Simulation", (accounts) => {
    let otpInstance;
    const users = accounts.slice(1, 101); // Simulate 100 users

    before(async () => {
        otpInstance = await OTPContract.deployed();
    });

    it("should measure blockchain OTP generation time under load", async () => {
        const start = Date.now();
        
        for (let user of users) {
            await otpInstance.generateOTP({ from: user });
        }

        const end = Date.now();
        console.log("Blockchain OTP Generation Time for 100 users:", end - start, "ms");
    });

    it("should measure blockchain OTP verification time under load", async () => {
        const start = Date.now();

        for (let user of users) {
            const otpData = await otpInstance.otpStorage(user);
            const otp = parseInt(otpData.otpString, 10);
            await otpInstance.verifyOTP(otp, { from: user });
        }

        const end = Date.now();
        console.log("Blockchain OTP Verification Time for 100 users:", end - start, "ms");
    });

    it("should compare with traditional OTP (Simulated)", async () => {
        const start = Date.now();

        for (let user of users) {
            // Simulate a traditional OTP request (Server delay ~200ms)
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const end = Date.now();
        console.log("Traditional OTP Generation Time for 100 users:", end - start, "ms");
    });

    it("should compare traditional OTP verification", async () => {
        const start = Date.now();

        for (let user of users) {
            // Simulate verification delay (e.g., SMS validation ~300ms)
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        const end = Date.now();
        console.log("Traditional OTP Verification Time for 100 users:", end - start, "ms");
    });

    it("should analyze cost efficiency", async () => {
        let totalGas = 0;

        for (let user of users) {
            const tx = await otpInstance.generateOTP({ from: user });
            totalGas += tx.receipt.gasUsed;
        }

        console.log("Total Gas Used for Blockchain OTP (100 users):", totalGas);
        console.log("Estimated Cost in ETH:", totalGas * 20000000000 / 1e18, "ETH");
        console.log("Estimated Cost in USD:", (totalGas * 20000000000 / 1e18) * 3500, "USD");

        console.log("Traditional OTP Cost for 100 users (SMS):", 100 * 0.05, "USD");
    });
});
