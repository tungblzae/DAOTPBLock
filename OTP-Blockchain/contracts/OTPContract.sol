// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract OTPContract {
    struct OTPInfo {
        uint otp;           // Numeric OTP
        uint expiry;        // Expiry time
        string otpString;   // OTP as a string
    }

    mapping(address => OTPInfo) public otpStorage;
     address[] private otpAddresses; // Array to track addresses with OTPs
    event OTPGenerated(address indexed user, uint otp, uint expiry);
    event OTPVerified(address indexed user, uint otp, bool success);

    uint private nonce; // Nonce for randomness

    // Function to generate and store an OTP
    function generateOTP() public {
        uint otp = uint(keccak256(abi.encodePacked(block.timestamp, msg.sender, nonce))) % 1000000;
        
         // Ensure OTP is always a 6-digit string with leading zeros if needed
        string memory otpString = uintToString(otp);

        otpStorage[msg.sender] = OTPInfo(otp, block.timestamp + 300 seconds, otpString); // Set expiry to 300 seconds
        nonce++; // Increment nonce for the next OTP generation

        emit OTPGenerated(msg.sender, otp, block.timestamp + 300 seconds);

        // Ensure the OTP was correctly stored
        assert(otpStorage[msg.sender].otp == otp);
        assert(otpStorage[msg.sender].expiry == block.timestamp + 300 seconds);
    }

    // Function to verify an OTP
    function verifyOTP(uint _otp) public view returns (bool) {
        OTPInfo memory info = otpStorage[msg.sender];
        require(block.timestamp <= info.expiry, "OTP expired");

        return info.otp == _otp;
    }
    // Function to retrieve all addresses that have generated OTPs
    function getAllOTPAddresses() public view returns (address[] memory) {
        return otpAddresses;
    }

 // Helper function to convert uint to a zero-padded 6-digit string
function uintToString(uint v) internal pure returns (string memory) {
    bytes memory bstr = new bytes(6); // Fixed length for 6 digits

    // Populate the array with the digits, starting from the least significant
    for (uint i = 0; i < 6; i++) {
        bstr[5 - i] = bytes1(uint8(48 + (v % 10))); // Extract last digit
        v /= 10; // Remove the last digit
    }

    return string(bstr);
}


}
