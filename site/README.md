# Site de análise – Dados Abertos do CREA-BA

Site estático (HTML/CSS/JS, sem servidor). Abre dando dois cliques em `index.html` ou publicado em qualquer hospedagem estática.

## Estrutura
- `index.html` – casca (cabeçalho com logos, navegação, rodapé com aviso de iniciativa independente)
- `css/portal.css` – identidade visual (azul #4a89d3, marinho #094c8c, dourado do brasão, fonte Lato)
- `js/portal.js` – motor: módulos (nível 1), abas (nível 2), rotas `#/modulo/aba`, gráficos, CSV
- `js/modulos/conselheiros.js` – módulo "Conselheiros e viagens" (7 abas)
- `data/conselheiros.js` – dados (gerado por `scripts/gerar_site.py`; não é versionado)
- `assets/` – logos do CREA-BA

## Como acrescentar um módulo (outra API)
1. Gerar `data/<id>.js` com `PORTAL_DATA["<id>"] = {...}` (copie `scripts/gerar_site.py`).
2. Criar `js/modulos/<id>.js` com `Portal.registrar({ id, titulo, iniciar, abas:[{id,titulo,render}] })`
   (use `conselheiros.js` como modelo: filtros em `iniciar`, uma função por aba).
3. Incluir os dois `<script>` em `index.html` e remover o nome da lista `Portal.proximos` em `portal.js`.

## Atualizar os dados e publicar
```
python scripts/gerar_site.py          # baixa a API e escreve site/data/conselheiros.js
```
Depois envie a pasta `site/` inteira para a hospedagem (Netlify Drop, Cloudflare Pages, servidor próprio etc.).
O workflow do GitHub também gera a pasta `site/` pronta como artifact.
Atenção: a página contém nomes de conselheiros (dados públicos do portal, mas pessoais): publique com consciência (LGPD).

## Modo incorporado (Google Sites)
Acrescente `?embed=1` antes do `#`: `https://.../index.html?embed=1#/conselheiros/geografia` esconde cabeçalho e navegação (mantém filtros e aviso).
No Google Sites: Inserir → Incorporar → Por URL, uma página do Sites por aba.
