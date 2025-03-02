// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/utils/Strings.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract BankAccount {
    
    event Deposit(address indexed user, uint256 indexed accountId, uint256 value, uint256 timesamp);
    event WithdrawRequested(address indexed user, uint256 indexed accountId, uint256 indexed withdrawId, uint256 amount, uint256 timestamp);
    event Withdraw(uint256 indexed withdrawId, uint256 timestamp);
    event AccountCreated(address[] owners, uint256 indexed id, uint256 timestamp);

    struct WithdrawRequest
    {
        address user;
        uint256 amount;
        uint approvals;
        mapping(address => bool) ownersApproved;
        bool approved;
    }

    struct Account 
    {
        address[] owners;
        uint256 balance;
        mapping(uint256 => WithdrawRequest) withdrawRequests;
    }

    mapping(uint256 => Account) accounts;
    mapping(address => uint256[]) userAccounts;

    uint256 nextAccountId;
    uint256 nextWithdrawId;

    modifier accountExists(uint256 accountId) 
    {
        require(accounts[accountId].owners.length > 0, "Account does not exists!");
        _;
    }

    modifier accountOwner(uint256 accountId) 
    {
        bool isOwner = false;

        for(uint8 i = 0; i < userAccounts[msg.sender].length; i++)
        {
            if (userAccounts[msg.sender][i] == accountId) {
                isOwner = true;
                break;
            }
        }

        require(isOwner, "You are not an owner of this account");
        _;
    }

    modifier validOwners(address[] calldata owners) {
        require(owners.length + 1 <= 4, "maximum of four owners per account");

        for(uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender)
            {
                revert("account creator should be not passed as an owner");
            }

            for (uint256 j = i + 1; j < owners.length; j++) {
                if (owners[i] == owners[j] ) {
                    revert("owners must be unique");
                }
            }
        }
        _;
    }

    modifier checkBalance(uint256 accountId, uint256 withdrawId) {
        require(accounts[accountId].balance >= accounts[accountId].withdrawRequests[withdrawId].amount, "insufficient balance");
        _;
    }

    modifier checkBalanceForWithdraw(uint256 accountId, uint256 withdrawAmount) {
        require(accounts[accountId].balance >= withdrawAmount, "insufficient balance");
        _;
    }

    modifier checkForAlreadyApproved(uint256 accountId, uint256 withdrawId) {
        require(accounts[accountId].withdrawRequests[withdrawId].ownersApproved[msg.sender] == false, "an owner can approve a request only once");
        _;
    }

    modifier canApprove(uint256 accountId, uint256 withdrawId)
    {
        require(!accounts[accountId].withdrawRequests[withdrawId].approved, "this request is already approved");
        require(accounts[accountId].withdrawRequests[withdrawId].user != msg.sender, "no approve");
        require(accounts[accountId].withdrawRequests[withdrawId].user != address(0), "this request does not exists");
        require(!accounts[accountId].withdrawRequests[withdrawId].ownersApproved[msg.sender], "you can approve a request only once");
        _;
    }

    modifier canWithdraw(uint256 accountId, uint256 withdrawId)
    {
        require(accounts[accountId].withdrawRequests[withdrawId].user == msg.sender, "you did not create this request");
        require(accounts[accountId].owners.length == 1 || accounts[accountId].withdrawRequests[withdrawId].approved, "withdraw request is not approved");
        _;
    }

    function deposit(uint256 accountId) external payable accountOwner(accountId) accountExists(accountId) 
    {
        accounts[accountId].balance += msg.value;
    }

    function createAccount(address[] calldata otherOwners) external validOwners((otherOwners))
    {
        address[] memory owners = new address[](otherOwners.length + 1);
        owners[otherOwners.length] = msg.sender;
        uint id = nextAccountId;

        for(uint256 idx; idx < owners.length; idx++) {
            if (idx < owners.length - 1)
            {
                owners[idx] = otherOwners[idx];
            }

            if (userAccounts[owners[idx]].length > 2)
            {
                revert("Each user can have a max of 3 account");
            }

            userAccounts[owners[idx]].push(id);
        }

        accounts[id].owners = owners;
        nextAccountId++;
        emit AccountCreated(owners, id, block.timestamp);
    }

    function requestWithdraw(uint256 accountId, uint256 amount) external accountOwner(accountId) checkBalanceForWithdraw(accountId, amount) {
        uint id = nextWithdrawId;

        WithdrawRequest storage request = accounts[accountId].withdrawRequests[id];
        request.user = msg.sender;
        request.amount = amount;
        emit WithdrawRequested(msg.sender, accountId, id, amount, block.timestamp);
    }

    function approveWithdraw(uint256 accountId, uint256 withdrawId) external accountOwner(accountId) canApprove(accountId, withdrawId) {
        WithdrawRequest storage request =  accounts[accountId].withdrawRequests[withdrawId];
        request.ownersApproved[msg.sender] = true;
        request.approvals += 1;

        if (request.approvals == accounts[accountId].owners.length - 1) 
        {
            request.approved = true;
        }
    }

    function withdraw(uint256 accountId, uint256 withdrawId) external canWithdraw(accountId, withdrawId) checkBalance(accountId, withdrawId) {
        uint256 amount = accounts[accountId].withdrawRequests[withdrawId].amount;

        accounts[accountId].balance -= amount;
        delete accounts[accountId].withdrawRequests[withdrawId];


        (bool sent, ) = payable(msg.sender).call{ value: amount }("");
        require(sent);

        emit Withdraw(withdrawId, block.timestamp);
    }

    function getBalance(uint256 accountId) public view returns (uint256) {
        return accounts[accountId].balance;
    }

    function getOwners(uint256 accountId) public view returns (address[] memory) {
        return accounts[accountId].owners;

    }

    function getApprovals(uint256 accountId, uint256 withdrawId) public view returns (uint256) {
        return accounts[accountId].withdrawRequests[withdrawId].approvals;
    }

    function getAccounts() public view returns (uint[] memory) {
        return userAccounts[msg.sender];
    }
}