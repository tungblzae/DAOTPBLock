const fs = require('fs');
const path = require('path');

// Correct path to the build file of the compiled contract
const buildPath = path.join(__dirname, '..', 'build', 'contracts', 'OTPContract.json');

// Path to the output config file
const configPath = path.join(__dirname, 'contractConfig.json');

// Load the contract JSON
const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));

// Extract the first available network ID dynamically
const networkId = Object.keys(contractJson.networks)[0];

// If networkId doesn't exist in the JSON, throw an error
if (!networkId) {
    console.error('No networks found in OTPContract.json.');
    process.exit(1);
}

// Extract ABI and Address for the specified network
const contractConfig = {
    address: contractJson.networks[networkId].address,
    abi: contractJson.abi
};

// Write to config file
fs.writeFileSync(configPath, JSON.stringify(contractConfig, null, 2), 'utf-8');

console.log('Contract config generated successfully.');
