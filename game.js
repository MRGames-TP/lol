// Taitrts — lightweight Tetris clone
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nctx = nextCanvas.getContext('2d');
  const COLS = 10, ROWS = 20;
  const BLOCK = 30;
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const startBtn = document.getElementById('start');

  canvas.width = COLS * BLOCK; canvas.height = ROWS * BLOCK;

  const COLORS = ['#000000', '#00f0f0', '#0000f0', '#f0a000', '#f0f000', '#00f000', '#f000f0', '#f05050'];

  const SHAPES = [
    [],
    [[1,1,1,1]], // I
    [[2,2,2],[0,2,0]], // T
    [[3,3,0],[0,3,3]], // Z
    [[0,4,4],[4,4,0]], // S
    [[5,5],[5,5]], // O
    [[6,0,0],[6,6,6]], // L
    [[0,0,7],[7,7,7]]  // J
  ];

  function createMatrix(w,h){ const m=[]; while(h--) m.push(new Array(w).fill(0)); return m; }
  let arena = createMatrix(COLS, ROWS);

  function collide(arena, player){
    const [m, o] = [player.matrix, player.pos];
    for(let y=0;y<m.length;y++) for(let x=0;x<m[y].length;x++){
      if(m[y][x] && (arena[y+o.y] && arena[y+o.y][x+o.x]) !== 0) return true;
    }
    return false;
  }

  function merge(arena, player){
    player.matrix.forEach((row,y)=>row.forEach((val,x)=>{ if(val) arena[y+player.pos.y][x+player.pos.x]=val; }));
  }

  function rotate(matrix, dir){
    for(let y=0;y<matrix.length;y++) for(let x=0;x<y;x++) [matrix[x][y],matrix[y][x]]=[matrix[y][x],matrix[x][y]];
    if(dir>0) matrix.forEach(row=>row.reverse()); else matrix.reverse();
  }

  function randomPiece(){
    const pieces = 'ITZSOJL';
    const mapping = {I:1,T:2,Z:3,S:4,O:5,J:6,L:7};
    const id = pieces[(pieces.length*Math.random())|0];
    return SHAPES[mapping[id]].map(r=>r.slice());
  }

  let audioCtx = null;
  function beep(freq=440, time=0.06, vol=0.05){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + time);
    }catch(e){}
  }

  function sweep(){
    let cleared = 0;
    outer: for(let y=arena.length-1;y>=0;y--){
      for(let x=0;x<arena[y].length;x++) if(arena[y][x]===0) continue outer;
      const row = arena.splice(y,1)[0].fill(0); arena.unshift(row); cleared++; y++;
    }
    if(cleared){ player.lines += cleared; player.score += cleared * 100 * player.level; player.level = 1 + Math.floor(player.lines/10); updateScore(); beep(880, 0.08, 0.06); }
  }

  function draw(){
    ctx.fillStyle = '#06121a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    drawMatrix(arena,{x:0,y:0}); drawMatrix(player.matrix,player.pos);
  }

  function drawMatrix(matrix, offset){
    matrix.forEach((row,y)=>row.forEach((val,x)=>{
      if(val){ ctx.fillStyle = COLORS[val]; ctx.fillRect((x+offset.x)*BLOCK, (y+offset.y)*BLOCK, BLOCK-1, BLOCK-1); }
    }));
  }

  function drawNext(matrix){
    const size = 4; const nBlock = Math.floor(nextCanvas.width / size);
    nctx.fillStyle = '#08121a'; nctx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
    matrix.forEach((row,y)=>row.forEach((val,x)=>{ if(val){ nctx.fillStyle = COLORS[val]; nctx.fillRect(x*nBlock + 6, y*nBlock + 6, nBlock-2, nBlock-2); } }));
  }

  function playerDrop(){ player.pos.y++; if(collide(arena,player)){ player.pos.y--; merge(arena,player); sweep(); playerReset(); } dropCounter=0; }
  function playerMove(dir){ player.pos.x += dir; if(collide(arena,player)) player.pos.x -= dir; }
  function playerRotate(dir){
    const pos = player.pos.x; rotate(player.matrix, dir);
    const kicks = [0, -1, 1, -2, 2];
    for(let i=0;i<kicks.length;i++){ player.pos.x = pos + kicks[i]; if(!collide(arena,player)) return; }
    rotate(player.matrix, -dir); player.pos.x = pos;
  }

  let dropCounter=0, dropInterval=1000; let lastTime=0;
  const player = { pos:{x:0,y:0}, matrix:null, score:0, level:1, lines:0 };
  let next = randomPiece();

  function playerReset(){
    player.matrix = next.map(r=>r.slice()); next = randomPiece(); player.pos.y = 0; player.pos.x = ((COLS/2)|0) - (player.matrix[0].length/2|0);
    if(collide(arena,player)){ arena = createMatrix(COLS, ROWS); player.score=0; player.lines=0; player.level=1; updateScore(); }
    drawNext(next);
  }

  function update(time=0){ const delta = time - lastTime; lastTime = time; dropCounter += delta; if(dropCounter > dropInterval / player.level) playerDrop(); draw(); requestAnimationFrame(update); }

  function updateScore(){ scoreEl.textContent = player.score; levelEl.textContent = player.level; linesEl.textContent = player.lines; }

  document.addEventListener('keydown', event=>{
    if(event.key === 'ArrowLeft') playerMove(-1);
    else if(event.key === 'ArrowRight') playerMove(1);
    else if(event.key === 'ArrowDown') playerDrop();
    else if(event.key === 'ArrowUp') playerRotate(1);
    else if(event.code === 'Space'){
      while(!collide(arena,player)) player.pos.y++;
      player.pos.y--; merge(arena,player); sweep(); playerReset(); beep(600, 0.03, 0.04);
    }
  });

  startBtn.addEventListener('click', ()=>{ arena = createMatrix(COLS, ROWS); player.score=0; player.lines=0; player.level=1; next = randomPiece(); playerReset(); updateScore(); lastTime=0; requestAnimationFrame(update); });

  // initial
  playerReset(); updateScore(); draw();
})();
