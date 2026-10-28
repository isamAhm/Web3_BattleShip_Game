import type { Metadata } from "next";
import { LobbyClient } from "@/components/lobby/LobbyClient";

export const metadata: Metadata = {
  title: "Lobby · Web3 Battle Arena",
  description: "Find a match, create a room, or jump into a tournament.",
};

export default function PlayPage() {
  return <LobbyClient />;
}
