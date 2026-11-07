/* Módulo: Conselheiros e viagens (API: DiariasDeslocamentos, DespesasViagens, PassagensAereas, PassagensTerrestres, Conselheiros) */
(function () {
  const P = Portal, { brl, brl0, num, esc } = P.fmt, $ = P.$;
  const D = PORTAL_DATA.conselheiros, L = D.l, T = D.t;
  const TRIP = {}; T.forEach(t => TRIP[t.k] = t);
  const GR = ["Jeton", "Diárias", "Auxílios", "Passagens", "Outros"];
  const GC = { "Jeton": "#094c8c", "Diárias": "#4a89d3", "Auxílios": "#c19e00", "Passagens": "#17a2b8", "Outros": "#adb5bd" };
  const PAL = ["#094c8c", "#4a89d3", "#c19e00", "#17a2b8", "#6f42c1", "#dc3545", "#28a745", "#fd7e14", "#6c757d", "#8a6d00", "#7fb0e6", "#a9d18e"];

  const MES = (() => {
    const s = [...new Set(L.map(x => x.m))].sort(); const o = [];
    let [y, m] = s[0].split("-").map(Number); const [y2, m2] = s[s.length - 1].split("-").map(Number);
    while (y < y2 || (y == y2 && m <= m2)) { o.push(y + "-" + String(m).padStart(2, "0")); m++; if (m > 12) { m = 1; y++; } }
    return o;
  })();
  const FULL = MES.includes("2025-04") ? "2025-04" : MES[0];   // antes disso a API só traz passagens aéreas
  const F0 = () => ({ de: FULL, ate: MES[MES.length - 1], nome: "", tipo: "", co: "", te: "", g: "", ud: "", or: "", de2: "", prog: "" });
  let F = F0();
  const S = { sort: {}, pageV: 0, pageL: 0, q: "", topn: 15 };

  /* ---------- dados filtrados ---------- */
  const rows = () => L.filter(x => x.m >= F.de && x.m <= F.ate && (!F.nome || x.nm === F.nome) && (!F.tipo || x.tp === F.tipo) &&
    (!F.co || x.co === F.co) && (!F.te || x.te === F.te) && (!F.g || x.g === F.g) && (!F.ud || x.ud === F.ud) &&
    (!F.or || x.or === F.or) && (!F.de2 || x.de === F.de2) && (!F.prog || x.pg === F.prog));
  const tripsOf = rs => [...new Set(rs.map(r => r.t))].map(k => TRIP[k]).filter(Boolean);
  function agg(rs, key) {
    const m = new Map();
    for (const r of rs) {
      const k = key(r); let a = m.get(k);
      if (!a) { a = { k, v: 0, km: 0, n: 0, p: new Set(), t: new Set(), by: {} }; m.set(k, a); }
      a.v += r.v; a.km += r.km || 0; a.n++; a.p.add(r.nm); a.t.add(r.t); a.by[r.g] = (a.by[r.g] || 0) + r.v;
    }
    return [...m.values()].sort((a, b) => b.v - a.v);
  }
  const soma = (rs, f) => rs.reduce((a, r) => a + f(r), 0);

  function setFiltro(k, v) { F[k] = v; S.pageL = S.pageV = 0; P.atualizar(); }
  function setNome(n) { F.nome = n; const s = $("cf_nome"); if (s) s.value = n; S.pageL = S.pageV = 0; P.atualizar(); window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ---------- filtros (montados uma vez por ativação do módulo) ---------- */
  function iniciar(P_, el) {
    F = F0();
    const u = k => [...new Set(L.map(x => x[k]))].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt"));
    const opt = (vals, sel) => vals.map(v => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(v)}</option>`).join("");
    const sel = (id, rot, vals, vazio, atual) => `<div><label for="${id}">${rot}</label><select id="${id}">${vazio === null ? "" : `<option value="">${vazio || "Todos"}</option>`}${opt(vals, atual)}</select></div>`;
    el.innerHTML = `<div class="filtros"><details ${innerWidth < 700 ? "" : "open"}><summary>Filtros</summary><div class="filtros-grid">
      ${sel("cf_de", "De (mês)", MES, null, F.de)}${sel("cf_ate", "Até (mês)", MES, null, F.ate)}
      ${sel("cf_nome", "Conselheiro", u("nm"))}${sel("cf_tipo", "Tipo", u("tp"))}${sel("cf_co", "Colegiado", u("co"))}
      ${sel("cf_te", "Tipo de evento", u("te"))}${sel("cf_g", "Grupo de despesa", GR)}${sel("cf_ud", "UF de destino", u("ud"))}
      ${sel("cf_or", "Cidade de origem", u("or"))}${sel("cf_de2", "Cidade de destino", u("de"))}
      <div><label for="cf_prog">Lançamentos futuros</label><select id="cf_prog"><option value="">Incluir</option><option value="Não">Só realizados</option><option value="Sim">Só programados</option></select></div>
      <div style="align-self:end"><button class="ghost" id="cf_reset">Limpar filtros</button></div></div></details>
      <div class="resumo" id="cf_resumo"></div></div><div id="cf_sel"></div>`;
    const map = { cf_de: "de", cf_ate: "ate", cf_nome: "nome", cf_tipo: "tipo", cf_co: "co", cf_te: "te", cf_g: "g", cf_ud: "ud", cf_or: "or", cf_de2: "de2", cf_prog: "prog" };
    Object.entries(map).forEach(([id, k]) => $(id).addEventListener("change", e => setFiltro(k, e.target.value)));
    $("cf_reset").onclick = () => { F = F0(); Object.keys(map).forEach(id => { const s = $(id); s.value = F[map[id]] || ""; }); S.pageL = S.pageV = 0; P.atualizar(); };
  }

  function base() {
    const rs = rows(), trs = tripsOf(rs);
    const total = soma(rs, r => r.v);
    const r = $("cf_resumo");
    if (r) r.innerHTML = `<span><b>${num(rs.length)}</b> lançamentos</span><span><b>${num(trs.length)}</b> viagens/participações</span><span><b>${num(new Set(rs.map(x => x.nm)).size)}</b> conselheiros</span><span>Total no filtro: <b>${brl(total)}</b></span>`;
    const s = $("cf_sel");
    if (s) {
      if (F.nome) {
        const p = L.find(x => x.nm === F.nome); const ors = agg(L.filter(x => x.nm === F.nome), x => x.or)[0];
        s.innerHTML = `<div class="sel"><span class="pill">Conselheiro selecionado</span> <b>${esc(F.nome)}</b> · ${esc(p.tp)} · ${esc(p.en || "entidade não consta no rol atual")}${p.fu ? " · " + esc(p.fu) : ""}${ors && ors.k && ors.k !== "(não informada)" ? " · origem: " + esc(ors.k) : ""} <a class="lk" id="cf_limpa">remover seleção</a></div>`;
        $("cf_limpa").onclick = () => setNome("");
      } else s.innerHTML = "";
    }
    return { rs, trs, total };
  }

  /* ---------- componentes ---------- */
  const yfmt = { ticks: { callback: v => brl0(v) } };
  function hbar(id, items, onclick, color) {
    P.chart(id, { type: "bar", data: { labels: items.map(i => i.k || "(não informado)"), datasets: [{ data: items.map(i => i.v), backgroundColor: color || "#4a89d3" }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => brl(c.raw) + ` · ${items[c.dataIndex].t.size} viagens · ${items[c.dataIndex].p.size} cons.` } } },
        scales: { x: yfmt, y: { ticks: { autoSkip: false, font: { size: 11 } } } }, onClick: (e, els) => { if (els.length && onclick) onclick(items[els[0].index].k); } } });
  }
  function tabela(el, cols, data, key, again, max) {
    const st = S.sort[key] || { c: (cols.find(c => c.def) || cols[0]).k, d: -1 };
    const s = key.endsWith("_x") ? [...data] : [...data].sort((a, b) => { const x = a[st.c], y = b[st.c]; return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "pt")) * st.d; });
    const sl = max ? s.slice(0, max) : s;
    el.innerHTML = `<table><thead><tr>${cols.map(c => `<th class="${c.n ? "n" : ""}" data-k="${c.k}">${c.h}${st.c === c.k ? (st.d > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead><tbody>${sl.map(r => `<tr>${cols.map(c => `<td class="${c.n ? "n" : ""}">${c.f ? c.f(r[c.k], r) : esc(r[c.k])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    el.querySelectorAll("th").forEach(th => th.onclick = () => { const s0 = S.sort[key] || st; S.sort[key] = { c: th.dataset.k, d: s0.c === th.dataset.k ? -s0.d : -1 }; again(); });
    el.querySelectorAll("a.lk").forEach(a => a.onclick = () => setNome(a.dataset.n));
    return s;
  }
  const lk = v => `<a class="lk" data-n="${esc(v)}">${esc(v)}</a>`;
  const txtev = v => `<span title="${esc(v)}">${esc((v || "").slice(0, 70))}</span>`;
  function pager(el, page, total, per, set) {
    const pgs = Math.max(1, Math.ceil(total / per));
    el.innerHTML = `<button class="ghost" ${page <= 0 ? "disabled" : ""} data-d="-1">◀</button> página ${page + 1} de ${pgs} · ${total.toLocaleString("pt-BR")} registros <button class="ghost" ${page >= pgs - 1 ? "disabled" : ""} data-d="1">▶</button>`;
    el.querySelectorAll("button").forEach(b => b.onclick = () => set(page + Number(b.dataset.d)));
  }
  const card = (cls, titulo, corpo, nota) => `<div class="card ${cls}"><h2>${titulo}</h2>${corpo}${nota ? `<div class="nota">${nota}</div>` : ""}</div>`;
  const canvas = (id, tall) => `<div class="ch${tall ? " tall" : ""}"><canvas id="${id}"></canvas></div>`;
  const AVISO = `<div class="aviso">Atenção: antes de 04/2025 a API só traz passagens aéreas (diárias, auxílios e jeton começam em 15/04/2025); por isso o filtro inicia em 04/2025. Meses futuros são lançamentos programados.</div>`;

  /* ================= ABA: Visão geral ================= */
  function abaVisao(el) {
    const { rs, trs, total } = base();
    const km = soma(rs, r => r.km || 0), pess = new Set(rs.map(r => r.nm)).size;
    const byG = {}; rs.forEach(r => byG[r.g] = (byG[r.g] || 0) + r.v);
    const dd = trs.filter(t => t.di != null); const dm = dd.length ? soma(dd, t => t.di) / dd.length : 0;
    const prog = soma(rs.filter(r => r.pg === "Sim"), r => r.v);
    const k = (a, b, c, g) => `<div class="kpi${g ? " gold" : ""}"><span>${a}</span><b>${b}</b>${c ? `<small>${c}</small>` : ""}</div>`;
    el.innerHTML = `<div class="kpis">
      ${k("Custo total", brl(total), `realizado ${brl0(total - prog)} · programado ${brl0(prog)}`)}
      ${k("Conselheiros", num(pess), "com lançamentos no filtro")}${k("Viagens/participações", num(trs.length))}
      ${k("Custo médio por viagem", brl(trs.length ? total / trs.length : 0))}${k("Custo médio por conselheiro", brl(pess ? total / pess : 0))}
      ${GR.map(g => k(g, brl0(byG[g] || 0), total ? num(100 * (byG[g] || 0) / total, 1) + "% do total" : "", g === "Jeton")).join("")}
      ${k("KM pagos (auxílio terrestre)", num(km), "quilometragem lançada")}${k("Distância média da viagem", num(dm) + " km", "linha reta estimada, só ida")}
    </div>${AVISO}
    <div class="grid">
      ${card("c12", "Custo ao longo do tempo, por grupo de despesa, e acumulado", canvas("g_mes"))}
      ${card("c6", "Conselheiros que mais custaram <select id='topn' style='width:auto;display:inline;margin-left:8px'>" + [10, 15, 25, 40].map(n => `<option${n === S.topn ? " selected" : ""}>${n}</option>`).join("") + "</select>", canvas("g_top", 1), "Clique numa barra para selecionar o conselheiro.")}
      ${card("c6", "Grupos de despesa", canvas("g_gr", 1))}
    </div>`;
    const ms = MES.filter(m => m >= F.de && m <= F.ate); const bym = {};
    rs.forEach(r => { (bym[r.m] = bym[r.m] || {})[r.g] = ((bym[r.m] || {})[r.g] || 0) + r.v; });
    let acc = 0; const accd = ms.map(m => { acc += Object.values(bym[m] || {}).reduce((a, b) => a + b, 0); return acc; });
    P.chart("g_mes", { data: { labels: ms, datasets: [...GR.map(g => ({ type: "bar", label: g, data: ms.map(m => (bym[m] || {})[g] || 0), backgroundColor: GC[g], stack: "s", yAxisID: "y" })),
      { type: "line", label: "Acumulado", data: accd, borderColor: "#dc3545", backgroundColor: "#dc3545", yAxisID: "y2", pointRadius: 2, tension: .2 }] },
      options: { interaction: { mode: "index", intersect: false }, plugins: { tooltip: { callbacks: { label: c => c.dataset.label + ": " + brl(c.raw) } } }, scales: { x: { stacked: true }, y: { stacked: true, ...yfmt }, y2: { position: "right", grid: { drawOnChartArea: false }, ...yfmt } } } });
    hbar("g_top", agg(rs, r => r.nm).slice(0, S.topn), setNome);
    P.chart("g_gr", { type: "doughnut", data: { labels: GR, datasets: [{ data: GR.map(g => byG[g] || 0), backgroundColor: GR.map(g => GC[g]) }] }, options: { plugins: { legend: { position: "right" }, tooltip: { callbacks: { label: c => c.label + ": " + brl(c.raw) } } } } });
    $("topn").onchange = e => { S.topn = +e.target.value; P.atualizar(); };
  }

  /* ================= ABA: Conselheiros ================= */
  function abaConselheiros(el) {
    const { rs, trs } = base();
    const tby = {}; trs.forEach(t => { const o = tby[t.nm] = tby[t.nm] || { n: 0, d: 0, inter: 0 }; o.n++; if (t.di != null) o.d += t.di * 2; if (t.uo !== t.ud) o.inter++; });
    const info = {}; L.forEach(x => { if (!info[x.nm]) info[x.nm] = x; });
    const a = agg(rs, r => r.nm).map(x => {
      const o = tby[x.k] || { n: 0, d: 0, inter: 0 }; const p = info[x.k];
      const ors = agg(rs.filter(r => r.nm === x.k), r => r.or)[0];
      const at = soma(rs.filter(r => r.nm === x.k && r.c === "Auxílio Terrestre (km)"), r => r.v);
      return { nm: x.k, tp: p.tp, en: p.en || "(fora do rol atual)", or: ors ? ors.k : "", v: x.v, Jeton: x.by.Jeton || 0, Diárias: x.by["Diárias"] || 0, Auxílios: x.by["Auxílios"] || 0, Passagens: x.by.Passagens || 0,
        n: o.n, med: o.n ? x.v / o.n : 0, km: x.km, rkm: x.km ? at / x.km : null, dist: o.d, inter: o.inter, rdist: o.d ? x.v / o.d : null };
    });
    let det = "";
    if (F.nome) {
      det = card("c12", "Série mensal de " + esc(F.nome), canvas("g_det"), "Custo mensal por grupo de despesa e acumulado do conselheiro selecionado (respeita os demais filtros).");
    }
    el.innerHTML = `<div class="grid">${det}
      ${card("c12", "Mapa de calor: conselheiro × mês (R$ mil)", `<div class="scroll" id="t_heat"></div>`, "Os 30 conselheiros de maior custo no filtro. Clique no nome para selecioná-lo.")}
      ${card("c12", "Ranking de conselheiros", `<div class="barra"><button id="b_csv" class="ghost">Baixar CSV</button></div><div class="scroll" id="t_cons"></div>`, "Clique no cabeçalho para ordenar. R$/km pago = valor do auxílio terrestre por km lançado; R$/km estimado = custo total ÷ distância em linha reta (ida e volta).")}
    </div>`;
    if (F.nome) {
      const ms = MES.filter(m => m >= F.de && m <= F.ate), bym = {}; rs.forEach(r => { (bym[r.m] = bym[r.m] || {})[r.g] = ((bym[r.m] || {})[r.g] || 0) + r.v; });
      let acc = 0; const accd = ms.map(m => { acc += Object.values(bym[m] || {}).reduce((x, y) => x + y, 0); return acc; });
      P.chart("g_det", { data: { labels: ms, datasets: [...GR.map(g => ({ type: "bar", label: g, data: ms.map(m => (bym[m] || {})[g] || 0), backgroundColor: GC[g], stack: "s" })), { type: "line", label: "Acumulado", data: accd, borderColor: "#dc3545", backgroundColor: "#dc3545", yAxisID: "y2", pointRadius: 2 }] },
        options: { scales: { x: { stacked: true }, y: { stacked: true, ...yfmt }, y2: { position: "right", grid: { drawOnChartArea: false }, ...yfmt } } } });
    }
    heat(rs, MES.filter(m => m >= F.de && m <= F.ate), agg(rs, r => r.nm).slice(0, 30), r => r.nm, $("t_heat"), true);
    const again = () => abaConselheiros(el);
    tabela($("t_cons"), [{ k: "nm", h: "Conselheiro", f: lk }, { k: "tp", h: "Tipo" }, { k: "en", h: "Entidade" }, { k: "or", h: "Origem" }, { k: "v", h: "Custo total", n: 1, f: brl, def: 1 },
      { k: "Jeton", h: "Jeton", n: 1, f: brl0 }, { k: "Diárias", h: "Diárias", n: 1, f: brl0 }, { k: "Auxílios", h: "Auxílios", n: 1, f: brl0 }, { k: "Passagens", h: "Passagens", n: 1, f: brl0 },
      { k: "n", h: "Viagens", n: 1 }, { k: "med", h: "Médio/viagem", n: 1, f: brl0 }, { k: "km", h: "KM pagos", n: 1, f: v => num(v) }, { k: "rkm", h: "R$/km pago", n: 1, f: v => v == null ? "" : brl(v) },
      { k: "dist", h: "Dist. ida+volta est. (km)", n: 1, f: v => num(v) }, { k: "inter", h: "Interestaduais", n: 1 }, { k: "rdist", h: "R$/km estimado", n: 1, f: v => v == null ? "" : brl(v) }], a, "cons", again);
    $("b_csv").onclick = () => P.csv("conselheiros.csv", ["Conselheiro", "Tipo", "Entidade", "Origem", "Custo total", "Jeton", "Diárias", "Auxílios", "Passagens", "Viagens", "Custo médio por viagem", "KM pagos", "R$ por km pago", "Dist ida e volta estimada km", "Viagens interestaduais"],
      a.map(r => [r.nm, r.tp, r.en, r.or, r.v.toFixed(2), r.Jeton.toFixed(2), r["Diárias"].toFixed(2), r["Auxílios"].toFixed(2), r.Passagens.toFixed(2), r.n, r.med.toFixed(2), r.km, r.rkm == null ? "" : r.rkm.toFixed(2), Math.round(r.dist), r.inter]));
  }

  function heat(rs, ms, itens, keyFn, el, clicavel) {
    const mx = {}; rs.forEach(r => { const k = keyFn(r) + "|" + r.m; mx[k] = (mx[k] || 0) + r.v; });
    const vmax = Math.max(1, ...Object.values(mx));
    let h = `<table class="heat"><thead><tr><th>${clicavel ? "Conselheiro" : "Colegiado"}</th>${ms.map(m => `<th class="n">${m.slice(2)}</th>`).join("")}<th class="n">Total</th></tr></thead><tbody>`;
    itens.forEach(p => {
      h += `<tr><td class="l">${clicavel ? lk(p.k) : esc(p.k)}</td>` + ms.map(m => {
        const v = mx[p.k + "|" + m] || 0, a = v ? .1 + .9 * Math.min(1, v / vmax * 2.2) : 0;
        return `<td title="${esc(p.k)} · ${m}: ${brl(v)}" style="background:${v ? `rgba(9,76,140,${a.toFixed(2)})` : "transparent"};color:${a > .5 ? "#fff" : "inherit"}">${v ? num(v / 1000, 1) : ""}</td>`;
      }).join("") + `<td><b>${brl0(p.v)}</b></td></tr>`;
    });
    el.innerHTML = h + "</tbody></table>";
    el.querySelectorAll("a.lk").forEach(a => a.onclick = () => setNome(a.dataset.n));
  }

  /* ================= ABA: Colegiados e eventos ================= */
  function abaColegiados(el) {
    const { rs, trs } = base();
    const colA = agg(rs, r => r.co), teA = agg(rs, r => r.te);
    el.innerHTML = `<div class="grid">
      ${card("c6", "Custo por colegiado", canvas("g_col", 1), "Plenário, câmaras especializadas, comissões, diretoria e outros. Clique numa barra para filtrar.")}
      ${card("c6", "Custo por tipo de evento", canvas("g_te", 1), "Clique numa fatia para filtrar.")}
      ${card("c12", "Colegiados: indicadores", `<div class="scroll" id="t_col"></div>`, "Cada lançamento é atribuído a um único colegiado. Plenário tem precedência em reuniões plenárias; a câmara é a primeira citada no título do evento (classificação automática).")}
      ${card("c12", "Mapa de calor: colegiado × mês (R$ mil)", `<div class="scroll" id="t_heat"></div>`)}
      ${card("c12", "Tipos de evento: indicadores", `<div class="scroll" id="t_te"></div>`)}
    </div>`;
    hbar("g_col", colA.slice(0, 20), n => setFiltro("co", n) || ($("cf_co").value = n), "#094c8c");
    P.chart("g_te", { type: "doughnut", data: { labels: teA.map(x => x.k), datasets: [{ data: teA.map(x => x.v), backgroundColor: PAL }] },
      options: { plugins: { legend: { position: "right", labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: c => c.label + ": " + brl(c.raw) } } }, onClick: (e, els) => { if (els.length) { F.te = teA[els[0].index].k; S.pageL = S.pageV = 0; P.atualizar(); $("cf_te").value = F.te; } } } });
    const mk = (A, key) => A.map(x => ({ k: x.k, v: x.v, pct: 0, n: x.t.size, cons: x.p.size, med: x.t.size ? x.v / x.t.size : 0, Jeton: x.by.Jeton || 0, Diárias: x.by["Diárias"] || 0, Auxílios: x.by["Auxílios"] || 0, Passagens: x.by.Passagens || 0 }));
    const tot = soma(rs, r => r.v) || 1;
    const cols = (h) => [{ k: "k", h }, { k: "v", h: "Custo", n: 1, f: brl, def: 1 }, { k: "pct", h: "%", n: 1, f: v => num(v, 1) + "%" }, { k: "n", h: "Viagens", n: 1 }, { k: "cons", h: "Conselheiros", n: 1 }, { k: "med", h: "Médio/viagem", n: 1, f: brl0 },
      { k: "Jeton", h: "Jeton", n: 1, f: brl0 }, { k: "Diárias", h: "Diárias", n: 1, f: brl0 }, { k: "Auxílios", h: "Auxílios", n: 1, f: brl0 }, { k: "Passagens", h: "Passagens", n: 1, f: brl0 }];
    const again = () => abaColegiados(el);
    const c1 = mk(colA).map(r => ({ ...r, pct: 100 * r.v / tot })), c2 = mk(teA).map(r => ({ ...r, pct: 100 * r.v / tot }));
    tabela($("t_col"), cols("Colegiado"), c1, "col", again);
    tabela($("t_te"), cols("Tipo de evento"), c2, "te", again);
    heat(rs, MES.filter(m => m >= F.de && m <= F.ate), colA, r => r.co, $("t_heat"), false);
  }

  /* ================= ABA: Geografia e km ================= */
  function abaGeo(el) {
    const { rs, trs } = base();
    el.innerHTML = `<div class="aviso">Distâncias são <b>estimativas em linha reta</b> entre cidades (coordenadas aproximadas), não quilometragem rodoviária. "KM pagos" é o dado oficial do auxílio terrestre. Conselheiros sem origem confiável aparecem como "(não informada)".</div>
    <div class="grid">
      ${card("c4", "UF de destino", canvas("g_uf", 1), "Clique para filtrar.")}${card("c4", "Cidades de destino", canvas("g_de", 1))}${card("c4", "Cidades de origem", canvas("g_or", 1), "De onde os conselheiros se deslocam.")}
      ${card("c6", "Distância × custo por viagem (cada ponto = conselheiro)", canvas("g_sc", 1), "Eixo X: distância média da viagem (km, só ida). Passe o mouse para ver o nome; clique para selecionar.")}
      ${card("c6", "Custo por faixa de distância da viagem", canvas("g_fx", 1))}
      ${card("c6", "Rotas (origem → destino)", `<div class="scroll" id="t_rotas"></div>`)}
      ${card("c6", "Quilometragem por cidade de origem", `<div class="scroll" id="t_km"></div>`)}
    </div>`;
    hbar("g_uf", agg(rs, r => r.ud).slice(0, 14), n => { F.ud = n; S.pageL = S.pageV = 0; P.atualizar(); $("cf_ud").value = n; }, "#c19e00");
    hbar("g_de", agg(rs, r => r.de).slice(0, 18), n => { F.de2 = n; S.pageL = S.pageV = 0; P.atualizar(); $("cf_de2").value = n; }, "#094c8c");
    hbar("g_or", agg(rs, r => r.or).slice(0, 18), n => { F.or = n; S.pageL = S.pageV = 0; P.atualizar(); $("cf_or").value = n; }, "#17a2b8");
    const byP = {}; trs.forEach(t => { const o = byP[t.nm] = byP[t.nm] || { n: 0, v: 0, d: 0, dn: 0 }; o.n++; o.v += t.total; if (t.di != null) { o.d += t.di; o.dn++; } });
    const pts = Object.entries(byP).filter(([k, o]) => o.dn).map(([k, o]) => ({ x: o.d / o.dn, y: o.v / o.n, r: Math.min(14, 4 + Math.sqrt(o.n)), n: k, viagens: o.n }));
    P.chart("g_sc", { type: "bubble", data: { datasets: [{ data: pts, backgroundColor: "#4a89d3aa", borderColor: "#094c8c" }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw.n}: ${num(c.raw.x)} km (ida) · ${brl(c.raw.y)}/viagem · ${c.raw.viagens} viagens` } } },
        scales: { x: { title: { display: true, text: "Distância média da viagem (km, ida)" } }, y: { title: { display: true, text: "Custo médio por viagem" }, ...yfmt } }, onClick: (e, els) => { if (els.length) setNome(pts[els[0].index].n); } } });
    const fx = [[0, 1, "0 (mesma cidade)"], [1, 150, "até 150 km"], [150, 400, "150–400 km"], [400, 800, "400–800 km"], [800, 1500, "800–1.500 km"], [1500, 1e9, "> 1.500 km"]];
    const fa = fx.map(([a, b, l]) => { const ts = trs.filter(t => t.di != null && t.di >= a && t.di < b); return { l, n: ts.length, v: soma(ts, t => t.total) }; });
    P.chart("g_fx", { data: { labels: fa.map(x => x.l), datasets: [{ type: "bar", label: "Custo total", data: fa.map(x => x.v), backgroundColor: "#4a89d3", yAxisID: "y" }, { type: "line", label: "Custo médio por viagem", data: fa.map(x => x.n ? x.v / x.n : 0), borderColor: "#dc3545", backgroundColor: "#dc3545", yAxisID: "y2" }] },
      options: { plugins: { tooltip: { callbacks: { afterLabel: c => fa[c.dataIndex].n + " viagens" } } }, scales: { y: { ...yfmt }, y2: { position: "right", grid: { drawOnChartArea: false }, ...yfmt } } } });
    const again = () => abaGeo(el);
    const rm = {}; trs.forEach(t => { const k = t.or + "→" + t.de; const o = rm[k] = rm[k] || { rota: t.or + " → " + t.de, n: 0, v: 0, di: t.di, p: new Set() }; o.n++; o.v += t.total; o.p.add(t.nm); });
    tabela($("t_rotas"), [{ k: "rota", h: "Rota" }, { k: "n", h: "Viagens", n: 1 }, { k: "cons", h: "Cons.", n: 1 }, { k: "v", h: "Custo", n: 1, f: brl0, def: 1 }, { k: "med", h: "Médio/viagem", n: 1, f: brl0 }, { k: "di", h: "Dist. (km)", n: 1, f: v => v == null ? "" : num(v) }],
      Object.values(rm).map(o => ({ ...o, cons: o.p.size, med: o.v / o.n })), "rotas", again, 80);
    const om = {}; rs.forEach(r => { const x = om[r.or] = om[r.or] || { or: r.or, uf: r.uo, v: 0, km: 0, at: 0, p: new Set() }; x.v += r.v; x.km += r.km || 0; if (r.c === "Auxílio Terrestre (km)") x.at += r.v; x.p.add(r.nm); });
    const dd = {}; trs.forEach(t => { const x = dd[t.or] = dd[t.or] || { s: 0, n: 0 }; if (t.di != null) { x.s += t.di; x.n++; } });
    tabela($("t_km"), [{ k: "or", h: "Cidade de origem" }, { k: "uf", h: "UF" }, { k: "cons", h: "Cons.", n: 1 }, { k: "km", h: "KM pagos", n: 1, f: v => num(v), def: 1 }, { k: "at", h: "R$ AT-km", n: 1, f: brl0 }, { k: "rkm", h: "R$/km", n: 1, f: v => v == null ? "" : brl(v) },
      { k: "dm", h: "Dist. média (km)", n: 1, f: v => v == null ? "" : num(v) }, { k: "v", h: "Custo total", n: 1, f: brl0 }],
      Object.values(om).map(x => ({ ...x, cons: x.p.size, rkm: x.km ? x.at / x.km : null, dm: dd[x.or] && dd[x.or].n ? dd[x.or].s / dd[x.or].n : null })), "km", again, 80);
  }

  /* ================= ABA: Viagens ================= */
  function abaViagens(el) {
    const { trs } = base();
    el.innerHTML = card("c12", "Viagens e participações (uma linha por conselheiro × evento)", `<div class="barra"><button id="b_csv" class="ghost">Baixar CSV (filtro atual)</button></div><div class="scroll" id="t_v"></div><div class="pg" id="p_v"></div>`);
    const per = 40, data = trs.map(t => ({ ...t }));
    const st = S.sort.viag || { c: "d", d: -1 };
    const cols = [{ k: "d", h: "Data" }, { k: "nm", h: "Conselheiro", f: lk }, { k: "ev", h: "Evento", f: txtev }, { k: "co", h: "Colegiado" }, { k: "te", h: "Tipo" }, { k: "or", h: "Origem" }, { k: "de", h: "Destino" }, { k: "ud", h: "UF" }, { k: "di", h: "Dist. (km)", n: 1, f: v => v == null ? "" : num(v) }, { k: "total", h: "Custo", n: 1, f: brl }];
    const s = [...data].sort((a, b) => { const x = a[st.c], y = b[st.c]; return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "pt")) * st.d; });
    S.pageV = Math.min(S.pageV, Math.max(0, Math.ceil(s.length / per) - 1));
    tabela($("t_v"), cols, s.slice(S.pageV * per, S.pageV * per + per), "viag_x", () => { }, 0);
    // ordenação global (não só da página): refaz com o dataset completo
    $("t_v").querySelectorAll("th").forEach(th => th.onclick = () => { S.sort.viag = { c: th.dataset.k, d: st.c === th.dataset.k ? -st.d : -1 }; abaViagens(el); });
    pager($("p_v"), S.pageV, s.length, per, p => { S.pageV = p; abaViagens(el); });
    $("b_csv").onclick = () => P.csv("viagens.csv", ["Data", "Conselheiro", "Evento", "Colegiado", "Tipo de evento", "Origem", "Destino", "UF destino", "Distância estimada km (ida)", "Custo"], s.map(r => [r.d, r.nm, r.ev, r.co, r.te, r.or, r.de, r.ud, r.di == null ? "" : r.di, r.total.toFixed(2)]));
  }

  /* ================= ABA: Lançamentos ================= */
  function abaLanc(el) {
    base();
    el.innerHTML = card("c12", "Lançamentos (base detalhada)", `<div class="barra"><input type="search" id="q" placeholder="Buscar em nome, evento, cidade, categoria…" value="${esc(S.q)}"><button id="b_csv" class="ghost">Baixar CSV (filtro atual)</button></div><div class="scroll" id="t_l"></div><div class="pg" id="p_l"></div>`);
    const per = 50;
    const q = S.q.toLowerCase();
    let rs = rows(); if (q) rs = rs.filter(r => (r.nm + " " + r.ev + " " + r.or + " " + r.de + " " + r.c + " " + r.co + " " + r.te).toLowerCase().includes(q));
    const st = S.sort.lanc || { c: "d", d: -1 };
    const s = [...rs].sort((a, b) => { const x = a[st.c], y = b[st.c]; return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "pt")) * st.d; });
    S.pageL = Math.min(S.pageL, Math.max(0, Math.ceil(s.length / per) - 1));
    const cols = [{ k: "d", h: "Data ref." }, { k: "nm", h: "Conselheiro", f: lk }, { k: "c", h: "Categoria" }, { k: "v", h: "Valor", n: 1, f: brl }, { k: "q", h: "Qtd", n: 1 }, { k: "km", h: "KM", n: 1, f: v => v ? num(v, 1) : "" }, { k: "co", h: "Colegiado" },
      { k: "or", h: "Origem" }, { k: "de", h: "Destino" }, { k: "ud", h: "UF" }, { k: "ev", h: "Evento", f: txtev }, { k: "f", h: "Fonte" }];
    tabela($("t_l"), cols, s.slice(S.pageL * per, S.pageL * per + per), "lanc_x", () => { }, 0);
    $("t_l").querySelectorAll("th").forEach(th => th.onclick = () => { S.sort.lanc = { c: th.dataset.k, d: st.c === th.dataset.k ? -st.d : -1 }; abaLanc(el); });
    pager($("p_l"), S.pageL, s.length, per, p => { S.pageL = p; abaLanc(el); });
    $("q").oninput = e => { S.q = e.target.value; S.pageL = 0; clearTimeout(S.tm); S.tm = setTimeout(() => { abaLanc(el); const i = $("q"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    $("b_csv").onclick = () => P.csv("lancamentos.csv", ["Data de referência", "Conselheiro", "Tipo", "Grupo", "Categoria", "Valor", "Quantidade", "KM", "Colegiado", "Tipo de evento", "Origem", "UF origem", "Destino", "UF destino", "Evento", "Fonte", "Programado"],
      s.map(r => [r.d, r.nm, r.tp, r.g, r.c, r.v.toFixed(2), r.q, r.km || "", r.co, r.te, r.or, r.uo, r.de, r.ud, r.ev, r.f, r.pg]));
  }

  /* ================= ABA: Metodologia ================= */
  function abaMetodo(el) {
    base();
    const pg = L.filter(x => x.pg === "Sim").length;
    el.innerHTML = `<div class="card texto"><h2>Metodologia e limites dos dados</h2>
      <h3>Fonte</h3><p>API pública do Portal da Transparência do CREA-BA (Implanta Informática), endpoints <code>Conselheiros</code>, <code>DiariasDeslocamentos</code>, <code>DespesasViagens</code>, <code>PassagensAereas</code> e <code>PassagensTerrestres</code>. Atualização automática semanal. Base atual: ${num(L.length)} lançamentos, ${num(T.length)} viagens/participações.</p>
      <h3>Período</h3><p>Diárias, auxílios e jeton existem a partir de 15/04/2025; passagens aéreas, a partir de 01/2024. A API não disponibiliza dados anteriores. ${num(pg)} lançamentos têm data futura (programados).</p>
      <h3>Quem entra</h3><p>Passageiros classificados pela API como <b>Conselheiro</b> ou <b>Presidente</b> (o Presidente fica identificado e pode ser filtrado). Funcionários, inspetores e colaboradores/convidados não entram.</p>
      <h3>Como o custo é calculado</h3><p>Soma de jeton, diárias, auxílios (terrestre por km e região metropolitana, deslocamento, alimentação), reembolsos e a tarifa de cada bilhete aéreo e rodoviário. Os lançamentos de <code>DespesasViagens</code> já estão contidos em <code>DiariasDeslocamentos</code> e não são somados duas vezes. A data de referência é a do pagamento (diárias/auxílios/jeton) ou a do embarque (passagens).</p>
      <h3>Colegiado, tipo de evento e câmara</h3><p>Inferidos automaticamente a partir do título do evento (texto livre), portanto sujeitos a erro. Plenário tem precedência em reuniões plenárias; a câmara é a primeira citada.</p>
      <h3>Origem, destino e distância</h3><p>A origem é a "cidade de origem" informada nas diárias (única por conselheiro). Para quem só tem passagens aéreas, a origem foi inferida pelos voos apenas quando havia segurança; na dúvida, fica "não informada". As distâncias são em linha reta entre coordenadas aproximadas das cidades, não rodoviárias. "KM pagos" vem do auxílio terrestre (km).</p>
      <h3>Privacidade</h3><p>Constam nomes de conselheiros, como no portal público. CPFs e e-mails não são exibidos. Reutilize com atenção à LGPD.</p>
    </div>`;
  }

  P.registrar({
    id: "conselheiros", titulo: "Conselheiros e viagens", atualizado: D.gerado, iniciar,
    abas: [{ id: "visao", titulo: "Visão geral", render: abaVisao }, { id: "conselheiros", titulo: "Conselheiros", render: abaConselheiros },
      { id: "colegiados", titulo: "Colegiados e eventos", render: abaColegiados }, { id: "geografia", titulo: "Origens, destinos e km", render: abaGeo },
      { id: "viagens", titulo: "Viagens", render: abaViagens }, { id: "lancamentos", titulo: "Lançamentos", render: abaLanc }, { id: "metodologia", titulo: "Metodologia", render: abaMetodo }],
  });
})();
