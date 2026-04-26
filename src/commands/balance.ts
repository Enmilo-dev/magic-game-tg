import { Context } from "grammy";
import { Keypair } from "@solana/web3.js";
import { getUserWallet } from "../store/redis.js";
import { getBalance, fetchSolPrice } from "../game/solana.js";

export async function handleBalance(ctx: Context) {
  const userId = ctx.from?.id!;

  try {
    const wallet = await getUserWallet(userId);
    if (!wallet) {
      await ctx.reply(
        "❌ No wallet found. Use /start to create one."
      );
      return;
    }

    const keypair = Keypair.fromSecretKey(Uint8Array.from(wallet.secretKey));
    const balance = await getBalance(keypair.publicKey);
    const solPrice = await fetchSolPrice();
    const usdValue = balance * solPrice;

    await ctx.reply(
      `💰 *Your Balance*\n\n` +
      `📬 Wallet: \`${wallet.publicKey}\`\n` +
      `SOL: *${balance.toFixed(4)} SOL*\n` +
      `USD: *$${usdValue.toFixed(2)}*\n` +
      `SOL Price: *$${solPrice.toFixed(3)}*`,
      { parse_mode: "Markdown" }
    );
  } catch (err: any) {
    console.error("Balance error:", err);
    await ctx.reply(`❌ Error fetching balance: ${err.message}`);
  }
}
