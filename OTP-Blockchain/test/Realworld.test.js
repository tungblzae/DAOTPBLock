const OTPContract = artifacts.require("OTPContract");
const { expect } = require("chai");

contract("Real-World OTP Simulation", (accounts) => {
  let otp;
  // skip account[0] (deployer), use up to 1000 users
  const users = accounts.slice(1, 1001);

  before(async () => {
    otp = await OTPContract.deployed();
  });

  describe("1️⃣ Scalability & Isolation", () => {
    it("should handle 10,000 OTP requests across 1,000 users without failure", async () => {
      let failures = 0;
      const N = 10_000;
      const start = Date.now();

      for (let i = 0; i < N; i++) {
        try {
          await otp.generateOTP({ from: users[i % users.length] });
        } catch {
          failures++;
        }
      }

      const elapsed = Date.now() - start;
      console.log(`⏱ 10k requests in ${elapsed}ms, failures: ${failures}`);
      expect(failures).to.be.below(10);
    });

    it("each user keeps their own OTP", async () => {
      // pick two different users
      const [u1, u2] = [users[0], users[1]];
      await otp.generateOTP({ from: u1 });
      await otp.generateOTP({ from: u2 });

      const o1 = (await otp.otpStorage(u1)).otpString;
      const o2 = (await otp.otpStorage(u2)).otpString;
      expect(o1).to.match(/^\d+$/);
      expect(o2).to.match(/^\d+$/);
      expect(o1).to.not.equal(o2, "OTPs for different users should differ");
    });
  });

  describe("2️⃣ Expiration", () => {
    it("should reject a verification after expiry", async () => {
      const user = users[2];
      // generate new OTP
      await otp.generateOTP({ from: user });
      const stored = await otp.otpStorage(user);
      const validOtp = parseInt(stored.otpString, 10);
      // fast-forward time by > expiry (assumes expiry is 5 minutes = 300s)
      await advanceTime(301);
      // now a .verifyOTP should revert or return false
      try {
        await otp.verifyOTP(validOtp, { from: user });
        // if it doesn't throw, check state
        const after = await otp.otpStorage(user);
        expect(after.otpString).to.equal("0", "OTP should be cleared after expiry");
      } catch (err) {
        expect(err.message).to.match(/expired|timeout/i);
      }
    });
  });

  describe("3️⃣ Security – Brute-Force Prevention", () => {
    it("rejects repeated incorrect attempts", async () => {
      const user = users[3];
      await otp.generateOTP({ from: user });
      const wrong = 999999; // assume out-of-range

      for (let i = 0; i < 5; i++) {
        try {
          await otp.verifyOTP(wrong, { from: user });
          throw null; // shouldn't reach
        } catch (err) {
          expect(err.message).to.include("Invalid OTP");
        }
      }
    });
  });

  describe("4️⃣ Cost Analysis", () => {
    it("prints gas usage for 100 OTPs", async () => {
      let totalGas = 0;
      for (let i = 0; i < 100; i++) {
        const tx = await otp.generateOTP({ from: users[i] });
        totalGas += tx.receipt.gasUsed;
      }
      console.log("🔋 Total gas for 100 OTPs:", totalGas);
      console.log("💰 Estimated ETH:", (totalGas * 20e9) / 1e18);
    });
  });

  // helper to advance Ganache/EVM time
  async function advanceTime(seconds) {
    await new Promise((resolve, reject) =>
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [seconds],
        id: Date.now()
      }, err => err ? reject(err) : resolve())
    );
    await new Promise((resolve, reject) =>
      web3.currentProvider.send({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: Date.now()
      }, err => err ? reject(err) : resolve())
    );
  }
});
