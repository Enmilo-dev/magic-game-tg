import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  connection,
  PROGRAM_ID,
  PLAYER_SEED,
} from "../config.js";
import IDL from "../../idl/magic_game.json" with { type: "json" };

function getProvider(keypair: Keypair): AnchorProvider {
  const wallet = new Wallet(keypair);
  return new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
}

function getProgram(keypair: Keypair): Program {
  const provider = getProvider(keypair);
  return new Program(IDL as Idl, provider);
}

export function getPlayerPDA(publicKey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [PLAYER_SEED, publicKey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export async function initializePlayer(userKeypair: Keypair): Promise<string> {
  const program = getProgram(userKeypair);
  const playerPDA = getPlayerPDA(userKeypair.publicKey);

  const tx = await program.methods
    .initialize()
    .accounts({
      payer: userKeypair.publicKey,
      player: playerPDA,
      systemProgram: SystemProgram.programId,
    })
    .signers([userKeypair])
    .rpc();

  return tx;
}

export async function startPrediction(
  userKeypair: Keypair,
  direction: number,
  startPrice: number
): Promise<string> {
  const program = getProgram(userKeypair);
  const playerPDA = getPlayerPDA(userKeypair.publicKey);

  const tx = await program.methods
    .startPrediction(direction, new BN(startPrice))
    .accounts({
      payer: userKeypair.publicKey,
      player: playerPDA,
    })
    .signers([userKeypair])
    .rpc();

  return tx;
}

export async function resolvePrediction(
  userKeypair: Keypair,
  endPrice: number
): Promise<{ tx: string; win: boolean }> {
  const program = getProgram(userKeypair);
  const playerPDA = getPlayerPDA(userKeypair.publicKey);

  const tx = await program.methods
    .resolvePrediction(new BN(endPrice))
    .accounts({
      payer: userKeypair.publicKey,
      player: playerPDA,
    })
    .signers([userKeypair])
    .rpc();

  // Fetch the player account to check win status
  const playerAccount = await (program.account as any).player.fetch(playerPDA);

  return { tx, win: playerAccount.win };
}

export async function transferSol(
  from: Keypair,
  to: PublicKey,
  solAmount: number
): Promise<string> {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
    })
  );

  const tx = await sendAndConfirmTransaction(connection, transaction, [from]);
  return tx;
}

export async function getBalance(publicKey: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(publicKey);
  return lamports / LAMPORTS_PER_SOL;
}

export async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT"
    );
    const data = await res.json() as { price: string };
    const price = parseFloat(data.price);
    if (isNaN(price)) throw new Error("Invalid price from Binance");
    console.log("SOL price:", price);
    return price;
  } catch {
    // Fallback to CoinGecko
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    const data = await res.json() as { solana: { usd: number } };
    console.log("SOL price (CoinGecko):", data.solana.usd);
    return data.solana.usd;
  }
}
