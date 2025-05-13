const OTPContract = artifacts.require("OTPContract");
const { expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("OTP Lockout Test", accounts => {
  let otp;
  const user = accounts[1];
  // Must match your contract’s max allowed attempts
  const MAX_ATTEMPTS = 3;

  before(async () => {
    otp = await OTPContract.deployed();
  });

  it("locks out after maximum failed attempts", async () => {
    // 1) Generate a fresh OTP
    await otp.generateOTP({ from: user });

    // 2) Fail MAX_ATTEMPTS times
    const wrongCode = 123456;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await expectRevert.unspecified(
        otp.verifyOTP(wrongCode, { from: user })
      );
    }

    // 3) Even the correct code now must be rejected with "Too many attempts"
    const { otpString } = await otp.otpStorage(user);
    await expectRevert(
      otp.verifyOTP(parseInt(otpString, 10), { from: user }),
      "Too many attempts"
    );
  });
});
