const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

const MAP_W = 3000, MAP_H = 2000;
const SEGMENT_DIST = 16 * 1.3, SPEED = 4;
const FOOD_COUNT = 50;

let players = {}, foods = [];

// Helper
const rand = (min, max) => Math.random() * (max - min) + min;
function spawnFoods() {
  while (foods.length < FOOD_COUNT) foods.push({
    x: rand(100, MAP_W - 100), y: rand(100, MAP_H - 100),
    radius: rand(8, 16),
    color: `hsl(${rand(0,360)},80%,65%)`
  });
}

spawnFoods();

// When a client connects
wss.on('connection', ws => {
  const id = Date.now() + '' + Math.random();
  let me = { id, name:'', color:`hsl(${rand(0,360)},80%,60%)`, snake:[], dir:{x:1,y:0}, score:0 };
  players[id] = me;

  ws.on('message', msg => {
    const data = JSON.parse(msg);
    if (data.type === 'join') {
      me.name = data.name;
      me.snake = [...Array(10)].map((_, i) => ({x:MAP_W/2 - i*SEGMENT_DIST, y:MAP_H/2}));
    } else if (data.type === 'move' && me.snake.length) {
      const head = me.snake[0];
      const dx = data.x - head.x, dy = data.y - head.y;
      const dist = Math.hypot(dx,dy);
      const nx = dist>0?dx/dist:me.dir.x;
      const ny = dist>0?dy/dist:me.dir.y;
      me.dir = {x:nx, y:ny};
    }
  });

  ws.on('close', () => delete players[id]);
});

// Game loop ~60fps
setInterval(() => {
  spawnFoods();

  Object.values(players).forEach(p => {
    const h = p.snake[0];
    const nx = (h.x + p.dir.x * SPEED + MAP_W) % MAP_W;
    const ny = (h.y + p.dir.y * SPEED + MAP_H) % MAP_H;
    p.snake.unshift({x:nx, y:ny});
    while (p.snake.length > 100) p.snake.pop(); // soft cap

    foods = foods.filter(f => {
      const d = Math.hypot(f.x - nx, f.y - ny);
      if (d < f.radius + 12) {
        p.score++; p.snake.length += f.radius*1.5;
        return false;
      }
      return true;
    });
  });

  // Self/growth bounds
  Object.values(players).forEach(p => {
    let seen = new Set();
    p.snake = p.snake.filter(pt => {
      const key = (Math.floor(pt.x) + ',' + Math.floor(pt.y));
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  });

  // Broadcast state
  const snapshot = {
    players: Object.fromEntries(Object.entries(players).map(([id,p]) => [id, {
      snake:p.snake.slice(0,50),
      color:p.color, score:p.score
    }])),
    foods
  };
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(snapshot));
  });
}, 1000/60);

console.log('WebSocket server running on port', process.env.PORT || 8080);

