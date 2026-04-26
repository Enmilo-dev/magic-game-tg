import 'dotenv/config';
import { Bot } from "grammy";
import { redis } from "./store/redis.js";
import { handleStart } from "./commands/start.js";
import { handleBalance } from "./commands/balance.js";
import {
  handlePredict,
  handleDirectionCallback,
  handleBetCallback,
  getMainKeyboard,
} from "./commands/predict.js";

const bot = new Bot(process.env.BOT_TOKEN!);

// Commands
bot.command("start", (ctx) => handleStart(ctx));
bot.command("predict", (ctx) => handlePredict(ctx, bot));
bot.command("balance", (ctx) => handleBalance(ctx));
bot.command("help", async (ctx) => {
  await ctx.reply(
    `🎮 *MagicGame — SOL Price Prediction*\n\n` +
    `Powered by MagicBlock Ephemeral Rollup on Solana devnet\n\n` +
    `*How it works:*\n` +
    `1. Press Predict and choose UP or DOWN\n` +
    `2. Choose your bet amount\n` +
    `3. Wait 30 seconds for resolution\n` +
    `4. Win 1.9x your bet!\n\n` +
    `*Min bet:* 0.01 SOL | *Max bet:* 1.0 SOL\n` +
    `*House fee:* 5%`,
    { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
  );
});

// Callback handlers
bot.callbackQuery("predict_start", (ctx) => handlePredict(ctx, bot));
bot.callbackQuery("balance", async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleBalance(ctx);
});
bot.callbackQuery("help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `🎮 *MagicGame — SOL Price Prediction*\n\n` +
    `Powered by MagicBlock Ephemeral Rollup on Solana devnet\n\n` +
    `*How it works:*\n` +
    `1. Press Predict and choose UP or DOWN\n` +
    `2. Choose your bet amount\n` +
    `3. Wait 30 seconds for resolution\n` +
    `4. Win 1.9x your bet!\n\n` +
    `*Min bet:* 0.01 SOL | *Max bet:* 1.0 SOL\n` +
    `*House fee:* 5%`,
    { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
  );
});
bot.callbackQuery("withdraw", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `🏧 *Withdraw*\n\n` +
    `Currently running on *Solana Devnet*.\n\n` +
    `Withdrawals will be available after mainnet launch. Stay tuned!`,
    { parse_mode: "Markdown", reply_markup: getMainKeyboard() }
  );
});

// Direction callbacks
bot.callbackQuery("dir_up", (ctx) => handleDirectionCallback(ctx));
bot.callbackQuery("dir_down", (ctx) => handleDirectionCallback(ctx));

// Bet callbacks
bot.callbackQuery(/^bet_/, (ctx) => handleBetCallback(ctx, bot));

// Error handler
bot.catch((err) => console.error("Bot error:", err));

async function main() {
  await redis.connect();
  console.log("Redis connected");
  console.log("MagicGame bot starting...");
  await bot.start();
}

main().catch(console.error);
