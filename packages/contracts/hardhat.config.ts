import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const RELAYER_KEY = process.env.RELAYER_PRIVATE_KEY ?? "0x" + "a".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    baseSepolia: {
      url: process.env.RPC_URL ?? "https://sepolia.base.org",
      accounts: [RELAYER_KEY],
      chainId: 84532,
    },
  },
  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
