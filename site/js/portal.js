/* Motor do portal: módulos (nível 1) e abas (nível 2), roteamento por hash e utilitários.
 *
 * COMO ACRESCENTAR UM MÓDULO (nova API/tema):
 *   1. gerar data/<id>.js  com  window.PORTAL_DATA = window.PORTAL_DATA || {}; PORTAL_DATA["<id>"] = {...};
 *   2. criar js/modulos/<id>.js chamando  Portal.registrar({ id, titulo, iniciar(P, filtrosEl), atualizado, abas:[{id,titulo,render(el,P)}] })
 *   3. incluir os dois <script> em index.html (antes de Portal.iniciar()).
 *   Módulos "em breve" ficam em Portal.proximos (aparecem desabilitados).
 */
(function () {
  const P = window.Portal = { mods: [], charts: {}, proximos: [], atual: null };
  const $ = P.$ = id => document.getElementById(id);

  P.proximos = ["Contratos e licitações", "Pessoal e remuneração", "Execução orçamentária"];
  P.registrar = m => { P.mods.push(m); };

  /* ---------- formatação ---------- */
  const nf = (o) => new Intl.NumberFormat("pt-BR", o);
  P.fmt = {
    brl: v => nf({ style: "currency", currency: "BRL" }).format(v || 0),
    brl0: v => nf({ style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0),
    num: (v, d = 0) => nf({ maximumFractionDigits: d, minimumFractionDigits: d }).format(v || 0),
    esc: s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
  };

  /* ---------- gráficos ---------- */
  P.chart = (id, cfg) => {
    if (P.charts[id]) P.charts[id].destroy();
    const el = $(id); if (!el) return null;
    cfg.options = Object.assign({ maintainAspectRatio: false, responsive: true }, cfg.options || {});
    Chart.defaults.font.family = "Lato, system-ui, sans-serif";
    Chart.defaults.color = "#343a40";
    Chart.defaults.borderColor = "#e5e9ee";
    return (P.charts[id] = new Chart(el, cfg));
  };
  P.limparGraficos = () => { Object.values(P.charts).forEach(c => c.destroy()); P.charts = {}; };

  /* ---------- download CSV (Excel pt-BR: ; e BOM) ---------- */
  P.csv = (nome, cabecalho, linhas) => {
    const q = v => { v = v == null ? "" : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const txt = "﻿" + [cabecalho, ...linhas].map(l => l.map(q).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
    a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  };

  /* ---------- roteamento ---------- */
  function rota() {
    const [, mid, aid] = (location.hash || "#/").split("/");
    const mod = P.mods.find(m => m.id === mid) || P.mods[0];
    const aba = (mod.abas.find(a => a.id === aid)) || mod.abas[0];
    return { mod, aba };
  }

  function navegacao(mod, aba) {
    $("mods").innerHTML = P.mods.map(m => `<a href="#/${m.id}" class="${m === mod ? "on" : ""}">${P.fmt.esc(m.titulo)}</a>`).join("") +
      P.proximos.map(t => `<span class="off" title="Em preparação">${P.fmt.esc(t)} <em>em breve</em></span>`).join("");
    $("abas").innerHTML = mod.abas.map(a => `<a href="#/${mod.id}/${a.id}" class="${a === aba ? "on" : ""}">${P.fmt.esc(a.titulo)}</a>`).join("");
  }

  P.atualizar = () => {
    const { mod, aba } = rota();
    if (P.atual !== mod) {            // trocou de módulo: remonta filtros
      P.atual = mod; $("filtros").innerHTML = "";
      if (mod.iniciar) mod.iniciar(P, $("filtros"));
      $("atualizado").textContent = mod.atualizado ? "Dados atualizados em " + mod.atualizado : "";
    }
    navegacao(mod, aba);
    document.title = aba.titulo + " · " + mod.titulo + " · CREA-BA";
    P.limparGraficos();
    const el = $("conteudo"); el.innerHTML = "";
    aba.render(el, P);
  };

  P.iniciar = () => {
    if (/[?&]embed=1/.test(location.search)) document.body.classList.add("embed");   // modo incorporado (Google Sites): sem cabeçalho/abas
    if (!P.mods.length) { $("conteudo").textContent = "Nenhum módulo carregado."; return; }
    window.addEventListener("hashchange", () => { P.atualizar(); window.scrollTo({ top: 0 }); });
    P.atualizar();
  };
})();
