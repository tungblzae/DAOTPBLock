const fetch = require('node-fetch');
const nock = require('nock');
const OTPContract = artifacts.require("OTPContract");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract("OTP Real-World Security Simulation", accounts => {
  let otp;
  const user = accounts[1];

  before(async () => {
    otp = await OTPContract.deployed();
  });

  beforeEach(() => {
    // Clean out any previous interceptors
    nock.cleanAll();

    // Intercept both legitimate and suspicious calls to /detect-fraud
    const fraudScope = nock('http://localhost:3001')
      .persist()   // keep the interceptor active across multiple calls
      .post('/detect-fraud')
      .reply((uri, requestBody) => {
        const body = typeof requestBody === 'string' ? JSON.parse(requestBody) : requestBody;
        // if locationChange >= suspicious threshold => fraud
        if (body.locationChange && body.locationChange >= 999) {
          return [200, { fraud: true }];
        }
        // otherwise: not fraud
        return [200, { fraud: false }];
      });
  });

  after(() => {
    nock.cleanAll();
  });

  it("blocks verification when off-chain fraud detector flags the attempt", async () => {
    // 1) Generate and verify a legit OTP
    await otp.generateOTP({ from: user });
    let { otpString } = await otp.otpStorage(user);
    const code1 = parseInt(otpString, 10);
  
    // stub fraud → false, then verify
    // … your nock/fetch for false …
    await otp.verifyOTP(code1, { from: user });
  
    // --- NOW REGENERATE for the “attack” ---
    await otp.generateOTP({ from: user });
    ({ otpString } = await otp.otpStorage(user));
    const code2 = parseInt(otpString, 10);
  
    // stub fraud → true
    // … your nock/fetch for true …
  
    // 4) This time the on-chain call sees fraud first and reverts with your custom message
    await expectRevert(
      otp.verifyOTP(code2, { from: user }),
      "Fraudulent activity detected"
    );
  });
  
});
