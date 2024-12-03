import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

const App = () => {
  const [otp, setOtp] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [authenticateContract, setAuthenticateContract] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); // Manage page visibility with state

  useEffect(() => {
    const initWeb3AndContract = async () => {
      try {
        // Initialize Web3 instance connected to Ganache
        const web3 = new Web3('http://localhost:8545');

        // Get the first account provided by Ganache
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
          throw new Error('No accounts found. Is Ganache running?');
        }
        setAccount(accounts[0]); // Use the first account for transactions
        window.account = accounts[0]; // Attach to global scope
        // Load Authenticate contract
        const authResponse = await fetch('/Authenticate.json');
        if (!authResponse.ok) throw new Error('Failed to load Authenticate contract JSON');
        const authContractJSON = await authResponse.json();
        const authNetworkId = await web3.eth.net.getId();
        const authDeployedNetwork = authContractJSON.networks[authNetworkId.toString()];
        if (!authDeployedNetwork) throw new Error('Authenticate contract not deployed to detected network');
        const authenticate = new web3.eth.Contract(authContractJSON.abi, authDeployedNetwork.address);
        setAuthenticateContract(authenticate);
        window.authenticateContract = authenticate;

        // Load the OTP contract JSON
        const response = await fetch('/OTPContract.json');
        if (!response.ok) throw new Error('Failed to load contract JSON');
        const contractJSON = await response.json();
        const networkId = await web3.eth.net.getId();
        const deployedNetwork = contractJSON.networks[networkId.toString()];
        if (!deployedNetwork) throw new Error('Smart contract not deployed to detected network');
        const otpContract = new web3.eth.Contract(contractJSON.abi, deployedNetwork.address);
        setContract(otpContract);
        window.contract = otpContract; // Attach to global scope
        // Load home page
        setCurrentPage('home');
      } catch (error) {
        console.error('Error loading Web3 or contract:', error);
        alert('Failed to initialize Web3 or load the contract. Check console for details.');
      }
    };

    initWeb3AndContract();
  }, []);

  const registerUser = async () => {
    try {
      const name = document.getElementById('name').value;
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (!name || !username || !email || !password) {
        alert('All fields are required.');
        return;
      }

      const salt = Web3.utils.randomHex(16);
      const hashedPassword = Web3.utils.sha3(password + salt);

      if (authenticateContract && account) {
        await authenticateContract.methods.createAccount(name, username, email, salt, hashedPassword).send({
          from: account,
          gas: 500000,
        });

        alert('Account created successfully. An OTP has been sent to your email.');
        setCurrentPage('otpGeneration'); // Change page state to OTP generation page
      } else {
        console.error('Authenticate contract or account not available.');
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account. Check console for details.');
    }
    setCurrentPage('otpGeneration'); // Transition to OTP generation page
  };

  const generateOtp = async () => {
    try {
      const email = document.getElementById('email').value;
      if (!email) {
        alert('Please enter an email.');
        return false; // Return false if email is missing
      }
  
      if (contract && account) {
        const receipt = await contract.methods.generateOTP().send({
          from: account,
          gas: 500000,
          gasPrice: '20000000000',
        });
  
        if (receipt.status) {
          console.log('Transaction confirmed. Retrieving OTP...');
          const otpInfo = await contract.methods.otpStorage(account).call();
          const generatedOtp = otpInfo.otpString;
          setOtp(generatedOtp);
  
          try {
            const response = await fetch('http://localhost:3001/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, otp: generatedOtp }),
            });
  
            if (response.ok) {
              console.log(`OTP sent to email: ${email} with OTP: ${generatedOtp}`);
              setCurrentPage('otpVerification'); // Transition to OTP verification page
              return true; // Return true to indicate success
            } else {
              console.error('Failed to send OTP via email.');
              return false; // Return false if email sending fails
            }
          } catch (emailError) {
            console.error('Email sending error:', emailError);
            alert('Failed to send OTP. Please check your backend service.');
            return false; // Return false if an exception occurs
          }
        } else {
          console.error('Transaction failed. Retry logic or error handling needed.');
          return false; // Return false if the transaction fails
        }
      } else {
        console.error('Contract or account not available.');
        return false; // Return false if contract or account is unavailable
      }
    } catch (error) {
      console.error('Error generating OTP:', error);
      return false; // Return false for unexpected errors
    }
  };
  
  

  const verifyOtp = async () => {
    const otpInput = document.getElementById('otp-input').value;
    try {
      if (contract && account) {
        const result = await contract.methods.verifyOTP(otpInput).call({ from: account });
        setIsVerified(result);
        document.getElementById('verification-result').innerText = `Verification result: ${result ? 'Success' : 'Failure'}`;
      } else {
        console.error('Contract or account is not available.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
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
  

  

  // Set functions to global window object inside a useEffect hook
  useEffect(() => {
    window.registerUser = registerUser;
    window.generateOtp = generateOtp;
    window.verifyOtp = verifyOtp;
    window.fetchSystemData = fetchSystemData; 
  }, [registerUser, generateOtp, verifyOtp, fetchSystemData]);

  
};

export default App;
