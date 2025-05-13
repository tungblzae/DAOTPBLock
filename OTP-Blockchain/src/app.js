// Updated app.js
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import BN from 'bn.js';


const App = () => {
  const [otp, setOtp] = useState('');
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [authenticateContract, setAuthenticateContract] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const initWeb3AndContract = async () => {
      try {
        document.dispatchEvent(new CustomEvent("loadingStatus", { detail: { message: "Initializing Web3 and contracts..." } }));
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum);
          window.web3 = web3; 
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
          const authResponse = await fetch("http://localhost:3001/Authenticate.json?" + new Date().getTime());
         const authContractJSON = await authResponse.json();
          console.log("Authenticate networks:", authContractJSON.networks);
          console.log("Authenticate JSON file loaded:", authContractJSON);
          console.log("Current network ID as string:", networkIdStr);

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

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      console.log("Persisted user loaded:", user);
      setCurrentUser(user);
      }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      console.log("Persisted user loaded:", user);
      setCurrentUser(user);
  
      // 🧑‍💻 Update username on screen
      const userNameElem = document.getElementById('user-name');
      if (userNameElem) {
        userNameElem.innerText = user.username;
      }
    }
  }, []);
  

  const generateOtp = async () => {
    if (!contract || !account) return false;
  
    try {
      // 1) Fire the transaction
      await contract.methods.generateOTP().send({
        from: account,
        gas: 300_000,
        gasPrice: "20000000000"
      });
  
      // 2) Now call our new single-uint getter
      const raw = await contract.methods.getOTP(account).call();
      const otpString = raw.toString().padStart(6, "0");
  
      // 3) Update UI
      console.log(`✅ Generated OTP: ${otpString}`);
      setOtp(otpString);
      document.dispatchEvent(new CustomEvent("otpNotification", {
        detail: { otp: otpString }
      }));
  
      return true;
    } catch (err) {
      console.error("❌ Error generating OTP:", err);
      return false;
    }
  };
  
  
  
  
  const purchaseProduct = async (prodId) => {
    if (!authenticateContract || !account) return;
  
    try {
      await authenticateContract.methods.purchaseProduct(prodId)
        .send({ from: account });
  
      // ✅ Add to cart with friendly name
      let productName = "";
      if (prodId === "A") productName = "Product A";
      else if (prodId === "B") productName = "Product B";
      else if (prodId === "C") productName = "Product C";
      else productName = `Product ${prodId}`;
  
      addToCart(productName);   // <-- This way cart shows "Product A" instead of just "A"
    } catch (err) {
      console.error("Error purchasing product:", err);
      showNotification("❌ Purchase failed", "red");
    }
  };
  
  
  useEffect(() => {
    window.purchaseProduct = purchaseProduct;
    // … and already have window.verifyOtp etc.
  }, [authenticateContract, account]);
  

  
 
// const verifyOtp = async (inputOtp) => {
//   if (!contract || !account) {
//     console.error("Contracts or account not initialized");
//     return false;
//   }

//   try {
//     // 1) Fraud check
//     const fraudRes = await fetch("http://localhost:3001/detect-fraud", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         account,
//         failedAttempts: 3,
//         locationChange: 1,
//         timeOfDay: new Date().getHours()
//       })
//     });
//     const fraudJson = await fraudRes.json();
//     if (fraudJson.fraud) {
//       console.warn("🚨 Fraudulent OTP attempt detected");
//       showNotification("🚨 Suspicious OTP activity detected! 🚨", "red");
//       return false;
//     }

//     // 2) Verify on-chain
//     const numericOtp = parseInt(inputOtp, 10);
//     console.log("Verifying OTP:", numericOtp);
//     await contract.methods.verifyOTP(numericOtp).send({
//       from: account,
//       gas: 300000,
//       gasPrice: "20000000000"
//     });

//     // 3) Success
//     showNotification("✅ OTP Verified Successfully!", "green");
//     setOtp("");                     // clear UI state
//     return true;

//   } catch (err) {
//     console.error("Error verifying OTP:", err);
//     showNotification("❌ OTP Verification Failed. Please try again.", "red");
//     return false;
//   }
// };

//VERIFIED OTP KO CÓ UNLOCK AI CHẶN
const verifyOtp = async (inputOtp) => {
  if (!contract || !account) {
    console.error("Contracts or account not initialized");
    return false;
  }

  try {
    // ⚠️ Skip the fraud API in dev/test
    if (!SKIP_FRAUD_CHECK) {
      const fraudRes = await fetch("http://localhost:3001/detect-fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          failedAttempts: 3,
          locationChange: 1,
          timeOfDay: new Date().getHours()
        })
      });
      const fraudJson = await fraudRes.json();
      if (fraudJson.fraud) {
        console.warn("🚨 Fraudulent OTP attempt detected");
        showNotification("🚨 Suspicious OTP activity detected! 🚨", "red");
        return false;
      }
    }

    // …the rest of your on-chain verify logic stays exactly the same…
    const numericOtp = parseInt(inputOtp, 10);
    await contract.methods.verifyOTP(numericOtp).send({
      from: account,
      gas: 300000,
      gasPrice: "20000000000"
    });

    showNotification("✅ OTP Verified Successfully!", "green");
    setOtp("");
    return true;

  } catch (err) {
    console.error("Error verifying OTP:", err);
    showNotification("❌ OTP Verification Failed. Please try again.", "red");
    return false;
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
   // Persist the current account/user details in localStorage
   const userData = { name, username, email, account };
   localStorage.setItem("currentUser", JSON.stringify(userData));
  } catch (error) {
    console.error("Registration failed:", error);
  }
};

  // ➊ Simple loginUser for testing
  const loginUser = async (username, password) => {
    // hard-coded admin/123 for dev
    if (username === 'admin' && password === '123') {
      const userObj = { username, account };
      setCurrentUser(userObj);
      localStorage.setItem("currentUser", JSON.stringify(userObj));
      return true;
    }
    // TODO: call your authenticateContract.login(...) here
    return false;
  };

  // ➋ Expose it to your index.html script
  useEffect(() => {
    window.loginUser = loginUser;
  }, [loginUser]);
  async function fetchOtpAuditTrail() {
    if (!contract) {
      console.error("Contract not initialized");
      return [];
    }
  
    try {
      const generatedEvents = await contract.getPastEvents("OTPGenerated", {
        fromBlock: 0,
        toBlock: "latest",
      });
  
      const verifiedEvents = await contract.getPastEvents("OTPVerified", {
        fromBlock: 0,
        toBlock: "latest",
      });
  
      const logs = [];
  
      generatedEvents.forEach(evt => {
        logs.push({
          type: "Generated",
          user: evt.returnValues.user,
          otp: evt.returnValues.otp,
          expiry: new Date(evt.returnValues.expiry * 1000).toLocaleString(),
          blockNumber: evt.blockNumber
        });
      });
  
      verifiedEvents.forEach(evt => {
        logs.push({
          type: "Verified",
          user: evt.returnValues.user,
          otp: evt.returnValues.otp,
          success: evt.returnValues.success,
          blockNumber: evt.blockNumber
        });
      });
  
      // Sort logs by blockNumber (blockchain ordering)
      logs.sort((a, b) => a.blockNumber - b.blockNumber);
  
      console.log("🔎 OTP Audit Trail:", logs);
      return logs;
  
    } catch (error) {
      console.error("Error fetching OTP audit trail:", error);
      return [];
    }
  }
  

  const fetchSystemData = async () => {
    try {
      if (!contract || !authenticateContract || !account) {
        console.error("Contracts or account not available.");
        return;
      }
  
      // 1) Fetch both event streams in parallel
      const [genEvents, verEvents] = await Promise.all([
        contract.getPastEvents("OTPGenerated", { fromBlock: 0, toBlock: "latest" }),
        contract.getPastEvents("OTPVerified",  { fromBlock: 0, toBlock: "latest" })
      ]);
  
      // 2) Map OTPGenerated → log entries
      const genLogs = await Promise.all(genEvents.map(async (evt) => {
        const { user, otp, expiry } = evt.returnValues;
        // Convert expiry safely from BigInt/string → Number
        const expiryTs = Number(expiry.toString());
        const isExpired = expiryTs < Math.floor(Date.now() / 1000);
  
        // Grab on-chain block timestamp
        const blk = await window.web3.eth.getBlock(evt.blockNumber);
        const ts  = Number(blk.timestamp);               // BigInt → Number
        const time = new Date(ts * 1000).toLocaleString();
  
        // Look up the username
        const userData = await authenticateContract.methods.users(user).call();
        const username = userData.username || user;
  
        return {
          username,
          code:    otp.toString().padStart(6, "0"),
          time,
          status:  isExpired ? "Expired" : "Generated",
          bn:      evt.blockNumber
        };
      }));
  
      // 3) Map OTPVerified → log entries
      const verLogs = await Promise.all(verEvents.map(async (evt) => {
        const { user, otp, success } = evt.returnValues;
  
        const blk = await window.web3.eth.getBlock(evt.blockNumber);
        const ts  = Number(blk.timestamp);
        const time = new Date(ts * 1000).toLocaleString();
  
        const userData = await authenticateContract.methods.users(user).call();
        const username = userData.username || user;
  
        return {
          username,
          code:    otp.toString().padStart(6, "0"),
          time,
          status:  success ? "Verified" : "Failed",
          bn:      evt.blockNumber
        };
      }));
  
      // 4) Merge & sort WITHOUT using BigInt subtraction
      const allLogs = [...genLogs, ...verLogs].sort((a, b) => {
        if (a.bn < b.bn) return -1;
        if (a.bn > b.bn) return  1;
        return 0;
      });
  
      // 5) Render your 5-column table
      const tbody = document.querySelector("#otp-table tbody");
      tbody.innerHTML = "";
      allLogs.forEach((log, i) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${log.username}</td>
          <td>${log.code}</td>
          <td>${log.time}</td>
          <td>${log.status}</td>
        `;
        tbody.appendChild(row);
      });

    console.log("Fetching registered users...");
    const userAddresses = await authenticateContract.methods.getAllUserAddresses().call();
    console.log("Total users:", userAddresses.length);
    
    const userTableBody = document.querySelector("#user-table tbody");
    userTableBody.innerHTML = "";
    
    if (userAddresses.length === 0) {
      // Fallback: use localStorage currentUser if present
      const stored = localStorage.getItem("currentUser");
      if (stored) {
        const u = JSON.parse(stored);
        userTableBody.innerHTML = `
          <tr>
            <td>1</td>
            <td>${u.name     || "N/A"}</td>
            <td>${u.username|| "N/A"}</td>
            <td>${u.email   || "N/A"}</td>
          </tr>
        `;
      } else {
        userTableBody.innerHTML = `
          <tr><td colspan="4" class="text-center">No registered users found</td></tr>
        `;
      }
    } else {
      // Real on-chain loop
      for (let i = 0; i < userAddresses.length; i++) {
        const addr = userAddresses[i];
        const userData = await authenticateContract.methods.users(addr).call();
        console.log("Raw user data:", userData);

        const name     = userData.name     || "N/A";
        const username = userData.username || addr;
        const email    = userData.email    || "N/A";

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${name}</td>
          <td>${username}</td>
          <td>${email}</td>
        `;
        userTableBody.appendChild(row);
      }
    }

    console.log("System overview loaded.");
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
    window.contract = contract;
    window.authenticateContract = authenticateContract;
    window.account = account;
  }, [registerUser, generateOtp, verifyOtp, fetchSystemData, contract, authenticateContract, account]);
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
