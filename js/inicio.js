// Cidade Esperança — página inicial + fluxo de doação (PIX + WhatsApp)
(async function () {
  const $ = id => document.getElementById(id);
  const e = CE.esc;
  const [dados, cfg] = await Promise.all([CE.carregar(), CE.config()]);

  // ---------------- HUD e seções
  function hud(d) {
    const pct = Math.min(100, d.arrecadado / d.meta * 100);
    $("hud-dia").textContent = "DIA " + CE.dia(d);
    $("hud-mor").textContent = "🏠 " + d.moradores.length + (d.moradores.length === 1 ? " MORADOR" : " MORADORES");
    $("hud-lojas").textContent = "🛍️ " + d.lojinhas.length + (d.lojinhas.length === 1 ? " LOJINHA" : " LOJINHAS");
    $("hud-enche").style.width = pct + "%";
    $("hud-meta").textContent = `META DA CIRURGIA ${CE.reais(d.arrecadado)} / ${CE.reais(d.meta)} (${Math.floor(pct)}%)`;
    $("hud-aviso").hidden = !d.aviso; $("hud-aviso").textContent = d.aviso || "";
    $("obra-barra").style.width = pct + "%";
    $("obra-txt").innerHTML = `<b>${Math.floor(pct)}%</b> · ${CE.reais(d.arrecadado)} de ${CE.reais(d.meta)} · faltam <b>${CE.reais(Math.max(0, d.meta - d.arrecadado))}</b> · ${d.doacoes || d.moradores.length} apoios`;
  }
  function secoes(d) {
    // vitrine
    $("vitrine").innerHTML = d.lojinhas.length ? d.lojinhas.map(l => `<div class="cartao">
        <div style="font-size:2.2rem">${CE.TIPOS_LOJA[l.tipo] || "🛍️"}</div>
        <b style="font-size:1.2rem">${e(l.nome)}</b><span>${e(l.dono)}</span><span class="nota">${e(l.vende)}</span>
        ${l.exemplo ? `<span class="pill mini vermelho">EXEMPLO</span>` : ""}
        <a class="btn" href="cidade.html?loja=${encodeURIComponent(l.id)}">Entrar na loja</a></div>`).join("")
      : `<div class="cartao centro"><p>Ainda não tem nenhuma lojinha. A primeira pode ser a sua!</p><button class="btn" data-doar="lojinha">🛍️ Quero uma lojinha</button></div>`;
    // bairros
    const cont = {}; Object.keys(CE.BAIRROS).forEach(k => cont[k] = 0);
    d.moradores.forEach(m => cont[m.rede]++);
    const max = Math.max(1, ...Object.values(cont));
    $("bairros").innerHTML = Object.keys(CE.BAIRROS).sort((a, b) => cont[b] - cont[a]).map((k, n) => `
      <div class="linha-bairro"><span style="width:170px">${n === 0 && cont[k] ? "👑 " : ""}${CE.BAIRROS[k].icone} ${e(CE.BAIRROS[k].nome.replace("Bairro ", ""))}</span>
      <div class="barra"><div style="width:${cont[k] / max * 100}%;background:${CE.BAIRROS[k].cor}"></div></div><span>${cont[k]}</span></div>`).join("")
      + `<p class="nota centro">Qual rede vai ter o maior bairro? Doe e escolha o seu!</p>`;
    // enquete
    if (d.enquete && d.enquete.ativa && d.enquete.opcoes) {
      $("enquete-sec").hidden = false;
      $("enquete").innerHTML = `<h3 style="margin-top:0">${e(d.enquete.pergunta)}</h3>
        ${d.enquete.opcoes.map((o, n) => `<p style="font-size:1.15rem;margin:6px 0">${n + 1}. ${e(o)}</p>`).join("")}
        <p class="nota">Vote nos comentários do último vídeo! É de graça e a cidade obedece 😄</p>`;
    }
    // diário
    $("diario").innerHTML = d.diario.length ? d.diario.map(p => `<div class="cartao">
        <span class="pill mini branco">${e(CE.dataBR(p.data))}</span><h3 style="margin:8px 0 4px">${e(p.titulo)}</h3><p style="margin:0">${e(p.texto)}</p>
        ${CE.linkSeguro(p.video) ? `<p><a class="pill azul" href="${e(CE.linkSeguro(p.video))}" target="_blank" rel="noopener">▶ Ver vídeo</a></p>` : ""}</div>`).join("")
      : `<div class="cartao">A obra começa já já…</div>`;
    // ranking do banco
    const rk = (d.banco && d.banco.ranking) || [];
    $("ranking-banco").innerHTML = rk.length ? `<ol class="ranking">${rk.slice(0, 10).map((x, k) => `<li><span>${["🥇", "🥈", "🥉"][k] || (k + 1) + "º"}</span><b>${e(x.arroba)}</b><span class="ec">🪙 ${x.investido} EC</span></li>`).join("")}</ol>`
      : `<div class="cartao centro"><p>O cofre está vazio… o 1º lugar do ranking pode ser seu!</p></div>`;
    // outdoor
    const outs = d.outdoor || [];
    $("outdoor").innerHTML = outs.length ? outs.map(x => `<div class="cartao"><b style="color:var(--vermelho)">${e(x.arroba)}</b><p style="margin:4px 0 0;font-size:1.15rem">“${e(x.frase)}”</p></div>`).join("")
      : `<div class="cartao centro"><p>O outdoor da cidade está esperando o primeiro recado… Doando ${CE.reais(CE.MIN_OUTDOOR)} ou mais, ele pode ser seu!</p></div>`;
    // rodapé
    $("perfil").textContent = cfg.perfil || "@cidadeep";
    $("redes").innerHTML = [cfg.tiktok && `<a class="pill" href="${e(CE.linkSeguro(cfg.tiktok))}" target="_blank" rel="noopener">🎵 TikTok</a>`,
      cfg.instagram && `<a class="pill roxo" href="${e(CE.linkSeguro(cfg.instagram))}" target="_blank" rel="noopener">📸 Instagram</a>`].filter(Boolean).join(" ");
  }
  hud(dados); secoes(dados);
  // botão flutuante "VER A CIDADE" só aparece depois de rolar a página (não cobre os botões do topo)
  const flut = document.querySelector(".flutuante");
  const mostraFlut = () => flut && flut.classList.toggle("on", window.scrollY > 650);
  window.addEventListener("scroll", mostraFlut, { passive: true }); mostraFlut();

  // prévia animada da cidade
  const prev = new CidadeJogo($("previa"), { interativo: false, rotulos: true });
  prev.setDados(dados); prev.z = Math.max(prev.zMin, .75); prev.iniciar();

  // ---------------- doação
  const ITENS = {
    morador: { nome: "Morador + Casa", icone: "🏠", min: 1, valores: [10, 20, 30] },
    lojinha: { nome: "Lojinha na cidade", icone: "🛍️", min: 50, valores: [50, 70, 100] },
    estatua: { nome: "Estátua na praça", icone: "🗽", min: 100, valores: [100, 150, 200] },
  };
  const est = { passo: 1, item: "morador", valor: 20, arroba: "", rede: "instagram", profissao: "", cor: "vermelho",
    loja_nome: "", loja_tipo: "doces", loja_vende: "", loja_contato: "", produtos: "", frase: "", outdoor: "", ok: false };
  const modalAbre = html => { $("m-corpo").innerHTML = html; $("modal").classList.add("on"); $("modal").querySelector(".modal").scrollTop = 0; };
  const fecha = () => $("modal").classList.remove("on");
  $("m-fechar").onclick = fecha;
  $("modal").addEventListener("click", ev => { if (ev.target.id === "modal") fecha(); });
  document.addEventListener("click", ev => {
    const b = ev.target.closest("[data-doar]"); if (!b) return;
    ev.preventDefault(); est.item = b.dataset.doar || est.item || "morador";
    if (est.valor < ITENS[est.item].min) est.valor = ITENS[est.item].valores[0];
    est.passo = 1; render();
  });
  const qa = new URLSearchParams(location.search).get("arroba");
  if (qa) { est.arroba = qa.startsWith("@") ? qa : "@" + qa; est.ok = false; }
  if (location.hash === "#doar") setTimeout(() => { est.passo = 1; render(); }, 300);
  else boasVindas();

  // popup de boas-vindas: aparece só na primeira visita (lembrado neste navegador)
  function boasVindas() {
    let viu = false;
    try { viu = localStorage.getItem("ce_boasvindas") === "1"; } catch (x) {}
    if (viu || new URLSearchParams(location.search).has("arroba")) return;
    setTimeout(() => {
      if ($("modal").classList.contains("on")) return;
      try { localStorage.setItem("ce_boasvindas", "1"); } catch (x) {}
      const pct = Math.min(100, dados.arrecadado / dados.meta * 100);
      modalAbre(`<div class="boasvindas">
        <div class="bv-topo">💛</div>
        <h2>Me dá 1 minuto?</h2>
        <p class="bv-texto">Desde criança eu tenho <b>estrabismo no olho direito</b>. A cirurgia custa <b>${CE.reais(dados.meta)}</b> e sozinho eu não consigo.</p>
        <p class="bv-texto">Por isso essa cidade existe: <b>cada doação vira uma casa</b> e faz o hospital da minha cirurgia subir. 🏥</p>
        <div class="bv-prova">
          <span>🏠 <b>${dados.moradores.length} moradores</b> já ajudaram</span>
          <div class="barra"><div style="width:${Math.max(2, pct)}%"></div></div>
          <span class="nota">${CE.reais(dados.arrecadado)} de ${CE.reais(dados.meta)}</span>
        </div>
        <ul class="bv-ganha">
          <li>🏠 Sua casa com o seu <b>@</b> e a sua profissão</li>
          <li>🔑 A chave pra decorar: cor, telhado, pet, carro</li>
          <li>🎥 Você aparece nos próximos vídeos</li>
        </ul>
        <button class="btn verde grande bv-doar" data-doar="morador">🏠 DOAR E ENTRAR NA CIDADE</button>
        <p class="nota centro" style="margin:8px 0 0">A partir de <b>R$ 1</b> · PIX na hora · qualquer valor ajuda</p>
        <button class="bv-depois" id="bv-depois">Agora não, só quero ver a cidade</button>
      </div>`);
      $("bv-depois").onclick = fecha;
    }, 900);
  }

  const passos = n => `<div class="passos-doacao">${[1, 2, 3].map(k => `<span class="${k <= n ? "on" : ""}"></span>`).join("")}</div>`;
  function nivelCasa(v) { return v >= 100 ? "🏰 Mansão" : v >= 30 ? "🏘️ Sobrado" : v >= 10 ? "🏡 Casa" : "🏠 Casinha"; }
  function beneficios(v) {
    const b = [`${nivelCasa(v)} com o seu @ e profissão`, "🔑 Chave pra decorar a casa", `🪙 ${Math.floor(v)} Esperança Coins (moeda do jogo)`];
    if (v >= 20) b.push("📣 Seu recado no outdoor da cidade");
    if (v >= 50) b.push("🛍️ Lojinha divulgada no próximo vídeo");
    if (v >= 30) b.push("🎨 1 arte pra sua rede social (feita por mim)");
    if (v >= 100) b.push("🗽 Estátua dourada na praça");
    if (v >= 100) b.push("🎨 1 mês de artes pras suas redes");
    if (v >= 300) b.push("🌐 Um site vitalício pra você");
    return b;
  }
  function itemPorValor() { return est.valor >= 100 ? "estatua" : est.valor >= 50 ? "lojinha" : "morador"; }

  function render() {
    if (est.passo === 1) {
      modalAbre(`${passos(1)}<h2>O que você quer construir?</h2>
        <div class="opcoes">${Object.entries(ITENS).map(([k, it]) => `<button class="opcao ${est.item === k ? "sel" : ""}" data-item="${k}">
          <span class="icone">${it.icone}</span><span><b>${it.nome}</b>${k === "morador" ? "Qualquer valor" : "A partir de " + CE.reais(it.min)}</span></button>`).join("")}</div>
        <label class="campo">Valor</label>
        <div class="chips">${ITENS[est.item].valores.map(v => `<button class="chip ${est.valor === v ? "sel" : ""}" data-v="${v}">${CE.reais(v)}</button>`).join("")}</div>
        <input type="number" id="d-valor" min="${ITENS[est.item].min}" step="1" inputmode="decimal" value="${est.valor}" style="margin-top:10px">
        <p class="nota" id="d-aviso"></p>
        <div id="d-ganha"></div>
        <div id="d-bump"></div>
        <div class="acoes"><button class="btn verde grande" id="d-ok">Continuar ➜</button></div>`);
      document.querySelectorAll("[data-item]").forEach(b => b.onclick = () => { est.item = b.dataset.item; if (est.valor < ITENS[est.item].min) est.valor = ITENS[est.item].valores[0]; render(); });
      document.querySelectorAll("[data-v]").forEach(b => b.onclick = () => { est.valor = +b.dataset.v; render(); });
      $("d-valor").oninput = ev => { est.valor = Math.max(0, +ev.target.value || 0); avisoValor(); };
      const avisoValor = () => {
        const it = itemPorValor();
        $("d-aviso").textContent = est.valor < ITENS[est.item].min ? `Para ${ITENS[est.item].nome} o mínimo é ${CE.reais(ITENS[est.item].min)}.` :
          it !== est.item && ITENS[it].min > ITENS[est.item].min ? `Com ${CE.reais(est.valor)} você já ganha: ${ITENS[it].nome} ${ITENS[it].icone}!` : "";
        ganhaEBump();
      };
      // o que a pessoa ganha com o valor atual + oferta pra subir de nível (order bump)
      const ganhaEBump = () => {
        const v = est.valor;
        if (!(v >= 1)) { $("d-ganha").innerHTML = ""; $("d-bump").innerHTML = ""; return; }
        $("d-ganha").innerHTML = `<div class="ganha"><b>Com ${CE.reais(v)} você ganha:</b><ul>${beneficios(v).map(b => `<li>${b}</li>`).join("")}</ul></div>`;
        const alvo = [20, 30, 50, 100, 300].find(x => x > v);
        if (!alvo) { $("d-bump").innerHTML = `<div class="bump feito">👑 Você está no nível máximo da cidade. Muito obrigado!</div>`; return; }
        const novos = beneficios(alvo).filter(b => !beneficios(v).includes(b) && !/Coins/.test(b));
        $("d-bump").innerHTML = `<button type="button" class="bump" id="d-bump-btn">
          <span class="bump-sel">☐</span>
          <span class="bump-txt"><b>SIM! Quero adicionar só +${CE.reais(alvo - v)}</b> (total ${CE.reais(alvo)}) e ganhar também:
            <span class="bump-lista">${novos.map(b => `<span>${b}</span>`).join("")}</span></span></button>`;
        $("d-bump-btn").onclick = () => { est.valor = alvo; est.item = itemPorValor(); render(); };
      };
      avisoValor();
      $("d-ok").onclick = () => {
        if (!(est.valor >= ITENS[est.item].min) || est.valor <= 0) { avisoValor(); return; }
        est.item = itemPorValor(); est.passo = 2; render();
      };
    } else if (est.passo === 2) {
      const loja = est.valor >= 50, estatua = est.valor >= 100;
      modalAbre(`${passos(2)}<h2>${ITENS[est.item].icone} Seu morador</h2>
        <label class="campo" for="f-arroba">Seu @ (pra aparecer na cidade e no vídeo)</label>
        <p class="nota" style="margin:0 0 6px">🔁 <b>Já é morador?</b> Use o <b>mesmo @</b>: as coins caem na mesma conta do banco, a casa sobe de nível e a sua chave antiga continua valendo.</p>
        <input type="text" id="f-arroba" placeholder="@seu_arroba (deixe vazio pra ser Morador misterioso)" value="${e(est.arroba)}" autocapitalize="none" maxlength="40">
        <label class="campo" for="f-rede">De qual rede? (define o seu bairro)</label>
        <select id="f-rede">${Object.entries(CE.BAIRROS).map(([k, b]) => `<option value="${k}" ${est.rede === k ? "selected" : ""}>${b.icone} ${b.nome.replace("Bairro ", "")}</option>`).join("")}</select>
        <label class="campo" for="f-prof">Profissão do seu morador</label>
        <input type="text" id="f-prof" maxlength="20" placeholder="Padeiro, DJ, Médica, Gamer…" value="${e(est.profissao)}">
        <label class="campo">Cor da sua casa</label>
        <div class="cores">${Object.entries(CE.CORES_CASA).map(([k, c]) => `<button type="button" data-cor="${k}" class="${est.cor === k ? "sel" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("")}</div>
        ${loja ? `<h3 style="margin:18px 0 0">🛍️ Sua lojinha</h3>
          <label class="campo" for="f-lnome">Nome da lojinha</label><input type="text" id="f-lnome" maxlength="30" value="${e(est.loja_nome)}">
          <label class="campo" for="f-ltipo">Tipo</label><select id="f-ltipo">${Object.entries(CE.TIPOS_LOJA).map(([k, i]) => `<option value="${k}" ${est.loja_tipo === k ? "selected" : ""}>${i} ${k}</option>`).join("")}</select>
          <label class="campo" for="f-lvende">O que você vende?</label><textarea id="f-lvende" maxlength="120">${e(est.loja_vende)}</textarea>
          <label class="campo" for="f-lprod">Produtos e preços (um por linha, até 6)</label><textarea id="f-lprod" placeholder="Bolo de pote - R$ 12">${e(est.produtos)}</textarea>
          <label class="campo" for="f-lcont">Contato da loja (Instagram, WhatsApp ou site)</label><input type="text" id="f-lcont" maxlength="80" value="${e(est.loja_contato)}">
          <p class="nota">As fotos dos produtos você manda no WhatsApp junto com o comprovante.</p>` : ""}
        ${estatua ? `<label class="campo" for="f-frase">🗽 Frase da sua estátua</label><input type="text" id="f-frase" maxlength="50" value="${e(est.frase)}">` : ""}
        ${est.valor >= CE.MIN_OUTDOOR ? `<label class="campo" for="f-out">📣 Recado no outdoor da cidade (opcional)</label>
          <input type="text" id="f-out" maxlength="60" placeholder="Um recado pra cidade inteira" value="${e(est.outdoor)}">
          <p class="nota">Aparece no outdoor e no vídeo depois de aprovado.</p>` : ""}
        <input type="text" id="f-hp" tabindex="-1" autocomplete="off" class="so-leitores" aria-hidden="true">
        <label class="check"><input type="checkbox" id="f-ok" ${est.ok ? "checked" : ""}> Autorizo que meu @${loja ? " e minha lojinha" : ""} apareçam na cidade e nos vídeos. Li as regras (sem sorteio; lojinha só com produto legal).</label>
        <p class="erro" id="f-erro"></p>
        <div class="acoes"><button class="btn branco" id="f-voltar">⬅ Voltar</button><button class="btn verde grande" id="f-seguir">Ir pro PIX ➜</button></div>`);
      document.querySelectorAll("[data-cor]").forEach(b => b.onclick = () => { est.cor = b.dataset.cor; document.querySelectorAll("[data-cor]").forEach(x => x.classList.toggle("sel", x === b)); });
      const pega = () => {
        let a = $("f-arroba").value.trim().replace(/\s+/g, ""); if (a && !a.startsWith("@")) a = "@" + a; est.arroba = a;
        est.rede = $("f-rede").value; est.profissao = $("f-prof").value.trim().replace(/^ex(emplo)?\s*[.:]\s*/i, ""); est.ok = $("f-ok").checked;
        if ($("f-out")) est.outdoor = $("f-out").value.trim();
        if (loja) { est.loja_nome = $("f-lnome").value.trim(); est.loja_tipo = $("f-ltipo").value; est.loja_vende = $("f-lvende").value.trim(); est.produtos = $("f-lprod").value.trim(); est.loja_contato = $("f-lcont").value.trim(); }
        if (estatua) est.frase = $("f-frase").value.trim();
      };
      $("f-voltar").onclick = () => { pega(); est.passo = 1; render(); };
      $("f-seguir").onclick = async () => {
        pega();
        if (!est.ok) { $("f-erro").textContent = "Marque a autorização pra continuar."; return; }
        if (loja && !est.loja_nome) { $("f-erro").textContent = "Dê um nome pra sua lojinha 🙂"; return; }
        // código curto que aparece no PIX e na planilha (pra achar a doação no extrato)
        const chave = JSON.stringify([est.valor, est.arroba, est.rede, est.profissao, est.cor, est.loja_nome, est.produtos, est.frase, est.outdoor]);
        if (est.enviado !== chave) {
          const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          est.codigo = "CE" + Array.from({ length: 6 }, () => L[Math.floor(Math.random() * L.length)]).join("");
          $("f-seguir").disabled = true; $("f-seguir").textContent = "Guardando…";
          await CE.enviarDoacao(cfg, { codigo: est.codigo, item: ITENS[est.item].nome, valor: est.valor, arroba: est.arroba, rede: est.rede,
            profissao: est.profissao, cor: est.cor, loja_nome: loja ? est.loja_nome : "", loja_tipo: loja ? est.loja_tipo : "",
            loja_vende: loja ? est.loja_vende : "", produtos: loja ? est.produtos : "", loja_contato: loja ? est.loja_contato : "",
            frase: estatua ? est.frase : "", outdoor: est.valor >= CE.MIN_OUTDOOR ? est.outdoor : "", hp: ($("f-hp") || {}).value || "" });
          est.enviado = chave;
        }
        est.passo = 3; render();
      };
    } else if (est.passo === 3) {
      const temPix = !!(cfg.pix_chave && cfg.pix_chave.trim());
      const auto = !!cfg.planilha_url;
      const codigo = temPix ? PIX.gerar({ chave: cfg.pix_chave, nome: cfg.pix_nome, cidade: cfg.pix_cidade, valor: est.valor,
        txid: est.codigo || "CIDADE", descricao: "Cidade Esperanca " + (est.codigo || "") }) : "";
      modalAbre(`${passos(3)}<h2>💚 Pague ${CE.reais(est.valor)} no PIX</h2>
        ${est.codigo ? `<p>🔑 Sua chave: <span class="pill mini">${e(est.codigo)}</span> (ela vai junto no PIX). <b>Guarde!</b> Com ela você decora sua casa.</p>` : ""}
        ${temPix ? `<p>Abra o app do seu banco e escaneie o QR Code ou use o <b>PIX copia e cola</b>:</p>
          <div class="qr" id="qr"></div><div class="copia" id="copia">${e(codigo)}</div>
          <div class="acoes"><button class="btn" id="b-copia">📋 Copiar código PIX</button></div>`
        : `<p class="erro">A chave PIX ainda não foi configurada neste site. Tente de novo mais tarde 🙏</p>`}
        ${auto ? `<div class="acoes"><button class="btn branco" id="p-voltar">⬅ Voltar</button>
            <button class="btn verde grande" id="b-pago">✅ Já paguei</button></div>
            <p class="nota">Não precisa mandar comprovante: assim que o PIX for conferido, sua casa aparece sozinha na cidade.</p>`
        : `<h3 style="margin:18px 0 4px">Depois de pagar:</h3>
            <p>Toque no botão abaixo e envie a mensagem pronta <b>com o comprovante</b> no WhatsApp. Assim que o pagamento for confirmado, sua casa entra na cidade! 🏠</p>
            <div class="acoes"><button class="btn branco" id="p-voltar">⬅ Voltar</button>
            <a class="btn verde grande" id="b-zap" target="_blank" rel="noopener">📲 Enviar comprovante</a></div>`}`);
      if (temPix && window.QRCode) new QRCode($("qr"), { text: codigo, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
      if (temPix) $("b-copia").onclick = async () => {
        try { await navigator.clipboard.writeText(codigo); $("b-copia").textContent = "✅ Copiado!"; }
        catch (err) { const r = document.createRange(); r.selectNodeContents($("copia")); getSelection().removeAllRanges(); getSelection().addRange(r); }
      };
      $("p-voltar").onclick = () => { est.passo = 2; render(); };
      if (auto) $("b-pago").onclick = () => { est.passo = 4; render(); };
      else {
        const num = String(cfg.whatsapp || "").replace(/\D/g, "");
        $("b-zap").href = num ? `https://wa.me/${num}?text=${encodeURIComponent(mensagem())}` : "#";
        if (!num) $("b-zap").onclick = ev => { ev.preventDefault(); alert("O WhatsApp ainda não foi configurado neste site."); };
      }
    } else {
      const num = String(cfg.whatsapp || "").replace(/\D/g, "");
      const busca = est.arroba ? `cidade.html?morador=${encodeURIComponent(est.arroba)}` : "cidade.html";
      modalAbre(`<div class="centro"><div style="font-size:4rem">🏗️</div><h2 style="margin:0 0 8px">Obrigado! Sua casa está a caminho 💛</h2>
        <p>Assim que o PIX for conferido, ela aparece na cidade${est.arroba ? ` com o <b>${e(est.arroba)}</b>` : ""}. Normalmente no mesmo dia.</p>
        ${est.codigo ? `<div class="cartao" style="margin:12px 0;background:var(--creme)"><b>🔑 A chave da sua casa:</b>
          <div style="font-size:1.8rem;font-weight:800;letter-spacing:2px;margin:4px 0" id="s-chave">${e(est.codigo)}</div>
          <button class="btn branco" id="b-copchave">📋 Copiar chave</button>
          <p class="nota">Já era morador com esse @? Pode usar a chave antiga ou essa nova: as duas abrem a mesma casa e a mesma conta, e as coins já somam.</p>
          <p class="nota">Tira um print! Quando a casa aparecer, toque em <b>🔑 Minha casa</b> na cidade e decore: cor, telhado, pet, carro, placa${est.valor >= CE.MIN_OUTDOOR ? " e o recado do outdoor" : ""}.</p></div>` : ""}
        <p>Depois é só tocar em <b>🔍 Cadê minha casa?</b> e o drone te leva até lá. E fica de olho no próximo vídeo 👀</p>
        <div class="acoes" style="justify-content:center">
          <a class="btn verde" href="${busca}">🏙️ Ver a cidade</a>
          <button class="btn branco" id="b-share">📤 Chamar um amigo</button></div>
        ${num ? `<p class="nota">Deu algum problema? <a href="https://wa.me/${num}?text=${encodeURIComponent(mensagem())}" target="_blank" rel="noopener">Me chama no WhatsApp</a></p>` : ""}</div>`);
      if ($("b-copchave")) $("b-copchave").onclick = async () => { try { await navigator.clipboard.writeText(est.codigo); $("b-copchave").textContent = "✅ Copiada!"; } catch (x) {} };
      $("b-share").onclick = () => {
        const url = location.href.split("#")[0].split("?")[0];
        if (navigator.share) navigator.share({ title: "Cidade Esperança", text: "Me ajuda a construir a Cidade Esperança! Cada doação vira uma casa 🏠", url }).catch(() => {});
        else { navigator.clipboard && navigator.clipboard.writeText(url); alert("Link copiado!"); }
      };
    }
  }

  function mensagem() {
    const linhas = [`Oi! Acabei de doar ${CE.reais(est.valor)} pra Cidade Esperança 💛 (segue o comprovante)`,
      est.codigo ? `Código: ${est.codigo}` : "",
      `🏠 Item: ${ITENS[est.item].nome}`, `@: ${est.arroba || "(morador misterioso)"}`, `Bairro: ${CE.BAIRROS[est.rede].nome}`,
      `Profissão: ${est.profissao || "-"}`, `Cor da casa: ${est.cor}`];
    if (est.valor >= 50) linhas.push(`🛍️ Lojinha: ${est.loja_nome}`, `Tipo: ${est.loja_tipo}`, `Vende: ${est.loja_vende || "-"}`, `Produtos:\n${est.produtos || "-"}`, `Contato: ${est.loja_contato || "-"}`);
    if (est.valor >= 100) linhas.push(`🗽 Frase da estátua: ${est.frase || "-"}`);
    if (est.valor >= CE.MIN_OUTDOOR && est.outdoor) linhas.push(`📣 Outdoor: ${est.outdoor}`);
    linhas.push(`✅ Autorizo aparecer na cidade e nos vídeos.`);
    return linhas.filter(Boolean).join("\n");
  }
})();
