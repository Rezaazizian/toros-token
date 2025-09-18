const { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, clusterApiUrl } = require("@solana/web3.js");
const fs = require("fs");
const os = require("os");

async function main() {
  const md = await import("@metaplex-foundation/mpl-token-metadata");

  const args = Object.fromEntries(process.argv.slice(2).map(s => { const [k, ...r]=s.split("="); return [k, r.join("=")]; }));
  if (!args.mint || (!args.uri && !args.name && !args.symbol)) {
    console.error('Usage: node update-metadata.js mint=<MINT> [uri=<URI>] [name="Toros"] [symbol=TRS]');
    process.exit(1);
  }

  const mint = new PublicKey(args.mint);
  const name = args.name || "Toros";
  const symbol = args.symbol || "TRS";
  const uri = args.uri || "https://raw.githubusercontent.com/Rezaazizian/toros-token/main/metadata.json";

  const TOKEN_METADATA_PROGRAM_ID = (md.PROGRAM_ID) ? md.PROGRAM_ID : new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const secretPath = process.env.SOLANA_KEYPAIR || (os.homedir() + "/.config/solana/id.json");
  const secret = JSON.parse(fs.readFileSync(secretPath, "utf8"));
  const payer = Keypair.fromSecretKey(Uint8Array.from(secret));

  const [metadataPda] = await PublicKey.findProgramAddress(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );

  let ix;
  if (md.createUpdateMetadataAccountV2Instruction) {
    ix = md.createUpdateMetadataAccountV2Instruction(
      { metadata: metadataPda, updateAuthority: payer.publicKey },
      { updateMetadataAccountArgsV2: { data: { name, symbol, uri, sellerFeeBasisPoints: 0, creators: null, collection: null, uses: null }, updateAuthority: payer.publicKey, primarySaleHappened: null, isMutable: true } }
    );
    console.log("Using Update V2");
  } else if (md.createUpdateMetadataAccountInstruction) {
    ix = md.createUpdateMetadataAccountInstruction(
      { metadata: metadataPda, updateAuthority: payer.publicKey },
      { updateMetadataAccountArgs: { data: { name, symbol, uri, sellerFeeBasisPoints: 0, creators: null }, updateAuthority: payer.publicKey, primarySaleHappened: null } }
    );
    console.log("Using Update V1");
  } else {
    throw new Error("Unsupported mpl-token-metadata build (no Update V2/V1)");
  }

  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
  console.log("Metadata updated. Tx:", sig);
}

main().catch(e=>{ console.error(e); process.exit(1); });
