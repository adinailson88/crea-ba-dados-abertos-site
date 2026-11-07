# Análise de Dados Abertos · CREA-BA (site)

Site estático com a análise dos dados da API pública do Portal da Transparência do CREA-BA.
**Iniciativa independente; não é um canal oficial do CREA-BA.**

Endereço: https://adinailson88.github.io/crea-ba-dados-abertos-site/

- Atualiza sozinho toda segunda (07h Brasília) via GitHub Actions: baixa a API, gera `site/data/conselheiros.js` e publica no GitHub Pages.
- Os dados não são versionados; só código e identidade visual.
- Estrutura de módulos/abas e como acrescentar outras APIs: `site/README.md`.

## Google Sites
Inserir → Incorporar → Por URL (uma página por aba), usando `?embed=1`:
- Visão geral: `https://adinailson88.github.io/crea-ba-dados-abertos-site/?embed=1#/conselheiros/visao`
- Conselheiros: `...?embed=1#/conselheiros/conselheiros`
- Colegiados e eventos: `...?embed=1#/conselheiros/colegiados`
- Origens, destinos e km: `...?embed=1#/conselheiros/geografia`
- Viagens: `...?embed=1#/conselheiros/viagens`
- Lançamentos: `...?embed=1#/conselheiros/lancamentos`
- Metodologia: `...?embed=1#/conselheiros/metodologia`
