// Multiplayer Snake client
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const nameInput = document.getElementById('nameInput');

let socket, playerId;
let players = {};
let foods = [];
let name = '';
const SPEED = 4;
const SEGMENT_RADIUS = 12;
const SEGMENT_DIST = SEGMENT_RADIUS * 1.3;

// Connect to WebSocket server
function connect() {
  socket = new WebSocket('wss://<YOUR_RENDER_SUBDOMAIN>.onrender.com');
  socket.onopen = () => {
    console.log('Connected');
    name = nameInput.value || '🐍 Player';
    socket.send(JSON.stringify({ type: 'join', name }));
    nameInput.disabled = true;
  };
  socket.onmessage = e => {
    const data = JSON.parse(e.data);
    players = data.players;
    foods = data.foods;
    draw();
  };
}
connect();
nameInput.addEventListener('keyup', e => {
  if (e.key === 'Enter' && socket.readyState === WebSocket.OPEN) connect();
});

// Send mouse direction
canvas.addEventListener('mousemove', e => {
  if (!playerId || !players[playerId]) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  socket.send(JSON.stringify({ type: 'move', x, y }));
});

// Drawing
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let pid in players) {
    const p = players[pid];
    ctx.strokeStyle = p.color;
    ctx.lineWidth = SEGMENT_RADIUS * 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const head = p.snake[0];
    ctx.moveTo(head.x, head.y);
    p.snake.forEach(seg => ctx.lineTo(seg.x, seg.y));
    ctx.stroke();

    const h = head;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(h.x, h.y, SEGMENT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (pid === playerId) scoreEl.textContent = `Score: ${p.score}`;
  }

  // Draw food
  foods.forEach(f => {
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}
