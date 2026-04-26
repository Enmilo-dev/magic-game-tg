import { Keypair, PublicKey } from "@solana/web3.js";
import { Bot } from "grammy";
import { getUserWallet, deleteGame, ActiveGame } from "../store/redis.js";
import { resolvePrediction, transferSol, fetchSolPrice } from "./solana.js";
import { houseKeypair, HOUSE_FEE, GAME_DURATION_MS } from "../config.js";
import { getMainKeyboard } from "../commands/predict.js";

export async function scheduleResolution(
  bot: Bot,
  userId: number,
  game: ActiveGame
) {
  setTimeout(async () => {
    try {
      // Fetch end price
      const endPrice = await fetchSolPrice();
      const endPriceScaled = Math.floor(endPrice * 1000);

      // Get user wallet
      const wallet = await getUserWallet(userId);
      if (!wallet) {
        await bot.api.sendMessage(
          game.chatId,
          "⚠️ Wallet not found. Game cancelled."
        );
        await deleteGame(userId);
        return;
      }

      const userKeypair = Keypair.fromSecretKey(
        Uint8Array.from(wallet.secretKey)
      );

      // Resolve on chain
      const { tx, win } = await resolvePrediction(userKeypair, endPriceScaled);

      const directionText = game.direction === 1 ? "📈 UP" : "📉 DOWN";
      const startPriceDisplay = (game.startPrice / 1000).toFixed(3);
      const endPriceDisplay = endPrice.toFixed(3);

      if (win) {
        const payout = game.betSol * 2 * (1 - HOUSE_FEE);

        // Transfer winnings from house to user
        await transferSol(
          houseKeypair,
          new PublicKey(game.publicKey),
          payout
        );

        await bot.api.sendMessage(
          game.chatId,
          `🎉 *You Won!*\n\n` +
          `Your prediction: ${directionText}\n` +
          `SOL price: $${startPriceDisplay} → $${endPriceDisplay}\n\n` +
          `💰 Payout: *${payout.toFixed(4)} SOL* (after 5% house fee)\n\n` +
          `🔗 Tx: \`${tx}\``,
          { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
        );
      } else {
        await bot.api.sendMessage(
          game.chatId,
          `😔 *You Lost!*\n\n` +
          `Your prediction: ${directionText}\n` +
          `SOL price: $${startPriceDisplay} → $${endPriceDisplay}\n\n` +
          `Better luck next time! Use /predict to play again.\n\n` +
          `🔗 Tx: \`${tx}\``,
          { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
        );
      }

      await deleteGame(userId);
    } catch (err: any) {
      console.error("Resolution error:", err);
      await bot.api.sendMessage(
        game.chatId,
        `⚠️ Error resolving your game: ${err.message}`
      );
      await deleteGame(userId);
    }
  }, GAME_DURATION_MS);
}
