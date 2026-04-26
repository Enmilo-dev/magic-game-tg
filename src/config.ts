import "dotenv/config";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";


export const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
export const PLAYER_SEED = Buffer.from("magic_game_player");

export const connection = new Connection(process.env.RPC_URL!, "confirmed");
export const erConnection = new Connection(process.env.ER_RPC_URL!, "confirmed");

export const houseKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.HOUSE_KEYPAIR!))
);

export const GAME_DURATION_MS = 30000; // 30 seconds
export const HOUSE_FEE = 0.05; // 5%
export const MIN_BET_SOL = 0.01;
export const MAX_BET_SOL = 0.5;
