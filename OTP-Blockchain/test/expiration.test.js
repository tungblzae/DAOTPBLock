const OTPContract = artifacts.require("OTPContract");
const { time, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("OTP Expiration Test", accounts => {
  let otp;
  const user = accounts[1];
  // TTL must match whatever you set in your contract (e.g. 300 seconds = 5 min)
  const TTL = 300;

  before(async () => {
    otp = await OTPContract.deployed();
  });

  it("reverts when verifying after OTP has expired", async () => {
    // 1) Generate a fresh OTP
    await otp.generateOTP({ from: user });
    const { otpString } = await otp.otpStorage(user);
    expect(otpString).to.not.equal('0');

    // 2) Fast-forward time past the TTL
    await time.increase(TTL + 1);
    await time.advanceBlock();

    // 3) Attempt verification => should revert with "OTP expired"
    await expectRevert(
      otp.verifyOTP(parseInt(otpString, 10), { from: user }),
      "OTP expired"
    );
  });
});
