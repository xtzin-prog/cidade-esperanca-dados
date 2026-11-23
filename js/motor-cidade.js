// Cidade Esperança — motor da cidade isométrica (canvas 2D, sem bibliotecas)
(function () {
  const TW = 64, TH = 32;          // tamanho do tile no mundo
  const PER = 5;                   // quarteirão 4x4 + 1 rua
  const ORDEM_BAIRROS = ["tiktok", "instagram", "kwai", "youtube", "outra"];
  const PELES = ["#ffc79a", "#f2a36e", "#d99a6c", "#b97446", "#8a5a3a", "#ffd9b8"];
  const CABELOS = ["#2a2027", "#5a3a22", "#1c1c22", "#c9a227", "#b85a3a", "#3a2a22"];

  const P = (i, j) => [(i - j) * TW / 2, (i + j) * TH / 2];
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0); };
  const mod = (a, n) => ((a % n) + n) % n;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function escurece(hex, k) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * (1 - k)); g = Math.round(g * (1 - k)); b = Math.round(b * (1 - k));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // anel de quarteirões em espiral a partir do centro
  function espiral(maxR) {
    const out = [];
    for (let r = 1; r <= maxR; r++) {
      const ring = [];
      for (let bx = -r; bx <= r; bx++) for (let by = -r; by <= r; by++)
        if (Math.max(Math.abs(bx), Math.abs(by)) === r) ring.push([bx, by]);
      ring.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
      out.push(...ring);
    }
    return out;
  }

  // ---------------------------------------------------------------- layout da cidade a partir dos dados
  function montarLayout(d) {
    const lojaDe = {};
    d.lojinhas.forEach(l => { if (l.dono) lojaDe[l.dono.toLowerCase()] = l; });
    const mor = d.moradores.slice().sort((a, b) => (a.chegou_em || "").localeCompare(b.chegou_em || "") || String(a.id).localeCompare(String(b.id)));
    // lotes necessários por bairro
    const precisa = {}; ORDEM_BAIRROS.forEach(b => precisa[b] = 0);
    mor.forEach(m => { precisa[m.rede] += (m.arroba && lojaDe[m.arroba.toLowerCase()]) ? 2 : 1; });
    const blocosPorBairro = {}; ORDEM_BAIRROS.forEach(b => blocosPorBairro[b] = Math.max(1, Math.ceil(precisa[b] / 16)));
    const total = ORDEM_BAIRROS.reduce((s, b) => s + blocosPorBairro[b], 0) + 3; // + praça + 2 livres
    let R = 2; while ((2 * R + 1) ** 2 - 1 < total + 2) R++;
    const blocos = new Map(); // "bx,by" -> {tipo, bairro}
    blocos.set("0,0", { tipo: "hospital" });
    blocos.set("-1,0", { tipo: "praca" });
    const livres = espiral(R).filter(([bx, by]) => !blocos.has(bx + "," + by));
    // primeiro anel: 1 quarteirão por bairro
    const fila = livres.slice();
    const doBairro = {}; ORDEM_BAIRROS.forEach(b => doBairro[b] = []);
    ORDEM_BAIRROS.forEach(b => { const q = fila.shift(); if (q) { blocos.set(q.join(","), { tipo: "bairro", bairro: b }); doBairro[b].push(q); } });
    ORDEM_BAIRROS.forEach(b => {
      while (doBairro[b].length < blocosPorBairro[b] && fila.length) {
        const q = fila.shift(); blocos.set(q.join(","), { tipo: "bairro", bairro: b }); doBairro[b].push(q);
      }
    });
    fila.forEach(q => blocos.set(q.join(","), { tipo: "vazio" }));

    const lotesDoBloco = ([bx, by]) => {
      const o = []; const i0 = bx * PER + 1, j0 = by * PER + 1;
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) o.push([i0 + b, j0 + a]);
      return o;
    };
    const ocupado = new Map(); // "i,j" -> objeto
    const objs = [];
    const fila2 = {}; ORDEM_BAIRROS.forEach(b => fila2[b] = doBairro[b].flatMap(lotesDoBloco));
    mor.forEach(m => {
      const lotes = fila2[m.rede];
      const loja = m.arroba ? lojaDe[m.arroba.toLowerCase()] : null;
      const lot = lotes.shift(); if (!lot) return;
      const casa = { tipo: "casa", i: lot[0], j: lot[1], m, cor: CE.CORES_CASA[m.cor_casa] || "#e94b3c", loja: null };
      objs.push(casa); ocupado.set(lot.join(","), casa);
      if (loja) {
        const lot2 = lotes.shift();
        if (lot2) { const lj = { tipo: "loja", i: lot2[0], j: lot2[1], l: loja, m }; casa.loja = lj; objs.push(lj); ocupado.set(lot2.join(","), lj); }
      }
    });
    // lojinhas cujo dono não está nos moradores: vão pro bairro "outra"
    d.lojinhas.forEach(l => {
      if (objs.some(o => o.tipo === "loja" && o.l === l)) return;
      const lot = fila2.outra.shift(); if (!lot) return;
      const lj = { tipo: "loja", i: lot[0], j: lot[1], l, m: null }; objs.push(lj); ocupado.set(lot.join(","), lj);
    });
    // quarteirões
    for (const [k, b] of blocos) {
      const [bx, by] = k.split(",").map(Number);
      const i0 = bx * PER + 1, j0 = by * PER + 1;
      if (b.tipo === "hospital") {
        objs.push({ tipo: "hospital", i: i0, j: j0 });
        for (let t = 0; t < 4; t++) { objs.push({ tipo: "arvore", i: i0 + 3, j: j0 + t, s: hash(k + t) }); if (t < 3) objs.push({ tipo: "arvore", i: i0 + t, j: j0 + 3, s: hash(k + "b" + t) }); }
      } else if (b.tipo === "praca") {
        objs.push({ tipo: "fonte", i: i0 + 1, j: j0 + 1 });
        const pos = [[0, 0], [3, 0], [0, 3], [3, 3], [1, 0], [2, 0], [0, 1], [0, 2], [3, 1], [3, 2], [1, 3], [2, 3]];
        d.estatuas.slice(0, 12).forEach((e, n) => objs.push({ tipo: "estatua", i: i0 + pos[n][0], j: j0 + pos[n][1], e }));
      } else {
        if (b.tipo === "bairro") objs.push({ tipo: "placa", i: i0, j: j0, bairro: b.bairro, bx, by });
        for (const [li, lj] of lotesDoBloco([bx, by])) {
          if (ocupado.has(li + "," + lj)) continue;
          if (b.tipo === "bairro" && li === i0 && lj === j0) continue;
          const h = hash(li * 977 + lj);
          if (h % 7 === 0) objs.push({ tipo: "arvore", i: li, j: lj, s: h });
          else objs.push({ tipo: "lote", i: li, j: lj, bairro: b.bairro || null });
        }
      }
    }
    objs.forEach(o => { o.prof = o.tipo === "hospital" ? o.i + o.j + 6 : o.tipo === "fonte" ? o.i + o.j + 2 : o.i + o.j + 1; });
    objs.sort((a, b) => a.prof - b.prof);
    return { R, blocos, objs, ocupado, min: -R * PER, max: R * PER + PER };
  }

  // ---------------------------------------------------------------- desenho
  class CidadeJogo {
    constructor(canvas, opts = {}) {
      this.cv = canvas; this.ctx = canvas.getContext("2d");
      this.opts = Object.assign({ interativo: true, onToque: null, rotulos: true }, opts);
      this.z = 1; this.cx = 0; this.cy = 80; this.vx = 0; this.vy = 0;
      this.t = 0; this.rodando = false; this.voo = null; this.destaque = null; this.hits = [];
      this.dados = null; this.lay = null; this.andantes = []; this.carros = [];
      this._redimensiona = this.redimensiona.bind(this);
      window.addEventListener("resize", this._redimensiona);
      this.redimensiona();
      if (this.opts.interativo) this.controles();
      document.addEventListener("visibilitychange", () => { if (document.hidden) this.parar(); else this.iniciar(); });
    }
    redimensiona() {
      const r = this.cv.getBoundingClientRect();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
      this.cv.width = this.W * this.dpr; this.cv.height = this.H * this.dpr;
      this.zMin = Math.max(0.25, Math.min(this.W, this.H) / ((this.lay ? (this.lay.max - this.lay.min) : 30) * TW * 0.55));
    }
    setDados(d, manterCamera) {
      const primeiro = !this.dados;
      this.dados = d; this.lay = montarLayout(d); this.redimensiona();
      const pct = Math.min(1, d.arrecadado / (d.meta || 1));
      this.pct = pct;
      // moradores andando (no máximo 80)
      const casas = this.lay.objs.filter(o => o.tipo === "casa");
      this.andantes = casas.slice(-80).map(c => {
        const h = hash(c.m.id);
        const bx = Math.floor((c.i - 1) / PER), by = Math.floor((c.j - 1) / PER);
        return { c, h, s: (h % 1000) / 1000, v: 0.006 + (h % 7) * 0.0012, i0: bx * PER + 1, j0: by * PER + 1,
          pele: PELES[h % PELES.length], cab: CABELOS[(h >> 3) % CABELOS.length] };
      });
      this.carros = [];
      const L = this.lay;
      for (let n = 0; n < 6 + L.R * 2; n++) {
        const h = hash("carro" + n), hor = n % 2 === 0;
        const linha = (Math.floor((h % (2 * L.R + 1))) - L.R) * PER;
        this.carros.push({ hor, linha, pos: (h % 997) / 997, v: 0.02 + (h % 5) * 0.006, dir: h % 3 ? 1 : -1,
          cor: ["#e8402a", "#2a5ad8", "#ffd23a", "#2fb35a", "#ffffff", "#c77dff"][h % 6] });
      }
      if (primeiro || !manterCamera) { this.z = this.zInicial(); this.cx = 0; this.cy = P(2.5, 2.5)[1]; }
    }
    zInicial() { return Math.max(this.zMin, Math.min(1.25, this.W / 430)); }
    iniciar() { if (this.rodando) return; this.rodando = true; this._ult = performance.now(); requestAnimationFrame(this.quadro.bind(this)); }
    parar() { this.rodando = false; }
    quadro(agora) {
      if (!this.rodando) return;
      const dt = Math.min(0.05, (agora - this._ult) / 1000); this._ult = agora; this.t += dt;
      this.atualiza(dt); this.desenha();
      requestAnimationFrame(this.quadro.bind(this));
    }
    atualiza(dt) {
      if (this.voo) {
        const v = this.voo; v.k = Math.min(1, v.k + dt / v.dur); const e = ease(v.k);
        this.cx = v.x0 + (v.x1 - v.x0) * e; this.cy = v.y0 + (v.y1 - v.y0) * e;
        this.z = v.z0 + (v.z1 - v.z0) * e - Math.sin(Math.PI * e) * v.sobe;
        if (v.k >= 1) { this.voo = null; v.fim && v.fim(); }
      } else if (!this.arrastando) {
        this.cx += this.vx * dt; this.cy += this.vy * dt; this.vx *= Math.pow(0.04, dt); this.vy *= Math.pow(0.04, dt);
      }
      if (!this.opts.interativo && this.lay) this.cx = Math.sin(this.t * 0.12) * 120;
      this.andantes.forEach(a => a.s = (a.s + a.v * dt) % 1);
      this.carros.forEach(c => c.pos = mod(c.pos + c.v * dt * c.dir, 1));
      // limites
      if (this.lay) {
        const [x0] = P(this.lay.min, this.lay.max), [x1] = P(this.lay.max, this.lay.min);
        const y1 = P(this.lay.max, this.lay.max)[1];
        this.cx = Math.max(x0, Math.min(x1, this.cx)); this.cy = Math.max(-40, Math.min(y1, this.cy));
      }
    }
    noite() {
      const h = (new Date().getUTCHours() + 21) % 24 + new Date().getUTCMinutes() / 60; // horário de Brasília
      if (h >= 19 || h < 5) return 1; if (h >= 17.5) return (h - 17.5) / 1.5; if (h < 6.5) return 1 - (h - 5) / 1.5; return 0;
    }
    // ---------- conversões
    telaParaMundo(sx, sy) { return [(sx - this.W / 2) / this.z + this.cx, (sy - this.H / 2) / this.z + this.cy]; }
    mundoParaTile(x, y) { const a = y / (TH / 2), b = x / (TW / 2); return [(a + b) / 2, (a - b) / 2]; }
    // ---------- primitivas
    poly(pts, fill, stroke, lw) {
      const c = this.ctx; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
    }
    caixa(i, j, w, d, h, topo, esq, dir) {
      const A = P(i, j), B = P(i + w, j), C = P(i + w, j + d), D = P(i, j + d), up = p => [p[0], p[1] - h];
      this.poly([D, C, up(C), up(D)], esq); this.poly([C, B, up(B), up(C)], dir); this.poly([up(A), up(B), up(C), up(D)], topo);
    }
    face(i, j, w, d, h, lado, u0, u1, v0, v1, cor) {
      const a = lado === "esq" ? P(i, j + d) : P(i + w, j + d), b = lado === "esq" ? P(i + w, j + d) : P(i + w, j);
      const f = (u, v) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - v * h];
      this.poly([f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)], cor);
    }
    telhado(i, j, w, d, h, rh, cor, parede) {
      const up = (p, k) => [p[0], p[1] - k];
      const A = P(i - .05, j - .05), B = P(i + w + .05, j - .05), C = P(i + w + .05, j + d + .05), D = P(i - .05, j + d + .05);
      const r1 = P(i - .05, j + d / 2), r2 = P(i + w + .05, j + d / 2);
      this.poly([up(A, h), up(B, h), up(r2, h + rh), up(r1, h + rh)], escurece(cor, .25));
      this.poly([up(B, h), up(C, h), up(r2, h + rh)], escurece(parede, .1));
      this.poly([up(D, h), up(C, h), up(r2, h + rh), up(r1, h + rh)], cor);
    }
    pilula(x, y, txt, fundo, cor, tam) {
      const c = this.ctx; tam = (tam || 11) * Math.min(1.5, Math.max(.6, Math.pow(1 / this.z, .55)));
      // o emoji do começo é medido/desenhado à parte (no iPhone o measureText erra a largura dos emojis)
      let ic = "", resto = String(txt);
      const m = resto.match(/^(\S+)\s+([\s\S]*)$/);
      if (m && /[^\u0000-ɏ]/.test(m[1]) && !/[A-Za-z0-9@]/.test(m[1])) { ic = m[1]; resto = m[2]; }
      const fonte = `800 ${tam}px "Baloo 2", system-ui, sans-serif`;
      c.font = fonte;
      const wt = c.measureText(resto).width, wi = ic ? tam * 1.35 : 0, pad = tam * .65;
      const w = wt + wi + pad * 2, h = tam * 1.6;
      c.fillStyle = "rgba(0,0,0,.25)"; this.rr(x - w / 2 + 1.5, y - h + 2.5, w, h, h / 2); c.fill();
      c.fillStyle = fundo || "#fff"; this.rr(x - w / 2, y - h, w, h, h / 2); c.fill();
      c.lineWidth = 1.6; c.strokeStyle = "#1a1a1a"; c.stroke();
      const x0 = x - w / 2 + pad, ym = y - h / 2 + .5;
      c.textBaseline = "middle";
      if (ic) {
        c.font = `${tam * .95}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        c.textAlign = "center"; c.fillStyle = "#1a1a1a"; c.fillText(ic, x0 + wi * .45, ym);
        c.font = fonte;
      }
      c.fillStyle = cor || "#1a1a1a"; c.textAlign = "left"; c.fillText(resto, x0 + wi, ym);
      return [x - w / 2, y - h, w, h];
    }
    rr(x, y, w, h, r) { const c = this.ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    boneco(x, y, cor, pele, cab, bob, s) {
      const c = this.ctx; s = s || 1;
      c.fillStyle = "rgba(0,0,0,.22)"; c.beginPath(); c.ellipse(x, y, 6 * s, 2.6 * s, 0, 0, 7); c.fill();
      y += bob;
      c.fillStyle = "#2a2a3a"; c.fillRect(x - 3.4 * s, y - 5 * s, 2.6 * s, 5 * s); c.fillRect(x + 0.8 * s, y - 5 * s, 2.6 * s, 5 * s);
      c.fillStyle = cor; this.rr(x - 4.5 * s, y - 16 * s, 9 * s, 12 * s, 3.5 * s); c.fill();
      c.fillStyle = pele; c.beginPath(); c.arc(x, y - 20.5 * s, 5.4 * s, 0, 7); c.fill();
      c.fillStyle = cab; c.beginPath(); c.arc(x, y - 21.5 * s, 5.6 * s, Math.PI, 0); c.fill();
      c.fillStyle = "#1a1a1a"; c.fillRect(x - 2.4 * s, y - 20.5 * s, 1.2 * s, 1.4 * s); c.fillRect(x + 1.2 * s, y - 20.5 * s, 1.2 * s, 1.4 * s);
    }
    // ---------- desenha um objeto (registra área de toque)
    obj(o) {
      const c = this.ctx, t = this.t, noite = this._noite, mostraRot = this.opts.rotulos && this.z > 0.75;
      let box = null;
      const destacado = this.destaque && (this.destaque === o || (o.m && this.destaque.m === o.m && o.tipo === this.destaque.tipo));
      const pulo = destacado ? Math.abs(Math.sin(t * 6)) * 10 : 0;
      if (o.tipo === "casa") {
        const i0 = o.i + .12, j0 = o.j + .12, w = .76, d = .76, h = 24, rh = 16;
        const misterio = !o.m.arroba;
        const cor = misterio ? "#9a9aa6" : o.cor, parede = misterio ? "#d8d8de" : "#f6efdf";
        c.save(); c.translate(0, -pulo);
        const cc = P(o.i + .5, o.j + .5);
        c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(cc[0], cc[1], 24, 11, 0, 0, 7); c.fill();
        this.caixa(i0, j0, w, d, h, "#fff", parede, escurece(parede, .14));
        const jan = noite > .4 ? "#ffd98a" : "#7fc8ff";
        this.face(i0, j0, w, d, h, "esq", .12, .4, .35, .75, jan);
        this.face(i0, j0, w, d, h, "esq", .55, .82, 0, .7, "#8a5a3a");
        this.face(i0, j0, w, d, h, "dir", .3, .7, .35, .75, jan);
        this.telhado(i0, j0, w, d, h, rh, cor, parede);
        c.restore();
        const topo = [cc[0], cc[1] - h - rh - 10 - pulo];
        if (misterio) this.pilula(topo[0], topo[1], "?", "#fff", "#1a1a1a", 10);
        else if (mostraRot || destacado) this.pilula(topo[0], topo[1], o.m.arroba, "#fff", "#1a1a1a", destacado ? 12 : 9);
        const novo = o.m.chegou_em && (Date.now() - new Date(o.m.chegou_em + "T12:00:00-03:00")) < 2 * 86400000;
        if (novo && Math.sin(t * 5) > -0.3) this.pilula(topo[0], topo[1] - 18, "NOVO!", "#ffd23a", "#1a1a1a", 8);
        box = [cc[0] - 26, cc[1] - h - rh - 30, 52, h + rh + 42];
      } else if (o.tipo === "loja") {
        const i0 = o.i + .08, j0 = o.j + .08, w = .84, d = .84, h = 30;
        const cor = CE.CORES_CASA[o.l.cor] || "#e8402a";
        const cc = P(o.i + .5, o.j + .5);
        c.save(); c.translate(0, -pulo);
        c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.ellipse(cc[0], cc[1], 27, 12, 0, 0, 7); c.fill();
        this.caixa(i0, j0, w, d, h, "#f0e4c8", "#fff6e0", "#e2d4b0");
        this.face(i0, j0, w, d, h, "esq", .08, .92, .12, .6, noite > .4 ? "#ffe9a8" : "#bfe8ff");
        for (let n = 0; n < 6; n++) this.face(i0, j0, w, d, h, "esq", n / 6, (n + 1) / 6, .62, .82, n % 2 ? "#fff" : cor);
        this.face(i0, j0, w, d, h, "dir", .2, .8, .3, .7, "#bfe8ff");
        c.restore();
        const ic = CE.TIPOS_LOJA[o.l.tipo] || "🛍️";
        if (mostraRot || destacado) this.pilula(cc[0], cc[1] - h - 14 - pulo, ic + " " + o.l.nome, "#fff", "#1a1a1a", destacado ? 11 : 9);
        else { c.font = "16px system-ui"; c.textAlign = "center"; c.fillText(ic, cc[0], cc[1] - h - 8); }
        box = [cc[0] - 28, cc[1] - h - 30, 56, h + 42];
      } else if (o.tipo === "hospital") {
        const i0 = o.i + .1, j0 = o.j + .1, w = 2.8, d = 2.8;
        const andares = Math.floor(this.pct * 10 + 1e-9), pronto = this.pct >= 1;
        const h = 14 + andares * 16;
        const cc = P(o.i + 1.5, o.j + 1.5);
        this.poly([P(o.i, o.j), P(o.i + 3, o.j), P(o.i + 3, o.j + 3), P(o.i, o.j + 3)], "#c9a46e");
        this.caixa(i0, j0, w, d, h, "#f4f7fa", "#ffffff", "#dfe6ee");
        for (let a = 0; a < andares; a++) {
          const v0 = (14 + a * 16 + 4) / h, v1 = (14 + a * 16 + 12) / h;
          for (let n = 0; n < 5; n++) {
            this.face(i0, j0, w, d, h, "esq", .06 + n * .19, .17 + n * .19, v0, v1, noite > .4 ? "#ffd98a" : "#7fc8ff");
            this.face(i0, j0, w, d, h, "dir", .06 + n * .19, .17 + n * .19, v0, v1, noite > .4 ? "#f2c870" : "#6ab0e8");
          }
        }
        this.face(i0, j0, w, d, h, "esq", .42, .58, 0, Math.min(.9, 12 / h), "#3a6a9a");
        if (!pronto) {
          c.strokeStyle = "#ffb03a"; c.lineWidth = 2;
          for (const [a, b] of [[P(i0 + w, j0 + d), P(i0, j0 + d)], [P(i0 + w, j0 + d), P(i0 + w, j0)]])
            for (let n = 0; n <= 6; n++) { const x = a[0] + (b[0] - a[0]) * n / 6, y = a[1] + (b[1] - a[1]) * n / 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h - 14); c.stroke(); }
          const g = P(i0 + .3, j0 + .3);
          c.fillStyle = "#ffd23a"; c.strokeStyle = "#8a6a1a"; c.lineWidth = 1.5;
          c.fillRect(g[0] - 3, g[1] - 180, 6, 180); c.strokeRect(g[0] - 3, g[1] - 180, 6, 180);
          c.save(); c.translate(g[0], g[1] - 180); c.rotate(Math.sin(t * .5) * .35);
          c.fillRect(-25, -4, 135, 7); c.strokeRect(-25, -4, 135, 7);
          const cab = 40 + Math.sin(t * 1.3) * 14; c.strokeStyle = "#333"; c.beginPath(); c.moveTo(100, 3); c.lineTo(100, cab); c.stroke();
          c.fillStyle = "#c9a46e"; c.fillRect(93, cab, 14, 10); c.restore();
        } else {
          const tp = [cc[0], cc[1] - h - 2];
          c.fillStyle = "#e8402a"; this.rr(tp[0] - 14, tp[1] - 34, 28, 28, 6); c.fill();
          c.fillStyle = "#fff"; c.fillRect(tp[0] - 4, tp[1] - 30, 8, 20); c.fillRect(tp[0] - 10, tp[1] - 24, 20, 8);
        }
        const rot = this.pilula(cc[0], cc[1] - h - (pronto ? 46 : 26), pronto ? "🏥 HOSPITAL ESPERANÇA" : `🏗️ OBRA DO HOSPITAL ${Math.floor(this.pct * 100)}%`,
          pronto ? "#ffffff" : "#ffd23a", "#1a1a1a", 12);
        box = [cc[0] - 95, cc[1] - h - 70, 190, h + 120];
      } else if (o.tipo === "arvore") {
        const cc = P(o.i + .5, o.j + .5), sw = Math.sin(t * 1.5 + o.s) * 1.2;
        c.fillStyle = "rgba(0,0,0,.18)"; c.beginPath(); c.ellipse(cc[0], cc[1], 12, 5, 0, 0, 7); c.fill();
        c.fillStyle = "#8a5a3a"; c.fillRect(cc[0] - 2, cc[1] - 14, 4, 14);
        c.fillStyle = "#2f8a3a"; c.beginPath(); c.arc(cc[0] + sw, cc[1] - 21, 11, 0, 7); c.fill();
        c.fillStyle = "#7fe07a"; c.beginPath(); c.arc(cc[0] - 3 + sw, cc[1] - 25, 6.5, 0, 7); c.fill();
      } else if (o.tipo === "lote") {
        const cc = P(o.i + .5, o.j + .5);
        if (this.z > 1.35 && this.opts.interativo && hash(o.i * 31 + o.j) % 3 === 0) {
          c.fillStyle = "#6b4a2e"; c.fillRect(cc[0] - 1, cc[1] - 14, 2, 14);
          c.fillStyle = "#d9a85a"; c.strokeStyle = "#6b4a2e"; c.lineWidth = 1; this.rr(cc[0] - 13, cc[1] - 22, 26, 10, 2); c.fill(); c.stroke();
          c.fillStyle = "#3a2410"; c.font = "800 5.5px system-ui"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("À VENDA", cc[0], cc[1] - 17);
        }
        box = [cc[0] - 22, cc[1] - 24, 44, 34];
      } else if (o.tipo === "placa") {
        const cc = P(o.i + .5, o.j + .5), b = CE.BAIRROS[o.bairro];
        c.fillStyle = "#6b4a2e"; c.fillRect(cc[0] - 1.5, cc[1] - 26, 3, 26);
        const r = this.pilula(cc[0], cc[1] - 22, b.icone + " " + b.nome, b.cor, "#1a1a1a", 10);
        box = [r[0], r[1], r[2], r[3] + 26];
      } else if (o.tipo === "fonte") {
        const cc = P(o.i + 1, o.j + 1);
        this.poly([P(o.i - 1, o.j - 1), P(o.i + 3, o.j - 1), P(o.i + 3, o.j + 3), P(o.i - 1, o.j + 3)], "#e8dcc0");
        c.fillStyle = "#c9b48a"; c.beginPath(); c.ellipse(cc[0], cc[1], 34, 17, 0, 0, 7); c.fill();
        c.fillStyle = "#6fc8ff"; c.beginPath(); c.ellipse(cc[0], cc[1] - 2, 28, 13, 0, 0, 7); c.fill();
        c.fillStyle = "#bfe8ff"; for (let n = 0; n < 5; n++) { const a = t * 2 + n * 1.3; c.beginPath(); c.arc(cc[0] + Math.cos(a) * 10, cc[1] - 12 - Math.abs(Math.sin(a * 1.7)) * 10, 2, 0, 7); c.fill(); }
        c.fillStyle = "#d8ccb2"; c.fillRect(cc[0] - 3, cc[1] - 16, 6, 14);
        if (this.z > .6) this.pilula(cc[0], cc[1] - 30, "⛲ PRAÇA DA ESPERANÇA", "#fff", "#1a1a1a", 9);
      } else if (o.tipo === "estatua") {
        const cc = P(o.i + .5, o.j + .5);
        this.caixa(o.i + .25, o.j + .25, .5, .5, 10, "#e8e2d4", "#cfc8b8", "#a8a090");
        this.boneco(cc[0], cc[1] - 10, "#f2c230", "#f2c230", "#d8a020", 0, 1.5);
        if (this.z > .9 && o.e.arroba) this.pilula(cc[0], cc[1] - 52, "🗽 " + o.e.arroba, "#ffd23a", "#1a1a1a", 8);
        box = [cc[0] - 16, cc[1] - 60, 32, 64];
      }
      if (box) this.hits.push({ box, o });
    }
    desenha() {
      const c = this.ctx, L = this.lay; if (!L) return;
      this._noite = this.noite();
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.fillStyle = "#79c94e"; c.fillRect(0, 0, this.W, this.H);
      c.setTransform(this.z * this.dpr, 0, 0, this.z * this.dpr, (this.W / 2 - this.cx * this.z) * this.dpr, (this.H / 2 - this.cy * this.z) * this.dpr);
      // área visível em tiles (com folga)
      const cantos = [[0, 0], [this.W, 0], [0, this.H], [this.W, this.H]].map(([x, y]) => this.mundoParaTile(...this.telaParaMundo(x, y)));
      const iMin = Math.max(L.min, Math.floor(Math.min(...cantos.map(q => q[0]))) - 2), iMax = Math.min(L.max, Math.ceil(Math.max(...cantos.map(q => q[0]))) + 2);
      const jMin = Math.max(L.min, Math.floor(Math.min(...cantos.map(q => q[1]))) - 2), jMax = Math.min(L.max, Math.ceil(Math.max(...cantos.map(q => q[1]))) + 2);
      // borda de terra do mapa
      const A = P(L.min, L.min), B = P(L.max, L.min), C = P(L.max, L.max), D = P(L.min, L.max);
      this.poly([D, C, [C[0], C[1] + 16], [D[0], D[1] + 16]], "#7a5a3a"); this.poly([C, B, [B[0], B[1] + 16], [C[0], C[1] + 16]], "#5a3f28");
      this.poly([A, B, C, D], "#86d65a");
      // chão
      for (let i = iMin; i < iMax; i++) for (let j = jMin; j < jMax; j++) {
        const rua = mod(i, PER) === 0 || mod(j, PER) === 0;
        if (rua) {
          this.poly([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)], "#4a4e58");
          if (mod(i, PER) === 0 && mod(j, PER) !== 0) { const a = P(i + .5, j + .25), b = P(i + .5, j + .75); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
          else if (mod(j, PER) === 0 && mod(i, PER) !== 0) { const a = P(i + .25, j + .5), b = P(i + .75, j + .5); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); }
        } else {
          this.poly([P(i + .1, j + .1), P(i + .9, j + .1), P(i + .9, j + .9), P(i + .1, j + .9)], null, "rgba(255,255,255,.55)", 1);
        }
      }
      // objetos + bonecos + carros, em ordem de profundidade
      this.hits = [];
      const vis = o => o.i >= iMin - 3 && o.i <= iMax && o.j >= jMin - 3 && o.j <= jMax;
      const extra = [];
      this.andantes.forEach(a => {
        const per = a.s * 4, lado = Math.floor(per), f = per - lado, e = -.25, E = 4.25;
        const pts = [[a.i0 + e, a.j0 + e], [a.i0 + E, a.j0 + e], [a.i0 + E, a.j0 + E], [a.i0 + e, a.j0 + E]];
        const p0 = pts[lado], p1 = pts[(lado + 1) % 4];
        const i = p0[0] + (p1[0] - p0[0]) * f, j = p0[1] + (p1[1] - p0[1]) * f;
        extra.push({ tipo: "andante", a, i, j, prof: i + j + 0.5 });
      });
      this.carros.forEach(k => {
        const span = L.max - L.min, p = L.min + k.pos * span;
        const i = k.hor ? p : k.linha + .5 + (k.dir > 0 ? .2 : -.2), j = k.hor ? k.linha + .5 + (k.dir > 0 ? -.2 : .2) : p;
        extra.push({ tipo: "carro", k, i, j, prof: i + j + .5 });
      });
      const lista = L.objs.filter(vis).concat(extra.filter(vis)).sort((a, b) => a.prof - b.prof);
      for (const o of lista) {
        if (o.tipo === "andante") {
          const [x, y] = P(o.i, o.j), a = o.a;
          this.boneco(x, y, a.c.cor, a.pele, a.cab, -Math.abs(Math.sin(this.t * 7 + a.h)) * 1.6, 1);
          if (this.z > 1.3 && this.opts.rotulos) this.pilula(x, y - 30, a.c.m.arroba || "?", "#fff", "#1a1a1a", 7);
          else if (this.z > .85 && a.c.m.profissao && Math.sin(this.t * .7 + a.h) > .93) this.pilula(x, y - 30, "💬 " + a.c.m.profissao, "#fff", "#1a1a1a", 7);
          this.hits.push({ box: [x - 8, y - 30, 16, 32], o: a.c });
        } else if (o.tipo === "carro") {
          const [x, y] = P(o.i, o.j), k = o.k;
          c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(x, y + 1, 9, 4, 0, 0, 7); c.fill();
          c.fillStyle = k.cor; this.rr(x - 8, y - 9, 16, 8, 3); c.fill(); c.strokeStyle = "#1a1a1a"; c.lineWidth = .8; c.stroke();
          c.fillStyle = "#bfe8ff"; this.rr(x - 4, y - 12, 8, 4, 2); c.fill();
        } else this.obj(o);
      }
      // nuvens (sombras passando)
      c.fillStyle = "rgba(255,255,255,.18)";
      for (let n = 0; n < 4; n++) {
        const x = ((n * 420 + this.t * 14) % 1800) - 900 + this.cx * .3, y = -200 + n * 160 + this.cy * .3;
        c.beginPath(); c.ellipse(x, y, 90, 30, 0, 0, 7); c.ellipse(x - 40, y - 14, 50, 26, 0, 0, 7); c.ellipse(x + 40, y - 18, 60, 30, 0, 0, 7); c.fill();
      }
      // noite
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (this._noite > 0) { c.fillStyle = `rgba(10,20,60,${0.38 * this._noite})`; c.fillRect(0, 0, this.W, this.H); }
      this.minimapa && this.desenhaMinimapa();
    }
    // ---------- minimapa
    desenhaMinimapa() {
      const m = this.minimapa; if (!m.classList.contains("on") || !this.lay) return;
      const c = m.getContext("2d"), L = this.lay, S = m.width, span = L.max - L.min, k = S / span / 1.05;
      c.fillStyle = "#79c94e"; c.fillRect(0, 0, S, S);
      const mp = (i, j) => [(i - L.min) * k + S * .025, (j - L.min) * k + S * .025];
      c.fillStyle = "#4a4e58";
      for (let r = L.min; r <= L.max; r += PER) { const [x] = mp(r, 0); c.fillRect(x, 0, k, S); const [, y] = mp(0, r); c.fillRect(0, y, S, k); }
      for (const o of L.objs) {
        const cor = o.tipo === "casa" ? o.cor : o.tipo === "loja" ? "#ffd23a" : o.tipo === "hospital" ? "#fff" : o.tipo === "estatua" ? "#ffd23a" : null;
        if (!cor) continue; const [x, y] = mp(o.i, o.j); const sz = o.tipo === "hospital" ? 3 * k : k;
        c.fillStyle = cor; c.fillRect(x, y, sz, sz);
      }
      const [ci, cj] = this.mundoParaTile(this.cx, this.cy), [x, y] = mp(ci, cj);
      c.strokeStyle = "#1a1a1a"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, 7); c.stroke();
    }
    // ---------- câmera
    voarPara(i, j, z, fim) {
      const [x, y] = P(i, j);
      this.voo = { k: 0, dur: 1.3, x0: this.cx, y0: this.cy, z0: this.z, x1: x, y1: y - 20, z1: z || 1.8, sobe: Math.min(.5, this.z * .35), fim };
      this.vx = this.vy = 0;
    }
    zoomEm(fator, sx, sy) {
      const antes = this.telaParaMundo(sx, sy);
      this.z = Math.max(this.zMin, Math.min(3.2, this.z * fator));
      const depois = this.telaParaMundo(sx, sy);
      this.cx += antes[0] - depois[0]; this.cy += antes[1] - depois[1];
    }
    controles() {
      const cv = this.cv, ptrs = new Map();
      let ini = null, pinca = null, ultimo = null;
      cv.addEventListener("pointerdown", e => {
        cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
        this.voo = null; this.arrastando = true; this.vx = this.vy = 0;
        if (ptrs.size === 1) ini = { x: e.offsetX, y: e.offsetY, t: performance.now(), mov: 0 };
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinca = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: this.z }; }
        ultimo = { x: e.offsetX, y: e.offsetY, t: performance.now() };
      });
      cv.addEventListener("pointermove", e => {
        if (!ptrs.has(e.pointerId)) return;
        const ant = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
        if (ptrs.size === 2 && pinca) {
          const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          const alvo = pinca.z * d / pinca.d; this.zoomEm(alvo / this.z, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
          if (ini) ini.mov = 99; return;
        }
        const dx = e.offsetX - ant[0], dy = e.offsetY - ant[1];
        this.cx -= dx / this.z; this.cy -= dy / this.z;
        if (ini) ini.mov += Math.abs(dx) + Math.abs(dy);
        const agora = performance.now(), dt = Math.max(1, agora - ultimo.t) / 1000;
        this.vx = -(e.offsetX - ultimo.x) / this.z / dt * .6; this.vy = -(e.offsetY - ultimo.y) / this.z / dt * .6;
        ultimo = { x: e.offsetX, y: e.offsetY, t: agora };
      });
      const solta = e => {
        if (!ptrs.has(e.pointerId)) return;
        ptrs.delete(e.pointerId);
        if (ptrs.size < 2) pinca = null;
        if (ptrs.size === 0) {
          this.arrastando = false;
          if (performance.now() - ultimo.t > 80) this.vx = this.vy = 0;
          if (ini && ini.mov < 10 && performance.now() - ini.t < 450) { this.vx = this.vy = 0; this.toque(e.offsetX, e.offsetY); }
          ini = null;
        }
      };
      cv.addEventListener("pointerup", solta); cv.addEventListener("pointercancel", solta);
      cv.addEventListener("wheel", e => { e.preventDefault(); this.voo = null; this.zoomEm(Math.exp(-e.deltaY * .0015), e.offsetX, e.offsetY); }, { passive: false });
    }
    toque(sx, sy) {
      const [x, y] = this.telaParaMundo(sx, sy);
      for (let k = this.hits.length - 1; k >= 0; k--) {
        const h = this.hits[k], [bx, by, bw, bh] = h.box;
        if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) { this.opts.onToque && this.opts.onToque(h.o); return; }
      }
    }
    acharMorador(arroba) {
      arroba = String(arroba || "").trim().toLowerCase(); if (!arroba) return null;
      if (!arroba.startsWith("@")) arroba = "@" + arroba;
      return this.lay.objs.find(o => o.tipo === "casa" && (o.m.arroba || "").toLowerCase() === arroba) || null;
    }
    acharLoja(id) { return this.lay.objs.find(o => o.tipo === "loja" && String(o.l.id) === String(id)) || null; }
    hospital() { return this.lay.objs.find(o => o.tipo === "hospital"); }
  }

  // avatar em SVG (pro balcão da loja e cards)
  function avatarSVG(cor, seed) {
    const h = hash(seed || "x"), pele = PELES[h % PELES.length], cab = CABELOS[(h >> 3) % CABELOS.length];
    return `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="152" rx="40" ry="8" fill="rgba(0,0,0,.2)"/>
      <rect x="22" y="78" width="76" height="80" rx="30" fill="${cor}" stroke="#1a1a1a" stroke-width="4"/>
      <circle cx="60" cy="50" r="36" fill="${pele}" stroke="#1a1a1a" stroke-width="4"/>
      <path d="M24,46 Q60,-6 96,46 Q80,28 60,28 Q40,28 24,46Z" fill="${cab}" stroke="#1a1a1a" stroke-width="4"/>
      <circle cx="47" cy="52" r="4.5" fill="#1a1a1a"/><circle cx="73" cy="52" r="4.5" fill="#1a1a1a"/>
      <path d="M48,66 Q60,76 72,66" stroke="#1a1a1a" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="62" r="6" fill="#ff6f7a" opacity=".4"/><circle cx="82" cy="62" r="6" fill="#ff6f7a" opacity=".4"/></svg>`;
  }

  window.CidadeJogo = CidadeJogo;
  window.avatarSVG = avatarSVG;
})();
