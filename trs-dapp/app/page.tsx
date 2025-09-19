'use client';

import { useMemo, useState, useEffect } from 'react';
import { PublicKey, Transaction, ParsedTransactionWithMeta } from '@solana/web3.js';
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
  const [showReceive, setShowReceive] = useState(false);
  const [recent, setRecent] = useState<Array<{ sig: string; time: number | null; amount: string; direction: 'in' | 'out' | 'unknown'; counterparty?: string }>>([]);
  const [recentLoading, setRecentLoading] = useState(false);

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
      loadRecentTransfers();
    } else {
      setBalance('-');
      setRecent([]);
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

  function short(addr?: string): string {
    if (!addr) return '';
    return addr.slice(0, 4) + '..' + addr.slice(-4);
  }

  async function loadRecentTransfers() {
    if (!publicKey) return;
    try {
      setRecentLoading(true);
      const ata = await getAssociatedTokenAddress(TRS_MINT, publicKey);
      const sigs = await connection.getSignaturesForAddress(ata, { limit: 10 });
      if (sigs.length === 0) {
        setRecent([]);
        setRecentLoading(false);
        return;
      }
      const parsed = await connection.getParsedTransactions(
        sigs.map((s) => s.signature),
        { maxSupportedTransactionVersion: 0 }
      );

      const items: Array<{ sig: string; time: number | null; amount: string; direction: 'in' | 'out' | 'unknown'; counterparty?: string }> = [];
      for (let idx = 0; idx < parsed.length; idx++) {
        const tx = parsed[idx] as ParsedTransactionWithMeta | null;
        const sig = sigs[idx]?.signature ?? '';
        if (!tx?.meta) {
          items.push({ sig, time: null, amount: '0', direction: 'unknown' });
          continue;
        }
        const pre = tx.meta.preTokenBalances || [];
        const post = tx.meta.postTokenBalances || [];
        const ataStr = ata.toBase58();
        const preBal = pre.find((b) => b.mint === TRS_MINT.toBase58() && b.owner === publicKey.toBase58());
        const postBal = post.find((b) => b.mint === TRS_MINT.toBase58() && b.owner === publicKey.toBase58());
        let amount = '0';
        let direction: 'in' | 'out' | 'unknown' = 'unknown';
        if (preBal && postBal) {
          const preUi = Number(preBal.uiTokenAmount.uiAmount || 0);
          const postUi = Number(postBal.uiTokenAmount.uiAmount || 0);
          const delta = +(postUi - preUi).toFixed(9);
          amount = Math.abs(delta).toString();
          if (delta > 0) direction = 'in';
          else if (delta < 0) direction = 'out';
        }
        // Determine counterparty by inspecting token balance owners for this mint
        let counterparty: string | undefined;
        try {
          const owners = new Set<string>();
          for (const b of pre) if (b.mint === TRS_MINT.toBase58() && b.owner) owners.add(b.owner);
          for (const b of post) if (b.mint === TRS_MINT.toBase58() && b.owner) owners.add(b.owner);
          owners.delete(publicKey.toBase58());
          const others = Array.from(owners);
          if (others.length > 0) counterparty = others[0];
        } catch {}
        items.push({ sig, time: tx.blockTime ?? null, amount, direction, counterparty });
      }
      setRecent(items.slice(0, 5));
    } finally {
      setRecentLoading(false);
    }
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

      <div style={{ marginTop: 24 }}>
        <h3>Receive TRS</h3>
        <button onClick={() => setShowReceive(true)} disabled={!walletReady}>Show QR</button>
        {showReceive && (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd' }}>
            <div>Your address</div>
            <div style={{ wordBreak: 'break-all' }}>{publicKey?.toBase58()}</div>
            {publicKey && (
              <img
                alt="QR"
                style={{ marginTop: 8, width: 200, height: 200 }}
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicKey.toBase58())}`}
              />
            )}
            <div style={{ marginTop: 8 }}>
              <button onClick={() => { navigator.clipboard.writeText(publicKey?.toBase58() || ''); }}>Copy</button>
              <button style={{ marginLeft: 8 }} onClick={() => setShowReceive(false)}>Close</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Recent Transfers</h3>
        <button onClick={loadRecentTransfers} disabled={!walletReady || recentLoading}>{recentLoading ? 'Loading...' : 'Refresh'}</button>
        <ul style={{ marginTop: 12, paddingLeft: 18 }}>
          {recent.length === 0 && <li>No recent transfers</li>}
          {recent.map((r) => (
            <li key={r.sig} style={{ marginBottom: 8 }}>
              <span style={{ textTransform: 'uppercase' }}>{r.direction}</span>
              <span> · {r.amount} TRS</span>
              {r.time && <span> · {new Date(r.time * 1000).toLocaleString()}</span>}
              {r.counterparty && (
                <span>
                  {' '}
                  · {r.direction === 'out' ? 'to' : r.direction === 'in' ? 'from' : ''}{' '}
                  <code>{short(r.counterparty)}</code>
                  <button
                    style={{ marginLeft: 6 }}
                    onClick={() => navigator.clipboard.writeText(r.counterparty!)}
                  >
                    Copy addr
                  </button>
                </span>
              )}
              <span>
                {' '}
                · <a href={`https://explorer.solana.com/tx/${r.sig}?cluster=devnet`} target="_blank" rel="noreferrer">view</a>
                <button
                  style={{ marginLeft: 6 }}
                  onClick={() => navigator.clipboard.writeText(`https://explorer.solana.com/tx/${r.sig}?cluster=devnet`)}
                >
                  Copy link
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

