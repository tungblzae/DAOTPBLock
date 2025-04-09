pragma solidity >=0.4.22 <0.9.0;

import "./OTPContract.sol"; // Import OTPContract

contract Authenticate {
    struct UserAccount {
        string name;
        string username;
        string email;
        string salt;
        bytes32 hashedPassword;
        address walletAddress;
        bool isEmailVerified;
    }

    mapping(address => UserAccount) public users;
    mapping(string =>address) private emailToAddress;     
    address[] public userAddresses;
    OTPContract private otpContract;

    event NewAccountCreated(address indexed walletAddress, string username, string email, uint timestamp);
    event EmailVerified(address indexed walletAddress, string email, uint timestamp);
    event DebugEmailMapping(string email, address linkedAddress);
    address public otpContractAddress;

    constructor(address _otpContractAddress) public {
        otpContractAddress = _otpContractAddress;
    }

function toLowerCase(string memory str) internal pure returns (string memory) {
    bytes memory bStr = bytes(str);
    for (uint i = 0; i < bStr.length; i++) {
        uint8 b = uint8(bStr[i]);
        if (b >= 65 && b <= 90) { // ASCII for A-Z
            bStr[i] = bytes1(b + 32); // Convert to lowercase
        }
    }
    return string(bStr);
}

function hashPassword(string memory password, string memory salt) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(password, salt)); // Combine password and salt, then hash
    }
    
function createAccount(
    string memory name,
    string memory username,
    string memory email,
    string memory salt,
    string memory password
) public {
    email = toLowerCase(email);
    require(users[msg.sender].walletAddress == address(0), "Account already exists");
    require(emailToAddress[email] == address(0), "Email already registered");

    bytes32 hashedPassword = hashPassword(password, salt);

    // Store user details in the mapping
    users[msg.sender] = UserAccount(name, username, email, salt, hashedPassword, msg.sender, false);
    emailToAddress[email] = msg.sender; // Link email to wallet address
    userAddresses.push(msg.sender);

    // Emit debug event
    emit DebugEmailMapping(email, msg.sender);

    // Emit event
    emit NewAccountCreated(msg.sender, username, email, block.timestamp);

    // Call OTPContract's generateOTP function directly using low-level call
    (bool success, ) = otpContractAddress.call(abi.encodeWithSignature("generateOTP()"));
    require(success, "OTP generation failed");
}

    function verifyEmail(uint otp) public {
        require(users[msg.sender].walletAddress != address(0), "Account does not exist");
        require(!users[msg.sender].isEmailVerified, "Email already verified");

        // Call OTPContract's verifyOTP function directly using low-level call
        (bool success, bytes memory result) = otpContractAddress.call(
            abi.encodeWithSignature("verifyOTP(uint256)", otp)
        );
        require(success && abi.decode(result, (bool)), "OTP validation failed");

        users[msg.sender].isEmailVerified = true;
        emit EmailVerified(msg.sender, users[msg.sender].email, block.timestamp);
    }
    // Function to retrieve all registered users' addresses
    function getAllUserAddresses() public view returns (address[] memory) {
        return userAddresses;
    }
     // Getter function to retrieve address by email
    function getAddressByEmail(string memory email) public view returns (address) {
    email = toLowerCase(email); // Convert email to lowercase
    return emailToAddress[email];
    }
    function verifyPassword(string memory password, address userAddress) public view returns (bool) {
        UserAccount storage user = users[userAddress];
        require(user.walletAddress != address(0), "User not found");
        return user.hashedPassword == hashPassword(password, user.salt); // Verify password by rehashing
    }
}
