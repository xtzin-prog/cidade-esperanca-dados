// Cidade Esperança — tela do jogo (HUD, cards, busca, lojinhas)
(async function () {
  const $ = id => document.getElementById(id);
  const e = CE.esc;
  let dados = null;

  const jogo = new CidadeJogo($("mapa"), { interativo: true, onToque: abrir });
  jogo.minimapa = $("minimapa");
  window.ceJogo = jogo;

  // ---------------- modal
  function modal(html) { $("m-corpo").innerHTML = html; $("modal").classList.add("on"); }
  function fecha() { $("modal").classList.remove("on"); jogo.destaque = null; }
  $("m-fechar").onclick = fecha;
  $("modal").addEventListener("click", ev => { if (ev.target.id === "modal") fecha(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") { fecha(); saiLoja(); } });

  function compartilhar(url, texto) {
    if (navigator.share) navigator.share({ title: "Cidade Esperança", text: texto, url }).catch(() => {});
    else { navigator.clipboard && navigator.clipboard.writeText(url); alert("Link copiado! Cola onde quiser 💛"); }
  }
  window.ceCompartilhar = compartilhar;
  const base = () => location.href.split("?")[0].split("#")[0];

  // ---------------- cards
  function cardMorador(o) {
    const m = o.m, b = CE.BAIRROS[m.rede];
    const selos = (m.conquistas || []).map(c => `<span class="pill mini branco">${e(CE.CONQUISTAS[c] || c)}</span>`).join("");
    const nome = m.arroba || "Morador misterioso";
    const url = base() + "?morador=" + encodeURIComponent(m.arroba || "");
    modal(`<div style="display:flex;gap:14px;align-items:center">
        <div style="width:84px;flex:none">${avatarSVG(o.cor, m.id)}</div>
        <div><h2>${e(nome)}</h2>
          <span class="pill mini" style="background:${b.cor}">${b.icone} ${e(b.nome)}</span></div></div>
      ${m.profissao ? `<p style="font-size:1.2rem;margin:12px 0 4px">💼 <b>${e(m.profissao)}</b></p>` : ""}
      <p style="margin:4px 0">🏠 Morador desde <b>${e(CE.dataBR(m.chegou_em))}</b></p>
      ${selos ? `<div class="selos">${selos}</div>` : ""}
      ${m.exemplo ? `<p><span class="pill mini vermelho">EXEMPLO</span></p>` : ""}
      <div class="acoes">
        ${o.loja ? `<button class="btn" id="c-loja">🛍️ Visitar lojinha</button>` : ""}
        ${m.arroba ? `<button class="btn branco" id="c-comp">📤 Compartilhar minha casa</button>` : ""}
      </div>`);
    if (o.loja) $("c-loja").onclick = () => { fecha(); entraLoja(o.loja); };
    if (m.arroba) $("c-comp").onclick = () => compartilhar(url, `Eu moro na Cidade Esperança! Olha minha casa 🏠`);
  }
  function cardHospital() {
    const d = dados, pct = Math.min(100, Math.floor(d.arrecadado / d.meta * 100));
    modal(`<h2>🏥 ${pct >= 100 ? "Hospital Esperança" : "Obra do Hospital"}</h2>
      <p>Quando a obra chegar a 100%, a cirurgia de estrabismo acontece. Cada doação faz o prédio ganhar andares!</p>
      <div class="barra"><div style="width:${pct}%"></div></div>
      <p style="font-size:1.15rem"><b>${pct}%</b> · ${CE.reais(d.arrecadado)} de ${CE.reais(d.meta)} · faltam <b>${CE.reais(Math.max(0, d.meta - d.arrecadado))}</b></p>
      <p>🏠 ${d.moradores.length} moradores · 🛍️ ${d.lojinhas.length} lojinhas</p>
      <div class="acoes"><a class="btn verde" href="index.html#doar">💚 Ajudar a obra</a></div>`);
  }
  function cardLote(o) {
    const b = o.bairro ? CE.BAIRROS[o.bairro] : null;
    modal(`<h2>🪧 Lote à venda</h2>
      <p>${b ? `Fica no <b>${e(b.nome)}</b>. ` : ""}Doe qualquer valor e ganhe uma casa com o seu @ aqui na cidade!</p>
      <div class="acoes"><a class="btn verde" href="index.html#doar">🏠 Quero morar aqui</a></div>`);
  }
  function cardBairro(o) {
    const cont = {}; Object.keys(CE.BAIRROS).forEach(k => cont[k] = 0);
    dados.moradores.forEach(m => cont[m.rede]++);
    const max = Math.max(1, ...Object.values(cont));
    const linhas = Object.keys(CE.BAIRROS).sort((a, b) => cont[b] - cont[a]).map(k => `
      <div style="display:flex;gap:8px;align-items:center;margin:6px 0;font-weight:800">
        <span style="width:150px">${CE.BAIRROS[k].icone} ${e(CE.BAIRROS[k].nome.replace("Bairro ", ""))}</span>
        <div class="barra" style="flex:1;height:22px"><div style="width:${cont[k] / max * 100}%;background:${CE.BAIRROS[k].cor}"></div></div>
        <span>${cont[k]}</span></div>`).join("");
    modal(`<h2>${CE.BAIRROS[o.bairro].icone} ${e(CE.BAIRROS[o.bairro].nome)}</h2><p>Qual bairro tem mais moradores?</p>${linhas}
      <div class="acoes"><a class="btn verde" href="index.html#doar">Ajudar meu bairro</a></div>`);
  }
  function cardEstatua(o) {
    modal(`<h2>🗽 ${e(o.e.arroba || "Estátua")}</h2><p style="font-size:1.2rem">“${e(o.e.frase || "Ajudei a construir a esperança!")}”</p>
      <p class="nota">Estátua dourada na Praça da Esperança, para quem doou R$ 100 ou mais.</p>`);
  }
  function abrir(o) {
    jogo.destaque = o;
    if (o.tipo === "casa") cardMorador(o);
    else if (o.tipo === "loja") entraLoja(o);
    else if (o.tipo === "hospital") cardHospital();
    else if (o.tipo === "lote") cardLote(o);
    else if (o.tipo === "placa") cardBairro(o);
    else if (o.tipo === "estatua") cardEstatua(o);
  }

  // ---------------- dentro da lojinha
  function entraLoja(o) {
    const l = o.l, cor = CE.CORES_CASA[l.cor] || "#e8402a", ic = CE.TIPOS_LOJA[l.tipo] || "🛍️";
    jogo.voarPara(o.i + .5, o.j + .5, 2.6);
    const contato = CE.linkSeguro(l.contato);
    const prods = (l.produtos && l.produtos.length ? l.produtos : (l.fotos || []).map((f, n) => ({ nome: n === 0 ? l.vende : "", foto: f })));
    const cards = prods.length ? prods.map(p => `<div class="produto">
        <div class="foto" style="${p.foto ? `background-image:url('${e(p.foto)}')` : ""}">${p.foto ? "" : ic}</div>
        <div class="info">${p.nome ? `<b>${e(p.nome)}</b>` : ""}${p.preco ? `<div class="preco">${e(p.preco)}</div>` : ""}
          ${p.descricao ? `<div class="nota">${e(p.descricao)}</div>` : ""}</div></div>`).join("")
      : `<div class="produto"><div class="foto">${ic}</div><div class="info"><b>${e(l.vende || "Em breve, novidades!")}</b></div></div>`;
    const url = base() + "?loja=" + encodeURIComponent(l.id);
    $("loja").style.setProperty("--cor-loja", cor);
    $("loja").innerHTML = `
      <div class="loja-topo"><button class="btn branco" id="l-sair">⬅ Sair da loja</button>
        <button class="btn branco" id="l-comp">📤 Compartilhar</button></div>
      <div class="letreiro"><span class="placa" style="background:${cor}">${ic} ${e(l.nome)}</span>
        ${l.exemplo ? `<div><span class="pill mini vermelho">EXEMPLO</span></div>` : ""}</div>
      <div class="toldo"></div>
      <div class="balcao"><div class="dono">${avatarSVG(cor, l.dono || l.id)}</div>
        <div class="fala">Oi! Eu sou ${e(l.dono || "o dono")} 👋<br>${l.vende ? e(l.vende) : "Seja bem-vindo à minha lojinha!"}</div></div>
      <div class="prateleira">${cards}</div>
      <div class="faixa-loja">
        ${contato ? `<a class="btn verde" href="${e(contato)}" target="_blank" rel="noopener">💬 Falar com a loja</a>` : ""}
        <small>Lojinha de um apoiador da Cidade Esperança. A venda é direto com o dono.</small></div>`;
    setTimeout(() => $("loja").classList.add("on"), 450);
    $("l-sair").onclick = saiLoja;
    $("l-comp").onclick = () => compartilhar(url, `Conhece a ${l.nome}? Ela fica na Cidade Esperança 🛍️`);
  }
  function saiLoja() { $("loja").classList.remove("on"); jogo.destaque = null; }

  // ---------------- botões
  $("b-hosp").onclick = () => { const h = jogo.hospital(); jogo.voarPara(h.i + 1.5, h.j + 1.5, 1.4, cardHospital); };
  $("b-centro").onclick = () => jogo.voarPara(2.5, 2.5, jogo.zInicial());
  $("b-mini").onclick = () => $("minimapa").classList.toggle("on");
  $("b-busca").onclick = () => {
    modal(`<h2>🔍 Cadê minha casa?</h2><p>Digite o seu @ e o drone te leva até lá.</p>
      <form id="f-busca"><input type="text" id="i-busca" placeholder="@seu_arroba" autocomplete="off" autocapitalize="none">
      <div class="acoes"><button class="btn verde" type="submit">🚁 Procurar</button></div></form><p id="r-busca"></p>`);
    $("i-busca").focus();
    $("f-busca").onsubmit = ev => { ev.preventDefault(); procura($("i-busca").value); };
  };
  function procura(arroba) {
    const o = jogo.acharMorador(arroba);
    if (!o) { $("r-busca") && ($("r-busca").innerHTML = `Ainda não te encontrei… 😢 <a class="pill verde" href="index.html#doar">Doe e ganhe sua casa!</a>`); return; }
    fecha(); jogo.destaque = o;
    jogo.voarPara(o.i + .5, o.j + .5, 2.2, () => setTimeout(() => cardMorador(o), 300));
  }
  $("b-shop").onclick = () => {
    const ls = jogo.lay.objs.filter(o => o.tipo === "loja");
    modal(`<h2>🛍️ Shopping da cidade</h2>${ls.length ? `<div class="grade" style="grid-template-columns:1fr 1fr">${ls.map((o, n) =>
      `<button class="opcao" data-n="${n}"><span class="icone">${CE.TIPOS_LOJA[o.l.tipo] || "🛍️"}</span><span><b>${e(o.l.nome)}</b>${e(o.l.dono || "")}</span></button>`).join("")}</div>`
      : `<p>Ainda não tem lojinha… A primeira pode ser a sua! Doando R$ 50 você ganha uma lojinha e ela aparece no próximo vídeo.</p>
         <div class="acoes"><a class="btn verde" href="index.html#doar">Quero uma lojinha</a></div>`}`);
    document.querySelectorAll("#m-corpo .opcao").forEach(b => b.onclick = () => { fecha(); entraLoja(ls[+b.dataset.n]); });
  };
  $("b-lista").onclick = () => {
    const ms = jogo.lay.objs.filter(o => o.tipo === "casa");
    modal(`<h2>📋 Moradores (${ms.length})</h2>${ms.length ? ms.map((o, n) => `<button class="opcao" data-n="${n}" style="margin:6px 0">
      <span class="icone" style="color:${o.cor}">🏠</span><span><b>${e(o.m.arroba || "Morador misterioso")}</b>${e(o.m.profissao || "")} · ${e(CE.BAIRROS[o.m.rede].nome)}</span></button>`).join("")
      : "<p>Ninguém mudou pra cá ainda. Seja o primeiro morador!</p>"}`);
    document.querySelectorAll("#m-corpo .opcao").forEach(b => b.onclick = () => { const o = ms[+b.dataset.n]; fecha(); jogo.destaque = o; jogo.voarPara(o.i + .5, o.j + .5, 2.2, () => cardMorador(o)); });
  };

  // ---------------- HUD
  function hud() {
    const d = dados, pct = Math.min(100, d.arrecadado / d.meta * 100);
    $("hud-dia").textContent = "DIA " + CE.dia(d);
    $("hud-mor").textContent = "🏠 " + d.moradores.length + (d.moradores.length === 1 ? " MORADOR" : " MORADORES");
    $("hud-lojas").textContent = "🛍️ " + d.lojinhas.length + (d.lojinhas.length === 1 ? " LOJINHA" : " LOJINHAS");
    $("hud-enche").style.width = pct + "%";
    $("hud-meta").textContent = `META DA CIRURGIA ${CE.reais(d.arrecadado)} / ${CE.reais(d.meta)} (${Math.floor(pct)}%)`;
    $("hud-aviso").hidden = !d.aviso; $("hud-aviso").textContent = d.aviso || "";
    const ult = d.moradores.slice().sort((a, b) => (b.chegou_em || "").localeCompare(a.chegou_em || "")).slice(0, 8);
    $("ticker").innerHTML = "<span>" + (ult.length ? ult.map(m => `🏠 ${e(m.arroba || "Um morador misterioso")} chegou no ${e(CE.BAIRROS[m.rede].nome)}!`).join(" · ")
      : "🏗️ A cidade está esperando o primeiro morador… pode ser você!") + "</span>";
  }

  // ---------------- dados
  async function atualiza(primeira) {
    const d = await CE.carregar();
    if (!primeira && dados && JSON.stringify(d) === JSON.stringify(dados)) return;
    dados = d; jogo.setDados(d, !primeira); hud();
  }
  await atualiza(true);
  $("carregando").remove();
  jogo.iniciar();
  setInterval(() => atualiza(false), 60000);

  const q = new URLSearchParams(location.search);
  if (q.get("morador")) setTimeout(() => procura(q.get("morador")), 400);
  else if (q.get("loja")) { const o = jogo.acharLoja(q.get("loja")); if (o) setTimeout(() => entraLoja(o), 400); }
})();
