import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const API = 'https://api.web3.storage/upload';

async function pinFile(filePath, token) {
  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: stream,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.cid;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(s => { const [k,...r]=s.split('='); return [k, r.join('=')]; }));
  if (!args.token || !args.file) { console.error('Usage: node trs-meta/pin-to-ipfs.js token=<W3S_TOKEN> file=<PATH>'); process.exit(1); }
  const cid = await pinFile(args.file, args.token);
  console.log('CID:', cid);
  console.log('Gateway:', `https://ipfs.io/ipfs/${cid}`);
}

main().catch(e => { console.error(e); process.exit(1); });
