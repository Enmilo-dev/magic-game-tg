# MagicGame — SOL Price Prediction Bot on Ephemeral Rollup

A Telegram bot where users predict if SOL price goes UP or DOWN in 30 seconds. Built on MagicBlock's Ephemeral Rollup for real-time, zero-fee onchain game state.

## Live Demo
[@magic_game_tg_bot](https://t.me/magic_game_tg_bot)

## How It Works
1. User sends /start → bot generates a Solana wallet for them
2. User taps Predict → picks UP or DOWN → picks bet amount
3. Bot delegates game state to Ephemeral Rollup
4. 30 seconds later → bot fetches live SOL price via Binance API
5. Bot resolves prediction onchain → winner receives 1.9x payout

## MagicBlock Tech Used
- **Ephemeral Rollup** — game session state lives on ER during the 30s window
- **Devnet deployment** — program deployed and verified on Solana devnet

## Program IDs (Devnet)
- magic_game: `HCpnMwBcTrfsRGBriow3vqSEZF7WxsgpQ52jy7WjNphM`
- roll_dice_delegated: `BwS37np2uAnjgJ8rk8REbSSC1GzyYQQEEkEPtYbB9zHT`

## Tech Stack
- **Bot**: grammy + TypeScript + Node.js
- **Blockchain**: Anchor + @coral-xyz/anchor + @solana/web3.js
- **State**: MagicBlock Ephemeral Rollup SDK
- **Storage**: Redis (wallet persistence)
- **Price Feed**: Binance API

## Architecture
User (Telegram) → grammy bot → Anchor program → Ephemeral Rollup → Solana devnet
↑
Redis (wallet store)

## Local Setup
```bash
git clone https://github.com/Enmilo-dev/magic-game-tg
cd magic-game-tg
npm install
cp .env.example .env  # fill in your values
npm run start:dev
```

## Environment Variables
BOT_TOKEN=
HOUSE_KEYPAIR=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
REDIS_USERNAME=
RPC_URL=https://api.devnet.solana.com
ER_RPC_URL=https://devnet.magicblock.app
PROGRAM_ID=HCpnMwBcTrfsRGBriow3vqSEZF7WxsgpQ52jy7WjNphM
