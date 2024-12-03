pragma solidity >=0.4.22 <0.9.0;

contract Authenticate {
    struct UserAccount {
        string name;
        string username;
        string email;
        string salt;
        string hashedPassword;
        address walletAddress;
        bool isEmailVerified;
    }

    mapping(address => UserAccount) public users;
    address[] public userAddresses;

    event NewAccountCreated(address indexed walletAddress, string username, string email, uint timestamp);
    event EmailVerified(address indexed walletAddress, string email, uint timestamp);

    address public otpContractAddress;

    constructor(address _otpContractAddress) public {
        otpContractAddress = _otpContractAddress;
    }

    
function createAccount(
    string memory name,
    string memory username,
    string memory email,
    string memory salt,
    string memory hashedPassword
) public {
    require(users[msg.sender].walletAddress == address(0), "Account already exists");

    // Store user details in the mapping
    users[msg.sender] = UserAccount(name, username, email, salt, hashedPassword, msg.sender, false);

    // Append the user address to the userAddresses array
    userAddresses.push(msg.sender);

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
}
