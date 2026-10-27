// Usage : npm run hash-code -- 123456
import bcrypt from "bcryptjs";

const code = process.argv[2] ?? "";
if (!/^\d{6}$/.test(code)) {
  console.error("Donne un code à 6 chiffres : npm run hash-code -- 123456");
  process.exit(1);
}
const hash = bcrypt.hashSync(code, 12);
console.log("\nPour Vercel (Settings → Environment Variables), valeur de ACCESS_CODE_HASH :\n");
console.log(hash);
console.log("\nPour .env.local (les $ doivent être échappés) :\n");
console.log(`ACCESS_CODE_HASH=${hash.replace(/\$/g, () => "\\$")}\n`);
