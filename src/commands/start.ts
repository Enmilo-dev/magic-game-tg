import { Context } from "grammy";
import { Keypair } from "@solana/web3.js";
import { getUserWallet, saveUserWallet } from "../store/redis.js";
import { getBalance, transferSol } from "../game/solana.js";
import { houseKeypair } from "../config.js";
import { getMainKeyboard } from "./predict.js";

export async function handleStart(ctx: Context) {
  const userId = ctx.from?.id!;
  const username = ctx.from?.username || ctx.from?.first_name || "Player";

  await ctx.reply(
    `👋 Welcome to *MagicGame*, ${username}!\n\n` +
    `🎮 Predict if SOL price goes UP or DOWN in 30 seconds.\n` +
    `💰 Win 1.9x your bet (5% house fee).\n\n` +
    `⏳ Setting up your wallet...`,
    { parse_mode: "Markdown" }
  );

  try {
    let wallet = await getUserWallet(userId);

    if (!wallet) {
      const keypair = Keypair.generate();
      wallet = {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
      };
      await saveUserWallet(userId, wallet);
      await transferSol(houseKeypair, keypair.publicKey, 0.05);

      await ctx.reply(
        `✅ *Wallet Created!*\n\n` +
        `📬 Address: \`${wallet.publicKey}\`\n` +
        `💰 Starting balance: *0.05 SOL* (from house)\n\n` +
        `You're ready to play! Use the buttons below to get started.`,
        { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
      );
    } else {
      const balance = await getBalance(
        Keypair.fromSecretKey(Uint8Array.from(wallet.secretKey)).publicKey
      );

      await ctx.reply(
        `✅ *Welcome back, ${username}!*\n\n` +
        `📬 Wallet: \`${wallet.publicKey}\`\n` +
        `💰 Balance: *${balance.toFixed(4)} SOL*\n\n` +
        `Use the buttons below to play.`,
        { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
      );
    }
  } catch (err: any) {
    console.error("Start error:", err);
    await ctx.reply(`❌ Error setting up wallet: ${err.message}`, {
      reply_markup: getMainKeyboard()
    });
  }
}
