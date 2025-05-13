const { expect, assert } = require('chai');
const Web3 = require('web3').Web3;
const OTPJson = require('../build/contracts/OTPContract.json');
const OTP_ABI = OTPJson.abi;
const networkId = Object.keys(OTPJson.networks)[0];
const OTP_ADDRESS = OTPJson.networks[networkId].address;

describe('Audit-Trail: Fake-Verify by Liar-Lance', () => {
  let web3, accounts, otp;

  before(async () => {
    web3     = new Web3('http://localhost:8545');
    accounts = await web3.eth.getAccounts();
    otp      = new web3.eth.Contract(OTP_ABI, OTP_ADDRESS);
  });

  it('should revert verifyOTP for user who never generated', async () => {
    const liar = accounts[5];

    // 1) Attempt verify without generate
      try {
          await otp.methods.verifyOTP(123456).send({ from: liar, gas: 300000 });
          assert.fail('Expected verifyOTP to revert for non‐generated user');
        } catch (err) {
          // Bắt generic "revert" message của EVM
          expect(err.message).to.match(/revert/);
        }

    // 2) Fetch on-chain events
    const gens = await otp.getPastEvents('OTPGenerated', { fromBlock: 0, toBlock: 'latest' });
    const vers = await otp.getPastEvents('OTPVerified',  { fromBlock: 0, toBlock: 'latest' });

    // 3) Assert không có event nào của kẻ “liar”
    const liarGens = gens.filter(e => e.returnValues.user === liar);
    const liarVers = vers.filter(e => e.returnValues.user === liar);
    expect(liarGens.length).to.equal(0);
    expect(liarVers.length).to.equal(0);
  });
});
