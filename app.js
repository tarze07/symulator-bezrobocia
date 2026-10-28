(function () {
  "use strict";
  const M = window.EconModel;
  const D = M.DEFAULTS;

  // ---- definicja kontrolek -------------------------------------------------
  const GROUPS = [
    { title: "Szok na rynku pracy", open: true, items: [
      { k: "shock", l: "Wzrost bezrobocia", u: " pp", min: 0, max: 15, step: 0.5, h: "O ile punktów proc. rośnie stopa bezrobocia" },
      { k: "duration", l: "Czas trwania szoku", u: " kw.", min: 1, max: 24, step: 1, h: "Po tym czasie bezrobocie zaczyna spadać" },
      { k: "horizon", l: "Horyzont symulacji", u: " kw.", min: 8, max: 40, step: 1 },
    ]},
    { title: "Polityka fiskalna", open: true, items: [
      { k: "stimulus", l: "Stymulus fiskalny", u: "% PKB", min: 0, max: 5, step: 0.1, h: "Dodatkowe wydatki w czasie szoku" },
      { k: "almp", l: "Aktywizacja zawodowa", u: "% PKB", min: 0, max: 2, step: 0.05, h: "Szkolenia, staże – zmniejszają skalę szoku" },
      { k: "multiplier", l: "Mnożnik fiskalny", u: "", min: 0, max: 2, step: 0.1 },
    ]},
    { title: "Podatki i składki", open: false, items: [
      { k: "pit", l: "Efektywny PIT", u: "%", min: 0, max: 25, step: 0.5 },
      { k: "cEmp", l: "Składki pracownika", u: "%", min: 0, max: 25, step: 0.5 },
      { k: "cEr", l: "Składki pracodawcy", u: "%", min: 0, max: 30, step: 0.5 },
      { k: "vat", l: "Efektywny VAT", u: "%", min: 0, max: 25, step: 0.5 },
      { k: "cit", l: "CIT", u: "%", min: 0, max: 35, step: 1 },
    ]},
    { title: "Wydatki i zasiłki", open: false, items: [
      { k: "otherSpend", l: "Pozostałe wydatki", u: "% PKB", min: 25, max: 50, step: 0.5 },
      { k: "benefit", l: "Zasiłek dla bezrobotnych", u: " zł/mies.", min: 0, max: 4000, step: 50 },
      { k: "coverage", l: "Odsetek pobierających zasiłek", u: "%", min: 0, max: 100, step: 1 },
    ]},
    { title: "Struktura gospodarki", open: false, items: [
      { k: "okun", l: "Współczynnik Okuna", u: "", min: 0.5, max: 4, step: 0.1, h: "% PKB tracone na 1 pp bezrobocia" },
      { k: "hyst", l: "Histereza", u: "", min: 0, max: 0.2, step: 0.01, h: "Jak szybko długie bezrobocie podnosi stopę naturalną" },
      { k: "phillips", l: "Krzywa Phillipsa", u: "", min: 0, max: 1, step: 0.05, h: "Wpływ bezrobocia na inflację" },
      { k: "mpc", l: "Skłonność do konsumpcji", u: "", min: 0.4, max: 1, step: 0.01 },
      { k: "growth", l: "Wzrost potencjału PKB", u: "% rocznie", min: 0, max: 6, step: 0.1 },
      { k: "u0", l: "Bezrobocie wyjściowe", u: "%", min: 2, max: 15, step: 0.5 },
      { k: "labor", l: "Siła robocza", u: " mln", min: 5, max: 40, step: 0.5 },
      { k: "wage", l: "Przeciętna płaca brutto", u: " zł", min: 3000, max: 20000, step: 100 },
      { k: "gdp", l: "Potencjalny PKB", u: " mld zł", min: 1000, max: 8000, step: 100 },
    ]},
    { title: "Dług i rynki", open: false, items: [
      { k: "debt", l: "Dług publiczny", u: " mld zł", min: 0, max: 8000, step: 50 },
      { k: "rate", l: "Realne oprocentowanie długu", u: "%", min: 0, max: 8, step: 0.1 },
      { k: "premium", l: "Premia za ryzyko", u: " pp/100% PKB", min: 0, max: 20, step: 0.5, h: "Dodatkowy koszt długu powyżej progu" },
      { k: "threshold", l: "Próg zadłużenia", u: "% PKB", min: 20, max: 100, step: 1 },
    ]},
  ];

  const PRESETS = [
    { n: "Łagodna recesja", v: { shock: 2, duration: 6 } },
    { n: "Kryzys finansowy", v: { shock: 5, duration: 10 } },
    { n: "Szok jak COVID", v: { shock: 4, duration: 3, stimulus: 3, hyst: 0.01 } },
    { n: "Głęboka depresja", v: { shock: 12, duration: 16, hyst: 0.05 } },
    { n: "Odpowiedź: stymulus", v: { shock: 5, duration: 10, stimulus: 2, almp: 0.4 } },
    { n: "Odpowiedź: cięcia", v: { shock: 5, duration: 10, otherSpend: 35, vat: 13, multiplier: 1.5 } },
  ];

  const params = Object.assign({}, D);
  const $ = (id) => document.getElementById(id);

  // ---- formatowanie --------------------------------------------------------
  const nf = (d) => new Intl.NumberFormat("pl-PL", { minimumFractionDigits: d, maximumFractionDigits: d });
  const f0 = nf(0), f1 = nf(1), f2 = nf(2);
  const fmt = (x, d) => (d === 0 ? f0 : d === 1 ? f1 : f2).format(x).replace(/ /g, " ");
  const signed = (x, d) => (x > 0 ? "+" : "") + fmt(x, d);

  // ---- budowa panelu -------------------------------------------------------
  const outputs = {}, inputs = {};
  function buildControls() {
    const host = $("sliders");
    GROUPS.forEach((g) => {
      const det = document.createElement("details");
      det.className = "group";
      det.open = g.open;
      det.innerHTML = "<summary>" + g.title + "</summary>";
      g.items.forEach((it) => {
        const w = document.createElement("div");
        w.className = "ctl";
        const dec = it.step < 0.1 ? 2 : it.step < 1 ? 1 : 0;
        w.innerHTML = '<label for="c_' + it.k + '">' + it.l + '<output id="o_' + it.k + '"></output></label>' +
          '<input type="range" id="c_' + it.k + '" min="' + it.min + '" max="' + it.max + '" step="' + it.step + '">' +
          (it.h ? '<div class="hint">' + it.h + "</div>" : "");
        det.appendChild(w);
        const inp = w.querySelector("input"), out = w.querySelector("output");
        inputs[it.k] = inp; outputs[it.k] = { el: out, it, dec };
        inp.addEventListener("input", () => {
          params[it.k] = parseFloat(inp.value);
          markPreset(-1);
          render();
        });
      });
      host.appendChild(det);
    });
    const ph = $("presets");
    PRESETS.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = p.n; b.dataset.i = i;
      b.addEventListener("click", () => {
        Object.assign(params, D, p.v);
        markPreset(i); syncInputs(); render();
      });
      ph.appendChild(b);
    });
    $("reset").addEventListener("click", () => { Object.assign(params, D); markPreset(-1); syncInputs(); render(); });
  }
  function markPreset(i) {
    document.querySelectorAll("#presets button").forEach((b) => b.classList.toggle("active", +b.dataset.i === i));
  }
  function syncInputs() {
    Object.keys(inputs).forEach((k) => { inputs[k].value = params[k]; });
    updateOutputs();
  }
  function updateOutputs() {
    Object.keys(outputs).forEach((k) => {
      const o = outputs[k];
      o.el.textContent = fmt(params[k], o.dec) + o.it.u;
    });
  }

  // ---- wykresy SVG ---------------------------------------------------------
  const W = 440, H = 220, ML = 44, MR = 10, MT = 10, MB = 24;
  const charts = {};

  function niceTicks(lo, hi, n) {
    if (hi - lo < 1e-9) { hi = lo + 1; }
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }

  function makeChart(id, title, sub, series, dec, unit) {
    const card = document.createElement("div");
    card.className = "card";
    const legend = series.map((s) => '<span><i class="' + (s.dash ? "dash" : "") + '" style="border-color:var(' + s.c + ')"></i>' + s.n + "</span>").join("");
    card.innerHTML = "<h3>" + title + (sub ? " <small>" + sub + "</small>" : "") + '</h3><div class="legend">' + legend +
      '</div><div class="chartbox"><svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + title + '"></svg><div class="tip" hidden></div></div>';
    $("charts").appendChild(card);
    const c = { svg: card.querySelector("svg"), tip: card.querySelector(".tip"), series, dec, unit, title };
    charts[id] = c;
    c.svg.addEventListener("mousemove", (e) => hover(c, e));
    c.svg.addEventListener("mouseleave", () => { c.tip.hidden = true; const h = c.svg.querySelector(".hov"); if (h) h.remove(); });
  }

  function drawChart(c, data) {
    // data: [{...series, vals: []}] w kolejności c.series
    const n = data[0].length, d = params;
    let lo = Infinity, hi = -Infinity;
    data.forEach((a) => a.forEach((v) => { if (v < lo) lo = v; if (v > hi) hi = v; }));
    const pad = (hi - lo) * 0.06 || 1;
    const ticks = niceTicks(lo - pad, hi + pad, 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const X = (t) => ML + (t / (n - 1)) * (W - ML - MR);
    const Y = (v) => MT + (1 - (v - y0) / (y1 - y0)) * (H - MT - MB);
    c.X = X; c.n = n; c.data = data;
    let s = "";
    // tło szoku
    const sEnd = Math.min(d.duration, n - 1);
    if (d.shock > 0) s += '<rect x="' + X(1) + '" y="' + MT + '" width="' + (X(sEnd) - X(1)) + '" height="' + (H - MT - MB) + '" fill="var(--shock)"/>';
    s += '<g class="grid">';
    ticks.forEach((v) => {
      s += '<line x1="' + ML + '" x2="' + (W - MR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>' +
        '<text x="' + (ML - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + fmt(v, c.dec) + "</text>";
    });
    s += "</g>";
    const step = n > 28 ? 8 : 4;
    for (let t = 0; t < n; t += step) {
      s += '<text x="' + X(t) + '" y="' + (H - 6) + '" text-anchor="middle">' + (t === 0 ? "start" : "r" + fmt(t / 4, t % 4 ? 1 : 0)) + "</text>";
    }
    data.forEach((a, i) => {
      const se = c.series[i];
      const pts = a.map((v, t) => (t ? "L" : "M") + X(t).toFixed(1) + " " + Y(v).toFixed(1)).join("");
      s += '<path d="' + pts + '" fill="none" stroke="var(' + se.c + ')" stroke-width="' + (se.dash ? 1.8 : 2.6) + '"' +
        (se.dash ? ' stroke-dasharray="5 4"' : "") + ' stroke-linejoin="round" stroke-linecap="round"/>';
    });
    c.svg.innerHTML = s;
    c.Y = Y;
  }

  function hover(c, e) {
    const r = c.svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let t = Math.round(((x - ML) / (W - ML - MR)) * (c.n - 1));
    t = Math.max(0, Math.min(c.n - 1, t));
    let h = c.svg.querySelector(".hov");
    if (h) h.remove();
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "hov");
    let s = '<line x1="' + c.X(t) + '" x2="' + c.X(t) + '" y1="' + MT + '" y2="' + (H - MB) + '" stroke="var(--muted)" stroke-dasharray="3 3"/>';
    c.data.forEach((a, i) => { s += '<circle cx="' + c.X(t) + '" cy="' + c.Y(a[t]) + '" r="3.5" fill="var(' + c.series[i].c + ')"/>'; });
    g.innerHTML = s; c.svg.appendChild(g);
    c.tip.innerHTML = "<b>" + (t === 0 ? "Start" : "Kwartał " + t + " (rok " + fmt(t / 4, 2) + ")") + "</b><br>" +
      c.series.map((se, i) => '<span style="color:var(' + se.c + ')">●</span> ' + se.n + ": <b>" + fmt(c.data[i][t], c.dec) + "</b> " + c.unit).join("<br>");
    c.tip.hidden = false;
    const left = (c.X(t) / W) * r.width;
    c.tip.style.left = Math.min(left + 12, r.width - c.tip.offsetWidth - 4) + "px";
    c.tip.style.top = "8px";
  }

  function buildCharts() {
    makeChart("u", "Stopa bezrobocia", "%", [
      { n: "Scenariusz", c: "--c1" }, { n: "Stopa naturalna", c: "--c3" }, { n: "Bez szoku", c: "--c2", dash: true }], 1, "%");
    makeChart("gdp", "PKB", "mld zł, ceny stałe", [
      { n: "Scenariusz", c: "--c2" }, { n: "Bez szoku", c: "--c2", dash: true }], 0, "mld zł");
    makeChart("bud", "Dochody i wydatki budżetu", "mld zł rocznie", [
      { n: "Wydatki", c: "--c1" }, { n: "Dochody", c: "--c4" }, { n: "Dochody bez szoku", c: "--c4", dash: true }], 0, "mld zł");
    makeChart("def", "Deficyt budżetowy", "% PKB", [
      { n: "Scenariusz", c: "--c1" }, { n: "Bez szoku", c: "--c1", dash: true }], 1, "% PKB");
    makeChart("debt", "Dług publiczny", "% PKB", [
      { n: "Scenariusz", c: "--c5" }, { n: "Bez szoku", c: "--c5", dash: true }], 1, "% PKB");
    makeChart("cons", "Konsumpcja i fundusz płac", "mld zł rocznie", [
      { n: "Konsumpcja", c: "--c3" }, { n: "Fundusz płac", c: "--c2" }, { n: "Konsumpcja bez szoku", c: "--c3", dash: true }], 0, "mld zł");
    makeChart("infl", "Inflacja i koszt długu", "%", [
      { n: "Inflacja", c: "--c3" }, { n: "Oprocentowanie długu (realne)", c: "--c1" }, { n: "Inflacja bez szoku", c: "--c3", dash: true }], 2, "%");
    makeChart("jobs", "Zatrudnieni i bezrobotni", "mln osób", [
      { n: "Zatrudnieni", c: "--c4" }, { n: "Bezrobotni", c: "--c1" }], 2, "mln");
  }

  // ---- render --------------------------------------------------------------
  function render() {
    updateOutputs();
    const sc = M.simulate(params), base = M.simulate(params, { noShock: true });
    const S = M.summarize(sc, base, params);
    const col = (a, k) => a.map((x) => x[k]);

    drawChart(charts.u, [col(sc, "u"), col(sc, "unat"), col(base, "u")]);
    drawChart(charts.gdp, [col(sc, "Y"), col(base, "Y")]);
    drawChart(charts.bud, [col(sc, "spending"), col(sc, "revenue"), col(base, "revenue")]);
    drawChart(charts.def, [col(sc, "deficitPct"), col(base, "deficitPct")]);
    drawChart(charts.debt, [col(sc, "debtPct"), col(base, "debtPct")]);
    drawChart(charts.cons, [col(sc, "cons"), col(sc, "wageBill"), col(base, "cons")]);
    drawChart(charts.infl, [col(sc, "infl"), col(sc, "r"), col(base, "infl")]);
    drawChart(charts.jobs, [col(sc, "employed"), col(sc, "unemployed")]);

    renderKpis(S);
    renderStory(S);
    renderBridge(sc, base, S);
    renderTable(sc);
  }

  function renderKpis(S) {
    const years = params.horizon / 4;
    const k = [
      { l: "Szczyt bezrobocia", v: fmt(S.peakU, 1) + "%", s: "start: " + fmt(params.u0, 1) + "%, stopa naturalna na końcu: " + fmt(S.unatEnd, 1) + "%", cls: S.peakU > params.u0 + 0.05 ? "bad" : "" },
      { l: "Utracone miejsca pracy (szczyt)", v: fmt(S.jobsLostPeak * 1000, 0) + " tys.", s: "względem scenariusza bez szoku", cls: S.jobsLostPeak > 0.001 ? "bad" : "" },
      { l: "Skumulowana strata PKB", v: fmt(S.lossGDP, 0) + " mld zł", s: fmt(S.lossGDPpct, 1) + "% PKB z " + fmt(years, 1) + " lat", cls: S.lossGDP > 1 ? "bad" : "" },
      { l: "Największy spadek konsumpcji", v: "−" + fmt(S.consDropPct, 1) + "%", s: "względem scenariusza bez szoku", cls: S.consDropPct > 0.05 ? "bad" : "" },
      { l: "Utracone dochody budżetu", v: fmt(S.lossRev, 0) + " mld zł", s: "wszystkie dochody, narastająco", cls: S.lossRev > 1 ? "bad" : "" },
      { l: "Dodatkowe zasiłki", v: fmt(S.extraBen, 0) + " mld zł", s: "narastająco", cls: "" },
      { l: "Szczyt deficytu", v: fmt(S.peakDefPct, 1) + "% PKB", s: "limit Maastricht: 3% PKB", cls: S.peakDefPct > 3 ? "bad" : "good" },
      { l: "Dług na końcu horyzontu", v: fmt(S.debtPctEnd, 1) + "% PKB", s: "bez szoku: " + fmt(S.debtPctEndBase, 1) + "% (" + signed(S.debtPctEnd - S.debtPctEndBase, 1) + " pp)", cls: S.debtPctEnd > 60 ? "bad" : "good" },
    ];
    $("kpis").innerHTML = k.map((x) => '<div class="kpi ' + x.cls + '"><div class="l">' + x.l + '</div><div class="v">' + x.v + '</div><div class="s">' + x.s + "</div></div>").join("");
  }

  function renderStory(S) {
    const p = params;
    if (p.shock === 0) { $("story").textContent = "Brak szoku – gospodarka podąża ścieżką bazową. Zwiększ „Wzrost bezrobocia”, by zobaczyć skutki."; return; }
    let t = "Bezrobocie rośnie z " + fmt(p.u0, 1) + "% do " + fmt(S.peakU, 1) + "%. W tym czasie PKB traci łącznie " + fmt(S.lossGDP, 0) + " mld zł, " +
      "budżet traci " + fmt(S.lossRev, 0) + " mld zł dochodów i wydaje " + fmt(S.extraBen, 0) + " mld zł więcej na zasiłki, " +
      "a dodatkowe odsetki to " + fmt(S.extraInt, 0) + " mld zł. Dług na koniec jest o " + fmt(S.extraDebt, 0) + " mld zł wyższy niż bez szoku.";
    if (S.unatEnd - p.u0 > 0.3) t += " Histereza podnosi trwale stopę naturalną o " + fmt(S.unatEnd - p.u0, 1) + " pp.";
    $("story").textContent = t;
  }

  function renderBridge(sc, base, S) {
    const sum = (a, f) => a.reduce((s, x, i) => s + (i ? f(x) : 0), 0) / 4;
    const items = [
      ["Utracony PIT", sum(base, (x) => x.rev.pit) - sum(sc, (x) => x.rev.pit)],
      ["Utracone składki", sum(base, (x) => x.rev.contrib) - sum(sc, (x) => x.rev.contrib)],
      ["Utracony VAT", sum(base, (x) => x.rev.vat) - sum(sc, (x) => x.rev.vat)],
      ["Utracony CIT", sum(base, (x) => x.rev.cit) - sum(sc, (x) => x.rev.cit)],
      ["Pozostałe dochody", sum(base, (x) => x.rev.other) - sum(sc, (x) => x.rev.other)],
      ["Zasiłki dla bezrobotnych", sum(sc, (x) => x.exp.benefits) - sum(base, (x) => x.exp.benefits)],
      ["Aktywizacja i stymulus", sum(sc, (x) => x.exp.almp + x.exp.stimulus)],
      ["Wyższe odsetki", sum(sc, (x) => x.exp.interest) - sum(base, (x) => x.exp.interest)],
    ];
    const total = items.reduce((s, i) => s + i[1], 0);
    const mx = Math.max.apply(null, items.map((i) => Math.abs(i[1])).concat([1]));
    const neg = items.some((i) => i[1] < -0.5);
    const zero = neg ? 50 : 0, scale = neg ? 50 : 100;
    let h = items.map((i) => {
      const w = Math.abs(i[1]) / mx * scale * 0.98, left = i[1] >= 0 ? zero : zero - w;
      return '<div class="bridge-row"><span>' + i[0] + '</span><div class="bar"><span style="left:' + left + "%;width:" + w + "%;background:var(" + (i[1] >= 0 ? "--c1" : "--c4") + ')"></span></div><span class="val">' + signed(i[1], 0) + "</span></div>";
    }).join("");
    h += '<div class="bridge-row total"><span>Dodatkowy dług</span><span></span><span class="val">' + signed(total, 0) + "</span></div>";
    $("bridge").innerHTML = h;
  }

  function renderTable(sc) {
    const cols = [["Kw.", (x) => x.t, 0], ["Bezrob. %", (x) => x.u, 1], ["PKB", (x) => x.Y, 0], ["Konsumpcja", (x) => x.cons, 0],
      ["Dochody", (x) => x.revenue, 0], ["Wydatki", (x) => x.spending, 0], ["Deficyt % PKB", (x) => x.deficitPct, 2],
      ["Dług % PKB", (x) => x.debtPct, 1], ["Inflacja %", (x) => x.infl, 2], ["Odsetki %", (x) => x.r, 2]];
    $("table").innerHTML = "<thead><tr>" + cols.map((c) => "<th>" + c[0] + "</th>").join("") + "</tr></thead><tbody>" +
      sc.map((x) => "<tr>" + cols.map((c) => "<td>" + fmt(c[1](x), c[2]) + "</td>").join("") + "</tr>").join("") + "</tbody>";
  }

  buildControls();
  buildCharts();
  syncInputs();
  render();
})();
