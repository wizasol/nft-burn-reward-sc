import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { BurnReward } from "../target/types/burn_reward";

describe("burn_reward", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.BurnReward as Program<BurnReward>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
