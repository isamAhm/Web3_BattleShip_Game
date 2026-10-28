const { expect } = require('chai');
const { viem } = require('hardhat');

describe('Web3 Battle Arena Contracts', function () {
  describe('MatchRegistry', function () {
    it('should allow authorized recorder to record match and reject duplicates and unauthorized callers', async function () {
      const [admin, recorder, attacker, winner] = await viem.getWalletClients();

      const registry = await viem.deployContract('MatchRegistry', [
        admin.account.address,
        recorder.account.address,
      ]);

      const matchId = '0x' + '11'.repeat(32);
      const resultHash = '0x' + 'aa'.repeat(32);

      // Record by authorized recorder
      const registryAsRecorder = await viem.getContractAt('MatchRegistry', registry.address, {
        client: { wallet: recorder },
      });

      const tx = await registryAsRecorder.write.recordMatch([
        matchId,
        winner.account.address,
        resultHash,
      ]);
      expect(tx).to.be.ok;

      // Verify stored data
      const record = await registry.read.getMatch([matchId]);
      expect(record[0].toLowerCase()).to.equal(winner.account.address.toLowerCase());
      expect(record[1]).to.equal(resultHash);
      expect(record[3]).to.be.true; // exists

      // Reject duplicate matchId
      await expect(
        registryAsRecorder.write.recordMatch([matchId, winner.account.address, resultHash]),
      ).to.be.rejected;

      // Reject unauthorized recorder
      const registryAsAttacker = await viem.getContractAt('MatchRegistry', registry.address, {
        client: { wallet: attacker },
      });
      const matchId2 = '0x' + '22'.repeat(32);
      await expect(
        registryAsAttacker.write.recordMatch([matchId2, winner.account.address, resultHash]),
      ).to.be.rejected;
    });
  });

  describe('AchievementBadges', function () {
    it('should allow minter to mint badges, prevent duplicates and reject unauthorized callers', async function () {
      const [admin, minter, attacker, player] = await viem.getWalletClients();

      const badges = await viem.deployContract('AchievementBadges', [
        'https://api.arena.wba/badges/{id}.json',
        admin.account.address,
        minter.account.address,
      ]);

      const badgesAsMinter = await viem.getContractAt('AchievementBadges', badges.address, {
        client: { wallet: minter },
      });

      // Mint First Win badge (ID 1)
      await badgesAsMinter.write.mintBadge([player.account.address, 1n]);

      // Verify balance
      const balance = await badges.read.balanceOf([player.account.address, 1n]);
      expect(balance).to.equal(1n);

      // Duplicate badge award should be rejected
      await expect(badgesAsMinter.write.mintBadge([player.account.address, 1n])).to.be.rejected;

      // Invalid badge id (e.g. 99) should be rejected
      await expect(badgesAsMinter.write.mintBadge([player.account.address, 99n])).to.be.rejected;

      // Unauthorized minter should be rejected
      const badgesAsAttacker = await viem.getContractAt('AchievementBadges', badges.address, {
        client: { wallet: attacker },
      });
      await expect(badgesAsAttacker.write.mintBadge([player.account.address, 2n])).to.be.rejected;
    });
  });
});
