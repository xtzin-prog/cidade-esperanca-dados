/**
 * CIDADE ESPERANÇA — painel na planilha Google
 *
 * Como funciona:
 *  - O formulário do site manda cada doação pra cá (uma linha nova, com ✅ desmarcado).
 *  - Você confere no app do banco se o PIX caiu (procure o CÓDIGO da linha) e marca o ✅.
 *  - Marcou ✅, a casa aparece na cidade sozinha em 1 ou 2 minutos.
 *  - O site só recebe quem tem ✅ e só o que é público (@, profissão, cor, lojinha, estátua).
 *    Valor individual, data e hora ficam só aqui.
 *
 * Instalação (uma vez):
 *  1. Cole este código em Extensões > Apps Script (apague o que tiver lá) e salve.
 *  2. No topo, escolha a função "configurar" e clique em Executar. Autorize com a sua conta.
 *  3. Implantar > Nova implantação > tipo "App da Web":
 *       Executar como: Eu  |  Quem pode acessar: Qualquer pessoa  > Implantar.
 *  4. Copie a "URL do app da Web" e mande pro chat.
 *
 * Atualizar o código depois (mantém a MESMA URL):
 *  - Cole o código novo, salve, rode "configurar" de novo (cria as colunas novas).
 *  - Implantar > Gerenciar implantações > ✏️ (lápis) > Versão: "Nova versão" > Implantar.
 *
 * Vantagens de morador (versão 2):
 *  - CHAVE DA CASA: o código da doação (CExxxx) é a chave. No site, em "🔑 Minha casa",
 *    o morador decora a casa (cor, telhado, pet, carro, placa). Só funciona com ✅.
 *  - NÍVEL DA CASA: soma de tudo que o mesmo @ doou (com ✅):
 *    até R$ 9 = Casinha · R$ 10 = Casa · R$ 30 = Sobrado · R$ 100 = Mansão.
 *  - OUTDOOR: quem doou R$ 20 ou mais (somando) escreve uma frase. Ela só aparece
 *    depois que VOCÊ marcar a coluna "Outdoor ✅". Se a pessoa mudar a frase, o ✅ desmarca.
 */

const ABA = "Doações";
const COLS = ["✅ Confirmado", "Data", "Código", "Item", "Valor (R$)", "@", "Rede", "Profissão", "Cor da casa",
  "Lojinha", "Tipo", "Vende", "Produtos", "Contato", "Fotos (links)", "Frase da estátua", "Observação",
  "Telhado", "Pet", "Carro", "Placa da casa", "Outdoor (frase)", "Outdoor ✅", "Editado em"];
// posição (0 = coluna A) das colunas usadas no código
const C = { ok: 0, data: 1, cod: 2, item: 3, valor: 4, arroba: 5, rede: 6, prof: 7, cor: 8, loja: 9, ltipo: 10, lvende: 11, lprod: 12,
  lcont: 13, fotos: 14, frase: 15, obs: 16, telhado: 17, pet: 18, carro: 19, placa: 20, outdoor: 21, outok: 22, editado: 23 };
const OPCOES = {
  cor: ["vermelho", "azul", "amarelo", "verde", "roxo", "rosa"],
  telhado: ["classico", "laje", "castelo"],
  pet: ["", "cachorro", "gato", "coelho", "papagaio"],
  carro: ["", "carro", "esportivo", "moto"],
};
const NIVEIS = [[100, 4], [30, 3], [10, 2], [0, 1]];   // soma doada -> nível da casa (1 Casinha, 2 Casa, 3 Sobrado, 4 Mansão)
const MIN_OUTDOOR = 20;

function configurar() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(ABA) || ss.insertSheet(ABA, 0);
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight("bold").setBackground("#ffd23a").setWrap(true);
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 110);
  sh.setColumnWidths(2, 4, 120);
  sh.getRange("B:B").setNumberFormat("dd/MM HH:mm");
  sh.getRange("E:E").setNumberFormat("R$ #,##0.00");
  sh.getRange(1, C.editado + 1, sh.getMaxRows(), 1).setNumberFormat("dd/MM HH:mm");
  const vazia = ss.getSheetByName("Página1") || ss.getSheetByName("Sheet1");
  if (vazia && vazia.getName() !== ABA && vazia.getLastRow() === 0) ss.deleteSheet(vazia);
  CacheService.getScriptCache().remove("cidade");
}

// ---------------------------------------------------------------- recebe doação do site
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.hp) return json_({ ok: true });                       // robô (campo escondido preenchido)
    const sh = SpreadsheetApp.getActive().getSheetByName(ABA);
    if (d.acao === "entrar" || d.acao === "salvar") return chave_(sh, d);
    const valor = Math.max(0, Math.min(100000, Number(d.valor) || 0));
    if (!valor) return json_({ ok: false });
    sh.appendRow([false, new Date(), t_(d.codigo, 12), t_(d.item, 30), valor, t_(d.arroba, 40), t_(d.rede, 12), t_(d.profissao, 20),
      t_(d.cor, 12), t_(d.loja_nome, 30), t_(d.loja_tipo, 12), t_(d.loja_vende, 120), t_(d.produtos, 400), t_(d.loja_contato, 80), "",
      t_(d.frase, 50), "", "classico", "", "", "", valor >= MIN_OUTDOOR ? t_(d.outdoor, 60) : "", false, ""]);
    sh.getRange(sh.getLastRow(), 1).insertCheckboxes();
    sh.getRange(sh.getLastRow(), C.outok + 1).insertCheckboxes();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- entrega a cidade pro site
function doGet() {
  const cache = CacheService.getScriptCache();
  const salvo = cache.get("cidade");
  if (salvo) return ContentService.createTextOutput(salvo).setMimeType(ContentService.MimeType.JSON);
  const sh = SpreadsheetApp.getActive().getSheetByName(ABA);
  const linhas = sh ? sh.getDataRange().getValues().slice(1) : [];
  const out = { moradores: [], lojinhas: [], estatuas: [], outdoor: [], arrecadado: 0, doacoes: 0 };
  const grupos = grupos_(linhas);
  linhas.forEach((r, n) => {
    if (r[C.ok] !== true) return;
    out.arrecadado += Number(r[C.valor]) || 0;
    out.doacoes++;
  });
  grupos.forEach(g => {
    const r0 = g.linhas[0].r, rv = visual_(g), linha = g.linhas[0].n + 2;
    const arroba = g.arroba;
    out.moradores.push({ id: "p" + linha, arroba, rede: limpa_(r0[C.rede]) || "outra", profissao: limpa_(r0[C.prof]),
      cor_casa: limpa_(rv[C.cor]) || limpa_(r0[C.cor]) || "vermelho",
      nivel: g.total >= 100 ? "estatua" : g.total >= 50 ? "lojista" : "morador", casa_nivel: nivel_(g.total),
      telhado: ok_("telhado", rv[C.telhado]) || "classico", pet: ok_("pet", rv[C.pet]), carro: ok_("carro", rv[C.carro]),
      placa: limpa_(rv[C.placa]).slice(0, 20), chegou_em: g.data, conquistas: [] });
    // frase do outdoor: a mais nova com ✅ do outdoor
    const comOut = g.linhas.filter(x => x.r[C.outok] === true && limpa_(x.r[C.outdoor])).pop();
    if (comOut && g.total >= MIN_OUTDOOR && arroba) out.outdoor.push({ arroba, frase: limpa_(comOut.r[C.outdoor]).slice(0, 60) });
    g.linhas.forEach(({ r, n }) => {
      const valor = Number(r[C.valor]) || 0;
      if (valor >= 50 && limpa_(r[C.loja])) {
        out.lojinhas.push({ id: "l" + (n + 2), dono: arroba, nome: limpa_(r[C.loja]), tipo: limpa_(r[C.ltipo]) || "outro", vende: limpa_(r[C.lvende]),
          produtos: produtos_(r[C.lprod]), contato: limpa_(r[C.lcont]), cor: limpa_(rv[C.cor]) || limpa_(r[C.cor]) || "vermelho",
          fotos: String(r[C.fotos] || "").split(/\s+/).filter(u => /^https?:\/\//.test(u)).slice(0, 6) });
      }
      if (valor >= 100) out.estatuas.push({ arroba, frase: limpa_(r[C.frase]) });
    });
  });
  out.arrecadado = Math.round(out.arrecadado * 100) / 100;
  const txt = JSON.stringify(out);
  cache.put("cidade", txt, 60);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
}

// junta as linhas com ✅ do mesmo @ (quem doa de novo sobe o nível da mesma casa)
function grupos_(linhas) {
  const mapa = {}, lista = [];
  linhas.forEach((r, n) => {
    if (r[C.ok] !== true) return;
    let arroba = limpa_(r[C.arroba]).replace(/\s+/g, "");
    if (arroba && arroba[0] !== "@") arroba = "@" + arroba;
    const k = arroba ? arroba.toLowerCase() : "#" + n;
    if (!mapa[k]) {
      mapa[k] = { arroba, total: 0, linhas: [],
        data: r[C.data] instanceof Date ? Utilities.formatDate(r[C.data], "America/Sao_Paulo", "yyyy-MM-dd") : "" };
      lista.push(mapa[k]);
    }
    mapa[k].total += Number(r[C.valor]) || 0;
    mapa[k].linhas.push({ r, n });
  });
  return lista;
}
// a linha com a decoração mais recente (editada pelo morador) — senão a última doação
function visual_(g) {
  let melhor = g.linhas[g.linhas.length - 1].r, t = -1;
  g.linhas.forEach(({ r }) => { const e = r[C.editado] instanceof Date ? r[C.editado].getTime() : -1; if (e > t) { t = e; melhor = r; } });
  return melhor;
}
function nivel_(total) { for (const [min, n] of NIVEIS) if (total >= min) return n; return 1; }
function ok_(campo, v) { v = limpa_(v); return OPCOES[campo].indexOf(v) >= 0 ? v : ""; }

// ---------------------------------------------------------------- chave da casa (código CExxxx)
function chave_(sh, d) {
  const cache = CacheService.getScriptCache();
  const erros = Number(cache.get("erros_chave") || 0);
  if (erros > 40) return json_({ ok: false, erro: "espera" });          // muita tentativa errada: pausa de 10 min
  const cod = String(d.codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const linhas = sh.getDataRange().getValues().slice(1);
  const n = cod.length >= 6 ? linhas.findIndex(r => String(r[C.cod]).toUpperCase().replace(/[^A-Z0-9]/g, "") === cod) : -1;
  if (n < 0) { cache.put("erros_chave", String(erros + 1), 600); return json_({ ok: false, erro: "chave" }); }
  const r = linhas[n];
  if (r[C.ok] !== true) return json_({ ok: false, erro: "pendente" });
  const g = grupos_(linhas).find(x => x.linhas.some(y => y.n === n));
  if (d.acao === "salvar") {
    const novo = {
      cor: ok_("cor", d.cor) || limpa_(r[C.cor]) || "vermelho",
      telhado: ok_("telhado", d.telhado) || "classico",
      pet: ok_("pet", d.pet), carro: ok_("carro", d.carro),
      placa: t_(String(d.placa || "").replace(/\s+/g, " ").trim(), 20),
      outdoor: g.total >= MIN_OUTDOOR ? t_(String(d.outdoor || "").replace(/\s+/g, " ").trim(), 60) : "",
    };
    const linha = n + 2;
    const mudouOutdoor = limpa_(r[C.outdoor]) !== limpa_(novo.outdoor);
    sh.getRange(linha, C.cor + 1).setValue(novo.cor);
    sh.getRange(linha, C.telhado + 1, 1, 5).setValues([[novo.telhado, novo.pet, novo.carro, novo.placa, novo.outdoor]]);
    const cx = sh.getRange(linha, C.outok + 1);
    if (cx.getDataValidation() == null) cx.insertCheckboxes();
    if (mudouOutdoor) cx.setValue(false);                                 // frase nova precisa da sua aprovação
    sh.getRange(linha, C.editado + 1).setValue(new Date());
    cache.remove("cidade");
    return json_({ ok: true, outdoor_pendente: !!novo.outdoor && (mudouOutdoor || r[C.outok] !== true) });
  }
  const rv = visual_(g);
  const total = g.total, nv = nivel_(total);
  const prox = NIVEIS.slice().reverse().find(([min, k]) => k === nv + 1);
  return json_({ ok: true, arroba: g.arroba, casa_nivel: nv, falta_proximo: prox ? Math.max(0, Math.ceil(prox[0] - total)) : 0,
    pode_outdoor: total >= MIN_OUTDOOR, falta_outdoor: Math.max(0, Math.ceil(MIN_OUTDOOR - total)),
    cor: limpa_(rv[C.cor]) || "vermelho", telhado: ok_("telhado", rv[C.telhado]) || "classico", pet: ok_("pet", rv[C.pet]),
    carro: ok_("carro", rv[C.carro]), placa: limpa_(rv[C.placa]), outdoor: limpa_(r[C.outdoor]) || limpa_(rv[C.outdoor]),
    outdoor_aprovado: (r[C.outdoor] ? r[C.outok] : rv[C.outok]) === true });
}

// quando você marca/desmarca o ✅, a cidade atualiza mais rápido
function onEdit() {
  CacheService.getScriptCache().remove("cidade");
}

// ---------------------------------------------------------------- utilidades
function t_(s, max) {
  s = String(s == null ? "" : s).slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // evita fórmula maliciosa na planilha
}
function limpa_(s) {
  return String(s == null ? "" : s).replace(/^'/, "").trim();
}
function produtos_(txt) {
  return String(txt || "").split(/\n/).map(l => l.trim()).filter(Boolean).slice(0, 6).map(l => {
    const m = l.match(/^(.*?)[\s\-–:]+(R\$\s?[\d.,]+)\s*$/i);
    return m ? { nome: m[1].trim(), preco: m[2].replace(/\s+/, " ") } : { nome: l };
  });
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
