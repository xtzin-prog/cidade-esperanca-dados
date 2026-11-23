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
 */

const ABA = "Doações";
const COLS = ["✅ Confirmado", "Data", "Código", "Item", "Valor (R$)", "@", "Rede", "Profissão", "Cor da casa",
  "Lojinha", "Tipo", "Vende", "Produtos", "Contato", "Fotos (links)", "Frase da estátua", "Observação"];

function configurar() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(ABA) || ss.insertSheet(ABA, 0);
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight("bold").setBackground("#ffd23a").setWrap(true);
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 110);
  sh.setColumnWidths(2, 4, 120);
  sh.getRange("B:B").setNumberFormat("dd/MM HH:mm");
  sh.getRange("E:E").setNumberFormat("R$ #,##0.00");
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
    const valor = Math.max(0, Math.min(100000, Number(d.valor) || 0));
    if (!valor) return json_({ ok: false });
    sh.appendRow([false, new Date(), t_(d.codigo, 12), t_(d.item, 30), valor, t_(d.arroba, 40), t_(d.rede, 12), t_(d.profissao, 20),
      t_(d.cor, 12), t_(d.loja_nome, 30), t_(d.loja_tipo, 12), t_(d.loja_vende, 120), t_(d.produtos, 400), t_(d.loja_contato, 80), "",
      t_(d.frase, 50), ""]);
    sh.getRange(sh.getLastRow(), 1).insertCheckboxes();
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
  const out = { moradores: [], lojinhas: [], estatuas: [], arrecadado: 0, doacoes: 0 };
  linhas.forEach((r, n) => {
    if (r[0] !== true) return;
    const valor = Number(r[4]) || 0;
    out.arrecadado += valor;
    out.doacoes++;
    const linha = n + 2;
    let arroba = limpa_(r[5]).replace(/\s+/g, "");
    if (arroba && arroba[0] !== "@") arroba = "@" + arroba;
    const data = r[1] instanceof Date ? Utilities.formatDate(r[1], "America/Sao_Paulo", "yyyy-MM-dd") : "";
    out.moradores.push({ id: "p" + linha, arroba, rede: limpa_(r[6]) || "outra", profissao: limpa_(r[7]),
      cor_casa: limpa_(r[8]) || "vermelho", nivel: valor >= 100 ? "estatua" : valor >= 50 ? "lojista" : "morador", chegou_em: data, conquistas: [] });
    if (valor >= 50 && limpa_(r[9])) {
      out.lojinhas.push({ id: "l" + linha, dono: arroba, nome: limpa_(r[9]), tipo: limpa_(r[10]) || "outro", vende: limpa_(r[11]),
        produtos: produtos_(r[12]), contato: limpa_(r[13]), cor: limpa_(r[8]) || "vermelho",
        fotos: String(r[14] || "").split(/\s+/).filter(u => /^https?:\/\//.test(u)).slice(0, 6) });
    }
    if (valor >= 100) out.estatuas.push({ arroba, frase: limpa_(r[15]) });
  });
  out.arrecadado = Math.round(out.arrecadado * 100) / 100;
  const txt = JSON.stringify(out);
  cache.put("cidade", txt, 60);
  return ContentService.createTextOutput(txt).setMimeType(ContentService.MimeType.JSON);
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
