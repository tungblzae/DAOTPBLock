const { Wallet } = require("ethers");
const privateKey = "0xd34251bdc159cb5fcaa1f7519bbc889034a2c36696bcba24dc55c23b5b003419";

try {
    const wallet = new Wallet(privateKey);
    console.log("Wallet Address:", wallet.address);
} catch (error) {
    console.error("Invalid private key:", error);
}
