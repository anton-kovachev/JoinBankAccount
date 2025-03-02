const hre =  require('hardhat');
const fs = require('fs/promises');

async function main() {
    const BankAccount = await hre.ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();

    await bankAccount.waitForDeployment();
    writeDeploymentInfo(bankAccount);
}

async function writeDeploymentInfo(contract) {
    const data = {
        contract: {
            address: await contract.getAddress(),
            // signerAddress: contract.signer.address,
            abi: contract.interface.format()
        }
    }

    const content = JSON.stringify(data, null, 2);
    fs.writeFile("deployment.json", content, { encoding: "utf-8" });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})