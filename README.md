# Toros Token (TRS)

A next-generation DeFi token on Solana featuring staking rewards, community governance, and seamless DEX integration for enhanced yield and participation.

## 🚀 Features

- **Staking Rewards**: Earn TRS by staking your tokens
- **Community Governance**: Participate in protocol decisions  
- **DEX Integration**: Seamless trading across Solana DEXes
- **Low Fees**: Cost-effective transactions on Solana
- **Quadratic Voting**: Fair representation for all holders

## 📊 Token Information

- **Contract Address**: P1QJ6CXJtmLJzgg9NXLiDjy7nbGrfGYwKbAcU4F7C8G
- **Network**: Solana Devnet
- **Decimals**: 9
- **Total Supply**: 1,000,000 TRS
- **Token Standard**: SPL Token

## 🔗 Links

- **dApp (Devnet)**: https://toros-token-lvdr.vercel.app/
- **Explorer**: https://explorer.solana.com/address/P1QJ6CXJtmLJzgg9NXLiDjy7nbGrfGYwKbAcU4F7C8G?cluster=devnet
- **Metadata**: https://raw.githubusercontent.com/Rezaazizian/toros-token/main/metadata.json
- **Logo**: https://raw.githubusercontent.com/Rezaazizian/toros-token/main/logo.png

## 🧪 Quickstart (dApp)

1. Install Node.js 18+ and pnpm/npm.
2. Switch Phantom to Devnet.
3. Local dev:
   - `cd trs-dapp`
   - `npm install`
   - `npm run dev`
   - Open http://localhost:3000
4. On the site:
   - Connect Phantom
   - Click "Refresh TRS Balance"
   - Enter a recipient and amount → "Send"

## ✅ End-to-End Test (Devnet)

1. Ensure both wallets have some devnet SOL (for fees)
2. Sender connects at the dApp and refreshes TRS balance
3. Send a small transfer (e.g., 1 TRS) to recipient
4. In dApp, open "Recent Transfers" and click "view" to confirm on explorer
5. Recipient checks TRS balance (Phantom or `spl-token accounts --owner <recipient>`)

