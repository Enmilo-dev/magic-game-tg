import { Context, InlineKeyboard } from "grammy";
import { Keypair } from "@solana/web3.js";
import { getUserWallet, getGame, saveGame, ActiveGame } from "../store/redis.js";
import { initializePlayer, startPrediction, transferSol, fetchSolPrice, getBalance } from "../game/solana.js";
import { scheduleResolution } from "../game/engine.js";
import { houseKeypair, GAME_DURATION_MS } from "../config.js";
import { Bot } from "grammy";

export function getMainKeyboard() {
  return new InlineKeyboard()
    .text("🎮 Predict", "predict_start")
    .text("💰 Balance", "balance").row()
    .text("📖 Help", "help")
    .text("🏧 Withdraw", "withdraw");
}

export async function handlePredict(ctx: Context, bot: Bot) {
  const userId = ctx.from?.id!;

  const wallet = await getUserWallet(userId);
  if (!wallet) {
    await ctx.reply("❌ No wallet found. Use /start first.");
    return;
  }

  const existingGame = await getGame(userId);
  if (existingGame) {
    await ctx.reply("⚠️ You already have an active game running. Wait for it to resolve.");
    return;
  }

  // Show direction keyboard
  const keyboard = new InlineKeyboard()
    .text("📈 UP", "dir_up")
    .text("📉 DOWN", "dir_down");

  await ctx.reply(
    "🎮 *Which direction will SOL go in 30 seconds?*",
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
}

export async function handleDirectionCallback(ctx: Context) {
  const direction = ctx.callbackQuery?.data === "dir_up" ? 1 : 0;
  const dirText = direction === 1 ? "📈 UP" : "📉 DOWN";

  await ctx.answerCallbackQuery();

  // Store direction temporarily
  await ctx.reply(
    `You picked *${dirText}*\n\nHow much SOL do you want to bet?`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("0.01", `bet_${direction}_0.01`)
        .text("0.05", `bet_${direction}_0.05`)
        .text("0.1", `bet_${direction}_0.1`).row()
        .text("0.5", `bet_${direction}_0.5`)
        .text("1.0", `bet_${direction}_1.0`),
    }
  );
}

export async function handleBetCallback(ctx: Context, bot: Bot) {
  const data = ctx.callbackQuery?.data!; // bet_1_0.01
  const parts = data.split("_");
  const direction = parseInt(parts[1]);
  const betSol = parseFloat(parts[2]);
  const userId = ctx.from?.id!;
  const chatId = ctx.chat?.id!;

  await ctx.answerCallbackQuery();

  const wallet = await getUserWallet(userId);
  if (!wallet) {
    await ctx.reply("❌ No wallet found. Use /start first.");
    return;
  }

  const existingGame = await getGame(userId);
  if (existingGame) {
    await ctx.reply("⚠️ You already have an active game. Wait for it to resolve.");
    return;
  }

  const userKeypair = Keypair.fromSecretKey(Uint8Array.from(wallet.secretKey));
  const balance = await getBalance(userKeypair.publicKey);

  if (balance < betSol + 0.002) {
    await ctx.reply(
      `❌ *Insufficient balance!*\n\n` +
      `You have: *${balance.toFixed(4)} SOL*\n` +
      `Required: *${(betSol + 0.002).toFixed(4)} SOL* (bet + fees)\n\n` +
      `Use /balance to check your wallet.`,
      { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
    );
    return;
  }

  await ctx.reply("⏳ Starting your prediction...");

  try {
    const currentPrice = await fetchSolPrice();
    const startPriceScaled = Math.floor(currentPrice * 1000);

    await transferSol(userKeypair, houseKeypair.publicKey, betSol);
    await initializePlayer(userKeypair);
    const startTx = await startPrediction(userKeypair, direction, startPriceScaled);

    const game: ActiveGame = {
      userId,
      publicKey: wallet.publicKey,
      direction,
      betSol,
      startPrice: startPriceScaled,
      startTime: Date.now(),
      chatId,
    };
    await saveGame(userId, game);

    const directionEmoji = direction === 1 ? "📈 UP" : "📉 DOWN";
    const seconds = GAME_DURATION_MS / 1000;
    const payout = betSol * 2 * 0.95;

    await ctx.reply(
      `🎮 *Game Started!*\n\n` +
      `Prediction: SOL will go *${directionEmoji}*\n` +
      `Bet: *${betSol} SOL*\n` +
      `SOL Price now: *$${currentPrice.toFixed(3)}*\n` +
      `Potential win: *${payout.toFixed(4)} SOL*\n` +
      `Resolves in: *${seconds} seconds*\n\n` +
      `🔗 Tx: \`${startTx}\``,
      { parse_mode: "Markdown" }
    );

    scheduleResolution(bot, userId, game);
  } catch (err: any) {
    console.error("Bet error:", err);
    await ctx.reply(
      `❌ Error starting game: ${err.message}`,
      { reply_markup: getMainKeyboard() }
    );
  }
}
