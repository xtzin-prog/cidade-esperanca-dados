// Cidade Esperança — tela do jogo (HUD, cards, busca, lojinhas)
(async function () {
  const $ = id => document.getElementById(id);
  const e = CE.esc;
  let dados = null;

  const jogo = new CidadeJogo($("mapa"), { interativo: true, onToque: abrir });
  jogo.minimapa = $("minimapa");
  window.ceJogo = jogo;

  // ---------------- modal
  function modal(html, editor) {
    if (aoFechar && !editor) { const f = aoFechar; aoFechar = null; f(); }
    $("m-corpo").innerHTML = html; $("modal").classList.add("on"); $("modal").classList.toggle("editor", !!editor);
    $("modal").querySelector(".modal").scrollTop = 0;
  }
  let aoFechar = null;
  function fecha() {
    $("modal").classList.remove("on", "editor"); jogo.destaque = null;
    if (aoFechar) { const f = aoFechar; aoFechar = null; f(); }
  }
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
      ${m.arroba ? `<p style="margin:4px 0">${CE.NIVEIS_CASA[m.casa_nivel].icone} Mora num(a) <b>${CE.NIVEIS_CASA[m.casa_nivel].nome}</b>${m.pet ? ` · ${e(CE.PETS[m.pet])}` : ""}${m.carro ? ` · ${e(CE.CARROS[m.carro])}` : ""}</p>` : ""}
      ${m.placa ? `<p style="margin:4px 0">🪧 “${e(m.placa)}”</p>` : ""}
      <p style="margin:4px 0">🏠 Morador desde <b>${e(CE.dataBR(m.chegou_em))}</b></p>
      ${selos ? `<div class="selos">${selos}</div>` : ""}
      ${m.exemplo ? `<p><span class="pill mini vermelho">EXEMPLO</span></p>` : ""}
      <div class="acoes">
        ${o.loja ? `<button class="btn" id="c-loja">🛍️ Visitar lojinha</button>` : ""}
        ${m.arroba ? `<button class="btn branco" id="c-comp">📤 Compartilhar minha casa</button>` : ""}
        ${m.arroba ? `<button class="btn" id="c-chave" style="background:var(--amarelo)">🔑 É minha! Decorar</button>` : ""}
      </div>`);
    if (m.arroba) $("c-chave").onclick = abrirChave;
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
    else if (o.tipo === "outdoor") cardOutdoor();
    else if (o.tipo === "banco") abrirBanco();
  }

  function cardOutdoor() {
    const ms = dados.outdoor || [];
    modal(`<h2>📣 Outdoor da cidade</h2>
      ${ms.length ? ms.map(x => `<p style="margin:8px 0"><b style="color:var(--vermelho)">${e(x.arroba)}</b>: “${e(x.frase)}”</p>`).join("") : "<p>Ainda ninguém escreveu aqui… o primeiro recado pode ser o seu!</p>"}
      <p class="nota">Quem doou <b>${CE.reais(CE.MIN_OUTDOOR)} ou mais</b> (somando as doações) escreve um recado no outdoor, pela 🔑 <b>Minha casa</b>. O recado aparece aqui e no próximo vídeo depois de aprovado.</p>
      <div class="acoes"><button class="btn" style="background:var(--amarelo)" id="o-chave">🔑 Escrever meu recado</button><a class="btn verde" href="index.html#doar">💚 Doar</a></div>`);
    $("o-chave").onclick = abrirChave;
  }

  // ---------------- 🔑 chave da casa: o morador decora a própria casa
  const CHAVE_LS = "ce_chave";
  const lerChave = () => { try { return localStorage.getItem(CHAVE_LS) || ""; } catch (x) { return ""; } };
  const guardaChave = v => { try { localStorage.setItem(CHAVE_LS, v); } catch (x) {} };
  let editando = false;
  async function abrirChave() {
    const cfg = await CE.config();
    modal(`<h2>🔑 Minha casa</h2>
      <p>Digite a <b>chave da sua casa</b>: é o código que apareceu quando você doou (começa com <b>CE</b> e também vai na descrição do seu PIX).</p>
      <form id="f-chave"><input type="text" id="i-chave" placeholder="CE……" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="14" value="${e(lerChave())}">
      <div class="acoes"><button class="btn verde" type="submit" id="b-entrar">🚪 Entrar na minha casa</button></div></form>
      <p class="erro" id="r-chave"></p>
      <p class="nota">Com a chave você troca a cor e o telhado, ganha pet e carro, escreve a placa da porta e (doando ${CE.reais(CE.MIN_OUTDOOR)}+) o recado do outdoor. O que você montar aparece no próximo vídeo!</p>
      <p class="nota">Perdeu a chave? Manda um direct pro <b>${e(cfg.perfil || "@cidadeep")}</b> com o seu @. Ainda não é morador? <a href="index.html#doar">Doe a partir de R$ 1</a> e ganhe a sua.</p>`);
    $("f-chave").onsubmit = async ev => {
      ev.preventDefault();
      const codigo = $("i-chave").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (codigo.length < 6) { $("r-chave").textContent = "A chave tem pelo menos 6 letras/números (ex.: CEAB12)."; return; }
      $("b-entrar").disabled = true; $("b-entrar").textContent = "Abrindo a porta…";
      const r = await CE.chave(cfg, { acao: "entrar", codigo });
      if ($("b-entrar")) { $("b-entrar").disabled = false; $("b-entrar").textContent = "🚪 Entrar na minha casa"; }
      if (!r.ok) {
        $("r-chave").textContent = { chave: "Não achei essa chave 🤔 Confere as letras e tenta de novo.",
          pendente: "Sua doação ainda está sendo conferida. Assim que a casa aparecer na cidade, a chave funciona!",
          espera: "Muitas tentativas agora. Espera uns minutinhos e tenta de novo.",
          off: "A chave ainda não está ativada neste site." }[r.erro] || "Não consegui falar com a cidade agora. Tenta de novo em instantes.";
        return;
      }
      guardaChave(codigo); editor(r, codigo, cfg);
    };
  }

  function editor(info, codigo, cfg) {
    const o = jogo.acharMorador(info.arroba);
    if (!o) { modal(`<h2>🏗️ Quase lá!</h2><p>Sua casa (${e(info.arroba || "sem @")}) ainda está sendo construída no mapa. Volta daqui a 1 minutinho.</p>`); return; }
    const m = o.m, orig = { cor_casa: m.cor_casa, cor: o.cor, telhado: m.telhado, pet: m.pet, carro: m.carro, placa: m.placa };
    const st = { cor: CE.CORES_CASA[info.cor] ? info.cor : m.cor_casa, telhado: info.telhado || "classico", pet: info.pet || "", carro: info.carro || "",
      placa: info.placa || "", outdoor: info.outdoor || "" };
    const aplica = () => { m.cor_casa = st.cor; o.cor = CE.CORES_CASA[st.cor]; m.telhado = st.telhado; m.pet = st.pet; m.carro = st.carro; m.placa = st.placa; };
    let salvo = false;
    editando = true; aplica();
    const N = CE.NIVEIS_CASA[info.casa_nivel] || CE.NIVEIS_CASA[1], prox = CE.NIVEIS_CASA[info.casa_nivel + 1];
    const tem = k => (info.itens || []).includes(k);
    const chips = (nome, mapa, atual) => `<div class="chips peq">${Object.entries(mapa).filter(([k]) => !CE.ITENS_RAROS[k] || tem(k)).map(([k, v]) => `<button type="button" class="chip ${k === atual ? "sel" : ""}" data-${nome}="${k}">${e(v)}</button>`).join("")}</div>`;
    const tela = () => {
      modal(`<h2>🔑 Casa de ${e(info.arroba)}</h2>
        <div class="nivel-casa"><span class="ic">${N.icone}</span><span>Nível ${info.casa_nivel}: <b>${N.nome}</b><br>
          <span class="nota">${prox ? `Doando mais ${CE.reais(info.falta_proximo)} ela vira <b>${prox.icone} ${prox.nome}</b>!` : "Nível máximo 👑"}</span></span></div>
        <label class="campo">Cor</label>
        <div class="cores">${Object.entries(CE.CORES_CASA).map(([k, c]) => `<button type="button" data-cor="${k}" class="${st.cor === k ? "sel" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("")}</div>
        <label class="campo">Telhado</label>${chips("tel", CE.TELHADOS, st.telhado)}
        <label class="campo">Pet</label>${chips("pet", CE.PETS, st.pet)}
        <label class="campo">Carro na garagem</label>${chips("car", CE.CARROS, st.carro)}
        ${tem("ouro") && tem("dragao") ? "" : `<p class="nota">✨ Telhado de ouro e pet dragão: compre com Esperança Coins no <a href="#" id="e-banco">🏦 Banco da Cidade</a>.</p>`}
        <label class="campo" for="e-placa">🪧 Placa da porta (até 20 letras)</label>
        <input type="text" id="e-placa" maxlength="20" placeholder="Ex.: Lar doce lar" value="${e(st.placa)}">
        <label class="campo" for="e-out">📣 Recado no outdoor da cidade</label>
        ${info.pode_outdoor ? `<textarea id="e-out" maxlength="60" placeholder="Um recado pra cidade inteira (até 60 letras)">${e(st.outdoor)}</textarea>
          <p class="nota">${info.outdoor_aprovado && st.outdoor ? "✅ Seu recado está no outdoor." : "O recado aparece depois de aprovado (sem palavrão nem propaganda enganosa)."}</p>`
          : `<p class="nota">🔒 Libera quando você completar ${CE.reais(CE.MIN_OUTDOOR)} em doações (faltam ${CE.reais(info.falta_outdoor)}).</p>`}
        <p class="erro" id="e-erro"></p>
        <div class="acoes"><button class="btn branco" id="e-sair">Sair</button><button class="btn verde grande" id="e-salvar">💾 Salvar minha casa</button></div>`, true);
      document.querySelectorAll("[data-cor]").forEach(b => b.onclick = () => { st.cor = b.dataset.cor; aplica(); tela(); });
      document.querySelectorAll("[data-tel]").forEach(b => b.onclick = () => { st.telhado = b.dataset.tel; aplica(); tela(); });
      document.querySelectorAll("[data-pet]").forEach(b => b.onclick = () => { st.pet = b.dataset.pet; aplica(); tela(); });
      document.querySelectorAll("[data-car]").forEach(b => b.onclick = () => { st.carro = b.dataset.car; aplica(); tela(); });
      $("e-placa").oninput = ev => { st.placa = ev.target.value; aplica(); };
      if ($("e-out")) $("e-out").oninput = ev => { st.outdoor = ev.target.value; };
      $("e-sair").onclick = fecha;
      if ($("e-banco")) $("e-banco").onclick = ev => { ev.preventDefault(); fecha(); abrirBanco(); };
      $("e-salvar").onclick = async () => {
        $("e-salvar").disabled = true; $("e-salvar").textContent = "Salvando…";
        const r = await CE.chave(cfg, Object.assign({ acao: "salvar", codigo }, st));
        if (!r.ok) { $("e-erro").textContent = "Não deu pra salvar agora 😢 Tenta de novo em instantes."; $("e-salvar").disabled = false; $("e-salvar").textContent = "💾 Salvar minha casa"; return; }
        salvo = true;
        modal(`<div class="centro"><div style="font-size:3.5rem">🏡</div><h2 style="margin:0 0 8px">Casa salva! ✅</h2>
          <p>Em até 1 minuto todo mundo que abrir a cidade vê a sua casa nova. E ela vai aparecer assim no próximo vídeo 🎥</p>
          ${r.outdoor_pendente ? `<p class="nota">📣 Seu recado do outdoor vai aparecer assim que for aprovado.</p>` : ""}
          <div class="acoes" style="justify-content:center"><button class="btn branco" id="s-comp">📤 Mostrar minha casa</button><button class="btn verde" id="s-ok">Fechar</button></div></div>`, true);
        $("s-ok").onclick = fecha;
        $("s-comp").onclick = () => compartilhar(base() + "?morador=" + encodeURIComponent(info.arroba), "Olha como ficou minha casa na Cidade Esperança 🏡");
      };
    };
    aoFechar = () => { editando = false; if (!salvo) Object.assign(m, { cor_casa: orig.cor_casa, telhado: orig.telhado, pet: orig.pet, carro: orig.carro, placa: orig.placa }), o.cor = orig.cor; };
    jogo.destaque = null;
    jogo.voarPara(o.i + 1, o.j + 1, 2.4, null, jogo.H * .14 / 2.4);
    tela();
  }

  // ---------------- 🏦 Banco da Cidade (moeda só do jogo)
  const AVISO_EC = `<div class="aviso-ec">🪙 <b>Esperança Coins (EC)</b> são a moeda do jogo: cada R$ 1 doado vira 1 EC.
    <b>Elas não valem dinheiro, não podem ser sacadas e não são investimento de verdade.</b>
    Servem pra render no cofre, comprar itens raros e subir no ranking.</div>`;
  const FESTA = `<p class="nota">🎉 <b>Depois da cirurgia</b>, o banco anuncia o <b>Dia da Festa</b>: todo morador ganha o mesmo presente (um vídeo personalizado), não importa quanto doou.</p>`;
  const fmtEC = v => (Math.floor(Number(v) * 100) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  function rankingHTML(n) {
    const r = (dados.banco && dados.banco.ranking) || [];
    return r.length ? `<ol class="ranking">${r.slice(0, n).map((x, k) => `<li><span>${["🥇", "🥈", "🥉"][k] || (k + 1) + "º"}</span><b>${e(x.arroba)}</b><span class="ec">🪙 ${x.investido} EC</span></li>`).join("")}</ol>`
      : `<p>Ninguém guardou coins no cofre ainda… o 1º lugar pode ser seu!</p>`;
  }
  const erroChave = erro => ({ chave: "Não achei essa chave 🤔 Confere as letras e tenta de novo.",
    pendente: "Sua doação ainda está sendo conferida. Assim que a casa aparecer na cidade, a chave funciona!",
    espera: "Muitas tentativas agora. Espera uns minutinhos e tenta de novo.",
    sem_arroba: "Essa doação foi feita sem @, então não dá pra abrir conta. Chama no direct que a gente resolve.",
    off: "O banco ainda não está ativado neste site." }[erro] || "Não consegui falar com o banco agora. Tenta de novo em instantes.");
  async function abrirBanco() {
    const cfg = await CE.config();
    const b = jogo.banco(); if (b) jogo.voarPara(b.i + 2, b.j + 2, Math.max(jogo.zMin, 1.1));
    const ch = lerChave();
    if (ch) {
      modal(`<h2>🏦 Banco da Cidade</h2><p>Abrindo o cofre… 🔐</p>`);
      const r = await CE.chave(cfg, { acao: "banco", codigo: ch });
      if (r.ok) { telaBanco(r, ch, cfg); return; }
    }
    modal(`<h2>🏦 Banco da Cidade</h2>${AVISO_EC}
      <h3 style="margin:14px 0 4px">🔓 Entrar na minha conta</h3>
      <p style="margin:0 0 6px">Use a <b>chave da sua casa</b> (o código CE… que apareceu quando você doou).</p>
      <form id="f-bchave"><input type="text" id="i-bchave" placeholder="CE……" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="14">
      <div class="acoes"><button class="btn verde" type="submit" id="b-bentrar">🏦 Entrar no banco</button></div></form>
      <p class="erro" id="r-bchave"></p>
      <p class="nota">Ainda não é morador? <a href="index.html#doar">Doe a partir de R$ 1</a>: cada real vira 1 coin.</p>
      <h3 style="margin:14px 0 4px">🏆 Maiores investidores</h3>${rankingHTML(10)}${FESTA}`);
    $("f-bchave").onsubmit = async ev => {
      ev.preventDefault();
      const codigo = $("i-bchave").value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (codigo.length < 6) { $("r-bchave").textContent = "A chave tem pelo menos 6 letras/números (ex.: CEAB12)."; return; }
      $("b-bentrar").disabled = true; $("b-bentrar").textContent = "Abrindo…";
      const r = await CE.chave(cfg, { acao: "banco", codigo });
      if ($("b-bentrar")) { $("b-bentrar").disabled = false; $("b-bentrar").textContent = "🏦 Entrar no banco"; }
      if (!r.ok) { $("r-bchave").textContent = erroChave(r.erro); return; }
      guardaChave(codigo); telaBanco(r, codigo, cfg);
    };
  }
  function telaBanco(r, codigo, cfg) {
    if (!r.aberta) {
      modal(`<h2>🏦 Bem-vindo, ${e(r.arroba)}!</h2>
        <div class="saldo-ec"><span>Suas doações viraram</span><b>🪙 ${fmtEC(r.carteira)} EC</b></div>
        ${AVISO_EC}
        <label class="check"><input type="checkbox" id="b-rank" checked> Quero aparecer no ranking do banco (seu @ e quantas coins tem no cofre ficam públicos)</label>
        <p class="erro" id="b-erro"></p>
        <div class="acoes"><button class="btn verde grande" id="b-abrir">🏦 Abrir minha conta</button></div>${FESTA}`);
      $("b-abrir").onclick = async () => {
        $("b-abrir").disabled = true; $("b-abrir").textContent = "Abrindo…";
        const x = await CE.chave(cfg, { acao: "abrir", codigo, ranking: $("b-rank").checked });
        if (x.ok) telaBanco(x, codigo, cfg);
        else { $("b-erro").textContent = erroChave(x.erro); $("b-abrir").disabled = false; $("b-abrir").textContent = "🏦 Abrir minha conta"; }
      };
      return;
    }
    const ano = r.cofre * (1 + CE.JUROS_ANO), dia = r.cofre * (Math.pow(1 + CE.JUROS_ANO, 1 / 365) - 1);
    modal(`<h2>🏦 Conta de ${e(r.arroba)}</h2>
      <div class="saldos">
        <div class="saldo-ec"><span>👛 Carteira</span><b>🪙 ${fmtEC(r.carteira)}</b><span class="nota">pra gastar ou guardar</span></div>
        <div class="saldo-ec cofre"><span>🔒 Cofre</span><b>🪙 ${fmtEC(r.cofre)}</b><span class="nota">${r.cofre > 0 ? `+${dia.toFixed(3)} EC por dia · em 1 ano ≈ ${fmtEC(ano)}` : "rende 12% ao ano em coins"}</span></div>
      </div>
      <label class="campo" for="bk-qtd">Quantas coins?</label>
      <input type="number" id="bk-qtd" min="1" step="1" inputmode="numeric" value="${Math.max(1, Math.floor(r.carteira) || Math.floor(r.cofre))}">
      <div class="acoes"><button class="btn verde" id="bk-dep">⬇️ Guardar no cofre</button><button class="btn branco" id="bk-res">⬆️ Tirar do cofre</button></div>
      <p class="erro" id="bk-erro"></p>
      <h3 style="margin:14px 0 6px">🛒 Itens raros</h3>
      <div class="grade" style="grid-template-columns:1fr 1fr;gap:10px">${Object.entries(CE.ITENS_RAROS).map(([k, it]) => `<div class="cartao item-raro">
        <div style="font-size:2rem">${it.icone}</div><b>${e(it.nome)}</b><span>🪙 ${it.preco} EC</span>
        ${(r.itens || []).includes(k) ? `<span class="pill mini verde">✅ É seu</span>` : `<button class="btn" data-comprar="${k}" ${r.carteira < it.preco ? "disabled" : ""}>Comprar</button>`}</div>`).join("")}</div>
      <p class="nota">Comprou? Use em <a href="#" id="bk-casa">🔑 Minha casa</a>.</p>
      <label class="check"><input type="checkbox" id="bk-rank" ${r.ranking ? "checked" : ""}> Aparecer no ranking do banco</label>
      <h3 style="margin:14px 0 4px">🏆 Maiores investidores</h3>${rankingHTML(10)}
      ${AVISO_EC}${FESTA}`);
    const acao = async (extra, botao) => {
      document.querySelectorAll("#m-corpo button").forEach(x => x.disabled = true);
      if (botao) botao.textContent = "…";
      const x = await CE.chave(cfg, Object.assign({ codigo }, extra));
      if (x.ok) { telaBanco(x, codigo, cfg); atualiza(false); return; }
      telaBanco(x.arroba ? x : r, codigo, cfg);
      $("bk-erro").textContent = x.erro === "saldo" ? "Saldo insuficiente pra isso 😅" : erroChave(x.erro);
    };
    const qtd = () => Math.floor(Number($("bk-qtd").value) || 0);
    $("bk-dep").onclick = () => acao({ acao: "depositar", qtd: qtd() }, $("bk-dep"));
    $("bk-res").onclick = () => acao({ acao: "resgatar", qtd: qtd() }, $("bk-res"));
    document.querySelectorAll("[data-comprar]").forEach(b => b.onclick = () => acao({ acao: "comprar", item: b.dataset.comprar }, b));
    $("bk-rank").onchange = ev => acao({ acao: "ranking", on: ev.target.checked });
    $("bk-casa").onclick = ev => { ev.preventDefault(); abrirChave(); };
  }

  // ---------------- dentro da lojinha
  function entraLoja(o) {
    const l = o.l, cor = CE.CORES_CASA[l.cor] || "#e8402a", ic = CE.TIPOS_LOJA[l.tipo] || "🛍️";
    jogo.voarPara(o.i + 1, o.j + 1, 2.6);
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
  $("b-chave").onclick = abrirChave;
  $("b-banco").onclick = abrirBanco;
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
    jogo.voarPara(o.i + 1, o.j + 1, 2.2, () => setTimeout(() => cardMorador(o), 300));
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
    document.querySelectorAll("#m-corpo .opcao").forEach(b => b.onclick = () => { const o = ms[+b.dataset.n]; fecha(); jogo.destaque = o; jogo.voarPara(o.i + 1, o.j + 1, 2.2, () => cardMorador(o)); });
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
    if (editando) return;
    const d = await CE.carregar();
    if (!primeira && dados && JSON.stringify(d) === JSON.stringify(dados)) return;
    dados = d; jogo.setDados(d, !primeira); hud();
  }
  await atualiza(true);
  $("carregando").remove();
  jogo.iniciar();
  setInterval(() => atualiza(false), 60000);

  const q = new URLSearchParams(location.search);
  if (q.get("chave") !== null) setTimeout(abrirChave, 400);
  else if (q.get("banco") !== null) setTimeout(abrirBanco, 400);
  else if (q.get("morador")) setTimeout(() => procura(q.get("morador")), 400);
  else if (q.get("loja")) { const o = jogo.acharLoja(q.get("loja")); if (o) setTimeout(() => entraLoja(o), 400); }
})();
