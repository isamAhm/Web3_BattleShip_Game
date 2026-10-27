import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── MatchRegistry ──────────────────────────────────────────────────────────
  const Registry = await ethers.getContractFactory("MatchRegistry");
  const registry = await Registry.deploy(
    deployer.address, // admin
    deployer.address  // recorder (relayer — update after deploy)
  );
  await registry.waitForDeployment();
  console.log("✅ MatchRegistry:", await registry.getAddress());

  // ── AchievementBadges ──────────────────────────────────────────────────────
  const Badges = await ethers.getContractFactory("AchievementBadges");
  const badges = await Badges.deploy(
    deployer.address, // admin
    deployer.address, // minter (relayer — update after deploy)
    "https://battle-arena.example.com/badges/{id}.json"
  );
  await badges.waitForDeployment();
  console.log("✅ AchievementBadges:", await badges.getAddress());

  console.log("\nAdd to .env:");
  console.log(`REGISTRY_ADDRESS=${await registry.getAddress()}`);
  console.log(`BADGES_ADDRESS=${await badges.getAddress()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
