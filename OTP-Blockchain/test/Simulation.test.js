const OTPContract = artifacts.require("OTPContract");
const { expect } = require("chai");

/**
 * Simulates realistic OTP workload:
 * - Parallel transaction submission with controlled concurrency
 * - Random network/server delays for traditional OTP
 * - Measures average and total times
 * - Compares blockchain vs traditional costs and latencies
 */

contract("OTP Realistic Simulation", (accounts) => {
  let otp;
  const users = accounts.slice(1, 101); // 100 simulated users
  const concurrency = 10;             // number of parallel TXs
  const gasPrice = web3.utils.toBN(web3.utils.toWei('20', 'gwei'));

  before(async () => {
    otp = await OTPContract.deployed();
  });

  async function runInBatches(tasks, batchSize) {
    const results = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize).map(fn => fn());
      results.push(...(await Promise.all(batch)));
    }
    return results;
  }

  it("measures blockchain OTP generation under load", async () => {
    const start = Date.now();

    const genTasks = users.map(user => async () => {
      return otp.generateOTP({ from: user, gasPrice });
    });

    const receipts = await runInBatches(genTasks, concurrency);
    const duration = Date.now() - start;
    console.log(`Total Gen time (100 users, concurrency ${concurrency}): ${duration} ms`);
    console.log(`Avg Gen per user: ${(duration / users.length).toFixed(2)} ms`);
  });

  it("measures blockchain OTP verification under load", async () => {
    // first fetch OTPs
    const codes = await Promise.all(
      users.map(user => otp.otpStorage(user).then(d => parseInt(d.otpString, 10)))
    );

    const start = Date.now();
    const verTasks = users.map((user, idx) => async () => {
      return otp.verifyOTP(codes[idx], { from: user, gasPrice });
    });

    await runInBatches(verTasks, concurrency);
    const duration = Date.now() - start;
    console.log(`Total Verify time (100 users): ${duration} ms`);
    console.log(`Avg Verify per user: ${(duration / users.length).toFixed(2)} ms`);
  });

  it("simulates traditional OTP with randomized delays", async () => {
    const randomDelay = () => 100 + Math.random() * 200; // 100ms-300ms
    const startGen = Date.now();
    for (let user of users) {
      await new Promise(r => setTimeout(r, randomDelay()));
    }
    const genTime = Date.now() - startGen;

    const startVer = Date.now();
    for (let user of users) {
      await new Promise(r => setTimeout(r, randomDelay()));
    }
    const verTime = Date.now() - startVer;

    console.log(`Traditional Gen total: ${genTime} ms, avg ${(genTime/users.length).toFixed(2)} ms`);
    console.log(`Traditional Ver total: ${verTime} ms, avg ${(verTime/users.length).toFixed(2)} ms`);
  });

  it("analyzes gas & cost efficiency", async () => {
    let totalGas = web3.utils.toBN('0');
    for (let user of users) {
      const tx = await otp.generateOTP({ from: user, gasPrice });
      totalGas = totalGas.add(web3.utils.toBN(tx.receipt.gasUsed));
    }

    const ethCost = totalGas.mul(gasPrice).div(web3.utils.toBN(web3.utils.toWei('1', 'ether')));
    console.log(`Gas used for 100 gens: ${totalGas.toString()}`);
    console.log(`Cost in ETH: ${web3.utils.fromWei(ethCost, 'ether')}`);
    console.log(`Cost in USD ~$${(parseFloat(web3.utils.fromWei(ethCost, 'ether')) * 3500).toFixed(2)}`);
    console.log(`SMS cost at $0.05 each: $${(users.length * 0.05).toFixed(2)}`);
  });
});
