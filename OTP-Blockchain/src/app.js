// Updated app.js
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import BN from 'bn.js';


const App = () => {
  const [otp, setOtp] = useState('');
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [authenticateContract, setAuthenticateContract] = useState(null);


  useEffect(() => {
    const initWeb3AndContract = async () => {
      try {
        document.dispatchEvent(new CustomEvent("loadingStatus", { detail: { message: "Initializing Web3 and contracts..." } }));
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const accounts = await web3.eth.getAccounts();
          //Chọn acount
          let bestAccount = null;
          let bestBalance = new BN('0');
          for (let i = 0; i < accounts.length; i++) {
            const balanceStr = await web3.eth.getBalance(accounts[i]);
            const balanceBN = new BN(balanceStr);
            if (balanceBN.gt(bestBalance)) {
              bestBalance = balanceBN;
              bestAccount = accounts[i];
            }
          }
          setAccount(bestAccount);
          console.log("Selected account:", bestAccount, "with balance:", bestBalance.toString());

          const otpResponse = await fetch('/OTPContract.json');
          const otpContractJSON = await otpResponse.json();
          const networkId = await web3.eth.net.getId();
          const networkIdStr = networkId.toString(); // Convert BigInt to string
          console.log("Connected Network ID:", networkIdStr);

   const deployedNetwork = otpContractJSON.networks[networkIdStr];
   if (!deployedNetwork || !deployedNetwork.address) {
   throw new Error("OTP Contract not deployed on network " + networkIdStr);
   }
   const otpContract = new web3.eth.Contract(otpContractJSON.abi, deployedNetwork.address);
   setContract(otpContract);


          // Initialize Authenticate Contract
          const authResponse = await fetch('/Authenticate.json');
          const authContractJSON = await authResponse.json();
          console.log("Authenticate networks:", authContractJSON.networks);
          const authDeployedNetwork = authContractJSON.networks[networkIdStr];
          if (!authDeployedNetwork || !authDeployedNetwork.address) {
            console.error("Authenticate contract not deployed on network", networkIdStr);
            return; // or throw an error
          }
          const authContract = new web3.eth.Contract(authContractJSON.abi, authDeployedNetwork.address);
          setAuthenticateContract(authContract);
          // Clear loading message after success
        document.dispatchEvent(new CustomEvent("loadingStatus", { detail: { message: "" } }));
        } else {
          console.error('MetaMask not detected');
          document.dispatchEvent(new CustomEvent("loadingStatus", { detail: { message: "MetaMask not detected" } }));
        }
      } catch (error) {
        console.error('Error initializing Web3:', error);
        document.dispatchEvent(new CustomEvent("loadingStatus", { detail: { message: "Error initializing Web3" } }));
      }
    };
    initWeb3AndContract();
  }, []);

  const generateOtp = async () => {
    if (contract && account) {
      try {
        await contract.methods.generateOTP().send({
          from: account,
          gasPrice: '20000000000',
          gas: 300000
        });
        const otpInfo = await contract.methods.otpStorage(account).call();
        console.log(`Generated OTP: ${otpInfo.otpString}`);
        setOtp(otpInfo.otpString);
  
        // Dispatch a custom event with the generated OTP.
        document.dispatchEvent(new CustomEvent("otpNotification", { detail: { otp: otpInfo.otpString } }));
        
        return true;
      } catch (error) {
        console.error("Error generating OTP:", error);
        return false;
      }
    }
  };
  
  
  const verifyOtp = async (inputOtp) => {
    if (contract && account) {
      try {
        // Call AI Fraud Detection API before verifying OTP
        const response = await fetch("http://localhost:3001/detect-fraud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              account: account,
              failedAttempts: 3,  // Example: Retrieve real failed attempts from backend
              locationChange: 1,  // Example: Use IP-based location tracking
              timeOfDay: new Date().getHours() // Get current hour
          }),
      });

      const result = await response.json();
      if (result.fraud === true) {
          console.log("🚨 Fraudulent OTP attempt detected! 🚨");
          showNotification("🚨 Suspicious OTP activity detected! 🚨", "red");
          return false;
      }
        // Convert the input string to a number.
        const numericOtp = parseInt(inputOtp, 10);
        console.log("Verifying OTP with numeric value:", numericOtp);
        await contract.methods.verifyOTP(numericOtp).send({
          from: account,
          gas: 300000,
          gasPrice: '20000000000'
        });
        console.log("Verification result: Success");
            showNotification("✅ OTP Verified Successfully!", "green"); // Green for success
            // Clear the OTP from UI state so it vanishes.
      setOtp('');
      const otpDisplayElem = document.getElementById("otp-display");
      if (otpDisplayElem) {
        otpDisplayElem.innerText = "";
      }
      
      //  navigate away from the OTP verification page.
      showPage('home-page');
            return true;
        
        } catch (error) {
            console.error('Error verifying OTP:', error.message, error.data);
            showNotification("❌ OTP Verification Failed. Please try again.", "red"); // Red for failure
            return false;
        }
    }
  };
  

  // Add to app.js
const registerUser = async (name, username, email, password) => {
  if (!authenticateContract || !account) {
    console.error("Contract or account not initialized");
    return;
  }

  // Generate salt and hash password (client-side)
  const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
  const hashedPassword = CryptoJS.PBKDF2(password, salt, {
    keySize: 512 / 32,
  }).toString();

  try {
    await authenticateContract.methods.createAccount(
      name,
      username,
      email,
      salt,
      hashedPassword
    ).send({ from: account });

    console.log("User registered successfully");
  } catch (error) {
    console.error("Registration failed:", error);
  }
};

  const fetchSystemData = async () => {
    try {
      if (!contract || !authenticateContract || !account) {
        console.error("Contracts or account not available.");
        return;
      }
  
      console.log("Fetching OTPs...");
      // Fetch OTPs from the smart contract
      const otpAddresses = await contract.methods.getAllOTPAddresses().call();
      console.log("OTP Addresses:", otpAddresses);
  
      const otpList = [];
      for (let i = 0; i < otpAddresses.length; i++) {
        const otpData = await contract.methods.otpStorage(otpAddresses[i]).call();
        console.log(`OTP Data [${i}]:`, otpData);
        otpList.push({ ...otpData, address: otpAddresses[i] });
      }
  
      // Update OTP table
      const otpTableBody = document.querySelector("#otp-table tbody");
      otpTableBody.innerHTML = ""; // Clear previous rows
  
      otpList.forEach((otp, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${otp.address}</td>
          <td>${otp.otpString}</td>
        `;
        otpTableBody.appendChild(row);
      });
  
      console.log("Fetching Users...");
      // Fetch users from the Authenticate contract
      const userAddresses = await authenticateContract.methods.getAllUserAddresses().call();
      console.log("User Addresses:", userAddresses);
  
      const userList = [];
      for (let i = 0; i < userAddresses.length; i++) {
        const userData = await authenticateContract.methods.users(userAddresses[i]).call();
        console.log(`User Data [${i}]:`, userData);
        userList.push(userData);
      }
  
      // Update Users table
      const userTableBody = document.querySelector("#user-table tbody");
      userTableBody.innerHTML = ""; // Clear previous rows
  
      userList.forEach((user, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${user.name}</td>
          <td>${user.username}</td>
          <td>${user.email}</td>
        `;
        userTableBody.appendChild(row);
      });
  
      console.log("System data fetched and tables updated.");
  
    } catch (error) {
      console.error("Error fetching system data:", error);
    }
  };
  
  const checkExistingOtp = async () => {
    if (contract && account) {
      try {
        const otpData = await contract.methods.otpStorage(account).call();
        // If the OTP is still valid, update the UI accordingly
        if (otpData.otp !== "0" && parseInt(otpData.expiry) > Math.floor(Date.now() / 1000)) {
          setOtp(otpData.otpString);  // Display the OTP string if needed
          // Optionally, inform the user that an OTP is already active
          console.log("Existing OTP is still valid:", otpData.otpString);
        }
      } catch (error) {
        console.error("Error fetching OTP state:", error);
      }
    }
  };
  

  // Set functions to global window object inside a useEffect hook
  useEffect(() => {
    window.registerUser = registerUser;
    window.generateOtp = generateOtp;
    window.verifyOtp = verifyOtp;
    window.fetchSystemData = fetchSystemData; 
  }, [registerUser, generateOtp, verifyOtp, fetchSystemData]);
  // LOG STATE
  useEffect(() => {
    const initContracts = async () => {
        console.log("Initializing contracts...");
        if (!authenticateContract) {
            console.error("Authenticate contract not initialized.");
        }
    };
    initContracts();
}, [authenticateContract]);

  
};

export default App;
