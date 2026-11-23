# Cidade Esperança

Site + jogo da Cidade Esperança: cada doação constrói a cidade (morador com casa, lojinha, estátua)
e o hospital sobe até a meta da cirurgia.

- `index.html` — página inicial e doação (PIX copia e cola + QR Code + comprovante pelo WhatsApp)
- `cidade.html` — a cidade explorável (mapa, moradores, lojinhas por dentro, busca "Cadê minha casa?")
- `cidade.json` — os dados da cidade (moradores, lojinhas, meta, diário). Atualizar a cidade = editar este arquivo.
- `config.json` — dados de pagamento e contato (preenchidos pelo dono do site)

## config.json
| campo | o que colocar |
|---|---|
| `pix_chave` | sua chave PIX (e-mail, telefone no formato `+5511999999999`, CPF só números, ou chave aleatória) |
| `pix_nome` | seu nome como aparece no banco (até 25 letras) |
| `pix_cidade` | sua cidade (até 15 letras) |
| `whatsapp` | seu WhatsApp com DDI e DDD, só números: `5511999999999` |
| `perfil`, `tiktok`, `instagram` | seu @ e os links dos perfis |

Nenhum dado de quem doa é guardado no site: o formulário só monta a mensagem do WhatsApp.
