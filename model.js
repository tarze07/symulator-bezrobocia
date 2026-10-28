/* Model symulacyjny: wpływ wzrostu bezrobocia na gospodarkę i finanse publiczne.
 * Model kwartalny, ceny stałe, kwoty w mld PLN. Uproszczony – cel edukacyjny.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EconModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const DEFAULTS = {
    // --- gospodarka (stan wyjściowy) ---
    labor: 17.5,        // siła robocza, mln osób
    u0: 5.0,            // bezrobocie wyjściowe = naturalne, %
    gdp: 3800,          // potencjalny PKB, mld PLN rocznie
    wage: 8500,         // przeciętne wynagrodzenie brutto, PLN / mies.
    debt: 2200,         // dług sektora finansów publicznych, mld PLN
    infl0: 3.0,         // inflacja bazowa, %
    // --- szok na rynku pracy ---
    shock: 5.0,         // wzrost bezrobocia, pp
    duration: 10,       // czas trwania szoku, kwartały
    horizon: 24,        // horyzont symulacji, kwartały
    // --- parametry strukturalne ---
    growth: 3.0,        // realny wzrost potencjału PKB, % rocznie
    okun: 2.0,          // współczynnik Okuna: % PKB straconego na 1 pp bezrobocia
    hyst: 0.04,         // histereza: tempo wzrostu stopy naturalnej (udział luki / kwartał)
    phillips: 0.35,     // wrażliwość inflacji na lukę bezrobocia (pp / pp)
    mpc: 0.80,          // krańcowa skłonność do konsumpcji
    profitElast: 2.5,   // wrażliwość zysków firm na koniunkturę
    // --- podatki i składki ---
    pit: 9,             // efektywny PIT, % wynagrodzeń
    cEmp: 14,           // składki pracownika, % brutto
    cEr: 20,            // składki pracodawcy, % brutto
    vat: 11,            // efektywna stawka VAT, % konsumpcji
    cit: 19,            // CIT, % zysków
    // --- wydatki ---
    otherSpend: 38.0,   // pozostałe wydatki, % potencjalnego PKB
    benefit: 1800,      // zasiłek dla bezrobotnych, PLN / mies.
    coverage: 25,       // % bezrobotnych pobierających zasiłek
    // --- polityka ---
    stimulus: 0,        // stymulus fiskalny w czasie szoku, % PKB rocznie
    almp: 0,            // aktywizacja zawodowa, % PKB rocznie
    multiplier: 1.0,    // mnożnik fiskalny
    // --- rynek długu ---
    rate: 2.0,          // realne oprocentowanie długu, %
    premium: 6.0,       // premia za ryzyko: pp na każde 100% PKB ponad próg
    threshold: 55,      // próg zadłużenia, % PKB
  };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /** Zwraca tablicę kwartałów (t = 0 to stan wyjściowy). */
  function simulate(input, opts) {
    const p = Object.assign({}, DEFAULTS, input);
    const noShock = opts && opts.noShock;
    const n = Math.round(p.horizon);
    const out = [];

    // skuteczny szok: aktywizacja zmniejsza wzrost bezrobocia, stymulus obniża cel
    const almpEff = clamp(p.almp * 18, 0, 0.5);               // 1% PKB => -18% szoku (max 50%)
    const shockEff = noShock ? 0 : p.shock * (1 - almpEff);
    const stimEff = noShock ? 0 : p.stimulus / 100;           // ułamek PKB
    const stimUnemp = (p.multiplier * stimEff * 100 / p.okun); // pp zmniejszenia bezrobocia

    let u = p.u0, unat = p.u0, debt = p.debt, cumDef = 0;
    let prevInfl = p.infl0;

    for (let t = 0; t <= n; t++) {
      // 1. ścieżka bezrobocia: narastanie szybkie, powrót wolniejszy
      const inShock = t >= 1 && t <= p.duration;
      let target = p.u0 + (inShock ? Math.max(0, shockEff - stimUnemp) : 0);
      // histereza: po szoku stopa naturalna jest wyższa niż wyjściowa
      target = Math.max(target, unat);
      if (t > 0) {
        const speed = target > u ? 0.35 : 0.12;
        u = u + speed * (target - u);
      }
      if (t > 0) unat += p.hyst * Math.max(0, u - unat);       // histereza: stopa naturalna dryfuje w górę

      const pot = p.gdp * Math.pow(1 + p.growth / 100, t / 4);  // potencjalny PKB w kwartale t
      const sc = pot / p.gdp;                                      // skala (wzrost wydajności, płac, świadczeń)

      // 2. PKB wg prawa Okuna (+ efekt stymulusu)
      const gap = u - unat;                          // luka względem (zhisterezowanej) stopy naturalnej
      const stimGDP = inShock ? p.multiplier * stimEff : 0;
      const gdpGapPct = -p.okun * (u - p.u0) + stimGDP * 100; // % odchylenia od potencjału
      const Y = pot * (1 + gdpGapPct / 100);       // PKB roczny (annualizowany)
      const yRatio = Y / pot;

      // 3. rynek pracy
      const L = p.labor;
      const unemployed = L * u / 100;
      const employed = L - unemployed;
      const wageBill = employed * p.wage * sc * 12 / 1000;       // mld PLN rocznie

      // 4. dochody gospodarstw i konsumpcja
      const netLabor = wageBill * (1 - (p.pit + p.cEmp) / 100);
      const benefitsYr = unemployed * (p.coverage / 100) * p.benefit * sc * 12 / 1000;
      const otherIncome = 0.20 * Y;                          // kapitałowe, samozatrudnienie itd.
      const disp = netLabor + benefitsYr + otherIncome;
      const cons = p.mpc * disp;                             // konsumpcja prywatna

      // 5. rynek długu
      const debtRatio = debt / Y * 100;
      const r = p.rate + p.premium * Math.max(0, debtRatio - p.threshold) / 100;

      // 6. budżet (przepływy roczne, w kwartale dzielone przez 4)
      const profits = 0.15 * pot * Math.pow(yRatio, p.profitElast);
      const rev = {
        pit: wageBill * p.pit / 100,
        contrib: wageBill * (p.cEmp + p.cEr) / 100,
        vat: cons * p.vat / 100,
        cit: profits * p.cit / 100,
        other: 0.10 * Y,
      };
      const revenue = rev.pit + rev.contrib + rev.vat + rev.cit + rev.other;

      const exp = {
        base: p.otherSpend / 100 * pot,
        benefits: benefitsYr,
        almp: (noShock || !inShock) ? 0 : p.almp / 100 * pot,
        stimulus: inShock ? stimEff * pot : 0,
        interest: r / 100 * debt,
      };
      const spending = exp.base + exp.benefits + exp.almp + exp.stimulus + exp.interest;
      const deficit = spending - revenue;                     // roczny, mld PLN
      if (t > 0) { debt += deficit / 4; cumDef += deficit / 4; }

      // 7. inflacja (krzywa Phillipsa z lukami + inercja)
      const inflTarget = p.infl0 - p.phillips * gap;
      const infl = t === 0 ? p.infl0 : prevInfl + 0.4 * (inflTarget - prevInfl);
      prevInfl = infl;

      out.push({
        t, u, unat, unemployed, employed, wageBill, Y, gdpGapPct, cons, disp,
        benefits: benefitsYr, revenue, spending, deficit,
        deficitPct: deficit / Y * 100, debt, debtPct: debt / Y * 100,
        r, infl, cumDef, rev, exp,
      });
    }
    return out;
  }

  /** Podsumowanie scenariusza względem ścieżki bazowej. */
  function summarize(sc, base, p) {
    const q = (a, f) => a.reduce((s, x, i) => s + (i > 0 ? f(x) : 0), 0) / 4;
    const lossGDP = q(base, x => x.Y) - q(sc, x => x.Y);
    const lossRev = q(base, x => x.revenue) - q(sc, x => x.revenue);
    const extraBen = q(sc, x => x.benefits) - q(base, x => x.benefits);
    const extraInt = q(sc, x => x.exp.interest) - q(base, x => x.exp.interest);
    const last = sc[sc.length - 1], lastB = base[base.length - 1];
    const peak = (k) => sc.reduce((m, x) => Math.max(m, x[k]), -Infinity);
    return {
      peakU: peak("u"),
      peakDefPct: peak("deficitPct"),
      lossGDP, lossGDPpct: lossGDP / (base[0].Y * (sc.length - 1) / 4) * 100,
      lossRev, extraBen, extraInt,
      extraDebt: last.debt - lastB.debt,
      debtPctEnd: last.debtPct, debtPctEndBase: lastB.debtPct,
      consDropPct: Math.max.apply(null, sc.map((x, i) => (1 - x.cons / base[i].cons) * 100)),
      jobsLostPeak: Math.max.apply(null, sc.map((x, i) => base[i].employed - x.employed)),
      unatEnd: last.unat,
    };
  }

  return { DEFAULTS, simulate, summarize };
});
