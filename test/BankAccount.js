const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BankAccount", function () {
  async function deployBankAccount() {
    const [addr0, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const BankAccount = await ethers.getContractFactory("BankAccount");
    const bankAccount = await BankAccount.deploy();
    await bankAccount.waitForDeployment();

    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }

  async function deployBankAccountWithAccounts(
    owners = 1,
    deposit = 0,
    withdrawlAmounts = []
  ) {
    const { bankAccount, addr0, addr1, addr2, addr3, addr4 } =
      await loadFixture(deployBankAccount);
    let addresses = [];

    if (owners == 2) {
      addresses = [addr1.address];
    } else if (owners == 3) {
      addresses = [addr1.address, addr2.address];
    } else if (owners == 4) {
      addresses = [addr1.address, addr2.address, addr3.address];
    }

    await bankAccount.connect(addr0).createAccount(addresses);

    if (deposit > 0) {
      await bankAccount
        .connect(addr0)
        .deposit(0, { value: deposit.toString() });
    }

    for (const withdrawAmount of withdrawlAmounts) {
      await bankAccount.connect(addr0).requestWithdraw(0, withdrawAmount);
    }

    return { bankAccount, addr0, addr1, addr2, addr3, addr4 };
  }

  describe("Deployment", () => {
    it("should deploy without an error", async () => {
      await loadFixture(deployBankAccount);
    });
  });

  describe("Creating an account", () => {
    it("should allow creating a single user account", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      await bankAccount.connect(addr0).createAccount([]);
      const accounts = await bankAccount.connect(addr0).getAccounts();
      expect(accounts.length).to.equal(1);
    });

    it("should allow creating a doble user account", async () => {
      const { bankAccount, addr0, addr1 } = await loadFixture(
        deployBankAccount
      );

      await bankAccount.connect(addr0).createAccount([addr1]);

      const addr0Accounts = await bankAccount.connect(addr0).getAccounts();
      expect(addr0Accounts.length).to.equal(1);

      const addr1Accounts = await bankAccount.connect(addr1).getAccounts();
      expect(addr1Accounts.length).to.equal(1);
    });

    it("should allow creating a triple user account", async () => {
      const { bankAccount, addr0, addr1, addr2 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(addr0).createAccount([addr1, addr2]);

      const addr0Accounts = await bankAccount.connect(addr0).getAccounts();
      expect(addr0Accounts.length).to.equal(1);

      const addr1Accounts = await bankAccount.connect(addr1).getAccounts();
      expect(addr1Accounts.length).to.equal(1);

      const addr2Accounts = await bankAccount.connect(addr2).getAccounts();
      expect(addr2Accounts.length).to.equal(1);
    });

    it("should allow creating a quad user account", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3 } = await loadFixture(
        deployBankAccount
      );
      await bankAccount.connect(addr0).createAccount([addr1, addr2, addr3]);

      const addr0Accounts = await bankAccount.connect(addr0).getAccounts();
      expect(addr0Accounts.length).to.equal(1);

      const addr1Accounts = await bankAccount.connect(addr1).getAccounts();
      expect(addr1Accounts.length).to.equal(1);

      const addr2Accounts = await bankAccount.connect(addr2).getAccounts();
      expect(addr2Accounts.length).to.equal(1);

      const addr3Accounts = await bankAccount.connect(addr3).getAccounts();
      expect(addr3Accounts.length).to.equal(1);
    });

    it("should fail creating double user account with same users", async () => {
      const { bankAccount, addr0 } = await loadFixture(deployBankAccount);
      await expect(
        bankAccount.connect(addr0).createAccount([addr0])
      ).to.be.revertedWith("account creator should be not passed as an owner");
    });

    it("should fail creating a triple user account with same users", async () => {
      const { bankAccount, addr0, addr1 } = await loadFixture(
        deployBankAccount
      );
      await expect(
        bankAccount.connect(addr0).createAccount([addr1, addr1])
      ).to.be.revertedWith("owners must be unique");
    });

    it("should fail creating a bank account with five users", async () => {
      const { bankAccount, addr0, addr1, addr2, addr3, addr4 } =
        await loadFixture(deployBankAccount);
      await expect(
        bankAccount.connect(addr0).createAccount([addr1, addr2, addr3, addr4])
      ).to.be.revertedWith("maximum of four owners per account");
    });
  });

  describe("Depositing", () => {
    it("should allow deposit from account owner", async () => {
      const { bankAccount, addr0 } = await deployBankAccountWithAccounts(1);
      await expect(
        bankAccount.connect(addr0).deposit(0, { value: "100" })
      ).to.changeEtherBalances([bankAccount, addr0], [100, -100]);
    });

    it("should not allow deposit from account owner", async () => {
      const { bankAccount, addr1 } = await deployBankAccountWithAccounts(1);
      await expect(
        bankAccount.connect(addr1).deposit(0, { value: "100" })
      ).to.be.revertedWith("You are not an owner of this account");
    });

    it("should not allow deposit to a none existing account", async () => {
      const { bankAccount, addr0 } = await deployBankAccountWithAccounts(1);
      await expect(
        bankAccount.connect(addr0).deposit(1, { value: "100" })
      ).to.be.revertedWith("You are not an owner of this account");
    });
  });

  describe("Withdrawl", () => {
    describe("Request a withdraw", () => {
      it("account owner can request a withdraw", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        await bankAccount.connect(addr0).requestWithdraw(0, 100);
      });

      it("account owner cannot request withdraw with invalid amount", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        await expect(
          bankAccount.connect(addr0).requestWithdraw(0, 1000)
        ).to.be.revertedWith("insufficient balance");
      });

      it("non-account owner cannot request withdraw", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          1,
          100
        );
        await expect(
          bankAccount.connect(addr1).requestWithdraw(0, 50)
        ).to.be.revertedWith("You are not an owner of this account");
      });
    });

    describe("Approve a withdraw", () => {
      it("should allow account owner to approve a withdraw", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          2,
          100,
          [100]
        );

        await bankAccount.connect(addr1).approveWithdraw(0, 0);
        await expect(await bankAccount.getApprovals(0, 0)).to.equal(1);
      });

      it("should not allow non-account owner to approve a withdraw", async () => {
        const { bankAccount, addr2 } = await deployBankAccountWithAccounts(
          2,
          100,
          [100]
        );

        await expect(
          bankAccount.connect(addr2).approveWithdraw(0, 0)
        ).to.be.revertedWith("You are not an owner of this account");
      });

      it("should not allow account owner to approve a withdraw multiple times", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          3,
          100,
          [100]
        );

        await bankAccount.connect(addr1).approveWithdraw(0, 0);
        expect(await bankAccount.getApprovals(0, 0)).to.be.equal(1);
        await expect(bankAccount.connect(addr1).approveWithdraw(0, 0)).to.be
          .revertedWith("you can approve a request only once");
      });

      it("should not allow creator of the request to approve a withdraw", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          2,
          100,
          [100]
        );

        await expect(
          bankAccount.connect(addr0).approveWithdraw(0, 0)
        ).to.be.revertedWith("no approve");
      });
    });

    describe("Withdraw", () => {
      it("successfull with one owner", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          1,
          100,
          [50]
        );
        await expect(
          bankAccount.connect(addr0).withdraw(0, 0)
        ).to.changeEtherBalances([bankAccount, addr0], [-50, 50]);
      });

      it("should not allow withdraw if account balance is insufficient", async () => {
        await expect(deployBankAccountWithAccounts(1, 100, [150])).to.be.revertedWith("insufficient balance");
      });

      it("successfull with two owners", async () => {
        const { bankAccount, addr0, addr1 } =
          await deployBankAccountWithAccounts(2, 100, [50]);
        await bankAccount.connect(addr1).approveWithdraw(0, 0);
        await expect(
          bankAccount.connect(addr0).withdraw(0, 0)
        ).to.changeEtherBalances([bankAccount, addr0], [-50, 50]);
      });

      it("should not allow a withdraw if request is not approved", async () => {
        const { bankAccount, addr0 } = await deployBankAccountWithAccounts(
          2,
          100,
          [50]
        );
        await expect(
          bankAccount.connect(addr0).withdraw(0, 0)
        ).to.be.revertedWith("withdraw request is not approved");
      });

      it("should not allow non-request creator to withdraw", async () => {
        const { bankAccount, addr1 } = await deployBankAccountWithAccounts(
          2,
          100,
          [50]
        );
        await expect(
          bankAccount.connect(addr1).withdraw(0, 0)
        ).to.be.revertedWith("you did not create this request");
      });

      it("successfull with three owners", async () => {
        const { bankAccount, addr0, addr1, addr2 } =
          await deployBankAccountWithAccounts(3, 100, [50]);
        await bankAccount.connect(addr1).approveWithdraw(0, 0);
        await bankAccount.connect(addr2).approveWithdraw(0, 0);
        await expect(
          bankAccount.connect(addr0).withdraw(0, 0)
        ).to.changeEtherBalances([bankAccount, addr0], [-50, 50]);
      });

      it("should not allow more than one approval from an account owner", async () => {
        const { bankAccount, addr0, addr1 } =
          await deployBankAccountWithAccounts(3, 100, [50]);
        await bankAccount.connect(addr1).approveWithdraw(0, 0);
        await expect(
          bankAccount.connect(addr1).approveWithdraw(0, 0)
        ).to.be.revertedWith("you can approve a request only once");
      });
    });
  });
});
