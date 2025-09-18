'use client';

import { useMemo, useState, useEffect } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';

const TRS_MINT = new PublicKey('P1QJ6CXJtmLJzgg9NXLiDjy7nbGrfGYwKbAcU4F7C8G');
const DECIMALS = 9;

export default function Page() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const [balance, setBalance] = useState<string>('-');
  const [toAddr, setToAddr] = useState('');
  const [amount, setAmount] = useState('0');

  const walletReady = useMemo(() => !!publicKey, [publicKey]);

  const refreshBalance = async () => {
    if (!publicKey) return;
    try {
      const ata = await getAssociatedTokenAddress(TRS_MINT, publicKey);
      const info = await connection.getTokenAccountBalance(ata).catch(() => null);
      if (info?.value?.uiAmountString != null) {
        setBalance(info.value.uiAmountString);
        return;
      }
      const parsed = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: TRS_MINT });
      if (parsed.value.length > 0) {
        const data = parsed.value[0].account.data as any;
        const ui = data?.parsed?.info?.tokenAmount?.uiAmountString ?? '0';
        setBalance(ui);
        return;
      }
      setBalance('0');
    } catch {
      setBalance('0');
    }
  };

  useEffect(() => {
    if (publicKey) {
      refreshBalance();
    } else {
      setBalance('-');
    }
  }, [publicKey]);

  const sendTRS = async () => {
    if (!publicKey) return;
    const recipient = new PublicKey(toAddr.trim());
    const fromAta = await getAssociatedTokenAddress(TRS_MINT, publicKey);
    const toAta = await getAssociatedTokenAddress(TRS_MINT, recipient);

    const ixns = [];
    const toInfo = await connection.getAccountInfo(toAta);
    if (!toInfo) {
      ixns.push(createAssociatedTokenAccountInstruction(publicKey, toAta, recipient, TRS_MINT));
    }
    ixns.push(createTransferInstruction(fromAta, toAta, publicKey, toRaw(amount)));

    const tx = new Transaction().add(...ixns);
    const sig = await sendTransaction(tx, connection);
    alert(`Sent. Tx: ${sig}`);
    await refreshBalance();
  };

  function toRaw(uiAmount: string): bigint {
    const [i, f = ''] = uiAmount.split('.');
    const frac = (f + '000000000').slice(0, 9);
    return BigInt(i || '0') * BigInt(10) ** BigInt(DECIMALS) + BigInt(frac || '0');
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Toros Token (TRS) — Devnet</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <WalletMultiButton />
        <WalletDisconnectButton />
      </div>
      <div style={{ marginTop: 24 }}>
        <div>Wallet: {publicKey?.toBase58() || 'Not connected'}</div>
        <button onClick={refreshBalance} disabled={!walletReady} style={{ marginTop: 8 }}>
          Refresh TRS Balance
        </button>
        <div style={{ marginTop: 8 }}>TRS Balance: {balance}</div>
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>Send TRS</h3>
        <input placeholder="Recipient wallet address" value={toAddr} onChange={(e) => setToAddr(e.target.value)} style={{ width: '100%', padding: 8 }} />
        <input placeholder="Amount (e.g., 12.34)" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: 8, marginTop: 8 }} />
        <button onClick={sendTRS} disabled={!walletReady} style={{ marginTop: 8 }}>Send</button>
      </div>
    </div>
  );
}

