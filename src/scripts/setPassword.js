import readline from 'node:readline';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import connectDB from '../db/index.js';

dotenv.config();

// Setting `password` on the document and calling save() is the ONLY correct way to change a
// password: User has a pre('save') hook that bcrypt-hashes it. User.updateOne({...}, { password })
// and findOneAndUpdate both bypass that hook, so they store the value as plaintext — it then
// never matches bcrypt.compare and the account is silently locked out.
//
// Run: npm run set-password -- owner@sarandasafariresort.com
// Non-interactive: NEW_ADMIN_PASSWORD=... npm run set-password -- <email>

const MIN_LENGTH = 12;
// Published in the public GitHub repo, so it must never be set again.
const KNOWN_DEFAULT = 'Admin@Saranda1998';

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    // Raw mode is unavailable when stdin is piped or the shell is MinTTY, so fall back to a
    // visible prompt rather than failing.
    if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
      stdout.write('[warn] This shell cannot hide input — the password will be visible.\n');
      const rl = readline.createInterface({ input: stdin, output: stdout });
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        stdout.write('\n');
        resolve(value);
      } else if (char === '\u0003') {
        stdin.setRawMode(false);
        stdout.write('\n');
        reject(new Error('Cancelled'));
      } else if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    };
    stdin.on('data', onData);
  });
}

const run = async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run set-password -- <email>');
    console.error('   eg: npm run set-password -- owner@sarandasafariresort.com');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    console.error(`[set-password] No account found for ${email}. Nothing changed.`);
    process.exit(1);
  }
  console.log(`[set-password] Account: ${user.email}  (role: ${user.role})`);

  let password = process.env.NEW_ADMIN_PASSWORD || '';
  let confirmation = password;

  if (!password) {
    password = await promptHidden('New password: ');
    confirmation = await promptHidden('Confirm new password: ');
  }

  if (password !== confirmation) {
    console.error('[set-password] Passwords do not match. Nothing changed.');
    process.exit(1);
  }
  if (password.length < MIN_LENGTH) {
    console.error(`[set-password] Use at least ${MIN_LENGTH} characters. Nothing changed.`);
    process.exit(1);
  }
  if (password === KNOWN_DEFAULT) {
    console.error('[set-password] That password is published in the public repo. Pick another. Nothing changed.');
    process.exit(1);
  }

  user.password = password;
  await user.save();

  console.log(`[set-password] Password updated for ${user.email}.`);
  console.log('[set-password] Tokens issued before now stay valid for up to 7 days.');
  console.log('[set-password] Rotate JWT_SECRET in the Render environment to invalidate them immediately.');
  process.exit(0);
};

run().catch((err) => {
  console.error('[set-password] Failed:', err.message);
  process.exit(1);
});
