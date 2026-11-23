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

  function vazio() {
    return { versao: 0, lancamento: new Date().toISOString().slice(0, 10), meta: 9750, arrecadado: 0, doacoes: 0, aviso: "",
      moradores: [], lojinhas: [], estatuas: [], enquete: null, diario: [] };
  }

  function normaliza(d) {
    const v = Object.assign(vazio(), d || {});
    v.moradores = (v.moradores || []).map((m, i) => Object.assign({ id: "m" + i, arroba: "", rede: "outra", profissao: "", cor_casa: "vermelho",
      nivel: "morador", chegou_em: v.lancamento, conquistas: [] }, m));
    v.moradores.forEach(m => { if (!BAIRROS[m.rede]) m.rede = "outra"; if (!CORES_CASA[m.cor_casa]) m.cor_casa = "vermelho"; });
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

  async function carregar() {
    for (const f of FONTES) {
      try {
        const d = await busca(f);
        try { localStorage.setItem("ce_cidade", JSON.stringify(d)); } catch (e) {}
        return normaliza(d);
      } catch (e) { /* tenta a próxima */ }
    }
    try {
      const c = localStorage.getItem("ce_cidade");
      if (c) return normaliza(JSON.parse(c));
    } catch (e) {}
    return normaliza(null);
  }

  async function config() {
    for (const f of ["config.json", BASE + "config.json"]) {
      try { return await busca(f); } catch (e) {}
    }
    return {};
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

  window.CE = { carregar, config, dia, reais, esc, linkSeguro, dataBR, BAIRROS, CORES_CASA, TIPOS_LOJA, CONQUISTAS };
})();
