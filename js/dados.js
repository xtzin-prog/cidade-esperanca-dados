// Cidade Esperança — leitura dos dados (cidade.json + config.json) e utilidades
(function () {
  const BASE = "https://raw.githubusercontent.com/xtzin-prog/cidade-esperanca-dados/main/";
  // no GitHub Pages o arquivo também está no mesmo site; tenta os dois
  const FONTES = ["cidade.json", BASE + "cidade.json"];

  const BAIRROS = {
    tiktok: { nome: "Bairro TikTok", cor: "#25f4ee", icone: "🎵" },
    instagram: { nome: "Bairro Instagram", cor: "#e1306c", icone: "📸" },
    kwai: { nome: "Bairro Kwai", cor: "#ff7a1a", icone: "🎬" },
    youtube: { nome: "Bairro YouTube", cor: "#ff2a2a", icone: "▶️" },
    outra: { nome: "Bairro Outros", cor: "#8a6aa8", icone: "🌐" },
  };
  const CORES_CASA = {
    vermelho: "#e94b3c", azul: "#2a8ad8", amarelo: "#f2c230", verde: "#3fb26b", roxo: "#a86ad8", rosa: "#ff8ac8",
  };
  const TIPOS_LOJA = {
    doces: "🧁", roupas: "👕", arte: "🎨", comida: "🍔", servico: "🛠️", games: "🎮", beleza: "💄", outro: "🛍️",
  };
  const CONQUISTAS = {
    fundador: "🏅 Morador fundador", primeiro_lojista: "🛍️ Primeiro lojista", estatua: "🗽 Estátua da praça",
    chamou_amigo: "🤝 Chamou um amigo",
  };
  // vantagens de morador (decoração com a chave da casa)
  const NIVEIS_CASA = { 1: { nome: "Casinha", icone: "🏠", min: 1 }, 2: { nome: "Casa", icone: "🏡", min: 10 },
    3: { nome: "Sobrado", icone: "🏘️", min: 30 }, 4: { nome: "Mansão", icone: "🏰", min: 100 } };
  const TELHADOS = { classico: "🔺 Clássico", laje: "⬜ Laje com caixa d'água", castelo: "🏰 Torre de castelo", ouro: "👑 Telhado de ouro" };
  const PETS = { "": "Nenhum", cachorro: "🐶 Cachorro", gato: "🐱 Gato", coelho: "🐰 Coelho", papagaio: "🦜 Papagaio", dragao: "🐉 Dragão" };
  // itens raros do Banco da Cidade (comprados com Esperança Coins, a moeda do jogo)
  const ITENS_RAROS = { ouro: { nome: "Telhado de ouro", icone: "👑", preco: 60, campo: "telhado" },
    dragao: { nome: "Pet dragão", icone: "🐉", preco: 30, campo: "pet" } };
  const JUROS_DIA = 0.5;   // cofre do banco: 50% ao dia sobre o que está guardado (juros simples)
  const CARROS = { "": "Nenhum", carro: "🚗 Carro", esportivo: "🏎️ Esportivo", moto: "🏍️ Moto" };
  const MIN_OUTDOOR = 20;

  function vazio() {
    return { versao: 0, lancamento: new Date().toISOString().slice(0, 10), meta: 9750, arrecadado: 0, doacoes: 0, aviso: "",
      moradores: [], lojinhas: [], estatuas: [], enquete: null, diario: [] };
  }

  function normaliza(d) {
    const v = Object.assign(vazio(), d || {});
    v.moradores = (v.moradores || []).map((m, i) => Object.assign({ id: "m" + i, arroba: "", rede: "outra", profissao: "", cor_casa: "vermelho",
      nivel: "morador", casa_nivel: 1, telhado: "classico", pet: "", carro: "", placa: "", chegou_em: v.lancamento, conquistas: [] }, m));
    v.moradores.forEach(m => {
      if (!BAIRROS[m.rede]) m.rede = "outra"; if (!CORES_CASA[m.cor_casa]) m.cor_casa = "vermelho";
      m.casa_nivel = Math.max(1, Math.min(4, Math.floor(Number(m.casa_nivel) || 1)));
      if (!TELHADOS[m.telhado]) m.telhado = "classico"; if (!(m.pet in PETS)) m.pet = ""; if (!(m.carro in CARROS)) m.carro = "";
      m.placa = String(m.placa || "").slice(0, 20);
    });
    v.apoiadores = (v.apoiadores || []).filter(Boolean).map(String).slice(0, 6);
    v.banco = Object.assign({ contas: 0, total_investido: 0, ranking: [] }, v.banco || {});
    v.banco.ranking = (v.banco.ranking || []).filter(x => x && x.arroba).map(x => ({ arroba: String(x.arroba), investido: Math.max(0, Math.floor(Number(x.investido) || 0)) }));
    v.outdoor = (v.outdoor || []).filter(o => o && o.frase).map(o => ({ arroba: String(o.arroba || ""), frase: String(o.frase).slice(0, 60) }));
    v.lojinhas = (v.lojinhas || []).map((l, i) => Object.assign({ id: "l" + i, dono: "", nome: "Lojinha", vende: "", contato: "", fotos: [],
      cor: "vermelho", tipo: "outro", produtos: [] }, l));
    v.estatuas = v.estatuas || [];
    v.diario = (v.diario || []).slice().sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    v.meta = Number(v.meta) || 9750;
    v.arrecadado = Number(v.arrecadado) || 0;
    return v;
  }

  async function busca(url) {
    const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  // junta o cidade.json (fixo, editado pelo chat) com a planilha (doações com ✅)
  function junta(fixo, vivo) {
    if (!vivo) return fixo;
    const d = Object.assign({}, fixo);
    const vistos = new Set((fixo.moradores || []).map(m => (m.arroba || "").toLowerCase()).filter(Boolean));
    d.moradores = (fixo.moradores || []).concat((vivo.moradores || []).filter(m => !m.arroba || !vistos.has(m.arroba.toLowerCase())));
    d.lojinhas = (fixo.lojinhas || []).concat(vivo.lojinhas || []);
    d.estatuas = (fixo.estatuas || []).concat(vivo.estatuas || []);
    d.outdoor = (fixo.outdoor || []).concat(vivo.outdoor || []);
    d.banco = vivo.banco || fixo.banco || null;
    d.apoiadores = vivo.apoiadores || [];
    d.arrecadado = (Number(fixo.arrecadado) || 0) + (Number(vivo.arrecadado) || 0);
    d.doacoes = (Number(fixo.doacoes) || 0) + (Number(vivo.doacoes) || 0);
    return d;
  }

  // conquistas automáticas: 10 primeiros = fundador, primeira lojinha = primeiro lojista
  function conquistas(v) {
    const ord = v.moradores.slice().sort((a, b) => (a.chegou_em || "").localeCompare(b.chegou_em || "") || String(a.id).localeCompare(String(b.id)));
    ord.forEach((m, n) => { m.conquistas = (m.conquistas || []).slice(); if (n < 10 && !m.conquistas.includes("fundador")) m.conquistas.push("fundador"); });
    const donos = new Set(v.lojinhas.map(l => (l.dono || "").toLowerCase()));
    const primeiro = ord.find(m => m.arroba && donos.has(m.arroba.toLowerCase()));
    if (primeiro && !primeiro.conquistas.includes("primeiro_lojista")) primeiro.conquistas.push("primeiro_lojista");
    v.estatuas.forEach(e => { const m = ord.find(x => x.arroba && x.arroba.toLowerCase() === (e.arroba || "").toLowerCase()); if (m && !m.conquistas.includes("estatua")) m.conquistas.push("estatua"); });
    return v;
  }

  let _cfg = null;
  async function config() {
    if (_cfg) return _cfg;
    for (const f of ["config.json", BASE + "config.json"]) {
      try { _cfg = await busca(f); return _cfg; } catch (e) {}
    }
    _cfg = {}; return _cfg;
  }

  async function carregar() {
    const cfg = await config();
    let fixo = null, vivo = null;
    for (const f of FONTES) { try { fixo = await busca(f); break; } catch (e) {} }
    if (cfg.planilha_url) { try { vivo = await busca(cfg.planilha_url); } catch (e) {} }
    if (fixo) {
      const d = junta(fixo, vivo);
      try { localStorage.setItem("ce_cidade", JSON.stringify(d)); } catch (e) {}
      return conquistas(normaliza(d));
    }
    try {
      const c = localStorage.getItem("ce_cidade");
      if (c) return conquistas(normaliza(JSON.parse(c)));
    } catch (e) {}
    return normaliza(null);
  }

  // chave da casa: fala com a planilha e LÊ a resposta (entrar / salvar decoração)
  async function chave(cfg, dados) {
    if (!cfg.planilha_url) return { ok: false, erro: "off" };
    try {
      const r = await fetch(cfg.planilha_url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dados) });
      return await r.json();
    } catch (e) { return { ok: false, erro: "rede" }; }
  }

  // manda a doação pra planilha (sem esperar resposta: o Google não deixa ler)
  async function enviarDoacao(cfg, dados) {
    if (!cfg.planilha_url) return false;
    try {
      await fetch(cfg.planilha_url, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dados) });
      return true;
    } catch (e) { return false; }
  }

  function dia(d) {
    const ini = new Date((d.lancamento || "") + "T00:00:00-03:00");
    const n = Math.floor((Date.now() - ini.getTime()) / 86400000) + 1;
    return Math.max(1, isFinite(n) ? n : 1);
  }

  function reais(v) {
    return "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function linkSeguro(u) {
    u = String(u || "").trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^@/.test(u)) return "https://instagram.com/" + u.slice(1);
    if (/^\+?\d[\d\s()-]{8,}$/.test(u)) return "https://wa.me/" + u.replace(/\D/g, "");
    return "";
  }

  function dataBR(s) {
    if (!s) return "";
    const [a, m, d] = s.slice(0, 10).split("-");
    return d && m ? `${d}/${m}/${a}` : s;
  }

  window.CE = { carregar, config, enviarDoacao, chave, ITENS_RAROS, JUROS_DIA, NIVEIS_CASA, TELHADOS, PETS, CARROS, MIN_OUTDOOR, dia, reais, esc, linkSeguro, dataBR, BAIRROS, CORES_CASA, TIPOS_LOJA, CONQUISTAS };
})();
