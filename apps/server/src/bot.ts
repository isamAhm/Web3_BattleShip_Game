import { io, Socket } from 'socket.io-client';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { commitPlacement, generateSalt, type Ship, type Coord } from '@wba/engine';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

const botAccount = privateKeyToAccount(
  '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
);
const botAddress = botAccount.address;

console.log(`[Bot] Initializing AI sparring partner: ${botAddress}`);

async function authenticate(): Promise<{ cookie: string; sessionToken: string }> {
  // 1. Get Nonce
  const nonceRes = await fetch(`${SERVER_URL}/api/auth/nonce`);
  const nonceJson = (await nonceRes.json()) as any;
  const nonce = nonceJson.data?.nonce ?? nonceJson.nonce;

  // 2. Sign SIWE message
  const domain = 'localhost:3000';
  const uri = 'http://localhost:3000';
  const issuedAt = new Date().toISOString();
  const message = [
    `${domain} wants you to sign in with your Ethereum account:`,
    botAddress,
    '',
    'Sign in to Web3 Battle Arena',
    '',
    `URI: ${uri}`,
    'Version: 1',
    'Chain ID: 84532',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');

  const signature = await botAccount.signMessage({ message });

  // 3. Verify on server
  const verifyRes = await fetch(`${SERVER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, signature, address: botAddress }),
  });

  const verifyJson = (await verifyRes.json()) as any;
  const sessionToken = verifyJson.data?.sessionToken || '';
  const cookie = verifyRes.headers.get('set-cookie') || '';
  console.log('[Bot] Authenticated successfully with backend. Session token acquired.');
  return { cookie, sessionToken };
}

async function startBot() {
  const { cookie, sessionToken } = await authenticate();

  const socket: Socket = io(SERVER_URL, {
    withCredentials: true,
    auth: { token: sessionToken },
    extraHeaders: cookie ? { Cookie: cookie.split(';')[0] } : undefined,
  });

  const validShips: Ship[] = [
    { x: 0, y: 0, length: 5, orientation: 'H' },
    { x: 0, y: 2, length: 4, orientation: 'H' },
    { x: 0, y: 4, length: 3, orientation: 'H' },
    { x: 0, y: 6, length: 3, orientation: 'H' },
    { x: 0, y: 8, length: 2, orientation: 'H' },
  ];
  const validMines: Coord[] = [
    { x: 9, y: 9 },
    { x: 8, y: 8 },
    { x: 7, y: 7 },
  ];
  const salt = generateSalt();
  const commitment = commitPlacement({ ships: validShips, mines: validMines }, salt);

  const firedShots = new Set<string>();

  socket.on('connect', () => {
    console.log('[Bot] Connected to Socket.IO server. Joining matchmaking queue...');
    socket.emit('queue:join');
  });

  socket.on('queue:status', (status) => {
    console.log('[Bot] Waiting in matchmaking queue for an opponent...');
  });

  socket.on('match:found', ({ matchId, roomCode, players }) => {
    console.log(`[Bot] ⚔️ Match Found! vs ${players.find((p: string) => p.toLowerCase() !== botAddress.toLowerCase())}`);
    console.log(`[Bot] Submitting fleet placement for match ${matchId}...`);
    socket.emit('placement:submit', {
      matchId,
      commitment,
      ships: validShips,
      mines: validMines,
      salt,
    });
  });

  socket.on('match:start', ({ matchId, state }) => {
    console.log('[Bot] Battle started! Good luck, Commander.');
    firedShots.clear();
    socket.emit('chat:send', { matchId, text: 'Greetings, Commander. May the best fleet win!' });

    if (state?.currentTurn?.toLowerCase() === botAddress.toLowerCase()) {
      takeShot(matchId);
    }
  });

  socket.on('shot:result', (payload: any) => {
    const turn = payload?.nextTurn || payload?.currentTurn;
    if (turn?.toLowerCase() === botAddress.toLowerCase()) {
      setTimeout(() => takeShot(payload.matchId), 1200);
    }
  });

  socket.on('turn:timeout', ({ player }) => {
    console.log(`[Bot] Turn timeout for player: ${player}`);
  });

  socket.on('match:end', ({ matchId, winner }) => {
    const won = winner?.toLowerCase() === botAddress.toLowerCase();
    console.log(`[Bot] Match ended! Winner: ${winner} (${won ? 'Bot won' : 'Player won'})`);
    socket.emit('chat:send', { matchId, text: won ? 'Honorable match!' : 'Well played, Commander!' });

    // Automatically queue for next challenger in 3 seconds
    setTimeout(() => {
      console.log('[Bot] Re-joining matchmaking queue for next challenger...');
      socket.emit('queue:join');
    }, 3000);
  });

  function takeShot(matchId: string) {
    let x = 0;
    let y = 0;
    let key = '';
    do {
      x = Math.floor(Math.random() * 10);
      y = Math.floor(Math.random() * 10);
      key = `${x},${y}`;
    } while (firedShots.has(key) && firedShots.size < 100);

    firedShots.add(key);
    const colName = 'ABCDEFGHIJ'[y];
    console.log(`[Bot] Firing shot at ${colName}${x + 1} (${x}, ${y})...`);
    socket.emit('shot:fire', { matchId, coordinate: { x, y } });
  }

  socket.on('error', (err) => {
    console.error('[Bot] Socket error:', err);
  });

  // Keep bot process alive indefinitely
  setInterval(() => {
    if (!socket.connected) {
      console.log('[Bot] Reconnecting socket...');
      socket.connect();
    }
  }, 15000);
}

startBot().catch(console.error);
