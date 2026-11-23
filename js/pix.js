// PIX "copia e cola" (BR Code / EMV) gerado no navegador
(function () {
  const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .,-]/g, "").toUpperCase();
  const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;
  function crc16(s) {
    let crc = 0xffff;
    for (let k = 0; k < s.length; k++) {
      crc ^= s.charCodeAt(k) << 8;
      for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  function normalizaChave(c) {
    c = String(c || "").trim();
    if (/@/.test(c)) return c.toLowerCase();                       // e-mail
    const dig = c.replace(/\D/g, "");
    if (/^\+/.test(c)) return "+" + dig;                            // telefone já com +55
    if (/^[0-9a-f-]{32,36}$/i.test(c)) return c.toLowerCase();       // chave aleatória
    if (dig.length === 11 && /[.\-]/.test(c)) return dig;          // CPF com pontuação
    return c;
  }
  function gerar({ chave, nome, cidade, valor, txid, descricao }) {
    let conta = tlv("00", "br.gov.bcb.pix") + tlv("01", normalizaChave(chave));
    const desc = semAcento(descricao).slice(0, Math.max(0, 99 - conta.length - 4));
    if (desc) conta += tlv("02", desc);
    let p = tlv("00", "01") + tlv("26", conta) + tlv("52", "0000") + tlv("53", "986");
    if (valor && valor > 0) p += tlv("54", Number(valor).toFixed(2));
    p += tlv("58", "BR") + tlv("59", semAcento(nome).slice(0, 25) || "CIDADE ESPERANCA") + tlv("60", semAcento(cidade).slice(0, 15) || "BRASIL");
    p += tlv("62", tlv("05", (semAcento(txid).replace(/[^A-Z0-9]/g, "") || "***").slice(0, 25)));
    p += "6304";
    return p + crc16(p);
  }
  window.PIX = { gerar };
})();
