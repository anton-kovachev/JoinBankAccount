const provider = new ethers.providers.Web3Provider(window.ethereum);
var contract = null;

const address = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const abi = [
      "event AccountCreated(address[] owners, uint256 indexed id, uint256 timestamp)",
      "event Deposit(address indexed user, uint256 indexed accountId, uint256 value, uint256 timesamp)",
      "event Withdraw(uint256 indexed withdrawId, uint256 timestamp)",
      "event WithdrawRequested(address indexed user, uint256 indexed accountId, uint256 indexed withdrawId, uint256 amount, uint256 timestamp)",
      "function approveWithdraw(uint256 accountId, uint256 withdrawId)",
      "function createAccount(address[] otherOwners)",
      "function deposit(uint256 accountId) payable",
      "function getAccounts() view returns (uint256[])",
      "function getApprovals(uint256 accountId, uint256 withdrawId) view returns (uint256)",
      "function getBalance(uint256 accountId) view returns (uint256)",
      "function getOwners(uint256 accountId) view returns (address[])",
      "function requestWithdraw(uint256 accountId, uint256 amount)",
      "function withdraw(uint256 accountId, uint256 withdrawId)"
    ];

async function viewAccounts() {
    await getAccess();
    const result = await contract.getAccounts();

    document.getElementById("accounts").innerHTML = result;
}

async function createAccount() {
    await getAccess();

    const owners = document.getElementById("owners").innerText.split(",").filter((x) => x);

    await contract.createAccount(owners);
    alert("Success!");
}

async function getAccess() {
  if (contract) return;
  await provider.send("eth_requestAccounts", []);

  const signer = provider.getSigner();
  contract = new ethers.Contract(address, abi, provider.getSigner());

  const eventLog = document.getElementById("events");

  contract.on("AccountCreated", (owners, id, event) => {
    eventLog.append(`Account Created: Id = ${id}, owners = ${owners}`);
  });
}
