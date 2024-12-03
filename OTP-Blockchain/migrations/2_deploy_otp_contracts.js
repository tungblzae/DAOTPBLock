const Authenticate = artifacts.require("Authenticate");
const OTPContract = artifacts.require("OTPContract");

module.exports = async function (deployer, network, accounts) {
  // Deploy OTPContract first
  await deployer.deploy(OTPContract);
  const otpInstance = await OTPContract.deployed();

  console.log("OTP Contract deployed at:", otpInstance.address);

  // Deploy Authenticate contract, passing the OTP contract's address
  await deployer.deploy(Authenticate, otpInstance.address);
  const authenticateInstance = await Authenticate.deployed();

  console.log("Authenticate Contract deployed at:", authenticateInstance.address);
};
