import { iconHref, iconMarkup } from "../../design/icons";
import { readStudySound, saveStudySound } from "../soundSettings";
import katex from "katex";
import "katex/dist/katex.min.css";

export default function mountMath(runtime) {
  const { document, window, matchMedia, ResizeObserver, MutationObserver } = runtime;
  const { location, addEventListener } = runtime;
  const globalThis = { katex, crypto: window.crypto };
  let recordTools;
  let ForgePreferences, MathForge, ForgeNotation, ForgeTopics, ForgeAnswerPaths, ForgeExpressionCompiler, ForgePlaneCompositions, ForgeTypeFamilies, ForgeVariations, ForgeLineCompiler, ForgePlaneConceptCompiler, ForgeChallengeRelations, ForgeGeometryEquations, ForgeChallengeGeometry, ForgeChallengeValidation, ForgeProblemProse, ForgeRelationSearch, ForgeChallengeCompiler, ForgeLogicCompiler, ForgeFunctionCurriculum, ForgeFunctionRelations, ForgeFunctionBounds, ForgeFunctionSymbolic, ForgeFunctionSynthesis, ForgeFunctionIntervalSynthesis, ForgeFunctionRelationPractice, ForgePieceFunctionSynthesis, ForgeFiniteFunctionSynthesis, ForgeAlgebraSynthesis, ForgeFunctionCompiler, ForgeCatalog, ForgeCurriculum, ForgeLearning, ForgeBackup, ForgeRecommendations, ForgeMathView, ForgeScratchpad, ForgeInspection;
/* preferences.js */
(() => {
  "use strict";

  const soundKey = "math-forge:sound";
  const volumeKey = "math-forge:volume";
  let plus = true;
  try { plus = window.studyBridge.local.getItem("math-forge:plus") !== "off"; } catch {}
  let sound = true;
  let volumeLevel = 0.7;
  let context;
  let notes = [];

  try {
    sound = window.studyBridge.local.getItem(soundKey) !== "off";
    const storedVolume = window.studyBridge.local.getItem(volumeKey);
    if (storedVolume !== null && Number.isFinite(Number(storedVolume))) volumeLevel = Math.max(0,Math.min(1,Number(storedVolume)));
  } catch { /* Preferences can still be changed for the current page. */ }

  const sharedSound = readStudySound({ enabled: sound, volume: volumeLevel * 100 });
  sound = sharedSound.enabled;
  volumeLevel = sharedSound.volume / 100;

  function store(key, value) {
    try { window.studyBridge.local.setItem(key, value); } catch { /* Keep the current choice. */ }
  }

  function stopAudio() {
    for (const voice of notes) {
      voice.gain.disconnect();
      voice.oscillator.stop();
    }
    notes = [];
  }

  const tones = {
    tap:[[365,0,.052,.048]],
    correct:[[523.25,0,.13,.085],[783.99,.085,.18,.075]],
    wrong:[[392,0,.14,.075],[293.66,.085,.15,.068]],
  };

  function play(name) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!sound || !Audio || volumeLevel === 0) return;
    try {
      context ||= new Audio();
      if (context.state !== "running") context.resume().catch(() => {});
      stopAudio();
      const start = context.currentTime + .008;
      for (const [frequency,delay,duration,volume] of tones[name]) {
        const at = start + delay;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001,at);
        gain.gain.exponentialRampToValueAtTime(volume * volumeLevel,at+.009);
        gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
        oscillator.connect(gain).connect(context.destination);
        const voice = {oscillator,gain};
        notes.push(voice);
        oscillator.onended = () => { gain.disconnect(); notes = notes.filter(item => item !== voice); };
        oscillator.start(at);
        oscillator.stop(at+duration+.012);
      }
    } catch { /* A browser with audio disabled still supports practice. */ }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const dialog = document.getElementById("preferences-dialog");
    const soundInput = document.getElementById("sound-enabled");
    const plusInput=document.getElementById("plus-enabled");
    plusInput.checked=plus;
    plusInput.addEventListener("change",()=>{plus=plusInput.checked;store("math-forge:plus",plus?"on":"off");document.dispatchEvent(new Event("forge-pluschange"));});
    const volumeInput = document.getElementById("sound-volume");
    const volumeValue = document.getElementById("sound-volume-value");
    volumeInput.value = String(Math.round(volumeLevel * 100));
    volumeValue.value = volumeInput.value + "%";
    volumeInput.dispatchEvent(new Event("input"));
    volumeInput.addEventListener("input", () => {
      volumeLevel = Number(volumeInput.value) / 100;
      volumeValue.value = volumeInput.value + "%";
      saveStudySound({ enabled: sound, volume: volumeLevel * 100 });
      if (volumeLevel === 0) stopAudio();
    });
    volumeInput.addEventListener("change", () => play("tap"));
    for (const button of document.querySelectorAll("[data-open-preferences]")) {
      button.addEventListener("click", () => {
        dialog.querySelector(`input[name="theme"][value="${runtime.getTheme()}"]`).checked = true;
        soundInput.checked = sound;
        dialog.showModal();
        dialog.scrollTop = 0;
        dialog.querySelector('.settings-units [aria-selected="true"]')?.focus();
      });
    }
    document.addEventListener("change", event => {
      const input = event.target;
      if (input.name === "theme") runtime.setTheme(input.value);
      if (input === soundInput) {
        sound = input.checked;
        saveStudySound({ enabled: sound, volume: volumeLevel * 100 });
        if (!sound) stopAudio();
      }
      if (input.matches("input[type=radio], input[type=checkbox], #course-select")) play("tap");
    });
    document.addEventListener("click", event => {
      const button = event.target.closest("button, nav a, .exit-button, summary");
      if (button && !button.disabled && button.id !== "check-answer") play("tap");
    });
  });
  ForgePreferences = globalThis.ForgePreferences = Object.freeze({play,plusEnabled:()=>plus});
})();


;

/* engine.js */
(() => {
  "use strict";

  const TYPES = Object.freeze({
    remainder: { label: "나머지정리", icon: "polynomial" },
    intersection: { label: "함수의 교점", icon: "points" },
    inequality: { label: "이차부등식", icon: "interval" },
  });
  const LEVELS = Object.freeze({ A: "기본", B: "응용" });
  const resultTypes = {
    Polynomial: { label: "다항식", capabilities: ["evaluate", "coefficient"], degreeRange: [0, 1] },
    PointSet: { label: "교점 집합", capabilities: ["count", "coordinate", "distance"], cardinalityRange: [0, 2] },
    IntervalSet: { label: "구간 집합", capabilities: ["interval", "boundedIntegerCount"], cardinalityRange: [1, 2] },
  };
  const templates = {
    remainder: {
      label: "다항식과 일차·이차 제수", resultType: "Polynomial",
      relation: "P = DQ + R", invariant: "제수보다 나머지의 차수가 낮음",
      allowedActions: [],
    },
    intersection: {
      label: "포물선과 직선", resultType: "PointSet",
      relation: "f(x) = g(x)", invariant: "f는 이차함수, g는 일차식",
      allowedActions: [],
    },
    inequality: {
      label: "두 식의 대소 관계", resultType: "IntervalSet",
      relation: "L(x) ≶ R(x)", invariant: "양변의 차가 이차식",
      allowedActions: ["addCommonLinear"],
    },
  };
  const paths = {
    remainder: [
      { id: "constant", level: "A", capability: "coefficient", label: "상수항", output: "scalar", constraints: { divisorDegree: 1 }, rule: "나머지는 작은 양의 정수", resolve: r => r[0] },
      { id: "evaluate", level: "B", capability: "evaluate", label: "특정 입력 → 함숫값", output: "scalar", constraints: { divisorDegree: 2 }, rule: "서로 다른 두 조건 · 함숫값은 작은 양의 정수", resolve: (r, p) => r[0] + r[1] * p.target },
      { id: "linear", level: "B", capability: "coefficient", label: "일차항 → 계수", output: "scalar", constraints: { divisorDegree: 2 }, rule: "서로 다른 두 조건 · 일차항의 계수는 작은 양의 정수", resolve: r => r[1] },
      { id: "intercept", level: "B", capability: "coefficient", label: "상수항 → 계수", output: "scalar", constraints: { divisorDegree: 2 }, rule: "서로 다른 두 조건 · 상수항은 작은 양의 정수", resolve: r => r[0] },
    ],
    intersection: [
      { id: "count", level: "A", capability: "count", label: "서로 다른 점 → 개수", output: "scalar", constraints: {}, rule: "교점의 개수는 0, 1, 2 중 하나", resolve: r => r.length },
      { id: "sum", level: "B", capability: "coordinate", label: "두 점 → x좌표 → 합", output: "scalar", constraints: { cardinality: 2 }, rule: "서로 다른 두 교점 · x좌표의 합은 작은 양의 정수", resolve: r => r[0].x + r[1].x },
      { id: "positiveY", level: "B", capability: "coordinate", label: "x > 0인 점 선택 → y좌표", output: "scalar", constraints: { cardinality: 2 }, rule: "x좌표가 양수인 교점은 하나 · 그 y좌표는 작은 양의 정수", resolve: r => r.find(point => point.x > 0).y },
      { id: "distance", level: "B", capability: "distance", label: "두 점 → 거리", output: "scalar", constraints: { cardinality: 2 }, rule: "서로 다른 두 교점 · 거리는 작은 양의 정수", resolve: r => Math.hypot(r[1].x - r[0].x, r[1].y - r[0].y) },
    ],
    inequality: [
      { id: "direct", level: "A", capability: "interval", label: "실수 해 → 구간", output: "interval", constraints: { layout: "direct" }, rule: "경계는 서로 다른 두 정수", resolve: r => r },
      { id: "compare", level: "B", capability: "interval", label: "실수 해 → 구간", output: "interval", constraints: { layout: "twoSides" }, rule: "양변에 x가 있음 · 경계는 서로 다른 두 정수", resolve: r => r },
      { id: "integerCount", level: "B", capability: "boundedIntegerCount", label: "유한 범위 → 정수 선택 → 개수", output: "scalar", constraints: { layout: "twoSides", bounded: true }, rule: "범위가 주어짐 · 정수 해의 개수는 작은 양의 정수", resolve: (r, p) => integerSolutions(r, p.bound).length },
    ],
  };

  const integer = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const choose = (rng, items) => items[integer(rng, 0, items.length - 1)];
  const nonzero = (rng, max) => choose(rng, [-1, 1]) * integer(rng, 1, max);
  const isOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  const displayNumber = n => String(n).replaceAll("-", "−");
  const wrapNumber = n => n < 0 ? `(${displayNumber(n)})` : displayNumber(n);
  const factor = root => root === 0 ? "x" : `(x ${root < 0 ? "+" : "−"} ${Math.abs(root)})`;
  const powerLabels = ["", "x", "x²", "x³"];
  const gcdNumber = (a, b) => b ? gcdNumber(b, a % b) : a;
  function polynomial(coefficients, denominator = 1) {
    const terms = [];
    for (let power = coefficients.length - 1; power >= 0; power--) {
      const c = coefficients[power];
      if (!c) continue;
      const g = gcdNumber(Math.abs(c), denominator);
      const n = Math.abs(c) / g;
      const d = denominator / g;
      const magnitude = d !== 1 ? `${n}/${d}` : (n === 1 && power > 0 ? "" : String(n));
      const term = magnitude + powerLabels[power];
      terms.push(terms.length ? ` ${c < 0 ? "−" : "+"} ${term}` : `${c < 0 ? "−" : ""}${term}`);
    }
    return terms.join("") || "0";
  }

  function chooseAnswer(type, resultType, level, rng, avoidPath, pathId) {
    const available = paths[type].filter(path => path.level === level && resultType.capabilities.includes(path.capability));
    if (pathId) {
      const path = available.find(option => option.id === pathId);
      if (!path) throw new RangeError("Unknown answer path");
      return path;
    }
    const fresh = available.filter(path => path.id !== avoidPath);
    return choose(rng, fresh.length ? fresh : available);
  }

  function selectConstraints(path, rng) {
    const constraints = { ...path.constraints };
    if (path.id === "count") constraints.cardinality = integer(rng, 0, 2);
    return constraints;
  }

  function remainder(path, c, rng) {
    if (c.divisorDegree === 1) {
      const a = nonzero(rng, 4);
      const value = integer(rng, 1, 9);
      const [q0, q1, q2] = [integer(rng, -3, 3), integer(rng, -3, 3), integer(rng, 1, 2)];
      const p = [value - a * q0, q0 - a * q1, q1 - a * q2, q2];
      return {
        intro: "다항식 P(x)가 다음과 같다.",
        expressions: [`P(x) = ${polynomial(p)}`],
        question: `P(x)를 ${factor(a).slice(1, -1)}로 나눈 나머지를 구하시오.`,
        parameters: { root: a, coefficients: p },
        result: [value],
        solution: [
          `제수 ${factor(a).slice(1, -1)}의 근은 ${displayNumber(a)}이다. 나머지정리에 따라 나머지는 P(${displayNumber(a)})이다.`,
          `P(${displayNumber(a)}) = ${displayNumber(p[3])} × ${wrapNumber(a)}³ + ${wrapNumber(p[2])} × ${wrapNumber(a)}² + ${wrapNumber(p[1])} × ${wrapNumber(a)} + ${wrapNumber(p[0])} = ${value}.`,
        ],
      };
    }
    const a = -integer(rng, 1, 4);
    const b = integer(rng, 1, 5);
    const target = choose(rng, [a - 1, b + 1]);
    const slope = integer(rng, 1, 3);
    const desiredValue = integer(rng, 3, 12);
    const intercept = path.id === "evaluate" ? desiredValue - slope * target : integer(rng, 1, 9);
    const fa = slope * a + intercept;
    const fb = slope * b + intercept;
    const ask = {
      evaluate: `R(${displayNumber(target)})의 값을`,
      linear: "R(x)의 일차항 계수를",
      intercept: "R(x)의 상수항을",
    }[path.id];
    const finish = {
      evaluate: `따라서 R(${displayNumber(target)}) = ${slope} × ${wrapNumber(target)} + ${wrapNumber(intercept)} = ${desiredValue}.`,
      linear: `따라서 R(x)의 일차항 계수는 ${slope}이다.`,
      intercept: `따라서 R(x)의 상수항은 ${intercept}이다.`,
    }[path.id];
    return {
      intro: "다항식 P(x)가 다음 조건을 만족한다.",
      expressions: [`P(${displayNumber(a)}) = ${displayNumber(fa)},   P(${b}) = ${displayNumber(fb)}`],
      question: `P(x)를 ${factor(a)}${factor(b)}로 나눈 나머지를 R(x)라 할 때, ${ask} 구하시오.`,
      parameters: { roots: [a, b], values: [fa, fb], target },
      result: [intercept, slope],
      solution: [
        "제수가 이차식이므로 나머지는 R(x) = ux + v로 둘 수 있다.",
        `P(x) = ${factor(a)}${factor(b)}Q(x) + R(x)에 각 근을 대입하면 R(${displayNumber(a)}) = ${displayNumber(fa)}, R(${b}) = ${displayNumber(fb)}이다.`,
        `두 식의 차를 이용하면 u = (${displayNumber(fb)} − ${wrapNumber(fa)})/(${b} − ${wrapNumber(a)}) = ${slope}이다. R(${b})에 대입하면 v = ${displayNumber(intercept)}이므로 R(x) = ${polynomial([intercept, slope])}이다.`,
        finish,
      ],
    };
  }

  function intersection(path, c, rng) {
    let roots;
    let denominator = 1;
    let m = nonzero(rng, 3);
    let n = nonzero(rng, 4);
    let difference;
    const a = choose(rng, [1, 1, 2, -1]);
    if (path.id === "count") {
      const center = integer(rng, -4, 4);
      const gap = integer(rng, 1, 4);
      roots = [[], [center], [center - gap, center + gap]][c.cardinality];
      const extra = [integer(rng, 1, 5), 0, -(gap ** 2)][c.cardinality];
      difference = [a * (center ** 2 + extra), -2 * a * center, a];
    } else {
      const left = -integer(rng, 1, 4);
      if (path.id === "distance") {
        denominator = 4;
        m = 3 * choose(rng, [-1, 1]);
        n *= denominator;
        roots = [left, left + 4 * integer(rng, 1, 3)];
      } else if (path.id === "sum") {
        roots = [left, integer(rng, 1, 8) - left];
      } else {
        roots = [left, integer(rng, 1, 5)];
        n = integer(rng, 2, 12) - m * roots[1];
      }
      difference = [a * roots[0] * roots[1], -a * (roots[0] + roots[1]), a];
    }
    const f = [denominator * difference[0] + n, denominator * difference[1] + m, denominator * difference[2]];
    const points = roots.map(x => ({ x, y: (m * x + n) / denominator }));
    const question = {
      count: "두 그래프의 서로 다른 교점의 개수를 구하시오.",
      sum: "두 교점의 x좌표의 합을 구하시오.",
      positiveY: "x좌표가 양수인 교점의 y좌표를 구하시오.",
      distance: "두 교점 사이의 거리를 구하시오.",
    }[path.id];
    const solution = [`두 식을 같게 놓고 정리하면 ${polynomial(difference)} = 0이다.`];
    if (path.id === "count") {
      const [constant, linear, quadratic] = difference;
      const discriminant = linear ** 2 - 4 * quadratic * constant;
      const description = ["실근이 없다", "중근 하나를 갖는다", "서로 다른 두 실근을 갖는다"][points.length];
      solution.push(`판별식은 ${wrapNumber(linear)}² − 4 × ${wrapNumber(quadratic)} × ${wrapNumber(constant)} = ${displayNumber(discriminant)}이다.`);
      solution.push(`방정식이 ${description}. 따라서 서로 다른 교점은 ${points.length}개이다.`);
    } else if (path.id === "sum") {
      solution.push(`근과 계수의 관계에 따라 두 x좌표의 합은 −${wrapNumber(difference[1])}/${wrapNumber(a)} = ${roots[0] + roots[1]}이다.`);
    } else {
      solution.push(`좌변을 인수분해하면 ${a === 1 ? "" : a === -1 ? "−" : a}${factor(roots[0])}${factor(roots[1])}이다. 따라서 x좌표는 ${displayNumber(roots[0])}, ${displayNumber(roots[1])}이다.`);
      if (path.id === "positiveY") {
        solution.push(`양수인 x좌표 ${roots[1]}을 g(x)에 대입하면 y = ${points[1].y}이다.`);
      } else {
        const dx = roots[1] - roots[0];
        const dy = Math.abs(m * dx / denominator);
        solution.push(`x좌표 차의 절댓값은 ${dx}, 직선의 기울기에서 구한 y좌표 차의 절댓값은 ${dy}이다.`);
        solution.push(`따라서 두 점 사이의 거리는 √(${dx}² + ${dy}²) = ${Math.hypot(dx, dy)}이다.`);
      }
    }
    return {
      intro: "두 함수의 그래프를 생각하자.",
      expressions: [`f(x) = ${polynomial(f, denominator)}`, `g(x) = ${polynomial([n, m], denominator)}`],
      question,
      parameters: { f, g: [n, m], denominator },
      result: points,
      solution,
    };
  }

  function intervalText(intervals) {
    if (!intervals.length) return "∅";
    return intervals.map(({ start, end, startClosed, endClosed }) => {
      if (start === null && end === null) return "모든 실수";
      if (start === null) return `x ${endClosed ? "≤" : "<"} ${displayNumber(end)}`;
      if (end === null) return `x ${startClosed ? "≥" : ">"} ${displayNumber(start)}`;
      return `${displayNumber(start)} ${startClosed ? "≤" : "<"} x ${endClosed ? "≤" : "<"} ${displayNumber(end)}`;
    }).join(" 또는 ");
  }

  function integerSolutions(intervals, bound) {
    const values = [];
    for (let x = bound[0]; x <= bound[1]; x++) {
      const matches = intervals.some(i =>
        (i.start === null || x > i.start || (x === i.start && i.startClosed)) &&
        (i.end === null || x < i.end || (x === i.end && i.endClosed)));
      if (matches) values.push(x);
    }
    return values;
  }

  const actions = {
    addCommonLinear: {
      label: "양변에 같은 일차식 더하기",
      apply(left, right, rng) {
        const common = [nonzero(rng, 4), nonzero(rng, 3)];
        return [left.map((coefficient, i) => coefficient + (common[i] || 0)), right.map((coefficient, i) => coefficient + (common[i] || 0))];
      },
    },
  };

  function inequality(path, c, rng, template) {
    const a = c.layout === "direct" ? choose(rng, [1, 1, 2]) : nonzero(rng, 2);
    const low = integer(rng, -5, 2);
    const high = low + integer(rng, 2, 6);
    const closed = rng() < .5;
    const inside = rng() < .5;
    const less = inside === (a > 0);
    const sign = less ? (closed ? "≤" : "<") : (closed ? "≥" : ">");
    const difference = [a * low * high, -a * (low + high), a];
    const result = inside
      ? [{ start: low, end: high, startClosed: closed, endClosed: closed }]
      : [{ start: null, end: low, startClosed: false, endClosed: closed }, { start: high, end: null, startClosed: closed, endClosed: false }];
    let left = difference;
    let right = [0, 0];
    const actionHistory = [];
    if (c.layout === "twoSides" && template.allowedActions.includes("addCommonLinear")) {
      const action = actions.addCommonLinear;
      [left, right] = action.apply(left, right, rng);
      actionHistory.push(action.label);
    }
    const bound = c.bounded ? [low - integer(rng, 1, 3), high + integer(rng, 1, 3)] : null;
    const boundText = bound ? `${displayNumber(bound[0])} ≤ x ≤ ${displayNumber(bound[1])}` : null;
    const solution = [];
    if (actionHistory.length) solution.push(`우변을 좌변으로 옮기면 ${polynomial(difference)} ${sign} 0이다.`);
    const signWord = a > 0 ? "양수" : "음수";
    solution.push(`좌변을 인수분해하면 ${a === 1 ? "" : a === -1 ? "−" : a}${factor(low)}${factor(high)}이다. 경계는 ${displayNumber(low)}, ${displayNumber(high)}이다.`);
    solution.push(`최고차항의 계수가 ${signWord}이므로 두 근 사이에서 이차식의 부호는 ${a > 0 ? "음수" : "양수"}이고, 두 근 바깥에서는 반대이다.`);
    solution.push(`조건을 만족하는 구간은 ${intervalText(result)}이다. 경계값은 ${closed ? "포함한다" : "제외한다"}.`);
    if (bound) {
      const values = integerSolutions(result, bound);
      solution.push(`${boundText}에서 이 구간에 속하는 정수는 ${values.map(displayNumber).join(", ")}로, 모두 ${values.length}개이다.`);
    }
    return {
      intro: "다음 이차부등식을 생각하자.",
      expressions: [`${polynomial(left)} ${sign} ${polynomial(right)}`],
      question: bound
        ? `${boundText}인 범위에서 부등식을 만족하는 정수 x의 개수를 구하시오.`
        : "부등식의 실수 해를 부등식으로 나타내시오.",
      parameters: { left, right, sign, bound },
      result,
      solution,
      actionHistory,
    };
  }

  const constructors = { remainder, intersection, inequality };

  function generate(type, level, { rng = Math.random, avoidPath, pathId } = {}) {
    if (!isOwn(TYPES, type) || !isOwn(LEVELS, level)) throw new RangeError("Unknown problem settings");
    const template = templates[type];
    const resultType = resultTypes[template.resultType];
    const path = chooseAnswer(type, resultType, level, rng, avoidPath, pathId);
    const constraints = selectConstraints(path, rng);
    const concrete = constructors[type](path, constraints, rng, template);
    const value = path.resolve(concrete.result, concrete.parameters);
    return {
      type, level,
      template: template.label,
      relation: template.relation,
      invariant: template.invariant,
      resultType: resultType.label,
      answerPath: { id: path.id, label: path.label },
      answerConstraints: path.rule,
      constraints,
      ...concrete,
      actionHistory: concrete.actionHistory || [],
      answer: { kind: path.output, value, text: path.output === "interval" ? intervalText(value) : displayNumber(value) },
    };
  }

  const normalize = text => text.normalize("NFKC").replace(/[−–—]/gu, "-").trim();
  const gcd = (a, b) => b === 0n ? a : gcd(b, a % b);
  function rational(input) {
    const s = normalize(input);
    if (s.length > 120) return null;
    const fraction = s.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/u);
    const decimal = s.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/u);
    let numerator;
    let denominator;
    if (fraction) {
      numerator = BigInt(fraction[1]);
      denominator = BigInt(fraction[2]);
      if (denominator === 0n) return null;
    } else if (decimal) {
      const tail = decimal[3] ?? decimal[4] ?? "";
      numerator = BigInt(`${decimal[1]}${decimal[2] || "0"}${tail}`);
      denominator = 10n ** BigInt(tail.length);
    } else {
      return null;
    }
    if (denominator < 0n) {
      numerator = -numerator;
      denominator = -denominator;
    }
    const divisor = gcd(numerator < 0n ? -numerator : numerator, denominator);
    return { n: numerator / divisor, d: denominator / divisor };
  }

  function compare(a, b) {
    if (a === b) return 0;
    if (a === -Infinity || b === Infinity) return -1;
    if (a === Infinity || b === -Infinity) return 1;
    const delta = a.n * b.d - b.n * a.d;
    return delta === 0n ? 0 : delta < 0n ? -1 : 1;
  }

  function endpoint(input) {
    const match = input.trim().match(/^([+-]?)(?:∞|inf(?:inity)?)$/iu);
    if (match) return match[1] === "-" ? -Infinity : Infinity;
    return rational(input);
  }

  function parseIntervals(input) {
    const s = normalize(input);
    if (/^(?:∅|공집합)$/u.test(s)) return [];
    if (/^(?:모든\s*실수|실수\s*전체|R|ℝ)$/u.test(s)) return [{start:-Infinity,end:Infinity,startClosed:false,endClosed:false}];
    const pieces = s.split(/∪|[uU](?![a-zA-Z])|또는/u);
    const intervals = [];
    for (const piece of pieces) {
      let text = piece.trim().replace(/\s+/g, "").replace(/≤/g,"<=").replace(/≥/g,">=");
      text = text.replace(/^\{[a-zA-Z]\|(.+)\}$/, "$1");
      const number = "[+-]?\\d+(?:\\/\\d+|\\.\\d+)?";
      let inequality = text.match(new RegExp(`^(${number})(<=|<)([a-zA-Z])(<=|<)(${number})$`));
      if (inequality) text = `${inequality[2] === "<=" ? "[" : "("}${inequality[1]},${inequality[5]}${inequality[4] === "<=" ? "]" : ")"}`;
      else if ((inequality = text.match(new RegExp(`^([a-zA-Z])(<=|<|>=|>|!=|≠)(${number})$`)))) {
        const op=inequality[2], n=inequality[3];
        if (op === "!=" || op === "≠") {
          const left = rational(n); if (!left) return null;
          intervals.push({start:-Infinity,end:left,startClosed:false,endClosed:false},{start:left,end:Infinity,startClosed:false,endClosed:false});
          continue;
        }
        text = op[0] === "<" ? `(-inf,${n}${op === "<=" ? "]" : ")"}` : `${op === ">=" ? "[" : "("}${n},inf)`;
      } else if ((inequality = text.match(new RegExp(`^(${number})(<=|<|>=|>)([a-zA-Z])$`)))) {
        const op=inequality[2], n=inequality[1];
        text = op[0] === "<" ? `${op === "<=" ? "[" : "("}${n},inf)` : `(-inf,${n}${op === ">=" ? "]" : ")"}`;
      }
      const match = text.match(/^(\[|\()\s*([^,]+)\s*,\s*([^,]+)\s*(\]|\))$/u);
      if (!match) return null;
      const start = endpoint(match[2]);
      const end = endpoint(match[3]);
      const startClosed = match[1] === "[";
      const endClosed = match[4] === "]";
      if (start === null || end === null || start === Infinity || end === -Infinity) return null;
      if ((start === -Infinity && startClosed) || (end === Infinity && endClosed)) return null;
      const ordering = compare(start, end);
      if (ordering > 0) return null;
      if (ordering < 0 || (startClosed && endClosed)) intervals.push({ start, end, startClosed, endClosed });
    }
    intervals.sort((a, b) => compare(a.start, b.start) || Number(b.startClosed) - Number(a.startClosed));
    const merged = [];
    for (const next of intervals) {
      const last = merged.at(-1);
      const boundary = last ? compare(last.end, next.start) : -1;
      if (!last || boundary < 0 || (boundary === 0 && !last.endClosed && !next.startClosed)) {
        merged.push(next);
        continue;
      }
      const ending = compare(last.end, next.end);
      if (ending < 0) {
        last.end = next.end;
        last.endClosed = next.endClosed;
      } else if (ending === 0) {
        last.endClosed ||= next.endClosed;
      }
    }
    return merged;
  }

  function grade(input, answer) {
    if (typeof input !== "string" || !input.trim() || input.length > 120) return { valid: false };
    if (answer.kind === "scalar") {
      const parsed = rational(input);
      return parsed ? { valid: true, correct: compare(parsed, rational(String(answer.value))) === 0 } : { valid: false };
    }
    const parsed = parseIntervals(input);
    if (!parsed) return { valid: false };
    const expected = answer.value;
    const correct = parsed.length === expected.length && expected.every((interval, i) => {
      const candidate = parsed[i];
      return compare(candidate.start, interval.start === null ? -Infinity : rational(String(interval.start))) === 0
        && compare(candidate.end, interval.end === null ? Infinity : rational(String(interval.end))) === 0
        && candidate.startClosed === interval.startClosed
        && candidate.endClosed === interval.endClosed;
    });
    return { valid: true, correct };
  }

  MathForge = globalThis.MathForge = Object.freeze({ TYPES, LEVELS, generate, grade });
})();


;

/* notation.js */
(() => {
  'use strict';
  // 집합의 괄호는 구문 구조를 읽어 정리한다. 연산의 묶음은 보존한다.
  function parseSet(source) {
    const tokens=source.match(/\\(?:cup|cap|setminus)\b|\^\{?c\}?|[A-Z]|[()\-]/g)||[];
    const residue=source.replace(/\\(?:cup|cap|setminus)\b|\^\{?c\}?|[A-Z]|[()\-]|\s/g,'');
    if(residue||!tokens.length)return null;
    let at=0;
    function atom(){
      let node,token=tokens[at++];
      if(token==='('){node={op:'group',a:expression()};if(tokens[at++]!==')')throw Error('group');}
      else if(/^[A-Z]$/.test(token||''))node={op:'atom',name:token};else throw Error('atom');
      while(/^\^/.test(tokens[at]||'')){at++;node={op:'complement',a:node};}
      return node;
    }
    function expression(){let node=atom();while(['\\cup','\\cap','\\setminus','-'].includes(tokens[at])){const op=tokens[at++];node={op:op==='\\setminus'?'-':op,a:node,b:atom()};}return node;}
    try{const node=expression();return at===tokens.length?node:null;}catch{return null;}
  }
  function renderSet(node,outer=false,keepOuter=false){
    if(node.op==='atom')return node.name;
    if(node.op==='group'){
      let inner=node.a;while(inner.op==='group')inner=inner.a;
      const content=renderSet(inner);
      return (outer&&!keepOuter)||inner.op==='atom'||inner.op==='complement'?' '+content+' ':'('+content+')';
    }
    if(node.op==='complement')return renderSet(node.a,false)+ '^c';
    return renderSet(node.a)+(node.op==='-'?'-':node.op+' ')+renderSet(node.b);
  }
  function compactSets(source){
    return source.replace(/(?:\\(?:cup|cap|setminus)\b|\^\{?c\}?|[A-Z()\-]|\s)+/g,(part,offset)=>{
      if(!/\\(?:cup|cap|setminus)\b|\([A-Z]\)|\(\(/.test(part))return part;
      const tree=parseSet(part);if(!tree)return part;
      const keepOuter=/[a-z]$/.test(source.slice(0,offset));
      let text=renderSet(tree,true,keepOuter).replace(/ +/g,' ').trim();
      // n(A)처럼 함수의 인수를 감싸는 괄호는 보존한다.
      if(keepOuter&&tree.op==='group')text='('+renderSet(tree.a,true).trim()+')';
      return (part.startsWith(' ')?' ':'')+text+(part.endsWith(' ')?' ':'');
    });
  }
  function math(source){
    let value=String(source)
      .replace(/\\setminus\b\s*/g,'-')
      .replace(/-\((-?\d+)\)/g,(_,n)=>+n<0?'+'+Math.abs(+n):'-'+n)
      .replace(/\+\((-?\d+)\)/g,(_,n)=>+n<0?'-'+Math.abs(+n):'+'+n)
      .replace(/(^|[=+\-({, ])1(?=[a-zA-Z])(?!e\b)/g,'$1')
      .replace(/(^|[=+\-({, ])0([xy])(?:\^\{?\d+\}?)?(?=[+\-=)}, ]|$)/g,'$10')
      .replace(/\+0(?=[=)},]|$)/g,'')
      .replace(/(?<![a-zA-Z])\(([a-zA-Z])\)(?=\^)/g,'$1');
    return compactSets(value);
  }
  function finiteDefinition(contents){
    const tokens=contents.replace(/\\,/g,'').split(',').map(s=>s.trim());
    if(tokens.length<6||!tokens.every(s=>/^-?\d+$/.test(s)))return null;
    const xs=tokens.map(Number);if(!xs.every((n,i)=>!i||n>xs[i-1]))return null;
    const step=xs[1]-xs[0];if(![1,2].includes(step)||!xs.every((n,i)=>!i||n-xs[i-1]===step))return null;
    const [lo,hi]=[xs[0],xs.at(-1)];
    if(step===1&&lo===1)return `\\{x\\mid x\\text{는 }${hi}\\text{ 이하의 자연수}\\}`;
    if(step===2)return `\\{x\\mid ${lo}\\le x\\le${hi},\\ x\\text{는 ${Math.abs(lo)%2?'홀수':'짝수'}}\\}`;
    return `\\{x\\mid ${lo}\\le x\\le${hi},\\ x\\text{는 정수}\\}`;
  }
  function definitions(value){
    return value.replace(/([A-Z]\s*=\s*)\\\{([^{}]*)\\\}/g,(all,prefix,contents)=>{
      const form=finiteDefinition(contents);return form?prefix+form:all;
    });
  }
  function plainText(source){
    return source.replace(/\$(\$?)([^$]+)\$\1/g,(_,display,formula)=>{
      const parts=math(formula).split(/\\text\{([^{}]*[가-힣][^{}]*)\}/u);
      return parts.map((p,i)=>i%2?p:p.trim()?'$'+p+'$':'').join('');
    });
  }
  // These subscripts identify objects in a prompt, rather than terms of
  // sequences. Use the reading order of the presented problem.
  function numberLabels(data) {
    const label=/(\\ell|(?<![a-zA-Z\\])n)_(?:\{(\d+)\}|(\d+))/g;
    const maps=new Map(), unindexed=new Set();
    const formulas=(text,fn)=>text?.replace(/\$([^$]+)\$/g,(_,formula)=>"$"+fn(formula)+"$");
    const collect=formula=>{
      if(/\\ell(?![a-zA-Z_])/.test(formula))unindexed.add("\\ell");
      if(/(?<![a-zA-Z\\])n(?![a-zA-Z_])/.test(formula))unindexed.add("n");
      for(const [,family,braced,bare] of formula.matchAll(label)) {
        if(!maps.has(family))maps.set(family,new Map());
        const indices=maps.get(family), index=braced??bare;
        if(!indices.has(index))indices.set(index,indices.size+1);
      }
      return formula;
    };
    formulas(data.intro,collect);
    data.expressions.forEach(collect);
    formulas(data.question,collect);
    data.answer.options?.forEach(text=>formulas(text,collect));
    formulas(data.answer.text,collect);
    if(!maps.size)return data;
    const rename=formula=>formula.replace(label,(match,family,braced,bare,offset)=>{
      const indices=maps.get(family), index=indices?.get(braced??bare);
      if(!index)return match;
      return indices.size===1&&!unindexed.has(family)?family+(/[a-z]/i.test(formula[offset+match.length]??"")?" ":""):family+"_{"+index+"}";
    });
    return {...data,intro:formulas(data.intro,rename),expressions:data.expressions.map(rename),
      question:formulas(data.question,rename),solution:data.solution.map(text=>formulas(text,rename)),
      answer:{...data.answer,text:formulas(data.answer.text,rename),...(data.answer.options?{options:data.answer.options.map(text=>formulas(text,rename))}:{})}};
  }

  function needsDisplay(formula,limit=46) {
    // Count visible tokens and add space for tall and nested structures.
    const width=formula.replace(/\\(?:left|right|quad|,| )\b/g,"")
      .replace(/\\(?:dfrac|tfrac|frac)\b/g,"#####")
      .replace(/\\sqrt\b/g,"##")
      .replace(/\\[a-z]+/gi,"#").replace(/[{}_^\s]/g,"").length;
    return width>limit;
  }

  function layoutQuestion(data,{fractionsOnly=true}={}) {
    if(data.expressions.length)return data;
    const target=/\$([^$]+)\$(?=의 (?:값|최댓값|최솟값)|을 만족시키는)/g;
    for(const match of data.question.matchAll(target)) {
      const [fragment,formula]=match;
      if((fractionsOnly&&!/\\(?:dfrac|tfrac|frac)\b/.test(formula))||!needsDisplay(formula))continue;
      return {...data,expressions:[formula],question:data.question.slice(0,match.index)+"위 식"+data.question.slice(match.index+fragment.length)};
    }
    return data;
  }

  function compactPrompt(data) {
    if(!data.expressions.length)return data;
    // A box already introduces the expressions. Strip only standalone
    // presentation cues with no mathematical condition or referent.
    const cue=/^(?:(?:다음|아래) )?(?:두 )?(?:식|이차부등식(?:의 실수 해)?|부등식|방정식(?:이 나타내는 원)?|함수|일차함수|이차함수|유리함수(?:의 그래프|의 역함수)?|무리함수|유리함수와 직선의 교점|무리함수와 직선의 교점|원과 직선|평행선|직선|그래프|함수의 그래프|함수의 정의역|함수의 합성)(?:을|를|이|가|은|는) (?:생각하자|주어졌다|주어져 있다|있다|다음과 같다)\.$/u;
    const intro=data.intro.trim();
    if(cue.test(intro))return {...data,intro:""};
    const domain=intro.match(/^(실수 전체)에서(?: 다음 (?:(?:두|세) 조건|명제))? 생각하자\.$/u);
    if(domain)return {...data,intro:"범위는 "+domain[1]+"이다."};
    const variable=intro.match(/^실수 (\$[^$]+\$)에 대한 다음 식을 생각하자\.$/u);
    return variable?{...data,intro:`${variable[1]}는 실수이다.`}:data;
  }

  ForgeNotation = globalThis.ForgeNotation = Object.freeze({math,definitions,plainText,parseSet,numberLabels,needsDisplay,layoutQuestion,compactPrompt});
})();


;

/* topics.js */
(() => {
  "use strict";

  const types = {};
  const rand = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
  const pick = (rng, values) => values[rand(rng, 0, values.length - 1)];
  // Draw a whole ordered family so related quantities keep their usual notation.
  const symbols = Object.freeze({
    derived: (rng,reserved=[]) => pick(rng, [["a","b"],["x","y"],["u","v"],[String.raw`\alpha`,String.raw`\beta`]]
      .filter(pair=>pair.every(name=>!reserved.includes(name)))).slice(),
    distance: (rng, reserved=[]) => pick(rng, ["d","r","t","z"].filter(name=>!reserved.includes(name))),
    coordinates: rng => pick(rng, [["x","y"],["x","y"],["a","b"],["u","v"]]).slice(),
    constants: (rng, count=1, reserved=[]) => {
      const families=[["a","b","c"],["k","l","m"],["p","q","r"],...(count===1?[["k"],["t"]]:[])];
      return pick(rng, families.filter(group=>group.slice(0,count).every(name=>!reserved.includes(name)))).slice(0,count);
    },
  });
  const signed = (rng, max = 5) => pick(rng, [-1, 1]) * rand(rng, 1, max);
  const tex = (parts, ...values) => String.raw(parts, ...values).replaceAll("\\\\", "\\");
  const m = value => "$" + ForgeNotation.math(value) + "$";
  const par = value => value < 0 ? `(${value})` : String(value);
  const coord = ([x, y]) => `(${x},${y})`;
  const shift = (variable, n) => n === 0 ? variable : `${variable}${n > 0 ? "-" : "+"}${Math.abs(n)}`;
  const term = (c, variable) => c === 1 ? variable : c === -1 ? "-" + variable : `${c}${variable}`;
  const linear = (a, x, b, y) => `${term(a, x)}${b < 0 ? "" : "+"}${term(b, y)}`;
  const sq = (variable, center) => `(${shift(variable, center)})^2`;
  const scalar = value => ({ kind: "scalar", value, text: String(value) });
  const point = value => ({ kind: "point", value, text: m(coord(value)) });
  const set = items => {
    const value=[...new Set(items)].sort((a,b)=>a-b);
    return {kind:'set',value,text:m(value.length ? tex`\\{${value.join(',')}\\}` : tex`\\varnothing`)};
  };
  // 교과서에서 사용하는 기호와 조건제시법으로 최종 문제를 표기한다.
  function textbookText(value) {
    if (typeof value !== "string") return value;
    return ForgeNotation.definitions(value)
      .replace(/\\\\(?=[A-Za-z])/g, "\\")
      .replace(/U=\\\{([^{}]*)\\\}/g, (match, contents) => {
        const items=contents.replace(/\\,/g,'').split(',').map(x=>x.trim());
        if(items.length<6 || !items.every((x,i)=>x===String(i+1))) return match;
        return `U=\\{x\\mid x\\text{는 }${items.length}\\text{ 이하의 자연수}\\}`;
      })
      .replace(/\+\s*-/g, "-")
      .replace(/-\s*-/g, "+")
      .replace(/\|([^|]+)\|/g,(match,inside)=>{
        const stripped=inside.replace(/\\(?:cup|cap|setminus)|\^c/g,'');
        return /[A-Z]/.test(stripped)&&/^[A-Z{}() \t-]+$/.test(stripped)?`n(${inside})`:match;
      })
      .replace(/\\setminus\b\s*/g, "-")
      .replace(/\\mathbb\{R\}/g, "\\{x\\mid x\\text{는 실수}\\}")
      .replace(/([a-zA-Z])\\in\\mathbb\s*(?:\{Z\}|Z)\s*:/g, "$1\\mid $1\\text{는 정수},\\ ")
      .replace(/\\(?:Longrightarrow|Rightarrow)\b/g, "\\to ")
      .replace(/\\(?:Leftrightarrow|Longleftrightarrow)\b/g, "\\leftrightarrow ")
      .replace(/\\(?:lnot|neg)\b/g, "\\mathord{\\sim}")
      .replace(/\\land\b/g, "\\text{ 그리고 }")
      .replace(/\\lor\b/g, "\\text{ 또는 }")
      .replace(/\\subseteq\b/g, "\\subset ")
      .replace(/\\supseteq\b/g, "\\supset ")
      .replace(/-\((-?\d+)\)/g, (_, n) => +n < 0 ? "+" + Math.abs(+n) : "-" + n)
      .replace(/\+\((-?\d+)\)/g, (_, n) => +n < 0 ? "-" + Math.abs(+n) : "+" + n)
      .replace(/([[(])\s*(-?\\infty|-?\d+)\s*,\s*(-?\\infty|-?\d+)\s*([\])])/g, (match, left, a, b, right) => {
        if (left === "(" && right === ")" && !match.includes("infty")) return match;
        const lo = a.includes("infty") ? "" : a + (left === "[" ? "\\le " : "<");
        const hi = b.includes("infty") ? "" : (right === "]" ? "\\le " : "<") + b;
        return "\\{x\\mid " + lo + "x" + hi + "\\}";
      })
      .replace(/구간의 합집합으로 나타내시오/g, "부등식으로 나타내시오")
      .replace(/구간으로 (?:나타내시오|쓰시오)/g, "부등식으로 나타내시오");
  }
  function textbookProblem(data) {
    const answer = {...data.answer, text:textbookText(data.answer.text)};
    if (answer.options) answer.options = answer.options.map(textbookText);
    const intro=textbookText(data.intro);
    return ForgeNotation.numberLabels(ForgeNotation.layoutQuestion({...data, intro, question:textbookText(data.question),
      expressions:data.expressions.map(value=>ForgeNotation.math(textbookText(value))), solution:data.solution.map(textbookText), answer}));
  }
  const counted = (kind, count) => {
    const number = ["", "", "두 ", "세 ", "네 ", "다섯 ", "여섯 "][count] ?? count + "개의 ";
    return number + kind;
  };
  function separatingCondition(symbol, answer, alternative) {
    if (answer===alternative) throw new Error("Expected distinct solutions");
    const greater=answer>alternative;
    const accepts=(value,limit)=>greater?value>limit:value<limit;
    const limit=accepts(answer,0)&&!accepts(alternative,0)?0:(answer+alternative)/2;
    return {
      limit, greater,
      math:symbol+(greater?">":"<")+limit,
      phrase:limit===0?(greater?"양수 ":"음수 ")+m(symbol):null,
    };
  }
  const problem = (intro, expressions, question, answer, solution) => ({ intro, expressions, question, answer, solution });
  const alternative = (id, label, build) => ({ id, label, build });
  const add = (id, unit, label, level, variants) => { types[id] = { unit, label, level, variants }; };

  function choice(rng, right, distractors) {
    if (new Set([right, ...distractors]).size !== distractors.length + 1) throw new Error("Duplicate answer options");
    const options = [right, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = rand(rng, 0, i);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { kind: "choice", options, value: options.indexOf(right), text: right };
  }

  const prop = (id, label, level, variants) => add(id, "propositions", label, level, variants);
  const ineq = (id, label, level, variants) => add(id, "absolute", label, level, variants);
  const one = (label, build) => [alternative("main", label, build)];
  const relationChoices = ["충분조건이지만 필요조건은 아니다.", "필요조건이지만 충분조건은 아니다.", "필요충분조건이다.", "충분조건도 필요조건도 아니다."];
  function relationAnswer(rng, status) {
    return choice(rng, relationChoices[status], relationChoices.filter((_, i) => i !== status));
  }

  prop("truth-and-sets", "명제의 참, 거짓과 진리집합", "B", one("진리집합의 포함 관계와 명제의 진릿값 연결", rng => {
    const a = signed(rng), inside = rng() < .5, b = a + (inside ? -1 : 1) * rand(rng,1,5);
    const options = [
      m(tex`P\\subseteq Q`) + "이고 명제는 참이다.",
      m(tex`P\\subseteq Q`) + "이고 명제는 거짓이다.",
      m(tex`P\\not\\subseteq Q`) + "이고 명제는 참이다.",
      m(tex`P\\not\\subseteq Q`) + "이고 명제는 거짓이다.",
    ];
    const index = inside ? 0 : 3;
    return problem(`실수 전체에서 조건 ${m("p,q")}의 진리집합을 각각 ${m("P,Q")}라 하자.`,
      [tex`p:x\\ge${a},\\qquad q:x\\ge${b}`], `명제 ${m(tex`p\\Rightarrow q`)}와 두 진리집합에 대한 설명을 고르시오.`,
      choice(rng, options[index], options.filter((_,i) => i !== index)),
      [`진리집합은 ${m(tex`P=[${a},\\infty)`)}, ${m(tex`Q=[${b},\\infty)`)}이다. ${options[index]}`]);
  }));

  prop("and-or", "‘또는’이나 ‘그리고’가 있는 조건", "B", one("논리 연결어 · 교집합과 합집합", rng => {
    const a = signed(rng), gap = rand(rng,1,5), and = rng() < .5;
    const low = and ? a + gap : a;
    const high = and ? a : a + gap;
    const left = m(tex`x\\le${low}`), right = m(tex`x\\ge${high}`);
    const correct = and ? m(`[${high},${low}]`) : m(tex`(-\\infty,${low}]\\cup[${high},\\infty)`);
    const others = and ? [m(tex`\{x\mid ${high}<x<${low}\}`), m(tex`\\varnothing`), m(tex`(-\\infty,${high}]\\cup[${low},\\infty)`)]
      : [m(`[${low},${high}]`), m(tex`\\mathbb{R}`), m(tex`(-\\infty,${low})\\cup(${high},\\infty)`)];
    return problem(`두 조건 ${m("p,q")}는 각각 ${left}, ${right}이다.`, [], `‘${m("p")} ${and ? "그리고" : "또는"} ${m("q")}’의 진리집합을 고르시오.`,
      choice(rng, correct, others), [`‘${and ? "그리고" : "또는"}’에 해당하는 ${and ? "교집합" : "합집합"}을 구하면 ${correct}이다.`]);
  }));

  prop("contrapositive-parameter", "대우를 이용한 상수 구하기", "B", one("대우의 구간 포함 조건으로 상수 결정", rng => {
    const a = rand(rng,2,7), right = rng() < .5;
    return problem("실수 전체에서 다음 명제가 참이다.",
      [tex`x^2>${a*a}\\;\\Longrightarrow\\;${right ? `x<-${a}\\quad\\lor\\quad x>k` : `x<k\\quad\\lor\\quad x>${a}`}`],
      `실수 ${m("k")}의 ${right ? "최댓값" : "최솟값"}을 구하시오.`, scalar(right ? a : -a), [
        `대우는 ${m(right ? tex`-${a}\\le x\\le k\\;\\Longrightarrow\\;x^2\\le${a*a}` : tex`k\\le x\\le${a}\\;\\Longrightarrow\\;x^2\\le${a*a}`)}이다.`,
        `전제의 구간이 ${m(`[-${a},${a}]`)}에 포함되어야 하므로 ${m(right ? tex`k\\le${a}` : tex`k\\ge-${a}`)}이다.`,
      ]);
  }));

  prop("syllogism-inference", "삼단논법과 명제의 추론", "B", [
    alternative("branches", "두 갈래의 추론과 대우", rng => {
      const [p,q,r,s] = pick(rng, [["p","q","r","s"],["r","p","s","q"],["s","r","q","p"]]);
      const reverse = rng() < .5;
      const formulas = [tex`${p}\\Rightarrow(${q}\\lor ${r})`,tex`${q}\\Rightarrow ${s}`,tex`${r}\\Rightarrow ${s}`];
      const implication = m(tex`${p}\\Rightarrow ${s}`);
      const correct = reverse ? m(tex`\\neg ${p}`) : m(s);
      const distractors = reverse ? [m(p),m(s),m(tex`${q}\\land ${r}`)] : [m(tex`\\neg ${s}`),m(tex`\\neg ${p}`),m(tex`\\neg ${q}\\land\\neg ${r}`)];
      return problem(`다음 세 명제가 모두 참이고 ${reverse ? `${m(s)}는 거짓` : `${m(p)}는 참`}이다.`, formulas,
        "반드시 참인 조건을 고르시오.",choice(rng,correct,distractors),
        [`${m(p)}가 참이면 ${m(q)} 또는 ${m(r)}가 참이다. 어느 쪽이든 ${m(s)}가 참이므로 ${implication}이다.`, reverse ? `이 명제의 대우에 따라 ${m(s)}가 거짓이면 ${m(p)}도 거짓이다.` : `${m(p)}가 참이므로 ${m(s)}도 참이다.`]);
    }),
    alternative("compound-contrapositive", "복합 조건의 대우로 참과 거짓 추론", rng => {
      const [p,q,r,s] = pick(rng, [["p","q","r","s"],["q","s","p","r"],["r","p","s","q"]]);
      return problem(`다음 두 명제가 참이고 ${m(p)}는 참, ${m(s)}는 거짓이다.`,
        [tex`${p}\\Rightarrow ${q}`,tex`(${q}\\land ${r})\\Rightarrow ${s}`],"반드시 참인 조건을 고르시오.",
        choice(rng,m(tex`\\neg ${r}`),[m(r),m(tex`\\neg ${q}`),m(s)]),
        [`첫 번째 명제에서 ${m(q)}는 참이다. 두 번째 명제의 대우에 따라 ${m(s)}가 거짓이면 ${m(q)} 또는 ${m(r)} 중 적어도 하나는 거짓이다.`,`${m(q)}가 참이므로 ${m(r)}는 거짓이다.`]);
    }),
  ]);

  prop("suff-necessary-sets", "충분·필요조건과 진리집합", "B", one("두 진리집합의 포함 관계로 조건 판별", rng => {
    const a = signed(rng), gap = rand(rng,1,4), status = rand(rng,0,3);
    const shorter = [a,a+gap], longer = [a-1,a+gap+1], overlapping = [a+gap,a+gap+2];
    const [p,q] = [[shorter,longer],[longer,shorter],[shorter,shorter],[shorter,overlapping]][status];
    return problem(`조건 ${m("p,q")}의 진리집합 ${m("P,Q")}가 아래와 같다.`, [`P=[${p.join(",")}],\\qquad Q=[${q.join(",")}]`],
      `${m("p")}는 ${m("q")}의 어떤 조건인지 고르시오.`, relationAnswer(rng,status), [
        `충분조건은 ${m(tex`P\\subseteq Q`)}, 필요조건은 ${m(tex`Q\\subseteq P`)}에 해당한다. 두 구간을 비교하면 ${relationChoices[status]}`,
      ]);
  }));

  prop("suff-necessary-parameter", "충분·필요조건이 되도록 하는 상수", "B", one("한쪽 함의만 성립하는 정수 경계", rng => {
    const a = signed(rng), sufficient = rng() < .5;
    return problem(`실수 전체에서 ${m("p")}가 ${m("q")}의 ${sufficient ? "충분조건이지만 필요조건은 아니다." : "필요조건이지만 충분조건은 아니다."}`,
      [tex`p:x\\ge${a},\\qquad q:x\\ge k`],
      `정수 ${m("k")}의 ${sufficient ? "최댓값" : "최솟값"}을 구하시오.`, scalar(sufficient ? a-1 : a+1), [
        `두 진리집합의 포함이 한 방향에서만 성립해야 하므로 ${m(`k${sufficient ? "<" : ">"}${a}`)}이다. 정수 경곗값은 ${m(sufficient ? a-1 : a+1)}이다.`,
      ]);
  }));

  prop("set-operations-iff", "집합의 연산과 필요충분조건", "B", one("연산으로 얻은 진리집합의 일치 조건", rng => {
    const a = signed(rng), union = rng() < .5, b = a + (union ? 1 : -1) * rand(rng,1,5);
    return problem(`실수 전체에서 다음 세 조건을 생각하자.`,
      [tex`p:x\\le${a},\\qquad q:x\\le k,\\qquad r:x\\le${b}`],
      `‘${m("p")} ${union ? "또는" : "그리고"} ${m("q")}’가 ${m("r")}의 필요충분조건일 때 실수 ${m("k")}를 구하시오.`,
      scalar(b), [
        `‘${union ? "또는" : "그리고"}’의 진리집합의 오른쪽 경계는 ${m(tex`\\${union ? "max" : "min"}(${a},k)`)}이다. 이 값이 ${m(b)}와 같아야 한다.`,
        `${m(`${a}${union ? "<" : ">"}${b}`)}이므로 ${m(`k=${b}`)}이다.`,
      ]);
  }));

  prop("contradiction-proof", "귀류법", "B", one("무리수 증명 · 모순되는 가정 선택", rng => {
    const p = pick(rng,[2,3,5,7,11]);
    return problem(`${m(tex`\\sqrt{${p}}`)}가 유리수라고 가정하고, 서로소인 양의 정수 ${m("a,b")}를 써서 ${m(tex`\\sqrt{${p}}=\\frac{a}{b}`)}로 놓는다.`,
      [`a^2=${p}b^2`], "이 가정에서 유도되는 모순을 고르시오.",
      choice(rng, `두 수가 모두 ${m(p)}의 배수여서 서로소 조건과 모순된다.`, [
        `${m("a=b")}가 되어 분수 표기와 모순된다.`, `${m("b=0")}이 되어 양의 정수 조건과 모순된다.`, `두 수의 합이 ${m(p)}여서 양의 정수 조건과 모순된다.`,
      ]), [
        `${m(p)}는 소수이므로 ${m("a^2")}이 ${m(p)}의 배수이면 ${m("a")}도 그 배수이다. ${m(`a=${p}k`)}를 대입하면 ${m(`b^2=${p}k^2`)}이므로 ${m("b")}도 그 배수이다.`,
        "이는 서로소라는 가정과 모순이므로 처음의 유리수 가정이 거짓이다.",
      ]);
  }));

  ineq("real-properties-proof", "실수의 성질을 이용한 절대부등식의 증명", "B", one("완전제곱의 음이 아닌 성질로 증명", rng => {
    const a = signed(rng);
    const right = m(sq("x",a));
    return problem(`모든 실수 ${m("x")}에 대하여 다음 부등식을 증명하려고 한다.`,
      [tex`x^2+${a*a}\\ge ${term(2*a,"x")}`],
      "좌변에서 우변을 뺀 식과 같은 완전제곱식을 고르시오.",
      choice(rng, right, [m(sq("x",-a)),m(sq("x",2*a)),m(sq("x",-2*a))]), [
        `좌변에서 우변을 빼면 ${right}이다. 실수의 제곱은 음이 아니므로 주어진 부등식은 모든 실수에서 성립한다.`,
      ]);
  }));

  ineq("absolute-inequality", "절대부등식", "B", one("모든 실수에서 성립하는 하한 결정", rng => {
    const a = signed(rng), k = signed(rng), b = a*a + k;
    return problem(`다음 부등식이 모든 실수 ${m("x")}에서 성립하도록 하는 실수 ${m("k")}를 생각하자.`,
      [tex`${shift(linear(1,"x^2",-2*a,"x"),-b)}\\ge k`], `${m("k")}의 최댓값을 구하시오.`, scalar(k), [
        `좌변을 완전제곱으로 나타내면 ${m(shift(sq("x",a),-k))}이다. ${m(`x=${a}`)}에서 최솟값 ${m(k)}을 가지므로 이것이 ${m("k")}의 최댓값이다.`,
      ]);
  }));

  ineq("absolute-value-inequality", "절댓값 기호를 포함한 절대부등식", "B", [
    alternative("bound", "두 절댓값의 합 · 최솟값", rng => absDistance(rng,false)),
    alternative("equality", "두 절댓값의 합 · 등호 조건", rng => absDistance(rng,true)),
  ]);
  function absDistance(rng, equality) {
    const a = signed(rng), gap = rand(rng,2,8), b = a+gap;
    const interval = { kind:"interval", value:[{start:a,end:b,startClosed:true,endClosed:true}], text:m(`[${a},${b}]`) };
    return problem(`실수 ${m("x")}에 대한 다음 식을 생각하자.`, [`|${shift("x",a)}|+|${shift("x",b)}|`],
      equality ? "식의 값이 최소가 되는 실수의 범위를 구간으로 나타내시오." : "이 식의 최솟값을 구하시오.",
      equality ? interval : scalar(gap), [
        `수직선 위의 두 점까지의 거리의 합은 두 점 사이의 거리 ${m(gap)} 이상이다.`,
        `점이 두 점 사이 또는 끝점에 있을 때 등호가 성립하므로 등호 구간은 ${interval.text}이다.`,
      ]);
  }

  ineq("amgm-product", "산술기하평균에서 곱의 최솟값 구하기", "B", one("양수 두 인수의 곱 · 전개 후 산술기하평균", rng => {
    const a = rand(rng,1,4), b = rand(rng,1,4), t = rand(rng,2,5), c = a*b*t*t, min = a*b*(t+1)**2;
    return problem(`양수 ${m("x,y")}가 ${m(`xy=${c}`)}를 만족한다.`, [`(x+${a})(y+${b})`], "이 곱의 최솟값을 구하시오.", scalar(min), [
      `식을 전개하면 ${m(`${c+a*b}+${term(b,"x")}+${term(a,"y")}`)}이다.`,
      `두 양수 ${m(term(b,"x"))}와 ${m(term(a,"y"))}의 곱은 ${m(a*b*c)}이므로 산술기하평균에 의해 그 합은 ${m(2*a*b*t)} 이상이다.`,
      `${m(`(x,y)=(${a*t},${b*t})`)}에서 두 항이 같아져 등호가 성립한다. 곱의 최솟값은 ${m(min)}이다.`,
    ]);
  }));

  ineq("amgm-geometry", "산술기하평균 도형에서의 활용", "B", [
    alternative("area", "직사각형의 둘레가 일정할 때 넓이의 최댓값", rng => amgmRectangle(rng,true)),
    alternative("perimeter", "직사각형의 넓이가 일정할 때 둘레의 최솟값", rng => amgmRectangle(rng,false)),
  ]);
  function amgmRectangle(rng, area) {
    const s = rand(rng,3,15);
    return problem(area ? `둘레의 길이가 ${m(4*s)}인 직사각형이 있다.` : `넓이가 ${m(s*s)}인 직사각형이 있다.`,
      [], area ? "이 직사각형의 넓이의 최댓값을 구하시오." : "이 직사각형의 둘레의 최솟값을 구하시오.", scalar(area ? s*s : 4*s), [
        `가로와 세로의 길이를 ${m("x,y")}라 하면 ${m(area ? `x+y=${2*s}` : `xy=${s*s}`)}이다.`,
        `산술기하평균에 따라 ${m(tex`x+y\\ge2\\sqrt{xy}`)}이다. ${m(`x=y=${s}`)}일 때 등호가 성립하므로 ${area ? "넓이의 최댓값" : "둘레의 최솟값"}은 ${m(area ? s*s : 4*s)}이다.`,
      ]);
  }

  const triple = rng => pick(rng, [[3,4,5],[5,12,13],[8,15,17]]);
  ineq("cauchy-linear", "코시-슈바르츠 부등식에서 ax+by의 최대 및 최소", "B", [
    alternative("maximum", "반지름 제약 · 일차식의 최댓값", rng => cauchyLinear(rng,true)),
    alternative("minimum", "반지름 제약 · 일차식의 최솟값", rng => cauchyLinear(rng,false)),
  ]);
  function cauchyLinear(rng, maximum) {
    const [a, magnitude, norm] = triple(rng);
    const b = pick(rng,[-magnitude,magnitude]), r = rand(rng,2,6), sign = maximum ? 1 : -1;
    const expression = linear(a,"x",b,"y");
    return problem(`실수 ${m("x,y")}가 다음 조건을 만족한다.`, [`x^2+y^2=${r*r}`],
      `${m(expression)}의 ${maximum ? "최댓값" : "최솟값"}을 구하시오.`, scalar(sign*norm*r), [
        `코시-슈바르츠 부등식에 따라 ${m(tex`|${expression}|\\le\\sqrt{${a*a}+${b*b}}\\sqrt{x^2+y^2}=${norm*r}`)}이다.`,
        `${m(tex`(x,y)=\\frac{${sign*r}}{${norm}}(${a},${b})`)}에서 원하는 부호로 등호가 성립한다.`,
      ]);
  }

  ineq("cauchy-square", "코시-슈바르츠 부등식에서 x²+y²의 최대 및 최소", "B", [
    alternative("minimum", "일차 제약 · 제곱합의 최솟값", rng => {
      const [a,b,n] = triple(rng), k = rand(rng,2,6), c = n*k;
      return problem(`실수 ${m("x,y")}가 다음 조건을 만족한다.`, [`${linear(a,"x",b,"y")}=${c}`],
        `${m("x^2+y^2")}의 최솟값을 구하시오.`, scalar(k*k), [
          `코시-슈바르츠 부등식에 의해 ${m(tex`${c}^2\\le${n*n}(x^2+y^2)`)}이므로 제곱합은 ${m(k*k)} 이상이다.`,
          `${m(tex`(x,y)=\\frac{${k}}{${n}}(${a},${b})`)}는 주어진 조건을 만족하고 등호를 이룬다.`,
        ]);
    }),
    alternative("maximum", "이동한 원 위에서 제곱합의 최댓값", rng => {
      const [a,b,n] = triple(rng), r = rand(rng,2,8), max = (n+r)**2;
      return problem(`실수 ${m("x,y")}가 다음 조건을 만족한다.`, [`${sq("x",a)}+${sq("y",b)}=${r*r}`],
        `${m("x^2+y^2")}의 최댓값을 구하시오.`, scalar(max), [
          `${m(`u=${shift("x",a)}`)}, ${m(`v=${shift("y",b)}`)}로 두면 ${m(`u^2+v^2=${r*r}`)}이고, ${m(`x^2+y^2=${r*r+n*n}+2(${linear(a,"u",b,"v")})`)}이다.`,
          `코시-슈바르츠 부등식에 따라 ${m(tex`${linear(a,"u",b,"v")}\\le${n*r}`)}이다. ${m(tex`(u,v)=\\frac{${r}}{${n}}(${a},${b})`)}에서 등호가 성립하므로 최댓값은 ${m(max)}이다.`,
        ]);
    }),
  ]);

  ineq("cauchy-geometry", "코시-슈바르츠 부등식 도형에의 활용", "B", [
    alternative("near", "원 위의 점에서 직선까지의 최소 거리", rng => circleLine(rng,false)),
    alternative("far", "원 위의 점에서 직선까지의 최대 거리", rng => circleLine(rng,true)),
  ]);
  function circleLine(rng, far) {
    const [a,b,n] = triple(rng), h = signed(rng,3), j = signed(rng,3);
    const r = rand(rng,2,6), gap = rand(rng,1,6), c = a*h+b*j+n*(r+gap);
    const value = far ? 2*r+gap : gap;
    return problem(`점 ${m("P=(x,y)")}는 중심이 ${m(coord([h,j]))}이고 반지름이 ${m(r)}인 원 위에 있다.`,
      [`\\ell:\\quad ${linear(a,"x",b,"y")}=${c}`],
      `점 ${m("P")}에서 직선 ${m(tex`\\ell`)}까지 거리의 ${far ? "최댓값" : "최솟값"}을 구하시오.`, scalar(value), [
        `${m(tex`u=x-${par(h)},\\quad v=y-${par(j)}`)}로 두면 ${m(`u^2+v^2=${r*r}`)}이다. 코시-슈바르츠 부등식에 의해 ${m(tex`|${linear(a,"u",b,"v")}|\\le${n*r}`)}이다.`,
        `거리는 ${m(tex`\\frac{${n*(r+gap)}-(${linear(a,"u",b,"v")})}{${n}}`)}이다. 분자는 원 위에서 항상 양수다.`,
        `${m(tex`(u,v)=\\frac{${far ? -r : r}}{${n}}(${a},${b})`)}에서 필요한 등호가 성립하므로 답은 ${m(value)}이다.`,
      ]);
  }

  function generate(type, level, { rng = Math.random, avoidPaths = [], variantId, mode, format, environment } = {}) {
    const entry = types[type];
    const preferred=entry.variants.find(variant=>variant.id===entry.defaultVariant);
    const variants=variantId?entry.variants.filter(variant=>variant.id===variantId):preferred?[preferred]:entry.variants;
    const candidates=variants.flatMap(variant=>{
      if(!variantId&&!mode&&environment&&variant.environment&&variant.environment!==environment)return [];
      if(!variant.answerPaths)return mode?[]:[variant];
      const answerPaths=variant.answerPaths.filter(path=>mode?path.id===mode:!path.manualOnly&&(!path.environment||!environment||path.environment===environment));
      return answerPaths.length?[{...variant,answerPaths}]:[];
    });
    const plan=globalThis.ForgeAnswerPaths.choose(candidates,avoidPaths,rng);
    if (format) {
      plan.presentation=format;
      plan.id=plan.id.replace(/\|[^|]+$/, "|"+format);
    }
    const selected=plan.variant;
    const data=textbookProblem(globalThis.ForgeAnswerPaths.apply(plan,selected.build(rng,plan.path,{environment})));
    delete data.answerPath;
    return {
      type, level, format: "tex",
      template: entry.label,
      resultType: selected.resultType ?? { scalar:"수", interval:"구간 집합", point:"순서쌍", graph:"그래프", set:"유한 집합", choice:"선택지", truth:"진릿값" }[data.answer.kind],
      answerPath: { id:plan.id, label:plan.derivedLabel ?? plan.path?.label ?? selected.label,
        inputType:selected.resultType?.baseType,
        operations:data.inspection?.operations ?? plan.derivedOperations ?? plan.path?.operations,
        outputType:plan.path?.outputType,
        requirements:plan.path?.requirements ?? [] },
      answerConstraints: "정답과 등호·존재 조건을 먼저 구성",
      actionHistory: [],
      ...data,
      type, level,
    };
  }

  ForgeTopics = globalThis.ForgeTopics = Object.freeze({ types, generate, tex, add, alternative, one, problem, choice, scalar, point, set, m, counted, separatingCondition, rand, pick, symbols, signed, shift, term, linear, coord, par, sq, relationAnswer });
})();


;

/* practice-banks.js */
(() => {
  "use strict";

  const { tex, add, one, alternative, problem, choice, scalar, set, m, rand, pick, signed, relationAnswer } = globalThis.ForgeTopics;
  const finite = (a, b) => Array.from({length:b-a+1}, (_,i) => a+i);
  const setTeX = values => values.length ? tex`\\{${values.join(",\\,")}\\}` : tex`\\varnothing`;
  const define = (id, unit, label, level, path, build) => add(id,unit,label,level,one(path,build));
  const foundations = (id, unit, label, build) => define(id,unit,label,"A",label,build);
  const b = (id, label, variants) => add(id, "propositions", label, "B", variants);

  const selectOption = (rng, options, index=0) => choice(rng,options[index],options.filter((_,i)=>i!==index));

  foundations("a-set-membership", "sets", "원소와 집합", rng => {
    const a = signed(rng), values = [a,a+2,a+4], yes = rng() < .5, x = yes ? pick(rng,values) : a+1;
    const answer = yes ? tex`${x}\\in A` : tex`${x}\\notin A`;
    return problem("다음 집합을 보자.", [`A=${setTeX(values)}`],
      `${m(x)}와 집합 ${m("A")}의 관계를 고르시오.`,
      choice(rng,m(answer),[m(yes ? tex`${x}\\notin A` : tex`${x}\\in A`)]),
      [`집합의 원소를 확인하면 ${m(answer)}이다.`]);
  });
  foundations("a-set-subset", "sets", "부분집합 알아보기", rng => {
    const a = signed(rng), whole = [a,a+1,a+2];
    const options = [[a,a+2],[a-1,a+1],[a,a+3],[a+1,a+4]].map(v => m(setTeX(v)));
    return problem("다음 집합의 원소를 확인하자.", [`A=${setTeX(whole)}`], `${m("A")}의 부분집합을 고르시오.`,
      choice(rng,options[0],options.slice(1)), ["부분집합의 모든 원소는 주어진 집합에 속해야 한다."]);
  });
  foundations("a-set-operation", "sets", "합집합과 교집합", rng => {
    const a = signed(rng), union = rng() < .5;
    const answer = union ? [a,a+1,a+2] : [a+1];
    return problem("두 집합이 다음과 같다.", [`A=${setTeX([a,a+1])},\\qquad B=${setTeX([a+1,a+2])}`],
      `${m(union ? tex`A\\cup B` : tex`A\\cap B`)}를 구하시오.`, set(answer),
      [union ? "한 집합에라도 속하는 원소를 모두 모은다." : "두 집합에 공통으로 속하는 원소를 모은다."]);
  });
  foundations("a-set-complement", "sets", "여집합의 원소", rng => {
    const a = signed(rng), values = finite(a,a+4), elements = values.filter((_,i)=>i%2===0);
    return problem("전체집합과 부분집합이 다음과 같다.", [`U=${setTeX(values)},\\quad A=${setTeX(elements)}`], `${m(tex`A^c`)}를 구하시오.`,
      set(values.filter(x=>!elements.includes(x))), [`전체집합에서 ${m("A")}의 원소를 빼면 된다.`]);
  });

  define("set-expressions", "sets", "합집합·교집합·차집합의 결합", "B", "연산 순서에 따라 유한 집합 계산", rng => {
    const h=signed(rng), values=finite(h,h+8), a=values.filter((_,i)=>i%2===0), b=values.slice(rand(rng,1,3),7), c=values.slice(4);
    const union=rng()<.5;
    const answer=values.filter(x=>union ? (a.includes(x)||b.includes(x))&&!c.includes(x) : a.includes(x)&&(b.includes(x)||c.includes(x)));
    return problem("세 집합이 다음과 같다.", [`A=${setTeX(a)},\\quad B=${setTeX(b)}`,`C=${setTeX(c)}`],
      `${m(union ? tex`(A\\cup B)\\setminus C` : tex`A\\cap(B\\cup C)`)}의 원소를 구하시오.`, set(answer),
      [`괄호 안의 합집합을 먼저 구하고, 나머지 연산을 적용하면 ${m(setTeX(answer))}이다.`]);
  });
  define("set-cardinality", "sets", "포함배제로 집합의 원소 개수 구하기", "B", "두 집합과 여집합의 원소 개수", rng => {
    const both=rand(rng,2,7), onlyA=rand(rng,3,8), onlyB=rand(rng,3,9), neither=rand(rng,1,5), n=both+onlyA+onlyB+neither;
    const askBoth=rng()<.5;
    return problem(`전체집합 ${m("U")}의 부분집합 ${m("A,B")}에 대하여 다음이 성립한다.`, [
      tex`|U|=${n},\\quad |A|=${both+onlyA},\\quad |B|=${both+onlyB}`,
      askBoth ? tex`|(A\\cup B)^c|=${neither}` : tex`|A\\cap B|=${both}`
    ], `${m(askBoth ? tex`|A\\cap B|` : tex`|(A\\cup B)^c|`)}를 구하시오.`, scalar(askBoth ? both : neither),
    [`${m(tex`|A\\cup B|=|A|+|B|-|A\\cap B|`)}이고, 합집합의 여집합을 더하면 전체집합의 원소 개수가 된다.`]);
  });
  define("set-subset-count", "sets", "포함하거나 제외해야 하는 원소가 있는 부분집합", "B", "필수·금지 원소를 먼저 분리", rng => {
    const n=rand(rng,5,9), required=rand(rng,1,2), prohibited=rand(rng,1,2), free=n-required-prohibited;
    return problem(`원소가 ${m(n)}개인 집합에서 서로 겹치지 않는 필수 원소 ${m(required)}개와 제외할 원소 ${m(prohibited)}개를 정했다.`, [],
      "필수 원소는 모두 포함하고, 제외할 원소는 하나도 포함하지 않는 부분집합의 개수를 구하시오.", scalar(2**free),
      [`포함 여부를 선택할 수 있는 원소는 ${m(free)}개이므로 가능한 부분집합은 ${m(`2^{${free}}=${2**free}`)}개이다.`]);
  });
  define("set-range-parameter", "sets", "집합의 포함 관계로 상수 결정", "B", "정수 구간의 포함과 원소 개수", rng => {
    const a=signed(rng), n=rand(rng,3,8);
    return problem("두 집합에 대하여 다음이 성립한다.", [
      tex`A=\\{x\\in\\mathbb Z:\\ x\\ge${a}\\},\\quad B=\\{x\\in\\mathbb Z:\\ x\\le k\\}`,tex`|A\\cap B|=${n}`
    ], `정수 ${m("k")}를 구하시오.`, scalar(a+n-1),
      [`교집합은 ${m(a)}부터 ${m("k")}까지의 정수이다. ${m(`k-(${a})+1=${n}`)}을 풀면 된다.`]);
  });
  define("set-demorgan", "sets", "집합의 연산과 드모르간 법칙", "B", "두 집합의 여집합에 대한 연산", rng => {
    const union=rng()<.5;
    const correct=union ? tex`A^c\\cap B^c` : tex`A^c\\cup B^c`;
    return problem("전체집합의 두 부분집합이 주어져 있다.", [union ? tex`(A\\cup B)^c` : tex`(A\\cap B)^c`],
      "위 식과 모든 경우에 같은 집합을 고르시오.",
      choice(rng,m(correct),[m(union ? tex`A^c\\cup B^c` : tex`A^c\\cap B^c`),m(tex`A\\setminus B`),m(tex`B\\setminus A`)]),
      [`드모르간 법칙에 따라 두 집합을 각각 여집합으로 바꾸고 합집합과 교집합을 바꾼다. 따라서 ${m(correct)}이다.`]);
  });

  foundations("a-classification", "propositions", "명제와 조건 구별", rng => {
    const a=rand(rng,2,7), statements=rng()<.5;
    const fixed=[m(`${a}^2=${a*a}`),m(`${a}+1=${a}`)];
    const open=[m(`x>${a}`),m(`x^2=${a*a}`)];
    const pair=(x,y)=>`${x}, ${y}`;
    return problem("변수가 나오면 그 값은 주어지지 않은 실수로 본다.", [], `${statements ? "명제" : "조건"}만 있는 것을 고르시오.`,
      choice(rng,statements ? pair(...fixed) : pair(...open),[statements ? pair(...open) : pair(...fixed),pair(fixed[0],open[0]),pair(open[1],fixed[1])]),
      ["변수의 값에 따라 참과 거짓이 달라지는 식은 조건이다. 수만 있는 등식은 참인지 거짓인지 결정할 수 있다."]);
  });
  foundations("a-truth-set", "propositions", "한 조건의 진리집합", rng => {
    const a=rand(rng,1,5), n=a+rand(rng,1,3), outside=rng()<.5;
    const values=finite(-n,n).filter(x=>outside ? Math.abs(x)>a : Math.abs(x)<=a);
    return problem("전체집합과 조건이 다음과 같다.", [`U=${setTeX(finite(-n,n))}`,tex`p:x^2${outside ? ">" : "\\le"}${a*a}`],
      "이 조건의 진리집합을 구하시오.",set(values),[`전체집합에서 식을 만족하는 원소만 모으면 ${m(setTeX(values))}이다.`]);
  });
  foundations("a-negation", "propositions", "명제의 부정과 참·거짓", rng => {
    const a=rand(rng,2,7), n=a*a+(rng()<.5 ? 0 : 1), originalTrue=n===a*a;
    const negation=m(tex`${a}^2\\ne${n}`), original=m(`${a}^2=${n}`);
    return problem("다음 명제를 보자.", [`${a}^2=${n}`], "이 명제의 부정과 그 부정의 참·거짓을 고르시오.",
      choice(rng,`${negation}, ${originalTrue ? "거짓" : "참"}`, [`${negation}, ${originalTrue ? "참" : "거짓"}`,`${original}, 참`,`${original}, 거짓`]),
      [`등식의 부정은 같지 않다는 뜻이다. ${m(`${a}^2=${a*a}`)}이므로 그 부정은 ${originalTrue ? "거짓" : "참"}이다.`]);
  });
  foundations("a-counterexample", "propositions", "반례의 조건", rng => {
    const a=rand(rng,2,7);
    return problem("실수에 대한 다음 명제가 주어져 있다.", [tex`x^2=${a*a}\\Rightarrow x=${a}`],
      "이 명제의 반례를 고르시오.",choice(rng,m(`x=-${a}`),[m(`x=${a}`),m("x=0"),m(`x=${a+1}`)]),
      [`${m(`x=-${a}`)}는 전제를 만족하지만 결론을 만족하지 않는다.`]);
  });
  foundations("a-implication", "propositions", "명제의 역과 대우", rng => {
    const reversed=rng()<.5;
    const values=[tex`q\\Rightarrow p`,tex`\\neg q\\Rightarrow\\neg p`,tex`\\neg p\\Rightarrow\\neg q`,tex`p\\Rightarrow q`].map(m);
    const correct=reversed ? 0 : 1;
    return problem("다음 명제가 주어져 있다.", [tex`p\\Rightarrow q`], `이 명제의 ${reversed ? "역" : "대우"}를 고르시오.`,
      choice(rng,values[correct],values.filter((_,i)=>i!==correct)),[`전제와 결론의 순서를 바꾸${reversed ? "면 역이다." : "고 각각 부정하면 대우이다."}`]);
  });

  b("statement-meaning","명제와 조건의 의미",one("같은 식에서 변수 범위와 양화사가 하는 역할",rng=>{
    const a=rand(rng,2,7);
    const items=[m(`x^2=${a*a}`),`모든 실수 ${m("x")}에 대하여 ${m(`x^2=${a*a}`)}이다.`,`어떤 실수 ${m("x")}에 대하여 ${m(`x^2=${a*a}`)}이다.`];
    return problem(`다음 세 문장이 있다. ① ${items[0]} ② ${items[1]} ③ ${items[2]}`,[],"①, ②, ③을 순서대로 분류한 것을 고르시오.",
      choice(rng,"조건, 거짓인 명제, 참인 명제",["조건, 참인 명제, 거짓인 명제","참인 명제, 거짓인 명제, 참인 명제","조건, 거짓인 명제, 조건"]),
      [`①은 변수 값이 정해지지 않아 조건이다. ②는 ${m("x=0")}이 반례이고, ③은 ${m(`x=${a}`)}에서 성립한다.`]);
  }));

  b("negation","명제와 조건의 부정",[
    alternative("connectives","논리 연결어와 각 조건을 함께 부정",rng=>{
      const or=rng()<.5, junction=or ? "또는" : "그리고", swapped=or ? "그리고" : "또는";
      const p=m(tex`\\neg p`),q=m(tex`\\neg q`), r=m("p"),s=m("q");
      return problem(`두 조건 ${r}, ${s}가 주어져 있다.`,[],`조건 ‘${r} ${junction} ${s}’의 부정을 고르시오.`,
        choice(rng,`${p} ${swapped} ${q}`,[`${p} ${junction} ${q}`,`${r} ${swapped} ${s}`,`${p} ${swapped} ${s}`]),
        [`드모르간 법칙에 따라 각 조건을 부정하고 ‘${junction}’을 ‘${swapped}’으로 바꾼다.`]);
    }),
    alternative("bounds","복합 부등식의 부정에서 경계까지 판별",rng=>{
      const a=signed(rng), b=a+rand(rng,2,6);
      const forms=[tex`x<${a}\\ \\lor\\ x\\ge${b}`,tex`x\\le${a}\\ \\lor\\ x>${b}`,tex`x<${a}\\ \\land\\ x\\ge${b}`,tex`${a}<x\\le${b}`].map(m);
      return problem("전체집합은 실수 전체이다.", [tex`${a}\\le x<${b}`],"위 조건의 부정을 고르시오.",
        choice(rng,forms[0],forms.slice(1)),[`조건은 두 부등식의 ‘그리고’이다. 어느 한쪽이라도 어기면 ${forms[0]}이다.`]);
    }),
  ]);

  b("truth-set","진리집합",one("논리 연결어가 있는 이차 조건의 진리집합",rng=>{
    const a=rand(rng,2,5), n=a+2, h=pick(rng,[-1,1]), or=rng()<.5;
    const members=finite(-n,n).filter(x=>or ? x*x<=a*a||x===h*n : x*x<=a*a&&h*x>0);
    return problem("전체집합과 두 조건이 다음과 같다.",[`U=${setTeX(finite(-n,n))}`,tex`p:x^2\\le${a*a},\\quad q:${or ? `x=${h*n}` : h>0 ? "x>0" : "x<0"}`],
      `‘${m("p")} ${or ? "또는" : "그리고"} ${m("q")}’의 진리집합을 구하시오.`,set(members),
      [`먼저 각 조건의 진리집합을 구하고 ${or ? "합집합" : "교집합"}을 취하면 ${m(setTeX(members))}이다.`]);
  }));

  b("truth-value","명제의 참과 거짓",one("이차식 조건에서 얻은 구간과 결론의 경계 비교",rng=>{
    const a=rand(rng,2,7), valid=rng()<.5, bound=valid ? a+rand(rng,0,2) : a-1;
    return problem("실수 전체에 대한 명제이다.", [tex`x^2\\le${a*a}\\quad\\Rightarrow\\quad -${a}\\le x\\le${bound}`],
      "명제의 참과 거짓을 판별하시오.",choice(rng,valid ? "참" : "거짓",[valid ? "거짓" : "참"]),
      [`전제의 진리집합은 ${m(`[-${a},${a}]`)}이다. ${valid ? "이 구간이 결론의 구간에 포함되므로 참이다." : m(`x=${a}`) + "가 반례이므로 거짓이다."}`]);
  }));

  b("counterexample","거짓인 명제의 반례",one("복합 전제를 만족하면서 결론을 어기는 값",rng=>{
    const a=rand(rng,3,8), flip=pick(rng,[-1,1]), x=flip*(a-1);
    const options=[x,flip*(a-2),-x,flip*a].map(t=>m(`x=${t}`));
    return problem("실수 전체에서 생각하자.",[tex`\\bigl(x^2<${a*a}\\ \\land\\ ${flip===1?"x>0":"x<0"}\\bigr)\\quad\\Rightarrow\\quad x^2\\le${(a-2)**2}`],
      "다음 중 반례를 고르시오.",choice(rng,options[0],options.slice(1)),
      [`${options[0]}에서 두 전제는 모두 성립하지만 ${m(`x^2=${(a-1)**2}>${(a-2)**2}`)}이므로 결론이 성립하지 않는다.`]);
  }));

  b("syllogism","삼단논법",[
    alternative("logical-bridge","연결어가 포함된 두 함의의 연결",rng=>{
      const [p,q,r,s]=pick(rng,[["p","q","r","s"],["q","r","s","p"],["r","s","p","q"]]);
      const connective=rng()<.5?"\\lor":"\\land";
      const middle=tex`(${q}${connective}\\neg ${r})`;
      const implication=(a,b)=>m(tex`${a}\\Rightarrow ${b}`);
      return problem("다음 두 명제가 모두 참이다.",[tex`${p}\\Rightarrow ${middle}`,tex`${middle}\\Rightarrow ${s}`],
        "반드시 참인 명제를 고르시오.",
        choice(rng,implication(p,s),[implication(s,p),implication(s,middle),implication(middle,p)]),
        [`첫 번째 명제의 결론과 두 번째 명제의 가정이 같으므로 ${implication(p,s)}가 성립한다.`]);
    }),
    alternative("contrapositive-bridge","대우를 이용해 함의의 연결",rng=>{
      const [p,q,r]=pick(rng,[["p","q","r"],["q","r","p"],["r","p","q"]]);
      const imp=(a,b)=>m(tex`${a}\\Rightarrow ${b}`);
      return problem("다음 두 명제는 모두 참이다.",[tex`${p}\\Rightarrow ${q}`,tex`\\neg ${r}\\Rightarrow\\neg ${q}`],
        "반드시 참인 명제를 고르시오.",
        choice(rng,imp(p,r),[imp(r,p),imp(q,p),imp(r,q)]),
        [`두 번째 명제의 대우는 ${imp(q,r)}이다. 첫 번째 명제와 연결하면 ${imp(p,r)}이다.`]);
    }),
  ]);

  b("suff-necessary","충분조건, 필요조건, 필요충분조건",one("완전제곱식의 진리집합과 절댓값 조건 비교",rng=>{
    const h=signed(rng), d=rand(rng,2,5), status=rand(rng,0,3), e=status===0?d+1:status===1?d-1:d;
    const qCenter=status===3?h+1:h, pCenter=h>0?`x-${h}`:`x+${-h}`, qShift=qCenter===0?"x":qCenter>0?`x-${qCenter}`:`x+${-qCenter}`;
    return problem("실수에 대한 두 조건이다.",[tex`p:(${pCenter})^2\\le${d*d},\\qquad q:|${qShift}|\\le${e}`],
      `${m("p")}는 ${m("q")}의 어떤 조건인지 고르시오.`,relationAnswer(rng,status),
      [`두 진리집합은 각각 ${m(`[${h-d},${h+d}]`)}, ${m(`[${qCenter-e},${qCenter+e}]`)}이다. 두 포함 관계를 각각 확인한다.`]);
  }));

  b("true-parameter","명제가 참이 되도록 하는 상수",one("절댓값으로 정해진 구간에서 이차식의 상한",rng=>{
    const h=signed(rng), d=rand(rng,2,6), bound=(Math.abs(h)+d)**2;
    return problem("실수 전체에서 다음 명제가 참이 되도록 하자.",[tex`|x-(${h})|\\le${d}\\quad\\Rightarrow\\quad x^2\\le k`],
      `실수 ${m("k")}의 최솟값을 구하시오.`,scalar(bound),[
        `전제의 진리집합은 ${m(`[${h-d},${h+d}]`)}이다. 원점에서 더 먼 끝점의 절댓값은 ${m(Math.abs(h)+d)}이므로, 그 구간에서 제곱의 최댓값은 ${m(bound)}이다.`,
      ]);
  }));

  b("quantifiers","‘모든’이나 ‘어떤’이 있는 명제",[
    alternative("negate-universal","전체집합을 유지하고 ‘모든’ 명제 부정",rng=>{
      const n=rand(rng,3,7), a=rand(rng,1,n-1), u=m(tex`\\{1,2,\\ldots,${n}\\}`);
      const positive=m(tex`x^2\\le${a*a}`), negative=m(`x^2>${a*a}`);
      const phrase=(word,expr)=>`${word} 원소 ${m("x")}에 대하여 ${expr}이다.`;
      return problem(`전체집합은 ${u}이다.`,[],`‘${phrase("모든",positive)}’의 부정을 고르시오.`,
        choice(rng,phrase("어떤",negative),[phrase("모든",negative),phrase("어떤",positive),phrase("모든",positive)]),
        [`하나라도 조건을 만족하지 않으면 원래 명제는 거짓이다. 따라서 ‘어떤’으로 바꾸고, 부등호는 ${m(">")}로 바꾼다.`]);
    }),
    alternative("test-existence","유한집합에서 존재 명제의 참·거짓 판단",rng=>{
      const n=rand(rng,3,7), exists=rng()<.5, a=exists?n:n+1, square=a*a;
      const reason=exists?`참이다. ${m(`x=${a}`)}가 성립 예이다.`:`거짓이다. 집합에서 가장 큰 제곱값은 ${m(n*n)}이다.`;
      const wrong=exists?[`거짓이다. ${m("x=1")}에서 성립하지 않는다.`,`참이다. ${m(`x=${n+1}`)}이 전체집합의 원소이다.`]
        :[`참이다. ${m(`x=${a}`)}가 성립 예이다.`,`거짓이다. ${m(`x=${a}`)}의 제곱은 ${m(n*n)}이다.`];
      return problem(`전체집합이 ${m(tex`\\{1,2,\\ldots,${n}\\}`)}이다.`,[],
        `‘어떤 원소 ${m("x")}에 대하여 ${m(`x^2=${square}`)}이다.’의 참·거짓과 근거를 고르시오.`,
        choice(rng,reason,wrong),[`‘어떤’ 명제는 전체집합 안에서 조건을 만족하는 원소가 하나 이상이면 참이다. ${reason}`]);
    }),
  ]);

  b("suff-necessary-truth","충분·필요조건과 명제의 참, 거짓",one("한쪽이 성립하지 않는 관계와 삼단논법 결합",rng=>{
    const reverse=rng()<.5;
    const [p,q,r]=pick(rng,[["p","q","r"],["q","r","p"],["r","p","q"]]);
    const options=["참, 거짓","거짓, 참","참, 참","거짓, 거짓"];
    const index=reverse ? 1 : 0;
    const relations=reverse ? tex`${r}\\Rightarrow ${p},\\quad ${p}\\Rightarrow ${r}` : tex`${p}\\Rightarrow ${r},\\quad ${r}\\Rightarrow ${p}`;
    return problem(`${m(p)}는 ${m(q)}의 충분조건이지만 필요조건은 아니고, ${m(q)}는 ${m(r)}의 충분조건이다.`,[relations],
      "두 명제의 참과 거짓을 순서대로 고르시오.",choice(rng,options[index],options.filter((_,i)=>i!==index)),[
        `삼단논법으로 ${m(tex`${p}\\Rightarrow ${r}`)}이다. 또한 ${m(q)}가 참이고 ${m(p)}가 거짓인 예가 있다. 그 예에서 ${m(r)}도 참이므로 ${m(tex`${r}\\Rightarrow ${p}`)}는 거짓이다.`,
      ]);
  }));

  b("contrapositive-proof","대우를 이용한 명제의 증명",one("대우의 전제와 인수분해를 함께 선택",rng=>{
    const a=signed(rng), b=a+rand(rng,2,6);
    const p=m(`(x-(${a}))(x-(${b}))=0`), q=m(tex`x=${a}\\ \\lor\\ x=${b}`);
    const nonzero=m(tex`x\\ne${a}\\ \\land\\ x\\ne${b}`);
    const correct=`${nonzero}라 놓는다. 두 인수가 0이 아니므로 그 곱도 0이 아니다.`;
    return problem(`실수에 대해 ‘${p}이면 ${q}이다’를 대우로 증명하려고 한다.`,[],"대우의 가정과 결론을 올바르게 연결한 것을 고르시오.",
      choice(rng,correct,[
        `${m(tex`x\\ne${a}\\ \\lor\\ x\\ne${b}`)}라 놓는다. 적어도 한 인수가 0이 아니므로 곱도 0이 아니다.`,
        `${nonzero}라 놓는다. 두 인수가 0이 아니므로 그 곱은 0이다.`,
        `${q}라 놓는다. 두 인수 중 하나가 0이므로 그 곱도 0이다.`,
      ]),[
        "결론이 두 등식의 ‘또는’이므로, 대우의 전제는 두 등식이 모두 성립하지 않는다는 것이다. 실수에서 0이 아닌 두 수의 곱은 0이 아니다.",
      ]);
  }));

  foundations("a-square-positive","absolute","실수 제곱의 부호와 등호",rng=>{
    const a=signed(rng), right=m(`x=${a}`);
    return problem("실수에 대해 다음 부등식이 성립한다.",[tex`(x-(${a}))^2\\ge0`],"등호가 성립하는 경우를 고르시오.",
      choice(rng,right,[m(`x=${a+1}`),m(`x=${a-1}`),m(`x=${a+2}`)]),["제곱이 0이면 밑도 0이다."]);
  });
  foundations("a-amgm","absolute","두 양수의 산술평균과 기하평균",rng=>{
    const x=rand(rng,1,5), y=x+rand(rng,1,4), a=x*x,b=y*y;
    const geometric=rng()<.5;
    return problem(`두 양수 ${m(a)}와 ${m(b)}가 있다.`,[],`두 수의 ${geometric?"기하평균":"산술평균"}을 구하시오.`,
      scalar(geometric?x*y:(a+b)/2),
      [geometric?`기하평균은 ${m(tex`\\sqrt{${a}\\cdot${b}}`)}이다.`:`산술평균은 ${m(tex`\\frac{${a}+${b}}{2}`)}이다.`]);
  });
  foundations("a-cauchy","absolute","코시-슈바르츠 부등식의 형태",rng=>{
    const [x,y]=pick(rng, [["x","y"],["a","b"],["u","v"]]);
    const a=rand(rng,2,5), b=a+rand(rng,1,4);
    const correct=m(tex`(${a*a}+${b*b})(${x}^2+${y}^2)`);
    return problem("코시-슈바르츠 부등식의 우변을 채우자.", [tex`(${a}${x}+${b}${y})^2\\le \\square`],
      "빈칸에 알맞은 식을 고르시오.",choice(rng,correct,[
        m(`(${a}+${b})(${x}^2+${y}^2)`),m(`(${a*a}+${b*b})(${x}+${y})`),m(`${a*a}${x}^2+${b*b}${y}^2`)
      ]),["두 수의 쌍마다 제곱합을 만들고 서로 곱한다."]);
  });

  const shiftedSum = alternative("shift-domain","양수 치환이 필요한 산술기하평균",rng=>{
    const h=signed(rng), a=rand(rng,1,4), k=rand(rng,2,6), d=a*k*k;
    return problem(`실수 ${m("x")}가 ${m(`x>${h}`)}를 만족한다.`, [tex`${a}(x-(${h}))+\\frac{${d}}{x-(${h})}`],
      "이 식의 최솟값을 구하시오.",scalar(2*a*k),
      [`${m(`t=x-(${h})`)}는 양수이다. 두 항의 곱은 ${m(a*d)}이고 ${m(`t=${k}`)}에서 두 항이 같으므로 최솟값은 ${m(2*a*k)}이다.`]);
  });
  add("amgm-sum","absolute","산술기하평균에서 합의 최솟값 구하기","B",[shiftedSum]);

  add("amgm-fixed","absolute","산술기하평균에서 합 또는 곱이 일정할 때","B",[alternative("weighted","가중합 또는 가중곱을 일정한 형태로 바꾸기",rng=>{
    const a=rand(rng,2,4), b=rand(rng,2,5), t=rand(rng,2,5), s=a*b*t, fixedSum=rng()<.5;
    return problem("두 양수에 대한 조건이다.",[fixedSum?`${a}x+${b}y=${2*s}`:`xy=${a*b*t*t}`],
      `${m(fixedSum?"xy":`${a}x+${b}y`)}의 ${fixedSum?"최댓값":"최솟값"}을 구하시오.`,
      scalar(fixedSum?s*s/(a*b):2*s),
      [`두 양수 ${m(`${a}x,${b}y`)}에 산술기하평균을 적용한다. 두 값이 모두 ${m(s)}일 때 등호가 성립한다.`]);
  })]);

  foundations("a-set-empty","sets","조건을 만족하는 원소가 없는 집합",rng=>{
    const a=signed(rng,4),n=rand(rng,2,5),xs=finite(a,a+n-1);
    return problem(`전체집합은 ${m(setTeX(xs))}이다.`,[],`${m(`x>${xs.at(-1)}`)}인 원소의 집합을 구하시오.`,
      set([]),["전체집합의 최댓값보다 큰 원소는 주어진 범위 안에 없다."]);
  });
  foundations("a-set-cardinality-list","sets","원소나열법에서 중복을 한 번만 세기",rng=>{
    const a=signed(rng,4),n=rand(rng,3,5),xs=finite(a,a+n-1);
    return problem("다음과 같이 원소를 나열해 집합을 나타냈다.",[`A=${setTeX([...xs,xs[1],xs[0]])}`],
      "서로 다른 원소의 개수를 구하시오.",scalar(n),["같은 값이 반복되더라도 집합의 원소는 하나이다."]);
  });
  foundations("a-set-builder-multiples","sets","유한 범위에서 조건제시법을 원소나열법으로",rng=>{
    const n=rand(rng,2,5),a=rand(rng,1,3),count=rand(rng,2,4);
    return problem(`${m(a*n)} 이상 ${m((a+count)*n-1)} 이하인 정수 중에서 ${m(n)}의 배수를 모은다.`,[],
      "해당 집합을 원소나열법으로 쓰시오.",set(finite(a,a+count-1).map(x=>x*n)),["범위 안에서 작은 배수부터 차례로 찾는다."]);
  });
  foundations("a-set-direct-difference","sets","두 유한 집합의 차집합",rng=>{
    const a=signed(rng,4),xs=finite(a,a+3),ys=finite(a+2,a+4);
    return problem("두 집합이 다음과 같다.",[`A=${setTeX(xs)},\\quad B=${setTeX(ys)}`],
      `차집합 ${m("A-B")}의 원소를 구하시오.`,set(xs.slice(0,2)),["A의 원소 중 B에도 속하는 것을 뺀다."]);
  });
  define("set-application-neither","sets","설문에서 둘 다 선택하지 않은 인원","B","설문에서 둘 다 선택하지 않은 인원",rng=>{
    const a=rand(rng,2,5),b=rand(rng,2,5),c=rand(rng,2,5),d=rand(rng,2,5);
    return problem(`학생 ${m(a+b+c+d)}명에게 농구와 배드민턴 선호를 조사했다. 농구를 고른 학생은 ${m(a+c)}명, 배드민턴을 고른 학생은 ${m(b+c)}명이며 둘 다 고른 학생은 ${m(c)}명이다.`,[],
      "둘 다 고르지 않은 학생은 몇 명인가?",scalar(d),["두 종목 중 적어도 하나를 고른 인원을 먼저 구한 뒤 전체에서 뺀다."]);
  });
  define("set-complement-inclusion-missing","sets","포함 관계를 뒤집는 여집합의 차집합","B","포함 관계를 뒤집는 여집합의 차집합",rng=>{
    const a=signed(rng,4),n=rand(rng,4,6),u=finite(a,a+n+1),b=u.slice(1,-1),x=b.slice(1,-1);
    return problem("전체집합과 두 부분집합이 다음과 같다.",[`U=${setTeX(u)},\\quad A=${setTeX(x)},\\quad B=${setTeX(b)}`],
      `${m("A^c-B^c")}를 구하시오.`,set([b[0],b.at(-1)]),
      [`${m("A^c")}에는 A 밖이 들어가고, 그중 B 밖을 빼면 B 안에서 A에 없는 원소만 남는다.`]);
  });

  foundations("a-proposition-antecedent","propositions","가정과 결론을 구별",rng=>{
    const a=signed(rng,4),b=a-rand(rng,2,5),opt=[m(`x>${a}`),m(`x>${b}`),m(`x=${a}`)];
    return problem("다음 명제가 있다.",[tex`x>${a}\\Rightarrow x>${b}`],"명제의 가정에 해당하는 조건을 고르시오.",
      selectOption(rng,opt),["화살표의 왼쪽이 가정이다."]);
  });
  foundations("a-proposition-implication-converse","propositions","명제의 역 만들기",rng=>{
    const a=signed(rng,4),b=a+rand(rng,2,5);
    const opts=[tex`x>${b}\\Rightarrow x>${a}`,tex`x>${a}\\Rightarrow x>${b}`,tex`x\\le${b}\\Rightarrow x\\le${a}`].map(m);
    return problem("실수 전체에서 다음 명제를 생각하자.",[tex`x>${a}\\Rightarrow x>${b}`],
      "주어진 명제의 역을 고르시오.",selectOption(rng,opts),["역은 가정과 결론의 자리를 바꿔 만든다."]);
  });
  foundations("a-proposition-compare-squares","propositions","실수의 제곱 부호에 관한 명제 판별",rng=>{
    const n=rand(rng,2,5),positive=rng()<.5;
    return problem("다음 명제가 주어져 있다.",[tex`(${-n})^2${positive?">":"<"}0`],
      "이 명제의 참과 거짓을 판별하시오.",selectOption(rng,["참","거짓"],positive?0:1),
      [`음수라도 제곱하면 ${m(n*n)}이 되어 양수이다.`]);
  });
  define("proposition-converse-and-contrapositive","propositions","한 명제의 역과 대우의 진릿값 비교","B","한 명제의 역과 대우의 진릿값 비교",rng=>{
    const a=signed(rng,4),d=rand(rng,2,5),b=a+d,forward=rng()<.5;
    const p=forward?b:a,q=forward?a:b;
    return problem("실수 전체에서 다음 명제를 생각하자.",[tex`x>${p}\\Rightarrow x>${q}`],
      "역과 대우의 진릿값을 순서대로 고르시오.",selectOption(rng,["거짓, 참","참, 거짓","참, 참","거짓, 거짓"],forward?0:1),
      ["역은 가정과 결론을 바꾸어 참인지 확인한다. 대우의 진릿값은 원래 명제와 같다."]);
  });
  define("proposition-quantifier-intersection","propositions","‘어떤’과 ‘그리고’가 포함된 명제의 진릿값","B","‘어떤’과 ‘그리고’가 포함된 명제의 진릿값",rng=>{
    const a=signed(rng,4),b=a+rand(rng,2,5),good=rng()<.5,limit=good?b:b-1;
    const opts=["참","거짓"];
    return problem(`전체집합은 ${m(setTeX(finite(a,b+1)))}이다.`,[],
      `‘어떤 원소 ${m("x")}에 대하여 ${m(tex`x\\ge${b}`)}이고 ${m(tex`x\\le${limit}`)}이다.’의 참과 거짓을 판별하시오.`,
      selectOption(rng,opts,good?0:1),["‘그리고’의 진리집합은 두 조건을 동시에 만족하는 원소의 집합이다. 그 안에 원소가 하나라도 있는지 확인한다."]);
  });
})();


;

/* answer-paths.js */
(() => {
  "use strict";
  const {m,scalar,point,pick}=globalThis.ForgeTopics;
  const pointType={baseType:"Point",capabilities:["x","y","coordinates","coordinateSum"],domain:"real"};
  // 두 값이 명시된 결과에 공통으로 적용하는 선형식 답 경로.
  // 질문과 값 추출만 결과 타입이 제공하며 식·계산·해설은 공유한다.
  function linearPairPaths({values, question, names}) {
    const coefficients=[-4,-3,-2,-1,1,2,3,4];
    const forms=coefficients.flatMap(a=>coefficients.map(b=>[a,b]));
    return forms.map(([a,b])=>({
      id:`linear-${a}-${b}`, label:"두 값의 선형식", operations:["SelectPair","LinearCombination"], outputType:"Scalar",
      requirements:["two-determined-values"],
      transform:data=>{
        const pair=values(data), symbols=names(data);
        if (!Array.isArray(pair) || pair.length!==2 || !pair.every(Number.isFinite)) throw new Error("Linear answer requires two finite values");
        const expr=globalThis.ForgeTopics.linear(a,symbols[0],b,symbols[1]);
        const value=a*pair[0]+b*pair[1];
        return {...data,question:question(data,expr,symbols),answer:scalar(value),answerLabels:undefined,
          solution:[...data.solution,`${m(symbols[0]+"="+pair[0])}, ${m(symbols[1]+"="+pair[1])}이므로 ${m(expr+"="+value)}이다.`]};
      },
    }));
  }
  function pairValuePaths(options) {
    const {values,names,question,labels}=options;
    const direct=[0,1,2].map(index=>({
      id:index===2?"pair":"component-"+index,
      label:index===2?"두 값의 순서쌍":"각 상수의 값",
      operations:["SelectPair",index===2?"OrderedPair":"SelectComponent"],
      outputType:index===2?"Point":"Scalar", requirements:["two-determined-values"],
      transform:data=>{
        const pair=values(data), symbols=names(data);
        if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isFinite))throw new Error("Pair answer requires two finite values");
        const expr=index===2?`(${symbols.join(",")})`:symbols[index];
        const answer=index===2?point(pair):scalar(pair[index]);
        return {...data,question:question(data,expr,symbols,index===2?"pair":"scalar"),answer,
          answerLabels:index===2?(labels?.(data) ?? symbols):undefined,
          solution:[...data.solution,index===2?`구하는 순서쌍은 ${answer.text}이다.`:`${m(symbols[0]+"="+pair[0])}, ${m(symbols[1]+"="+pair[1])}이다.`]};
      },
    }));
    return [...direct,...linearPairPaths(options)];
  }
  const pointLinearPaths=subject=>pairValuePaths({
    values:data=>data.result ?? data.answer.value,
    names:()=>["a","b"], labels:()=>["x","y"],
    question:(_data,expr,_symbols,kind)=>kind==="pair" ? `${subject}의 좌표를 구하시오.` : `${subject}의 좌표를 ${m("(a,b)")}라 할 때, ${m(expr)}의 값을 구하시오.`,
  });
  const paths=[
    {id:"coordinates",label:"두 좌표",operations:["Coordinates"],outputType:"Point",resolve:p=>point(p)},
    {id:"x",label:"x좌표",operations:["XCoordinate"],outputType:"Scalar",resolve:p=>scalar(p[0])},
    {id:"y",label:"y좌표",operations:["YCoordinate"],outputType:"Scalar",resolve:p=>scalar(p[1])},
    {id:"sum",label:"좌표의 합",operations:["XCoordinate","YCoordinate","Sum"],outputType:"Scalar",resolve:p=>scalar(p[0]+p[1])},
  ];
  // Select structure, answer family, then presentation independently. Adding
  // coefficient variants must not increase a template's probability of selection.
  const family=path=>path?.family ?? (path?.id.startsWith("linear-")?"linear":path?.id ?? "direct");
  function choose(variants,avoidPaths=[],rng=Math.random) {
    if(!variants.length) throw new Error("No problem structures available");
    const history=avoidPaths.slice(-128).map(id=>id.replace(/\/affine$/, ""));
    const leastUsed=(items,count)=>{
      const counts=items.map(count), min=Math.min(...counts);
      return pick(rng,items.filter((_,i)=>counts[i]===min));
    };
    const belongs=(id,v)=>id.startsWith(v.id+"/")||id.startsWith(v.id+"|");
    const variant=leastUsed(variants,v=>history.filter(id=>belongs(id,v)).length);
    const paths=variant.answerPaths||[null];
    const groups=[...new Set(paths.map(family))];
    const pathId=p=>(p?variant.id+"/"+p.id:variant.id);
    const group=leastUsed(groups,g=>history.filter(id=>paths.some(p=>family(p)===g&&id.startsWith(pathId(p)+"|"))).length);
    const path=leastUsed(paths.filter(p=>family(p)===group),p=>history.filter(id=>id.startsWith(pathId(p)+"|")).length);
    const kind=path?.outputType ?? variant.answerKind;
    const formats=["Scalar","Point","FiniteSet","IntervalSet","scalar","point","set","interval","boolean"].includes(kind)?["written","choice"]:["written"];
    const presentation=leastUsed(formats,f=>history.filter(id=>id===pathId(path)+"|"+f).length);
    return {variant,path,presentation,rng,id:pathId(path)+"|"+presentation};
  }
  // Symbol identity is declared by the template; never infer it from prose.
  function scalarValuePaths(symbol) {
    const direct={id:"value",family:"value",label:"상수의 값",passthrough:true,outputType:"Scalar",operations:["SelectScalar"]};
    const affine=[];
    for(let n=1;n<=4;n++) for(let offset=-4;offset<=4;offset++) {
      if(n===1&&offset===0) continue;
      affine.push({id:`affine-${n}-${offset}`,family:"affine",label:"상수의 일차식",outputType:"Scalar",operations:["SelectScalar","AffineExpression"],requirements:["determined-scalar"],
        transform:data=>affineScalar(data,()=>0,symbol,{n,offset})});
    }
    return [direct,...affine];
  }
  function resolvePath(plan,data) {
    if(plan.path?.transform) return plan.path.transform(data);
    if(!plan.path || plan.path.passthrough) return data;
    const p=data.result ?? data.answer.value;
    const subject=plan.variant.subject;
    const path=plan.path;
    const questions={
      coordinates:subject+"의 좌표를 구하시오.",
      x:subject+"의 "+m("x")+"좌표를 구하시오.",
      y:subject+"의 "+m("y")+"좌표를 구하시오.",
      sum:subject+"의 두 좌표의 합을 구하시오.",
    };
    const answer=path.resolve(p);
    return {...data,question:path.question?.(data) ?? questions[path.id],answer,answerLabels:path.id==="coordinates"?data.answerLabels:undefined,
      solution:[...data.solution,"요구한 "+path.label+"를 구하면 "+(answer.kind==="scalar"?m(answer.text):answer.text)+"이다."]};
  }
  // Evaluate the preselected scalar expression against the constructed result.
  function affineScalar(data,rng,symbol,coefficients) {
    if (data.answer?.kind!=="scalar" || !Number.isFinite(data.answer.value)) return null;
    if (!symbol) return null;
    const {n,offset}=coefficients ?? {n:1+Math.floor(rng()*4),offset:Math.floor(rng()*9)-4};
    if(n===1 && offset===0) return null;
    const expr=(n===1?"":n)+symbol+(offset===0?"":offset>0?"+"+offset:String(offset));
    const value=n*data.answer.value+offset;
    if(!Number.isFinite(value)) return null;
    return {...data,question:`${m(expr)}의 값을 구하시오.`,answer:scalar(value),
      solution:[...data.solution,`${m(symbol+"="+data.answer.value)}이므로 ${m(expr+"="+value)}이다.`]};
  }
  function apply(plan,data) {
    let output=resolvePath(plan,data);
    return globalThis.ForgeVariations?.present(output,plan.presentation,plan.rng) ?? output;
  }
  function configure(id,subject) {
    const entry=globalThis.ForgeTopics.types[id];
    if(!entry) throw new Error("Unknown point template "+id);
    entry.variants=entry.variants.map(variant=>({...variant,subject,resultType:pointType,answerPaths:[...paths,...pointLinearPaths(subject)]}));
  }
  ForgeAnswerPaths = globalThis.ForgeAnswerPaths = Object.freeze({choose,apply,configure,pointType,pointPaths:paths,linearPairPaths,pairValuePaths,pointLinearPaths,affineScalar,scalarValuePaths});
})();


;

/* expression-compiler.js */
(() => {
  "use strict";
  const {tex,m,problem,scalar,rand,pick,signed,shift,term,linear,symbols}=ForgeTopics;
  const affine=(a,x,b)=>shift(term(a,x),-b);
  const values=(min,max)=>Array.from({length:max-min+1},(_,i)=>i+min);
  const pairs=(first,second)=>first.flatMap(a=>second.map(b=>[a,b]));
  const fact=(statement,accepts)=>({statement,accepts});
  const absolute=expression=>"|"+expression+"|";
  const square=(name,center)=>center?"("+shift(name,center)+")^2":name+"^2";

  // Candidate models represent the branches in the symbolic solution and
  // also include witnesses outside each individual observation.
  function compilePlan(plan) {
    const {operation,principle,candidates,facts,read,describe,question,solution}=plan;
    const split=plan.split??facts.length-1;
    const apply=(models,start,end)=>models.filter(model=>facts.slice(start,end).every(item=>item.accepts(model)));
    const branches=apply(candidates,0,split);
    const survivors=apply(branches,split,facts.length);
    const answers=[...new Set(survivors.map(read))];
    if(answers.length!==1||!Number.isFinite(answers[0]))throw Error("The conditions must determine a unique answer");
    const [answer]=answers;
    const conditionChecks=facts.map(({statement},i)=>{
      const witness=candidates.find(candidate=>facts.every((item,j)=>i===j||item.accepts(candidate))&&read(candidate)!==answer&&Number.isFinite(read(candidate)));
      if(witness===undefined)throw Error(operation+": no alternative after removing "+statement);
      return {statement,witness:describe(witness),alternative:read(witness)};
    });
    const describeAll=models=>models.map(describe).join(" 또는 ");
    const branchInputs=facts.slice(0,split).map((_,i)=>"condition"+i);
    const selectorInputs=facts.slice(split).map((_,i)=>"condition"+(split+i));
    const graph=[facts.map(({statement},i)=>({id:"condition"+i,label:"조건 "+(i+1),prose:statement})),
      [{id:"branches",operation:plan.branchOperation??"solveAbsoluteEquation",label:plan.branchLabel??"거리·절댓값 조건의 해 후보",
        from:branchInputs,prose:plan.branchDescription??describeAll(branches),...(plan.branchDescription?{}:{value:branches})}],
      [{id:"selection",operation:"filterCandidates",label:"남은 조건으로 후보 선택",
        from:["branches",...selectorInputs],prose:describeAll(survivors),value:survivors}]];
    if(!plan.answerIsSelected)graph.push([{id:"result",operation:plan.outputOperation??"evaluateExpression",label:"선택된 해에서 구할 값 계산",
      math:String(answer),value:answer,from:["selection"]}]);
    return {...ForgeNotation.layoutQuestion(problem([plan.intro,...facts.map(item=>item.statement)].join(" "),[],question,scalar(answer),solution),{fractionsOnly:false}),
      inspection:{environment:"expression",graph,principle,conditionChecks,conditions:[],
        questionOperation:operation,reasoningKind:plan.kind,operations:graph.slice(1).flat().map(node=>node.operation),variables:[{key:"정답",label:"구할 값",value:answer,given:false,target:true,seed:false}]}};
  }

  function parallel(rng,distance) {
    const midpoint=rand(rng,-3,3), radius=rand(rng,1,3), left=midpoint-radius, right=midpoint+radius;
    const magnitude=distance?5*rand(rng,1,2):rand(rng,2,6), sign=pick(rng,[-1,1]);
    const slope=distance?3/4:signed(rng,4), offset=rand(rng,-5,5);
    const f=x=>slope*x+offset;
    const d=x=>"f("+x+")-g("+x+")";
    const domain=[-2*magnitude,-magnitude,0,magnitude,2*magnitude];
    const models=pairs(domain,domain).filter(([a,b])=>slope!==(b-a)/(2*radius));
    const g=(x,[a,b])=>f(x)-a-(b-a)*(x-left)/(2*radius);
    const sample=midpoint+3*radius*pick(rng,[-1,1]);
    const twoValues=!distance&&rng()<.5;
    const query="g("+sample+")"+(twoValues?"+g("+midpoint+")":"");
    const answerFor=distance?([a,b])=>a===b?Math.abs(a)*4/5:0
      :model=>g(sample,model)+(twoValues?g(midpoint,model):0);
    const symbol=distance?tex`\frac{3}{4}`:slope===1?"":slope===-1?"-":String(slope);
    const rule="f(x)="+shift(symbol+"x",-offset);
    const bound="f("+midpoint+")"+(sign>0?">":"<")+"g("+midpoint+")";
    const gSlope=model=>slope-(model[1]-model[0])/(2*radius);
    return {operation:distance?"parallelDistance":"parallelThrough",branchOperation:"solveAffineFromValues",branchLabel:"두 점에서의 차로 가능한 일차함수 복원",outputOperation:distance?"parallelLineDistance":"evaluateFunction",principle:"두 일차함수의 차는 중점에서 양 끝 함숫값의 평균",
      intro:`${m(rule)}이고 ${m("g(x)")}는 일차함수이다.`,candidates:models,
      facts:[fact(`${m(absolute(d(left))+"="+magnitude)}이다.`,([a])=>Math.abs(a)===magnitude),
        fact(`${m(absolute(d(right))+"="+magnitude)}이다.`,([,b])=>Math.abs(b)===magnitude),
        fact(`${m(bound)}이다.`,([a,b])=>sign*(a+b)>0)],
      read:answerFor,describe:model=>m("g(x)="+formula(gSlope(model),g(0,model))),
      question:distance?"두 함수의 그래프 위에서 각각 한 점을 택할 때, 두 점 사이 거리의 최솟값을 구하시오."
        :`${m(query)}의 값을 구하시오.`,
      solution:[`두 함숫값의 차는 일차식이므로 ${m(d(midpoint))}는 양 끝에서의 차의 평균이다. 양 끝의 부호가 다르면 평균이 ${m(0)}이다.`,
        `중점에서의 부호 조건을 만족하려면 양 끝에서의 차는 모두 ${m(sign*magnitude)}이다. 따라서 두 함수의 차는 일정하다.`,
        distance?`두 그래프는 평행하며, 두 그래프 사이의 거리는 ${m(tex`\frac{${magnitude}}{\sqrt{1+(\frac34)^2}}=${answerFor([sign*magnitude,sign*magnitude])}`)}이다.`
          :`${m("g(x)="+shift(symbol+"x",sign*magnitude-offset))}이므로 ${m(query+"="+answerFor([sign*magnitude,sign*magnitude]))}이다.`]};
  }

  function fraction(n) {
    for(let d=1;d<=120;d++) {
      const p=Math.round(n*d);
      if(Math.abs(p-n*d)<1e-8)return d===1?String(p):tex`${p<0?"-":""}\frac{${Math.abs(p)}}{${d}}`;
    }
    throw Error("Expected rational value");
  }
  const formula=(a,b)=>(a===1?"":a===-1?"-":fraction(a))+"x"+(b===0?"":(b>0?"+":"")+fraction(b));

  function perpendicular(rng) {
    const den=rand(rng,2,4), length=den*rand(rng,1,2), sign=pick(rng,[-1,1]);
    const a=rand(rng,-4,4), b=rand(rng,-4,4);
    const first=`f(${length})-f(0)`, second=`g(${length})-g(0)`;
    const query=pick(rng,[`g(${length})`,`g(${length})+f(${length})`]);
    const read=([p,q])=>b+q*length+(query.includes("+")?a+p*length/den:0);
    return {operation:"perpendicularThrough",branchOperation:"solveSlopeProduct",branchLabel:"변화량과 곱 조건으로 기울기 후보 결정",outputOperation:"evaluateFunction",principle:"함숫값의 변화량을 비교하고 기울기의 부호를 판별",
      intro:`두 일차함수 ${m("f(x),g(x)")}에서 ${m("f(0)="+a)}, ${m("g(0)="+b)}이다.`,
      candidates:pairs([-den,-1,1,den],[-den-1,-den,-1,1,den,den+1]),
      facts:[fact(`${m(absolute(first)+"="+length/den)}이다.`,([p])=>Math.abs(p)===1),
        fact(`${m("("+first+")("+second+")="+(-length*length))}이다.`,([p,q])=>p*q===-den),
        fact(`${m("g("+length+")"+(sign>0?">":"<")+"g(0)")}이다.`,([,q])=>sign*q>0)],
      read,describe:([p,q])=>m("f(x)="+formula(p/den,a)+",\\quad g(x)="+formula(q,b)),
      question:`${m(query)}의 값을 구하시오.`,
      solution:[`두 변화량을 ${m(length)}로 나누면 각 함수의 기울기가 된다. 따라서 첫째 기울기의 절댓값은 ${m(tex`\frac1{${den}}`)}이고 두 기울기의 곱은 ${m(-1)}이다.`,
        `둘째 함수의 증가·감소 조건으로 두 기울기를 정하면 ${m("f(x)="+formula(-sign/den,a))}, ${m("g(x)="+formula(sign*den,b))}이다. 따라서 답은 ${m(read([-sign,sign*den]))}이다.`]};
  }

  function intersection(rng) {
    const center=rand(rng,-4,4), ordinate=rand(rng,-5,5), radius=rand(rng,1,3), sign=pick(rng,[-1,1]);
    const a=rand(rng,3,5), second=signed(rng,2);
    const [k]=symbols.constants(rng,1,["x"]);
    const f=x=>a*(x-center)+ordinate, g=x=>second*(x-center)+ordinate;
    const gap=(a-second)*radius, delta=`f(${k})-g(${k})`;
    const [query,projection]=pick(rng,[[k,x=>x],[`f(${k})`,f],[`g(${k})`,g],[`f(${k})+g(${k})`,x=>f(x)+g(x)]]);
    const useSum=rng()<.5;
    const side=useSum?`f(${k})+g(${k})${sign>0?">":"<"}${2*ordinate}`:`f(${k})${sign>0?">":"<"}g(${k})`;
    return {operation:"intersection",branchOperation:"solveFunctionDifference",branchLabel:"두 일차함수의 차에 대한 절댓값 방정식",principle:"교점에서는 함숫값의 차가 0이고, 교점 양쪽에서 차의 부호가 바뀜",
      intro:`${m("f(x)="+affine(a,"x",f(0)))}, ${m("g(x)="+affine(second,"x",g(0)))}이다.`,
      candidates:values(center-radius-1,center+radius+1),
      facts:[fact(`${m(absolute(delta)+"="+gap)}이다.`,x=>Math.abs(f(x)-g(x))===gap),
        fact(`${m(side)}이다.`,x=>sign*(useSum?f(x)+g(x)-2*ordinate:f(x)-g(x))>0)],
      answerIsSelected:query===k,read:projection,describe:x=>m(k+"="+x),question:`${m(query)}의 값을 구하시오.`,
      solution:[`두 함숫값의 차는 ${m(term(a-second,"("+shift(k,center)+")"))}이다. 따라서 교점의 가로 좌표 ${m(center)}에서 ${m(radius)}만큼 떨어진 두 값이 가능하다.`,
        `${useSum?"두 함수의 합은 기울기가 양수이고 교점에서의 값은 "+m(2*ordinate)+"이다. ":""}부호 조건을 적용하면 ${m(k+"="+(center+sign*radius))}이고, 구하는 값은 ${m(projection(center+sign*radius))}이다.`]};
  }

  function distance(rng) {
    const center=rand(rng,-4,4), scale=rand(rng,1,2), sign=pick(rng,[-1,1]);
    const leg=3*scale, height=4*scale, length=5*scale;
    const [k]=symbols.constants(rng,1,["x"]);
    const norm=tex`\sqrt{${square(k,center)}+${height**2}}`;
    const useComparison=rng()<.5, mark=center+sign;
    const bound=useComparison?absolute(shift(k,mark))+"<"+absolute(shift(k,center-sign)):k+(sign>0?">":"<")+center;
    return {operation:"distance",principle:"거리는 좌우 대칭인 두 값을 허용하고 비교 조건으로 하나를 선택",
      intro:`실수 ${m(k)}에 대하여`,candidates:values(center-leg-1,center+leg+1),
      facts:[fact(`${m(norm+"="+length)}이다.`,x=>(x-center)**2+height**2===length**2),
        fact(`${m(bound)}이다.`,x=>sign*(x-center)>0)],
      answerIsSelected:true,read:x=>x,describe:x=>m(k+"="+x),question:`${m(k)}의 값을 구하시오.`,
      solution:[`양변을 제곱하면 ${m(absolute(shift(k,center))+"="+leg)}이다. 따라서 ${m(k)}의 후보는 ${m(center-leg+", "+(center+leg))}이다.`,
        `비교 조건을 만족시키는 값은 ${m(center+sign*leg)}이다.`]};
  }

  function minimum(rng) {
    const x=rand(rng,-3,3), y=rand(rng,-3,3), left=x-rand(rng,1,3), right=x+rand(rng,1,3);
    const coefficient=signed(rng,2), sum=linear(1,"x",coefficient,"y"), constant=x+coefficient*y;
    const expression=[left,right].map(end=>tex`\sqrt{${square("x",end)}+${square("y",y)}}`).join("+");
    return {operation:"minimum",branchOperation:"argminEquality",branchLabel:"삼각부등식의 등호 조건",branchDescription:m(tex`y=${y},\quad ${left}\le x\le ${right}`),principle:"삼각부등식의 등호는 두 고정점을 잇는 선분에서 성립",
      intro:`실수 ${m("x,y")}에 대하여`,
      candidates:[[x,y],[left,y],[right,y],[x-coefficient,y+1]],
      facts:[fact(`${m(expression)}의 값이 최소이다.`,([a,b])=>b===y&&left<=a&&a<=right),
        fact(`${m(sum+"="+constant)}이다.`,([a,b])=>a+coefficient*b===constant)],
      read:([a,b])=>a+3*b,describe:([a,b])=>m("(x,y)=("+a+","+b+")"),question:`${m("x+3y")}의 값을 구하시오.`,
      solution:[`삼각부등식의 등호가 성립하려면 ${m("y="+y)}이고 ${m(tex`${left}\le x\le ${right}`)}여야 한다.`,
        `${m(sum+"="+constant)}에 대입하면 ${m("x="+x)}이다. 따라서 ${m("x+3y="+(x+3*y))}이다.`]};
  }

  function minimumParameter(rng,sign) {
    const [u,v]=symbols.coordinates(rng), [k]=symbols.constants(rng,1,[u,v]);
    const scale=rand(rng,1,2), horizontal=3*scale, vertical=4*scale, length=5*scale;
    const first=rand(rng,-3,3), center=rand(rng,1,vertical-1)*sign;
    const answer=center+sign*vertical, other=center-sign*vertical;
    const expression=tex`\sqrt{${square(u,first)}+${square(v,center)}}+\sqrt{${square(u,first+horizontal)}+(${v}-${k})^2}`;
    const condition=k+(sign>0?">":"<")+"0";
    return {operation:"minimum",kind:"inverseMinimum",principle:"거리 합의 하한과 등호 조건으로 고정점 사이의 거리를 역산",
      intro:`실수 ${m(u+","+v)}에 대하여`,
      candidates:[answer,other,answer+sign],
      facts:[fact(`${m(expression)}의 최솟값은 ${m(length)}이다.`,n=>horizontal**2+(n-center)**2===length**2),
        fact(`${m(condition)}이다.`,n=>sign*n>0)],
      answerIsSelected:true,read:n=>n,describe:n=>m(k+"="+n),question:`${m(k)}의 값을 구하시오.`,
      solution:[`삼각부등식에 의해 최솟값은 두 고정점 사이의 거리이다. 따라서 ${m(horizontal**2+"+"+square(k,center)+"="+length**2)}이다.`,
        `두 후보 ${m(answer+", "+other)} 중 ${m(condition)}을 만족하는 값은 ${m(answer)}이다.`]};
  }

  const plans={distance,minimum,intersection,parallelThrough:rng=>parallel(rng,false),
    parallelDistance:rng=>parallel(rng,true),perpendicularThrough:perpendicular};
  const compile=(rng,concept,sign)=>compilePlan(sign?minimumParameter(rng,sign):plans[concept](rng));
  ForgeExpressionCompiler = globalThis.ForgeExpressionCompiler = Object.freeze({compile});
})();


;

/* geometry.js */
(() => {
  "use strict";

  const { tex, add, one, alternative, problem, choice, scalar, point, m, counted, separatingCondition, rand, pick, symbols, signed, shift, term, linear, coord, sq } = globalThis.ForgeTopics;
  const plus = ([a,b],[c,d]) => [a+c,b+d];
  const scale = ([a,b],n) => [a*n,b*n];
  const norm2 = ([x,y]) => x*x+y*y;
  const dot = ([a,b],[x,y]) => a*x+b*y;
  const pt = rng => [signed(rng),signed(rng)];
  const vector = rng => [signed(rng,3),signed(rng,3)];
  const pointName = (name,p) => m(name+coord(p));
  const addType = (id,label,mode,path,build) => add(id,"coordinate",label,mode,one(path,build));
  const basic = (id,label,build) => addType("a-"+id,label,"A",label,build);
  const b = (id,label,path,build) => addType(id,label,"B",path,build);
  const eqLine = ([a,b], c) => `${linear(a,"x",b,"y")}=${c}`;
  const radiusTriple = rng => pick(rng,[[3,4,5],[4,3,5],[5,12,13],[8,15,17]]);
  const notation = symbols.coordinates;
  const axis = rng => rand(rng,0,1);
  const axes=["x","y"];
  const line = (s,c) => `y=${s===0 ? c : shift(term(s,"x"),-c)}`;
  const weight = (w, item) => (w===1 ? "" : w)+item;

  const optimizationType={baseType:"OptimizationResult",capabilities:["minimum","uniqueMinimizer"],domain:"real"};
  const optimizationPaths=[
    {id:"minimum",label:"최솟값",operations:["Minimum"],outputType:"Scalar",requirements:["minimum-exists"],
      resolve:r=>scalar(r.minimum),question:()=>"이 식의 최솟값을 구하시오."},
    ...["x","y"].map((name,i)=>({id:name,label:name+"좌표",operations:["ArgMin",i===0?"XCoordinate":"YCoordinate"],
      outputType:"Scalar",requirements:["unique-minimizer"],resolve:r=>scalar(r.minimizer[i]),
      question:data=>data.symbol ? "식이 최소일 때 점 "+m(data.symbol)+"의 "+m(name)+"좌표를 구하시오."
        : "식이 최소일 때 "+m(data.notation[i])+"의 값을 구하시오."})),
    {id:"coordinates",label:"최소일 때의 좌표",operations:["ArgMin","Coordinates"],outputType:"Point",requirements:["unique-minimizer"],
      resolve:r=>point(r.minimizer),question:data=>data.symbol ? "식이 최소일 때 점 "+m(data.symbol)+"의 좌표를 구하시오."
        : "식이 최소일 때 "+m("("+data.notation.join(",")+")")+"를 순서대로 구하시오."},
    ...ForgeAnswerPaths.pairValuePaths({
      values:data=>data.result.minimizer,
      names:data=>data.symbol ? ["a","b"] : data.notation,
      labels:data=>data.symbol ? ["x","y"] : data.notation,
      question:(data,expr,_symbols,kind)=>data.symbol
        ? kind==="pair" ? `식이 최소일 때 점 ${m(data.symbol)}의 좌표를 구하시오.`
          : `식이 최소일 때 점 ${m(data.symbol)}의 좌표를 ${m("(a,b)")}라 하자. ${m(expr)}의 값을 구하시오.`
        : kind==="pair" ? `식이 최소일 때 ${m(data.notation.join(","))}의 값을 순서대로 구하시오.`
          : `식이 최소일 때 ${m(expr)}의 값을 구하시오.`,
    }),
  ];
  function optimization(intro,[expression],solution,minimum,minimizer,symbol,vars) {
    const prompt=expressionPrompt(expression,math=>`주어진 식은 ${math}이다.`,"");
    return {...problem([intro,prompt.text].filter(Boolean).join(" "),prompt.rows,"",point(minimizer),solution),
      result:{minimum,minimizer},symbol,notation:vars,answerLabels:symbol?undefined:vars};
  }

  function squaredSumPolynomial(points, weights, variables) {
    const coefficients=[
      ...variables.map(()=>weights.reduce((sum,w)=>sum+w,0)),
      ...variables.map((_,axis)=>points.reduce((sum,p,i)=>sum-2*weights[i]*p[axis],0)),
    ];
    const terms=[...variables.map(variable=>variable+"^2"),...variables]
      .flatMap((variable,i)=>coefficients[i]?[term(coefficients[i],variable)]:[]);
    const constant=points.reduce((sum,p,i)=>sum+weights[i]*norm2(p),0);
    return terms[0]+terms.slice(1).map(withSign).join("")+(constant?withSign(String(constant)):"");
  }

  function distanceSquares(rng, constrained, {environment}={}) {
    const h=pt(rng), d=vector(rng), [wa,wb]=pick(rng,[[1,1],[1,1],[1,2],[2,1],[2,3]]);
    const w=wa+wb, s=signed(rng,2), n=scale([-s,1],signed(rng,2));
    const center=constrained ? plus(h,n) : h;
    const a=plus(center,scale(d,wb)), b=plus(center,scale(d,-wa));
    const least=wa*wb*w*norm2(d), min=least+(constrained?w*norm2(n):0);
    const vars=notation(rng);
    const chooseNamed=rng()<.5;
    const named=environment?environment==="geometry":chooseNamed;
    const P="P";
    const display = named
      ? `${weight(wa,tex`\\overline{${P}A}^{\,2}`)}+${weight(wb,tex`\\overline{${P}B}^{\,2}`)}`
      : squaredSumPolynomial([a,b],[wa,wb],vars);
    const intro = named
      ? `두 점 ${pointName("A",a)}, ${pointName("B",b)}가 있다. 점 ${m(P)}는 ${constrained ? `직선 ${m(line(s,h[1]-s*h[0]))} 위를 움직인다.` : "좌표평면 위를 움직인다."}`
      : `두 변수 ${m(vars.join(","))}는 실수이다.${constrained ? " "+m(vars[1]+"="+shift(term(s,vars[0]),s*h[0]-h[1]))+"를 만족한다." : ""}`;
    const reduced=named ? tex`${w}\\overline{${P}M}^{\,2}+${least}` : `${w}[${sq(vars[0],center[0])}+${sq(vars[1],center[1])}]+${least}`;
    return optimization(intro,[display],[
      `각 좌표에 대해 제곱을 완성하면 ${m(reduced)}이다.${named ? ` 여기서 ${pointName("M",center)}이다.` : ""}`,
      constrained ? `중심 좌표 ${m(coord(center))}에서 조건의 직선에 내린 수선의 발은 ${m(coord(h))}이다. 그 점에서 제곱거리는 ${m(norm2(n))}이다.`
        : `두 좌표를 ${m(coord(center))}로 놓으면 두 제곱항이 모두 0이 된다.`,
      `최소가 되는 좌표는 ${m(coord(h))}이고 최솟값은 ${m(min)}이다.`,
    ],min,h,named?P:null,vars);
  }

  const distanceOffset = rng => {
    const u=rand(rng,2,4), v=rand(rng,1,u-1);
    const legs=[u*u-v*v,2*u*v];
    if(rng()<.5)legs.reverse();
    return legs.map(n=>n*pick(rng,[-1,1]));
  };

  // The coordinate plane supplies operators and port types. Shapes are derived
  // from the requested result type and an operation budget.
  const planeRules=[
    ["givenLine","line"],["given","point"],["moving","movingPoint"],
    ["lineThrough","line","point"],
    ["parallelThrough","line","point","line"],["perpendicularThrough","line","point","line"],
    ["intersection","point","line","line"],
    ["pointLine","scalar","point","line"],["parallelDistance","scalar","line","line"],
    ["section","point","point","point"],["coordinate","point","scalar"],
    ["distance","scalar","point","point"],["distance","pointFunction","point","movingPoint"],
    ["sum","scalar","scalar","scalar"],["sum","pointFunction","pointFunction","pointFunction"],
    ["minimum","scalar","pointFunction"],
  ];
  const shapeCache=new Map();
  function planeShapes(type,budget) {
    const key=type+":"+budget;
    if(shapeCache.has(key))return shapeCache.get(key);
    const result=[];
    for(const [op,out,...ports] of planeRules) {
      if(out!==type)continue;
      if(!ports.length) {
        if(budget===0)result.push({op,out,inputs:[],distances:0,facts:Number(op!=="moving"),joins:0});
        continue;
      }
      if(budget===0)continue;
      const rest=budget-1;
      const splits=ports.length===1?[[rest]]:Array.from({length:rest+1},(_,n)=>[n,rest-n]);
      for(const split of splits) {
        const [first,second]=ports.map((port,i)=>planeShapes(port,split[i]));
        for(const left of first)for(const right of second??[null]) {
          const inputs=right?[left,right]:[left];
          const distances=inputs.reduce((n,node)=>n+node.distances,0)+Number(["distance","pointLine","parallelDistance"].includes(op));
          const facts=inputs.reduce((n,node)=>n+node.facts,0)+Number(["section","coordinate","lineThrough","parallelThrough","perpendicularThrough","intersection","minimum"].includes(op));
          const joins=inputs.reduce((n,node)=>n+node.joins,0)+Number(op==="sum");
          const shape={op,out,inputs,distances,facts,joins};
          // These relations use only the reference direction. Building another
          // line through a point just to discard its position adds irrelevant givens.
          const directionOnly=op==="parallelThrough"||op==="perpendicularThrough";
          if(facts<=5&&joins<=1&&(!directionOnly||right.op==="givenLine")&&
            (op!=="minimum"||minimumEndpoints(shape)))result.push(shape);
        }
      }
    }
    shapeCache.set(key,result);
    return result;
  }

  // The triangle-inequality construction applies to two distances from one
  // shared moving point. Extract the static input ports for backward solving.
  function minimumEndpoints(shape) {
    const [sum]=shape.inputs;
    if(shape.op!=="minimum"||sum.op!=="sum"||sum.inputs.some(node=>node.op!=="distance"||node.inputs[1].op!=="moving"))return null;
    return sum.inputs.map(node=>node.inputs[0]);
  }
  const staticEndpoints=shape=>shape.op==="distance"&&shape.out==="scalar"?shape.inputs:minimumEndpoints(shape);
  const hasHiddenEndpoint=shape=>staticEndpoints(shape)?.some(node=>node.op==="given");

  const usesOperation=(shape,operation)=>shape.op===operation||shape.inputs.some(child=>usesOperation(child,operation));

  const withSign=value=>value.startsWith("-")?value:"+"+value;
  const difference=(a,b)=>a+(b.startsWith("-")?"+"+b.slice(1):b==="0"?"":"-"+b);
  const squaredDifference=(a,b)=>b==="0"?squared(a):"("+difference(a,b)+")^2";
  const squared=value=>/^\w(?:_\{\d+\})?$/.test(value)?value+"^2":"("+value+")^2";

  // Only the expression being asked about may need its own line. Known
  // values and constraints remain part of the sentences that use them.
  function expressionPrompt(expression, inline, display) {
    return ForgeNotation.needsDisplay(expression)?{text:display,rows:[expression]}:{text:inline(m(expression)),rows:[]};
  }
  const realDomain=variables=>`실수 ${m(variables.join(","))}에 대하여`;
  function normExpression(first,second) {
    let numericSquares=0;
    const terms=first.flatMap((value,i)=>{
      const a=String(value), b=String(second[i]);
      if(/^-?\d+$/.test(a)&&/^-?\d+$/.test(b)) {
        numericSquares+=(Number(a)-Number(b))**2;
        return [];
      }
      return [squaredDifference(a,b)];
    });
    if(numericSquares||!terms.length)terms.push(numericSquares);
    return tex`\sqrt{${terms.join("+")}}`;
  }
  const radicalDistance=(variables,center)=>normExpression(variables,center);


  // Geometry may provide a single concept in an expression problem. The
  // surrounding algebra is built by ForgeExpressionCompiler.
  function expressionProblem(entries,root,answerPlan) {
    const {value}=answerPlan;
    const byId=new Map(entries.map(node=>[node.id,node]));
    const [first,second]=root.from.map(id=>byId.get(id).math.slice(2,-1).split(","));
    const separation=normExpression(first,second);
    return problem("",[],`${m(separation)}의 값을 구하시오.`,scalar(value),[`${m(separation+"="+value)}이다.`]);
  }

  function distanceComposition(rng,path,{environment}={}) {
    const useExpression=rng()<.38;
    const algebraic=path.structure==="common-value"||(environment?environment==="expression":useExpression);
    const direct=path.structure==="direct";
    const inverseOnly=path.structure==="inverse"||Boolean(path.sign);
    const expressionMinimum=algebraic&&!path.required&&!path.structure&&rng()<1/20;
    if(algebraic&&!direct) {
      const concept=path.required??(path.structure==="minimum"||expressionMinimum?"minimum":"distance");
      const sign=path.sign??(expressionMinimum&&rng()<.2?pick(rng,[-1,1]):undefined);
      return ForgeExpressionCompiler.compile(rng,concept,sign);
    }
    const minimumOnly=path.structure==="minimum";
    // A functional distance sum uses one geometric concept twice. In the
    // expression environment its fixed inputs come directly from algebra.
    const budgets=algebraic?[1]
      :direct?[1]:minimumOnly?[4,4,5]:[2,2,2,2,3,3,4,5];
    const candidates=budgets.map(budget=>["scalar",...(direct||inverseOnly||minimumOnly?[]:["point"])]
      .flatMap(type=>planeShapes(type,budget))
      .filter(shape=>shape.op!=="coordinate"
        &&(path.required?usesOperation(shape,path.required):shape.distances)
        &&(!direct||shape.op==="distance")
        &&(!minimumOnly||minimumEndpoints(shape))
        &&(!inverseOnly||(path.sign?minimumEndpoints(shape):shape.op==="distance")&&hasHiddenEndpoint(shape))))
      .filter(shapes=>shapes.length);
    const shape=pick(rng,pick(rng,candidates));
    const endpoints=staticEndpoints(shape);
    const inverse=inverseOnly||(!direct&&!minimumOnly&&!path.required&&hasHiddenEndpoint(shape)&&rng()<.25);
    const coordinateIndex=axis(rng);
    const hiddenSide=inverse?pick(rng,endpoints.flatMap((p,i)=>p.op==="given"?[i]:[])):null;
    const containsMinimum=usesOperation(shape,"minimum");
    const minimumVariables=containsMinimum?notation(rng):["x","y"];
    const parameter=inverse?symbols.constants(rng,1,minimumVariables)[0]:null;
    const minimumSign=inverse&&shape.op==="minimum"?(path.sign??pick(rng,[-1,1])):0;
    const questionStyle=minimumSign?rand(rng,0,2):0;
    const coordinatePair=shape.out==="point"&&rng()<.5;
    const [firstSymbol,secondSymbol]=coordinatePair?symbols.derived(rng,containsMinimum?minimumVariables:[]):[];
    const weights=coordinatePair?[signed(rng,2),signed(rng,2)]:[];
    const coefficient=coordinatePair?linear(weights[0],firstSymbol,weights[1],secondSymbol):null;
    const points="ABCDEFGHIJKLMN", derived="PQRSTUVWXYZ";
    let nextPoint=0,nextDerived=0,nextLine=1,nextDistance=1;
    const distanceSymbol=symbols.distance(rng,[parameter,firstSymbol,secondSymbol]);
    const countLineDistances=plan=>Number(["pointLine","parallelDistance","minimum"].includes(plan.op))
      +plan.inputs.reduce((total,child)=>total+countLineDistances(child),0);
    const multipleDistances=countLineDistances(shape)>1;
    const entries=[], givenPoints=[], givenLines=[], statements=[], equations=[], explanation=[], constraints=[];
    const inlineLines=new Set(), fixedPoints=new Map();
    const lineReferences=lines=>{
      if(!lines.every(node=>node.operation==="givenLine"&&!ForgeNotation.needsDisplay(node.detail.equation))) {
        return m(lines.map(node=>node.name).join(","));
      }
      lines.forEach(node=>inlineLines.add(node.name));
      return lines.map(node=>m(node.detail.equation)).join(", ");
    };
    const lineName=()=>tex`\ell_{${nextLine++}}`;
    const normal=()=>pick(rng,[[3,4],[4,3]]);
    const lineEquation=({a,b,c})=>linear(a,"x",b,"y")+"="+c;
    const displayedLine=({a,b,c})=>{
      const scale=rand(rng,1,2);
      return rng()<.5?lineEquation({a:a*scale,b:b*scale,c:c*scale})
        :term(b*scale,"y")+"="+shift(term(-a*scale,"x"),-c*scale);
    };
    const through=(a,b,point)=>({a,b,c:a*point[0]+b*point[1],through:point});
    const lineValue=({a,b},p)=>a*p[0]+b*p[1];
    const lineDistance=(first,second)=>Math.abs(first.c-second.c)/Math.hypot(first.a,first.b);
    const add=(label,math,value,inputs=[],kind,detail)=>{
      const entry={id:"node"+entries.length,operation:kind,label,math,value,detail,
        from:inputs.map(input=>input.id),level:inputs.length?1+Math.max(...inputs.map(input=>input.level)):0};
      entries.push(entry);
      return entry;
    };
    const anchor=()=>[rand(rng,-4,4),rand(rng,-4,4)];
    function offset(length,oblique=false) {
      // Pythagorean triples give compact integer distances. Axis-aligned
      // offsets also support arbitrary integer demands propagated by a parent.
      const triples=[];
      for(let u=2;u<=5;u++)for(let v=1;v<u;v++) {
        const hypotenuse=u*u+v*v;
        if(length%hypotenuse===0)triples.push([length/hypotenuse*(u*u-v*v),length/hypotenuse*2*u*v]);
      }
      const pair=triples.length&&(oblique||rng()<.8)?pick(rng,triples).slice():[length,0];
      if(rng()<.5)pair.reverse();
      return pair.map(n=>n*pick(rng,[-1,1]));
    }
    function declarePoint(name,value,written=value,inputs=[],label="주어진 점",operation="given",detail) {
      const math=name+coord(written);
      const point=add(label,math,value,inputs,operation,detail);
      point.name=name;
      if(operation==="given") givenPoints.push(math);
      return point;
    }
    function positionEndpoints(length, isRoot) {
      const start=anchor(), displacement=offset(length,isRoot&&inverse);
      const positions=[start,plus(start,displacement)];
      if(isRoot&&minimumSign) {
        const gap=Math.abs(displacement[coordinateIndex]);
        const desired=minimumSign*rand(rng,1,Math.min(6,2*gap-1));
        positions[hiddenSide][coordinateIndex]=desired;
        positions[1-hiddenSide][coordinateIndex]=desired-minimumSign*gap;
      }
      return positions;
    }

    function compile(plan,wanted,mask,scope,demandedAxis) {
      switch(plan.op) {
        case "given": {
          const shown=wanted.map((value,i)=>i===mask?parameter:value);
          const key=coord(shown);
          if(!fixedPoints.has(key))fixedPoints.set(key,declarePoint(points[nextPoint++],wanted,shown));
          return fixedPoints.get(key);
        }
        case "givenLine": {
          const name=lineName();
          const equation=displayedLine(wanted);
          givenLines.push({name,equation});
          const result=add("주어진 직선",name+": "+equation,wanted,[],"givenLine",{equation});
          result.name=name;
          return result;
        }
        case "lineThrough": {
          const point=compile(plan.inputs[0],wanted.through);
          const name=lineName();
          const slope=tex`${wanted.a*wanted.b>0?"-":""}\frac{${Math.abs(wanted.a)}}{${Math.abs(wanted.b)}}`;
          statements.push(`직선 ${m(name)}은 점 ${m(point.name)}를 지나고 기울기가 ${m(slope)}이다.`);
          const value={...wanted,c:lineValue(wanted,point.value)};
          explanation.push(`직선 ${m(name)}의 방정식은 ${m(lineEquation(value))}이다.`);
          const result=add("점과 기울기로 정한 직선",name+": "+lineEquation(value),value,[point],"lineThrough");
          result.name=name;
          return result;
        }
        case "parallelThrough":
        case "perpendicularThrough": {
          const parallel=plan.op==="parallelThrough";
          const point=compile(plan.inputs[0],wanted.through);
          const [a,b]=parallel?[wanted.a,wanted.b]:[-wanted.b,wanted.a];
          // Offset the reference from the requested line in parallel problems.
          const reference=compile(plan.inputs[1],through(a,b,plus(wanted.through,[pick(rng,[-1,1]),0])));
          const name=lineName();
          const relation=rng()<.55;
          const base=`직선 ${m(name)}은 점 ${m(point.name)}를 지난다.`;
          statements.push(relation
            ? `${base} 두 직선 ${m(name+","+reference.name)}의 기울기의 ${parallel?"차는 "+m(0):"곱은 "+m(-1)}이다.`
            : `직선 ${m(name)}은 점 ${m(point.name)}를 지나고 직선 ${m(reference.name)}에 ${parallel?"평행":"수직"}이다.`);
          const value=through(wanted.a,wanted.b,point.value);
          const lhs=parallel?value.a*reference.value.b-value.b*reference.value.a:value.a*reference.value.a+value.b*reference.value.b;
          if(lhs!==0||parallel&&value.c===reference.value.c)throw new Error("Line direction constraint failed");
          explanation.push(`직선 ${m(reference.name)}과 ${parallel?"평행":"수직"}이고 점 ${m(point.name)}를 지나는 직선의 방정식은 ${m(lineEquation(value))}이다.`);
          const result=add(parallel?"평행 조건으로 직선 결정":"수직 조건으로 직선 결정",
            name+": "+lineEquation(value),value,[point,reference],plan.op);
          result.name=name;
          return result;
        }
        case "intersection": {
          const [a,b]=normal();
          const secondNormal=rng()<.5?[b,a]:[-b,a];
          const first=compile(plan.inputs[0],through(a,b,wanted));
          const second=compile(plan.inputs[1],through(...secondNormal,wanted));
          const L=first.value, M=second.value;
          const determinant=L.a*M.b-M.a*L.b;
          if(!determinant)throw new Error("Intersection requires nonparallel lines");
          const value=[(L.c*M.b-M.c*L.b)/determinant,(L.a*M.c-M.a*L.c)/determinant].map(n=>n===0?0:n);
          const name=derived[nextDerived++];
          const references=lineReferences([first,second]);
          const pointLabel=name+(plan===shape&&coordinatePair?coord([firstSymbol,secondSymbol]):"");
          const clause=`두 직선 ${references}의 교점을 ${m(pointLabel)}`;
          const declaration=statements.length;
          statements.push(clause+(name==="R"?"이라 하자.":"라 하자."));
          explanation.push(`두 직선의 방정식을 연립하면 교점은 ${m(name+coord(value))}이다.`);
          return declarePoint(name,value,undefined,[first,second],"두 직선의 교점","intersection",{clause,declaration});
        }
        case "pointLine":
        case "parallelDistance": {
          const [a,b]=normal(), base=anchor(), parallel=plan.op==="parallelDistance";
          const firstLine={a,b,c:a*base[0]+b*base[1],through:base};
          // (3, -1) or (-1, 3) has dot product 5 with the chosen normal.
          const offset=scale(a===3?[3,-1]:[-1,3],wanted*pick(rng,[-1,1]));
          const through=plus(base,offset);
          const secondLine={a,b,c:a*through[0]+b*through[1],through};
          const first=compile(plan.inputs[0],parallel?firstLine:base);
          const second=compile(plan.inputs[1],secondLine);
          const onFirst=parallel?first.value:{a,b,c:lineValue(second.value,first.value)};
          const value=lineDistance(onFirst,second.value);
          const expression=multipleDistances?`${distanceSymbol}_{${nextDistance++}}`:distanceSymbol;
          const subject=parallel?`두 평행선 ${lineReferences([first,second])} 사이의 거리`
            :`점 ${m(first.name)}와 직선 ${lineReferences([second])} 사이의 거리`;
          const label=parallel?"두 평행선 사이의 거리":"점과 직선 사이의 거리";
          if(plan!==shape)statements.push(`${subject}를 ${m(expression)}라 하자.`);
          explanation.push(plan===shape?`거리 공식을 적용하면 ${m(value)}이다.`:`거리 공식을 적용하면 ${m(expression+"="+value)}이다.`);
          return add(label,expression,value,[first,second],plan.op,{subject});
        }
        case "section": {
          const a=rand(rng,1,3), b=a===2?1:2, vector=distanceOffset(rng).map(n=>Math.sign(n));
          const A=compile(plan.inputs[0],plus(wanted,scale(vector,-a)),null,null,demandedAxis);
          const B=compile(plan.inputs[1],plus(wanted,scale(vector,b)),null,null,demandedAxis);
          const name=derived[nextDerived++];
          statements.push(`점 ${m(name)}는 선분 ${m(A.name+B.name)}를 ${m(a+":"+b)}로 내분하는 점이다.`);
          const value=A.value.map((n,i)=>(b*n+a*B.value[i])/(a+b));
          explanation.push(`내분점의 좌표는 ${m(name+coord(value))}이다.`);
          return declarePoint(name,value,undefined,[A,B],"내분점","section",{a,b});
        }
        case "coordinate": {
          const axisIndex=demandedAxis??axis(rng), magnitude=rand(rng,Math.max(2,lower(plan.inputs[0])),10);
          const input=compile(plan.inputs[0],magnitude);
          const translation=wanted[axisIndex]-input.value;
          const written=wanted.map((n,i)=>i===axisIndex?shift(input.math,-translation):n);
          const value=wanted.map((n,i)=>i===axisIndex?input.value+translation:n);
          const name=derived[nextDerived++];
          const definition=`점 ${m(name+coord(written))}가 있다.`;
          const intersection=input.operation==="distance"?input.from.map(id=>entries.find(node=>node.id===id))
            .find(node=>node.operation==="intersection"&&node.detail.declaration===statements.length-1):null;
          if(intersection)statements[intersection.detail.declaration]=intersection.detail.clause+(intersection.name==="R"?"이라 할 때, ":"라 할 때, ")+definition;
          else statements.push(definition);
          explanation.push(`앞서 구한 값을 대입하면 ${m(name+coord(value))}이다.`);
          return declarePoint(name,value,written,[input],"좌표에 앞의 값을 대입","coordinate",{axis:axisIndex,translation});
        }
        case "moving": {
          if(!scope.moving.node) {
            const name=derived[nextDerived++];
            scope.moving.node=add("공유하는 움직이는 점",name+coord(minimumVariables),null,[],"moving");
            scope.moving.node.name=name;
          }
          return scope.moving.node;
        }
        case "distance": {
          if(plan.out==="pointFunction") {
            const fixed=scope.fixed;
            const moving=compile(plan.inputs[1],null,null,scope);
            const ends=scope.reverse?[moving,fixed]:[fixed,moving];
            return add("두 점 사이의 거리",ends.map(point=>point.name).join(""),null,ends,"distance");
          }
          const isRoot=plan===shape;
          const positions=positionEndpoints(wanted,isRoot);
          const [A,B]=plan.inputs.map((input,i)=>compile(input,positions[i],isRoot&&hiddenSide===i?coordinateIndex:null));
          const length=Math.hypot(...plus(B.value,scale(A.value,-1)));
          const result=add("두 점 사이의 거리",A.name+B.name,length,[A,B],"distance");
          if(!isRoot||!inverse)explanation.push(`두 점 사이의 거리 공식으로 ${m(result.math+"="+length)}이다.`);
          return result;
        }
        case "minimum": {
          const isRoot=plan===shape, positions=positionEndpoints(wanted,isRoot);
          const ports=minimumEndpoints(plan);
          const [A,B]=ports.map((input,i)=>compile(input,positions[i],isRoot&&hiddenSide===i?coordinateIndex:null));
          const [sumPlan]=plan.inputs;
          const context={endpoints:[A,B],reverseEnds:[rng()<.5,rng()<.5],moving:{}};
          const sum=compile(sumPlan,null,null,context);
          const length=Math.hypot(...plus(B.value,scale(A.value,-1)));
          const symbol=isRoot?sum.math:(multipleDistances?tex`${distanceSymbol}_{${nextDistance++}}`:distanceSymbol);
          const result=add("거리 합의 최솟값",symbol,length,[sum],"minimum",
            {sum:sum.math,endpoints:[A.id,B.id],variables:minimumVariables});
          statements.push(`점 ${m(context.moving.node.name)}는 좌표평면 위를 움직인다.`);
          explanation.push(`삼각부등식에 의해 ${m(sum.math)}는 ${m(A.name+B.name)} 이상이다. 움직이는 점이 두 끝점 사이의 선분 위에 있을 때 등호가 성립한다.`);
          if(!isRoot)statements.push(`${m(sum.math)}의 최솟값을 ${m(symbol)}라 하자.`);
          if(!isRoot||!inverse)explanation.push(`최솟값은 ${m(length)}이다.`);
          constraints.push("두 거리 계산은 같은 움직이는 점을 공유한다.");
          return result;
        }
        case "sum": {
          if(plan.out==="pointFunction") {
            const parts=plan.inputs.map((input,i)=>compile(input,null,null,{moving:scope.moving,fixed:scope.endpoints[i],reverse:scope.reverseEnds[i]}));
            return add("두 거리의 합",parts.map(node=>node.math).join("+"),null,parts,"sum");
          }
          const leftValue=rand(rng,lower(plan.inputs[0]),wanted-lower(plan.inputs[1]));
          const left=compile(plan.inputs[0],leftValue), right=compile(plan.inputs[1],wanted-leftValue);
          const value=left.value+right.value;
          const expression=left.math+"+"+right.math;
          explanation.push(`${m(expression+"="+value)}이다.`);
          return add("두 값의 합",expression,value,[left,right],"sum");
        }
      }
    }
    // A sum can ask for a small integer even when some children also sum
    // positive lengths. Propagate the minimum feasible integer at each port.
    const lower=plan=>plan.op==="sum"?plan.inputs.reduce((n,p)=>n+lower(p),0):1;
    const needsPoint=shape.out==="point";
    const wanted=needsPoint?anchor():inverse?pick(rng,[5,10,13]):lower(shape)+rand(rng,0,9);
    const root=compile(shape,wanted,null,null,needsPoint&&!coordinatePair?coordinateIndex:undefined);
    if(needsPoint?root.value.some((n,i)=>n!==wanted[i]):root.value!==wanted) {
      throw new Error("Constructed graph does not meet its target");
    }
    let value=coordinatePair?weights[0]*root.value[0]+weights[1]*root.value[1]:needsPoint?root.value[coordinateIndex]:root.value;
    let key=coefficient??root.math;
    const introducedPair=root.operation==="intersection";
    let question=coordinatePair?(introducedPair?`${m(coefficient)}의 값을 구하시오.`:pick(rng,[
      `점 ${m(root.name)}의 좌표를 ${m(coord([firstSymbol,secondSymbol]))}라 할 때, ${m(coefficient)}의 값을 구하시오.`,
      `${counted("상수",2)} ${m(firstSymbol+","+secondSymbol)}는 각각 점 ${m(root.name)}의 가로 좌표와 세로 좌표이다. ${m(coefficient)}의 값을 구하시오.`,
    ]))
      :needsPoint?`점 ${m(root.name)}의 ${m(["x","y"][coordinateIndex])}좌표를 구하시오.`
      :shape.op==="distance"?`선분 ${m(root.math)}의 길이를 구하시오.`
      :shape.op==="minimum"?`${m(root.detail.sum)}의 최솟값을 구하시오.`
      :root.detail?.subject?`${root.detail.subject}를 구하시오.`
      :`${m(root.math)}의 값을 구하시오.`;
    let answerCondition, conditionPrefix="", minimumQuestion, excludedValue;
    if(inverse) {
      const ends=(root.detail?.endpoints??root.from).map(id=>entries.find(node=>node.id===id));
      const hidden=ends[hiddenSide], other=ends[1-hiddenSide];
      value=hidden.value[coordinateIndex];
      const center=other.value[coordinateIndex], radius=Math.abs(value-center);
      if(!radius)throw new Error("The hidden coordinate needs a nonzero displacement");
      excludedValue=2*center-value;
      answerCondition=separatingCondition(parameter,value,excludedValue);
      key=parameter;
      if(minimumSign) {
        const signedSymbol=answerCondition.phrase;
        minimumQuestion=(expression,variables)=>{
          const subject=m(expression), domain=variables?realDomain(variables)+" ":"";
          if(questionStyle===0)return {statement:`${domain}${subject}의 최솟값은 ${m(root.value)}이다.`,question:`${signedSymbol}의 값을 구하시오.`};
          if(questionStyle===1)return {statement:domain?`${m(variables.join(","))}는 실수이고, ${m(parameter)}는 ${minimumSign>0?"양수":"음수"}이다.`:`상수 ${m(parameter)}는 ${minimumSign>0?"양수":"음수"}이다.`,
            question:`${subject}의 최솟값이 ${m(root.value)}일 때, ${m(parameter)}의 값을 구하시오.`};
          return {statement:"",
            question:`${domain}${subject}의 최솟값이 ${m(root.value)}일 때, ${signedSymbol}의 값을 구하시오.`};
        };
        const wording=minimumQuestion(root.detail.sum);
        if(wording.statement)statements.push(wording.statement);
        question=wording.question;
      } else {
        const natural=answerCondition.phrase&&rng()<.75;
        if(natural)conditionPrefix=answerCondition.phrase+"에 대하여 ";
        statements.push(`선분 ${m(root.math)}의 길이는 ${m(root.value)}이다.`);
        if(!natural)statements.push(`단, ${m(answerCondition.math)}이다.`);
        question=`${m(parameter)}의 값을 구하시오.`;
      }
      explanation.push(`거리 공식으로 ${m("|"+shift(parameter,center)+"|="+radius)}이다. ${m(answerCondition.math)}이므로 ${m(parameter+"="+value)}이다.`);
      const solutions=add("거리식의 두 후보",coord([value,excludedValue]),[value,excludedValue],[root],"distanceInverse");
      add("범위 조건으로 해 선택",parameter+"="+value,value,[solutions],"filterCandidates");
      constraints.push("한 끝점 좌표를 숨기고, 어느 쪽에 있는지를 조건으로 제시한다.");
    }
    if(Object.is(value,-0))value=0;
    if(coordinatePair)explanation.push(`${m(coefficient+"="+value)}이다.`);
    const listedPoints=givenPoints.map(m).join(", ");
    const pointGroup=counted("점",givenPoints.length);
    const pointText=givenPoints.length===0?"":givenPoints.length>2&&rng()<.5
      ? `좌표평면에 다음 ${pointGroup}이 있다. ${listedPoints}.`
      : `${pointGroup} ${listedPoints}가 있다.`;
    const remainingLines=givenLines.filter(({name})=>!inlineLines.has(name));
    const displayLines=remainingLines.filter(({equation})=>ForgeNotation.needsDisplay(equation));
    const shortLines=remainingLines.filter(line=>!displayLines.includes(line));
    const lineText=[
      shortLines.length?`${counted("직선",shortLines.length)} ${shortLines.map(({name,equation})=>m(tex`${name}:\ ${equation}`)).join(", ")}이 있다.`:"",
      displayLines.length?`${m(displayLines.map(line=>line.name).join(","))}의 방정식은 아래와 같다.`:"",
    ].filter(Boolean).join(" ");
    equations.unshift(...displayLines.map(({name,equation})=>tex`${name}:\quad ${equation}`));
    const intro=[conditionPrefix+pointText,lineText,...statements].filter(Boolean).join(" ");
    const rendered=algebraic?expressionProblem(entries,root,{value})
      :problem(intro,equations,question,scalar(value),explanation);
    const graph=[];
    for(const {level,...entry} of entries)(graph[level]??=[]).push(entry);
    return {...rendered,inspection:{
      environment:algebraic?"expression":"geometry",
      graph,answerCondition,questionOperation:inverse?"SolveParameter":root.operation==="minimum"?"Minimum":"Evaluate",conditions:[`좌표평면에서 입출력의 종류를 맞춰 연산을 연결한다.`,
        `공개 조건 ${shape.facts+(inverse?2:0)}개, 독립적인 값을 합치는 연산 ${shape.joins}개.`,...constraints],
      variables:[
        ...(inverse?[{key:root.math,label:minimumSign?"주어진 최솟값":"주어진 거리",value:root.value,given:true,target:false,seed:true},
          {key:"다른 해",label:"조건으로 제외되는 후보",value:excludedValue,given:false,target:false,seed:false}]:[]),
        {key,label:"구할 값",value,given:false,target:true,seed:inverse},
      ],
    }};
  }

  function threeDistances(rng,{environment}={}) {
    const h=pt(rng),u=signed(rng,4),v=signed(rng,4),p="P";
    const offsets=[[u,0],[0,v],[-u,-v]],names=["A","B","C"],vars=notation(rng);
    const chooseNamed=rng()<.5;
    const named=environment?environment==="geometry":chooseNamed;
    const points=offsets.map(q=>plus(h,q));
    const min=offsets.reduce((sum,q)=>sum+norm2(q),0);
    const intro=named ? "세 점 "+points.map((q,i)=>pointName(names[i],q)).join(", ")+"가 있고 점 "+m(p)+"는 좌표평면 위를 움직인다."
      : "두 변수 "+m(vars.join(","))+"는 실수이다.";
    const expression=named ? names.map(a=>tex`\\overline{${p}${a}}^{\\,2}`).join("+")
      : squaredSumPolynomial(points,[1,1,1],vars);
    return optimization(intro,[expression],[
      "각 좌표의 제곱을 완성하면 세 점의 좌표를 각각 평균 낸 "+m(coord(h))+"에서 세 제곱거리 합이 최소이다.",
      "최솟값은 "+m(min)+"이다.",
    ],min,h,named?p:null,vars);
  }

  function reflectedDistances(rng,{environment}={}) {
    const h=pt(rng), [u,v,len]=radiusTriple(rng), vertical=rng()<.5, d=vertical?[u,v]:[v,u];
    const j=vertical?0:1, da=rand(rng,1,3), db=rand(rng,1,3);
    const a=plus(h,scale(d,da)), mirror=plus(h,scale(d,-db)), original=mirror.slice();
    original[j]=2*h[j]-mirror[j];
    const P="P";
    const minimum=(da+db)*len;
    const named=environment!=="expression";
    const intro=named?`두 점 ${pointName("A",a)}, ${pointName("B",original)}가 있다. 점 ${m(P)}는 직선 ${m(`${axes[j]}=${h[j]}`)} 위를 움직인다.`
      :`${realDomain(axes)} ${m(`${axes[j]}=${h[j]}`)}가 성립한다.`;
    const freeCoordinates=axes.map((variable,i)=>i===j?h[j]:variable);
    const expression=named?tex`\overline{A${P}}+\overline{${P}B}`:[a,original].map(center=>radicalDistance(freeCoordinates,center)).join("+");
    return optimization(intro,[expression],[
        ...(named?[]:[`두 근호는 ${pointName(P,freeCoordinates)}에서 ${pointName("A",a)}, ${pointName("B",original)}까지의 거리이다.`]),
        `직선에 대하여 ${m("B")}를 대칭이동한 점은 ${pointName("B'",mirror)}이다. 따라서 주어진 합은 ${m(tex`\\overline{A${P}}+\\overline{${P}B'}`)}이다.`,
        `선분 ${m("AB'")}과 직선의 교점이 ${m(coord(h))}이므로 이 점에서 삼각부등식의 등호가 성립한다. 이때의 거리는 ${m(minimum)}이다.`,
      ],minimum,h,named?P:null,axes);
  }

  const distanceVariants=[
    alternative("free-squares","두 점의 제곱거리 합",(rng,_path,options)=>distanceSquares(rng,false,{environment:options?.environment??"geometry"})),
    alternative("line-squares","직선 위 제곱거리 합",(rng,_path,options)=>distanceSquares(rng,true,{environment:options?.environment??"geometry"})),
    alternative("three-distances","세 점의 제곱거리 합",(rng,_path,options)=>threeDistances(rng,{environment:options?.environment??"geometry"})),
    alternative("reflect-distances","직선 위 거리 합과 대칭이동",(rng,_path,options)=>reflectedDistances(rng,options)),
  ].map(variant=>({...variant,environment:"geometry",resultType:optimizationType,answerPaths:optimizationPaths}));
  const composedDistance = {
    ...alternative("distance-composition","좌표평면에서 관계 합성",distanceComposition),
    resultType:{baseType:"Scalar",capabilities:["distance","aggregate"],domain:"real"},
    answerPaths:[
      {id:"generated",label:"좌표평면 관계에서 값 찾기",outputType:"Scalar",passthrough:true},
      {id:"inverse",label:"거리 조건에서 숨긴 좌표 찾기",structure:"inverse",manualOnly:true,outputType:"Scalar",passthrough:true},
      {id:"minimum",label:"거리 합의 최솟값",structure:"minimum",manualOnly:true,operations:["Distance","Sum","Minimum"],outputType:"Scalar",passthrough:true},
      ...[-1,1].map(sign=>({id:sign<0?"negative-parameter":"positive-parameter",label:sign<0?"음수 좌표 역산":"양수 좌표 역산",
        structure:"minimum",sign,manualOnly:true,operations:["Distance","Sum","Minimum","SolveParameter"],outputType:"Scalar",passthrough:true})),
    ],
  };
  add("distance-use","coordinate","두 점 사이의 거리의 활용","B",[...distanceVariants,composedDistance]);
  add("a-point-distance","coordinate","두 점 사이의 거리 공식","A",[
    {...composedDistance,answerPaths:[{id:"direct",label:"두 점 사이의 거리",structure:"direct",operations:["Distance"],outputType:"Scalar",passthrough:true}]},
  ]);

  basic("midpoint","선분의 중점",rng=>{
    const h=pt(rng),d=vector(rng);
    return problem(`두 점 ${pointName("A",plus(h,d))}, ${pointName("B",plus(h,scale(d,-1)))}가 있다.`,[],"선분의 중점 좌표를 구하시오.",point(h),
      [`각 좌표를 평균하면 중점은 ${m(coord(h))}이다.`]);
  });
  basic("slope","두 점을 지나는 직선의 기울기",rng=>{
    const a=pt(rng),s=signed(rng),d=rand(rng,1,5);
    return problem(`두 점 ${pointName("A",a)}, ${pointName("B",plus(a,[d,d*s]))}를 지나는 직선이 있다.`,[],"기울기를 구하시오.",scalar(s),
      [`기울기는 ${m(tex`\\frac{${d*s}}{${d}}=${s}`)}이다.`]);
  });
  basic("point-on-line","직선에 점의 좌표 대입",rng=>{
    const p=pt(rng),s=signed(rng,3),c=p[1]-s*p[0];
    return problem(`점 ${pointName("P",[p[0],"k"])}가 다음 직선 위에 있다.`,[line(s,c)],`${m("k")}를 구하시오.`,scalar(p[1]),
      [`${m(`x=${p[0]}`)}을 직선의 식에 대입하면 된다.`]);
  });
  basic("point-line-distance","점과 직선 사이의 거리 공식",rng=>{
    const p=pt(rng), [a,b,n]=radiusTriple(rng), r=rand(rng,1,6), c=dot([a,b],p)+n*r;
    return problem(`점 ${pointName("P",p)}와 아래 직선이 있다.`,[eqLine([a,b],c)],"점과 직선 사이의 거리를 구하시오.",scalar(r),
      [`점과 직선 사이의 거리 공식에 대입하면 ${m(tex`\\frac{${n*r}}{${n}}=${r}`)}이다.`]);
  });
  basic("circle-standard","원에서 중심과 반지름 읽기",rng=>{
    const h=pt(rng),r=rand(rng,2,7), center=rng()<.5;
    return problem("다음 식이 나타내는 원을 보자.",[`${sq("x",h[0])}+${sq("y",h[1])}=${r*r}`],
      center?"중심의 좌표를 구하시오.":"반지름을 구하시오.",center?point(h):scalar(r),
      [`표준형에서 중심은 ${m(coord(h))}이고 반지름은 우변의 양의 제곱근 ${m(r)}이다.`]);
  });

  function sectionPoint(rng, external) {
    const h=pt(rng),d=vector(rng),m1=rand(rng,2,4),n=external?m1-1:m1+1;
    const a=plus(h,scale(d,-m1)), b=plus(h,scale(d,external?-n:n)), i=axis(rng);
    return problem(`선분의 양 끝이 ${pointName("A",a)}, ${pointName("B",b)}이다. 점 ${m("P")}는 이 선분을 ${m(`${m1}:${n}`)}로 ${external?"외분":"내분"}한다.`,[],
      `점 ${m("P")}의 ${m(axes[i])}좌표를 구하시오.`,scalar(h[i]),
      [`분점 공식에서 분모는 ${m(external?`${m1}-${n}`:`${m1}+${n}`)}이다. 각 좌표를 계산하면 ${pointName("P",h)}이다.`]);
  }
  b("section-internal","내분비로 분점의 좌표 구하기","두 끝점과 내분비에서 좌표 결정",rng=>sectionPoint(rng,false));
  b("section-external","외분비로 분점의 좌표 구하기","두 끝점과 외분비에서 좌표 결정",rng=>sectionPoint(rng,true));
  b("midpoint-inverse","중점을 이용해 선분의 끝점 역산","중점 좌표에서 두 끝점의 관계 추론",rng=>{
    const h=pt(rng),d=vector(rng),a=plus(h,d),b=plus(h,scale(d,-1));
    return problem(`선분의 한 끝점은 ${pointName("A",a)}이고 중점은 ${pointName("M",h)}이다.`,[],"다른 끝점의 좌표를 구하시오.",point(b),
      [`다른 끝점의 각 좌표는 중점 좌표의 두 배에서 ${m("A")}의 대응하는 좌표를 뺀 값이다. 따라서 ${m(coord(b))}이다.`]);
  });
  b("section-ratio","분점의 좌표에서 내분비 추론","좌표 차로 길이비 환산",rng=>{
    const a=pt(rng),d=vector(rng),r=rand(rng,2,5),s=r+1, p=plus(a,scale(d,r)), b=plus(p,scale(d,s));
    return problem(`세 점 ${pointName("A",a)}, ${pointName("B",b)}, ${pointName("P",p)}가 같은 직선 위에 있다.`,
      [tex`\\overline{AP}:\\overline{PB}=k:${s}`],`${m("k")}를 구하시오.`,scalar(r),
      [`두 구간의 좌표 변화는 각각 같은 좌표 변화의 ${m(r)}배, ${m(s)}배이다. 길이비도 ${m(`${r}:${s}`)}이다.`]);
  });
  b("centroid-inverse","삼각형의 무게중심에서 꼭짓점 역산","세 좌표의 평균 조건으로 미지 꼭짓점 결정",rng=>{
    const h=pt(rng),u=signed(rng,3),v=signed(rng,3),a=plus(h,[u,0]),b=plus(h,[0,v]),c=plus(h,[-u,-v]);
    return problem(`삼각형의 꼭짓점 두 개는 ${pointName("A",a)}, ${pointName("B",b)}이고 무게중심은 ${pointName("G",h)}이다.`,[],"나머지 꼭짓점의 좌표를 구하시오.",point(c),
      [`각 좌표의 합은 무게중심 좌표의 세 배이다. 두 꼭짓점의 좌표를 빼면 ${m(coord(c))}이다.`]);
  });
  b("axis-equidistance","두 점에서 같은 거리에 있는 축 위의 점","거리 제곱을 같게 놓고 축 조건 대입",rng=>{
    const k=signed(rng), d=rand(rng,2,5), v=signed(rng,3), i=axis(rng), project=(u,w)=>i===0?[u,w]:[w,u];
    const a=project(k-d,v), b=project(k+d,v);
    return problem(`두 점 ${pointName("A",a)}, ${pointName("B",b)}까지의 거리가 같은 점 ${m("P")}가 ${m(axes[i])}축 위에 있다.`,[],
      `점 ${m("P")}의 ${m(axes[i])}좌표를 구하시오.`,scalar(k),
      [`두 점의 다른 좌표는 같으므로 제곱거리 식에서 해당 항이 소거된다. 남은 두 좌표의 중간값은 ${m(k)}이다.`]);
  });
  b("distance-locus","거리비가 일정한 점의 자취","거리의 제곱을 비교해 원의 중심 결정",rng=>{
    const h=pt(rng),u=pick(rng,[2,3]),d=vector(rng),a=plus(h,scale(d,u*u)),b=plus(h,d);
    return problem(`점 ${m("P")}는 두 점 ${pointName("A",a)}, ${pointName("B",b)}에 대해 다음을 만족한다.`,
      [tex`\\overline{PA}=${u}\\overline{PB}`],`점 ${m("P")}의 자취가 이루는 원의 중심 좌표를 구하시오.`,point(h),
      [`거리 식을 제곱해 ${m(`(x,y)`)}의 일차항을 모으면 중심 좌표는 ${m(tex`\\frac{${u*u}B-A}{${u*u-1}}`)}로 계산된다. 두 점의 좌표를 넣으면 ${m(coord(h))}이다.`]);
  });
  b("parallel-line","평행 조건과 한 점을 이용해 직선 구하기","기울기를 유지하고 새 절편 결정",rng=>{
    const p=pt(rng),s=signed(rng,4),c=p[1]-s*p[0],d=signed(rng);
    return problem(`직선 ${m(line(s,c+d))}에 평행하고 점 ${pointName("P",p)}를 지나는 직선을 생각하자.`,[],
      "이 직선의 y절편을 구하시오.",scalar(c),[`기울기가 ${m(s)}이므로 ${m(line(s,c))}에서 점의 좌표를 대입해 절편을 계산할 수 있다.`]);
  });
  b("perpendicular-line","수직 조건으로 직선의 절편 결정","법선과 방향 관계를 바꾸어 한 점 대입",rng=>{
    const p=pt(rng),s=signed(rng,4),c=p[1]+s*p[0];
    return problem(`직선 ${m(eqLine([1,-s],signed(rng)))}에 수직이고 점 ${pointName("P",p)}를 지나는 직선을 생각하자.`,[],
      "이 직선의 y절편을 구하시오.",scalar(c),[`주어진 직선의 기울기는 ${m(tex`\\frac{1}{${s}}`)}이다. 수직인 직선의 기울기는 ${m(-s)}이다. 점의 좌표를 대입하면 절편이 ${m(c)}이다.`]);
  });
  b("line-intersection","두 직선의 교점 좌표 구하기","기울기가 다른 일차식 두 개를 연립",rng=>{
    const h=pt(rng),s=signed(rng,4),t=s+rand(rng,1,4);
    return problem("두 직선의 방정식이 다음과 같다.",[line(s,h[1]-s*h[0]),line(t,h[1]-t*h[0])],
      "두 직선의 교점 좌표를 구하시오.",point(h),[`두 직선에서 우변을 같게 놓고 ${m("x")}를 구한 뒤, 어느 한 식에 대입하면 ${m(coord(h))}이다.`]);
  });
  b("concurrent-lines","세 직선이 한 점에서 만나기 위한 상수","먼저 교점을 구한 뒤 세 번째 식에 대입",rng=>{
    const h=pt(rng),s=signed(rng,3),t=s+rand(rng,1,3),a=signed(rng,3),d=signed(rng,3);
    return problem("다음 세 직선은 모두 한 점을 지난다.",[line(s,h[1]-s*h[0]),line(t,h[1]-t*h[0]),`${linear(a,"x",d,"y")}=k`],
      `${m("k")}를 구하시오.`,scalar(dot([a,d],h)),[`처음 두 직선의 교점은 ${m(coord(h))}이다. 세 번째 직선의 식에 대입하면 된다.`]);
  });
  b("line-through-intersection","두 직선의 교점을 지나고 평행한 직선","교점 좌표와 별도 기울기를 함께 사용",rng=>{
    const h=pt(rng),s=signed(rng,3),t=s+1,d=signed(rng,4);
    return problem(`아래 첫 두 직선의 교점을 지나고 ${m(line(d,signed(rng)))}에 평행한 직선이 있다.`,[line(s,h[1]-s*h[0]),line(t,h[1]-t*h[0])],
      "이 직선의 y절편을 구하시오.",scalar(h[1]-d*h[0]),
      [`교점은 ${m(coord(h))}이고 구하는 직선의 기울기는 ${m(d)}이다. 따라서 절편은 ${m(h[1]-d*h[0])}이다.`]);
  });

  function projection(rng, reflect) {
    const h=pt(rng), s=signed(rng,3), n=scale([-s,1],signed(rng,3)), p=plus(h,n), c=h[1]-s*h[0];
    return problem(reflect ? `점 ${pointName("P",p)}를 다음 직선에 대하여 대칭이동한 점을 생각하자.` : `점 ${pointName("P",p)}와 다음 직선을 생각하자.`,[line(s,c)],
      reflect?`점 ${m("P")}를 이 직선에 대하여 대칭이동한 점의 좌표를 구하시오.`:`점 ${m("P")}에서 직선에 내린 수선의 발의 좌표를 구하시오.`,
      point(reflect?plus(h,scale(n,-1)):h),[
        `직선의 수직 방향은 ${m(coord([-s,1]))}이다. 점 ${m("P")}를 지나 이 방향으로 움직이는 직선과 주어진 직선의 교점은 ${pointName("H",h)}이다.`,
        ...(reflect?[`이 점이 원래 점과 대칭이동한 점의 중점이므로 대칭이동한 좌표는 ${m(coord(plus(h,scale(n,-1))))}이다.`]:[]),
      ]);
  }
  b("line-projection","점에서 직선에 내린 수선의 발","수직인 직선과 주어진 직선을 연립",rng=>projection(rng,false));
  b("line-reflection","직선에 대한 점의 대칭이동","수선의 발과 중점의 관계를 이용",rng=>projection(rng,true));
  b("distance-line-parameter","점과 직선 사이 거리로 절편 조건 결정","거리 공식의 두 해와 대소 조건",rng=>{
    const p=pt(rng),[a,b,n]=radiusTriple(rng),d=rand(rng,2,6),base=dot([a,b],p),sgn=pick(rng,[-1,1]);
    return problem(`점 ${pointName("P",p)}와 아래 직선 사이의 거리가 ${m(d)}이다.`,[`${linear(a,"x",b,"y")}=k`],
      `가능한 ${m("k")} 중 ${sgn>0?"큰":"작은"} 값을 구하시오.`,scalar(base+sgn*n*d),
      [`거리 공식에 따라 ${m(tex`|k-(${base})|=${n*d}`)}이다. 두 해 중 조건에 맞는 값을 택한다.`]);
  });
  b("parallel-lines-distance","평행한 두 직선 사이의 거리","두 직선의 계수를 맞추어 상수항 차 비교",rng=>{
    const [a,b,n]=radiusTriple(rng),d=rand(rng,2,6),c=signed(rng),k=rand(rng,2,4);
    return problem("다음 두 직선은 서로 평행하다.",[eqLine([a,b],c),eqLine([k*a,k*b],k*(c+n*d))],
      "두 직선 사이의 거리를 구하시오.",scalar(d),
      [`두 번째 식을 ${m(k)}로 나누면 두 직선의 x, y의 계수가 각각 같아진다. 상수항의 차 ${m(n*d)}를 두 계수의 제곱합의 제곱근 ${m(n)}으로 나누면 된다.`]);
  });
  b("circle-general","원의 일반형을 완전제곱식으로 정리","일반형에서 중심과 반지름 복원",rng=>{
    const h=pt(rng),r=rand(rng,2,7),c=norm2(h)-r*r, center=rng()<.5;
    const expr=shift("x^2+y^2"+(h[0]<0?"+":"")+term(-2*h[0],"x")+(h[1]<0?"+":"")+term(-2*h[1],"y"),-c);
    const data=problem("다음 방정식이 나타내는 원을 생각하자.",[`${expr}=0`],
      center?"원의 중심 좌표를 구하시오.":"원의 반지름을 구하시오.",center?point(h):scalar(r),
      [`완전제곱식으로 정리하면 ${m(`${sq("x",h[0])}+${sq("y",h[1])}=${r*r}`)}이다.`]);
    return {...data,result:{center:h,radius:r}};
  });
  b("circle-diameter","지름의 양 끝점으로 원의 정보 구하기","중점과 거리 공식을 결합",rng=>{
    const h=pt(rng),[a,b,r]=radiusTriple(rng),d=[a,b],center=rng()<.5;
    const data=problem(`두 점 ${pointName("A",plus(h,d))}, ${pointName("B",plus(h,scale(d,-1)))}를 잇는 선분이 원의 지름이다.`,[],
      center?"원의 중심 좌표를 구하시오.":"원의 반지름을 구하시오.",center?point(h):scalar(r),
      [`중심은 선분의 중점 ${m(coord(h))}이다. 반지름은 중점에서 한 끝점까지의 거리 ${m(r)}이다.`]);
    return {...data,result:{center:h,radius:r}};
  });
  b("circle-line-position","원과 직선의 위치 관계와 교점 개수","중심에서 직선까지의 거리와 반지름 비교",rng=>{
    const h=pt(rng),[a,b,n]=radiusTriple(rng),r=rand(rng,2,6),delta=rand(rng,-1,1),c=dot([a,b],h)+n*(r+delta);
    return problem("다음 원과 직선을 생각하자.",[`${sq("x",h[0])}+${sq("y",h[1])}=${r*r}`,eqLine([a,b],c)],
      "원과 직선의 서로 다른 교점 개수를 구하시오.",scalar(1-delta),
      [`중심에서 직선까지의 거리는 ${m(r+delta)}, 반지름은 ${m(r)}이다. 따라서 교점은 ${m(1-delta)}개이다.`]);
  });
  b("circle-tangent-point","원 위의 점에서 접선의 절편 구하기","반지름을 접선의 법선으로 사용",rng=>{
    const [a,b,n]=radiusTriple(rng),k=rand(rng,1,4),p=[b*signed(rng,2),b*k],h=plus(p,[-a,-b]);
    return problem(`다음 원 위의 점 ${pointName("P",p)}에서 접선을 그었다.`,[`${sq("x",h[0])}+${sq("y",h[1])}=${n*n}`],
      "접선이 y축과 만나는 점의 y좌표를 구하시오.",scalar((a*p[0]+b*p[1])/b),[
        `반지름과 접선은 수직이므로 ${m(coord([a,b]))}는 접선에 수직인 반지름의 좌표 변화량이다. 접선은 ${m(eqLine([a,b],dot([a,b],p)))}이고 여기에 ${m("x=0")}을 대입한다.`,
      ]);
  });
  b("circle-tangent-parallel","주어진 직선과 평행한 원의 접선","중심에서 접선까지의 거리를 반지름과 일치",rng=>{
    const h=pt(rng),[a,b,n]=radiusTriple(rng),r=rand(rng,2,6),s=pick(rng,[-1,1]),c=dot([a,b],h);
    return problem("아래 직선이 원에 접한다.",[`${sq("x",h[0])}+${sq("y",h[1])}=${r*r}`,`${linear(a,"x",b,"y")}=k`],
      `가능한 ${m("k")} 중 ${s===1?"큰":"작은"} 값을 구하시오.`,scalar(c+s*n*r),
      [`중심에서 직선까지의 거리가 반지름과 같아야 하므로 ${m(tex`|k-(${c})|=${n*r}`)}이다.`]);
  });
  b("circle-three-points","세 점을 지나는 원의 중심 구하기","두 현의 수직이등분선의 교점 계산",rng=>{
    const h=pt(rng),[a,b]=radiusTriple(rng),points=[plus(h,[a,b]),plus(h,[a,-b]),plus(h,[-a,b])];
    return problem(`세 점 ${points.map((p,i)=>pointName("ABC"[i],p)).join(", ")}를 지나는 원이 있다.`,[],
      "원의 중심 좌표를 구하시오.",point(h),
      [`두 현 ${m("AB,AC")}의 수직이등분선은 각각 ${m(`y=${h[1]}`)}, ${m(`x=${h[0]}`)}이다. 교점이 원의 중심이다.`]);
  });
  // These operations work on points, lines and scored candidates. The
  // answer path decides how to order the candidates and what to read out.
  function perpendicularBisector(A,B) {
    const normal=plus(B,scale(A,-1));
    const midpoint=scale(plus(A,B),.5);
    const divisor=Math.hypot(...normal);
    const unit=scale(normal,1/divisor);
    return {normal,midpoint,unit,direction:[-unit[1],unit[0]]};
  }

  function projectToLine(point,line) {
    const signedDistance=dot(plus(point,scale(line.midpoint,-1)),line.unit);
    return {foot:plus(point,scale(line.unit,-signedDistance)),distance:Math.abs(signedDistance)};
  }

  function pointsAtDistance(projection,direction,radius) {
    const remainder=radius**2-projection.distance**2;
    if(remainder<0)return [];
    const step=Math.sqrt(remainder);
    return (step?[-step,step]:[0]).map(t=>plus(projection.foot,scale(direction,t)));
  }

  const length=(A,B)=>Math.hypot(...plus(A,scale(B,-1)));
  const perimeter=(A,B,C)=>length(A,B)+length(B,C)+length(C,A);

  function selectExtremum(candidates,order) {
    const score=(order==="maximum"?Math.max:Math.min)(...candidates.map(candidate=>candidate.score));
    return {score,points:candidates.filter(candidate=>candidate.score===score).map(candidate=>candidate.point)};
  }

  // Pick two integer hypotenuses with a common leg, then put their other
  // legs at the two intersections. This gives exact perimeters by design.
  const perimeterConstructions=[];
  for(let halfBase=2;halfBase<=24;halfBase++) {
    const legs=Array.from({length:29},(_,i)=>i+2).filter(leg=>Number.isInteger(Math.hypot(halfBase,leg)));
    for(const near of legs)for(const far of legs) {
      if(far<=near||(far-near)%2)continue;
      const step=(far-near)/2;
      for(let radius=step;radius<=12;radius++) {
        const distance=Math.sqrt(radius**2-step**2);
        if(Number.isInteger(distance))perimeterConstructions.push({halfBase,near,far,step,radius,distance});
      }
    }
  }

  const candidateSelectors={
    minimum:({candidates})=>selectExtremum(candidates,"minimum").points.map(point=>candidates.find(c=>c.point===point)),
    maximum:({candidates})=>selectExtremum(candidates,"maximum").points.map(point=>candidates.find(c=>c.point===point)),
    coordinate:({axis,chosen,other})=>candidate=>(candidate.point[axis]-other.point[axis])*Math.sign(chosen.point[axis]-other.point[axis])>0,
    inequality:({axis,chosen,other,foot})=>candidate=>(candidate.point[axis]-foot[axis])*Math.sign(chosen.point[axis]-other.point[axis])>0,
    sign:({axis,chosen})=>candidate=>Math.sign(candidate.point[axis])===Math.sign(chosen.point[axis]),
    locus:({locusCenter,locusRadius})=>candidate=>length(candidate.point,locusCenter)===locusRadius,
    product:({axis,chosen,foot,origin})=>candidate=>(candidate.point[axis]-foot[axis])*(candidate.point[axis]-origin[axis])*
      Math.sign(chosen.point[axis]-foot[axis])>0,
  };
  const isExtremum=method=>method==="minimum"||method==="maximum";

  function distanceOnBisector(rng,path,{environment}={}) {
    const method=path.selector??pick(rng,Object.keys(candidateSelectors));
    const target=pick(rng,method==="coordinate"?["perimeter","distance"]:["coordinate","perimeter","distance"]);
    const measure=target==="coordinate"?pick(rng,["perimeter","distance"]):target;
    const needsMeasure=target!=="coordinate"||isExtremum(method);
    const construction=needsMeasure?pick(rng,perimeterConstructions):null;
    const [a,b,c]=radiusTriple(rng);
    const {halfBase,near,far,step,radius,distance}=construction??
      {halfBase:rand(rng,1,5),near:rand(rng,1,4),far:0,step:a,radius:c,distance:b};
    const midpointOffset=construction?(near+far)/2:near+step;
    const origin=[rand(rng,-5,5),rand(rng,-5,5)];
    const normalAxis=axis(rng), freeAxis=1-normalAxis;
    const normal=[0,0], direction=[0,0];
    normal[normalAxis]=pick(rng,[-1,1]);
    direction[freeAxis]=pick(rng,[-1,1]);
    if(method==="sign")origin[freeAxis]=-direction[freeAxis]*midpointOffset;
    const A=plus(origin,scale(normal,-halfBase)), B=plus(origin,scale(normal,halfBase));
    const center=plus(plus(origin,scale(direction,midpointOffset)),scale(normal,distance));
    const bisector=perpendicularBisector(A,B), projection=projectToLine(center,bisector);
    const named=environment!=="expression";
    const equationConstant=radius**2-(origin[normalAxis]-center[normalAxis])**2;
    const roots=named?null:[-Math.sqrt(equationConstant),Math.sqrt(equationConstant)];
    const positions=named?pointsAtDistance(projection,bisector.direction,radius):roots.map(root=>
      axes.map((_,i)=>i===freeAxis?center[i]+root:origin[i]));
    const candidates=positions.map(point=>({point,score:measure==="perimeter"?perimeter(A,B,point):length(A,point)}));
    if(candidates.length!==2||needsMeasure&&!candidates.every(candidate=>Number.isInteger(candidate.score)))throw Error("Expected two exact candidates");
    const chosen=pick(rng,candidates), other=candidates.find(candidate=>candidate!==chosen);
    const x=axes[freeAxis], y=axes[normalAxis], t=chosen.point[freeAxis], h=projection.foot[freeAxis];
    const locusCenter=chosen.point.slice();
    locusCenter[freeAxis]+=Math.sign(t-other.point[freeAxis])*step;
    const locusRadius=step;
    const settings={candidates,chosen,other,axis:freeAxis,foot:projection.foot,origin,locusCenter,locusRadius};
    const selected=isExtremum(method)?candidateSelectors[method](settings):candidates.filter(candidateSelectors[method](settings));
    if(selected.length!==1)throw Error("Expected a unique selected point");
    const [result]=selected, extreme=method==="maximum"?"최댓값":"최솟값";
    const read=candidate=>target==="perimeter"?perimeter(A,B,candidate.point):target==="distance"?length(A,candidate.point):candidate.point[freeAxis];
    const value=read(result);
    if(read(candidates.find(c=>c!==result))===value)throw Error("The selector must affect the answer");
    const requested=target, answer=value;
    const axisEquation=y+"="+origin[normalAxis];
    const pointC=m("C");
    const radical=tex`\sqrt{${sq(x,origin[freeAxis])}+${halfBase**2}}`;
    const perimeterSubject=named?"삼각형 "+m("ABC")+"의 둘레":m("2"+radical+"+"+2*halfBase)+"의 값";
    const distanceSubject=named?"선분 "+m("AC")+"의 길이":m(radical)+"의 값";
    const objective=measure==="perimeter"?perimeterSubject:distanceSubject;
    const coordinateOrder=method==="coordinate";
    const coordinateSide=t>other.point[freeAxis]?"큰":"작은";
    const conditionText={
      coordinate:"",
      inequality:named?`점 ${pointC}의 ${m(x)}좌표는 ${m(h)}보다 ${t>h?"크다":"작다"}.`:`${m(x+(t>h?">":"<")+h)}이다.`,
      sign:`${named?`점 ${pointC}의 ${m(x)}좌표는`:m(x)+"의 값은"} ${t>0?"양수":"음수"}이다.`,
      locus:named?`점 ${pointC}는 중심이 ${m(coord(locusCenter))}이고 반지름이 ${m(locusRadius)}인 원 위에 있다.`
        :`${m(sq("x",locusCenter[0])+"+"+sq("y",locusCenter[1])+"="+locusRadius**2)}이다.`,
      product:`${m("("+shift(x,h)+")("+shift(x,origin[freeAxis])+")"+(t>h?">":"<")+"0")}이다.`,
    }[method];
    const stem=named
      ?`두 점 ${pointName("A",A)}, ${pointName("B",B)}가 있다. 선분 ${m("AB")}의 수직이등분선 위의 점 ${pointC}와 점 ${m("D"+coord(center))} 사이의 거리는 ${m(radius)}이다.`
      :`실수 ${m("x,y")}는 ${m(axisEquation)}와 ${m(sq("x",center[0])+"+"+sq("y",center[1])+"="+radius**2)}을 만족시킨다.`;
    const subject=requested==="perimeter"?perimeterSubject:requested==="distance"?distanceSubject:
      named?"점 "+pointC+"의 "+m(x)+"좌표":m(x)+"의 값";
    const object=subject+(named&&requested!=="perimeter"?"를":"을");
    const question=isExtremum(method)?requested===measure
      ?`${objective}의 ${extreme}을 구하시오.`
      :`${objective}${named?"가":"이"} ${method==="minimum"?"최소":"최대"}일 때, ${object} 구하시오.`
      :coordinateOrder?`가능한 두 ${named?`점 중 ${m(x)}좌표가`:`해 중 ${m(x)}의 값이`} 더 ${coordinateSide} 경우, ${object} 구하시오.`
        :`${object} 구하시오.`;
    const compare=candidates.map(c=>m(coord(c.point))+": "+m(c.score)).join(", ");
    const reducedEquation=sq(x,h)+"="+equationConstant;
    const solution=[
      named?`수직이등분선은 ${m(axisEquation)}이다. 점 ${m("D")}에서 이 직선까지의 거리는 ${m(distance)}이고, 수선의 발은 ${m(coord(projection.foot))}이다.`
        :`${m(axisEquation)}를 거리식에 대입해 정리하면 ${m(reducedEquation)}이다.`,
      `거리 조건을 대입하면 ${m(sq(x,h)+"="+step**2)}이므로 가능한 두 점은 ${candidates.map(c=>m(coord(c.point))).join(", ")}이다.`,
      isExtremum(method)?`후보와 ${objective}${named?"를":"을"} 대응시키면 ${compare}이다. ${extreme}을 만드는 점은 ${m(coord(result.point))}이다.`
        :coordinateOrder?`${m(x)}좌표가 더 ${coordinateSide} 후보는 ${m(coord(result.point))}이다.`
          :`추가 조건을 만족시키는 점은 ${m(coord(result.point))}이다.`,
      ...(requested==="perimeter"&&named?[`${m("CA=CB")}이므로 둘레는 ${m("AB+2CA="+answer)}이다.`]:[`구하는 값은 ${m(answer)}이다.`]),
    ];
    const graph=[
      [{id:"base",label:named?"두 끝점":"직선 조건",math:named?"A"+coord(A)+", B"+coord(B):axisEquation},
       {id:"radius",label:"거리 조건",math:coord(center)+", "+radius}],
      [{id:"line",operation:named?"perpendicularBisector":"readLinearConstraint",label:named?"수직이등분선":"일차 조건",math:axisEquation,from:["base"]}],
      [{id:"projection",operation:named?"pointLineDistance":"substituteEquation",label:named?"점과 직선 사이의 거리":"일차 조건을 거리식에 대입",math:named?"d="+distance:reducedEquation,from:["line","radius"]}],
      [{id:"candidates",operation:named?"pointsAtDistance":"solveQuadratic",label:"거리 조건의 해 후보",math:candidates.map(c=>coord(c.point)).join(", "),from:["projection","radius"]}],
    ];
    if(isExtremum(method))graph.push([{id:"measure",operation:measure,label:objective,math:candidates.map(c=>c.score).join(", "),from:["candidates","base"]}]);
    if(conditionText)graph[0].push({id:"restriction",label:"추가 조건",prose:conditionText});
    graph.push([{id:"selected",operation:method,label:isExtremum(method)?extreme+" 선택":"추가 조건으로 후보 선택",
      math:coord(result.point),from:isExtremum(method)?["measure"]:coordinateOrder?["candidates"]:["candidates","restriction"],prose:conditionText}]);
    graph.push([{id:"answer",operation:requested,label:"구할 값",math:String(answer),from:requested==="coordinate"?["selected"]:["selected","base"]}]);
    return {...problem(stem+(conditionText?(named&&method==="product"?` 점 ${pointC}의 ${freeAxis===0?"가로":"세로"} 좌표를 ${m(x)}라 하면 `:" ")+conditionText:""),[],question,scalar(answer),solution),
      distractors:[read(candidates.find(c=>c!==result))],inspection:{
        environment:named?"geometry":"expression",graph,operations:graph.flatMap(layer=>layer.flatMap(node=>node.operation?[node.operation]:[])),
        conditions:["거리 조건으로 후보를 구하고, 답 경로의 조건으로 후보를 선택한다."],
        selection:{A,B,center,radius,lineDistance:distance,points:[result.point],score:result.score,candidates,order:isExtremum(method)?method:undefined,method,axis:requested==="coordinate"?freeAxis:undefined,target:requested,measure,freeAxis,foot:projection.foot,origin,chosen:chosen.point,...(method==="locus"?{locusCenter,locusRadius}:{})},
        variables:[{key:x,label:"구할 값",value:answer,given:false,target:true,seed:false}],
      }};
  }

  const distanceSelectors=Object.keys(candidateSelectors).map(selector=>({
    id:"distance-"+selector,selector,manualOnly:true,outputType:"Scalar",passthrough:true,
    label:{minimum:"최솟값",maximum:"최댓값",coordinate:"두 후보의 좌표 비교",inequality:"부등식 조건",sign:"부호 조건",locus:"원 위의 조건",product:"곱의 부호 조건"}[selector],
  }));
  const distanceConditionVariant={...alternative("distance-conditions","점과 직선 사이의 거리 활용",distanceOnBisector),
    answerPaths:[{id:"generated",label:"거리 조건과 후보 선택",outputType:"Scalar",passthrough:true},...distanceSelectors]};
  ForgeTopics.types["distance-line-parameter"].variants.push(distanceConditionVariant);

  const compositeTypes={
    "parallel-lines-distance":"parallelDistance",
    "parallel-line":"parallelThrough",
    "perpendicular-line":"perpendicularThrough",
    "line-intersection":"intersection",
  };
  ForgePlaneCompositions = globalThis.ForgePlaneCompositions = Object.freeze(Object.fromEntries(Object.entries(compositeTypes).map(([type,required])=>[
    type,{...composedDistance,answerPaths:[{id:"generated",label:"연산 연결 자동 생성",required,outputType:"Scalar",passthrough:true},
      ...(required==="intersection"?[{id:"common-value",label:"함숫값 차와 부호 조건",structure:"common-value",manualOnly:true,environment:"expression",required,
        operations:["Intersection","EvaluateExpression"],outputType:"Scalar",passthrough:true}]:[])]},
  ])));
})();


;

/* chapter-expansion.js */
(() => {
  "use strict";

  const { tex, m, rand, pick, signed, problem, scalar, choice, set, add, one, shift, par } = globalThis.ForgeTopics;
  const register = (chapter, id, label, path, build) => add(id,chapter,label,"B",one(path,build));
  const poly = (id,label,path,build) => register("polynomials",id,label,path,build);
  const quad = (id,label,path,build) => register("quadratics",id,label,path,build);
  const sets = (id,label,path,build) => register("sets",id,label,path,build);
  const bound = (id,label,path,build) => register("absolute",id,label,path,build);
  const R = (rng,low=2,high=6) => rand(rng,low,high);
  const factor = a => `(${shift("x",a)})`;
  const formatSet = values => values.length ? tex`\\{${values.join(",\\,")}\\}` : tex`\\varnothing`;
  const equals = (name,values) => `${name}=${formatSet(values)}`;
  const closed = (a,b) => ({
    kind:"interval",value:[{start:a,end:b,startClosed:true,endClosed:true}],text:m(`[${a},${b}]`),
  });
  function expression(...coefficients) {
    const terms=[];
    for(let i=0;i<coefficients.length;i++){
      const c=coefficients[i], power=coefficients.length-i-1;
      if(!c) continue;
      const variable=power===0?"":power===1?"x":`x^{${power}}`;
      const amount=Math.abs(c)===1&&power?"":Math.abs(c);
      terms.push((c<0?"-":terms.length?"+":"")+amount+variable);
    }
    return terms.join("")||"0";
  }
  function binomial(n,k) {
    let value=1;
    for(let i=1;i<=k;i++) value=value*(n-i+1)/i;
    return value;
  }

  poly("product-coefficient","다항식 곱의 특정 차수 계수","차수가 목표 값이 되는 항만 선택",rng=>{
    const [a,b,c,d]=[signed(rng),signed(rng),signed(rng),signed(rng)];
    const degree=pick(rng,[2,3]);
    const value=degree===2?b+a*c+d:a+c;
    return problem("다음 곱을 전개한다.",[`(${expression(1,a,b)})(${expression(1,c,d)})`],
      `${m(`x^{${degree}}`)}의 계수를 구하시오.`,scalar(value),
      [degree===2?`차수의 합이 2인 조합을 모으면 ${m(`${b}+${par(a)}\\cdot${par(c)}+${par(d)}=${value}`)}이다.`
        :`차수의 합이 3인 조합을 모으면 ${m(`${a}+${par(c)}=${value}`)}이다.`]);
  });
  poly("identity-two-coefficients","항등식의 계수 비교","서로 다른 차수의 계수로 두 상수 결정",rng=>{
    const h=signed(rng),a=signed(rng),b=signed(rng), c=b-h*a;
    return problem(`모든 실수 ${m("x")}에서 다음 등식이 성립한다.`,[`${factor(h)}(ax+b)=${expression(a,c,-h*b)}`],
      `${m("a+b")}를 구하시오.`,scalar(a+b),
      [`이차항의 계수에서 ${m(`a=${a}`)}, 일차항의 계수에서 ${m(`b-(${h})a=${c}`)}를 얻는다. 따라서 ${m(`a+b=${a+b}`)}이다.`]);
  });
  poly("quotient-linear","일차식으로 나눈 몫의 계수","조립제법에서 몫의 일차항 역산",rng=>{
    const h=signed(rng),a=R(rng,1,4),b=signed(rng),c=signed(rng),r=signed(rng);
    return problem("다항식과 제수가 다음과 같다.",[`P(x)=${expression(a,b-h*a,c-h*b,r-h*c)},\\qquad D(x)=${factor(h)}`],
      `${m("P(x)")}를 ${m("D(x)")}로 나눈 몫의 일차항 계수를 구하시오.`,scalar(b),
      [`몫을 ${m("ux^2+vx+w")}라 놓는다. 삼차항의 계수에서 ${m(`u=${a}`)}, 이차항의 계수에서 ${m(`v-(${h})u=${b-h*a}`)}를 얻으므로 ${m(`v=${b}`)}이다.`]);
  });
  poly("division-rebuild","몫과 나머지에서 원래 다항식 복원","나눗셈의 관계식으로 특정 함수값 계산",rng=>{
    const h=signed(rng),b=signed(rng),c=signed(rng),r=signed(rng),t=h+R(rng,1,3);
    const v=(t-h)*(t*t+b*t+c)+r;
    return problem(`다항식 ${m("P(x)")}를 ${m(factor(h))}로 나눈 몫과 나머지가 다음과 같다.`,
      [`Q(x)=${expression(1,b,c)},\\qquad R=${r}`], `${m(`P(${t})`)}의 값을 구하시오.`,scalar(v),
      [`${m(`P(x)=${factor(h)}Q(x)+R`)}에 ${m(`x=${t}`)}를 대입하면 ${m(v)}이다.`]);
  });
  poly("factor-parameter","인수정리로 미지의 계수 구하기","일차식이 인수라는 조건을 함수값에 적용",rng=>{
    const h=signed(rng),a=signed(rng),k=signed(rng),b=-(h**3)-a*h*h-k*h;
    return problem(`다음 다항식이 ${m(factor(h))}로 나누어떨어진다.`,[`P(x)=${expression(1,a,0,0)}+kx${b<0?b:b>0?"+"+b:""}`],
      `${m("k")}를 구하시오.`,scalar(k),
      [`인수정리에 따라 ${m(`P(${h})=0`)}이다. ${m(h)}가 0이 아니므로 이 일차방정식의 해는 ${m(k)} 하나이다.`]);
  });
  poly("two-factors-parameters","서로 다른 두 인수로 계수 두 개 결정","두 함수값을 이용해 연립방정식 구성",rng=>{
    const a=-R(rng,1,5),b=R(rng,1,5),c=signed(rng);
    const u=a*b-c*(a+b),v=a*b*c;
    return problem(`다음 다항식이 ${m(factor(a))}와 ${m(factor(b))}로 각각 나누어떨어진다.`,
      [`P(x)=${expression(1,c-a-b,0,0)}+ux+v`],
      `${m("u+v")}를 구하시오.`,scalar(u+v),
      [`두 인수가 서로 다르므로 ${m(`${factor(a)}${factor(b)}`)}가 인수다. 최고차항과 이차항으로부터 나머지 인수는 ${m(factor(-c))}이며, 전개하면 ${m(`u=${u},\\quad v=${v}`)}이다.`]);
  });
  poly("quartic-even-factorization","짝수 차수 사차식의 치환과 인수분해","이차식으로 치환해 양의 근 복원",rng=>{
    const a=R(rng,1,4),b=a+R(rng,1,3);
    return problem("다음 방정식을 생각하자.",[`${expression(1,0,-a*a-b*b,0,a*a*b*b)}=0`],
      "서로 다른 양의 실근의 합을 구하시오.",scalar(a+b),
      [`${m("t=x^2")}로 놓으면 ${m(`(t-${a*a})(t-${b*b})=0`)}이다. 따라서 양의 근은 ${m(`${a},\\ ${b}`)}이다.`]);
  });
  poly("reciprocal-cube","역수 관계를 이용한 세제곱합","주어진 대칭식과 세제곱 공식 결합",rng=>{
    const s=R(rng,3,8)*pick(rng,[-1,1]);
    return problem(`${m("x")}는 0이 아닌 실수이다.`,[tex`x+\\frac1x=${s}`],
      `${m(tex`x^3+\\frac1{x^3}`)}의 값을 구하시오.`,scalar(s**3-3*s),
      [`주어진 식을 세제곱하면 구하는 식과 ${m(tex`3\\left(x+\\frac1x\\right)`)}의 합이 된다. 따라서 ${m(`${par(s)}^3-3\\cdot${par(s)}=${s**3-3*s}`)}이다.`]);
  });
  poly("power-remainder","이차식으로 나눈 거듭제곱의 나머지","제수의 관계를 반복 적용해 차수 축소",rng=>{
    const a=R(rng,2,4),b=signed(rng),n=pick(rng,[4,5,6,7]),t=signed(rng,3);
    const power=a**Math.floor(n/2),v=power*(n%2?t:1)+b*t;
    return problem(`아래 다항식을 ${m(`x^2-${a}`)}로 나눈 나머지를 ${m("R(x)")}라 하자.`,[`P(x)=x^{${n}}${b>0?"+":""}${expression(b,0)}`],
      `${m(`R(${t})`)}의 값을 구하시오.`,scalar(v),
      [`${m(`x^2-${a}`)}의 배수를 빼면서 ${m("x^2")}를 ${m(a)}로 바꾼다. 나머지는 ${m(expression(n%2?power+b:b,n%2?0:power))}이므로 답은 ${m(v)}이다.`]);
  });
  poly("composed-remainder","합성한 다항식의 나머지","바깥 다항식에 넣을 값을 먼저 계산",rng=>{
    const h=signed(rng),d=signed(rng),b=signed(rng),r=signed(rng),t=(h-d)**2+b;
    return problem(`다항식 ${m("P")}가 다음 조건을 만족한다.`,[`P(${t})=${r}`,`F(x)=P(${factor(d)}^2+${par(b)})+x`],
      `${m("F(x)")}를 ${m(factor(h))}로 나눈 나머지를 구하시오.`,scalar(r+h),
      [`나머지는 ${m(`F(${h})`)}이다. 안쪽 식은 ${m(t)}이므로 바깥의 함수값은 ${m(r)}이고, ${m(h)}를 더한다.`]);
  });
  poly("cube-sum-identity","두 수의 합과 곱에서 세제곱합 계산","대칭 조건을 세제곱 항등식에 대입",rng=>{
    const a=signed(rng),b=signed(rng),s=a+b,p=a*b;
    return problem("두 실수에 대해 다음이 주어져 있다.",[`x+y=${s},\\qquad xy=${p}`],
      `${m("x^3+y^3")}의 값을 구하시오.`,scalar(a**3+b**3),
      [`${m("x^3+y^3=(x+y)^3-3xy(x+y)")}에 대입하면 ${m(a**3+b**3)}이다.`]);
  });
  poly("remainder-algebra","두 나머지에서 곱·합의 나머지 계산","동일한 제수에서 얻은 함수값 두 개 사용",rng=>{
    const h=signed(rng),a=signed(rng),b=signed(rng),v=h*a*a+b;
    return problem(`다항식 ${m("P,Q")}를 각각 ${m(factor(h))}로 나눈 나머지는 차례로 ${m(a)}, ${m(b)}이다.`,[`F(x)=xP(x)^2+Q(x)`],
      `${m("F(x)")}를 같은 식으로 나눈 나머지를 구하시오.`,scalar(v),
      [`${m(`P(${h})=${a},\\quad Q(${h})=${b}`)}를 이용하면 ${m(`F(${h})=${v}`)}이다.`]);
  });
  poly("known-root-cubic","한 인수가 알려진 삼차식의 인수분해","일차 인수를 제거하고 이차 인수 복원",rng=>{
    const a=-R(rng,2,5),b=R(rng,1,4),c=b+R(rng,1,4);
    return problem(`${m(factor(a))}가 아래 다항식의 인수이다.`,[`P(x)=${expression(1,-a-b-c,a*b+b*c+c*a,-a*b*c)}`],
      "이 다항식의 가장 큰 실근을 구하시오.",scalar(c),
      [`알려진 일차 인수로 나누면 몫은 ${m(expression(1,-b-c,b*c))}이다. 이 이차식의 근은 ${m(b)}, ${m(c)}이다.`]);
  });

  quad("double-root-parameter","중근 조건에서 미지의 계수 결정","판별식이 0인 조건 사용",rng=>{
    const h=signed(rng),c=signed(rng),a=R(rng,2,4), value=a*h*h-c;
    return problem("다음 이차방정식이 중근을 갖는다.",[`${expression(a,-2*a*h,c)}+k=0`],
      `${m("k")}를 구하시오.`,scalar(value),[`좌변을 완전제곱으로 정리하면 ${m(`${a}${factor(h)}^2+k-(${value})`)}이다. 중근을 가지려면 상수 부분이 0이어야 한다.`]);
  });
  quad("real-roots-parameter","서로 다른 두 실근을 갖는 정수 상수","판별식의 엄격한 부등식과 정수 조건",rng=>{
    const h=signed(rng),a=signed(rng),cap=h*h-a;
    return problem("다음 이차방정식이 서로 다른 두 실근을 갖는다.",[`${expression(1,-2*h,a)}+k=0`],
      `정수 ${m("k")}의 최댓값을 구하시오.`,scalar(cap-1),
      [`판별식이 양수일 조건은 ${m(`k<${cap}`)}이므로 정수의 최댓값은 ${m(cap-1)}이다.`]);
  });
  quad("positive-roots-parameter","두 근이 모두 양수가 되는 상수","판별식과 근의 합·곱을 함께 사용",rng=>{
    const h=R(rng,2,5),c=signed(rng);
    return problem("다음 이차방정식이 서로 다른 두 양의 실근을 갖는다.",[`${expression(1,-2*h,c)}+k=0`],
      `가능한 정수 ${m("k")}는 몇 개인가?`,scalar(h*h-1),
      [`근의 합은 ${m(2*h)}으로 양수다. 근의 곱도 양수이고 판별식도 양수여야 하므로 ${m(`0<k+(${c})<${h*h}`)}이다.`,
       `${m("k+("+c+")")}가 가질 수 있는 정수 값은 ${m(1)}부터 ${m(h*h-1)}까지이다.`]);
  });
  quad("opposite-roots-parameter","두 근의 부호가 반대가 되는 상수","근의 곱의 부호로 상수 범위 결정",rng=>{
    const h=signed(rng),a=signed(rng),c=R(rng,2,4),k=Math.ceil(-a/c)-1;
    return problem("다음 이차방정식은 양의 근과 음의 근을 하나씩 갖는다.",[`${expression(1,h,a)}+${c}k=0`],
      `정수 ${m("k")}의 최댓값을 구하시오.`,scalar(k),
      [`근의 곱이 음수이면 판별식도 양수이다. 따라서 필요한 조건은 ${m(`${a}+${c}k<0`)}이며, 가장 큰 정수 해는 ${m(k)}이다.`]);
  });
  quad("shifted-roots","두 근을 평행이동한 방정식의 계수","근을 직접 구하지 않고 이동한 근의 곱 계산",rng=>{
    const a=-R(rng,1,5),b=R(rng,1,5),t=signed(rng),value=(a+t)*(b+t);
    return problem(`아래 방정식의 두 근을 ${m(tex`\\alpha,\\beta`)}라고 하자.`,[`${expression(1,-a-b,a*b)}=0`],
      `${m(tex`\\alpha+${par(t)},\\ \\beta+${par(t)}`)}를 두 근으로 갖는 최고차항 계수 1인 이차방정식의 상수항을 구하시오.`,scalar(value),
      [`새 근의 곱은 ${m(tex`\\alpha\\beta+(${t})(\\alpha+\\beta)+(${t})^2`)}이다. 근과 계수의 관계를 적용하면 ${m(value)}이다.`]);
  });
  quad("root-square-sum","근과 계수의 관계로 제곱합 계산","근의 합과 곱으로 대칭식 정리",rng=>{
    const a=-R(rng,1,6),b=R(rng,1,6),v=a*a+b*b;
    return problem(`이차방정식의 두 근을 ${m(tex`\\alpha,\\beta`)}라 하자.`,[`${expression(1,-a-b,a*b)}=0`],
      `${m(tex`\\alpha^2+\\beta^2`)}의 값을 구하시오.`,scalar(v),
      [`${m(tex`\\alpha^2+\\beta^2=(\\alpha+\\beta)^2-2\\alpha\\beta`)}에 근의 합과 곱을 대입하면 ${m(v)}이다.`]);
  });
  quad("axis-equal-values","서로 같은 함숫값으로 이차함수의 축 결정","대칭인 두 입력의 평균에서 꼭짓점의 함숫값 계산",rng=>{
    const h=signed(rng),d=R(rng,1,4),a=R(rng,2,4),v=signed(rng);
    return problem(`최고차항의 계수가 ${m(a)}인 이차함수 ${m("f")}가 다음을 만족한다.`,
      [`f(${h-d})=f(${h+d})=${v+a*d*d}`],"이 이차함수의 최솟값을 구하시오.",scalar(v),
      [`두 입력은 대칭이므로 축은 ${m(`x=${h}`)}이다. 각 입력은 축에서 ${m(d)}만큼 떨어져 있으므로 주어진 함숫값에서 ${m(a*d*d)}를 빼면 된다.`]);
  });
  function rangeExtremum(rng,maximum){
    const h=signed(rng),v=signed(rng),a=R(rng,1,3);
    const left=h-R(rng,1,5),right=h+R(rng,1,5),outside=rng()<.5;
    const l=outside?h+1:left, u=outside?h+R(rng,2,5):right;
    const d=maximum?Math.max(Math.abs(l-h),Math.abs(u-h)):h<l?l-h:h>u?h-u:0;
    return problem(`이차함수 ${m("f")}를 ${m(tex`${l}\\le x\\le${u}`)}에서 생각하자.`,
      [`f(x)=${expression(a,-2*a*h,a*h*h+v)}`],`이 구간에서 함숫값의 ${maximum?"최댓값":"최솟값"}을 구하시오.`,scalar(v+a*d*d),
      [`완전제곱식은 ${m(`f(x)=${a}${factor(h)}^2+${par(v)}`)}이다. 구간에서 축과 ${maximum?"가장 멀리":"가장 가까이"} 있는 입력을 고르면 ${m(v+a*d*d)}이다.`]);
  }
  quad("quadratic-restricted-min","닫힌 구간에서 이차함수의 최솟값","축이 구간 안인지 판별하고 끝점과 비교",rng=>rangeExtremum(rng,false));
  quad("quadratic-restricted-max","닫힌 구간에서 이차함수의 최댓값","두 끝점의 축까지 거리를 비교",rng=>rangeExtremum(rng,true));
  quad("quadratic-system","두 이차부등식의 공통 해","개별 해를 구한 뒤 두 구간의 교집합 계산",rng=>{
    const a=signed(rng),b=a+R(rng,1,3),c=b+R(rng,1,3),d=c+R(rng,1,3);
    return problem("다음 두 부등식을 동시에 만족해야 한다.",
      [tex`${expression(1,-a-c,a*c)}\\le0`,tex`${expression(1,-b-d,b*d)}\\le0`],
      "공통 해를 구간으로 나타내시오.",closed(b,c),
      [`각 부등식의 해는 ${m(`[${a},${c}]`)}와 ${m(`[${b},${d}]`)}이다. 교집합은 ${m(`[${b},${c}]`)}이다.`]);
  });
  quad("quadratic-from-solution","해 구간에서 이차식 복원","해의 경계와 최고차항을 사용해 함수값 계산",rng=>{
    const a=-R(rng,1,5),b=R(rng,1,5),k=R(rng,2,4),t=b+R(rng,1,3);
    return problem(`최고차항 계수가 ${m(k)}인 이차함수 ${m("f")}에서 다음 부등식의 해가 주어져 있다.`,
      [tex`f(x)\\le0,\\qquad x\\in[${a},${b}]`],
      `${m(`f(${t})`)}를 구하시오.`,scalar(k*(t-a)*(t-b)),
      [`구간의 양 끝이 근이므로 ${m(`f(x)=${k}${factor(a)}${factor(b)}`)}이다. 여기에 ${m(`x=${t}`)}를 대입한다.`]);
  });
  quad("quadratic-always-sign","판별식과 이차부등식의 해 존재 여부","그래프의 방향과 실근 유무를 결합",rng=>{
    const h=signed(rng),a=R(rng,1,4),delta=R(rng,1,5),above=rng()<.5;
    const c=a*h*h+delta, empty=above;
    return problem("다음 이차부등식의 실수 해를 생각하자.",[tex`${expression(a,-2*a*h,c)}${above?"<":">"}0`],
      "해집합을 고르시오.",choice(rng,empty?"공집합":"실수 전체",[empty?"실수 전체":"공집합",m(`x=${h}`),m(tex`x\\ge${h}`)]),
      [`판별식은 ${m(-4*a*delta)}으로 음수이고 최고차항 계수는 양수다. 따라서 이차식의 값은 모든 실수에서 양수다.`]);
  });

  sets("venn-complement-count","벤 다이어그램으로 두 조건의 여집합 연결","한 집합 밖을 이루는 두 영역 선택",rng=>{
    const counts=Array.from({length:4},()=>R(rng,1,9));
    const [a,,b,outside]=counts;
    const forA=rng()<.5,name=forA?"A":"B",only=forA?b:a;
    return {
      ...problem("벤 다이어그램의 숫자는 각 영역의 원소 개수이다.",[],
        `전체집합에서 ${m(name)}에 속하지 않는 원소의 개수를 구하시오.`,scalar(only+outside),
        [`두 집합 모두에 속하지 않는 영역과 ${m(forA?"B":"A")}에만 속하는 영역을 합하면 ${m(only+outside)}개이다.`]),
      plot:{kind:"venn",counts},
    };
  });
  sets("symmetric-difference","대칭차집합의 원소 개수","공통 원소를 두 번 제외",rng=>{
    const a=R(rng,3,9),b=R(rng,4,10),both=R(rng,1,4);
    return problem("두 집합에 대한 원소 개수가 다음과 같다.",[
      tex`|A|=${a+both},\\quad |B|=${b+both},\\quad |A\\cap B|=${both}`],
      "두 집합 중 정확히 한 집합에만 속하는 원소는 몇 개인가?",scalar(a+b),
      [`합쳐 센 ${m(`|A|+|B|`)}에서 공통 원소 수 ${m(both)}를 두 번 빼면 된다.`]);
  });
  sets("three-set-inclusion","세 집합의 합집합과 포함배제","일곱 영역에서 만들어진 교집합 수를 포함배제에 적용",rng=>{
    const [a,b,c,d,e,f,g]=Array.from({length:7},()=>R(rng,1,6));
    const total=a+b+c+d+e+f+g;
    return problem("세 집합의 원소 수와 공통 원소 수가 다음과 같다.",[
      tex`|A|=${a+d+e+g},\\quad |B|=${b+d+f+g},\\quad |C|=${c+e+f+g}`,
      tex`|A\\cap B|=${d+g},\\quad |B\\cap C|=${f+g},\\quad |C\\cap A|=${e+g}`,
      tex`|A\\cap B\\cap C|=${g}`],"세 집합의 합집합의 원소 개수를 구하시오.",scalar(total),
      [`각 집합의 크기를 더하고 두 집합씩의 교집합 크기를 뺀 다음, 세 집합의 교집합 크기를 다시 더하면 ${m(total)}이다.`]);
  });
  sets("exactly-two-of-three","세 집합 중 정확히 두 곳에 속한 원소","쌍별 교집합에서 삼중교집합 제거",rng=>{
    const [a,b,c,d]=Array.from({length:4},()=>R(rng,1,8));
    return problem("세 집합의 교집합에 대하여 다음이 주어져 있다.",[
      tex`|A\\cap B|=${a+d},\\quad |A\\cap C|=${b+d},\\quad |B\\cap C|=${c+d}`,tex`|A\\cap B\\cap C|=${d}`],
      "세 집합 중 정확히 두 집합에 속하는 원소의 수를 구하시오.",scalar(a+b+c),
      [`쌍별 교집합의 크기를 합하면 삼중교집합의 원소가 세 번 포함된다. 따라서 ${m(3*d)}를 빼야 한다.`]);
  });
  sets("complement-intersection-count","한 집합의 여집합과 다른 집합의 교집합","합집합의 크기에서 집합 차의 원소 수 추론",rng=>{
    const a=R(rng,2,7),b=R(rng,2,7),c=R(rng,1,5);
    return problem("전체집합의 부분집합에 대해 다음이 성립한다.",[tex`|A|=${a+c},\\quad |B|=${b+c},\\quad |A\\cup B|=${a+b+c}`],
      `${m(tex`|A^c\\cap B|`)}를 구하시오.`,scalar(b),
      [`합집합에서 ${m("A")}의 모든 원소를 빼면 ${m(tex`A^c\\cap B`)}가 남으므로 답은 ${m(b)}이다.`]);
  });
  sets("recover-a-set","합집합과 교집합에서 한 집합 복원","합집합 중 바깥 원소와 공통 원소 결합",rng=>{
    const h=signed(rng),a=[h,h+1,h+2],both=pick(rng,[h,h+2]),extra=[h+4,h+5];
    return problem("두 집합이 다음 조건을 만족한다.",[
      equals("A",a),equals(tex`A\\cup B`,[...a,...extra]),equals(tex`A\\cap B`,[both])],
      `${m("B")}의 원소를 구하시오.`,set([both,...extra]),
      [`합집합의 원소 중 ${m("A")}에 없는 것은 전부 ${m("B")}에 속한다. 여기에 교집합의 원소를 더하면 된다.`]);
  });
  sets("power-set-union-difference","합집합의 부분집합에서 두 멱집합 제외","부분집합 개수 공식에 포함배제 적용",rng=>{
    const a=R(rng,1,3),b=R(rng,1,3),c=R(rng,1,3),v=2**(a+b+c)-2**(a+c)-2**(b+c)+2**c;
    return problem("두 집합의 원소 수가 다음과 같다.",[tex`|A|=${a+c},\\quad |B|=${b+c},\\quad |A\\cap B|=${c}`],
      `${m(tex`A\\cup B`)}의 부분집합 가운데 ${m("A")}의 부분집합도 ${m("B")}의 부분집합도 아닌 것은 몇 개인가?`,scalar(v),
      [`합집합의 부분집합은 ${m(2**(a+b+c))}개이다. 두 집합의 부분집합 수를 각각 빼고, 양쪽에 속하는 교집합의 부분집합 수 ${m(2**c)}를 다시 더한다.`]);
  });
  sets("subsets-fixed-size","필수 원소를 포함하는 정해진 크기의 부분집합","남은 원소를 조합으로 선택",rng=>{
    const n=R(rng,6,10),k=R(rng,3,n-1),r=R(rng,1,2);
    return problem(`원소가 ${m(n)}개인 집합에서 ${m(r)}개의 서로 다른 원소를 지정했다.`,[],
      `지정한 원소를 모두 포함하고 원소의 수가 ${m(k)}개인 부분집합은 몇 개인가?`,scalar(binomial(n-r,k-r)),
      [`지정한 원소를 먼저 넣고, 나머지 ${m(n-r)}개에서 ${m(k-r)}개를 고른다. 따라서 ${m(tex`\\binom{${n-r}}{${k-r}}=${binomial(n-r,k-r)}`)}이다.`]);
  });
  sets("subsets-intersection","교집합이 정해진 부분집합의 개수","교집합 바깥 원소의 선택 자유도 계산",rng=>{
    const n=R(rng,5,9),b=R(rng,2,n-1),c=R(rng,1,b-1);
    return problem(`집합 ${m("A")}의 부분집합 ${m("B")}와 ${m("B")}의 부분집합 ${m("C")}가 고정되어 있다.`,
      [`|A|=${n},\\quad |B|=${b},\\quad |C|=${c}`],
      `${m(tex`X\\cap B=C`)}를 만족하는 ${m("A")}의 부분집합 ${m("X")}는 몇 개인가?`,scalar(2**(n-b)),
      [`${m("B")} 안에서는 ${m("C")}의 원소만 선택해야 한다. ${m("B")} 밖의 ${m(n-b)}개는 자유롭게 선택할 수 있다.`]);
  });
  sets("nested-subsets","서로 포함되는 부분집합 쌍의 개수","원소 하나당 가능한 소속 상태를 나누어 계산",rng=>{
    const n=R(rng,3,8);
    return problem(`집합 ${m("A")}에 서로 다른 원소가 ${m(n)}개 있다.`,[],
      `${m(tex`X\\subseteq Y\\subseteq A`)}를 만족하는 순서쌍 ${m("(X,Y)")}는 몇 개인가?`,scalar(3**n),
      [`각 원소는 두 집합 모두에 속하거나, ${m("Y")}에만 속하거나, 둘 다에 속하지 않을 수 있다. 독립적으로 세 경우씩 있다.`]);
  });
  sets("equality-unordered-set","집합의 상등을 이용한 상수 결정","원소의 순서와 관계없이 작은 원소를 대응",rng=>{
    const a=signed(rng),d=R(rng,2,7),t=signed(rng), k=a-t;
    return problem("다음 두 집합은 서로 같다.",[tex`\\{k+${par(t)},\\ k+${par(t+d)}\\}=\\{${a+d},\\ ${a}\\}`],
      `${m("k")}의 값을 구하시오.`,scalar(k),
      [`왼쪽의 작은 원소는 ${m(`k+${par(t)}`)}이고, 오른쪽의 작은 원소는 ${m(a)}이다. 두 수를 같게 놓는다.`]);
  });
  sets("set-divisibility-count","배수 조건으로 표현된 두 집합의 교집합","최소공배수와 유한 범위로 원소 개수 계산",rng=>{
    const g=R(rng,2,4), [a,b]=pick(rng,[[2,3],[3,4],[3,5]]), q=R(rng,2,5), l=g*a*b, n=q*l+R(rng,1,l-1);
    return problem(`전체집합은 ${m(n)} 이하의 양의 정수 전체이다.`,[
      tex`A=\\{x:\\ ${a*g}\\mid x\\},\\quad B=\\{x:\\ ${b*g}\\mid x\\}`],
      `두 집합의 교집합의 원소 수를 구하시오. ${m(tex`d\\mid x`)}는 ${m("x")}가 ${m("d")}의 배수라는 뜻이다.`,scalar(q),
      [`공배수는 최소공배수 ${m(l)}의 배수이다. ${m(n)} 이하인 양의 배수는 ${m(q)}개다.`]);
  });

  bound("weighted-absolute-min","가중치가 다른 두 절댓값의 합","삼각부등식과 남는 가중치를 활용해 등호 결정",rng=>{
    const a=signed(rng),b=a+R(rng,2,7),w=R(rng,2,4),h=R(rng,1,3),left=rng()<.5;
    const big=w+h;
    return problem(`실수 ${m("x")}에 대한 식이다.`,[`${left?big:w}|${shift("x",a)}|+${left?w:big}|${shift("x",b)}|`],
      "이 식을 최소로 만드는 실수를 구하시오.",scalar(left?a:b),
      [`가중치 ${m(w)}만큼을 묶으면 두 점까지의 거리 합이다. 그 합은 두 점 사이의 거리 이상이며, 남은 항이 0이 되는 ${m(`x=${left?a:b}`)}에서 하한에 도달한다.`]);
  });
  bound("abs-maximum-bounded","절댓값 조건 아래 다른 절댓값의 최댓값","첫 절댓값을 구간으로 바꾸고 먼 끝점을 비교",rng=>{
    const a=signed(rng),b=a+signed(rng,5),d=R(rng,2,6),v=Math.abs(a-b)+d;
    return problem(`실수 ${m("x")}가 다음 조건을 만족한다.`,[tex`|${shift("x",a)}|\\le${d}`],
      `${m(`|${shift("x",b)}|`)}의 최댓값을 구하시오.`,scalar(v),
      [`가능한 구간은 ${m(`[${a-d},${a+d}]`)}이다. ${m(b)}에서 더 먼 끝점까지의 거리가 ${m(v)}이다.`]);
  });
  bound("amgm-three-sum","세 양수의 곱이 일정할 때 합의 최솟값","세 항에 산술기하평균 적용",rng=>{
    const t=R(rng,2,6),a=R(rng,2,4),b=R(rng,2,4),s=a*b*t;
    return problem("세 양수의 곱이 다음과 같다.",[`xyz=${(a*b)**2*t**3}`],
      `${m(`${a}x+${b}y+z`)}의 최솟값을 구하시오.`,scalar(3*s),
      [`세 항의 곱은 ${m(s**3)}이므로 세 항의 합은 ${m(3*s)} 이상이다. 세 항을 모두 ${m(s)}로 놓으면 주어진 곱의 조건도 만족한다.`]);
  });
  bound("amgm-three-product","세 양수의 가중합이 일정할 때 곱의 최댓값","가중치를 포함한 세 항을 같게 놓아 곱 최대화",rng=>{
    const a=R(rng,2,4),b=R(rng,2,5),t=R(rng,1,4),s=a*b*t;
    return problem("세 양수가 다음 조건을 만족한다.",[`${a}x+${b}y+z=${3*s}`],
      `${m("xyz")}의 최댓값을 구하시오.`,scalar(s**3/(a*b)),
      [`산술기하평균에 따라 ${m(`${a}x,${b}y,z`)}의 곱은 ${m(s**3)} 이하이며, 세 항이 모두 ${m(s)}일 때 등호가 성립한다. 이 곱을 ${m(a*b)}로 나눈다.`]);
  });
  bound("cauchy-reciprocals","코시-슈바르츠 부등식과 역수의 합","분모와 분자의 제곱근을 각각 내적 항에 배치",rng=>{
    const a=R(rng,2,5),b=a+R(rng,1,4),d=pick(rng,[1,2]),s=(a+b)*d,v=(a+b)/d;
    return problem(`두 양수 ${m("x,y")}의 합이 ${m(s)}이다.`,[tex`\\frac{${a*a}}x+\\frac{${b*b}}y`],
      "이 식의 최솟값을 구하시오.",scalar(v),[
        `${m(tex`(x+y)\\left(\\frac{${a*a}}x+\\frac{${b*b}}y\\right)\\ge(${a}+${b})^2`)}이다.`,
        `${m(`(x,y)=(${a*d},${b*d})`)}에서 등호가 성립하므로 답은 ${m(v)}이다.`,
      ]);
  });
  bound("cauchy-equality-coordinate","코시-슈바르츠 부등식의 등호에서 좌표 역산","내적 극값과 등호 조건으로 두 변수 결정",rng=>{
    const [a,b,n]=pick(rng,[[3,4,5],[5,12,13],[8,15,17]]),d=R(rng,1,4),sign=pick(rng,[-1,1]),x=sign*a*d,y=sign*b*d;
    const askX=rng()<.5;
    return problem(`실수 ${m("x,y")}가 두 조건을 동시에 만족한다.`,[`x^2+y^2=${(n*d)**2}`,`${a}x+${b}y=${sign*n*n*d}`],
      `${m(askX?"x":"y")}의 값을 구하시오.`,scalar(askX?x:y),
      [`내적의 절댓값이 두 벡터 길이의 곱과 같다. 등호 조건에 따라 두 벡터는 평행하고 내적의 부호까지 고려하면 ${m(`(x,y)=(${x},${y})`)}이다.`]);
  });

  poly("degree-after-cancellation","최고차항 소거와 다항식의 차수","삼차항이 사라지고 이차항이 남는 조건",rng=>{
    const a=R(rng,2,5),k=signed(rng),u=signed(rng),d=signed(rng),b=u*k+d;
    return problem(`다항식 ${m("P,Q")}가 다음과 같다.`,[
      `P(x)=${expression(a*k,b,signed(rng),signed(rng))}`,
      `Q(x)=${expression(a,u,signed(rng),signed(rng))}`],
      `${m("P(x)-tQ(x)")}가 이차식이 되도록 하는 실수 ${m("t")}를 구하시오.`,scalar(k),
      [`삼차항 계수가 0이 되려면 ${m(`${a*k}-${a}t=0`)}이다. 이때 이차항 계수는 ${m(d)}로 0이 아니다.`]);
  });
  poly("two-point-product-remainder","두 다항식의 곱을 이차식으로 나눈 나머지","두 인수에서 함수값을 구해 일차 나머지 보간",rng=>{
    const a=-R(rng,1,4),b=R(rng,1,4),k=signed(rng),c=signed(rng);
    const v1=R(rng,2,4),v2=-R(rng,2,4), r1=k*a+c, r2=k*b+c;
    return problem(`두 다항식 ${m("P,Q")}의 함숫값이 다음과 같다.`,[
      `P(${a})=${v1},\\quad P(${b})=${v2}`,
      `Q(${a})=${v2*r1},\\quad Q(${b})=${v1*r2}`],
      `${m("P(x)Q(x)")}를 ${m(factor(a)+factor(b))}로 나눈 나머지의 일차항 계수를 구하시오.`,
      scalar(v1*v2*k),
      [`나머지의 두 함숫값은 ${m(v1*v2*r1)}, ${m(v1*v2*r2)}이다. 일차항의 계수는 두 함숫값 차를 두 입력의 차 ${m(b-a)}로 나눈 값이다.`]);
  });
  poly("translated-polynomial-factor","평행이동된 다항식과 인수의 관계","변수가 이동한 항등식에서 인수의 근 역산",rng=>{
    const h=signed(rng),a=signed(rng),b=a+R(rng,1,4),t=a+h,v=b+h;
    return problem(`다항식 ${m("P")}가 다음 항등식을 만족한다.`,[`P(x+${par(h)})=${factor(a)}${factor(b)}`],
      `서로 다른 두 근을 갖는 방정식 ${m("P(x)=0")}의 두 근의 곱을 구하시오.`,scalar(t*v),
      [`오른쪽이 0이 되는 입력은 ${m(a)}, ${m(b)}이다. 그때 왼쪽의 ${m("P")}에 들어가는 수는 ${m(t)}, ${m(v)}이다.`]);
  });

  quad("root-gap","판별식으로 두 실근 사이 거리 구하기","근의 차의 제곱을 계수로 표현",rng=>{
    const a=signed(rng),b=a+R(rng,2,7),c=R(rng,1,3);
    return problem(`다음 방정식의 두 실근을 ${m(tex`\\alpha,\\beta`)}라 하자.`,[`${expression(c,-c*(a+b),c*a*b)}=0`],
      `${m(tex`|\\alpha-\\beta|`)}를 구하시오.`,scalar(b-a),
      [`${m(tex`(\\alpha-\\beta)^2=(\\alpha+\\beta)^2-4\\alpha\\beta`)}에 두 근의 합과 곱을 대입하고 양의 제곱근을 취한다.`]);
  });
  quad("quadratic-vertex-point","꼭짓점과 한 점에서 이차함수 결정","꼭짓점형에 한 점을 대입한 뒤 다른 함수값 계산",rng=>{
    const h=signed(rng),j=signed(rng),d=R(rng,2,4),a=pick(rng,[-2,-1,2,3]),t=h-d-1;
    const v=j+a*(t-h)**2;
    return problem(`이차함수 ${m("f")}의 꼭짓점은 ${m(`(${h},${j})`)}이고 다음을 만족한다.`,[`f(${h+d})=${j+a*d*d}`],
      `${m(`f(${t})`)}를 구하시오.`,scalar(v),
      [`꼭짓점형을 ${m(`f(x)=u${factor(h)}^2+${par(j)}`)}로 두고 주어진 함숫값을 대입하면 ${m(`u=${a}`)}이다. 따라서 구하는 값은 ${m(v)}이다.`]);
  });
  quad("quadratic-union","둘 중 하나를 만족하는 이차부등식","두 이차부등식의 해를 구해 합집합으로 결합",rng=>{
    const a=signed(rng),b=a+R(rng,2,4),c=b+R(rng,2,4),d=c+R(rng,2,4);
    const answer={
      kind:"interval",
      value:[{start:a,end:b,startClosed:true,endClosed:true},{start:c,end:d,startClosed:true,endClosed:true}],
      text:m(tex`[${a},${b}]\\cup[${c},${d}]`),
    };
    return problem("다음 두 부등식 중 하나 이상을 만족하는 실수를 구한다.",
      [tex`${expression(1,-a-b,a*b)}\\le0,\\qquad ${expression(1,-c-d,c*d)}\\le0`],
      "해를 구간의 합집합으로 나타내시오.",answer,
      [`각 이차식의 두 근 사이에서 0 이하이다. 따라서 해집합은 ${answer.text}이다.`]);
  });

  sets("complement-of-difference","차집합의 여집합과 연산 법칙","차집합을 교집합으로 바꾸고 드모르간 법칙 적용",rng=>{
    const [a,b]=pick(rng,[["A","B"],["B","A"],["X","Y"]]);
    return problem(`전체집합의 두 부분집합을 ${m(a+","+b)}라 하자.`,[tex`(${a}\\setminus ${b})^c`],
      "위 식과 항상 같은 집합을 고르시오.",choice(rng,m(tex`${a}^c\\cup ${b}`),[
        m(tex`${a}^c\\cap ${b}`),m(tex`${a}\\cup ${b}^c`),m(tex`${a}^c\\cup ${b}^c`),
      ]),[`차집합은 ${m(tex`${a}\\cap ${b}^c`)}와 같다. 이 식에 드모르간 법칙을 적용한다.`]);
  });
  sets("intersection-bound","전체집합 크기로 교집합의 최솟값 구하기","두 집합을 가능한 넓게 펼쳤을 때 겹치는 원소 수",rng=>{
    const u=R(rng,12,22),a=R(rng,6,u-3),b=R(rng,u-a+1,u-1),v=a+b-u;
    return problem(`전체집합 ${m("U")}와 두 부분집합의 크기가 다음과 같다.`,[`|U|=${u},\\qquad |A|=${a},\\qquad |B|=${b}`],
      `${m(tex`|A\\cap B|`)}의 최솟값을 구하시오.`,scalar(v),
      [`교집합의 원소 수는 두 집합의 원소 수의 합에서 합집합 크기를 뺀 값이다. 합집합의 최대 크기는 ${m(u)}이며, ${m("A")} 밖의 원소를 모두 ${m("B")}에 넣으면 그 크기에 도달한다.`]);
  });
  sets("disjoint-sets-parameter","두 정수 집합이 서로소가 되는 상수","연속한 두 범위의 양 끝을 비교",rng=>{
    const a=signed(rng),b=a+R(rng,2,5),d=R(rng,1,5);
    return problem("다음 두 정수 집합은 서로소이다.",[tex`A=\\{x\\in\\mathbb Z:\\ ${a}\\le x\\le${b}\\},\\quad B=\\{x\\in\\mathbb Z:\\ k\\le x\\le k+${d}\\}`],
      `${m(`k\\ge ${a}`)}인 정수 ${m("k")} 중 최솟값을 구하시오.`,scalar(b+1),
      [`${m("B")}의 작은 끝점은 ${m("k")}이다. ${m(`k\\ge ${a}`)}에서 겹치지 않으려면 ${m(`k>${b}`)}여야 한다.`]);
  });

  bound("amgm-cyclic-ratios","순환하는 세 비율의 합","비율의 곱이 1인 구조와 등호 조건 사용",rng=>{
    const a=R(rng,2,4),b=R(rng,2,4),c=(a*b)**2,g=a*b;
    return problem(`세 양수 ${m("x,y,z")}에 대한 식이다.`,
      [tex`${a}\\frac{x}{y}+${b}\\frac{y}{z}+${c}\\frac{z}{x}`],
      "이 식의 최솟값을 구하시오.",scalar(3*g),
      [`비율의 곱이 1이므로 세 항의 곱은 ${m(g**3)}이다. ${m(`(x,y,z)=(${a*b},${a},1)`)}에서 세 항이 ${m(g)}로 같아진다.`]);
  });
  bound("reverse-triangle-equality","두 절댓값 차의 최댓값과 등호 구간","역삼각부등식의 등호가 되는 반직선 판별",rng=>{
    const a=signed(rng),b=a+R(rng,2,7),reverse=rng()<.5;
    const answer=reverse ? {
      kind:"interval",value:[{start:null,end:a,startClosed:false,endClosed:true}],text:m(tex`(-\\infty,${a}]`),
    } : {
      kind:"interval",value:[{start:b,end:null,startClosed:true,endClosed:false}],text:m(tex`[${b},\\infty)`),
    };
    const [u,v]=reverse?[b,a]:[a,b];
    return problem(`실수 ${m("x")}에 대한 식이다.`,[`|${shift("x",u)}|-|${shift("x",v)}|`],
      "이 식이 최대가 되는 실수의 범위를 구간으로 나타내시오.",answer,
      [`두 거리의 차는 두 고정점 사이의 거리 ${m(b-a)} 이하이다. 이 값에 도달하려면 ${m(v)}가 ${m(u)}와 움직이는 점 사이에 있어야 한다. 따라서 ${answer.text}이다.`]);
  });
})();


;

/* common2-geometry.js */
(() => {
  "use strict";
  const {tex,m,rand,pick,signed,shift,term,par,coord,add,one,problem,scalar,point,choice}=globalThis.ForgeTopics;
  const R=(r,a=2,b=5)=>rand(r,a,b);
  const S=(r,n=5)=>signed(r,n);
  const P=r=>[S(r),S(r)];
  const plus=([a,b],[x,y])=>[a+x,b+y];
  const scale=(p,n)=>p.map(x=>x*n);
  const minus=(a,b)=>plus(a,scale(b,-1));
  const squared=(a,b)=>minus(a,b).reduce((v,x)=>v+x*x,0);
  const triple=r=>pick(r,[[3,4,5],[4,3,5],[5,12,13]]);
  const n=(name,value)=>m(name+coord(value));
  const L=(s,c)=>`y=${s===0?c:shift(term(s,"x"),-c)}`;
  const E=(a,b,c)=>`${term(a,"x")}${b>=0?"+":""}${term(b,"y")}=${c}`;
  const dot=([a,b],[x,y])=>a*x+b*y;
  const C=([a,b],r)=>`(${shift("x",a)})^2+(${shift("y",b)})^2=${r*r}`;
  const type=(u,id,label,f,level)=>add(id,u,label,level,one(label,f));
  const Co=(id,label,f,level="B")=>type("coordinate",id,label,f,level);
  const Li=(id,label,f,level="B")=>type("lines",id,label,f,level);
  const Ci=(id,label,f,level="B")=>type("circles",id,label,f,level);
  const Tr=(id,label,f,level="B")=>type("transformations",id,label,f,level);

  Co("a-coordinate-section","주어진 비로 내분점 계산",rng=>{
    const p=P(rng),d=[1,S(rng,2)],k=R(rng),a=minus(p,d),b=plus(p,scale(d,k));
    const reverse=rng()<.5;
    const segment=reverse?"BA":"AB", ratio=reverse?k+":1":"1:"+k;
    return problem(`두 점 ${n("A",a)}, ${n("B",b)}가 있다. 선분 ${m(segment)}를 ${m(ratio)}로 내분하는 점을 생각하자.`,[],"내분점의 좌표를 구하시오.",point(p),
      ["각 좌표에 내분비의 반대쪽 수를 곱해 더하고, 비의 합으로 나눈다."]);
  },"A");
  Co("a-number-line-distance","수직선 위의 두 점 사이 거리",rng=>{
    const a=S(rng),b=a+R(rng);
    return problem("수직선 위에 두 점이 있다.",[`A(${a}),\\quad B(${b})`],"두 점 사이의 거리를 구하시오.",scalar(b-a),["좌표의 차의 절댓값을 구한다."]);
  },"A");
  Co("coordinate-distance-coordinate","거리와 좌우 조건에서 좌표 역산",rng=>{
    const p=P(rng),[x,y,d]=triple(rng),s=pick(rng,[-1,1]);
    return problem(`두 점 ${n("A",p)}, ${m(`B(t,${p[1]+y})`)} 사이의 거리는 ${m(d)}이다. ${m("B")}는 ${m("A")}보다 ${s>0?"오른쪽":"왼쪽"}에 있다.`,[],
      `${m("t")}를 구하시오.`,scalar(p[0]+s*x),["피타고라스 정리로 가로 거리의 절댓값을 구하고, 주어진 좌우 조건으로 부호를 정한다."]);
  });
  Co("coordinate-directed-number-line","수직선 내분에서 한쪽 끝점 역산",rng=>{
    const p=S(rng),d=R(rng),u=R(rng,1,3),v=R(rng,2,5),a=p-u*d,b=p+v*d;
    return problem(`수직선에서 점 ${m(`P(${p})`)}가 두 점 ${m(`A(${a})`)}, ${m("B(k)")} 사이를 ${m(`${u}:${v}`)}로 내분한다.`,[],
      `${m("k")}를 구하시오.`,scalar(b),[`왼쪽 길이는 ${m(u*d)}이다. 내분비를 이용하면 오른쪽 길이는 ${m(v*d)}이므로 ${m(b)}가 된다.`]);
  });
  Co("coordinate-section-inverse","내분점과 한 끝점에서 다른 끝점 복원",rng=>{
    const p=P(rng),d=P(rng),u=R(rng),v=R(rng),a=minus(p,scale(d,u)),b=plus(p,scale(d,v));
    return problem(`점 ${n("P",p)}가 ${n("A",a)}와 점 ${m("B")}를 잇는 선분을 ${m(`${u}:${v}`)}로 내분한다.`,[],
      `점 ${m("B")}의 좌표를 구하시오.`,point(b),["가로·세로에서 첫 구간의 변화를 내분비에 맞게 바꾸어 내분점에 더한다."]);
  });
  Co("coordinate-section-distance","한 선분의 두 내분점 사이 거리",rng=>{
    const a=P(rng),[x,y,len]=triple(rng),d=[x,y],b=plus(a,scale(d,4));
    return problem(`선분의 양 끝은 ${n("A",a)}, ${n("B",b)}이다. 두 점 ${m("P,Q")}는 이 선분을 각각 ${m("1:3")}, ${m("3:1")}로 내분한다.`,[],
      `두 점 ${m("P,Q")} 사이의 거리를 구하시오.`,scalar(2*len),
      [`두 내분점은 전체 길이의 4분의 1과 4분의 3 지점이다. 전체 길이 ${m(4*len)}의 절반을 구한다.`]);
  });
  Co("coordinate-nested-section","내분점과 중점을 차례로 구하기",rng=>{
    const a=P(rng),d=P(rng),r=R(rng,2,4),b=plus(a,scale(d,2*(r+1))),q=plus(a,scale(d,r+2));
    return problem(`${n("A",a)}와 ${n("B",b)}를 잇는 선분에서 ${m("P")}는 ${m(`1:${r}`)} 내분점이고, ${m("Q")}는 ${m("PB")}의 중점이다.`,[],
      `${m("Q")}의 좌표를 구하시오.`,point(q),["먼저 내분점의 좌표를 구하고 그 좌표와 B의 좌표를 평균 낸다."]);
  });
  Co("coordinate-triangle-perimeter","좌표에서 삼각형의 둘레 구하기",rng=>{
    const a=P(rng),[x,y,d]=triple(rng),k=R(rng,1,3);
    return problem(`세 점 ${n("A",a)}, ${n("B",plus(a,[k*x,0]))}, ${n("C",plus(a,[0,-k*y]))}가 삼각형의 꼭짓점이다.`,[],
      "삼각형의 둘레를 구하시오.",scalar(k*(x+y+d)),["수평·수직 변의 길이는 각각 좌표의 차이다. 남은 변은 두 점 사이의 거리 공식을 이용한다."]);
  });
  Co("coordinate-centroid-median","무게중심과 중선의 길이 관계",rng=>{
    const m0=P(rng),[x,y,d]=triple(rng),h=[S(rng),0],a=plus(m0,[3*x,3*y]);
    return problem(`삼각형의 꼭짓점은 ${n("A",a)}, ${n("B",plus(m0,h))}, ${n("C",minus(m0,h))}이다. 무게중심을 ${m("G")}라 하자.`,[],
      `${m("A")}와 ${m("G")} 사이 거리를 구하시오.`,scalar(2*d),
      [`변 ${m("BC")}의 중점과 ${m("A")} 사이 거리는 ${m(3*d)}이다. 무게중심이 중선을 꼭짓점 쪽에서 ${m("2:1")}로 내분한다.`]);
  });
  Co("coordinate-square-diagonal","정사각형의 대각선에서 넓이 구하기",rng=>{
    const p=P(rng),d=P(rng),q=plus(p,d);
    return problem(`정사각형의 서로 마주 보는 두 꼭짓점이 ${n("A",p)}, ${n("C",q)}이다.`,[],
      "정사각형의 넓이를 구하시오.",scalar(squared(p,q)/2),
      ["한 변의 제곱 두 개를 더하면 대각선의 제곱이 된다. 정사각형의 넓이는 대각선의 제곱의 절반이다."]);
  });
  Co("coordinate-right-vertex","세 점의 거리로 직각 조건 적용",rng=>{
    const a=P(rng),x=S(rng,4),y=S(rng,3),s=R(rng,1,3),b=plus(a,[x,y]),c=plus(a,[-s*y,s*x]);
    return problem(`삼각형의 꼭짓점은 ${n("A",a)}, ${n("B",b)}, ${m(`C(k,${c[1]})`)}이고, ${m("A")}에서의 각이 직각이다.`,[],
      `${m("k")}를 구하시오.`,scalar(c[0]),["세 변의 길이를 제곱하고 피타고라스 정리를 적용한다. 같은 제곱항을 양변에서 지우면 일차식이 남는다."]);
  });

  Li("a-horizontal-vertical","수평선과 수직선의 교점",rng=>{
    const a=S(rng),b=S(rng);
    return problem("두 직선이 주어진다.",[`x=${a},\\quad y=${b}`],"교점 좌표를 구하시오.",point([a,b]),["두 조건을 동시에 만족하는 x와 y를 짝짓는다."]);
  },"A");
  Li("line-parameter-parallel","평행 조건으로 직선의 계수 복원",rng=>{
    const a=S(rng,3),b=R(rng),k=R(rng),c=S(rng),d=k*c+1;
    return problem("다음 직선은 서로 평행하다.",[E(a,b,c),`tx+${k*b}y=${d}`],
      `${m("t")}를 구하시오.`,scalar(a*k),["평행한 두 직선의 기울기가 같으므로 대응하는 x, y의 계수 비를 맞춘다."]);
  });
  Li("line-parameter-vertical","수평선과 수직인 직선의 계수",rng=>{
    const a=S(rng),c=S(rng);
    return problem(`다음 직선이 직선 ${m(`y=${a}`)}와 수직이다.`,[`x+ky=${c}`],
      `${m("k")}를 구하시오.`,scalar(0),["수평선에 수직인 직선은 x좌표가 일정한 수직선이다. 따라서 y의 계수가 0이어야 한다."]);
  });
  Li("line-intercepts-area","두 절편으로 만들어진 삼각형의 넓이",rng=>{
    const a=R(rng,2,5),b=R(rng,2,5);
    return problem("다음 직선과 두 좌표축이 삼각형을 만든다.",[E(b,a,a*b)],
      "그 삼각형의 넓이를 구하시오.",scalar(a*b/2),[`두 절편은 ${m(a)}, ${m(b)}이다. 밑변과 높이를 곱한 뒤 2로 나눈다.`]);
  });
  Li("line-intercepts-rebuild","두 절편에서 직선 위의 다른 점 계산",rng=>{
    const a=R(rng,1,4),b=S(rng),t=R(rng,2,3)*a;
    return problem(`직선의 x절편은 ${m(a)}, y절편은 ${m(b)}이다.`,[],
      `이 직선 위의 점 ${m(`(${t},k)`)}에 대해 ${m("k")}를 구하시오.`,scalar(b-b*t/a),
      ["두 절편을 좌표로 바꾸어 기울기를 구한 뒤, 주어진 x좌표에 대응하는 y좌표를 계산한다."]);
  });
  Li("line-parallel-bisector","두 평행선에서 같은 거리에 있는 직선",rng=>{
    const [a,b]=triple(rng),c=S(rng),r=R(rng);
    return problem("아래 두 평행선이 있다.",[E(a,b,c-r),E(a,b,c+r)],
      `두 직선에 평행하고 두 직선에서 같은 거리에 있는 직선이 ${m(`${term(a,"x")}+${term(b,"y")}=k`)}일 때 ${m("k")}를 구하시오.`,
      scalar(c),["좌변의 계수가 같으므로 같은 거리에 있으려면 상수의 차가 같아야 한다. 두 상수를 평균 낸다."]);
  });
  Li("line-distance-on-axis","축 위의 점과 직선 사이 거리로 좌표 구하기",rng=>{
    const [a,b,d]=triple(rng),k=S(rng),t=R(rng,1,3),c=a*k,sign=pick(rng,[-1,1]);
    return problem(`아래 직선과 ${m(`P(t,0)`)} 사이의 거리가 ${m(a*t)}이다. ${m("P")}는 직선의 x절편보다 ${sign>0?"오른쪽":"왼쪽"}에 있다.`,[E(a,b,c)],
      `${m("t")}를 구하시오.`,scalar(k+sign*d*t),
      ["거리 공식에 y좌표 0을 대입하고, 절편보다 어느 쪽에 있는지에 따라 절댓값의 부호를 정한다."]);
  });
  Li("line-perpendicular-bisector","두 점의 수직이등분선과 y절편",rng=>{
    const mid=P(rng),s=S(rng,4),d=[-s,1],a=plus(mid,d),b=minus(mid,d);
    return problem(`두 점 ${n("A",a)}, ${n("B",b)}의 수직이등분선을 그린다.`,[],
      "이 직선의 y절편을 구하시오.",scalar(mid[1]-s*mid[0]),["중점을 먼저 구한다. 선분과 직선의 기울기의 곱이 −1이므로 직선의 기울기를 얻은 뒤 중점을 대입한다."]);
  });

  Ci("a-circle-point-on","원의 방정식과 점의 위치",rng=>{
    const p=P(rng),r=R(rng),i=R(rng,0,2),x=plus(p,[r+i-1,0]);
    const options=["원의 내부","원 위","원의 외부"];
    return problem(`점 ${n("P",x)}와 다음 원이 있다.`,[C(p,r)],"점 P의 위치를 고르시오.",choice(rng,options[i],options.filter((_,k)=>k!==i)),
      ["중심과 점의 거리와 원의 반지름을 비교한다."]);
  },"A");
  Ci("a-circle-equation","중심과 반지름에 맞는 원의 식",rng=>{
    const h=P(rng),r=R(rng),forms=[C(h,r),C(scale(h,-1),r),C(h,r+1),C([h[0],-h[1]],r)].map(m);
    return problem(`원의 중심은 ${m(coord(h))}이고 반지름은 ${m(r)}이다.`,[],"원의 방정식을 고르시오.",
      choice(rng,forms[0],forms.slice(1)),["중심에서 거리가 반지름인 점들의 좌표가 만족하는 식을 찾는다."]);
  },"A");
  Ci("circle-radius-from-point","원 위의 두 점과 반지름의 비",rng=>{
    const h=P(rng),[a,b,r]=triple(rng),k=R(rng,2,4);
    return problem(`중심이 ${n("C",h)}이고 점 ${n("P",plus(h,[a,b]))}를 지나는 원이 있다. 점 ${n("Q",plus(h,[-k*b,k*a]))}는 중심이 같은 다른 원 위에 있다.`,[],
      "두 원의 반지름의 길이 차를 구하시오.",scalar((k-1)*r),
      [`두 반지름은 중심과 각 점 사이의 거리다. 첫 거리는 ${m(r)}, 둘째는 가로·세로 좌표 차의 절댓값이 서로 바뀌고 ${m(k)}배이므로 ${m(k*r)}이다.`]);
  });
  Ci("circle-origin-constant","원이 원점을 지나게 하는 상수",rng=>{
    const h=P(rng),r2=h[0]**2+h[1]**2;
    return problem(`중심이 ${m(coord(h))}인 원이 원점을 지난다.`,[tex`(${shift("x",h[0])})^2+(${shift("y",h[1])})^2=k`],
      `${m("k")}를 구하시오.`,scalar(r2),["원의 식에 원점 좌표를 대입하면 반지름의 제곱을 얻는다."]);
  });
  Ci("circle-horizontal-chord","원과 수평선이 만드는 현의 길이",rng=>{
    const h=P(rng),[a,b,r]=triple(rng),y=h[1]+b;
    return problem("아래 원과 직선이 두 점에서 만난다.",[C(h,r),`y=${y}`],"두 교점을 잇는 현의 길이를 구하시오.",
      scalar(2*a),["직선의 y좌표를 원의 식에 대입하면, 두 교점은 중심의 x좌표에서 같은 거리만큼 좌우로 떨어져 있다."]);
  });
  Ci("circle-axis-intersection","원의 x축 교점에서 반지름 역산",rng=>{
    const h=P(rng),[a,b,r]=triple(rng),c=pick(rng,[-1,1])*b;
    return problem(`중심이 ${n("C",[h[0],c])}인 원이 x축의 두 점 ${n("A",[h[0]-a,0])}, ${n("B",[h[0]+a,0])}를 지난다.`,[],
      "원의 반지름을 구하시오.",scalar(r),["현의 절반 길이와 중심에서 x축까지의 거리로 직각삼각형을 만들면 빗변이 반지름이다."]);
  });
  Ci("circle-axis-tangency","좌표축에 접하는 원의 중심 조건",rng=>{
    const r=R(rng),k=S(rng),sign=pick(rng,[-1,1]);
    return problem(`중심이 ${m(`(t,${k})`)}이고 반지름이 ${m(r)}인 원이 y축에 접한다. 중심은 y축의 ${sign>0?"오른쪽":"왼쪽"}에 있다.`,[],
      `${m("t")}를 구하시오.`,scalar(sign*r),["중심에서 y축까지의 거리는 중심 x좌표의 절댓값이다. 접하므로 그 거리가 반지름과 같다."]);
  });
  Ci("circle-center-on-axis","두 점과 중심이 놓인 축에서 원 복원",rng=>{
    const h=S(rng),a=R(rng),b=R(rng);
    return problem(`x축 위에 중심이 있는 원이 ${n("A",[h-a,b])}, ${n("B",[h+a,b])}를 지난다.`,[],
      "원의 중심 좌표를 구하시오.",point([h,0]),["원의 중심은 현의 수직이등분선과 x축의 교점이다."]);
  });
  Ci("circle-tangency-radius","직선과 접하는 조건에서 반지름 결정",rng=>{
    const h=P(rng),[a,b,d]=triple(rng),r=R(rng);
    return problem(`중심이 ${m(coord(h))}인 원이 다음 직선에 접한다.`,[E(a,b,d*r+dot([a,b],h))],
      "원의 반지름을 구하시오.",scalar(r),["접하는 경우 중심에서 직선까지의 거리와 반지름이 같다."]);
  });
  Ci("circle-nearest-axis","원 위의 점에서 좌표축까지 최소 거리",rng=>{
    const h=P(rng),r=R(rng),d=R(rng),y=pick(rng,[-1,1])*(r+d);
    return problem("다음 원은 x축을 만나지 않는다.",[C([h[0],y],r)],
      "원 위의 점에서 x축까지의 거리의 최솟값을 구하시오.",scalar(d),
      ["원에서 축과 가장 가까운 점은 중심에서 축으로 내린 수직선 위에 있다. 중심에서 x축까지 거리에서 반지름을 뺀다."]);
  });

  const motions={
    x:{label:"x축",map:([x,y])=>[x,-y]},
    y:{label:"y축",map:([x,y])=>[-x,y]},
    origin:{label:"원점",map:([x,y])=>[-x,-y]},
    diagonal:{label:m("y=x"),map:([x,y])=>[y,x]},
  };
  const moveWords=([a,b])=>`x축 방향으로 ${m(a)}, y축 방향으로 ${m(b)}만큼`;
  const reflectWord=key=>`${motions[key].label}에 대하여`;
  const reflection=r=>pick(r,Object.keys(motions));
  Tr("a-translate-point","점의 평행이동",rng=>{
    const p=P(rng),d=P(rng);
    return problem(`점 ${n("P",p)}를 ${moveWords(d)} 평행이동한다.`,[],
      "이동한 점의 좌표를 구하시오.",point(plus(p,d)),["각 좌표에 해당 방향의 이동량을 더한다."]);
  },"A");
  Tr("a-reflect-point-axis","점의 좌표축 대칭이동",rng=>{
    const p=P(rng),t=pick(rng,["x","y"]);
    return problem(`점 ${n("P",p)}를 ${reflectWord(t)} 대칭이동한다.`,[],
      "이동한 점의 좌표를 구하시오.",point(motions[t].map(p)),["대칭축과 수직인 방향의 좌표만 부호를 바꾼다."]);
  },"A");
  Tr("a-reflect-origin","점의 원점 대칭이동",rng=>{
    const p=P(rng);
    return problem(`점 ${n("P",p)}를 원점에 대하여 대칭이동한다.`,[],
      "이동한 점의 좌표를 구하시오.",point(scale(p,-1)),["두 좌표의 부호를 각각 바꾼다."]);
  },"A");
  Tr("a-reflect-diagonal","점의 대각선 대칭이동",rng=>{
    const p=P(rng);
    return problem(`점 ${n("P",p)}를 직선 ${m("y=x")}에 대하여 대칭이동한다.`,[],
      "이동한 점의 좌표를 구하시오.",point(motions.diagonal.map(p)),["가로 좌표와 세로 좌표를 맞바꾼다."]);
  },"A");
  Tr("translate-inverse-point","평행이동 전의 점 역산",rng=>{
    const p=P(rng),d=P(rng);
    return problem(`점 ${m("A")}를 ${moveWords(d)} 평행이동한 점은 ${n("B",plus(p,d))}이다.`,[],
      `원래 점 ${m("A")}의 좌표를 구하시오.`,point(p),["도착점의 좌표에서 각 방향의 이동량을 뺀다."]);
  });
  Tr("translate-two-stages","연속한 두 평행이동에서 이동량 구하기",rng=>{
    const p=P(rng),d=P(rng),e=P(rng),target=plus(plus(p,d),e);
    return problem(`점 ${n("P",p)}를 먼저 ${moveWords(d)} 평행이동하고, 한 번 더 평행이동하니 ${n("Q",target)}에 도착했다.`,[],
      "두 번째 이동의 x축 방향과 y축 방향 이동량을 각각 구하시오.",point(e),["첫 이동 결과를 구한 뒤, 그 점에서 최종 도착점으로의 좌표 차를 구한다."]);
  });
  Tr("translate-line-intercept","직선의 평행이동과 절편",rng=>{
    const a=S(rng),b=S(rng),d=P(rng);
    return problem(`아래 직선을 ${moveWords(d)} 평행이동한다.`,[L(a,b)],
      "이동한 직선의 y절편을 구하시오.",scalar(b+d[1]-a*d[0]),["이동한 점의 입력과 출력에서 각 방향 이동량을 빼면 원래 직선의 방정식을 만족한다. 식을 정리해 절편을 읽는다."]);
  });
  Tr("translate-circle-center","원의 평행이동과 중심의 좌표",rng=>{
    const h=P(rng),r=R(rng),d=P(rng);
    return problem(`아래 원을 ${moveWords(d)} 평행이동한다.`,[C(h,r)],
      "이동한 원의 중심 좌표를 구하시오.",point(plus(h,d)),["원의 중심을 점으로 보고 같은 평행이동을 적용한다."]);
  });
  Tr("translate-circle-tangency","원이 좌표축에 접하도록 평행이동",rng=>{
    const h=P(rng),r=R(rng),sign=pick(rng,[-1,1]);
    return problem(`아래 원을 y축 방향으로 ${m("t")}만큼 이동하면 x축에 접한다. 이동한 중심은 x축보다 ${sign>0?"위":"아래"}에 있다.`,[C(h,r)],
      `${m("t")}를 구하시오.`,scalar(sign*r-h[1]),["이동 후 중심의 y좌표 절댓값이 반지름과 같다. 주어진 위치에 맞게 부호를 골라 이동량을 구한다."]);
  });
  Tr("translate-parabola-vertex","포물선의 꼭짓점으로 평행이동량 역산",rng=>{
    const h=P(rng),a=S(rng,3),d=P(rng);
    return problem(`아래 포물선을 이동한 뒤 꼭짓점이 ${m(coord(plus(h,d)))}가 되었다.`,[`y=${a}(${shift("x",h[0])})^2+${par(h[1])}`],
      "x축 방향과 y축 방향 이동량을 각각 구하시오.",point(d),["원래 꼭짓점과 이동 후 꼭짓점의 좌표 차를 구한다."]);
  });
  Tr("reflect-two-axes","두 좌표축 대칭의 합성",rng=>{
    const p=P(rng),xFirst=rng()<.5;
    return problem(`점 ${n("P",p)}를 먼저 ${xFirst?"x축":"y축"}, 이어서 ${xFirst?"y축":"x축"}에 대하여 각각 대칭이동한다.`,[],
      "최종 좌표를 구하시오.",point(scale(p,-1)),["두 번의 대칭이동으로 가로와 세로 좌표의 부호가 한 번씩 바뀐다."]);
  });
  Tr("reflect-line-axis","직선의 좌표축 대칭과 절편",rng=>{
    const a=S(rng),b=S(rng),t=pick(rng,["x","y"]);
    return problem(`아래 직선을 ${reflectWord(t)} 대칭이동한다.`,[L(a,b)],
      "이동한 직선의 y절편을 구하시오.",scalar(t==="x"?-b:b),
      ["원래 직선이 y축과 만나는 점을 주어진 축에 대하여 대칭이동한다."]);
  });
  Tr("reflect-line-diagonal","직선을 대각선으로 대칭이동한 뒤 절편 구하기",rng=>{
    const a=S(rng),b=S(rng);
    return problem(`다음 직선을 ${m("y=x")}에 대하여 대칭이동한다.`,[L(a,b)],
      "이동한 직선의 x절편을 구하시오.",scalar(b),["좌표를 바꾸면 원래 직선의 y절편이 이동한 직선의 x절편이 된다."]);
  });
  Tr("reflect-circle","대칭이동한 원의 중심",rng=>{
    const h=P(rng),r=R(rng),t=reflection(rng);
    return problem(`아래 원을 ${reflectWord(t)} 대칭이동한다.`,[C(h,r)],
      "이동한 원의 중심 좌표를 구하시오.",point(motions[t].map(h)),["대칭이동은 거리를 보존하므로 중심만 같은 방식으로 이동시켜 구한다."]);
  });
  Tr("translation-reflection-order","평행이동과 대칭이동 순서 비교",rng=>{
    const p=P(rng),d=P(rng),t=pick(rng,["x","y"]),map=motions[t].map;
    return problem(`점 ${n("P",p)}에 ${moveWords(d)} 평행이동과 ${reflectWord(t)} 대칭이동을 적용한다. 먼저 평행이동하면 점 ${m("A")}, 먼저 대칭이동하면 점 ${m("B")}가 된다.`,[],
      `두 점 ${m("A,B")} 사이의 거리를 구하시오.`,scalar(Math.sqrt(squared(map(plus(p,d)),plus(map(p),d)))),
      ["두 순서로 얻은 좌표를 각각 계산한다. 대칭축에 수직인 방향의 이동량만 두 결과에서 반대 부호로 반영된다."]);
  });
  Tr("transform-fixed-axis","대칭 뒤 평행이동에서 변하지 않는 좌표",rng=>{
    const k=S(rng),t=pick(rng,["x","y"]),d=t==="x"?[0,2*k]:[2*k,0],axis=t==="x"?"y":"x";
    return problem(`점을 ${reflectWord(t)} 대칭이동한 뒤 ${moveWords(d)} 평행이동한다.`,[],
      `처음 위치로 돌아오는 점의 ${axis}좌표를 구하시오.`,scalar(k),["대칭축에 수직인 좌표는 부호가 바뀌고 이동량이 더해진다. 그 값이 원래 값과 같도록 일차방정식을 세운다."]);
  });
  Tr("transform-isometry","공통 이동 전후 거리의 불변성",rng=>{
    const p=P(rng),[a,b,r]=triple(rng),d=P(rng),t=reflection(rng);
    return problem(`점 ${n("A",p)}, ${n("B",plus(p,[a,b]))}를 각각 ${moveWords(d)} 평행이동한 뒤 ${reflectWord(t)} 대칭이동한다.`,[],
      "이동한 두 점 사이 거리를 구하시오.",scalar(r),["평행이동과 대칭이동은 두 점 사이 거리를 바꾸지 않는다. 원래 두 점의 거리를 계산하면 된다."]);
  });
  Tr("transform-intersection","두 직선의 교점을 대칭이동",rng=>{
    const p=P(rng),a=S(rng,3),b=a+1,t=reflection(rng);
    return problem(`아래 두 직선의 교점을 ${reflectWord(t)} 대칭이동한다.`,[L(a,p[1]-a*p[0]),L(b,p[1]-b*p[0])],
      "이동한 점의 좌표를 구하시오.",point(motions[t].map(p)),["두 식을 연립해 교점을 구한 후 그 점에 대칭이동을 적용한다."]);
  });
  Tr("transform-identify-reflection","이동 전후 좌표로 대칭 기준 판별",rng=>{
    const a=R(rng,1,4),p=[a,a+1],key=reflection(rng),q=motions[key].map(p);
    const labels={x:"x축",y:"y축",origin:"원점",diagonal:"직선 "+m("y=x")};
    return problem(`점 ${n("P",p)}를 한 번 대칭이동하니 ${n("Q",q)}가 되었다.`,[],
      "대칭의 기준을 고르시오.",choice(rng,labels[key],Object.keys(labels).filter(x=>x!==key).map(x=>labels[x])),
      ["부호가 바뀐 좌표와 서로 자리를 바꾼 좌표가 있는지 확인한다."]);
  });
})();


;

/* common2-functions.js */
(() => {
  "use strict";
  const {tex,m,rand,pick,signed,shift,term,par,coord,add,one,problem,scalar,point,set,choice}=globalThis.ForgeTopics;
  const R=(rng,a=2,b=5)=>rand(rng,a,b);
  const S=(rng,n=5)=>signed(rng,n);
  const group=(unit,level,id,label,build)=>add(id,unit,label,level,one(label,build));
  const F=(id,label,build,level="B")=>group("functions",level,id,label,build);
  const U=(id,label,build,level="B")=>group("rational",level,id,label,build);
  const V=(id,label,build,level="B")=>group("radical",level,id,label,build);
  const seq=(n,k=0)=>Array.from({length:n},(_,i)=>i+k);
  const finite=items=>tex`\\{${items.join(",\\,")}\\}`;
  const mapping=(x,y)=>x.map((v,i)=>tex`${v}\\mapsto ${y[i]}`).join(",\\quad ");
  const ax=(a,b)=>shift(term(a,"x"),-b);
  const fline=(a,b)=>`f(x)=${ax(a,b)}`;
  const interval=(start,end,startClosed=true,endClosed=true)=>{
    const bound=(n,low)=>n===null?(low?tex`-\\infty`:tex`\\infty`):String(n);
    return {kind:"interval",value:[{start,end,startClosed,endClosed}],
      text:m(`${startClosed?"[":"("}${bound(start,true)},${bound(end,false)}${endClosed?"]":")"}`)};
  };
  const half=(h,right)=>right?interval(h,null,true,false):interval(null,h,false,true);
  const excluded=h=>({kind:"interval",
    value:[{start:null,end:h,startClosed:false,endClosed:false},{start:h,end:null,startClosed:false,endClosed:false}],
    text:m(tex`(-\\infty,${h})\\cup(${h},\\infty)`),
  });
  const output=(intro,form,ask,answer,solution,plot)=>({...problem(intro,form,ask,answer,solution),...(plot?{plot}:{})});

  F("a-finite-domain","대응에서 정의역 읽기",rng=>{
    const a=S(rng),b=S(rng),x=seq(3,a),y=[b,b+1,b];
    return problem("함수의 대응이 다음과 같다.",[mapping(x,y)],"정의역을 구하시오.",set(x),["대응의 왼쪽에 놓인 값들이 정의역을 이룬다."]);
  },"A");
  F("a-finite-image","대응에서 치역 읽기",rng=>{
    const a=S(rng),b=S(rng),x=seq(4,a),y=[b,b+2,b,b+2];
    return problem("함수의 대응이 다음과 같다.",[mapping(x,y)],"치역을 구하시오.",set([b,b+2]),["대응의 오른쪽에 실제로 나타나는 값만 모은다."]);
  },"A");
  F("a-function-value","함수값 계산",rng=>{
    const a=S(rng),b=S(rng),x=S(rng);
    return problem("함수가 다음과 같다.",[fline(a,b)],`${m(`f(${x})`)}의 값을 구하시오.`,scalar(a*x+b),[`${m(`x=${x}`)}를 대입한다.`]);
  },"A");
  F("a-function-compose","합성 순서 읽기",rng=>{
    const a=S(rng),b=S(rng),x=S(rng);
    return problem("두 함수가 주어져 있다.",[fline(a,b),"g(x)=x^2"],`${m(tex`(g\\circ f)(${x})`)}를 구하시오.`,scalar((a*x+b)**2),
      [`먼저 ${m(`f(${x})`)}를 구하고 그 값을 제곱한다.`]);
  },"A");
  F("a-inverse-pair","역함수의 대응 읽기",rng=>{
    const a=S(rng),b=S(rng);
    return problem("일대일대응의 대응표 일부가 다음과 같다.",[mapping([a,a+1],[b,b+2])],
      `${m(`f^{-1}(${b+2})`)}를 구하시오.`,scalar(a+1),["역함수는 대응의 방향을 거꾸로 바꾼다."]);
  },"A");
  F("function-valid-relation","대응이 함수가 되기 위한 조건",rng=>{
    const a=S(rng),b=S(rng),d=R(rng);
    return problem("다음 순서쌍들이 하나의 함수의 대응을 나타낸다.",[finite([`(${a},${b})`,`(${a+d},${b+d})`,`(${a},k)`])],
      `${m("k")}를 구하시오.`,scalar(b),[`하나의 입력 ${m(a)}에는 함수값 하나만 대응한다.`]);
  });
  F("function-image-restricted","유한 정의역에서 이차함수의 치역",rng=>{
    const h=S(rng),k=S(rng),d=R(rng,2,4),xs=[h-d,h-1,h,h+1,h+d];
    return problem(`정의역이 ${m(finite(xs))}인 함수이다.`,[`f(x)=(${shift("x",h)})^2+${par(k)}`],
      "치역을 구하시오.",set([k,k+1,k+d*d]),["정의역의 원소를 각각 대입하고, 중복되는 함수값은 한 번만 적는다."]);
  });
  F("function-equal-domain","정의역과 함수식이 같은 함수 고르기",rng=>{
    const h=S(rng),b=S(rng), form=ax(1,b),x1=finite([h,h+1]), x2=finite([h,h+2]);
    const tag=(expr,xs)=>m(`y=${expr}`) + "  정의역 " + m(xs);
    const good=tag(form,x1);
    return problem(`정의역이 ${m(x1)}인 함수 ${m(`f(x)=${form}`)}가 있다.`,[],
      "모든 함수의 공역을 실수 전체로 둘 때, 이 함수와 같은 함수를 고르시오.",choice(rng,good,[tag(form,x2),tag(ax(1,b+1),x1),tag(ax(1,b+3),x2)]),
      ["정의역이 같고, 그 정의역의 모든 입력에서 함수값도 같아야 한다."]);
  });
  F("function-injective-quadratic","제한된 정의역에서 일대일함수 판별",rng=>{
    const h=S(rng),d=R(rng,2,4),sets=[[h,h+1,h+d],[h-d,h,h+d],[h-1,h+1,h+d],[h-d,h+1,h+d]].map(x=>m(finite(x)));
    return problem("다음 함수를 생각하자.",[`f(x)=(${shift("x",h)})^2`],
      "일대일함수가 되는 정의역을 고르시오.",choice(rng,sets[0],sets.slice(1)),
      [`축 ${m(`x=${h}`)}에서 같은 거리만큼 떨어진 두 입력은 함수값이 같다. 정답 정의역에는 그런 서로 다른 두 입력이 없다.`]);
  });
  F("function-bijection-missing","일대일대응에서 빠진 함수값",rng=>{
    const a=S(rng),b=S(rng),x=seq(3,a),y=[b,b+2,b+5], order=pick(rng,[[0,2,1],[2,1,0],[1,0,2]]);
    return problem(`정의역이 ${m(finite(x))}, 공역이 ${m(finite(y))}인 일대일대응이다.`,[mapping(x,[y[order[0]],"k",y[order[2]]])],
      `${m("k")}를 구하시오.`,scalar(y[order[1]]),["각 공역의 원소는 정확히 한 번씩 대응되어야 한다."]);
  });
  F("function-affine-from-pairs","두 대응으로 일차함수 복원",rng=>{
    const a=S(rng),b=S(rng),x=S(rng),d=R(rng),t=x-1;
    return problem(`함수 ${m("f(x)=ax+b")}가 다음을 만족한다.`,[`f(${x})=${a*x+b},\\quad f(${x+d})=${a*(x+d)+b}`],
      `${m(`f(${t})`)}를 구하시오.`,scalar(a*t+b),[`함수값 차를 입력의 차로 나누면 기울기는 ${m(a)}이다. 그 기울기로 한 칸 이동한 값을 계산한다.`]);
  });
  F("function-identity-composition","합성 결과가 항등함수인 조건",rng=>{
    const a=R(rng),b=S(rng),k=-a*b;
    return problem("실수 전체에서 정의된 두 함수이다.",[`f(x)=${a}x+k`,tex`g(x)=\\frac{x}{${a}}+${par(b)}`],
      `${m(tex`(f\\circ g)(x)=x`)}가 모든 실수에서 성립할 때 ${m("k")}를 구하시오.`,scalar(k),
      [`합성한 식은 ${m(`x+${par(a*b)}+k`)}이다. 상수항이 0이어야 한다.`]);
  });
  F("function-composition-order","합성 순서에 따른 함수값의 차",rng=>{
    const a=R(rng),b=S(rng),t=S(rng);
    return problem("다음 두 함수가 주어져 있다.",[fline(a,b),"g(x)=x^2"],
      `${m(tex`(f\\circ g)(${t})-(g\\circ f)(${t})`)}를 구하시오.`,scalar(a*t*t+b-(a*t+b)**2),
      ["앞에서는 제곱을 먼저 하고, 뒤에서는 일차함수에 대입하는 것을 먼저 한다."]);
  });
  F("function-composition-coefficient","합성함수의 일차항 계수",rng=>{
    const a=S(rng),b=S(rng),c=S(rng);
    return problem("두 함수의 합성을 생각하자.",[fline(a,b),`g(x)=x^2+${par(c)}`],
      `${m(tex`(g\\circ f)(x)`)}의 일차항 계수를 구하시오.`,scalar(2*a*b),
      [`합성식은 ${m(`(${ax(a,b)})^2+${par(c)}`)}이다. 전개에서 교차항의 계수를 구한다.`]);
  });
  F("function-composition-finite-domain","두 대응표에서 합성이 가능한 입력",rng=>{
    const x=seq(4,S(rng)),y=seq(4,S(rng)),omit=R(rng,0,3),others=y.filter((_,i)=>i!==omit);
    return problem(`두 함수 ${m("f,g")}의 전체 대응이 다음과 같다.`,
      [`f:\\quad ${mapping(x,y)}`,`g:\\quad ${mapping(others,[4,6,4])}`],
      `${m(tex`g\\circ f`)}의 정의역을 구하시오.`,set(x.filter((_,i)=>i!==omit)),
      [`첫 함수값이 두 번째 함수의 정의역에 들어가는 입력만 고른다. 제외되는 입력은 ${m(x[omit])}이다.`]);
  });
  F("function-composition-parameter","합성 함수값에서 안쪽 상수 역산",rng=>{
    const a=R(rng),b=S(rng),t=S(rng),k=S(rng),v=a*(t+k)+b;
    return problem("두 함수가 다음과 같다.",[fline(a,b),"g(x)=x+k",tex`(f\\circ g)(${t})=${v}`],
      `${m("k")}를 구하시오.`,scalar(k),[`${m(`f(${t}+k)=${v}`)}에서 일차방정식을 풀면 된다.`]);
  });
  F("function-inverse-affine","일차함수의 역함수값 계산",rng=>{
    const a=S(rng,4),b=S(rng),t=S(rng);
    return problem("다음 일차함수는 실수 전체에서 정의된다.",[fline(a,b)],
      `${m(`f^{-1}(${a*t+b})`)}를 구하시오.`,scalar(t),[`원래 함수값이 ${m(a*t+b)}가 되는 입력을 찾는다.`]);
  });
  F("function-inverse-restricted","정의역을 제한한 이차함수의 역함수값",rng=>{
    const h=S(rng),b=S(rng),d=R(rng),positive=rng()<.5;
    const sign=positive?1:-1;
    return problem(`정의역이 ${half(h,positive).text}인 함수이다.`,[`f(x)=(${shift("x",h)})^2+${par(b)}`],
      `${m(`f^{-1}(${b+d*d})`)}를 구하시오.`,scalar(h+sign*d),
      [`제곱식에서 두 후보가 나오지만, 주어진 정의역에 들어가는 ${m(h+sign*d)}만 남는다.`]);
  });
  F("function-inverse-range","역함수의 치역과 원래 정의역",rng=>{
    const a=S(rng),b=S(rng),xs=seq(3,a),ys=[b,b+3,b+6];
    return problem("한 일대일대응의 전체 대응이다.",[mapping(xs,ys)],
      `${m("f^{-1}")}의 치역을 구하시오.`,set(xs),["역함수의 치역은 원래 함수의 정의역이다."]);
  });
  F("function-inverse-composition","합성함수의 역함수값",rng=>{
    const a=R(rng),b=S(rng),d=S(rng),t=S(rng),y=a*(t+d)+b;
    return problem("실수 전체의 두 일대일대응이다.",[fline(a,b),`g(x)=x+${par(d)}`],
      `${m(tex`(f\\circ g)^{-1}(${y})`)}를 구하시오.`,scalar(t),
      [`먼저 ${m("f^{-1}")}를 적용하여 ${m(t+d)}를 얻은 뒤, ${m("g^{-1}")}를 적용한다.`]);
  });
  F("function-inverse-fixed","함수와 역함수에 공통인 대각선 위의 점",rng=>{
    const a=R(rng),x=S(rng),b=(1-a)*x;
    return problem("일대일대응이 다음과 같다.",[fline(a,b)],
      `${m("y=f(x)")}와 그 역함수의 그래프가 직선 ${m("y=x")} 위에서 만나는 점의 ${m("x")}좌표를 구하시오.`,scalar(x),
      [`대각선 위에서는 ${m("f(x)=x")}이다. 이 식을 풀면 ${m(`x=${x}`)}이고, 역함수도 같은 점을 지난다.`]);
  });
  F("function-context-composition","변환 관계 두 개로 실제 상황의 함수값 계산",rng=>{
    const a=R(rng),b=R(rng,1,4),x=R(rng,2,8),c=R(rng,1,4);
    return problem(`상자 ${m("x")}개를 채우면 상자마다 물건 ${m(a)}개가 들어가고, 견본 ${m(b)}개를 추가한다. 물건 한 개를 검사하는 데 ${m(c)}초가 걸린다.`,[],
      `상자 ${m(x)}개를 채울 때 검사에 걸리는 총 시간은 몇 초인가?`,scalar(c*(a*x+b)),
      [`상자 수를 물건 수로 바꾸는 식은 ${m(`${a}x+${b}`)}이다. 물건 수에 개당 검사 시간을 곱한다.`]);
  });

  function reciprocal(rng){
    const h=S(rng,4),k=S(rng,4),a=S(rng,6);
    return {h,k,a};
  }
  const qform=({h,k,a})=>tex`\\frac{${a}}{${shift("x",h)}}${k===0?"":k>0?"+"+k:k}`;
  const rform=({h,k,a},c=1)=>tex`\\frac{${ax(c*k,c*(a-k*h))}}{${ax(c,-c*h)}}`;
  const rProblem=(d,ask,answer,steps,expr=qform(d),intro="다음 유리함수에 대하여 물음에 답하시오.")=>
    problem(intro,[`f(x)=${expr}`],ask,answer,steps);
  const graph=(kind,p)=>({kind,...p});
  U("a-rational-simplify","공통인수를 약분해 유리식 정리",rng=>{
    const h=S(rng),a=S(rng,4),b=S(rng),factor=`(${shift("x",h)})`;
    const options=[ax(a,b),ax(-a,b),ax(a,b+1),ax(a,b-1)].map(m);
    return problem(`실수 ${m(tex`x\\ne${h}`)}에 대해 다음 유리식을 정리한다.`,[tex`\\frac{${factor}(${ax(a,b)})}{${factor}}`],
      "약분한 식을 고르시오.",choice(rng,options[0],options.slice(1)),["분자와 분모의 0이 아닌 공통인수를 약분한다."]);
  },"A");
  U("a-rational-domain","유리함수에서 제외되는 입력",rng=>{
    const d=reciprocal(rng);
    return rProblem(d,"정의역에서 제외되는 실수 하나를 구하시오.",scalar(d.h),["분모가 0인 입력을 제외한다."]);
  },"A");
  U("a-rational-range","유리함수에서 나오지 않는 출력",rng=>{
    const d=reciprocal(rng);
    return rProblem(d,"치역에 속하지 않는 실수 하나를 구하시오.",scalar(d.k),["분수 부분은 0이 될 수 없다."]);
  },"A");
  U("a-rational-value","유리함수의 함수값",rng=>{
    const d=reciprocal(rng),t=d.h+1;
    return rProblem(d,`${m(`f(${t})`)}를 구하시오.`,scalar(d.k+d.a),[`입력값을 대입하면 분모가 1이 된다.`]);
  },"A");
  U("a-rational-asymptotes","유리함수의 점근선 읽기",rng=>{
    const d=reciprocal(rng),askX=rng()<.5;
    return rProblem(d,askX?"수직 점근선의 x좌표를 구하시오.":"수평 점근선의 y좌표를 구하시오.",scalar(askX?d.h:d.k),
      [`수직 점근선은 ${m(`x=${d.h}`)}, 수평 점근선은 ${m(`y=${d.k}`)}이다.`]);
  },"A");
  U("a-rational-graph","그래프에서 유리함수의 중심 읽기",rng=>{
    const d=reciprocal(rng);
    return output("다음은 유리함수의 그래프이다. 점선은 점근선이다.",[],"두 점근선의 교점 좌표를 구하시오.",point([d.h,d.k]),
      ["점선의 교점에서 가로 좌표와 세로 좌표를 읽는다."],graph("rational",d));
  },"A");
  U("rational-center-general","일차식의 비에서 점근선의 교점",rng=>{
    const d=reciprocal(rng),c=R(rng);
    return rProblem(d,"두 점근선의 교점 좌표를 구하시오.",point([d.h,d.k]),[`식을 나누어 정리하면 ${m(qform(d))}이다. 두 점근선은 ${m(`x=${d.h}`)}, ${m(`y=${d.k}`)}이다.`],rform(d,c));
  });
  U("rational-numerator-parameter","수평 점근선에서 분자의 계수 결정",rng=>{
    const d=reciprocal(rng),c=R(rng),a=c*d.k,b=c*(d.a-d.k*d.h);
    return problem(`다음 함수의 수평 점근선은 ${m(`y=${d.k}`)}이다.`,[tex`f(x)=\\frac{${shift("tx",-b)}}{${ax(c,-c*d.h)}}`],
      `${m("t")}를 구하시오.`,scalar(a),[`분자와 분모의 최고차항 계수의 비가 ${m(d.k)}이므로 ${m(`t=${a}`)}이다.`]);
  });
  U("rational-coefficient-through-point","점근선과 한 점에서 분수 항 결정",rng=>{
    const h=S(rng,3),k=S(rng,3),t=S(rng,3),d=S(rng,3);
    return problem(`수직 점근선이 ${m(`x=${h}`)}, 수평 점근선이 ${m(`y=${k}`)}인 유리함수의 그래프가 점 ${m(coord([h+t,k+d]))}를 지난다.`,
      [`f(x)=${qform({h,k,a:"c"})}`],`${m("c")}를 구하시오.`,scalar(t*d),["점의 두 좌표를 함수식에 넣고 분모를 곱한다."]);
  });
  U("rational-x-intercept","유리함수의 x절편",rng=>{
    const d=reciprocal(rng),t=S(rng,3);
    d.a=-d.k*t;
    return rProblem(d,"그래프의 x절편을 구하시오.",scalar(d.h+t),["함수값을 0으로 놓고, 분수항이 상수항의 반대가 되도록 하는 입력을 구한다."]);
  });
  U("rational-y-intercept-parameter","y절편으로 유리함수의 상수 구하기",rng=>{
    const d=reciprocal(rng),delta=S(rng,3);d.a=-d.h*delta;
    return problem(`아래 그래프의 y절편이 ${m(d.k+delta)}이다.`,[`f(x)=${qform({...d,k:0})}+t`],
      `${m("t")}를 구하시오.`,scalar(d.k),["입력 0에서 분수항의 값을 계산하여 y절편에서 뺀다."]);
  });
  U("rational-relative-branches","점근선을 기준으로 두 가지 위치 판단",rng=>{
    const d=reciprocal(rng),opts=["오른쪽 위와 왼쪽 아래","오른쪽 아래와 왼쪽 위"];
    const i=d.a>0?0:1;
    return rProblem(d,"두 점근선의 교점을 기준으로 그래프가 놓인 영역을 고르시오.",choice(rng,opts[i],[opts[1-i]]),
      [`점근선 오른쪽에서는 분모가 양수이다. 분자의 부호에 따라 수평 점근선 위 또는 아래에 놓인다.`]);
  });
  U("rational-translate","유리함수의 점근선에서 평행이동량 구하기",rng=>{
    const d=reciprocal(rng),u=S(rng,3),v=S(rng,3);
    return problem("아래 첫 그래프를 평행이동하면 두 번째 그래프가 된다.",[`y=${qform(d)}`,`y=${qform({...d,h:d.h+u,k:d.k+v})}`],
      "x축과 y축 방향의 이동량을 각각 구하시오.",point([u,v]),
      ["첫 그래프의 두 점근선의 교점과 두 번째 그래프의 교점 사이의 가로·세로 변화를 구한다."]);
  });
  U("rational-horizontal-intersection","유리함수와 수평선의 교점",rng=>{
    const d=reciprocal(rng),t=S(rng,3),u=S(rng,3);d.a=t*u;
    return rProblem(d,`수평선 ${m(`y=${d.k+u}`)}과 만나는 점의 x좌표를 구하시오.`,scalar(d.h+t),["분수항이 수평선의 높이에서 수평 점근선의 높이를 뺀 값과 같아야 한다."]);
  });
  U("rational-cancel-domain","약분 전후 유리식의 정의역 확인",rng=>{
    const h=S(rng),b=S(rng);
    return problem("다음 식을 함수로 생각한다.",[tex`f(x)=\\frac{(${shift("x",h)})(${ax(1,b)})}{${shift("x",h)}}`],
      "실수 전체 중 원래 식에서 제외되는 입력을 구하시오.",scalar(h),["식을 약분할 때도 처음에 분모를 0으로 만드는 입력은 그대로 제외된다."]);
  });
  U("rational-restricted-range","점근선을 지나지 않는 구간에서 치역 계산",rng=>{
    const d=reciprocal(rng),t=R(rng,2,4);d.a=t*S(rng,3);
    const ends=[d.k+d.a,d.k+d.a/t].sort((a,b)=>a-b);
    return rProblem(d,"주어진 정의역에서 치역을 구간으로 나타내시오.",interval(...ends),
      ["구간이 수직 점근선을 지나지 않으므로 한 가지에서만 변한다. 두 끝점의 함수값이 치역의 경계가 된다."],qform(d),
      `정의역이 ${m(`[${d.h+1},${d.h+t}]`)}인 유리함수이다.`);
  });
  U("rational-inverse-value","유리함수의 역함수값",rng=>{
    const d=reciprocal(rng),a=S(rng,3),b=S(rng,3);d.a=a*b;
    return rProblem(d,`${m(`f^{-1}(${d.k+b})`)}를 구하시오.`,scalar(d.h+a),
      ["해당 출력이 나오도록 분모를 정하면 원래 입력을 얻는다."]);
  });
  U("rational-center-symmetry","중심 대칭을 이용해 짝이 되는 점 계산",rng=>{
    const d=reciprocal(rng),t=S(rng,3),u=S(rng,3);d.a=t*u;
    return rProblem(d,`대칭이동한 점의 좌표를 구하시오.`,
      point([d.h-t,d.k-u]),["점근선의 교점을 중점으로 하여 가로·세로 거리의 부호를 바꾼다."],qform(d),`다음 유리함수의 그래프의 중심에 대하여 점 ${m(coord([d.h+t,d.k+u]))}를 대칭이동한다.`);
  });
  U("rational-match-graph","점근선과 가지의 방향으로 식 고르기",rng=>{
    const d={h:pick(rng,[-2,-1,1,2]),k:pick(rng,[-2,-1,1,2]),a:pick(rng,[-2,2])};
    const alternatives=[d,{...d,h:-d.h},{...d,k:-d.k},{...d,a:-d.a}].map(x=>m(`y=${qform(x)}`));
    return output("좌표평면에 유리함수의 그래프가 있다.",[],"그래프에 해당하는 식을 고르시오.",
      choice(rng,alternatives[0],alternatives.slice(1)),["점선의 위치에서 두 이동량을 읽고, 그래프 가지가 어느 방향에 놓이는지 확인한다."],graph("rational",d));
  });
  U("rational-two-points","두 점과 수직 점근선으로 수평 점근선 결정",rng=>{
    const d=reciprocal(rng),a=S(rng,3);d.a=2*a;
    return problem(`유리함수의 수직 점근선은 ${m(`x=${d.h}`)}이고 아래 두 점을 지난다.`,[coord([d.h+1,d.k+2*a]),coord([d.h+2,d.k+a])],
      "수평 점근선의 y좌표를 구하시오.",scalar(d.k),["두 입력에서 분모가 각각 1, 2이다. 두 식의 차로 분자 상수를 구한 뒤 수평 점근선의 높이를 계산한다."]);
  });
  U("rational-line-domain-range","유리함수의 정의역과 치역에 빠진 두 값",rng=>{
    const d=reciprocal(rng);
    const options=[[d.h,d.k],[d.h+1,d.k],[d.h,d.k+1],[d.h-1,d.k-1]].map(x=>m(coord(x)));
    return rProblem(d,"정의역에서 빠진 값과 치역에서 빠진 값을 순서대로 고르시오.",
      choice(rng,options[0],options.slice(1)),["분모가 0인 입력을 제외하고, 분수항이 0이 될 수 없으므로 수평 점근선의 높이는 치역에서 빠진다."],rform(d,R(rng)));
  });

  function radical(rng){
    return {h:S(rng,4),k:S(rng,4),a:S(rng,3)};
  }
  const root=({h,k,a})=>tex`\\sqrt{${ax(a,-a*h)}}${k===0?"":k>0?"+"+k:k}`;
  const rRad=(d,ask,ans,steps,intro="다음 무리함수에 대하여 물음에 답하시오.")=>problem(intro,[`f(x)=${root(d)}`],ask,ans,steps);
  V("a-radical-simplify","실수의 부호를 이용해 제곱근 정리",rng=>{
    const h=S(rng),positive=rng()<.5, a=shift("x",h);
    const options=[m(a),m(ax(-1,h)),m(`(${a})^2`),m("0")];
    const index=positive?0:1;
    return problem(`실수 ${m("x")}는 ${m(tex`x${positive?">":"<"}${h}`)}를 만족한다.`,[tex`\\sqrt{(${a})^2}`],
      "위 식과 같은 식을 고르시오.",choice(rng,options[index],options.filter((_,i)=>i!==index)),
      [`제곱의 제곱근은 ${m(`|${a}|`)}이다. 주어진 범위에서 절댓값 안의 부호를 판단한다.`]);
  },"A");
  V("a-radical-domain","근호 안의 식으로 정의역 구하기",rng=>{
    const d=radical(rng);
    return rRad(d,"정의역을 구간으로 나타내시오.",half(d.h,d.a>0),["근호 안의 일차식이 0 이상인 구간이 정의역이다."]);
  },"A");
  V("a-radical-endpoint","무리함수 그래프의 시작점",rng=>{
    const d=radical(rng);
    return rRad(d,"그래프의 시작점 좌표를 구하시오.",point([d.h,d.k]),["근호 안의 값이 0이 되는 입력에서 그래프가 시작한다."]);
  },"A");
  V("a-radical-range","무리함수의 치역 구하기",rng=>{
    const d=radical(rng);
    return rRad(d,"치역을 구간으로 나타내시오.",half(d.k,true),["제곱근은 0 이상인 값을 모두 가지므로 바깥의 상수를 하한으로 한다."]);
  },"A");
  V("a-radical-value","근호가 있는 함수의 함수값",rng=>{
    const d={h:S(rng),k:S(rng),a:pick(rng,[-1,1])},n=R(rng,2,4),t=d.h+d.a*n*n;
    return rRad(d,`${m(`f(${t})`)}의 값을 구하시오.`,scalar(d.k+n),[`근호 안은 ${m(n*n)}이므로 제곱근이 ${m(n)}이다.`]);
  },"A");
  V("a-radical-graph","그래프에서 무리함수의 시작점 읽기",rng=>{
    const d={h:S(rng,3),k:S(rng,3),a:pick(rng,[-1,1])};
    return output("다음은 무리함수의 그래프이다.",[],"표시된 시작점의 좌표를 구하시오.",point([d.h,d.k]),
      ["그래프에서 표시된 끝점의 x좌표와 y좌표를 읽는다."],graph("radical",d));
  },"A");
  V("radical-parameter-domain","정의역의 경계로 근호 안의 상수 복원",rng=>{
    const a=S(rng,3),h=S(rng),k=S(rng);
    return problem(`다음 무리함수의 정의역은 ${half(h,a>0).text}이다.`,[tex`f(x)=\\sqrt{${term(a,"x")}+b}+${par(k)}`],
      `${m("b")}를 구하시오.`,scalar(-a*h),["정의역의 경계에서 근호 안이 0이다."]);
  });
  V("radical-point-parameter","시작점과 한 점에서 근호 계수 결정",rng=>{
    const d={h:S(rng,3),k:S(rng,3),a:pick(rng,[-4,-1,1,4])},t=R(rng,1,3),x=d.h+Math.sign(d.a)*t*t,y=d.k+Math.sqrt(Math.abs(d.a))*t;
    return problem(`아래 무리함수 그래프가 점 ${m(coord([x,y]))}를 지난다.`,[tex`f(x)=\\sqrt{a(${shift("x",d.h)})}+${par(d.k)}`],
      `${m("a")}를 구하시오.`,scalar(d.a),["점의 좌표를 대입한 후 제곱근만 한쪽에 남기고 양변을 제곱한다."]);
  });
  V("radical-two-values","두 함수값으로 근호 안의 일차식 결정",rng=>{
    const a=pick(rng,[-3,3]),h=S(rng),k=S(rng),s=Math.sign(a),u=h+s*3,v=h+s*12;
    return problem(`다음 함수의 두 함수값이 알려져 있다.`,[tex`f(x)=\\sqrt{ax+b}+${par(k)}`,`f(${u})=${k+3},\\quad f(${v})=${k+6}`],
      `${m("b")}의 값을 구하시오.`,scalar(-a*h),["각 값에서 근호 밖 상수를 빼고 제곱한다. 얻어진 두 일차식을 연립한다."]);
  });
  V("radical-root-zero","무리함수의 x절편과 존재 조건",rng=>{
    const d={h:S(rng),k:-R(rng,2,4),a:pick(rng,[-1,1])};
    return rRad(d,"그래프의 x절편을 구하시오.",scalar(d.h+d.a*d.k*d.k),
      ["함수값을 0으로 놓으면 제곱근은 근호 밖 상수의 반대인 양수다. 양변을 제곱하여 입력을 구한다."]);
  });
  V("radical-no-intercept","치역에서 x축과의 교점 존재 판단",rng=>{
    const d=radical(rng);d.k=R(rng,1,6);
    const opts=["교점이 없다","시작점에서 만난다","시작점과 다른 한 점에서 만난다"];
    return rRad(d,"그래프와 x축의 위치 관계를 고르시오.",choice(rng,opts[0],opts.slice(1)),["함수값의 최솟값이 양수이므로 y좌표가 0인 점은 없다."]);
  });
  V("radical-reflection-graph","y축 대칭 후 무리함수의 정의역",rng=>{
    const d=radical(rng);
    return rRad(d,"이 그래프를 y축에 대하여 대칭이동한 함수의 정의역을 구간으로 나타내시오.",half(-d.h,d.a<0),
      ["y축 대칭은 입력의 부호를 바꾼다. 정의역의 경계는 반대 부호로, 구간이 뻗는 방향도 반대로 바뀐다."]);
  });
  V("radical-translate-endpoint","평행이동에서 무리함수의 시작점 역산",rng=>{
    const d=radical(rng),u=S(rng),v=S(rng);
    return rRad(d,`이동 후 시작점 좌표를 구하시오.`,
      point([d.h+u,d.k+v]),["이동 전 시작점의 각 좌표에 해당 이동량을 더한다."],`다음 무리함수의 그래프를 x축 방향으로 ${m(u)}, y축 방향으로 ${m(v)}만큼 평행이동한다.`);
  });
  V("radical-restricted-range","닫힌 구간에서 무리함수의 치역",rng=>{
    const d={h:S(rng),k:S(rng),a:pick(rng,[-1,1])},a=R(rng,1,3),b=a+R(rng,1,3);
    const ends=[d.h+d.a*a*a,d.h+d.a*b*b].sort((x,y)=>x-y);
    return rRad(d,"치역을 구간으로 나타내시오.",interval(d.k+a,d.k+b),
      ["무리함수는 이 구간에서 증가하거나 감소한다. 두 끝점의 함수값을 각각 구해 작은 값부터 적는다."],
      `정의역을 ${m(`[${ends.join(",")}]`)}로 제한한 무리함수이다.`);
  });
  V("radical-inverse-value","무리함수의 역함수값",rng=>{
    const d={h:S(rng),k:S(rng),a:pick(rng,[-1,1])},n=R(rng,2,5);
    return rRad(d,`${m(`f^{-1}(${d.k+n})`)}를 구하시오.`,scalar(d.h+d.a*n*n),
      ["역함수의 입력을 원래 함수의 출력으로 놓고, 제곱근 항만 남긴 뒤 제곱한다."]);
  });
  V("radical-inverse-domain","치역에서 역함수의 정의역 추론",rng=>{
    const d=radical(rng);
    return rRad(d,"역함수의 정의역을 구간으로 나타내시오.",half(d.k,true),
      ["원래 함수의 치역이 역함수의 정의역이다. 원래 그래프의 시작점 높이부터 위쪽으로 모든 값이 나온다."]);
  });
  V("radical-line-extraneous","무리함수와 직선의 교점에서 가짜 해 제외",rng=>{
    const t=R(rng,2,5),v=S(rng),u=t*t-t-v;
    return problem("무리함수와 직선의 교점을 생각하자.",[tex`y=\\sqrt{${shift("x",-u)}},\\quad y=${shift("x",v)}`],
      "교점의 x좌표를 구하시오.",scalar(v+t),[
        `${m(`z=${shift("x",v)}`)}라 두면 제곱해서 ${m(`z^2=z+${t*t-t}`)}이다.`,
        `${m(t)}와 ${m(1-t)} 중 제곱근의 출력과 같은 음이 아닌 값은 ${m(t)}뿐이다.`,
      ]);
  });
  V("radical-two-root-domain","서로 다른 두 제곱근을 포함한 식의 정의역",rng=>{
    const a=S(rng),b=a+R(rng,2,6);
    return problem("다음 식을 실수에서 정의한다.",[tex`\\sqrt{${shift("x",a)}}+\\sqrt{${b}-x}`],
      "정의역을 구간으로 나타내시오.",interval(a,b),["두 근호 안이 동시에 0 이상이어야 하므로 두 조건의 교집합을 구한다."]);
  });
  V("radical-two-graphs-intersection","두 무리함수 그래프의 교점",rng=>{
    const h=S(rng),d=R(rng,2,4),x=h+d*d,k=S(rng);
    return problem("다음 두 그래프를 생각하자.",[tex`y=\\sqrt{${shift("x",h)}}+${par(k)}`,tex`y=\\sqrt{${x+d*d}-x}+${par(k)}`],
      "두 그래프가 만나는 점의 좌표를 구하시오.",point([x,k+d]),
      ["근호 밖 상수가 같으므로 근호 안의 두 일차식을 같게 놓는다. 나온 입력을 대입해 높이를 구한다."]);
  });
  V("radical-match-graph","시작점과 뻗는 방향으로 무리함수 식 선택",rng=>{
    const d={h:pick(rng,[-2,-1,1,2]),k:pick(rng,[-2,-1,1,2]),a:pick(rng,[-1,1])};
    const options=[d,{...d,h:-d.h},{...d,k:-d.k},{...d,a:-d.a}].map(p=>m(`y=${root(p)}`));
    return output("다음은 무리함수의 그래프이다.",[],"그래프에 맞는 식을 고르시오.",
      choice(rng,options[0],options.slice(1)),["시작점의 두 좌표와 정의역이 왼쪽·오른쪽 중 어느 쪽인지 확인한다."],graph("radical",d));
  });
  V("radical-context-threshold","제곱근 모형에서 조건을 처음 만족하는 입력",rng=>{
    const k=R(rng,1,5),n=R(rng,3,6),a=pick(rng,[1,4]),t=n*n;
    return problem(`어떤 실험에서 시간 ${m("t")}초 후 신호의 크기를 다음 식으로 나타낸다.`,[tex`s(t)=\\sqrt{${a}t}+${k},\\quad t\\ge0`],
      `신호의 크기가 처음 ${m(k+Math.sqrt(a)*n)}에 도달하는 시간을 구하시오.`,scalar(t),
      ["신호의 크기는 시간이 지날수록 증가한다. 주어진 크기를 대입해 제곱하면 해당 시간이 나온다."]);
  });
})();


;

/* geometry-practice.js */
(() => {
  "use strict";

  const {m,tex,add,one,problem,choice,scalar,point,rand,pick,signed,coord,shift,linear,term} = globalThis.ForgeTopics;
  const register=(unit,id,label,build,level="B")=>add(id,unit,label,level,one(label,build));
  const Co=(...args)=>register("coordinate",...args);
  const Li=(...args)=>register("lines",...args);
  const Ci=(...args)=>register("circles",...args);
  const Tr=(...args)=>register("transformations",...args);
  const N=(r,a=2,b=5)=>rand(r,a,b);
  const P=r=>[signed(r,4),signed(r,4)];
  const addPoint=([a,b],[x,y])=>[a+x,b+y];
  const times=([x,y],k)=>[x*k,y*k];
  const named=(label,p)=>m(label+coord(p));
  const eq=(a,b,c)=>`${linear(a,"x",b,"y")}=${c}`;
  const line=(a,b)=>`y=${a===0?b:shift(term(a,"x"),-b)}`;
  const circle=([h,k],r)=>`(${shift("x",h)})^2+(${shift("y",k)})^2=${r*r}`;
  const triple=r=>pick(r,[[3,4,5],[4,3,5],[5,12,13],[12,5,13]]);
  const askChoice=(rng,options,index)=>choice(rng,options[index],options.filter((_,i)=>i!==index));

  Co("a-coordinate-quadrant","점이 놓인 사분면",rng=>{
    const p=P(rng),index=p[0]>0?(p[1]>0?0:3):(p[1]>0?1:2);
    const names=["제1사분면","제2사분면","제3사분면","제4사분면"];
    return problem(`좌표평면 위에 점 ${named("P",p)}가 있다.`,[],"점이 놓인 사분면을 고르시오.",
      askChoice(rng,names,index),["가로 좌표와 세로 좌표의 부호를 각각 확인한다."]);
  },"A");
  Co("a-coordinate-distance-axis","좌표축에서 점까지의 거리",rng=>{
    const p=P(rng),x=rng()<.5;
    return problem(`좌표평면 위에 점 ${named("P",p)}가 있다.`,[],`점 P에서 ${x?"x":"y"}축까지의 거리를 구하시오.`,
      scalar(Math.abs(p[x?1:0])),[`축에 수직인 방향의 좌표는 ${m(p[x?1:0])}이다. 거리이므로 절댓값을 취한다.`]);
  },"A");
  Co("a-coordinate-axis-condition","좌표가 0인 점과 좌표축",rng=>{
    const x=rng()<.5,a=signed(rng);
    return problem(`점 ${named("P",x?[a,0]:[0,a])}가 있다.`,[],"이 점이 놓인 곳을 고르시오.",
      askChoice(rng,["x축 위","y축 위","원점","제1사분면"],x?0:1),["0인 좌표의 방향과 수직인 축 위에 점이 놓인다."]);
  },"A");
  Co("a-coordinate-centroid","세 꼭짓점에서 무게중심 계산",rng=>{
    const g=P(rng),a=N(rng),b=N(rng),vertices=[addPoint(g,[a,0]),addPoint(g,[0,b]),addPoint(g,[-a,-b])];
    return problem(`삼각형의 꼭짓점은 ${vertices.map((p,i)=>named("ABC"[i],p)).join(", ")}이다.`,[],
      "무게중심의 좌표를 구하시오.",point(g),["세 점의 x좌표끼리, y좌표끼리 각각 평균 낸다."]);
  },"A");
  Co("a-coordinate-midpoint-number","수직선에서 두 점의 중점",rng=>{
    const k=signed(rng),d=N(rng);
    return problem("수직선 위에 다음 두 점이 있다.",[`A(${k-d}),\\quad B(${k+d})`],"중점의 좌표를 구하시오.",scalar(k),["두 좌표를 더하고 2로 나눈다."]);
  },"A");

  Co("coordinate-axis-section-ratio","좌표축을 지나는 선분의 내분비",rng=>{
    const k=signed(rng),d=P(rng),a=N(rng,1,3),b=a+1;
    const axis=rng()<.5,origin=axis?[k,0]:[0,k];
    const p=addPoint(origin,times(d,-a)),q=addPoint(origin,times(d,b));
    return problem(`선분 ${m("AB")}의 양 끝은 ${named("A",p)}, ${named("B",q)}이다. 선분이 ${axis?"x":"y"}축과 만나는 점을 ${m("T")}라 하자.`,[],
      `${m(`AT:TB=t:${b}`)}일 때 ${m("t")}를 구하시오.`,scalar(a),
      [`축에 수직인 방향의 좌표 변화량을 비교하면 ${m(`${Math.abs(d[axis?1:0])*a}:${Math.abs(d[axis?1:0])*b}=${a}:${b}`)}이다.`]);
  });
  Co("coordinate-parallel-midsegments","삼각형에서 두 변의 중점을 이은 길이",rng=>{
    const a=P(rng),[u,v,d]=triple(rng),b=addPoint(a,[0,2*v]),c=addPoint(b,[2*u,2*v]);
    return problem(`삼각형의 꼭짓점은 ${named("A",a)}, ${named("B",b)}, ${named("C",c)}이다. ${m("AB")}와 ${m("AC")}의 중점을 각각 ${m("M,N")}이라 하자.`,[],
      `${m("MN")}의 길이를 구하시오.`,scalar(d),[`두 중점 사이 가로·세로 거리의 절댓값은 ${m(u)}, ${m(v)}이다. 거리 공식을 적용한다.`]);
  });
  Co("coordinate-parallelogram-fourth","평행사변형에서 대각선 중점으로 꼭짓점 복원",rng=>{
    const a=P(rng),u=N(rng),v=N(rng);
    const b=addPoint(a,[u,1]),c=addPoint(a,[u+1,v+1]),d=addPoint(a,[1,v]);
    return problem(`평행사변형 ${m("ABCD")}의 세 꼭짓점은 ${named("A",a)}, ${named("B",b)}, ${named("C",c)}이다.`,[],
      "점 D의 좌표를 구하시오.",point(d),["평행사변형의 두 대각선은 서로를 이등분한다. AC의 중점을 구하고 B의 반대쪽 끝점을 찾는다."]);
  });
  Co("coordinate-triangle-horizontal-area","수평인 변을 이용한 삼각형의 넓이",rng=>{
    const a=P(rng),u=N(rng,1,5),v=signed(rng,4),b=addPoint(a,[2*u,0]),c=addPoint(a,[u+1,v]);
    return problem(`세 꼭짓점 ${named("A",a)}, ${named("B",b)}, ${named("C",c)}가 만드는 삼각형이다.`,[],
      "삼각형의 넓이를 구하시오.",scalar(u*Math.abs(v)),[`수평 변 ${m("AB")}가 밑변이고, 점 C와 그 변의 y좌표 차의 절댓값이 높이이다.`]);
  });
  Co("coordinate-rectangle-two-sides","기울어진 직사각형의 두 변 길이와 넓이",rng=>{
    const a=P(rng),[x,y,d]=triple(rng),k=N(rng,2,3);
    const b=addPoint(a,[x,y]),c=addPoint(a,[-k*y,k*x]);
    return problem(`직사각형에서 꼭짓점 ${named("A",a)}와 이웃한 두 꼭짓점은 ${named("B",b)}, ${named("C",c)}이다.`,[],
      "직사각형의 넓이를 구하시오.",scalar(k*d*d),[`이웃한 두 변의 길이를 거리 공식으로 구하면 각각 ${m(d)}, ${m(k*d)}이다. 두 길이를 곱한다.`]);
  });
  Co("coordinate-two-travel-legs","꺾인 경로와 직선 경로의 거리 차",rng=>{
    const a=P(rng),[u,v,d]=triple(rng),k=N(rng,1,3);
    const b=addPoint(a,[k*u,0]),c=addPoint(b,[0,k*v]);
    return problem(`로봇이 ${named("A",a)}에서 ${named("B",b)}를 거쳐 ${named("C",c)}로 직선 이동한다.`,[],
      "이 경로는 A에서 C로 곧바로 가는 경로보다 얼마나 긴가?",scalar(k*(u+v-d)),
      [`경유한 길이는 ${m(k*(u+v))}이다. 출발점과 도착점의 거리 ${m(k*d)}를 뺀다.`]);
  });
  Co("coordinate-missing-collinear","한 직선 위의 세 점에서 좌표 복원",rng=>{
    const a=P(rng),d=P(rng),q=N(rng,2,4),p=N(rng,1,q-1);
    const b=addPoint(a,times(d,q)),c=addPoint(a,times(d,p));
    return problem(`세 점 ${named("A",a)}, ${named("B",b)}, ${named("C",[c[0],"t"])}가 한 직선 위에 있다.`,[],
      `${m("t")}를 구하시오.`,scalar(c[1]),
      [`가로 좌표로 보면 점 C는 선분 AB를 ${m(`${p}:${q-p}`)}로 내분한다. 세로 좌표에도 같은 비율을 적용한다.`]);
  });

  Li("a-line-slope-intercept","기울기와 y절편에서 직선식 고르기",rng=>{
    const a=signed(rng,4),b=signed(rng);
    const options=[line(a,b),line(-a,b),line(a,-b),line(-a,-b)].map(m);
    return problem(`기울기가 ${m(a)}이고 y절편이 ${m(b)}인 직선이다.`,[],"직선의 방정식을 고르시오.",
      askChoice(rng,options,0),["x의 계수가 기울기이고, 상수항이 y절편이다."]);
  },"A");
  Li("a-line-intercept-from-equation","일반형 직선의 절편 계산",rng=>{
    const a=signed(rng,4),b=N(rng),x=rng()<.5;
    return problem("다음 직선을 생각하자.",[eq(b,a,a*b)],`이 직선의 ${x?"x":"y"}절편을 구하시오.`,scalar(x?a:b),
      [`${x?"y":"x"}좌표에 0을 대입한다.`]);
  },"A");
  Li("a-line-parallel-test","기울기를 비교해 평행 여부 판단",rng=>{
    const s=signed(rng,4),b=signed(rng),same=rng()<.5;
    const options=["서로 평행하다","한 점에서 만난다"];
    return problem("아래 두 직선이 있다.",[line(s,b),line(same?s:-s,b+2)],"두 직선의 위치 관계를 고르시오.",
      askChoice(rng,options,same?0:1),["기울기가 같고 y절편이 다르면 평행하다. 기울기가 다르면 한 점에서 만난다."]);
  },"A");
  Li("a-line-perpendicular-slope","수직인 직선의 기울기",rng=>{
    const a=signed(rng,4);
    return problem(`한 직선의 기울기는 ${m(a)}이다.`,[],"이 직선에 수직인 직선의 기울기를 구하시오.",{...scalar(-1/a),text:Math.abs(a)===1?String(-1/a):`${a>0?"-":""}1/${Math.abs(a)}`},
      [`기울기의 곱이 ${m(-1)}이 되도록 한다.`]);
  },"A");
  Li("a-line-from-point-slope","한 점과 기울기에서 방정식 구하기",rng=>{
    const s=signed(rng,3),b=signed(rng),x=signed(rng);
    return problem(`기울기가 ${m(s)}인 직선이 ${named("P",[x,s*x+b])}를 지난다.`,[],
      "직선의 y절편을 구하시오.",scalar(b),["직선의 식에 점의 두 좌표를 대입해 상수항을 정한다."]);
  },"A");

  Li("line-two-slopes-area","두 직선과 y축이 만드는 삼각형",rng=>{
    const a=signed(rng,3),b=signed(rng),d=N(rng),x=signed(rng,4);
    return problem("두 직선과 y축이 삼각형을 이룬다.",[line(a,b),line(a+d,b-d*x)],"삼각형의 넓이를 구하시오.",
      scalar(d*x*x/2),[`두 직선의 교점의 x좌표는 ${m(x)}이다. 두 y절편의 차를 밑변, 교점과 y축의 거리를 높이로 삼는다.`]);
  });
  Li("line-intercept-area-parameter","축과 이루는 넓이로 절편 복원",rng=>{
    const a=N(rng),b=N(rng),sign=pick(rng,[-1,1]);
    return problem(`어떤 직선의 x절편은 ${m(2*a)}이고, y절편은 ${sign>0?"양수":"음수"}이다.`,[],
      `두 좌표축과 이 직선이 만드는 삼각형의 넓이가 ${m(a*b)}일 때 y절편을 구하시오.`,scalar(sign*b),
      ["밑변과 높이로 y절편의 절댓값을 구한 뒤, 주어진 부호를 적용한다."]);
  });
  Li("line-three-relations","계수 관계로 일치·평행·교차 판별",rng=>{
    const a=N(rng),b=signed(rng),c=signed(rng),k=N(rng),mode=N(rng,0,2);
    const options=["같은 직선이다","서로 평행한 다른 직선이다","한 점에서 만난다"];
    return problem("두 직선의 방정식이 주어졌다.",[eq(a,b,c),eq(k*a+(mode===2?1:0),k*b,k*c+(mode===1?1:0))],
      "두 직선의 관계를 고르시오.",askChoice(rng,options,mode),["두 번째 식을 첫 번째 식과 비교해 x, y의 계수 및 상수항이 같은 비율인지 각각 확인한다."]);
  });
  Li("line-point-half-plane","두 점이 직선의 어느 쪽에 있는지 판단",rng=>{
    const [a,b]=triple(rng),p=P(rng),c=a*p[0]+b*p[1],up=pick(rng,[-1,1]),down=pick(rng,[-1,1]);
    const q=addPoint(p,[N(rng)*up,0]),r=addPoint(p,[0,N(rng)*down]);
    const choices=["같은 쪽에 있다","서로 다른 쪽에 있다","둘 다 직선 위에 있다"];
    return problem(`두 점 ${named("Q",q)}, ${named("R",r)}와 다음 직선이 있다.`,[eq(a,b,c)],
      "두 점의 위치에 대한 설명을 고르시오.",askChoice(rng,choices,up===down?0:1),
      [`각 점을 좌변에 대입하고 ${m(c)}를 뺀다. 두 결과의 부호가 같으면 같은 쪽이다.`]);
  });
  Li("line-two-distance-axes","교차하는 두 직선에서 같은 거리에 있는 점",rng=>{
    const p=P(rng),d=N(rng),side=pick(rng,[-1,1]),q=addPoint(p,[d,side*d]);
    return problem(`두 직선 ${m(`x=${p[0]}`)}, ${m(`y=${p[1]}`)}에서 같은 거리에 있는 점이 있다.`,[],
      `점의 x좌표가 ${m(q[0])}이고 수평선보다 ${side>0?"위":"아래"}에 있을 때 y좌표를 구하시오.`,scalar(q[1]),
      [`수직선에서 점까지의 거리는 ${m(d)}이다. 수평선으로부터 지정된 쪽으로 그 거리만큼 움직인다.`]);
  });
  Li("line-perpendicular-distance-area","직선과 점 사이 거리로 삼각형 넓이 구하기",rng=>{
    const [a,b,c]=triple(rng),p=P(rng),k=N(rng,1,3),h=N(rng,1,3),q=addPoint(p,times([b,-a],2*k));
    const r=addPoint(p,times([a,b],h));
    return problem(`세 점 ${named("P",p)}, ${named("Q",q)}, ${named("R",r)}가 삼각형을 이룬다.`,[],
      `선분 ${m("PQ")}를 밑변으로 삼아 삼각형의 넓이를 구하시오.`,scalar(k*h*c*c),
      [`직선 PQ의 식은 ${m(eq(a,b,a*p[0]+b*p[1]))}이다. 점 R에서 이 직선까지의 거리 ${m(h*c)}에 밑변 ${m(2*k*c)}를 곱하고 2로 나눈다.`]);
  });
  Li("line-unknown-slope-two-points","두 직선의 수직 조건에서 한 점의 좌표",rng=>{
    const a=signed(rng,3),b=N(rng),p=P(rng),q=addPoint(p,[-a*b,b]);
    return problem(`점 ${named("P",p)}와 ${named("Q",["t",q[1]])}를 지나는 직선이 아래 직선과 수직이다.`,[line(a,signed(rng))],
      `${m("t")}의 값을 구하시오.`,scalar(q[0]),["두 점에서 나온 기울기와 주어진 기울기를 곱해 −1이 되도록 한다."]);
  });

  Ci("a-circle-radius-distance","원 위 점과 중심의 거리 계산",rng=>{
    const h=P(rng),[a,b,r]=triple(rng);
    return problem(`원의 중심은 ${named("C",h)}이고 점 ${named("P",addPoint(h,[a,b]))}가 원 위에 있다.`,[],
      "반지름의 길이를 구하시오.",scalar(r),["반지름은 중심과 원 위의 점 사이의 거리다."]);
  },"A");
  Ci("a-circle-axis-distance","축과 평행한 직선에서 원의 중심까지 거리",rng=>{
    const h=P(rng),r=N(rng),d=N(rng);
    return problem("다음 원과 직선이 주어졌다.",[circle(h,r),`x=${h[0]+d}`],"원 중심에서 직선까지의 거리를 구하시오.",
      scalar(d),["직선은 수직선이다. 중심과 직선의 x좌표 차의 절댓값을 구한다."]);
  },"A");
  Ci("a-circle-origin-membership","원점이 원 위에 있는지 판별",rng=>{
    const [a,b,r]=triple(rng),on=rng()<.5;
    return problem("다음 원의 방정식이 있다.",[circle([a,b],on?r:r+1)],"원점이 이 원 위에 있는가?",
      askChoice(rng,["원 위에 있다","원 위에 있지 않다"],on?0:1),["x, y에 0을 대입해 등식이 성립하는지 확인한다."]);
  },"A");
  Ci("a-circle-expanded-linear","원의 표준형을 전개해 일차항 읽기",rng=>{
    const h=P(rng),r=N(rng),i=N(rng,0,1),axis="xy"[i];
    return problem("아래 원의 방정식을 전개한다.",[circle(h,r)],`${m(axis)}의 일차항 계수를 구하시오.`,
      scalar(-2*h[i]),[`제곱식을 전개할 때 일차항의 계수는 해당 중심 좌표의 ${m(-2)}배다.`]);
  },"A");

  Ci("circle-nonzero-radius-parameter","일반형이 원을 나타내는 상수 범위",rng=>{
    const [h,k]=P(rng),s=h*h+k*k,count=N(rng,2,6);
    return problem("아래 식이 양의 반지름을 가진 원의 방정식이 된다.",[
      `x^2+y^2${h>0?"":"+"}${-2*h}x${k>0?"":"+"}${-2*k}y+t=0`
    ],`${m(`${s-count}\\\\le t\\\\le${s+count}`)}인 정수 ${m("t")}의 개수를 구하시오.`,scalar(count),
      [`완전제곱식으로 바꾸면 반지름의 제곱은 ${m(`${s}-t`)}이다. 양수가 되는 정수만 센다.`]);
  });
  Ci("circle-oblique-chord","기울어진 직선이 만드는 현의 길이",rng=>{
    const h=P(rng),[a,b,d]=triple(rng),[u,v,r]=triple(rng);
    return problem("다음 원과 직선이 두 점에서 만난다.",[circle(h,r),eq(a,b,a*h[0]+b*h[1]+u*d)],
      "두 교점을 잇는 현의 길이를 구하시오.",scalar(2*v),
      [`중심에서 직선까지의 거리는 ${m(u)}이다. 반지름과 이 거리로 직각삼각형을 만들어 현의 절반 ${m(v)}를 구한다.`]);
  });
  Ci("circle-area-annulus","동심원의 반지름으로 색칠한 넓이 구하기",rng=>{
    const h=P(rng),r=N(rng),s=r+N(rng,1,4);
    return problem("아래 두 동심원 사이의 띠 모양 영역을 색칠했다.",[circle(h,r),circle(h,s)],
      `색칠한 넓이가 ${m(tex`k\\pi`)}일 때 ${m("k")}의 값을 구하시오.`,scalar(s*s-r*r),
      ["큰 원과 작은 원의 넓이를 각각 계산하여 뺀다."]);
  });
  Ci("circle-inscribed-square-area","원에 내접한 정사각형의 넓이",rng=>{
    const h=P(rng),r=N(rng);
    return problem("네 꼭짓점이 다음 원 위에 놓인 정사각형이 있다.",[circle(h,r)],
      "정사각형의 넓이를 구하시오.",scalar(2*r*r),
      [`정사각형의 대각선은 원의 지름이므로 길이가 ${m(2*r)}이다. 대각선 길이를 제곱하고 2로 나눈다.`]);
  });
  Ci("circle-both-axis-chords","원과 두 좌표축이 이루는 현의 길이 비교",rng=>{
    const [a,b,r]=triple(rng),sign=()=>pick(rng,[-1,1]);
    return problem("아래 원은 각 좌표축과 두 점에서 만난다.",[circle([a*sign(),b*sign()],r)],
      "두 축에서 각각 생기는 현의 길이 합을 구하시오.",scalar(2*(a+b)),
      [`원의 중심에서 x축까지의 거리로부터 x축 위 현의 길이는 ${m(2*a)}이다. 같은 방법으로 y축 위 현은 ${m(2*b)}이다.`]);
  });
  Ci("circle-tangent-center-position","접선과 중심의 위치에서 중심 좌표 복원",rng=>{
    const [a,b,d]=triple(rng),h=P(rng),r=N(rng),s=pick(rng,[-1,1]),c=a*h[0]+b*h[1]-s*r*d;
    return problem(`반지름이 ${m(r)}인 원의 중심은 ${named("C",["t",h[1]])}이고, 아래 직선에 접한다.`,[eq(a,b,c)],
      `중심의 x좌표가 직선과 ${m(`y=${h[1]}`)}의 교점의 x좌표보다 ${s>0?"클":"작을"} 때 ${m("t")}를 구하시오.`,scalar(h[0]),
      ["중심과 직선 사이 거리를 반지름과 같게 놓는다. 중심이 어느 쪽인지 이용해 절댓값의 부호를 결정한다."]);
  });
  Ci("circle-tangent-two-intercepts","접점에서 접선이 두 축과 만드는 넓이",rng=>{
    const [a,b,r]=triple(rng),k=N(rng,1,3),c=2*a*b*k;
    const x=2*b*k,q=[x-b,a],center=addPoint(q,[-a,-b]);
    return problem(`아래 원 위의 점 ${named("P",q)}에서 접선을 그었다.`,[circle(center,r)],
      "이 접선과 두 좌표축이 만드는 삼각형의 넓이를 구하시오.",scalar(2*a*b*k*k),
      [`접선은 반지름에 수직이고 점 P를 지나므로 ${m(eq(a,b,c))}이다. 두 절편은 ${m(x)}, ${m(2*a*k)}이다.`]);
  });

  Tr("a-transform-only-one-axis","한 축 방향 평행이동에서 변하는 좌표",rng=>{
    const p=P(rng),n=signed(rng),i=N(rng,0,1),q=p.slice();
    q[i]+=n;
    return problem(`점 ${named("P",p)}를 ${"xy"[i]}축 방향으로만 ${m(n)}만큼 평행이동한다.`,[],
      "이동한 점의 좌표를 구하시오.",point(q),["지정한 방향의 좌표에만 이동량을 더한다."]);
  },"A");
  Tr("a-transform-fixed-point","좌표축 대칭에서 제자리에 남는 점",rng=>{
    const a=signed(rng),y=rng()<.5;
    const opts=[[a,0],[0,a],[a,a],[-a,a]].map(p=>m(coord(p)));
    return problem(`아래 점 중 하나를 ${y?"y":"x"}축에 대하여 대칭이동한다.`,[],
      "이동하기 전과 같은 위치에 놓이는 점을 고르시오.",askChoice(rng,opts,y?1:0),["대칭축 위의 점은 위치가 그대로다."]);
  },"A");
  Tr("a-transform-general-axis","좌표축 대칭이동을 식에 적용",rng=>{
    const a=signed(rng,4),b=signed(rng),s=pick(rng,["x","y"]);
    const c=s==="x"?b:-b;
    return problem(`아래 직선을 ${s}축에 대하여 대칭이동한다.`,[line(a,b)],
      "이동한 직선의 식을 고르시오.",askChoice(rng,[line(-a,-c),line(a,-c),line(-a,c),line(a,c)].map(m),0),
      [`${s==="x"?"y":"x"}에 ${m(s==="x"?"-y":"-x")}를 대신 넣고 정리한다.`]);
  },"A");
  Tr("a-transform-shift-circle-equation","원의 가로 이동을 표준형에 반영",rng=>{
    const h=P(rng),r=N(rng),u=signed(rng);
    return problem(`아래 원을 x축 방향으로만 ${m(u)}만큼 평행이동한다.`,[circle(h,r)],"이동 후 중심의 x좌표를 구하시오.",
      scalar(h[0]+u),["원 위의 점들과 중심 모두 같은 가로 방향으로 이동한다."]);
  },"A");

  Tr("transform-shift-line-through-point","이동한 직선이 점을 지나게 하는 이동량",rng=>{
    const a=signed(rng,4),b=signed(rng),u=signed(rng),p=P(rng);
    const q=[p[0],a*(p[0]-u)+b];
    return problem(`아래 직선을 x축 방향으로만 ${m("t")}만큼 이동하니 점 ${named("P",q)}를 지났다.`,[line(a,b)],
      `${m("t")}를 구하시오.`,scalar(u),["점 P를 가로로 이동 전 위치에 되돌리면 원래 직선 위에 있다. 그 조건을 식에 대입한다."]);
  });
  Tr("transform-reflected-parabola-vertex","포물선의 대칭과 평행이동을 연달아 적용",rng=>{
    const h=P(rng),a=signed(rng,3),[u,v]=P(rng);
    return problem(`아래 포물선을 x축에 대하여 대칭이동한 다음 가로로 ${m(u)}, 세로로 ${m(v)}만큼 평행이동한다.`,
      [`y=${a}(${shift("x",h[0])})^2${h[1]>0?"+":""}${h[1]}`],
      "이동 후 꼭짓점의 좌표를 구하시오.",point([h[0]+u,-h[1]+v]),
      ["원래 꼭짓점의 y좌표 부호를 바꾼 다음 각 좌표에 해당 이동량을 더한다."]);
  });
  Tr("transform-circle-radius-after-two","원을 옮긴 뒤 지나는 점으로 반지름 결정",rng=>{
    const h=P(rng),d=P(rng),q=addPoint([h[1],h[0]],d),[a,b,r]=triple(rng);
    return problem(`중심이 ${named("C",h)}인 원을 직선 ${m("y=x")}에 대하여 대칭이동한 다음 가로 ${m(d[0])}, 세로 ${m(d[1])}만큼 평행이동했다.`,[],
      `이동한 원이 ${named("P",addPoint(q,[a,b]))}를 지날 때 원래 반지름을 구하시오.`,scalar(r),
      [`중심이 ${m(coord(q))}로 옮겨진다. 이동 전후의 반지름이 같으므로 새 중심에서 P까지의 거리를 구한다.`]);
  });
  Tr("transform-diagonal-and-axis","대칭과 평행이동 후 점이 축 위에 놓이는 조건",rng=>{
    const [u,v]=P(rng),k=signed(rng),i=N(rng,0,1),p=i?[ "t",k ]:[ k,"t" ];
    return problem(`점 ${named("P",p)}를 직선 ${m("y=x")}에 대해 대칭이동하고, 가로 ${m(u)}, 세로 ${m(v)}만큼 평행이동한다.`,[],
      `이동한 점이 ${i?"x":"y"}축 위에 있을 때 ${m("t")}를 구하시오.`,scalar(i?-v:-u),
      ["대칭이동으로 두 좌표를 맞바꾼다. 이동량을 더한 뒤 축에 수직인 좌표가 0이 되도록 한다."]);
  });
  Tr("transform-matching-images","두 점에 적용한 서로 다른 이동의 결과 일치",rng=>{
    const a=P(rng),u=signed(rng),v=signed(rng),b=[a[0]+u,-a[1]-v];
    return problem(`점 ${named("A",a)}를 x축에 대하여 대칭이동한 다음 가로로 ${m(u)}만큼 평행이동한다. 점 ${named("B",b)}는 세로로만 평행이동한다.`,[],
      "두 점이 같은 곳에 도착할 때 B의 세로 방향 이동량을 구하시오.",scalar(v),
      ["A의 최종 y좌표는 원래 y좌표의 반대이다. 그 값에서 B의 y좌표를 빼면 이동량이다."]);
  });
  Tr("transform-two-parallel-line-distance","평행이동한 직선과 원래 직선 사이 거리",rng=>{
    const [a,b,n]=triple(rng),c=signed(rng),d=N(rng,1,3),u=d*a,v=d*b;
    return problem(`아래 직선을 가로 ${m(u)}, 세로 ${m(v)}만큼 평행이동한다.`,[eq(a,b,c)],
      "두 직선 사이의 거리를 구하시오.",scalar(d*n),
      [`이동한 직선과 원래 직선은 평행하고, 방정식의 우변 차는 ${m(d*n*n)}이다. 이를 ${m(n)}으로 나눈다.`]);
  });
  Tr("transform-moved-circle-chord","이동한 원이 축 위에 만드는 현",rng=>{
    const p=P(rng),[a,b,r]=triple(rng),u=signed(rng),v=b-p[1];
    return problem(`다음 원을 가로 ${m(u)}, 세로 ${m(v)}만큼 평행이동한다.`,[circle(p,r)],
      "이동 후 원과 x축의 두 교점을 잇는 길이를 구하시오.",scalar(2*a),
      [`이동 후 중심과 x축 사이의 거리는 ${m(b)}이다. 반지름 ${m(r)}과 이 거리를 써서 현의 절반을 구한다.`]);
  });
})();


;

/* function-practice.js */
(() => {
  "use strict";

  const {m,tex,add,one,problem,choice,scalar,point,set,rand,pick,signed,coord,shift,term,par} = globalThis.ForgeTopics;
  const register=(unit,id,label,build,level="B")=>add(id,unit,label,level,one(label,build));
  const F=(...args)=>register("functions",...args);
  const U=(...args)=>register("rational",...args);
  const V=(...args)=>register("radical",...args);
  const N=(r,a=2,b=5)=>rand(r,a,b);
  const z=(r,n=4)=>signed(r,n);
  const seq=(start,n)=>Array.from({length:n},(_,i)=>start+i);
  const finite=xs=>tex`\\{${xs.join(",\\,")}\\}`;
  const affine=(a,b)=>a===0?String(b):shift(term(a,"x"),-b);
  const plus=(a,b)=>b===0?String(a):`${a}${b>0?"+":""}${b}`;
  const quotient=(numerator,denominator)=>tex`\\frac{${numerator}}{${denominator}}`;
  const sqrt=x=>tex`\\sqrt{${x}}`;
  const reciprocal=(a,h,k)=>plus(quotient(a,shift("x",h)),k);
  const radical=(a,h,k)=>plus(sqrt(affine(a,-a*h)),k);
  const map=(xs,ys)=>xs.map((x,i)=>tex`${x}\\mapsto${ys[i]}`).join(",\\quad ");
  const choose=(rng,options,i=0)=>choice(rng,options[i],options.filter((_,j)=>i!==j));
  const bounded=(a,b,closedA=true,closedB=true)=>{
    const left=a===null?tex`-\\infty`:a,right=b===null?tex`\\infty`:b;
    return {kind:"interval",value:[{start:a,end:b,startClosed:closedA,endClosed:closedB}],
      text:m(`${closedA?"[":"("}${left},${right}${closedB?"]":")"}`)};
  };
  const intervalOf=(h,toRight)=>toRight?bounded(h,null,true,false):bounded(null,h,false,true);

  F("a-function-read-codomain","함수 기호와 공역 읽기",rng=>{
    const a=z(rng),b=a+5;
    const domain=seq(a,3),codomain=seq(b,N(rng,3,6));
    return problem("다음 대응은 함수이다.",[tex`f:${finite(domain)}\\to${finite(codomain)}`,map(domain,[b,b+2,b])],
      "공역의 원소 개수를 구하시오.",scalar(codomain.length),["화살표 오른쪽에 선언된 집합 전체가 공역이다. 실제로 대응한 값만 모으면 치역이 된다."]);
  },"A");
  F("a-function-identity-constant","항등함수와 상수함수 구별",rng=>{
    const a=z(rng),xs=seq(a,3),i=N(rng,0,2),ys=[xs,[a,a,a],[a+1,a+2,a]][i];
    const labels=["항등함수","상수함수","둘 다 아니다"];
    return problem(`집합 ${m(finite(xs))}에서 자기 자신으로 가는 함수이다.`,[map(xs,ys)],"함수의 종류를 고르시오.",
      choose(rng,labels,i),["모든 입력이 그대로 나오면 항등함수이고, 모든 출력이 한 값으로 같으면 상수함수이다."]);
  },"A");
  F("a-function-read-missing-output","대응표에서 특정 함수값 읽기",rng=>{
    const a=z(rng),b=z(rng),xs=seq(a,4),ys=[b,b+2,b-1,b],i=N(rng,0,3);
    return problem("함수의 대응표가 다음과 같다.",[map(xs,ys)],`${m(`f(${xs[i]})`)}를 구하시오.`,scalar(ys[i]),
      ["지정된 입력에서 화살표가 가리키는 값을 읽는다."]);
  },"A");
  F("a-function-injection-from-table","대응표로 일대일함수 판단",rng=>{
    const a=z(rng),b=z(rng),xs=seq(a,3),ok=rng()<.5;
    return problem("함수의 전체 대응이다.",[map(xs,[b,b+2,ok?b+1:b])],"일대일함수인지 고르시오.",
      choose(rng,["일대일함수이다","일대일함수가 아니다"],ok?0:1),
      ["서로 다른 두 입력에 같은 값이 대응하는지 확인한다."]);
  },"A");
  F("a-function-recover-inverse-input","역함수 기호를 원래 함수식으로 바꾸기",rng=>{
    const a=z(rng),b=a+N(rng);
    const options=[`f^{-1}(${b})=${a}`,`f^{-1}(${a})=${b}`,`f^{-1}(${b})=${b}`].map(m);
    return problem(`일대일대응 ${m("f")}의 함수값 ${m(`f(${a})=${b}`)}를 알고 있다.`,[],
      "반드시 성립하는 등식을 고르시오.",choose(rng,options),["역함수에서는 원래 입력과 출력의 자리가 바뀐다."]);
  },"A");

  F("function-same-values-different-rule","식이 달라도 주어진 정의역에서 같은 함수 판단",rng=>{
    const a=z(rng),b=a+N(rng),c=z(rng),base=affine(1,c),f=`(${shift("x",a)})`,g=`(${shift("x",b)})`;
    const opts=[`${base}+${f}${g}`,`${base}+${f}`,`${base}+${g}`,`${base}+1`].map(value=>m(`y=${value}`));
    return problem(`함수들의 정의역은 모두 ${m(finite([a,b]))}, 공역은 모두 실수 전체이다. 함수 ${m(`y=${base}`)}가 주어졌다.`,[],
      "주어진 함수와 같은 함수를 고르시오.",choose(rng,opts),
      [`추가된 항이 두 입력 ${m(a)}, ${m(b)}에서 모두 0이어야 한다.`]);
  });
  F("function-identify-image-preimage","같은 함수값을 갖는 입력 전체 찾기",rng=>{
    const h=z(rng),k=z(rng),d=N(rng);
    const xs=[h-d,h-1,h,h+1,h+d];
    return problem(`함수의 정의역은 ${m(finite(xs))}이다.`,[`f(x)=${plus(`(${shift("x",h)})^2`,k)}`],
      `함수값이 ${m(k+d*d)}가 되는 모든 입력을 집합으로 쓰시오.`,set([h-d,h+d]),
      [`제곱식이 ${m(d*d)}이므로 축을 기준으로 양쪽에서 각각 ${m(d)}만큼 떨어진 입력이 나온다.`]);
  });
  F("function-codomain-bijection","일대일대응이 되게 하는 유한 공역 결정",rng=>{
    const a=z(rng),b=z(rng),x=seq(a,3),ys=[b,b+2,b+4],opts=[ys,[b,b+2,b+5],[b,b+1,b+4],[b,b+2,b+4,b+6]].map(xs=>m(finite(xs)));
    return problem("정의역의 모든 원소에 대한 대응이 다음과 같다.",[map(x,ys)],
      "함수가 일대일대응이 되도록 공역을 고르시오.",choose(rng,opts),
      ["서로 다른 입력이 서로 다른 출력에 대응한다. 공역을 실제 출력 전체와 같게 두어야 빠지는 원소가 없다."]);
  });
  F("function-composition-table-preimage","유한 대응에서 합성 결과가 되는 입력 모으기",rng=>{
    const a=z(rng),b=z(rng),c=z(rng),xs=seq(a,4),ys=seq(b,3);
    return problem("두 함수의 전체 대응은 다음과 같다.",[
      `f:\\quad ${map(xs,[ys[0],ys[2],ys[0],ys[1]])}`,`g:\\quad ${map(ys,[c,c+1,c])}`
    ],`${m(tex`(g\\circ f)(x)=${c}`)}인 입력을 모두 모아 집합으로 쓰시오.`,set(xs.slice(0,3)),
      [`먼저 g에서 ${m(c)}가 되는 입력을 찾고, f에서 그 값들로 가는 입력을 모두 모은다.`]);
  });
  F("function-composition-equality","두 합성 순서의 결과가 같도록 계수 결정",rng=>{
    const a=N(rng),b=z(rng),k=N(rng),aConst=(a-1)*b;
    return problem("실수 전체에서 두 함수가 다음과 같이 정의된다.",[`f(x)=${affine(a,aConst)}`,`g(x)=${k}x+t`],
      `모든 입력에 대해 ${m(tex`f\\circ g=g\\circ f`)}가 되게 하는 ${m("t")}를 구하시오.`,scalar((k-1)*b),
      [`두 합성식에서 x의 계수는 같다. 상수항을 같게 놓으면 ${m(`(${a}-1)t=(${k}-1)${par(aConst)}`)}이다.`]);
  });
  F("function-composition-recover-rule","합성식에서 바깥 함수의 상수항 복원",rng=>{
    const a=N(rng),b=z(rng),c=z(rng),d=z(rng);
    return problem("두 일차함수의 관계가 다음과 같다.",[
      `f(x)=${affine(a,b)}`,tex`(g\\circ f)(x)=${affine(c*a,c*b+d)}`
    ],`${m("g(0)")}을 구하시오.`,scalar(d),
      [`g의 식을 ${m("g(x)=ux+v")}로 놓고 합성한다. 일차항으로 ${m(`u=${c}`)}를 정한 뒤 상수항으로 ${m(`v=${d}`)}를 구한다.`]);
  });
  F("function-inverse-fixed-composition","역함수 안팎에서 함수와 역함수의 상쇄 적용",rng=>{
    const a=z(rng,3),b=z(rng),t=z(rng),u=N(rng),v=a*t+b;
    return problem("다음 일대일대응이 있다.",[`f(x)=${affine(a,b)}`],
      `${m(`f(f^{-1}(${v})+${u})`)}를 구하시오.`,scalar(v+a*u),
      [`역함수 부분의 값은 ${m(t)}이다. 바깥 함수에는 그 값에 ${m(u)}를 더한 수를 대입한다.`]);
  });
  F("function-linear-injection-parameter","두 입력의 함수값이 같아 일대일이 깨지는 계수",rng=>{
    const a=z(rng),b=z(rng),x=z(rng),y=x+N(rng);
    return problem(`정의역이 ${m(finite([x,y]))}인 다음 함수가 일대일함수가 아니다.`,[
      `f(x)=(t${a>0?"-":"+"}${Math.abs(a)})x${b>0?"+":""}${b}`
    ],`${m("t")}를 구하시오.`,scalar(a),
      ["서로 다른 두 입력에 같은 출력이 나오려면 이 일차식의 x의 계수가 0이어야 한다."]);
  });

  U("a-rational-add-like-fractions","분모가 같은 유리식의 덧셈",rng=>{
    const h=z(rng),a=N(rng),b=N(rng),den=shift("x",h);
    const opts=[quotient(a+b,den),quotient(a*b+1,den),quotient(a+b,`(${den})^2`)].map(m);
    return problem(`${m(tex`x\\ne${h}`)}에서 다음 식을 정리한다.`,[`${quotient(a,den)}+${quotient(b,den)}`],
      "같은 식을 고르시오.",choose(rng,opts),["분모를 유지하고 분자만 더한다."]);
  },"A");
  U("a-rational-substitute-zero","유리함수의 y절편 직접 계산",rng=>{
    const h=z(rng),k=z(rng),q=z(rng);
    return problem("다음 유리함수의 그래프를 생각하자.",[`y=${reciprocal(-h*q,h,k)}`],
      "그래프의 y절편을 구하시오.",scalar(k+q),["x에 0을 대입한다."]);
  },"A");
  U("a-rational-shift-horizontal","기본 유리함수의 가로 평행이동",rng=>{
    const h=z(rng),a=z(rng);
    return problem(`아래 그래프를 x축 방향으로 ${m(h)}만큼 옮긴다.`,[`y=${quotient(a,"x")}`],
      "옮긴 식을 고르시오.",choose(rng,[reciprocal(a,h,0),reciprocal(a,-h,0),reciprocal(a,0,h)].map(x=>m(`y=${x}`))),
      [`새 그래프의 입력에서 이동량을 빼면 원래 그래프의 입력이 된다.`]);
  },"A");
  U("a-rational-reciprocal-sign","역수 그래프가 놓이는 사분면",rng=>{
    const a=z(rng);
    return problem("아래 유리함수의 그래프를 생각하자.",[`y=${quotient(a,"x")}`],
      "그래프가 지나가는 두 사분면을 고르시오.",choose(rng,["제1·3사분면","제2·4사분면"],a>0?0:1),
      [`x와 y의 곱이 ${m(a)}이므로 두 좌표의 부호가 같은지 다른지 알 수 있다.`]);
  },"A");
  U("a-rational-denominator-product","유리식 분모를 0으로 만드는 값들",rng=>{
    const h=z(rng),j=h+N(rng);
    return problem("다음 유리식을 실수에서 정의한다.",[quotient(1,`(${shift("x",h)})(${shift("x",j)})`)],
      "제외해야 하는 입력을 집합으로 쓰시오.",set([h,j]),["각 인수를 0으로 만드는 값을 하나씩 구한다."]);
  },"A");

  U("rational-missing-input-from-value-ratio","두 함수값의 높이 비에서 다른 입력 결정",rng=>{
    const h=z(rng),k=z(rng),a=z(rng),d=N(rng),n=N(rng,2,3),s=pick(rng,[-1,1]);
    return problem("다음 유리함수가 있다.",[`f(x)=${reciprocal(a,h,k)}`],
      `${m(`f(t)-${par(k)}`)}가 ${m(`f(${h+s*d})-${par(k)}`)}의 ${m(quotient(1,n))}일 때 ${m("t")}를 구하시오.`,
      scalar(h+s*d*n),["수평 점근선의 높이를 빼면 분모가 입력의 이동량인 역수 형태이다. 값이 정해진 비율로 작아지려면 분모의 크기는 그 역비율로 커진다."]);
  });
  U("rational-match-inverse-rule","분수식 역함수를 점근선과 함께 고르기",rng=>{
    const h=z(rng),k=h+N(rng,2,4),a=z(rng);
    const opts=[reciprocal(a,k,h),reciprocal(-a,k,h),reciprocal(a,h,k),reciprocal(a,k,-h)].map(value=>m(`y=${value}`));
    return problem("다음 유리함수의 역함수를 생각하자.",[`f(x)=${reciprocal(a,h,k)}`],
      "역함수의 식을 고르시오.",choose(rng,opts),
      [`원래 식은 ${m(`(x-${par(h)})(y-${par(k)})=${a}`)}와 같다. 두 좌표의 역할을 바꾸어 y에 대해 정리한다.`]);
  });
  U("rational-reflection-x-axis","대칭이동한 유리함수의 점에서 분자 상수 결정",rng=>{
    const h=z(rng),k=z(rng),a=z(rng),d=N(rng),c=a*d;
    return problem(`아래 그래프를 x축에 대하여 대칭이동했더니 점 ${m(coord([h+d,-k-a]))}를 지났다.`,[`y=${reciprocal("t",h,k)}`],
      `원래 식에서 ${m("t")}를 구하시오.`,scalar(c),
      ["가로 좌표는 그대로 두고 세로 좌표의 부호만 바꿔 원래 그래프 위의 점을 얻는다. 이 좌표를 식에 대입한다."]);
  });
  U("rational-two-intersections","유리함수와 직선의 서로 다른 두 교점",rng=>{
    const h=z(rng),k=z(rng),u=N(rng,1,4),v=-N(rng,1,4),a=-u*v;
    return problem("아래 유리함수와 직선의 교점을 생각하자.",[`y=${reciprocal(a,h,k)}`,`y=${affine(1,k-h-u-v)}`],
      "두 교점의 x좌표를 집합으로 쓰시오.",set([h+u,h+v]),
      [`이동한 입력을 ${m(`w=x-${par(h)}`)}로 놓고 분모를 곱하면 ${m(`(w-${par(u)})(w-${par(v)})=0`)}이다. 두 해 모두 분모를 0으로 만들지 않는다.`]);
  });
  U("rational-context-fixed-cost","공동 부담 비용에서 인원 구하기",rng=>{
    const fee=N(rng,2,6)*1000,people=N(rng,3,8),extra=N(rng,2,6)*100,total=fee*people;
    return problem(`모임 장소 대여료 ${m(total)}원을 참가자들이 똑같이 나눈다. 참가자 한 명마다 별도 준비비 ${m(extra)}원이 든다.`,[],
      `한 사람의 총 부담액이 ${m(fee+extra)}원일 때 참가자는 몇 명인가?`,scalar(people),
      [`한 사람 몫의 대여료는 ${m(fee+extra)}에서 ${m(extra)}를 뺀 값이다. 전체 대여료를 그 값으로 나눈다.`]);
  });
  U("rational-sum-forbidden-input","유리식의 덧셈에서 약분 후 정의되지 않는 값",rng=>{
    const h=z(rng),j=h+N(rng),a=N(rng);
    return problem("다음 두 유리식의 합을 하나의 식으로 정리한다.",[
      `${quotient(a,shift("x",h))}+${quotient(a*(j-h),`(${shift("x",h)})(${shift("x",j)})`)}`
    ],"원래 식이 정의되지 않는 모든 입력을 구하시오.",set([h,j]),
      ["식 전체가 정의되려면 두 분모가 모두 0이 아니어야 한다. 정리한 식에서도 원래 제외한 값을 되살리지 않는다."]);
  });
  U("rational-composition-affine-domain","일차함수와 합성한 유리함수의 제외값",rng=>{
    const a=z(rng,3),b=z(rng),x=z(rng),h=a*x+b,k=z(rng);
    return problem("다음 함수들을 합성한다.",[`f(x)=${reciprocal(N(rng),h,k)}`,`g(x)=${affine(a,b)}`],
      `${m(tex`f\\circ g`)}의 정의역에 속하지 않는 실수를 구하시오.`,scalar(x),
      [`안쪽 함수값이 ${m(h)}이면 바깥 함수의 분모가 0이 된다. 그 값을 만드는 원래 입력을 역산한다.`]);
  });
  U("rational-interval-signed-output","유리함수의 가지에서 특정 높이 이상의 범위",rng=>{
    const h=z(rng),k=z(rng),a=N(rng),d=N(rng);
    return problem("다음 유리함수의 그래프를 생각하자.",[`f(x)=${reciprocal(a*d,h,k)}`],
      `${m(tex`f(x)\\ge${k+a}`)}인 실수 범위를 구간으로 쓰시오.`,bounded(h,h+d,false,true),
      ["왼쪽 가지는 수평 점근선보다 아래에 놓인다. 오른쪽 가지에서 분모가 양수이므로 두 변에 곱해 위쪽 끝을 구한다."]);
  });

  V("a-radical-extract-square","제곱인 인수를 근호 밖으로 꺼내기",rng=>{
    const a=N(rng),b=pick(rng,[2,3,5,7]);
    const opts=[`${a}${sqrt(b)}`,`${a*a}${sqrt(b)}`,`${a}${sqrt(a*b)}`].map(m);
    return problem("다음 제곱근을 간단히 한다.",[sqrt(a*a*b)],"같은 값을 고르시오.",choose(rng,opts),
      [`${m(a*a)}를 제곱인 인수로 분리하여 ${m(a)}를 근호 밖으로 꺼낸다.`]);
  },"A");
  V("a-radical-like-terms","같은 제곱근 항의 계수 합치기",rng=>{
    const a=N(rng),b=N(rng),n=pick(rng,[2,3,5,7]),r=sqrt(n);
    return problem("다음 두 항을 더한다.",[`${a}${r}+${b}${r}`],
      `합이 ${m(`k${r}`)}일 때 ${m("k")}를 구하시오.`,scalar(a+b),["같은 근호 부분은 그대로 두고 두 계수를 더한다."]);
  },"A");
  V("a-radical-rationalize","단일 근호가 있는 분모의 유리화",rng=>{
    const a=N(rng),b=pick(rng,[2,3,5,7]),r=sqrt(b);
    const opts=[quotient(`${a}${r}`,b),quotient(`${a}${r}`,b*b),quotient(a,b)].map(m);
    return problem("다음 분수의 분모를 유리화한다.",[quotient(a,r)],"같은 값을 고르시오.",choose(rng,opts),
      [`분자와 분모에 모두 ${m(r)}를 곱하면 분모가 ${m(b)}이 된다.`]);
  },"A");
  V("a-radical-x-direction","기본 무리함수 그래프가 뻗는 방향",rng=>{
    const a=z(rng,3);
    return problem("다음 무리함수의 그래프가 있다.",[`y=${sqrt(term(a,"x"))}`],
      "그래프가 원점에서 어느 방향으로 뻗는지 고르시오.",choose(rng,["오른쪽 위","왼쪽 위","오른쪽 아래","왼쪽 아래"],a>0?0:1),
      ["근호 안은 0 이상이어야 하고 제곱근의 값도 0 이상이다."]);
  },"A");
  V("a-radical-boundary-value","정의역의 끝에서 무리함수값 구하기",rng=>{
    const h=z(rng),k=z(rng),a=z(rng);
    return problem("다음 무리함수가 주어졌다.",[`f(x)=${radical(a,h,k)}`],
      `${m(`f(${h})`)}를 구하시오.`,scalar(k),["주어진 값을 넣으면 근호 안이 0이 되고, 근호 밖 상수만 남는다."]);
  },"A");

  V("radical-conjugate-coefficient","켤레식을 이용해 분모를 유리화한 계수",rng=>{
    const a=N(rng,2,4),b=a*a+1,c=N(rng);
    return problem("다음 분수의 분모를 유리화한다.",[quotient(c,`${sqrt(b)}+${a}`)],
      `결과가 ${m(`u${sqrt(b)}+v`)}일 때 ${m("u+v")}를 구하시오.`,scalar(c-c*a),
      [`켤레식 ${m(`${sqrt(b)}-${a}`)}을 분자와 분모에 곱한다. 분모는 ${m(`${b}-${a*a}=1`)}이다.`]);
  });
  V("radical-denominator-open-boundary","근호가 분모에 있을 때 정의역 끝점 판단",rng=>{
    const h=z(rng),a=z(rng,3),b=N(rng);
    const interval=a>0?bounded(h,null,false,false):bounded(null,h,false,false);
    return problem("다음 함수의 정의역을 생각하자.",[`f(x)=${quotient(b,sqrt(affine(a,-a*h)))}`],
      "정의역을 구간으로 쓰시오.",interval,["분모인 제곱근이 0이 되면 안 되므로 근호 안은 양수여야 한다."]);
  });
  V("radical-inequality-output","무리함수값의 상한에서 입력 구간 구하기",rng=>{
    const h=z(rng),k=z(rng),a=pick(rng,[-1,1]),n=N(rng),t=h+a*n*n;
    return problem("다음 무리함수가 있다.",[`f(x)=${radical(a,h,k)}`],
      `${m(tex`f(x)\\le${k+n}`)}인 입력의 범위를 구간으로 쓰시오.`,bounded(Math.min(h,t),Math.max(h,t)),
      [`근호 안의 값은 0 이상 ${m(n*n)} 이하이다. 두 조건을 동시에 만족하도록 입력을 제한한다.`]);
  });
  V("radical-graph-reflection-range","x축 대칭과 세로 이동 후의 치역",rng=>{
    const h=z(rng),k=z(rng),a=z(rng),v=z(rng),top=-k+v;
    return problem(`아래 무리함수 그래프를 x축에 대하여 대칭이동한 다음 y축 방향으로 ${m(v)}만큼 평행이동한다.`,
      [`y=${radical(a,h,k)}`],"이동한 그래프의 치역을 구간으로 나타내시오.",bounded(null,top,false,true),
      [`원래 출력의 최솟값은 ${m(k)}이다. 부호를 바꾸고 이동량을 더하므로 새 최댓값은 ${m(top)}이다.`]);
  });
  V("radical-y-intercept-parameter","무리함수의 y절편으로 근호 안의 상수 찾기",rng=>{
    const a=z(rng),n=N(rng),k=z(rng);
    return problem(`다음 함수의 y절편이 ${m(k+n)}이다.`,[`f(x)=${plus(sqrt(`${term(a,"x")}+t`),k)}`],
      `${m("t")}를 구하시오.`,scalar(n*n),
      ["x에 0을 대입한다. 근호 밖의 상수를 빼고 양변을 제곱한다."]);
  });
  V("radical-inverse-graph-match","무리함수 역함수의 식과 제한된 정의역",rng=>{
    const h=z(rng),k=z(rng),a=pick(rng,[-1,1]);
    const expr=sgn=>plus(`${sgn===1?"":"-"}(${shift("x",k)})^2`,h);
    const opt=(sgn,symbol)=>m(tex`y=${expr(sgn)},\\quad x${symbol}${k}`);
    return problem("다음 무리함수가 있다.",[`f(x)=${radical(a,h,k)}`],
      "역함수의 식과 정의역을 고르시오.",choose(rng,[opt(a,"\\\\ge"),opt(a,"\\\\le"),opt(-a,"\\\\ge"),opt(-a,"\\\\le")]),
      ["입력과 출력의 역할을 바꾸고 근호만 남겨 제곱한다. 원래 함수의 치역이 역함수의 정의역이다."]);
  });
  V("radical-line-two-intersections","무리함수와 직선의 두 교점에서 좌표의 합",rng=>{
    const t=N(rng,2,4),v=z(rng),h=z(rng);
    const p=t*t+v,q=(t+1)*(t+1)+v;
    // Put the chosen positive square roots at t and t+1.
    const b=-(t*(t+1))+v,h0=h+t*(t+1);
    return problem("아래 무리함수와 직선은 서로 다른 두 점에서 만난다.",[
      `y=${plus(sqrt(shift("x",v)),h0)}`,
      `y=${plus(quotient(affine(1,-b),2*t+1),h0)}`
    ],"두 교점의 x좌표의 합을 구하시오.",scalar(p+q),
      [`제곱근을 ${m("w")}라 놓으면 ${m(`w^2-(${2*t+1})w+${t*(t+1)}=0`)}이다. 양의 근 두 개를 x좌표로 되돌려 더한다.`]);
  });
  V("radical-affine-compose-domain","안쪽 함수의 부호에 따라 합성 정의역 결정",rng=>{
    const h=z(rng),a=z(rng,3),t=z(rng),b=h-a*t,k=z(rng);
    return problem("두 함수가 다음과 같이 주어졌다.",[`f(x)=${radical(1,h,k)}`,`g(x)=${affine(a,b)}`],
      `${m(tex`f\\circ g`)}의 정의역을 구간으로 쓰시오.`,intervalOf(t,a>0),
      [`안쪽 함수값이 ${m(h)} 이상이어야 한다. 일차부등식을 풀 때 x의 계수 부호에 유의한다.`]);
  });

})();


;

/* type-families.js */
(() => {
  "use strict";
  const {types,add,alternative}=globalThis.ForgeTopics;
  const aliases={};
  const {configure}=globalThis.ForgeAnswerPaths;
  for(const [id,subject] of [
    ["midpoint-inverse","다른 끝점"],["centroid-inverse","구하는 꼭짓점"],
    ["coordinate-section-inverse","점 $B$"],["coordinate-nested-section","점 $Q$"],
    ["coordinate-parallelogram-fourth","점 $D$"],["line-intersection","두 직선의 교점"],
    ["line-projection","수선의 발"],["circle-three-points","원의 중심"],
    ["circle-center-on-axis","원의 중심"],["translate-inverse-point","원래 점 $A$"],
    ["translate-circle-center","이동한 원의 중심"],["reflect-two-axes","최종 이동한 점"],
    ["reflect-circle","이동한 원의 중심"],["transform-intersection","이동한 교점"],
    ["transform-reflected-parabola-vertex","이동 후 꼭짓점"],
    ["rational-center-general","두 점근선의 교점"],["rational-center-symmetry","대칭이동한 점"],
    ["radical-translate-endpoint","이동 후 시작점"],["radical-two-graphs-intersection","두 그래프의 교점"],
  ]) configure(id,subject);
  const {m,point,scalar}=globalThis.ForgeTopics;
  const circlePaths=[
    {id:"center",label:"중심 좌표",operations:["Center","Coordinates"],outputType:"Point",resolve:r=>point(r.center),question:()=>"원의 중심 좌표를 구하시오."},
    ...["x","y"].map((axis,i)=>({id:"center-"+axis,label:"중심의 "+axis+"좌표",operations:["Center",axis==="x"?"XCoordinate":"YCoordinate"],outputType:"Scalar",resolve:r=>scalar(r.center[i]),question:()=>"원 중심의 "+m(axis)+"좌표를 구하시오."})),
    {id:"radius",label:"반지름",operations:["Radius"],outputType:"Scalar",resolve:r=>scalar(r.radius),question:()=>"원의 반지름을 구하시오."},
    {id:"diameter",label:"지름",operations:["Radius","MultiplyByTwo"],outputType:"Scalar",resolve:r=>scalar(2*r.radius),question:()=>"원의 지름의 길이를 구하시오."},
    {id:"radius-squared",label:"반지름의 제곱",operations:["Radius","Square"],outputType:"Scalar",resolve:r=>scalar(r.radius**2),question:()=>"원의 반지름의 제곱을 구하시오."},
  ].map(path=>({...path,requirements:["positive-radius"]}));
  for(const id of ["circle-general","circle-diameter"]) types[id].variants=types[id].variants.map(variant=>({
    ...variant,resultType:{baseType:"Circle",capabilities:["center","radius"],domain:"real"},answerPaths:circlePaths,
  }));
  // Group the same instructional method across requested outputs and surface forms.
  const families=[
    ["section-internal","내분점의 좌표와 내분비",["section-ratio","coordinate-section-inverse","coordinate-directed-number-line"]],
    ["parallel-line","평행 조건으로 직선의 방정식 결정",["line-parameter-parallel"]],
    ["perpendicular-line","수직 조건으로 직선의 방정식 결정",["line-unknown-slope-two-points"]],
    ["line-intercepts-area","직선의 절편과 삼각형의 넓이",["line-intercept-area-parameter"]],
    ["circle-horizontal-chord","원과 직선이 만드는 현",["circle-oblique-chord","circle-axis-intersection"]],
    ["circle-tangency-radius","원과 직선의 접하는 조건",["circle-tangent-center-position"]],
    ["circle-general","원의 일반형과 표준형",["circle-origin-constant"]],
    ["translate-inverse-point","평행이동과 이동량 역산",["translate-two-stages"]],
    ["reflect-line-axis","직선의 대칭이동",["reflect-line-diagonal"]],
    ["set-cardinality","두 집합의 포함배제와 원소 개수",["set-application-neither","venn-complement-count"]],
    ["set-demorgan","집합 연산의 변형과 드모르간 법칙",["complement-of-difference"]],
    ["quantifiers","‘모든’이나 ‘어떤’이 있는 명제",["proposition-quantifier-intersection"]],
    ["function-equal-domain","함수의 상등",["function-same-values-different-rule"]],
    ["function-bijection-missing","유한집합의 일대일대응",["function-codomain-bijection"]],
    ["rational-center-general","유리함수의 정의역·치역과 점근선",["rational-line-domain-range"]],
    ["rational-inverse-value","유리함수의 역함수",["rational-match-inverse-rule"]],
    ["rational-cancel-domain","유리식의 약분과 정의 조건",["rational-sum-forbidden-input"]],
    ["radical-inverse-value","무리함수의 역함수",["radical-inverse-domain","radical-inverse-graph-match"]],
    ["radical-root-zero","무리함수와 좌표축의 교점",["radical-no-intercept"]],
    ["radical-line-extraneous","무리함수와 직선의 교점",["radical-line-two-intersections"]],
  ];
  for(const [id,label,others] of families) {
    const entry=types[id];
    entry.label=label;
    entry.variants=[id,...others].flatMap(source=>{
      const original=types[source];
      if(!original) throw new Error("Unknown family member "+source);
      return original.variants.map(variant=>({...variant,id:source+":"+variant.id}));
    });
    for(const source of others) aliases[source]=id;
  }
  for(const [id,label,source,paths] of [
    ["remainder-eval","이차식으로 나눈 나머지","remainder",["evaluate","linear","intercept"]],
    ["intersection-sum","포물선과 직선의 교점 활용","intersection",["sum","positiveY","distance"]],
    ["inequality-compare","두 식의 대소 비교와 해의 활용","inequality",["compare","integerCount"]],
  ]) {
    add(id,id==="remainder-eval"?"polynomials":"quadratics",label,"B",
      paths.map(path=>alternative(path,label,rng=>{
        const data=globalThis.MathForge.generate(source,"B",{rng,pathId:path});
        return {...data,format:"legacy",answerPath:undefined};
      })));
  }
  Object.assign(aliases,{
    "remainder-leading":"remainder-eval","remainder-constant":"remainder-eval",
    "intersection-positive":"intersection-sum","intersection-distance":"intersection-sum",
    "inequality-count":"inequality-compare",
  });
  ForgeTypeFamilies = globalThis.ForgeTypeFamilies = Object.freeze({aliases});
})();


;

/* variations.js */
(() => {
  "use strict";
  const {types,m,tex,rand,pick,signed,shift,term,coord,problem,scalar,point,set,choice,alternative}=ForgeTopics;
  const int=(r,a=2,b=7)=>rand(r,a,b), z=(r,n=6)=>signed(r,n);
  const unique=xs=>[...new Set(xs)].sort((a,b)=>a-b);
  const finite=xs=>tex`\\{${unique(xs).join(',\\,')}\\}`;
  const plus=(a,b)=>a+(b<0?'':'+')+b;
  const line=(a,b)=>shift(term(a,'x'),-b);
  const square=(v,h)=>`(${shift(v,h)})^2`;
  const append=(id,label,kind,build,extra={})=>{
    if(!types[id])throw new Error('Unknown variation family '+id);
    types[id].variants.push({...alternative('expanded-'+label,label,build),answerKind:kind,...extra});
  };
  const numericText=n=>m(String(Number(n.toFixed(8))));
  function present(data,mode,rng) {
    if(mode!=='choice') {
      if(data.answer.kind==='choice'&&['참','거짓'].includes(data.answer.text))return {...data,answer:{kind:'truth',value:data.answer.text,text:data.answer.text},question:data.question.replace('고르시오','쓰시오')};
      return data;
    }
    if(data.answer.kind==='choice')return data;
    const a=data.answer;
    let wrong=[];
    if(a.kind==='scalar') {
      const n=a.value;
      if(!Number.isFinite(n))return data;
      const nonnegative=!data.allowNegative&&!/좌표/.test(data.question)&&/개수|몇|길이|거리|넓이|반지름|둘레|n\(/.test(data.question);
      const lower=[n-1,n-2,-n].filter(v=>v<n&&(!nonnegative||v>=0));
      const upper=[n+1,n+2,n+3];
      const candidates=lower.length?[pick(rng,lower),pick(rng,upper),n+(rng()<.5?-2:2)]:upper;
      wrong=unique([...candidates,...upper,...lower]).filter(v=>v!==n&&(!nonnegative||v>=0));
      // 보기를 섞기 전에도 정답 양쪽의 값이 포함되도록 한다.
      const selected=[...new Set((data.distractors??[]).filter(v=>Number.isFinite(v)&&v!==n&&(!nonnegative||v>=0)))].slice(0,3);
      if(lower.length)for(const candidate of candidates.slice(0,2))if(selected.length<3&&!selected.includes(candidate))selected.push(candidate);
      for(const candidate of wrong)if(!selected.includes(candidate)&&selected.length<3)selected.push(candidate);
      wrong=selected.map(numericText);
    } else if(a.kind==='point') {
      const [x,y]=a.value;
      wrong=[[y,x],[-x,y],[x,-y],[x+1,y],[x,y+1],[x-1,y],[x,y-1]].filter(p=>p[0]!==x||p[1]!==y).map(p=>m(coord(p)));
    } else if(a.kind==='set') {
      const xs=unique(a.value), hi=(xs.at(-1)??0)+1;
      wrong=[set([...xs,hi]).text,set(xs.length?xs.slice(1):[hi+1]).text,set(xs.map(n=>n+1)).text,set([hi+2]).text];
    } else if(a.kind==='interval') {
      const text=values=>values.map(({start,end,startClosed,endClosed})=>{
        const lo=start===null?'':start+(startClosed?tex`\\le `:'<');
        const hi=end===null?'':(endClosed?tex`\\le `:'<')+end;
        return m(tex`\\{x\\mid ${lo}x${hi}\\}`);
      }).join(' 또는 ');
      const variants=[
        a.value.map(i=>({...i,startClosed:i.start===null?false:!i.startClosed,endClosed:i.end===null?false:!i.endClosed})),
        a.value.map(i=>({...i,start:i.start===null?null:i.start+1,end:i.end===null?null:i.end+1})),
        a.value.map(i=>({...i,start:i.start===null?null:i.start-1,end:i.end===null?null:i.end-1})),
      ];
      wrong=variants.map(text);
    } else return data;
    const right=a.kind==='scalar'?numericText(a.value):a.kind==='set'?set(unique(a.value)).text:a.text;
    wrong=[...new Set(wrong)].filter(t=>t!==right).slice(0,3);
    if(wrong.length<3)return data;
    const question=data.question.replace(/구하시오\.?$/,'고르시오.').replace(/나타내시오\.?$/,'나타낸 것을 고르시오.').replace(/쓰시오\.?$/,'나타낸 것을 고르시오.');
    return {...data,question,answer:choice(rng,right,wrong),responseKind:a.kind};
  }
  function setQuestion(data,operation) {
    const q=data.question;
    const expression=q.match(/^\$([^$]+)\$(?:의 원소)?[을를] 구하시오/);
    if(expression&&operation==='count')return m(`n(${expression[1]})`)+'을 구하시오.';
    const action=operation==='count'?'개수':operation==='sum'?'합':operation==='min'?'최솟값':'최댓값';
    const rules=[
      [/원소를 모두 구하시오\.?$/,`원소의 ${action}를 구하시오.`],
      [/의 원소를 구하시오\.?$/,`의 서로 다른 원소의 ${action}를 구하시오.`],
      [/의? 진리집합을 구하시오\.?$/,`의 진리집합의 원소 ${action}를 구하시오.`],
      [/모든 입력을 집합으로 쓰시오\.?$/,`입력들의 ${action}를 구하시오.`],
      [/입력을 모두 모아 집합으로 쓰시오\.?$/,`입력들의 ${action}를 구하시오.`],
      [/모든 입력을 구하시오\.?$/,`입력들의 ${action}를 구하시오.`],
      [/의? 치역을 구하시오\.?$/,`의 치역의 원소 ${action}를 구하시오.`],
      [/의? 정의역을 구하시오\.?$/,`의 정의역의 원소 ${action}를 구하시오.`],
      [/해당 집합을 원소나열법으로 쓰시오\.?$/,`해당 집합의 원소 ${action}를 구하시오.`],
      [/[을를] 집합으로 쓰시오\.?$/,`의 ${action}를 구하시오.`],
      [/[을를] 구하시오\.?$/,`의 원소 ${action}를 구하시오.`],
    ];
    for(const [re,to]of rules)if(re.test(q))return q.replace(re,to).replace('합를','합을').replace('값를','값을');
    return q+' 이 집합의 원소 '+action+'를 답하시오.';
  }
  const setPaths=(nonempty=false)=>[
    {id:'elements',label:'원소 나열',outputType:'FiniteSet',passthrough:true},
    ...['count',...(nonempty?['sum','min','max']:[])].map(operation=>({
      id:operation,label:{count:'원소 개수',sum:'원소의 합',min:'가장 작은 원소',max:'가장 큰 원소'}[operation],outputType:'Scalar',
      requirements:nonempty?['finite','nonempty']:['finite'],
      transform:data=>{
        const values=unique(data.answer.value);
        const value=operation==='count'?values.length:operation==='sum'?values.reduce((a,b)=>a+b,0):operation==='min'?Math.min(...values):Math.max(...values);
        return {...data,question:setQuestion(data,operation),answer:scalar(value),solution:[...data.solution,`해당 집합은 ${set(values).text}이므로 요구한 값은 ${m(value)}이다.`]};
      },
    })),
  ];
  const pointPaths=subject=>[...['coordinates','x','y','sum'].map(id=>({
    id,label:{coordinates:'좌표 전체',x:'x좌표',y:'y좌표',sum:'좌표의 합'}[id],outputType:id==='coordinates'?'Point':'Scalar',
    transform:data=>{const p=data.answer.value;const answer=id==='coordinates'?point(p):scalar(id==='sum'?p[0]+p[1]:p[id==='x'?0:1]);
      return {...data,question:subject+(id==='coordinates'?'의 좌표를 구하시오.':id==='sum'?'의 두 좌표의 합을 구하시오.':'의 '+m(id)+'좌표를 구하시오.'),answer,
        solution:[...data.solution,`요구한 값은 ${id==='coordinates'?answer.text:m(answer.text)}이다.`]};},
  })),...ForgeAnswerPaths.pointLinearPaths(subject)];
  const pointVariant=(id,label,subject,build)=>append(id,label,'point',build,{resultType:{baseType:'Point',capabilities:['x','y','coordinates','sum']},answerPaths:pointPaths(subject)});
  const setVariant=(id,label,build,nonempty=false)=>append(id,label,'set',build,{resultType:{baseType:'FiniteSet',capabilities:['elements','count',...(nonempty?['sum','min','max']:[])]},answerPaths:setPaths(nonempty)});

  function world(rng) {
    const kind=int(rng,0,2), n=pick(rng,[12,18,24,30,36,40,48,60,72]);
    let U,description;
    if(kind===0){U=Array.from({length:int(rng,10,20)},(_,i)=>i+1);description=`전체집합은 ${m(tex`U=\\{x\\mid x`)}는 ${m(U.at(-1))} 이하의 자연수${m(tex`\\}`)}이다.`;}
    else if(kind===1){U=Array.from({length:n},(_,i)=>i+1).filter(x=>n%x===0);description=`전체집합은 ${m(tex`U=\\{x\\mid x`)}는 ${m(n)}의 양의 약수${m(tex`\\}`)}이다.`;}
    else {U=unique(Array.from({length:12},()=>int(rng,-8,24)));description=`전체집합은 ${m('U='+finite(U))}이다.`;}
    const threshold=pick(rng,U), d=int(rng,2,5), k=pick(rng,[12,18,24,30,36]);
    const predicates=[
      {text:`${m(d)}의 배수`,test:x=>x%d===0},
      {text:'홀수',test:x=>Math.abs(x)%2===1},
      {text:'짝수',test:x=>x%2===0},
      {text:`${m(k)}의 양의 약수`,test:x=>x>0&&k%x===0},
      {text:`${m(`x<${threshold}`)}를 만족하는 수`,test:x=>x<threshold},
      {text:`${m(tex`x^2\\le${int(rng,2,6)**2}`)}를 만족하는 수`,test:null},
    ];
    // 제곱 조건의 경계는 표시한 조건으로부터 정확히 결정한다.
    const last=predicates.at(-1), bound=Number(last.text.match(/le(\d+)/)?.[1]);last.test=x=>x*x<=bound;
    const order=predicates.map((p,i)=>({p,key:rng(),i})).sort((a,b)=>a.key-b.key).slice(0,3).map(o=>o.p);
    const sets=order.map(p=>U.filter(p.test));
    const definitionLines=order.map((p,i)=>{
      const name=['A','B','C'][i], label=p.text;
      if(label.includes('를 만족하는 수'))return m(tex`${name}=\\{x\\mid ${label.slice(1,label.indexOf('$',1))}\\}`);
      return m(tex`${name}=\\{x\\mid x`)+`는 ${label}`+m(tex`\\}`);
    });
    return {U,sets,description,definitions:definitionLines.join('\n'),definitionLines};
  }
  function setExpressionVariant(rng,onlyComplement=false) {
    const w=world(rng),[A,B,C]=w.sets, has=(s,x)=>s.includes(x);
    const options=onlyComplement?[
      [tex`A^c-B^c`,x=>!has(A,x)&&has(B,x)],
      [tex`B^c-A^c`,x=>!has(B,x)&&has(A,x)],
    ]:[
      [tex`(A\\cup B)-C`,x=>(has(A,x)||has(B,x))&&!has(C,x)],
      [tex`A\\cap(B\\cup C^c)`,x=>has(A,x)&&(has(B,x)||!has(C,x))],
      [tex`(A-B)\\cup(C\\cap B)`,x=>has(A,x)&&!has(B,x)||has(C,x)&&has(B,x)],
      [tex`(A\\cup B)^c\\cap C`,x=>!has(A,x)&&!has(B,x)&&has(C,x)],
      [tex`(A\\cap B)\\cup(A\\cap C^c)`,x=>has(A,x)&&(has(B,x)||!has(C,x))],
    ];
    const [form,test]=pick(rng,options),values=w.U.filter(test);
    return problem(w.description+'\n'+w.definitionLines.slice(0,onlyComplement?2:3).join('\n'),[],`${m(form)}의 원소를 구하시오.`,set(values),
      [`각 집합의 원소는 ${m('A='+finite(A))}, ${m('B='+finite(B))}${onlyComplement?'':', '+m('C='+finite(C))}이다.`, `전체집합 안에서 주어진 연산을 적용하면 ${set(values).text}이다.`]);
  }
  setVariant('set-expressions','조건제시와 복합 연산',r=>setExpressionVariant(r));
  setVariant('set-complement-inclusion-missing','여집합과 불규칙한 원소',r=>setExpressionVariant(r,true));
  setVariant('a-set-operation','조건제시 집합의 합집합과 교집합',rng=>{
    const w=world(rng),[A,B]=w.sets,union=rng()<.5;const values=w.U.filter(x=>union?A.includes(x)||B.includes(x):A.includes(x)&&B.includes(x));
    return problem(w.description+'\n'+w.definitionLines.slice(0,2).join('\n'),[],`${m(union?tex`A\\cup B`:tex`A\\cap B`)}를 구하시오.`,set(values),[`두 집합의 원소를 비교하면 ${set(values).text}이다.`]);
  });
  setVariant('a-set-complement','약수와 배수로 정의한 여집합',rng=>{
    const w=world(rng),A=w.sets[0],values=w.U.filter(x=>!A.includes(x));
    return problem(w.description+'\n'+w.definitionLines[0],[],`${m(tex`A^c`)}를 구하시오.`,set(values),[`전체집합에서 ${m('A='+finite(A))}의 원소를 제외한다.`]);
  });
  for(const id of ['set-divisibility-count','symmetric-difference','complement-intersection-count']) append(id,'조건제시법의 원소 개수','scalar',rng=>{
    const w=world(rng),[A,B]=w.sets;
    const [expr,test]=id==='set-divisibility-count'?[tex`A\\cap B`,x=>A.includes(x)&&B.includes(x)]:id==='symmetric-difference'?[tex`(A-B)\\cup(B-A)`,x=>A.includes(x)!==B.includes(x)]:[tex`A^c\\cap B`,x=>!A.includes(x)&&B.includes(x)];
    const xs=w.U.filter(test);return problem(w.description+'\n'+w.definitionLines.slice(0,2).join('\n'),[],`${m(`n(${expr})`)}을 구하시오.`,scalar(xs.length),[`해당 원소는 ${set(xs).text}이므로 ${m(`n(${expr})=${xs.length}`)}이다.`]);
  });
  setVariant('recover-a-set','비연속 집합의 복원',rng=>{
    const w=world(rng),[A,B]=w.sets;return problem('두 집합에 대하여 다음이 성립한다.',[tex`A=${finite(A)},\\quad A\\cup B=${finite([...A,...B])}`,tex`A\\cap B=${finite(A.filter(x=>B.includes(x)))}`],`${m('B')}의 원소를 구하시오.`,set(B),[`합집합 중 ${m('A')} 밖의 원소와, 주어진 교집합을 합치면 ${set(B).text}이다.`]);
  });
  for(const id of ['set-cardinality','three-set-inclusion','exactly-two-of-three']) append(id,'여러 영역에서 묻는 개수','scalar',rng=>{
    if(id==='set-cardinality') {
      const [a,b,c,d]=Array.from({length:4},()=>int(rng,1,9)),U=a+b+c+d;
      const paths=[[tex`A-B`,a],[tex`B-A`,c],[tex`A\\cap B`,b],[tex`(A\\cup B)^c`,d]];
      const [target,value]=pick(rng,paths);
      return problem('전체집합의 두 부분집합에 대하여 다음이 성립한다.',[tex`n(U)=${U},\\quad n(A)=${a+b},\\quad n(B)=${b+c}`,target===tex`(A\\cup B)^c`?tex`n(A\\cap B)=${b}`:tex`n((A\\cup B)^c)=${d}`],`${m(`n(${target})`)}을 구하시오.`,scalar(value),[`두 집합의 공통 원소는 ${m(b)}개이고, ${m('A')}에만 속하는 원소는 ${m(a)}개, ${m('B')}에만 속하는 원소는 ${m(c)}개이다.`]);
    }
    const counts=Array.from({length:7},()=>int(rng,1,6)),[a,b,ab,c,ac,bc,abc]=counts,U=counts.reduce((s,x)=>s+x,0);
    const target=id==='exactly-two-of-three'?['세 집합 중 정확히 두 집합에만 속하는 원소의 개수를 구하시오.',ab+ac+bc]:pick(rng,[['세 집합 중 한 집합에만 속하는 원소의 개수를 구하시오.',a+b+c],[`${m(tex`n(A\\cup B\\cup C)`)}를 구하시오.`,U],['세 집합 중 두 집합 이상에 속하는 원소의 개수를 구하시오.',ab+ac+bc+abc]]);
    return problem('세 집합에 대하여 다음이 성립한다.',[tex`n(A)=${a+ab+ac+abc},\\quad n(B)=${b+ab+bc+abc},\\quad n(C)=${c+ac+bc+abc}`,tex`n(A\\cap B)=${ab+abc},\\quad n(A\\cap C)=${ac+abc},\\quad n(B\\cap C)=${bc+abc}`,id==='three-set-inclusion'?tex`n(A\\cap B\\cap C)=${abc}`:tex`n(A\\cup B\\cup C)=${U}`],target[0],scalar(target[1]),[`세 집합 모두에 속하는 원소는 ${m(abc)}개이다. 정확히 두 집합에만 속하는 원소는 각각 ${m(ab)}, ${m(ac)}, ${m(bc)}개이다. 한 집합에만 속하는 원소는 각각 ${m(a)}, ${m(b)}, ${m(c)}개이다.`]);
  });

  const negate=a=>({op:'not',a});
  const binary=(op,a,b)=>({op,a,b});
  const evaluate=(a,env)=>typeof a==='string'?env[a]:a.op==='not'?!evaluate(a.a,env):a.op==='and'?evaluate(a.a,env)&&evaluate(a.b,env):evaluate(a.a,env)||evaluate(a.b,env);
  const show=a=>typeof a==='string'?m(a):a.op==='not'?(typeof a.a==='string'?m(tex`\\sim ${a.a}`):m(tex`\\sim`)+ '('+show(a.a)+')'):'('+show(a.a)+(a.op==='and'?' 그리고 ':' 또는 ')+show(a.b)+')';
  const envs=Array.from({length:8},(_,i)=>({p:!!(i&1),q:!!(i&2),r:!!(i&4)}));
  const signature=a=>envs.map(e=>+evaluate(a,e)).join('');
  append('negation','중첩된 연결어와 부정','choice',rng=>{
    const [p,q,r]=pick(rng,[['p','q','r'],['q','r','p'],['r','p','q']]),op=rng()<.5?'and':'or';
    const original=pick(rng,[binary(op,p,negate(q)),binary(op,negate(p),binary(op==='and'?'or':'and',q,r)),negate(binary(op,p,q))]);
    const demorgan=a=>typeof a==='string'?negate(a):a.op==='not'?a.a:binary(a.op==='and'?'or':'and',demorgan(a.a),demorgan(a.b));
    const correct=demorgan(original),same=signature(correct);
    const candidates=[original,binary(op,negate(p),q),binary(op,p,q),binary(op,negate(p),negate(q)),binary(op==='and'?'or':'and',p,q),binary(op==='and'?'or':'and',negate(p),q),r,negate(r)];
    const seen=new Set([same]),wrong=[];for(const ast of candidates){const key=signature(ast);if(!seen.has(key)){seen.add(key);wrong.push(show(ast));}if(wrong.length===3)break;}
    return problem(`세 조건 ${m('p,q,r')}가 주어져 있다.`,[],`조건 ‘${show(original)}’의 부정을 고르시오.`,choice(rng,show(correct),wrong),[`각 조건과 연결어를 부정하면 ${show(correct)}이다.`]);
  });
  function logicalWorld(rng,needCounterexample=false) {
    const w=world(rng),[P,Q]=w.sets,witness=pick(rng,w.U),np=needCounterexample?!P.includes(witness):rng()<.5,nq=needCounterexample?Q.includes(witness):rng()<.5,or=rng()<.5;
    const defs=w.definitionLines.slice(0,2).join('\n').replaceAll('$A=','$P=').replaceAll('$B=','$Q=').replaceAll('$C=','$R=');
    const p=np?tex`\\sim p`:'p',q=nq?tex`\\sim q`:'q';
    const pp=x=>P.includes(x)!==np,qq=x=>Q.includes(x)!==nq;
    return {...w,defs,p,q,pp,qq,or,values:w.U.filter(x=>or?pp(x)||qq(x):pp(x)&&qq(x))};
  }
  for(const id of ['truth-set','and-or','a-truth-set'])setVariant(id,'부정과 수의 성질로 정의한 진리집합',rng=>{
    const w=logicalWorld(rng);return problem(w.description+'\n'+w.defs+'\n'+` 조건 ${m('p,q')}의 진리집합은 각각 ${m('P,Q')}이다.`,[],`‘${m(w.p)} ${w.or?'또는':'그리고'} ${m(w.q)}’의 진리집합을 구하시오.`,set(w.values),[`각 조건의 진리집합을 전체집합 안에서 해석하면 ${set(w.values).text}이다.`]);
  });
  setVariant('counterexample','복합 명제의 모든 반례',rng=>{
    const w=logicalWorld(rng,true),values=w.U.filter(x=>w.pp(x)&&!w.qq(x));
    return problem(w.description+'\n'+w.defs+'\n'+` 조건 ${m('p,q')}의 진리집합은 각각 ${m('P,Q')}이다.`,[tex`${w.p}\\to ${w.q}`],'이 명제의 반례가 되는 원소를 모두 구하시오.',set(values),[`가정은 참이고 결론은 거짓인 원소를 모으면 ${set(values).text}이다.`]);
  });
  const relation=['충분조건이지만 필요조건은 아니다.','필요조건이지만 충분조건은 아니다.','필요충분조건이다.','충분조건도 필요조건도 아니다.'];
  for(const id of ['suff-necessary','suff-necessary-sets','truth-and-sets'])append(id,'부정이 포함된 두 조건의 관계','choice',rng=>{
    const w=logicalWorld(rng),P=w.U.filter(w.pp),Q=w.U.filter(w.qq),pq=P.every(x=>Q.includes(x)),qp=Q.every(x=>P.includes(x));
    const index=pq&&qp?2:pq?0:qp?1:3;
    return problem(w.description+'\n'+w.defs+'\n'+` 조건 ${m('p,q')}의 진리집합은 각각 ${m('P,Q')}이다.`,[],`${m(w.p)}는 ${m(w.q)}의 어떤 조건인지 고르시오.`,choice(rng,relation[index],relation.filter((_,i)=>i!==index)),[`두 조건의 진리집합은 각각 ${set(P).text}, ${set(Q).text}이다. 두 포함 관계를 비교하면 ${relation[index]}`]);
  });
  for(const id of ['truth-value','quantifiers'])append(id,'유한집합과 부정이 포함된 명제','choice',rng=>{
    const w=logicalWorld(rng),universal=rng()<.5;
    const values=w.U.filter(x=>w.pp(x)&&!w.qq(x));
    const truth=universal?values.length===0:values.length>0;
    return problem(w.description+'\n'+w.defs+'\n'+` 조건 ${m('p,q')}의 진리집합은 각각 ${m('P,Q')}이다.`,[],
      `‘${universal?'모든':'어떤'} 원소 ${m('x')}에 대하여 ${m(w.p)}${universal?'이면':'이고'} ${m(w.q)}${universal?'이다':'가 아니다'}.’의 참과 거짓을 판별하시오.`,
      choice(rng,truth?'참':'거짓',[truth?'거짓':'참']),[`가정이 참이고 결론이 거짓인 원소의 집합은 ${set(values).text}이다. 따라서 이 명제는 ${truth?'참':'거짓'}이다.`]);
  });

  append('set-demorgan','세 집합과 중첩된 여집합','choice',rng=>{
    const op=rng()<.5?'and':'or';
    const source=binary(op,'p',binary(op==='and'?'or':'and',negate('q'),'r'));
    const original=negate(source),flip=a=>typeof a==='string'?negate(a):a.op==='not'?a.a:binary(a.op==='and'?'or':'and',flip(a.a),flip(a.b));
    const correct=flip(source),repr=a=>typeof a==='string'?({p:'A',q:'B',r:'C'})[a]:a.op==='not'?`${repr(a.a)}^c`:`(${repr(a.a)}${a.op==='and'?tex`\\cap `:tex`\\cup `}${repr(a.b)})`;
    const candidates=[source,binary(op,negate('p'),binary(op, 'q',negate('r'))),binary(op,'p','q'),negate(binary(op,'p','q')),binary(op==='and'?'or':'and','q','r'),negate('r')];
    const seen=new Set([signature(correct)]),wrong=[];for(const a of candidates){const key=signature(a);if(!seen.has(key)){seen.add(key);wrong.push(m(repr(a)));}if(wrong.length===3)break;}
    return problem('전체집합의 세 부분집합을 생각하자.',[repr(original)],'주어진 식과 항상 같은 집합을 고르시오.',choice(rng,m(repr(correct)),wrong),[`각 여집합과 연산 순서를 정리하면 ${m(repr(correct))}이다.`]);
  });
  append('set-subset-count','실제 원소의 필수와 금지 조건','scalar',rng=>{
    const w=world(rng),U=w.U,required=U.filter((_,i)=>i%4===0),excluded=U.filter((_,i)=>i%4===1),free=U.length-required.length-excluded.length;
    return problem(w.description,[tex`M=${finite(required)},\\quad N=${finite(excluded)}`],
      `${m(tex`M\\subset X\\subset U`)}, ${m(tex`X\\cap N=\\varnothing`)}를 만족하는 집합 ${m('X')}의 개수를 구하시오.`,scalar(2**free),
      [`반드시 포함하는 원소와 제외하는 원소를 정하면 자유롭게 포함 여부를 고를 수 있는 원소는 ${m(free)}개이므로 ${m(`2^{${free}}`)}개이다.`]);
  });
  const subsetPaths=[
    {id:'count',label:'가능한 집합 수',outputType:'Scalar',transform:d=>({...d,question:`조건을 만족하는 집합 ${m('X')}의 개수를 구하시오.`,answer:scalar(2**d.subsets.free)})},
    ...[['min',false],['max',true]].map(([id,maximum])=>({id,label:'원소 수의 '+id,outputType:'Scalar',transform:d=>({...d,question:`${m('n(X)')}의 ${maximum?'최댓값':'최솟값'}을 구하시오.`,answer:scalar(d.subsets.required+(maximum?d.subsets.free:0))})})),
  ];
  append('subsets-intersection','교집합 조건과 원소 수의 범위','scalar',rng=>{
    const w=world(rng),U=w.U,A=U.filter((_,i)=>i%2===0),B=A.filter((_,i)=>i%2===0),free=U.length-A.length;
    return {...problem(w.description,[tex`A=${finite(A)},\\quad B=${finite(B)}`,tex`X\\subset U,\\quad X\\cap A=B`],'조건을 만족하는 집합의 개수를 구하시오.',scalar(2**free),[`집합 ${m('B')}의 원소 ${m(B.length)}개는 반드시 포함한다. ${m('A-B')}는 제외하고 ${m('U-A')}의 원소 ${m(free)}개는 자유롭게 선택한다.`]),subsets:{required:B.length,free}};
  },{answerPaths:subsetPaths});
  append('set-range-parameter','약수 집합과 경계 상수','scalar',rng=>{
    const w=world(rng),U=w.U,n=int(rng,1,U.length-1),maximum=rng()<.5;
    return problem(w.description+` 정수 ${m('k')}에 대하여 ${m(tex`A=\\{x\\in U\\mid x\\le k\\}`)}이다.`,[tex`n(A)=${n}`],`${m('k')}의 ${maximum?'최댓값':'최솟값'}을 구하시오.`,scalar(maximum?U[n]-1:U[n-1]),[`정렬한 전체집합에서 ${m(n)}번째 원소는 ${m(U[n-1])}, 다음 원소는 ${m(U[n])}이므로 ${m(tex`${U[n-1]}\\le k<${U[n]}`)}이다.`]);
  });
  append('equality-unordered-set','집합의 순서와 매개변수','scalar',rng=>{
    const a=z(rng),d=int(rng,2,6),t=a+int(rng,2,6);
    return problem('다음 두 집합은 서로 같다.',[tex`\\{${a},\\,k,\\,k+${d}\\}=\\{${[t+d,a,t].join(',\\,')}\\}`],`${m('k')}를 구하시오.`,scalar(t),[`고정된 원소 ${m(a)}를 제외한 두 원소 중 작은 값이 ${m('k')}이므로 ${m(t)}이다.`]);
  });
  append('intersection-bound','포함 관계로 정해지는 두 극값','scalar',rng=>{
    const u=int(rng,12,25),a=int(rng,3,u-2),b=int(rng,3,u-2),maximum=rng()<.5,v=maximum?Math.min(a,b):Math.max(0,a+b-u);
    return problem('전체집합의 두 부분집합에 대하여 다음이 성립한다.',[tex`n(U)=${u},\\quad n(A)=${a},\\quad n(B)=${b}`],`${m(tex`n(A\\cap B)`)}의 ${maximum?'최댓값':'최솟값'}을 구하시오.`,scalar(v),[maximum?`작은 집합을 큰 집합에 포함시키면 최대 ${m(v)}개이다.`:`가능한 한 두 집합을 겹치지 않게 배치하면 최소 ${m(v)}개이다.`]);
  });
  types['intersection-bound'].label='전체집합 크기로 교집합의 범위 구하기';
  append('disjoint-sets-parameter','불규칙한 집합과 연속한 두 수','scalar',rng=>{
    const w=world(rng),A=w.U,lower=A[0],forbidden=new Set([...A,...A.map(x=>x-1)]),candidates=Array.from({length:A.at(-1)-lower+3},(_,i)=>lower+i).filter(k=>!forbidden.has(k)),k=candidates[0];
    return problem(w.description+` 집합 ${m('A')}는 ${m('U')}와 같고 ${m(tex`B=\\{k,k+1\\}`)}이다.`,[tex`A\\cap B=\\varnothing`],`${m(tex`k\\ge${lower}`)}인 정수 ${m('k')}의 최솟값을 구하시오.`,scalar(k),[`${m('k')}와 ${m('k+1')}이 모두 ${m('A')}에 속하지 않는 가장 작은 정수는 ${m(k)}이다.`]);
  });
  append('statement-meaning','조건과 양화된 명제의 분류','scalar',rng=>{
    const w=logicalWorld(rng),P=w.U.filter(w.pp),both=w.U.filter(x=>w.pp(x)&&w.qq(x));
    const truths=[P.length===w.U.length,P.length<w.U.length,both.length>0];
    const statements=[`${m(w.p)}`,`모든 원소 ${m('x')}에 대하여 ${m(w.p)}이다.`,`어떤 원소 ${m('x')}에 대하여 ${m(w.p)}가 아니다.`,`어떤 원소 ${m('x')}에 대하여 ${m(w.p)} 그리고 ${m(w.q)}이다.`];
    return problem(w.description+'\n'+w.defs+'\n'+` 조건 ${m('p,q')}의 진리집합은 각각 ${m('P,Q')}이다.\n`+statements.map((s,i)=>`${['①','②','③','④'][i]} ${s}`).join('\n'),[], '①~④ 중 참인 명제의 개수를 구하시오.',scalar(truths.filter(Boolean).length),[`①은 변수의 값이 정해지지 않은 조건이다. ②, ③, ④의 참과 거짓은 각각 ${truths.map(t=>t?'참':'거짓').join(', ')}이다.`]);
  });
  // 좌표와 도형은 답의 구조를 먼저 정하고 역으로 점과 계수를 구성한다.
  const P=rng=>[z(rng),z(rng)];
  const addP=(a,b)=>a.map((v,i)=>v+b[i]);
  const mulP=(a,n)=>a.map(v=>v*n);
  const norm=p=>p[0]*p[0]+p[1]*p[1];
  const triples=[[3,4,5],[4,3,5],[5,12,13]];
  for(const id of ['a-midpoint','a-coordinate-centroid','section-internal','coordinate-nested-section'])pointVariant(id,'비대칭 배치에서 좌표 선택',m('P'),rng=>{
    const h=P(rng),d=[z(rng,3),z(rng,3)];
    let intro;
    if(id==='a-coordinate-centroid') {
      const a=addP(h,d),b=addP(h,[d[1],-2*d[0]]),c=mulP(h,3).map((v,i)=>v-a[i]-b[i]);
      intro=`삼각형의 세 꼭짓점은 ${m('A'+coord(a))}, ${m('B'+coord(b))}, ${m('C'+coord(c))}이고 무게중심을 ${m('P')}라 한다.`;
    }else if(id==='coordinate-nested-section'){
      const a=addP(h,mulP(d,-2)),b=addP(h,mulP(d,4));
      intro=`두 점 ${m('A'+coord(a))}, ${m('B'+coord(b))}가 있다. 선분 ${m('AB')}를 ${m('1:2')}로 내분하는 점을 ${m('M')}이라 하고 선분 ${m('MB')}의 중점을 ${m('P')}라 한다.`;
      // M=h, MB의 중점=h+2d가 되도록 결과를 구성한다.
      const p=addP(h,mulP(d,2));return problem(intro,[],'점의 좌표를 구하시오.',point(p),[`내분점은 ${m('M'+coord(h))}이고, 두 점의 중점은 ${m(coord(p))}이다.`]);
    }else {
      const u=id==='a-midpoint'?1:int(rng,1,4),v=id==='a-midpoint'?1:int(rng,1,4),a=addP(h,mulP(d,-u)),b=addP(h,mulP(d,v));
      intro=`두 점 ${m('A'+coord(a))}, ${m('B'+coord(b))}가 있다. 선분 ${m('AB')}를 ${m(`${u}:${v}`)}로 내분하는 점을 ${m('P')}라 한다.`;
    }
    return problem(intro,[],'점의 좌표를 구하시오.',point(h),[`주어진 비를 두 좌표에 적용하면 ${m('P'+coord(h))}이다.`]);
  });
  pointVariant('axis-equidistance','축과 두 점의 위치 교환',m('P'),rng=>{
    const axis=int(rng,0,1),t=z(rng),d=int(rng),h=int(rng),p=axis?[0,t]:[t,0];
    const a=addP(p,[d,h]),b=addP(p,[d,-h]);
    // 축과 수직한 방향으로 대칭인 두 점의 수직이등분선은 지정 축에서 한 번 만난다.
    if(!axis){a[0]=t+d;a[1]=h;b[0]=t-d;b[1]=h;}else{a[0]=h;a[1]=t+d;b[0]=h;b[1]=t-d;}
    return problem(`두 점 ${m('A'+coord(a))}, ${m('B'+coord(b))}에서 같은 거리에 있는 점 ${m('P')}가 ${axis?'y':'x'}축 위에 있다.`,[],'점의 좌표를 구하시오.',point(p),[`두 거리의 제곱을 같게 놓고 축 위의 좌표 조건을 대입하면 ${m(coord(p))}를 얻는다.`]);
  });
  pointVariant('coordinate-distance-coordinate','좌우 또는 위아래 위치와 거리',m('B'),rng=>{
    const a=P(rng),[u,v,d]=pick(rng,triples),sx=pick(rng,[-1,1]),sy=pick(rng,[-1,1]),b=addP(a,[sx*u,sy*v]),known=rng()<.5;
    return problem(`점 ${m('A'+coord(a))}와 점 ${m('B')} 사이의 거리는 ${m(d)}이다. 점 ${m('B')}의 ${known?'x':'y'}좌표는 ${m(b[known?0:1])}이고 점 ${m('A')}보다 ${known?(sy>0?'위':'아래'):(sx>0?'오른쪽':'왼쪽')}에 있다.`,[],'점의 좌표를 구하시오.',point(b),[`거리의 제곱을 이용하면 나머지 좌표의 차의 절댓값을 구할 수 있다. 위치 조건을 적용하면 ${m(coord(b))}이다.`]);
  });
  const linePairPaths=['coordinates','a','b','sum'].map(id=>({id,label:id,outputType:id==='coordinates'?'Point':'Scalar',transform:data=>{
    const [a,b]=data.answer.value;return {...data,question:id==='coordinates'?`${m('(a,b)')}를 순서대로 구하시오.`:id==='sum'?`${m('a+b')}를 구하시오.`:`${m(id)}를 구하시오.`,answer:id==='coordinates'?point([a,b]):scalar(id==='sum'?a+b:id==='a'?a:b),answerLabels:id==='coordinates'?['a','b']:undefined};
  }}));
  for(const id of ['parallel-line','perpendicular-line','line-through-intersection','line-intercepts-rebuild','line-perpendicular-bisector'])append(id,'직선의 계수와 값','point',rng=>{
    const a=pick(rng,[-3,-2,-1,1,2,3]),b=id==='line-intercepts-rebuild'?a*z(rng):z(rng),h=P(rng),passing=[h[0],a*h[0]+b];
    let intro;
    if(id==='parallel-line')intro=`직선 ${m(`y=ax+b`)}는 직선 ${m(`y=${line(a,b+int(rng))}`)}과 평행하고 점 ${m(coord(passing))}를 지난다.`;
    else if(id==='perpendicular-line')intro=`직선 ${m('y=ax+b')}는 직선 ${m(tex`x+${a}y=${z(rng)}`)}에 수직이고 점 ${m(coord(passing))}를 지난다.`;
    else if(id==='line-perpendicular-bisector'){
      const d=[a,-1],A=addP(passing,d),B=addP(passing,mulP(d,-1));
      intro=`두 점 ${m('A'+coord(A))}, ${m('B'+coord(B))}의 수직이등분선이 ${m('y=ax+b')}이다.`;
    }else if(id==='line-intercepts-rebuild'){
        return problem(`직선 ${m('y=ax+b')}의 x절편은 ${m(-b/a)}, y절편은 ${m(b)}이다.`,[],`${m('(a,b)')}를 구하시오.`,point([a,b]),[`두 점의 좌표를 대입하면 ${m(`a=${a},b=${b}`)}이다.`]);
    }else{
            intro=`두 직선 ${m(`x+y=${passing[0]+passing[1]}`)}, ${m(`x-y=${passing[0]-passing[1]}`)}의 교점을 지나는 직선 ${m('y=ax+b')}는 직선 ${m(`y=${line(a,b+1)}`)}과 평행하다.`;
    }
    return problem(intro,[],`${m('(a,b)')}를 구하시오.`,point([a,b]),[`조건에서 기울기는 ${m(a)}이다. 지나는 점을 대입하면 ${m(`b=${b}`)}이다.`]);
  },{answerPaths:linePairPaths});
  for(const id of ['line-intersection'])pointVariant(id,'교점을 먼저 구성한 일반형',m('P'),rng=>{
    const p=P(rng),a=int(rng),b=int(rng),c=int(rng),d=-a;
    return problem(`두 직선의 교점을 ${m('P')}라 한다.`,[tex`${a}x+${b}y=${a*p[0]+b*p[1]}`,tex`${c}x+${d}y=${c*p[0]+d*p[1]}`],'교점의 좌표를 구하시오.',point(p),[`두 식을 연립하면 ${m(coord(p))}이다.`]);
  });
  const circleRoutes=[
    {id:'center',label:'중심',outputType:'Point',transform:d=>({...d,question:'원의 중심 좌표를 구하시오.',answer:point(d.circle.center)})},
    ...['x','y'].map((v,i)=>({id:'center-'+v,label:v+'좌표',outputType:'Scalar',transform:d=>({...d,question:'원 중심의 '+m(v)+'좌표를 구하시오.',answer:scalar(d.circle.center[i])})})),
    ...[['radius',1],['diameter',2],['radiusSquared',0]].map(([id,k])=>({id,label:id,outputType:'Scalar',transform:d=>({...d,question:id==='radius'?'원의 반지름을 구하시오.':id==='diameter'?'원의 지름의 길이를 구하시오.':'원의 반지름의 제곱을 구하시오.',answer:scalar(k?d.circle.radius*k:d.circle.radius**2)})})),
  ];
  for(const id of ['circle-general','circle-diameter','circle-three-points','circle-center-on-axis'])append(id,'원의 중심과 크기 경로','point',rng=>{
    const h=P(rng),r=int(rng,2,8),[x,y]=h;let intro,expressions=[];
    if(id==='circle-general'){intro='다음 방정식이 나타내는 원을 생각하자.';expressions=[tex`x^2+y^2${-2*x<0?'':'+'}${-2*x}x${-2*y<0?'':'+'}${-2*y}y${x*x+y*y-r*r<0?'':'+'}${x*x+y*y-r*r}=0`];}
    else if(id==='circle-diameter')intro=`두 점 ${m('A'+coord([x-r,y]))}, ${m('B'+coord([x+r,y]))}를 지름의 양 끝점으로 하는 원이 있다.`;
    else if(id==='circle-center-on-axis'){
      h[1]=0;
      // 축 위 중심을 강제하되 서로 다른 두 원 위 점으로 원을 결정한다.
      intro=`중심이 x축 위에 있고 두 점 ${m(coord([x+r,0]))}, ${m(coord([x,r]))}를 지나는 원이 있다.`;
    }else if(id==='circle-radius-from-point')intro=`중심이 ${m('C'+coord(h))}이고 점 ${m('A'+coord([x+r,y]))}를 지나는 원이 있다.`;
    else intro=`세 점 ${m(coord([x+r,y]))}, ${m(coord([x-r,y]))}, ${m(coord([x,y+r]))}를 지나는 원이 있다.`;
    const center=id==='circle-center-on-axis'?[x,0]:h;
    return {...problem(intro,expressions,'원의 중심 좌표를 구하시오.',point(center),[`원의 중심은 ${m(coord(center))}이고 반지름은 ${m(r)}이다.`]),circle:{center,radius:r}};
  },{answerPaths:circleRoutes});
  for(const id of ['translate-inverse-point','translate-circle-center','translation-reflection-order'])pointVariant(id,'이동의 순서와 목표 좌표',m('Q'),rng=>{
    const p=P(rng),d=P(rng),axis=pick(rng,['x','y','origin']),reflect=([x,y])=>axis==='x'?[x,-y]:axis==='y'?[-x,y]:[-x,-y],reverse=rng()<.5;
    let q,intro;
    if(id==='translate-inverse-point'){
      q=p;intro=`점 ${m('Q')}를 x축 방향으로 ${m(d[0])}, y축 방향으로 ${m(d[1])}만큼 평행이동하면 점 ${m('P'+coord(addP(p,d)))}가 된다.`;
    }else if(id==='translate-circle-center'){
      q=addP(p,d);intro=`원 ${m(`${square('x',p[0])}+${square('y',p[1])}=${int(rng)**2}`)}를 x축 방향으로 ${m(d[0])}, y축 방향으로 ${m(d[1])}만큼 평행이동한 원의 중심을 ${m('Q')}라 한다.`;
    }else{
      const name=axis==='origin'?'원점':axis+'축';q=reverse?addP(reflect(p),d):reflect(addP(p,d));
      intro=`점 ${m('P'+coord(p))}를 ${reverse?`${name}에 대하여 대칭이동한 후`:`x축 방향으로 ${m(d[0])}, y축 방향으로 ${m(d[1])}만큼 평행이동한 후`} ${reverse?`x축 방향으로 ${m(d[0])}, y축 방향으로 ${m(d[1])}만큼 평행이동`:`${name}에 대하여 대칭이동`}한 점을 ${m('Q')}라 한다.`;
    }
    return problem(intro,[],'좌표를 구하시오.',point(q),[`주어진 순서와 방향에 따라 각 좌표를 계산하면 ${m(coord(q))}이다.`]);
  });
  // 함수의 결과를 함수값, 계수, 역상, 좌표로 나누어 질문한다.
  for(const id of ['function-affine-from-pairs','function-composition-recover-rule','function-identity-composition'])append(id,'함수 결정 후 여러 결과','point',rng=>{
    const a=pick(rng,[-3,-2,-1,1,2,3]),b=z(rng),u=z(rng),v=u+int(rng),inner=int(rng),offset=z(rng);
    let intro,expressions;
    if(id==='function-affine-from-pairs'){intro=`함수 ${m('f(x)=ax+b')}가 다음을 만족한다.`;expressions=[tex`f(${u})=${a*u+b},\\quad f(${v})=${a*v+b}`];}
    else if(id==='function-composition-recover-rule'){intro=`함수 ${m('g(x)=ax+b')}와 함수 ${m(`f(x)=${line(inner,offset)}`)}가 다음을 만족한다.`;expressions=[tex`(g\\circ f)(x)=${line(a*inner,a*offset+b)}`];}
    else {
      intro=`두 함수 ${m('f(x)=ax+b')}, ${m(tex`g(x)=\\frac{${shift('x',b)}}{${a}}`)}에 대하여 다음이 성립한다.`;expressions=[tex`(f\\circ g)(x)=x`];
    }
    return problem(intro,expressions,`${m('(a,b)')}를 구하시오.`,point([a,b]),[`주어진 조건의 계수를 비교하면 ${m(`a=${a},b=${b}`)}이다.`]);
  },{answerPaths:linePairPaths});
  for(const id of ['function-image-restricted','function-identify-image-preimage','function-composition-table-preimage','function-composition-finite-domain','function-inverse-range'])setVariant(id,'불규칙한 정의역과 대응 표현',rng=>{
    const w=world(rng),xs=w.U.length>10?w.U.filter((_,i)=>i%2===0):w.U, h=z(rng),b=z(rng),a=pick(rng,[-2,-1,1,2]);
    let intro,expressions=[],question,values;
    if(id==='function-image-restricted'){
      values=unique(xs.map(x=>(x-h)**2+b));intro=`정의역은 ${m('X='+finite(xs))}이다.`;expressions=[`f(x)=${plus(square('x',h),b)}`];question='치역을 구하시오.';
    }else if(id==='function-identify-image-preimage'){
      const t=pick(rng,xs),target=(t-h)**2+b;values=xs.filter(x=>(x-h)**2+b===target);intro=`함수의 정의역은 ${m(finite(xs))}이다.`;expressions=[`f(x)=${plus(square('x',h),b)}`];question=`함수값이 ${m(target)}가 되는 모든 입력을 집합으로 쓰시오.`;
    }else if(id==='function-inverse-range'){
      values=xs;intro=`정의역이 ${m(finite(xs))}인 일대일함수 ${m(`f(x)=${line(a,b)}`)}가 자신의 치역을 공역으로 갖는다.`;question=`${m('f^{-1}')}의 치역을 구하시오.`;
    }else{
      const ys=xs.map(x=>a*x+b),target=pick(rng,ys),f=tex`f:${xs.map((x,i)=>`${x}\\mapsto${ys[i]}`).join(',\\quad ')}`;
      if(id==='function-composition-finite-domain'){
        const allowed=ys.filter((_,i)=>i%2===0);values=xs.filter(x=>allowed.includes(a*x+b));intro=`함수 ${m('f')}의 대응은 다음과 같다. 함수 ${m('g')}의 정의역은 ${m(finite(allowed))}이다.`;expressions=[f];question=`${m(tex`g\\circ f`)}의 정의역을 구하시오.`;
      }else{
        values=xs.filter((_,i)=>i%2===ys.indexOf(target)%2);const selected=ys.indexOf(target),allowed=ys.filter((_,i)=>i%2===selected%2);
        intro='두 함수의 대응이 다음과 같다.';expressions=[f,tex`g:${ys.map(y=>`${y}\\mapsto${allowed.includes(y)?1:0}`).join(',\\quad ')}`];question=`${m(tex`(g\\circ f)(x)=1`)}인 입력을 모두 모아 집합으로 쓰시오.`;
      }
    }
    return problem(intro,expressions,question,set(values),[`정의역의 원소에서 조건을 확인하면 해당 집합은 ${set(values).text}이다.`]);
  },true);
  pointVariant('function-inverse-fixed','함수와 역함수의 대각선 교점',m('P'),rng=>{
    const t=z(rng),a=pick(rng,[-3,-2,2,3]),b=(1-a)*t;
    return problem(`함수 ${m(`f(x)=${line(a,b)}`)}의 그래프와 그 역함수의 그래프가 직선 ${m('y=x')} 위에서 만나는 점을 ${m('P')}라 한다.`,[],'점의 좌표를 구하시오.',point([t,t]),[`직선 위에서는 두 좌표가 같다. ${m('f(x)=x')}를 풀면 ${m(`x=${t}`)}이므로 ${m(coord([t,t]))}이다.`]);
  });
  const frac=(n,d)=>tex`\\frac{${n}}{${d}}`;
  const rational=(a,h,k)=>plus(frac(a,shift('x',h)),k);
  const radical=(a,h,k)=>plus(tex`\\sqrt{${line(a,-a*h)}}`,k);
  for(const id of ['rational-horizontal-intersection','rational-x-intercept','radical-root-zero','radical-line-extraneous'])pointVariant(id,'교점의 전체 좌표와 투영',m('P'),rng=>{
    let intro,expressions,p;
    if(id==='rational-horizontal-intersection'||id==='rational-x-intercept'){
      const h=z(rng),dx=int(rng),dy=pick(rng,[-3,-2,-1,1,2,3]),a=dx*dy,k=id==='rational-x-intercept'?-dy:z(rng),y=k+dy;
      p=[h+dx,y];intro=`유리함수 ${m(`y=${rational(a,h,k)}`)}의 그래프와 ${id==='rational-x-intercept'?'x축':`직선 ${m(`y=${y}`)}`}의 교점을 ${m('P')}라 한다.`;expressions=[];
    }else{
      const h=z(rng),s=int(rng,1,4),a=pick(rng,[-2,-1,1,2]),k=id==='radical-root-zero'?-Math.abs(a)*s:z(rng),x=h+a*s*s,y=Math.abs(a)*s+k;p=[x,y];
      if(id==='radical-line-extraneous'){
        // 기울기의 부호를 근호 계수와 반대로 정해 교점이 유일하게 되도록 구성한다.
        const slope=-Math.sign(a),intercept=y-slope*x;
        intro=`두 그래프 ${m(`y=${radical(a,h,k)}`)}, ${m(`y=${line(slope,intercept)}`)}의 교점을 ${m('P')}라 한다.`;
      }else intro=`무리함수 ${m(`y=${radical(a,h,k)}`)}의 그래프와 x축의 교점을 ${m('P')}라 한다.`;
      expressions=[];
    }
    return problem(intro,expressions,'교점의 좌표를 구하시오.',point(p),[`두 함수값을 같게 놓고 정의 조건을 확인하면 ${m(coord(p))}이다.`]);
  });
  for(const id of ['rational-translate','radical-translate-endpoint','radical-point-parameter','radical-two-values','rational-two-points'])append(id,'매개변수 전체와 개별 값','point',rng=>{
    const a=int(rng,1,4),b=z(rng),h=z(rng),k=z(rng),u=int(rng,1,3),v=u+int(rng,1,3);let intro,expressions,value;
    if(id==='rational-translate'){
      value=[a,b];intro=`함수 ${m(`y=${rational(2,h,k)}`)}의 그래프를 x축 방향으로 ${m('a')}, y축 방향으로 ${m('b')}만큼 평행이동한 그래프가 다음과 같다.`;expressions=[`y=${rational(2,h+a,k+b)}`];
    }else if(id==='radical-translate-endpoint'){
      value=[a,b];intro=`함수 ${m(`y=${radical(2,h,k)}`)}의 그래프를 x축 방향으로 ${m('a')}, y축 방향으로 ${m('b')}만큼 평행이동한 그래프의 시작점이 ${m(coord([h+a,k+b]))}이다.`;expressions=[];
    }else if(id==='rational-two-points'){
      value=[a,b];intro=`유리함수 ${m(`f(x)=${frac('a',shift('x',h))}+b`)}가 다음을 만족한다.`;expressions=[tex`f(${h+1})=${a+b},\\quad f(${h-1})=${-a+b}`];
    }else {
      // 서로 다른 두 제곱근 값으로 일차식의 두 계수를 결정한다.
      value=[a,b];intro=`함수 ${m(tex`f(x)=\\sqrt{ax+b}`)}가 다음을 만족한다.`;expressions=[tex`f(${a*u*u-b})=${a*u},\\quad f(${a*v*v-b})=${a*v}`];
      // 계수를 a의 배수로 두어 모든 입력과 계수를 정수로 유지한다.
      value=[a,a*b];expressions=id==='radical-point-parameter'?[tex`f(${a*u*u-b})=${a*u}`]:[tex`f(${a*u*u-b})=${a*u},\\quad f(${a*v*v-b})=${a*v}`];
      if(id==='radical-point-parameter')intro=`함수 ${m(tex`f(x)=\\sqrt{ax+b}`)}의 그래프의 시작점이 ${m(coord([-b,0]))}이고 다음을 만족한다.`;
    }
    return problem(intro,expressions,`${m('(a,b)')}를 순서대로 구하시오.`,point(value),[`주어진 두 조건을 정리하면 ${m(`a=${value[0]},b=${value[1]}`)}이다.`]);
  },{answerPaths:linePairPaths});

  const knownKinds={"choice":["truth-and-sets::main","and-or::main","syllogism-inference::branches","syllogism-inference::compound-contrapositive","suff-necessary-sets::main","contradiction-proof::main","real-properties-proof::main","a-set-membership::main","a-set-subset::main","set-demorgan::set-demorgan:main","set-demorgan::complement-of-difference:main","a-classification::main","a-negation::main","a-counterexample::main","a-implication::main","statement-meaning::main","negation::connectives","negation::bounds","truth-value::main","counterexample::main","syllogism::logical-bridge","syllogism::contrapositive-bridge","suff-necessary::main","quantifiers::quantifiers:negate-universal","quantifiers::quantifiers:test-existence","quantifiers::proposition-quantifier-intersection:main","suff-necessary-truth::main","contrapositive-proof::main","a-square-positive::main","a-cauchy::main","a-proposition-antecedent::main","a-proposition-implication-converse::main","a-proposition-compare-squares::main","proposition-converse-and-contrapositive::main","proposition-quantifier-intersection::main","quadratic-always-sign::main","complement-of-difference::main","a-circle-point-on::main","a-circle-equation::main","transform-identify-reflection::main","function-equal-domain::function-equal-domain:main","function-equal-domain::function-same-values-different-rule:main","function-injective-quadratic::main","function-bijection-missing::function-codomain-bijection:main","a-rational-simplify::main","rational-center-general::rational-line-domain-range:main","rational-relative-branches::main","rational-inverse-value::rational-match-inverse-rule:main","rational-match-graph::main","rational-line-domain-range::main","a-radical-simplify::main","radical-root-zero::radical-no-intercept:main","radical-no-intercept::main","radical-inverse-value::radical-inverse-graph-match:main","radical-match-graph::main","a-coordinate-quadrant::main","a-coordinate-axis-condition::main","a-line-slope-intercept::main","a-line-parallel-test::main","line-three-relations::main","line-point-half-plane::main","a-circle-origin-membership::main","a-transform-fixed-point::main","a-transform-general-axis::main","a-function-identity-constant::main","a-function-injection-from-table::main","a-function-recover-inverse-input::main","function-same-values-different-rule::main","function-codomain-bijection::main","a-rational-add-like-fractions::main","a-rational-shift-horizontal::main","a-rational-reciprocal-sign::main","rational-match-inverse-rule::main","a-radical-extract-square::main","a-radical-rationalize::main","a-radical-x-direction::main","radical-inverse-graph-match::main"],"scalar":["contrapositive-parameter::main","suff-necessary-parameter::main","set-operations-iff::main","absolute-inequality::main","absolute-value-inequality::bound","amgm-product::main","amgm-geometry::area","amgm-geometry::perimeter","cauchy-linear::maximum","cauchy-linear::minimum","cauchy-square::minimum","cauchy-square::maximum","cauchy-geometry::near","cauchy-geometry::far","set-cardinality::set-cardinality:main","set-cardinality::set-application-neither:main","set-cardinality::venn-complement-count:main","set-subset-count::main","set-range-parameter::main","true-parameter::main","a-amgm::main","amgm-sum::shift-domain","amgm-fixed::weighted","a-set-cardinality-list::main","set-application-neither::main","distance-use::given-minimum","a-point-distance::main","a-slope::main","a-point-on-line::main","a-point-line-distance::main","section-internal::section-internal:main","section-internal::section-ratio:main","section-internal::coordinate-directed-number-line:main","section-external::main","section-ratio::main","axis-equidistance::main","parallel-line::parallel-line:main","parallel-line::line-parameter-parallel:main","perpendicular-line::perpendicular-line:main","perpendicular-line::line-unknown-slope-two-points:main","concurrent-lines::main","line-through-intersection::main","distance-line-parameter::main","parallel-lines-distance::main","circle-general::circle-origin-constant:main","circle-line-position::main","circle-tangent-point::main","circle-tangent-parallel::main","product-coefficient::main","identity-two-coefficients::main","quotient-linear::main","division-rebuild::main","factor-parameter::main","two-factors-parameters::main","quartic-even-factorization::main","reciprocal-cube::main","power-remainder::main","composed-remainder::main","cube-sum-identity::main","remainder-algebra::main","known-root-cubic::main","double-root-parameter::main","real-roots-parameter::main","positive-roots-parameter::main","opposite-roots-parameter::main","shifted-roots::main","root-square-sum::main","axis-equal-values::main","quadratic-restricted-min::main","quadratic-restricted-max::main","quadratic-from-solution::main","venn-complement-count::main","symmetric-difference::main","three-set-inclusion::main","exactly-two-of-three::main","complement-intersection-count::main","power-set-union-difference::main","subsets-fixed-size::main","subsets-intersection::main","nested-subsets::main","equality-unordered-set::main","set-divisibility-count::main","weighted-absolute-min::main","abs-maximum-bounded::main","amgm-three-sum::main","amgm-three-product::main","cauchy-reciprocals::main","cauchy-equality-coordinate::main","degree-after-cancellation::main","two-point-product-remainder::main","translated-polynomial-factor::main","root-gap::main","quadratic-vertex-point::main","intersection-bound::main","disjoint-sets-parameter::main","amgm-cyclic-ratios::main","a-number-line-distance::main","coordinate-distance-coordinate::main","coordinate-directed-number-line::main","coordinate-section-distance::main","coordinate-triangle-perimeter::main","coordinate-centroid-median::main","coordinate-square-diagonal::main","coordinate-right-vertex::main","line-parameter-parallel::main","line-parameter-vertical::main","line-intercepts-area::line-intercepts-area:main","line-intercepts-area::line-intercept-area-parameter:main","line-intercepts-rebuild::main","line-parallel-bisector::main","line-distance-on-axis::main","line-perpendicular-bisector::main","circle-radius-from-point::main","circle-origin-constant::main","circle-horizontal-chord::circle-horizontal-chord:main","circle-horizontal-chord::circle-oblique-chord:main","circle-horizontal-chord::circle-axis-intersection:main","circle-axis-intersection::main","circle-axis-tangency::main","circle-tangency-radius::circle-tangency-radius:main","circle-tangency-radius::circle-tangent-center-position:main","circle-nearest-axis::main","translate-line-intercept::main","translate-circle-tangency::main","reflect-line-axis::reflect-line-axis:main","reflect-line-axis::reflect-line-diagonal:main","reflect-line-diagonal::main","translation-reflection-order::main","transform-fixed-axis::main","transform-isometry::main","a-function-value::main","a-function-compose::main","a-inverse-pair::main","function-valid-relation::main","function-bijection-missing::function-bijection-missing:main","function-affine-from-pairs::main","function-identity-composition::main","function-composition-order::main","function-composition-coefficient::main","function-composition-parameter::main","function-inverse-affine::main","function-inverse-restricted::main","function-inverse-composition::main","function-inverse-fixed::main","function-context-composition::main","a-rational-domain::main","a-rational-range::main","a-rational-value::main","a-rational-asymptotes::main","rational-numerator-parameter::main","rational-coefficient-through-point::main","rational-x-intercept::main","rational-y-intercept-parameter::main","rational-horizontal-intersection::main","rational-cancel-domain::rational-cancel-domain:main","rational-inverse-value::rational-inverse-value:main","rational-two-points::main","a-radical-value::main","radical-parameter-domain::main","radical-point-parameter::main","radical-two-values::main","radical-root-zero::radical-root-zero:main","radical-inverse-value::radical-inverse-value:main","radical-line-extraneous::radical-line-extraneous:main","radical-line-extraneous::radical-line-two-intersections:main","radical-context-threshold::main","a-coordinate-distance-axis::main","a-coordinate-midpoint-number::main","coordinate-axis-section-ratio::main","coordinate-parallel-midsegments::main","coordinate-triangle-horizontal-area::main","coordinate-rectangle-two-sides::main","coordinate-two-travel-legs::main","coordinate-missing-collinear::main","a-line-intercept-from-equation::main","a-line-perpendicular-slope::main","a-line-from-point-slope::main","line-two-slopes-area::main","line-intercept-area-parameter::main","line-two-distance-axes::main","line-perpendicular-distance-area::main","line-unknown-slope-two-points::main","a-circle-radius-distance::main","a-circle-axis-distance::main","a-circle-expanded-linear::main","circle-nonzero-radius-parameter::main","circle-oblique-chord::main","circle-area-annulus::main","circle-inscribed-square-area::main","circle-both-axis-chords::main","circle-tangent-center-position::main","circle-tangent-two-intercepts::main","a-transform-shift-circle-equation::main","transform-shift-line-through-point::main","transform-circle-radius-after-two::main","transform-diagonal-and-axis::main","transform-matching-images::main","transform-two-parallel-line-distance::main","transform-moved-circle-chord::main","a-function-read-codomain::main","a-function-read-missing-output::main","function-composition-equality::main","function-composition-recover-rule::main","function-inverse-fixed-composition::main","function-linear-injection-parameter::main","a-rational-substitute-zero::main","rational-missing-input-from-value-ratio::main","rational-reflection-x-axis::main","rational-context-fixed-cost::main","rational-composition-affine-domain::main","a-radical-like-terms::main","a-radical-boundary-value::main","radical-conjugate-coefficient::main","radical-y-intercept-parameter::main","radical-line-two-intersections::main","remainder-eval::evaluate","remainder-eval::linear","remainder-eval::intercept","intersection-sum::sum","intersection-sum::positiveY","intersection-sum::distance","inequality-compare::integerCount"],"interval":["absolute-value-inequality::equality","quadratic-system::main","quadratic-union::main","reverse-triangle-equality::main","rational-restricted-range::main","a-radical-domain::main","a-radical-range::main","radical-reflection-graph::main","radical-restricted-range::main","radical-inverse-value::radical-inverse-domain:main","radical-inverse-domain::main","radical-two-root-domain::main","rational-interval-signed-output::main","radical-denominator-open-boundary::main","radical-inequality-output::main","radical-graph-reflection-range::main","radical-affine-compose-domain::main","inequality-compare::compare"],"set":["a-set-operation::main","a-set-complement::main","set-expressions::main","a-truth-set::main","truth-set::main","a-set-empty::main","a-set-builder-multiples::main","a-set-direct-difference::main","set-complement-inclusion-missing::main","recover-a-set::main","a-finite-domain::main","a-finite-image::main","function-image-restricted::main","function-composition-finite-domain::main","function-inverse-range::main","rational-cancel-domain::rational-sum-forbidden-input:main","function-identify-image-preimage::main","function-composition-table-preimage::main","a-rational-denominator-product::main","rational-two-intersections::main","rational-sum-forbidden-input::main"],"point":["distance-use::free-squares","distance-use::line-squares","distance-use::three-distances","distance-use::reflect-distances","a-midpoint::main","section-internal::coordinate-section-inverse:main","midpoint-inverse::main","centroid-inverse::main","distance-locus::main","line-intersection::main","line-projection::main","line-reflection::main","circle-three-points::main","a-coordinate-section::main","coordinate-section-inverse::main","coordinate-nested-section::main","a-horizontal-vertical::main","circle-center-on-axis::main","a-translate-point::main","a-reflect-point-axis::main","a-reflect-origin::main","a-reflect-diagonal::main","translate-inverse-point::translate-inverse-point:main","translate-inverse-point::translate-two-stages:main","translate-two-stages::main","translate-circle-center::main","translate-parabola-vertex::main","reflect-two-axes::main","reflect-circle::main","transform-intersection::main","a-rational-graph::main","rational-center-general::rational-center-general:main","rational-translate::main","rational-center-symmetry::main","a-radical-endpoint::main","a-radical-graph::main","radical-translate-endpoint::main","radical-two-graphs-intersection::main","a-coordinate-centroid::main","coordinate-parallelogram-fourth::main","a-transform-only-one-axis::main","transform-reflected-parabola-vertex::main"]};
  // 기존 템플릿의 출력 capability를 선언한다. 런타임에서 결과를 보고 질문을 고르지 않는다.
  const pointSubjects={
    'a-midpoint':'선분의 중점','a-coordinate-centroid':'삼각형의 무게중심',
    'distance-locus':'자취가 이루는 원의 중심','line-reflection':'대칭이동한 점',
    'a-coordinate-section':'내분점','a-horizontal-vertical':'구하는 점',
    'a-translate-point':'이동한 점','a-reflect-point-axis':'대칭이동한 점',
    'a-reflect-origin':'대칭이동한 점','a-reflect-diagonal':'대칭이동한 점',
    'a-rational-graph':'두 점근선의 교점','a-radical-endpoint':'그래프의 시작점','a-radical-graph':'그래프의 시작점',
    'a-transform-only-one-axis':'이동한 점',
  };
  const intervalPaths=[{id:'range',label:'실수 범위',outputType:'IntervalSet',passthrough:true},
    ...[[-10,10],[1,20]].map(([lo,hi])=>({id:`integer-count-${lo}-${hi}`,label:'정수의 개수',outputType:'Scalar',requirements:['integer-window'],transform:data=>{
      const intervals=data.answer.value;
      const values=Array.from({length:hi-lo+1},(_,i)=>lo+i).filter(x=>intervals.some(t=>(t.start===null||x>t.start||(t.startClosed&&x===t.start))&&(t.end===null||x<t.end||(t.endClosed&&x===t.end))));
      const question=data.question.replace(/[을를] (?:(?:구간(?:의 합집합)?|부등식)으로 (?:나타내시오|쓰시오)|구하시오)\.?$/,`에 속하는 ${m(`${lo}\\le x\\le${hi}`)}인 정수의 개수를 구하시오.`);
      return {...data,question,answer:scalar(values.length),solution:[...data.solution,`주어진 범위 안의 정수는 ${set(values).text}이므로 ${m(values.length)}개이다.`]};
    }}))];
  const nonemptySets=new Set(['a-finite-domain','a-finite-image','function-image-restricted','function-inverse-range','function-identify-image-preimage','function-composition-table-preimage','a-rational-denominator-product','rational-two-intersections','recover-a-set']);
  for(const [kind,keys] of Object.entries(knownKinds))for(const key of keys){
    const [id,variantId]=key.split('::'),v=types[id]?.variants.find(v=>v.id===variantId);
    if(!v)continue;
    v.answerKind??=kind;
    if(kind==='set'&&!v.answerPaths)v.answerPaths=setPaths(nonemptySets.has(id));
    if(kind==='interval'&&!v.answerPaths&&id!=='inequality-compare')v.answerPaths=intervalPaths;
    if(kind==='point'&&!v.answerPaths&&pointSubjects[id])v.answerPaths=pointPaths(pointSubjects[id]);
  }
  for(const id of ['truth-value','a-proposition-compare-squares'])for(const v of types[id].variants)v.answerKind='boolean';
  ForgeVariations = globalThis.ForgeVariations = Object.freeze({present,setPaths,pointPaths});
})();


;

/* more-variations.js */
(() => {
  "use strict";
  const {types,add,alternative,problem,m,tex,rand,pick,signed,scalar,point,set,choice,coord,shift,term,par,sq}=ForgeTopics;
  const integer=(r,lo=2,hi=7)=>rand(r,lo,hi);
  const sum=(variable,n)=>shift(variable,-n);
  const form=(id,label,answerKind,build)=>({...alternative(id,label,build),answerKind});
  function variant(id,label,kind,build,design={}) {
    types[id].variants.push({...form("expanded-"+id+"-application",label,kind,build),...design});
  }
  function pointDesign(subject) {
    return {resultType:ForgeAnswerPaths.pointType,subject,answerPaths:[...ForgeAnswerPaths.pointPaths,...ForgeAnswerPaths.pointLinearPaths(subject)]};
  }
  function basic(id,unit,label,build) {
    add(id,unit,label,"A",[form("direct",label,"scalar",build)]);
  }
  const ask=value=>m(value)+"의 값을 구하시오.";
  const namedPoint=(name,p)=>m(name+coord(p));
  const oneOf=["x","y","t"];
  function rootProduct(x,p,q) {
    return "(" + shift(x,p) + ")(" + shift(x,q) + ")";
  }

  basic("a-poly-add","polynomials","다항식의 덧셈과 뺄셈에서 계수 구하기",r=>{
    const x=pick(r,oneOf), a=signed(r), b=signed(r), c=signed(r), d=signed(r), minus=r()<.5;
    return problem("",[`A=${sum(term(a,x+"^2"),b)},\\quad B=${sum(term(c,x+"^2"),d)}`],
      `${m(minus?"A-B":"A+B")}의 ${m(x+"^2")}의 계수를 구하시오.`,scalar(a+(minus?-c:c)),
      [`같은 차수의 항을 모으면 계수는 ${m(a+(minus?"-":"+")+String(c).replace(/^-(.+)$/u,"(-$1)"))}이다.`]);
  });
  basic("a-poly-multiply","polynomials","두 일차식의 곱에서 일차항의 계수",r=>{
    const x=pick(r,oneOf), p=signed(r), q=signed(r);
    return problem("",[rootProduct(x,p,q)],`전개했을 때 ${m(x)}의 계수를 구하시오.`,scalar(-p-q),
      [`일차항은 한 인수의 일차항과 다른 인수의 상수항을 곱한 두 항의 합이다. 두 계수의 합은 ${m(-p-q)}이다.`]);
  });
  basic("a-poly-coefficient","polynomials","다항식의 차수와 최고차항 읽기",r=>{
    const x=pick(r,oneOf), n=integer(r,2,5), a=signed(r), b=signed(r), degree=r()<.5;
    return problem("",[term(a,`${x}^{${n}}`)+(b>0?"+":"")+term(b,x)],
      degree?"다항식의 차수를 구하시오.":"최고차항의 계수를 구하시오.",scalar(degree?n:a),
      [`최고차항은 ${m(term(a,`${x}^{${n}}`))}이다.`]);
  });
  basic("a-poly-factor","polynomials","완전제곱식의 인수에서 상수 구하기",r=>{
    const p=signed(r), x=pick(r,oneOf);
    return problem("",[`${sum(x+"^2"+(p>0?"+":"")+term(2*p,x),p*p)}=(${x}+a)^2`],
      ask("a"),scalar(p),[`전개한 일차항의 계수가 ${m(2*p)}이므로 ${m("a="+p)}이다.`]);
  });
  basic("a-discriminant","quadratics","이차방정식의 판별식 계산",r=>{
    const a=integer(r,1,4),b=signed(r),c=signed(r);
    const polynomial=term(a,"x^2")+(b>0?"+":"")+term(b,"x");
    return problem("",[sum(polynomial,c)+"=0"],"판별식의 값을 구하시오.",scalar(b*b-4*a*c),
      [`${m("b^2-4ac="+(b*b-4*a*c))}이다.`]);
  });
  basic("a-roots-sum","quadratics","이차방정식의 두 근의 합 또는 곱",r=>{
    const p=signed(r),q=p+integer(r,1,4),b=-p-q,c=p*q,product=r()<.5;
    return problem("",[sum("x^2"+(b===0?"":(b>0?"+":"")+term(b,"x")),c)+"=0"],
      `두 근의 ${product?"곱":"합"}을 구하시오.`,scalar(product?c:-b),
      [`최고차항의 계수가 ${m(1)}이므로 근의 합은 ${m(-b)}, 곱은 ${m(c)}이다.`]);
  });
  basic("a-quadratic-vertex","quadratics","이차함수의 꼭짓점과 최댓값·최솟값",r=>{
    const a=signed(r,3),h=signed(r),k=signed(r),axis=r()<.5;
    return problem("",["y="+sum(term(a,sq("x",h)),k)],axis?`꼭짓점의 ${m("x")}좌표를 구하시오.`:`함수의 ${a>0?"최솟값":"최댓값"}을 구하시오.`,scalar(axis?h:k),
      [`제곱항이 ${m(0)}인 ${m("x="+h)}에서 함숫값은 ${m(k)}이다.`]);
  });
  basic("a-quadratic-x-intercepts","quadratics","이차함수의 x축 교점",r=>{
    const p=signed(r),q=p+integer(r,1,4),left=r()<.5;
    return problem("",["y="+rootProduct("x",p,q)],
      `${m("x")}축과 만나는 두 점 중 ${left?"왼쪽":"오른쪽"} 교점의 ${m("x")}좌표를 구하시오.`,scalar(left?p:q),
      [`${m("y=0")}인 경우는 ${m("x="+p)}, ${m("x="+q)}이다.`]);
  });
  basic("a-complex-powers","quadratics","허수단위의 거듭제곱",r=>{
    const n=2*integer(r,2,9);
    return problem("",[],ask(`i^{${n}}`),scalar((-1)**(n/2)),[`${m("i^2=-1")}이므로 ${m(`i^{${n}}=(-1)^{${n/2}}`)}이다.`]);
  });
  basic("a-linear-system-bound","quadratics","연립일차부등식의 정수 해",r=>{
    const a=signed(r),n=integer(r,1,6),b=a+n;
    return problem("",[tex`x\ge ${a},\\qquad x<${b}`],"두 부등식을 모두 만족하는 정수의 개수를 구하시오.",scalar(n),
      [`가장 작은 정수는 ${m(a)}, 가장 큰 정수는 ${m(b-1)}이다.`]);
  });
  basic("a-absolute-linear","quadratics","절댓값을 포함한 일차부등식의 경계",r=>{
    const a=signed(r),b=integer(r);
    return problem("",[tex`|${shift("x",a)}|\le ${b}`],"부등식을 만족하는 실수의 최댓값을 구하시오.",scalar(a+b),
      [`절댓값 안의 식은 ${m(-b)} 이상 ${m(b)} 이하이므로 ${m("x="+(a+b))}가 가장 크다.`]);
  });

  variant("product-coefficient","중간 항이 없는 다항식의 곱에서 계수 역산","scalar",r=>{
    const p=signed(r),q=signed(r),u=signed(r);
    const target=p+u;
    return problem(`다음 두 다항식의 곱에서 ${m("x^2")}의 계수가 ${m(target)}이다.`,
      [tex`(${sum("x^2",p)})${"(x^2"+(q>0?"+":"")+term(q,"x")+"+a)"} `],
      ask("a"),scalar(u),[`곱의 이차항에 기여하는 항은 ${m("x^2")}와 상수항의 곱 두 가지다. 따라서 ${m("a"+(p>0?"+":"")+p+"="+(target))}이다.`]);
  });
  variant("root-gap","계수가 주어진 근 간격에서 상수 역산","scalar",r=>{
    const h=signed(r,4), d=integer(r,2,5), c=h*h-d*d;
    const b=-2*h;
    return problem(`다음 이차방정식의 큰 근에서 작은 근을 뺀 값이 ${m(2*d)}이다.`,
      ["x^2"+(b>0?"+":"")+term(b,"x")+"+k=0"],ask("k"),scalar(c),
      [`두 근의 평균은 ${m(h)}이므로 두 근은 ${m(h-d)}, ${m(h+d)}이다.`,`두 근의 곱이 상수항이므로 ${m("k="+c)}이다.`]);
  });
  variant("coordinate-missing-collinear","점의 위치 조건을 세 점의 거리로 결합","point",r=>{
    const p=[signed(r,4),signed(r,4)], delta=pick(r,[[3,4],[4,-3],[-3,4],[-4,-3]]);
    const b=p.map((x,i)=>x+delta[i]), t=integer(r,2,3), c=p.map((x,i)=>x+t*delta[i]);
    return problem(`${namedPoint("A",p)}, ${namedPoint("B",b)}와 점 ${m("C")}가 한 직선 위에 있다. ${m("B")}는 ${m("A")}와 ${m("C")} 사이에 있고 ${m("AC="+(5*t))}이다.`,
      [],`점 ${m("C")}의 좌표를 구하시오.`,point(c),[`${m("AB=5")}이므로 ${m("A")}에서 ${m("B")}까지의 좌표 변화에 ${m(t)}를 곱해 ${m("A")}의 좌표에 더한다.`]);
  },pointDesign(`점 ${m("C")}`));
  variant("line-two-distance-axes","평행한 두 직선에서 같은 거리에 있는 축 위의 점","point",r=>{
    const a=signed(r,3), b=integer(r,1,3), x=signed(r,4), d=integer(r,1,4);
    const middle=a*x;
    return problem("두 평행한 직선이 다음과 같다.",
      [tex`${term(a,"x")}+${term(b,"y")}=${middle-d},\\qquad ${term(a,"x")}+${term(b,"y")}=${middle+d}`],
      `두 직선까지의 거리가 같은 ${m("x")}축 위의 점의 좌표를 구하시오.`,point([x,0]),
      [`두 직선 사이의 가운데 직선의 우변은 ${m(middle)}이다.`,`${m("y=0")}을 대입하면 ${m("x="+x)}이다.`]);
  });

  function graphData(kind,value,labels,summary) {
    const [h,k,a]=value;
    return {kind:"graph",value,labels,text:summary,plot:{kind,h,k,a}};
  }
  variant("circle-general","일반형에서 원의 그래프 구성","graph",r=>{
    const h=signed(r,3),k=signed(r,3),radius=integer(r,1,3);
    const expression=sum("x^2+y^2"+(-2*h>0?"+":"")+term(-2*h,"x")+(-2*k>0?"+":"")+term(-2*k,"y"),h*h+k*k-radius*radius);
    return problem("",[expression+"=0"],"원의 그래프를 완성할 수 있도록 중심의 두 좌표와 반지름을 입력하시오.",
      graphData("circle",[h,k,radius],["중심의 x좌표","중심의 y좌표","반지름"],`중심 ${m(coord([h,k]))}, 반지름 ${m(radius)}`),
      [`완전제곱식으로 바꾸면 ${m(`${sq("x",h)}+${sq("y",k)}=${radius*radius}`)}이다.`]);
  });
  variant("rational-center-general","분수식에서 점근선과 기준점 복원","graph",r=>{
    const h=signed(r,3),k=signed(r,3),a=signed(r,4);
    return problem("",[tex`y=\frac{${sum(term(k,"x"),a-h*k)}}{${shift("x",h)}}`],
      `그래프를 완성할 수 있도록 수직·수평 점근선의 값과 ${m("y=\\frac{a}{x-h}+k")}에서 분자 ${m("a")}를 입력하시오.`,
      graphData("rational",[h,k,a],["수직 점근선의 x좌표","수평 점근선의 y좌표","분자 a"],`점근선 ${m("x="+h)}, ${m("y="+k)}, 분자 ${m(a)}`),
      [`분자를 ${m("k(x-h)+a")}의 꼴로 쓰면 ${m(tex`y=\frac{${a}}{${shift("x",h)}}${k>0?"+":""}${k}`)}이다.`]);
  });
  variant("radical-translate-endpoint","이동한 그래프의 시작점과 방향 구성","graph",r=>{
    const h=signed(r,3),k=signed(r,3),a=pick(r,[-1,1]);
    return problem(`${m(tex`y=\sqrt{${term(a,"x")}}`)}의 그래프를 ${m("x")}축 방향으로 ${m(h)}만큼, ${m("y")}축 방향으로 ${m(k)}만큼 평행이동한다.`,[],
      `그래프의 시작점 좌표와 ${m(tex`y=\sqrt{a(x-h)}+k`)}에서 ${m("a")}를 입력하시오.`,
      graphData("radical",[h,k,a],["시작점의 x좌표","시작점의 y좌표","근호 안의 계수 a"],`시작점 ${m(coord([h,k]))}, ${m("a="+a)}`),
      [`이동으로 시작점은 ${m(coord([h,k]))}가 되고, 뻗는 방향은 그대로이므로 ${m("a="+a)}이다.`]);
  });
  variant("transform-isometry","대칭과 평행이동 뒤 점의 원래 좌표 복원","point",r=>{
    const p=[signed(r),signed(r)], h=signed(r,3), k=signed(r,3);
    const image=[p[1]+h,p[0]+k];
    return problem(`점 ${m("P")}를 직선 ${m("y=x")}에 대칭이동한 뒤 ${m("x")}축 방향으로 ${m(h)}만큼, ${m("y")}축 방향으로 ${m(k)}만큼 평행이동했더니 ${namedPoint("Q",image)}가 되었다.`,[],
      `점 ${m("P")}의 좌표를 구하시오.`,point(p),
       [`먼저 평행이동을 되돌리면 ${m(coord([p[1],p[0]]))}이다.`,`대칭을 되돌리려면 두 좌표를 바꾼다.`]);
  },pointDesign(`점 ${m("P")}`));
  variant("set-range-parameter","약수 집합에 포함되는 자연수 구간의 경계","scalar",r=>{
    const n=pick(r,[12,18,20,24,30,36]), start=pick(r,[1,2]), missing=Array.from({length:n},(_,i)=>start+i).find(x=>n%x!==0);
    return problem(`${m("A")}는 ${m(n)}의 양의 약수의 집합이고 ${m(tex`B=\{x\mid ${start}\le x\le k\}`)}의 원소는 자연수이다.`,[],
      `${m(tex`B\subset A`)}인 자연수 ${m("k")}의 최댓값을 구하시오.`,scalar(missing-1),
      [`${m(start)}부터 차례로 확인하면 ${m(missing)}가 처음으로 ${m("A")}에 속하지 않는다.`]);
  });
  variant("set-demorgan","두 조건의 부정을 결합한 집합의 원소 개수","scalar",r=>{
    const n=integer(r,12,25), a=pick(r,[2,3,4]), b=pick(r,[5,7]), numbers=Array.from({length:n},(_,i)=>i+1);
    const total=n-Math.floor(n/a)-Math.floor(n/b)+Math.floor(n/(a*b));
    return problem(`${m("U")}는 ${m(n)} 이하의 자연수의 집합이다. ${m("A,B")}는 각각 ${m(a)}, ${m(b)}의 배수로 이루어진 ${m("U")}의 부분집합이다.`,[],
      ask(tex`n(A^c\cap B^c)`),scalar(total),
      [`두 배수 집합의 합집합을 제외한다. 공통 원소는 ${m(a*b)}의 배수이므로 한 번 더한다.`,
       `남는 원소의 개수는 ${m(numbers.filter(x=>x%a!==0&&x%b!==0).length)}이다.`]);
  });
  variant("contradiction-proof","가정과 모순을 연결하는 증명 단계 배열","choice",r=>{
    const [a,b]=pick(r,[["a","b"],["m","n"],["x","y"]]);
    const steps=[
      `${m(a)}, ${m(b)}가 모두 홀수라고 가정한다.`,
      `두 정수의 곱 ${m(a+b)}도 홀수이다.`,
      `곱이 짝수라는 가정에 모순이다.`,
      `적어도 하나는 짝수이다.`,
    ];
    const positions=[0,1,2,3];
    for(let i=positions.length-1;i>0;i--) {
      const j=rand(r,0,i);
      [positions[i],positions[j]]=[positions[j],positions[i]];
    }
    const text=order=>order.map(index=>["ㄱ","ㄴ","ㄷ","ㄹ"][positions.indexOf(index)]).join(" → ");
    return problem(`정수 ${m(a)}, ${m(b)}의 곱이 짝수이면 둘 중 적어도 하나는 짝수임을 보이려 한다.\n`+
      positions.map((index,i)=>`${["ㄱ","ㄴ","ㄷ","ㄹ"][i]}. ${steps[index]}`).join("\n"),
      [],"증명 단계의 순서를 고르시오.",choice(r,text([0,1,2,3]),[[1,0,2,3],[0,2,1,3],[0,1,3,2]].map(text)),steps);
  });
  variant("function-composition-coefficient","함수값의 조건과 합성함수 계수에서 상수 역산","scalar",r=>{
    const a=signed(r,4),b=signed(r,5),c=signed(r,4),x=signed(r,3);
    const target=a*(c*x+b)+x;
    return problem(`두 함수의 합성이 ${m(`(f\\circ g)(${x})=${target}`)}를 만족한다.`,
      [tex`f(t)=${term(a,"t")}${x>0?"+":""}${x},\\qquad g(t)=${term(c,"t")}+k`],ask("k"),scalar(b),
      [`${m(`g(${x})=${c*x}+k`)}를 ${m("f")}에 대입한다.`,`합성함수의 값을 대입해 정리하면 ${m("k="+b)}이다.`]);
  });
  variant("function-composition-table-preimage","유한 집합의 합성함수에서 두 번째 출력의 원상","set",r=>{
    const n=integer(r,4,6),values=Array.from({length:n},(_,i)=>i+1);
    const f=values.map(()=>pick(r,values)),g=values.map(()=>pick(r,values));
    const target=f[g[pick(r,values)-1]-1];
    return problem(`두 함수 ${m("f,g")}의 정의역과 공역은 ${m(n)} 이하의 자연수의 집합이다.`,
      [tex`\begin{array}{c|${"c".repeat(n)}}x&${values.join("&")}\\\\ \hline f(x)&${f.join("&")}\\\\ g(x)&${g.join("&")}\end{array}`],
      `${m(`(f\\circ g)(x)=${target}`)}를 만족하는 모든 ${m("x")}를 집합으로 나타내시오.`,
      set(values.filter(x=>f[g[x-1]-1]===target)),
      [`각 ${m("x")}에서 ${m("g(x)")}를 읽고, 그 값을 ${m("f")}에 넣어 ${m(target)}가 나오는 입력을 모은다.`]);
  });
  variant("rational-two-points","점근선의 위치와 서로 다른 두 점에서 분자 결정","scalar",r=>{
    const h=signed(r,4),k=signed(r,3),a=2*signed(r,3);
    return problem(`유리함수의 그래프의 수직 점근선은 ${m("x="+h)}이고 두 점 ${namedPoint("P",[h-1,k-a])}, ${namedPoint("Q",[h+2,k+a/2])}를 지난다.`,
      [tex`y=\frac{a}{x-p}+q`],ask("a"),scalar(a),
      [`수직 점근선에서 ${m("p="+h)}이다. 두 점을 대입한 식의 차에서 ${m("q")}를 소거하면 ${m("a="+a)}이다.`]);
  });
  variant("radical-restricted-range","정의역과 주어진 출력 범위에서 경계 역산","scalar",r=>{
    const h=signed(r,4),k=signed(r,4),q=integer(r,2,5);
    return problem(`${m("x")}가 ${m(h)} 이상 ${m("t")} 이하일 때 다음 함수의 최댓값은 ${m(k+q)}이다.`,
      [tex`y=\sqrt{${shift("x",h)}}${k>0?"+":""}${k}`],ask("t"),scalar(h+q*q),
      [`함숫값은 ${m("x")}가 커질수록 커지므로 최댓값은 ${m("x=t")}일 때의 값이다.`,
       `근호의 값이 ${m(q)}이므로 ${m("t="+(h+q*q))}이다.`]);
  });

  // Each route defines what is given, what is asked, and how to read the answer
  // from the same mathematical model. Selection happens before the model is built.
  function addQuestionRoutes(type, id, label, model, routes) {
    types[type].variants.push({
      ...alternative("expanded-" + id, label, (rng, path) => {
        const route = routes.find(candidate => candidate.id === path?.id) ?? routes[0];
        return route.build(model(rng), rng);
      }),
      answerKind: routes[0].kind,
      answerPaths: routes.map(route => ({
        id: route.id,
        label: route.label,
        outputType: route.kind,
        passthrough: true,
      })),
    });
  }

  const route = (id, label, kind, build) => ({ id, label, kind, build });
  const box = "\\square";
  const monicQuadratic = (b, c) =>
    sum("x^2" + (b === 0 ? "" : (b > 0 ? "+" : "") + term(b, "x")), c);
  const lineForm = (a, b, x = "x") => sum(term(a, x), b);

  addQuestionRoutes("section-internal", "ordered-section", "내분 관계에서 주어진 양과 미지량 바꾸기", r => {
    const [u, v] = pick(r, [[1, 2], [2, 3], [3, 2], [3, 4], [4, 3], [5, 2]]);
    const p = [signed(r), signed(r)];
    const d = [signed(r, 3), signed(r, 3)];
    const a = p.map((x, i) => x - u * d[i]);
    const b = p.map((x, i) => x + v * d[i]);
    return r() < .5
      ? { first: "A", last: "B", a, b, p, u, v }
      : { first: "B", last: "A", a: b, b: a, p, u: v, v: u };
  }, [
    route("point", "내분점 좌표", "point", ({ first, last, a, b, p, u, v }) =>
      problem("두 점 " + namedPoint(first, a) + ", " + namedPoint(last, b) + "가 있다. 선분 " + m(first + last) + "를 " + m(u + ":" + v) + "로 내분하는 점을 생각하자.", [],
        "내분점의 좌표를 구하시오.", point(p),
        ["첫 번째 점에서 두 번째 점으로 가는 좌표 변화의 " + m("\\frac{" + u + "}{" + (u + v) + "}") + "만큼 이동하면 " + m(coord(p)) + "이다."])),
    route("ratio", "빠진 내분비", "scalar", ({ first, last, a, b, p, u, v }) =>
      problem("점 " + namedPoint("P", p) + "는 선분 " + m(first + last) + "를 " + m("k:" + v) + "로 내분한다.",
        [first + coord(a) + ",\\quad " + last + coord(b)], ask("k"), scalar(u),
        ["각 구간의 x좌표 차의 절댓값을 비교하면 " + m(first + "P:P" + last + "=" + u + ":" + v) + "이다."])),
    route("endpoint", "첫 번째 끝점 역산", "point", ({ first, last, a, b, p, u, v }) =>
      problem("점 " + namedPoint("P", p) + "는 점 " + namedPoint(last, b) + "와 점 " + m(first) + "를 잇는 선분 " + m(first + last) + "를 " + m(u + ":" + v) + "로 내분한다.", [],
        "점 " + m(first) + "의 좌표를 구하시오.", point(a),
        [m(last) + "에서 " + m("P") + "까지의 좌표 변화에 " + m("\\frac{" + (u + v) + "}{" + v + "}") + "를 곱하고 " + m(last) + "의 좌표에 더한다."])),
  ]);

  addQuestionRoutes("absolute-inequality", "quadratic-completion", "완전제곱식과 최솟값", r => {
    const h = signed(r, 5), k = signed(r, 7), t = h + signed(r, 4);
    const f = monicQuadratic(-2 * h, h * h + k);
    const square = sq("x", h);
    return { h, k, t, f, square };
  }, [
    route("expression", "빈칸에 들어갈 완전제곱식", "choice", ({ h, k, f, square }, r) =>
      problem("다음 등식은 모든 실수 " + m("x") + "에서 성립한다.", [f + "=" + sum(box, k)],
        "빈칸에 들어갈 식을 고르시오.", choice(r, m(square), [h - 1, h + 1, h + 2].map(j => m(sq("x", j)))),
        ["일차항의 계수를 맞추면 빈칸은 " + m(square) + "이다."])),
    route("evaluate", "빈칸의 식에 대입", "scalar", ({ h, k, t, f, square }) =>
      problem("다음 등식은 모든 실수 " + m("x") + "에서 성립한다.", [f + "=" + sum(box, k)],
        "빈칸에 들어갈 식에 " + m("x=" + t) + "을 대입한 값을 구하시오.", scalar((t - h) ** 2),
        ["빈칸은 " + m(square) + "이므로 값을 대입한다."])),
    route("minimum", "두 제곱을 합친 식의 최솟값", "scalar", ({ h, k, f }) => {
      const second = sq("x", h + 2);
      const whole = f + "+" + second;
      return problem("실수 " + m("x") + "에 대한 다음 식을 생각하자.", [whole],
        "이 식의 최솟값을 구하시오.", scalar(k + 2),
        ["주어진 식을 완전제곱으로 정리하면 " + m(sum("2" + sq("x", h + 1), k + 2)) + "이다.",
          m("x=" + (h + 1)) + "에서 최솟값을 갖는다."]);
    }),
  ]);

  addQuestionRoutes("a-poly-multiply", "polynomial-expansion", "전개식과 일차항", r => {
    const x = pick(r, oneOf), p = signed(r), q = signed(r);
    return { x, p, q, b: -p - q, c: p * q, product: rootProduct(x, p, q) };
  }, [
    route("expression", "곱을 전개한 식", "choice", ({ x, b, c, product }, r) => {
      const expanded = (linear, constant) => sum(x + "^2" + (linear === 0 ? "" : (linear > 0 ? "+" : "") + term(linear, x)), constant);
      return problem("", [product], "이 식을 전개한 것을 고르시오.",
        choice(r, m(expanded(b, c)), [expanded(b + 1, c), expanded(b - 1, c), expanded(b, -c)].map(m)),
        ["두 인수에서 일차항에 기여하는 항을 더하고, 상수끼리 곱한다."]);
    }),
    route("blank", "전개식에서 일차항의 계수", "scalar", ({ x, b, c, product }) =>
      problem("다음 등식은 모든 실수 " + m(x) + "에서 성립한다.",
        [product + "=" + sum(x + "^2+" + box + " " + x, c)], "빈칸에 들어갈 수를 구하시오.", scalar(b),
        ["두 인수의 상수항을 더하면 일차항의 계수가 된다."]),
    ),
    route("evaluate", "전개한 일차항에 대입", "scalar", ({ x, b, product }) =>
      problem("", [product], "이 식을 전개한 뒤 일차항에 " + m(x + "=3") + "을 대입한 값을 구하시오.", scalar(3 * b),
        [b === 0 ? "일차항의 계수가 0이므로 구하는 값은 0이다." : "일차항은 " + m(term(b, x)) + "이므로 " + m(x + "=3") + "을 대입한다."]),
    ),
  ]);

  addQuestionRoutes("a-line-from-point-slope", "line-equation", "직선의 식과 대입", r => {
    const a = signed(r, 4), b = signed(r, 6), x = signed(r, 4);
    return { a, b, x, y: a * x + b };
  }, [
    route("expression", "직선의 방정식", "choice", ({ a, b, x, y }, r) =>
      problem("기울기가 " + m(a) + "인 직선이 점 " + namedPoint("P", [x, y]) + "를 지난다.", [],
        "이 직선의 방정식을 고르시오.", choice(r, m("y=" + lineForm(a, b)),
          [lineForm(a, b + 1), lineForm(a, b - 1), lineForm(-a, b)].map(eq => m("y=" + eq))),
        ["점의 좌표를 대입하면 y절편은 " + m(b) + "이다."])),
    route("slope", "절편과 점에서 기울기 역산", "scalar", ({ a, b, x, y }) =>
      problem("y절편이 " + m(b) + "인 직선이 점 " + namedPoint("P", [x, y]) + "를 지난다.", [],
        "이 직선의 기울기를 구하시오.", scalar(a),
        ["두 점 " + m(coord([0, b])) + "와 " + m(coord([x, y])) + "에서 세로 변화량을 가로 변화량으로 나눈다."])),
    route("evaluate", "직선의 식에서 다른 점의 좌표", "scalar", ({ a, b, x, y }) =>
      problem("기울기가 " + m(a) + "인 직선이 점 " + namedPoint("P", [x, y]) + "를 지난다.", [],
        m("x=" + (x + 2)) + "인 점의 y좌표를 구하시오.", scalar(y + 2 * a),
        ["x좌표가 2 증가할 때 y좌표는 기울기의 두 배만큼 변한다."]),
    ),
  ]);

  addQuestionRoutes("a-function-compose", "compose-expression", "합성함수의 식과 대입", r => {
    const a = signed(r, 4), b = signed(r, 4), x = signed(r, 3);
    const reverse = r() < .5;
    const name = reverse ? "(g\\circ f)" : "(f\\circ g)";
    const inner = reverse ? "f" : "g", outer = reverse ? "g" : "f";
    const expr = reverse ? "(" + lineForm(a, b) + ")^2" : sum(term(a, "x^2"), b);
    const value = reverse ? (a * x + b) ** 2 : a * x * x + b;
    return { x, name, inner, outer, expr, value, expressions: ["f(x)=" + lineForm(a, b), "g(x)=x^2"] };
  }, [
    route("expression", "합성함수의 식", "choice", ({ name, inner, outer, expr, expressions }, r) =>
      problem("", expressions, m(name + "(x)") + "의 식을 고르시오.",
        choice(r, m(expr), [1, 2, 3].map(n => m("(" + expr + ")+" + n))),
        ["먼저 " + m(inner) + "에 넣고, 그 결과를 " + m(outer) + "에 넣는다."])),
    route("blank", "합성 순서에 맞는 빈칸", "choice", ({ name, inner, outer, expressions }, r) =>
      problem("", [...expressions, name + "(x)=" + outer + "(" + box + ")"], "빈칸에 들어갈 식을 고르시오.",
        choice(r, m(inner + "(x)"), [m(outer + "(x)"), m("x"), m(name + "(x)")]),
        ["괄호 안에는 먼저 적용하는 함수 " + m(inner) + "의 함숫값이 들어간다."])),
    route("evaluate", "합성식에 주어진 값 대입", "scalar", ({ x, name, inner, outer, expr, value, expressions }) =>
      problem("", expressions, ask(name + "(" + x + ")"), scalar(value),
        [m(inner) + "의 결과를 " + m(outer) + "에 넣어 " + m(name + "(x)=" + expr) + "을 구한 뒤 대입한다."])),
  ]);

  // A one-to-one function gives both a forward and a reverse question.
  function addEvaluationRoutes(type, id, label, model) {
    addQuestionRoutes(type, id, label, model, [
      route("output", "주어진 입력의 함숫값", "scalar", ({ x, y, formula, reasoning }) =>
        problem("", ["f(x)=" + formula], ask("f(" + x + ")"), scalar(y), [reasoning])),
      route("input", "함숫값으로 입력 역산", "scalar", ({ x, y, formula, reasoning, reverse }) =>
        problem("아래 함수에서 " + m("f(t)=" + y) + "이다.", ["f(x)=" + formula],
          ask("t"), scalar(x), [reverse, reasoning])),
    ]);
  }

  addEvaluationRoutes("a-rational-value", "rational-input-output", "유리함수의 대입과 역산", r => {
    const h = signed(r), k = signed(r), d = signed(r, 3), n = signed(r, 4);
    return {
      x: h + d,
      y: n + k,
      formula: sum("\\frac{" + d * n + "}{" + shift("x", h) + "}", k),
      reasoning: "분모가 " + m(d) + "일 때 분수 부분의 값은 " + m(n) + "이다.",
      reverse: "함숫값에서 " + m(par(k)) + "을 빼면 분수 부분의 값은 " + m(n) + "이다.",
    };
  });
  addEvaluationRoutes("a-radical-value", "radical-input-output", "무리함수의 대입과 역산", r => {
    const h = signed(r), k = signed(r), n = integer(r, 2, 5), direction = pick(r, [-1, 1]);
    const inside = direction > 0 ? shift("x", h) : sum("-x", h);
    return {
      x: h + direction * n ** 2,
      y: k + n,
      formula: sum("\\sqrt{" + inside + "}", k),
      reasoning: "근호 안이 " + m(n ** 2) + "이면 제곱근은 " + m(n) + "이다.",
      reverse: "함숫값에서 바깥의 상수를 빼면 제곱근의 값은 " + m(n) + "이다. 양변을 제곱해 근호 안의 값을 구한다.",
    };
  });

  addQuestionRoutes("a-circle-equation", "circle-equation-forms", "원의 식과 중심·반지름", r => {
    const a = signed(r, 4), b = signed(r, 4), radius = integer(r, 2, 5);
    const equation = (x, y, r) => sq("x", x) + "+" + sq("y", y) + "=" + r ** 2;
    return { a, b, radius, equation, given: equation(a, b, radius) };
  }, [
    route("equation", "중심과 반지름으로 식 고르기", "choice", ({ a, b, radius, equation, given }, r) =>
      problem("중심이 " + m(coord([a, b])) + "이고 반지름이 " + m(radius) + "인 원을 생각하자.", [],
        "이 원의 방정식을 고르시오.", choice(r, m(given), [equation(-a, b, radius), equation(a, -b, radius), equation(a, b, radius + 1)].map(m)),
        ["각 좌표에서 중심의 좌표를 빼고 제곱한다. 우변에는 반지름의 제곱을 쓴다."])),
    route("radius", "방정식에서 반지름 읽기", "scalar", ({ radius, given }) =>
      problem("", [given], "이 원의 반지름을 구하시오.", scalar(radius), ["우변의 양의 제곱근이 반지름이다."])),
    route("center", "방정식에서 중심 읽기", "point", ({ a, b, given }) =>
      problem("", [given], "이 원의 중심의 좌표를 구하시오.", point([a, b]), ["두 제곱항을 동시에 0으로 만드는 좌표가 중심이다."])),
  ]);

  addQuestionRoutes("a-translate-point", "translation-input-output", "평행이동 관계에서 미지량 바꾸기", r => {
    const start = [signed(r), signed(r)], offset = [signed(r), signed(r)];
    const end = start.map((x, i) => x + offset[i]);
    const motion = "x축 방향으로 " + m(offset[0]) + ", y축 방향으로 " + m(offset[1]) + "만큼 평행이동";
    return { start, offset, end, motion };
  }, [
    route("before", "이동 전 좌표", "point", ({ start, end, motion }) =>
      problem("점 " + m("P") + "를 " + motion + "하면 점 " + namedPoint("Q", end) + "가 된다.", [],
        "점 " + m("P") + "의 좌표를 구하시오.", point(start), ["이동 후 좌표에서 각 축 방향의 이동량을 뺀다."])),
    route("offset", "두 좌표에서 이동량", "point", ({ start, offset, end }) =>
      problem("점 " + namedPoint("P", start) + "를 평행이동하면 점 " + namedPoint("Q", end) + "가 된다.", [],
        "x축, y축 방향의 이동량을 이 순서대로 순서쌍으로 나타내시오.", point(offset),
        ["이동 후 좌표에서 이동 전 좌표를 각각 뺀다."])),
  ]);

  addQuestionRoutes("a-set-operation", "set-operation-expression", "연산으로 얻은 집합과 연산식", r => {
    const start = signed(r);
    const common = [start + 2, start + 5];
    const onlyA = [start, start + 3], onlyB = [start + 1, start + 4];
    const operations = [
      { expr: "A\\cup B", value: [...common, ...onlyA, ...onlyB] },
      { expr: "A\\cap B", value: common },
      { expr: "A-B", value: onlyA },
      { expr: "B-A", value: onlyB },
    ];
    return { operations, target: pick(r, operations), a: set([...common, ...onlyA]), b: set([...common, ...onlyB]) };
  }, [
    route("expression", "결과와 일치하는 집합식", "choice", ({ operations, target, a, b }, r) =>
      problem("두 집합 " + m("A") + ", " + m("B") + "가 각각 " + a.text + ", " + b.text + "이다.", [],
        set(target.value).text + "과 같은 집합을 나타내는 식을 고르시오.",
        choice(r, m(target.expr), operations.filter(op => op !== target).map(op => m(op.expr))),
        ["각 식이 두 집합에서 어느 원소를 취하는지 비교한다."])),
    route("cardinality", "집합식 결과의 원소 개수", "scalar", ({ target, a, b }) =>
      problem("두 집합 " + m("A") + ", " + m("B") + "가 각각 " + a.text + ", " + b.text + "이다.", [],
        m(target.expr) + "의 원소 개수를 구하시오.", scalar(target.value.length),
        ["해당 집합은 " + set(target.value).text + "이다."]),
    ),
  ]);

  addQuestionRoutes("negation", "negation-interval", "범위 조건의 부정과 경계", r => {
    const a = signed(r, 5), b = a + integer(r, 2, 6);
    const closed = r() < .5;
    const inside = a + (closed ? "\\le x\\le " : "<x<") + b;
    const outside = m("x" + (closed ? "<" : "\\le ") + a) + " 또는 " + m("x" + (closed ? ">" : "\\ge ") + b);
    const flip = m("x" + (closed ? "\\le " : "<") + a) + " 또는 " + m("x" + (closed ? "\\ge " : ">") + b);
    const both = outside.replace(" 또는 ", " 그리고 ");
    return { a, b, closed, inside, outside, flip, both };
  }, [
    route("expression", "부정을 나타내는 조건", "choice", ({ inside, outside, flip, both }, r) =>
      problem("전체집합은 실수 전체의 집합이다. 조건 " + m("p") + "는 " + m(inside) + "이다.", [],
        "조건 " + m("p") + "의 부정을 고르시오.", choice(r, outside, [flip, both, m(inside)]),
        ["두 경계 조건을 각각 부정하고 ‘그리고’를 ‘또는’으로 바꾼다."])),
    route("count", "부정이 참이 되는 정수의 개수", "scalar", ({ a, b, closed, inside, outside }) =>
      problem("전체집합은 " + m(a - 2) + " 이상 " + m(b + 2) + " 이하인 정수의 집합이다. 조건 " + m("p") + "는 " + m(inside) + "이다.", [],
        "조건 " + m("p") + "의 부정이 참이 되는 원소의 개수를 구하시오.", scalar(closed ? 4 : 6),
        ["조건의 부정은 " + outside + "이다. 주어진 전체집합에서 해당하는 정수만 센다."]),
    ),
  ]);

  addQuestionRoutes("a-quadratic-vertex", "vertex-form", "꼭짓점에서 식과 계수 구하기", r => {
    const h = signed(r, 4), k = signed(r, 6);
    const b = -2 * h, c = h * h + k;
    return { h, k, b, c, f: monicQuadratic(b, c) };
  }, [
    route("vertex", "일반형에서 꼭짓점", "point", ({ h, k, f }) =>
      problem("", ["y=" + f], "이 이차함수의 꼭짓점의 좌표를 구하시오.", point([h, k]),
        ["완전제곱으로 정리하면 " + m("y=" + sum(sq("x", h), k)) + "이다."])),
    route("constant", "최솟값으로 상수항 역산", "scalar", ({ h, k, b, c }) =>
      problem("다음 이차함수의 최솟값은 " + m(k) + "이다.",
        ["y=x^2" + (b > 0 ? "+" : "") + term(b, "x") + "+c"], ask("c"), scalar(c),
        [m("x=" + h) + "에서 최솟값을 가지므로 " + m("c-" + h * h + "=" + k) + "이다."])),
  ]);
})();


;

/* concept-expansion.js */
(() => {
  'use strict';
  const {add,alternative,problem,choice,scalar,point,set,m,rand,pick,linear,shift} = ForgeTopics;
  const integer = r => rand(r,-5,5);
  const nonzero = r => pick(r,[-5,-4,-3,-2,-1,1,2,3,4,5]);
  const coord = p => `(${p.join(',')})`;
  const named = (name,p) => m(name+coord(p));
  const squared=(x,h)=>`(${shift(x,h)})^2`;
  const circle=(h,k,r)=>`${squared('x',h)}+${squared('y',k)}=${r*r}`;
  const choices=(r,correct,wrong)=>choice(r,correct,wrong);
  // A and B use the same constructor; B supplies a reverse or combined demand.
  function paired(id,unit,label,model,build,kind='scalar') {
    for(const level of ['A','B']) {
      const variant=alternative('main',label,(rng)=>build(model(rng),level,rng));
      const resultKinds={
        'line-intercepts':['choice','scalar'], 'line-fixed':['point','scalar'],
        'circle-form':['choice','scalar'], 'circle-locus':['choice','scalar'],
        'circle-tangent':['scalar','point'], 'reflect-line':['point','scalar'],
        'set-symmetric':['set','scalar'], 'line-intersection-fixed':['point','scalar'],
        'circle-three':['point','scalar'], 'set-representation':['set','scalar'],
        'circle-pair-position':['choice','scalar'], 'set-disjoint':['set','scalar'], 'reflect-oblique':['point','scalar']
      };
      variant.answerKind=resultKinds[id]?.[level==='A'?0:1] ?? kind;
      const pointSubjects={
        'reflect-center':['이동한 점','대칭의 중심'], 'reflect-line':['이동한 점',null], 'reflect-oblique':['이동한 점',null],
        'circle-three':['원의 중심',null], 'circle-tangent':[null,'접점'],
        'line-fixed':['정점',null], 'line-intersection-fixed':['교점',null]
      };
      const subject=pointSubjects[id]?.[level==='A'?0:1];
      if(subject) {
        variant.resultType={baseType:'Point',capabilities:['coordinates','x','y','coordinateSum']};
        variant.answerPaths=ForgeVariations.pointPaths(subject);
      }
      add(`concept-${id}-${level.toLowerCase()}`,unit,label,level,[variant]);
    }
  }
  paired('section-number','coordinate','수직선에서 선분의 내분',r=>{
    const p=integer(r), d=rand(r,1,4), a=rand(r,1,3), b=rand(r,1,3);
    return {p,a,b,x:p-a*d,y:p+b*d};
  },(v,level)=>problem(`수직선 위의 두 점 ${m(`A(${v.x}), B(${v.y})`)}에 대하여`,[],level==='A'?`선분 ${m('AB')}를 ${m(`${v.a}:${v.b}`)}로 내분하는 점의 좌표를 구하시오.`:`점 ${m(`P(${v.p})`)}가 선분 ${m('AB')}를 ${m(`k:${v.b}`)}로 내분할 때, ${m('k')}의 값을 구하시오.`,scalar(level==='A'?v.p:v.a),[`${m(`AP:PB=${v.a}:${v.b}`)}이다.`]));
  paired('centroid-median','coordinate','무게중심과 중선의 성질',r=>({d:rand(r,2,9)}),(v,l)=>problem(`삼각형 ${m('ABC')}의 무게중심을 ${m('G')}, 변 ${m('BC')}의 중점을 ${m('M')}이라 하자.`,[l==='A'?`AM=${3*v.d}`:`AG-GM=${v.d}`],l==='A'?`${m('AG')}의 길이를 구하시오.`:`${m('AM')}의 길이를 구하시오.`,scalar(l==='A'?2*v.d:3*v.d),[`${m('AG:GM=2:1')}이다.`]));
  paired('median-theorem','coordinate','중선 정리',r=>{const a=rand(r,2,5),b=rand(r,1,5);return {a,b};},(v,l)=>{
    const {a,b}=v,ab=a*a+b*b,bc=4*a*a,med= b*b;
    return problem(`삼각형 ${m('ABC')}에서 변 ${m('BC')}의 중점을 ${m('M')}이라 하자.`,l==='A'?[`AB^2=${ab},\\quad AC^2=${ab},\\quad BC^2=${bc}`]:[`AB^2+AC^2=${2*ab},\\quad AM^2=${med}`],l==='A'?`${m('AM^2')}의 값을 구하시오.`:`${m('BC^2')}의 값을 구하시오.`,scalar(l==='A'?med:bc),[`${m('AB^2+AC^2=2AM^2+\\frac{1}{2}BC^2')}를 이용한다.`]);
  });
  paired('line-form','lines','일차방정식이 나타내는 직선',r=>({a:nonzero(r),b:nonzero(r),c:nonzero(r)}),(v,l,r)=>{
    const {a,b,c}=v, good=l==='A'?`${a}x+${b}y=${c}`:`${a}x+${b}y=${c}`;
    return problem('',[],l==='A'?'다음 중 좌표평면 위의 직선을 나타내는 방정식을 고르시오.':'다음 중 좌표평면 위의 직선이 아닌 것을 고르시오.',choices(r,m(l==='A'?good:`0x+0y=${c}`),(l==='A'?[`0x+0y=${c}`,`0x+0y=0`,`x^2+y^2=1`]:[good,`${a}x=${c}`,`${b}y=${c}`]).map(m)),[`${m('ax+by+c=0')}이 직선을 나타내려면 ${m('a,b')} 중 적어도 하나가 0이 아니어야 한다.`]);
  },'choice');
  paired('line-intercepts','lines','두 절편으로 직선 정하기',r=>({a:rand(r,1,5),b:rand(r,1,5)}),(v,l,r)=>{
    const {a,b}=v, eq=`\\frac{x}{${a}}+\\frac{y}{${b}}=1`;
    if(l==='A')return problem(`직선의 ${m('x')}절편과 ${m('y')}절편이 각각 ${m(a)}, ${m(b)}이다.`,[],'이 직선의 방정식을 고르시오.',choices(r,m(eq),[m(`\\frac{x}{${a}}-\\frac{y}{${b}}=1`),m(`\\frac{x}{${a}}+\\frac{y}{${b}}=-1`),m(`\\frac{x}{${a+1}}+\\frac{y}{${b}}=1`)]),[`두 절편을 방정식에 각각 대입한다.`]);
    return problem(`직선의 두 절편이 모두 양수이고 ${m('x')}절편은 ${m(a)}이다. 원점과 두 절편이 만드는 삼각형의 넓이가 ${m(a*b)}일 때`,[],`${m('y')}절편을 구하시오.`,scalar(2*b),[`${m(`\\frac{1}{2}\\cdot ${a}\\cdot b=${a*b}`)}이다.`]);
  },'choice');
  paired('line-fixed','lines','정점을 지나는 직선의 묶음',r=>({h:integer(r),k:integer(r)}),(v,l)=>{
    const {h,k}=v;return problem(`실수 ${m('t')}의 값이 변할 때 직선이 다음과 같다.`,[`y${k<0?'+':'-'}${Math.abs(k)}=t(${shift('x',h)})`],l==='A'?'모든 직선이 지나는 정점의 좌표를 구하시오.':`이 정점과 점 ${named('Q',[h+2,k+3])} 사이의 거리의 제곱을 구하시오.`,l==='A'?point([h,k]):scalar(13),[`기울기와 무관하게 ${m(`x=${h}`)}이면 ${m(`y=${k}`)}이다.`]);
  },'point');
  paired('line-parallel-distance','lines','평행한 두 직선 사이의 거리',r=>({h:integer(r),d:rand(r,1,6),s:pick(r,[-1,1])}),(v,l)=>problem(`두 직선은 서로 평행하다.`,[`y=${v.h}`,`y=${v.h+v.s*v.d}`],l==='A'?'두 직선 사이의 거리를 구하시오.':`첫 번째 직선을 ${m('y')}축 방향으로 평행이동하여 두 번째 직선과 일치시킨다. 이동량의 절댓값을 구하시오.`,scalar(v.d),['수평인 두 직선의 거리와 세로 좌표의 차를 비교한다.']));
  paired('circle-form','circles','원의 방정식이 되기 위한 조건',r=>({h:integer(r),k:integer(r),a:rand(r,1,5)}),(v,l,r)=>{
    const {h,k,a}=v, ex=`${squared('x',h)}+${squared('y',k)}`;
    return problem('',[`${ex}=k`],l==='A'?`이 방정식이 반지름이 양수인 원을 나타내도록 하는 ${m('k')}의 조건을 고르시오.`:`반지름이 ${m(a)}인 원을 나타낼 때 ${m('k')}를 구하시오.`,l==='A'?choices(r,m('k>0'),[m('k\\ge 0'),m('k<0'),m('k=0')]):scalar(a*a),[`${m('k')}는 반지름의 제곱이며 양수여야 한다.`]);
  },'choice');
  paired('circle-axis','circles','좌표축에 접하는 원',r=>({h:nonzero(r),k:nonzero(r)}),(v,l)=>problem(`중심이 ${named('C',[v.h,v.k])}인 원이 ${m('x')}축에 접한다.`,[],l==='A'?'이 원의 반지름을 구하시오.':`이 원의 넓이를 ${m('S')}라 할 때 ${m('S/\\pi')}의 값을 구하시오.`,scalar(l==='A'?Math.abs(v.k):v.k*v.k),['반지름은 원의 중심과 x축 사이의 거리이다.']));
  paired('circle-radical-axis','circles','두 원의 공통현이 놓인 직선',r=>({h:integer(r),k:integer(r),d:rand(r,1,4),radius:rand(r,5,8)}),(v,l)=>{
    const {h,k,d,radius}=v;const right=circle(h+d,k,radius),left=circle(h-d,k,radius);
    return problem('두 원의 방정식이 다음과 같다.',[left,right],l==='A'?`공통현이 놓인 직선의 ${m('x')}좌표를 구하시오.`:`두 원의 교점의 ${m('x')}좌표의 합을 구하시오.`,scalar(l==='A'?h:2*h),['두 원의 방정식을 변끼리 빼어 이차항을 없앤다.']);
  });
  paired('circle-locus','circles','한 점에서 일정한 거리에 있는 점의 자취',r=>({h:integer(r),k:integer(r),rad:rand(r,1,5)}),(v,l,r)=>{
    const {h,k,rad}=v;
    return problem(`점 ${named('C',[h,k])}에서 거리가 ${m(rad)}인 점 ${m('P')}의 자취가 있다.`,[],l==='A'?'이 자취의 방정식을 고르시오.':`자취가 ${m('x')}축과 만나는 점의 개수를 구하시오.`,l==='A'?choices(r,m(circle(h,k,rad)),[m(circle(h,k,rad+1)),m(`${squared('x',h)}-${squared('y',k)}=${rad*rad}`),m(`${squared('x',h)}+${squared('y',k)}=-${rad*rad}`)]):scalar(Math.abs(k)<rad?2:Math.abs(k)===rad?1:0),['주어진 조건은 중심과 반지름이 정해진 원이다.']);
  },'choice');
  paired('circle-line-position','circles','원과 직선의 위치 관계',r=>({h:integer(r),k:integer(r),rad:rand(r,2,5),delta:rand(r,-1,1)}),(v,l)=>{
    const offset=v.rad+v.delta, count=v.delta<0?2:v.delta===0?1:0;
    return problem('',[circle(v.h,v.k,v.rad),`y=${v.k+offset}`],l==='A'?'원과 직선의 교점의 개수를 구하시오.':`원의 중심에서 직선까지의 거리와 반지름의 차를 구하시오.`,scalar(l==='A'?count:offset-v.rad),['원의 중심과 직선 사이의 거리를 반지름과 비교한다.']);
  });
  paired('circle-tangent','circles','원의 접점과 접선',r=>({h:integer(r),k:integer(r),rad:rand(r,1,5),s:pick(r,[-1,1])}),(v,l)=>{
    const y=v.k+v.s*v.rad;return problem(`중심이 ${named('C',[v.h,v.k])}이고 반지름이 ${m(v.rad)}인 원이 있다.`,l==='A'?[`P${coord([v.h,y])}`]:[`y=${y}`],l==='A'?`점 ${m('P')}에서 그은 접선의 ${m('y')}절편을 구하시오.`:'주어진 직선이 접하는 점의 좌표를 구하시오.',l==='A'?scalar(y):point([v.h,y]),['접점에서의 반지름과 접선은 서로 수직이다.']);
  },'scalar');
  paired('reflect-center','transformations','한 점에 대한 대칭이동',r=>({c:[integer(r),integer(r)],d:[nonzero(r),nonzero(r)]}),(v,l)=>{
    const p=[v.c[0]+v.d[0],v.c[1]+v.d[1]],q=[v.c[0]-v.d[0],v.c[1]-v.d[1]];
    return problem(l==='A'?`점 ${named('P',p)}를 점 ${named('C',v.c)}에 대하여 대칭이동한다.`:`점 ${named('P',p)}를 어떤 점에 대하여 대칭이동하면 점 ${named('Q',q)}가 된다.`,[],l==='A'?'이동한 점의 좌표를 구하시오.':'대칭의 중심의 좌표를 구하시오.',point(l==='A'?q:v.c),['대칭의 중심은 이동 전후 두 점을 잇는 선분의 중점이다.']);
  },'point');
  paired('reflect-line','transformations','한 직선에 대한 대칭이동',r=>{const h=integer(r);return {h,x:h+nonzero(r),y:integer(r)};},(v,l)=>{
    const q=[2*v.h-v.x,v.y];return problem(l==='A'?`점 ${named('P',[v.x,v.y])}를 직선 ${m(`x=${v.h}`)}에 대하여 대칭이동한다.`:`두 점 ${named('P',[v.x,v.y])}, ${named('Q',q)}가 직선 ${m('x=k')}에 대하여 대칭이다.`,[],l==='A'?'이동한 점의 좌표를 구하시오.':`${m('k')}의 값을 구하시오.`,l==='A'?point(q):scalar(v.h),['대칭축은 두 점을 잇는 선분의 수직이등분선이다.']);
  },'point');
  paired('set-counts','sets','부분집합과 진부분집합의 개수',r=>({n:rand(r,2,7)}),(v,l,r)=>{
    const n=v.n;if(l==='A')return problem(`원소의 개수가 ${m(n)}인 집합 ${m('A')}가 있다.`,[],`${m('A')}의 부분집합의 개수를 구하시오.`,scalar(2**n),[`각 원소를 포함하거나 포함하지 않는 경우를 센다.`]);
    return problem(`집합 ${m('A')}의 진부분집합의 개수가 ${m(2**n-1)}이다.`,[],`${m('A')}의 원소의 개수를 구하시오.`,scalar(n),[`진부분집합의 개수는 전체 부분집합의 개수보다 1 작다.`]);
  });
  paired('set-required','sets','특정 원소를 포함하는 부분집합',r=>({n:rand(r,4,7),k:rand(r,2,3)}),(v,l)=>problem(`서로 다른 원소 ${m(v.n)}개로 이루어진 집합 ${m('A')}에서 서로 다른 ${m(v.k)}개의 원소를 지정한다.`,[],l==='A'?'지정한 원소를 모두 포함하는 부분집합의 개수를 구하시오.':'지정한 원소 중 적어도 하나를 포함하는 부분집합의 개수를 구하시오.',scalar(l==='A'?2**(v.n-v.k):2**v.n-2**(v.n-v.k)),[l==='A'?'지정한 원소를 포함시킨 후 나머지 원소의 포함 여부를 정한다.':'전체 부분집합에서 지정한 원소를 하나도 포함하지 않는 경우를 뺀다.']));
  paired('set-kind','sets','유한집합과 무한집합',r=>({n:rand(r,3,9)}),(v,l,r)=>{
    const finite=`${v.n} 이하의 자연수의 집합`,inf='자연수 전체의 집합';
    return problem('',[],l==='A'?'다음 중 유한집합을 고르시오.':'다음 중 무한집합을 고르시오.',choices(r,l==='A'?finite:inf,l==='A'?[inf,'정수 전체의 집합','실수 전체의 집합']:[finite,'한 자리 자연수의 집합','100의 양의 약수의 집합']),['원소를 모두 셀 수 있는 유한집합과 그렇지 않은 무한집합을 구별한다.']);
  },'choice');
  paired('set-symmetric','sets','대칭차집합',r=>({n:rand(r,3,6)}),(v,l)=>{
    const A=Array.from({length:v.n},(_,i)=>i+1),B=Array.from({length:v.n},(_,i)=>i+3),result=[1,2,v.n+1,v.n+2];
    return problem('두 집합이 다음과 같다.',[`A=\\{${A.join(',')}\\}`,`B=\\{${B.join(',')}\\}`],l==='A'?`${m('(A-B)\\cup(B-A)')}를 구하시오.`:`${m('n((A-B)\\cup(B-A))')}의 값을 구하시오.`,l==='A'?set(result):scalar(result.length),['두 집합 중 한쪽에만 속하는 원소를 모은다.']);
  },'set');
  paired('set-laws','sets','집합의 연산 법칙',r=>({index:rand(r,0,2)}),(v,l,r)=>{
    const cases=[['A\\cap(B\\cup C)','(A\\cap B)\\cup(A\\cap C)','A\\cap B\\cap C','(A\\cup B)\\cap(A\\cup C)','A\\cup(B\\cap C)'],['(A\\cup B)^c','A^c\\cap B^c','A^c\\cup B^c','A\\cap B','A-B'],['(A\\cap B)^c','A^c\\cup B^c','A^c\\cap B^c','A\\cup B','B-A']];
    const row=cases[v.index];return problem('전체집합의 부분집합에 대하여', [row[0]],l==='A'?'위 집합과 항상 같은 것을 고르시오.':'위 집합의 여집합과 항상 같은 것을 고르시오.',l==='A'?choices(r,m(row[1]),row.slice(2).map(m)):choices(r,m(row[0].startsWith('(A\\cup')?'A\\cup B':row[0].startsWith('(A\\cap')?'A\\cap B':'A^c\\cup(B^c\\cap C^c)'),[m(row[1]),m(row[2]),m('A^c')]),['분배법칙 또는 드모르간 법칙을 적용하고 여집합을 정리한다.']);
  },'choice');

  paired('distance-origin','coordinate','원점과 한 점 사이의 거리',r=>{const t=pick(r,[[3,4,5],[5,12,13],[8,15,17]]);return {x:t[0]*pick(r,[-1,1]),y:t[1]*pick(r,[-1,1]),d:t[2]};},(v,l)=>problem(`원점 ${m('O')}와 점 ${named('P',[v.x,v.y])}가 있다.`,[],l==='A'?`${m('OP')}의 길이를 구하시오.`:`원점에서 ${m('P')}까지의 거리의 제곱을 구하시오.`,scalar(l==='A'?v.d:v.d*v.d),['두 좌표의 제곱의 합에 거리 공식을 적용한다.']));
  paired('division-definition','coordinate','선분의 내분의 뜻',r=>({a:rand(r,1,4),b:rand(r,1,4)}),(v,l)=>problem(`점 ${m('P')}는 선분 ${m('AB')}를 ${m(`${v.a}:${v.b}`)}로 내분한다.`,l==='A'?[`AP=${v.a*2}`]:[`AB=${(v.a+v.b)*3}`],l==='A'?`${m('PB')}의 길이를 구하시오.`:`${m('AP')}의 길이를 구하시오.`,scalar(l==='A'?v.b*2:v.a*3),[`${m(`AP:PB=${v.a}:${v.b}`)}이다.`]));
  paired('line-through-two','lines','두 점을 지나는 직선',r=>({h:integer(r),k:integer(r),s:nonzero(r)}),(v,l)=>{
    const q=[v.h+1,v.k+v.s];return problem(`두 점 ${named('P',[v.h,v.k])}, ${named('Q',q)}를 지나는 직선이 있다.`,[],l==='A'?'이 직선의 기울기를 구하시오.':`${m('x=0')}일 때 직선 위의 점의 ${m('y')}좌표를 구하시오.`,scalar(l==='A'?v.s:v.k-v.s*v.h),['두 점의 좌표 차로 기울기를 구하고 한 점을 대입한다.']);
  });
  paired('line-intersection-fixed','lines','두 직선의 교점과 직선',r=>({h:integer(r),k:integer(r),s:nonzero(r)}),(v,l)=>{
    const eq=`y=${shift(`${v.s}(${shift('x',v.h)})`,-v.k)}`;return problem('세 직선이 다음과 같다.',[`x=${v.h}`,`y=${v.k}`,eq],l==='A'?'앞의 두 직선의 교점의 좌표를 구하시오.':`세 번째 직선이 ${m('y')}축과 만나는 점의 ${m('y')}좌표를 구하시오.`,l==='A'?point([v.h,v.k]):scalar(v.k-v.s*v.h),['처음 두 직선의 교점을 구하고 세 번째 방정식에 적용한다.']);
  },'point');
  paired('line-locus','lines','두 점에서 같은 거리에 있는 점의 자취',r=>({h:integer(r),k:integer(r),d:rand(r,1,5)}),(v,l)=>problem(`두 점 ${named('A',[v.h-v.d,v.k])}, ${named('B',[v.h+v.d,v.k])}에서 같은 거리에 있는 점 ${m('P')}가 있다.`,l==='B'?[`P=(t,${v.k+2})`]:[],l==='A'?`점 ${m('P')}의 자취의 방정식이 ${m('x=c')}일 때 ${m('c')}를 구하시오.`:`${m('t')}의 값을 구하시오.`,scalar(v.h),['두 점에서 같은 거리에 있는 점의 자취는 선분의 수직이등분선이다.']));
  paired('circle-three','circles','세 점을 지나는 원',r=>({h:integer(r),k:integer(r),rad:rand(r,1,5)}),(v,l)=>{
    const {h,k,rad}=v;return problem(`세 점 ${named('A',[h+rad,k])}, ${named('B',[h-rad,k])}, ${named('C',[h,k+rad])}를 지나는 원이 있다.`,[],l==='A'?'이 원의 중심의 좌표를 구하시오.':'이 원의 반지름의 제곱을 구하시오.',l==='A'?point([h,k]):scalar(rad*rad),['두 현의 수직이등분선의 교점이 원의 중심이다.']);
  },'point');
  paired('set-subset-laws','sets','부분집합의 성질',r=>({n:rand(r,1,5)}),(v,l,r)=>problem(`공집합이 아닌 집합 ${m('A,B,C')}에 대하여 ${m('A\\subset B')}, ${m('B\\subset C')}이다.`,[],l==='A'?'항상 참인 것을 고르시오.':`추가로 ${m('C=A')}일 때 항상 참인 것을 고르시오.`,l==='A'?choices(r,m('A\\subset C'),[m('C\\subset A'),m('A\\cap B=\\varnothing'),m('A=C')]):choices(r,m('A=B'),[m('A\\ne B'),m('A\\cap C=\\varnothing'),m('A\\not\\subset C')]),['부분집합의 추이성과 양방향 포함을 이용한다.']), 'choice');
  paired('set-cardinality-arithmetic','sets','집합의 원소 수와 포함배제',r=>({a:rand(r,2,8),b:rand(r,2,8),c:rand(r,1,2)}),(v,l)=>problem('두 유한집합의 원소의 개수가 다음과 같다.',[`n(A)=${v.a}`,`n(B)=${v.b}`,l==='A'?`n(A\\cap B)=${v.c}`:`n(A\\cup B)=${v.a+v.b-v.c}`],l==='A'?`${m('n(A\\cup B)')}를 구하시오.`:`${m('n(A\\cap B)')}를 구하시오.`,scalar(l==='A'?v.a+v.b-v.c:v.c),[`${m('n(A\\cup B)=n(A)+n(B)-n(A\\cap B')}이다.`]));
  paired('set-representation','sets','원소나열법과 조건제시법',r=>({n:rand(r,3,6)}),(v,l,r)=>{
    const arr=Array.from({length:v.n},(_,i)=>2*(i+1));return problem(`전체집합은 ${m(`U=\\{1,2,3,4,5,6,7,8,9,10,11,12\\}`)}이다.`,[],l==='A'?`${m('U')}의 원소 중 ${m(2*v.n)} 이하의 짝수 전체의 집합을 구하시오.`:`집합 ${m('A')}의 원소가 ${set(arr).text}일 때 ${m('n(A)')}를 구하시오.`,l==='A'?set(arr):scalar(v.n),['조건을 만족하는 원소를 각각 한 번씩 센다.']);
  },'set');

  paired('circle-pair-position','circles','두 원의 위치 관계',r=>({r:rand(r,4,7),s:rand(r,1,3),kind:rand(r,0,3)}),(v,l,r)=>{
    const {r:R,s:S,kind}=v, distance=[R+S+1,R+S,Math.max(R,S),Math.abs(R-S)][kind];
    const names=['서로 떨어져 있다','외접한다','서로 다른 두 점에서 만난다','내접한다'];
    const count=[0,1,2,1][kind];
    return problem(`반지름이 각각 ${m(R)}, ${m(S)}이고 중심 사이의 거리가 ${m(distance)}인 두 원이 있다.`,[],l==='A'?'두 원의 위치 관계를 고르시오.':'두 원의 공통점의 개수를 구하시오.',l==='A'?choices(r,names[kind],names.filter((_,i)=>i!==kind)):scalar(count),['중심 사이의 거리를 두 반지름의 합과 차에 비교한다.']);
  },'choice');
  paired('set-disjoint','sets','서로소인 두 집합',r=>({n:rand(r,2,6)}),(v,l)=>{
    const A=Array.from({length:v.n},(_,i)=>i+1),B=Array.from({length:v.n},(_,i)=>i+v.n+1);
    return problem('두 집합은 다음과 같다.',[`A=\\{${A.join(',')}\\}`,`B=\\{${B.join(',')}\\}`],l==='A'?`${m('A\\cap B')}를 구하시오.`:`${m('n(A\\cup B)')}를 구하시오.`,l==='A'?set([]):scalar(2*v.n),['공통 원소가 없으면 두 집합은 서로소이다.']);
  },'set');
  paired('set-equality','sets','집합의 상등과 원소',r=>({a:rand(r,1,4),d:rand(r,1,4)}),(v,l)=>{
    const x=v.a+v.d;return problem('두 집합이 서로 같다.',[`\\{${v.a},${x}\\}=\\{${v.a},k\\}`],l==='A'?`${m('k')}의 값을 구하시오.`:`${m('2k+1')}의 값을 구하시오.`,scalar(l==='A'?x:2*x+1),['상등인 두 집합은 원소가 서로 같다.']);
  });
  paired('transform-equation','transformations','직선의 평행이동',r=>({a:nonzero(r),b:integer(r),h:nonzero(r),k:integer(r)}),(v,l)=>{
    const intercept=v.b+v.k-v.a*v.h;return problem(`직선 ${m(`y=${shift(`${v.a}x`,-v.b)}`)}을 ${m('x')}축 방향으로 ${m(v.h)}, ${m('y')}축 방향으로 ${m(v.k)}만큼 평행이동한다.`,[],l==='A'?`이동한 직선의 ${m('y')}절편을 구하시오.`:`이동한 직선의 기울기와 ${m('y')}절편의 합을 구하시오.`,scalar(l==='A'?intercept:v.a+intercept),['이동 후 식에서 x 대신 x에서 이동량을 뺀 값을, y 대신 y에서 이동량을 뺀 값을 대입한다.']);
  });
  paired('transform-reflect-equation','transformations','도형의 대칭이동과 방정식',r=>({a:nonzero(r),b:nonzero(r)}),(v,l)=>{
    const yIntercept=-v.b;return problem(`직선 ${m(`y=${shift(`${v.a}x`,-v.b)}`)}을 ${m('x')}축에 대하여 대칭이동한다.`,[],l==='A'?`이동한 직선의 ${m('y')}절편을 구하시오.`:`이동한 직선의 기울기와 ${m('y')}절편의 합을 구하시오.`,scalar(l==='A'?yIntercept:-v.a+yIntercept),['x축 대칭은 방정식에서 y를 -y로 바꾸어 구한다.']);
  });

  paired('external-tangent','circles','원 밖의 점에서 그은 접선',r=>({u:rand(r,1,4)}),(v,l)=>{
    const {u}=v;return problem(`중심이 ${m('O')}인 원 밖의 점 ${m('P')}에서 그은 접선의 접점을 ${m('T')}라 하자.`,l==='A'?[`OP=${13*u}`,`OT=${5*u}`]:[`OP=${13*u}`,`PT=${12*u}`],l==='A'?`${m('PT')}의 길이를 구하시오.`:`이 원의 반지름을 구하시오.`,scalar((l==='A'?12:5)*u),[`${m('OT')}와 ${m('PT')}는 서로 수직이므로 직각삼각형의 세 변의 관계를 이용한다.`]);
  });
  paired('set-subset-symbol','sets','원소와 부분집합의 관계',r=>({n:rand(r,2,6)}),(v,l,r)=>{
    const A=`A=\\{${v.n},${v.n+2}\\}`;
    const ok=l==='A'?`${v.n}\\in A`:`\\{${v.n}\\}\\subset A`;
    const wrong=l==='A'?[`${v.n+1}\\in A`,`${v.n}\\notin A`,`${v.n+2}\\notin A`]:[`${v.n}\\subset A`,`\\{${v.n+1}\\}\\subset A`,`\\{${v.n},${v.n+1}\\}\\subset A`];
    return problem('집합이 다음과 같다.',[A],'항상 옳은 관계를 고르시오.',choices(r,m(ok),wrong.map(m)),['원소 관계는 대상이 집합의 원소인지, 포함 관계는 집합의 모든 원소가 다른 집합에 속하는지 확인한다.']);
  },'choice');

  paired('venn','sets','벤 다이어그램으로 집합 표현',r=>({a:rand(r,1,6),b:rand(r,1,6),c:rand(r,1,6),d:rand(r,1,6)}),(v,l)=>{
    const question=l==='A'?`${m('n(A\\cap B)')}를 구하시오.`:`${m('n(A\\cup B)+n(A\\cap B)')}를 구하시오.`;
    return {...problem('다음 벤 다이어그램에서 각 영역에 적힌 수는 그 영역의 원소의 개수이다.',[],question,scalar(l==='A'?v.b:v.a+2*v.b+v.c),['각 영역의 원소가 어느 집합에 속하는지 확인한다.']),plot:{kind:'venn',counts:[v.a,v.b,v.c,v.d]}};
  });
  paired('circle-intersection-family','circles','두 원의 교점을 지나는 원',r=>({h:integer(r),k:integer(r),u:rand(r,1,3)}),(v,l)=>{
    const {h,k,u}=v;
    const first=circle(h-3*u,k,5*u),second=circle(h+3*u,k,5*u);
    return problem('서로 다른 두 원의 방정식이 다음과 같다.',[first,second],l==='A'?`공통현이 놓인 직선의 방정식이 ${m('x=a')}일 때 ${m('a')}를 구하시오.`:`두 원의 두 교점을 지나는 원의 방정식이 ${m(`${'(x-a)^2'}+${squared('y',k)}=${16*u*u}`)}일 때 ${m('a')}를 구하시오.`,scalar(h),['두 원의 방정식을 빼면 공통현은 중심 사이의 선분을 수직으로 이등분한다. 교점의 좌표를 나머지 원에 대입한다.']);
  });
  paired('tangent-outside-equation','circles','원 밖의 점에서 그은 접선의 방정식',r=>({u:rand(r,1,3)}),(v,l)=>{
    const {u}=v;return problem(`원점 ${m('O')}를 중심으로 하고 반지름이 ${m(60*u)}인 원 밖의 점 ${named('P',[65*u,0])}에서 원에 접선을 긋는다.`,[],l==='A'?`접점까지의 거리를 구하시오.`:`접선 중 ${m('y')}절편이 양수인 직선의 ${m('y')}절편을 구하시오.`,scalar(l==='A'?25*u:156*u),['접점까지의 거리는 직각삼각형에서 구한다. 접선을 기울기 m인 직선으로 놓고 원점과 직선 사이의 거리를 반지름과 같게 둔다.']);
  });

  paired('reflect-oblique','transformations','기울어진 직선에 대한 대칭이동',r=>({x:integer(r),c:integer(r),d:nonzero(r),sign:pick(r,[-1,1])}),(v,l)=>{
    const {x,c,d,sign}=v,y=sign*x+c+d;
    const image=sign===1?[y-c,x+c]:[c-y,c-x];
    const axis=sign===1?shift('x',-c):shift('-x',-c);
    return problem(l==='A'?`점 ${named('P',[x,y])}를 직선 ${m(`y=${axis}`)}에 대하여 대칭이동한다.`:`두 점 ${named('P',[x,y])}, ${named('Q',image)}가 직선 ${m(`y=${sign===1?'x':'-x'}+a`)}에 대하여 대칭이다.`,[],l==='A'?'이동한 점의 좌표를 구하시오.':`${m('a')}의 값을 구하시오.`,l==='A'?point(image):scalar(c),['두 점을 잇는 선분의 중점이 대칭축 위에 있고, 그 선분과 대칭축은 서로 수직이다.']);
  },'point');

  // A second construction works for general oblique lines ax+by=c.
  for(const level of ['A','B']) {
    const type=ForgeTopics.types[`concept-reflect-oblique-${level.toLowerCase()}`];
    const build=r=>{
      const [a,b]=pick(r,[[1,2],[2,1],[2,3],[3,2],[3,4],[4,3]]),h=integer(r),k=integer(r),t=nonzero(r);
      const P=[h+t*a,k+t*b],Q=[h-t*a,k-t*b],c=a*h+b*k,expr=linear(a,'x',b,'y');
      return problem(level==='A'?`점 ${named('P',P)}를 직선 ${m(`${expr}=${c}`)}에 대하여 대칭이동한다.`:`두 점 ${named('P',P)}, ${named('Q',Q)}가 직선 ${m(`${expr}=c`)}에 대하여 대칭이다.`,[],level==='A'?'이동한 점의 좌표를 구하시오.':`${m('c')}의 값을 구하시오.`,level==='A'?point(Q):scalar(c),['이동 전후의 두 점을 잇는 선분의 중점은 대칭축 위에 있고, 선분은 대칭축에 수직이다.']);
    };
    type.variants.push({...type.variants[0],id:'general-line',label:'일반형 직선에 대한 대칭',build});
  }
  // Explicitly classified as textbook supplements in the supplied scope.
  const plusNames=['median-theorem','line-fixed','line-locus','line-parallel-distance','circle-radical-axis','circle-intersection-family','circle-three','circle-locus','circle-pair-position','tangent-outside-equation','external-tangent','reflect-center','reflect-line','reflect-oblique','set-symmetric'];
  for(const name of plusNames)for(const level of ['a','b']){
    const t=ForgeTopics.types[`concept-${name}-${level}`]; if(t)t.plus=true;
  }
  for(const id of ['concept-line-intersection-fixed-b','concept-set-required-b']) ForgeTopics.types[id].plus=true;
  for(const id of ['parallel-lines-distance','line-through-intersection','circle-three-points','distance-locus','symmetric-difference']) if(ForgeTopics.types[id])ForgeTopics.types[id].plus=true;
})();


;

/* line-compiler.js */
(() => {
  "use strict";

  const {m, rand, pick, symbols, separatingCondition, signed, scalar, point, problem, term, linear} = ForgeTopics;
  const rows = (relation, terms, constant = 0) => ({relation, terms, constant});
  const onLine = (a,b,x,y,c) => rows("점과 직선의 관계", {[x]:a,[y]:b,[c]:-1});
  const combine = (a,b,x,y,z) => rows("두 값의 일차식", {[x]:a,[y]:b,[z]:-1});
  const through = (x,y) => '('+x+','+y+')';
  const slope = r => signed(r,3);
  const small = r => rand(r,-4,4);
  const seedValues = (r, keys) => Object.fromEntries(keys.map(k=>[k,small(r)]));
  const standardLine = (a,b,c) => linear(a,"x",b,"y")+"="+c;
  function lineRenderer(r, transformations) {
    return (a,b,c,{scale=pick(r,[1,1,2,3]),form=pick(r,["standard","x","y"]),nativeConstant=false}={})=>{
      const constant=typeof c==="number"?c*scale:nativeConstant?c:term(scale,c);
      const A=a*scale, B=b*scale;
      const withConstant=(prefix)=>constant===0?prefix:prefix+(String(constant).startsWith("-")?"":"+")+constant;
      const expression=form==="y"?term(B,"y")+"="+withConstant(term(-A,"x"))
        :form==="x"?term(A,"x")+"="+withConstant(term(-B,"y"))
        :standardLine(A,B,constant);
      if(scale!==1||form!=="standard") transformations.push({expression,scale,form});
      return expression;
    };
  }
  const math = x => m(String(x));

  // Reduced row echelon form. A variable is determined only when its row has
  // no free variables. All generated coefficients and witnesses are bounded integers.
  function solve(relations, known) {
    const equations = [...relations,...Object.entries(known).map(([key,value])=>rows("",{[key]:1},value))];
    const keys = [...new Set(equations.flatMap(row=>Object.keys(row.terms)))];
    const matrix = equations.map(row=>[...keys.map(k=>row.terms[k]??0),row.constant]);
    const pivots = [];
    const nonzero = x => Math.abs(x)>1e-9;
    let rank=0;
    for(let c=0;c<keys.length;c++) {
      const i=matrix.findIndex((row,j)=>j>=rank&&nonzero(row[c]));
      if(i<0) continue;
      [matrix[rank],matrix[i]]=[matrix[i],matrix[rank]];
      const pivot=matrix[rank].map(x=>x/matrix[rank][c]);
      matrix[rank]=pivot;
      matrix.forEach((row,j)=>{if(j!==rank&&nonzero(row[c]))matrix[j]=row.map((x,k)=>x-row[c]*pivot[k]);});
      pivots.push(c);
      rank++;
    }
    if(matrix.some(row=>!row.slice(0,-1).some(nonzero)&&nonzero(row.at(-1)))) return null;
    const values={};
    pivots.forEach((c,i)=>{
      if(matrix[i].slice(0,-1).filter(nonzero).length===1) {
        const value=matrix[i].at(-1);
        values[keys[c]]=Math.abs(value-Math.round(value))<1e-9?Math.round(value):value;
      }
    });
    return values;
  }

  const single=(key,label)=>({keys:[key],label});
  const pair=(x,y,label)=>({keys:[x,y],label});
  const fieldNames={x:"가로 좌표",y:"세로 좌표",u:"중간값",v:"함숫값",p:"가로 좌표",q:"세로 좌표",
    c:"직선식의 상수항",d:"두 직선 사이의 거리",b:"절편",m:"기울기",f:"점과 직선 사이 거리",j:"두 번째 직선의 상수항",
    w:"일차식의 값",e:"세 번째 직선의 상수항"};
  function route(known,target,question,render,seed,relations,conditions=[]) {
    return {known,target,question,render,seed,relations,conditions};
  }

  function incidence(r, names, mode, line) {
    const [a,b]=[slope(r),slope(r)], [x,y]=names;
    const target=mode==="constant"?single("c","상수항"):mode==="x"?single("x","가로 좌표"):single("y","세로 좌표");
    const given=target.keys[0]==="c"?["x","y"]:["c",target.keys[0]==="x"?"y":"x"];
    return route(given,target,`${math(target.keys[0]==="c"?"k":target.keys[0]==="x"?x:y)}의 값을 구하시오.`,v=>{
      const c=given.includes("c")?v.c:"k";
      return [`점 ${math("P"+through(given.includes("x")?v.x:x,given.includes("y")?v.y:y))}는 다음 직선 위에 있다.`,[line(a,b,c)]];
    },()=>seedValues(r,["x","y"]),[onLine(a,b,"x","y","c")],["가로·세로 좌표의 계수는 모두 0이 아니다."]);
  }

  function twoPoints(r,names,mode) {
    const x1=small(r), x2=x1+rand(r,1,4);
    const target=mode==="slope"?single("m","기울기"):mode==="intercept"?single("b","y절편"):pair("m","b","기울기와 y절편");
    const question=target.keys.length===2?`이 직선이 ${math("y="+names[0]+"x+"+names[1])}일 때 ${math(through(...names))}를 구하시오.`:`이 직선의 ${target.label === "기울기" ? "기울기를" : math("y")+"절편을"} 구하시오.`;
    return route(["y","q"],target,question,v=>[`두 점 ${math("A"+through(x1,v.y))}, ${math("B"+through(x2,v.q))}를 지나는 직선이 있다.`,[]],
      ()=>seedValues(r,["m","b"]),[rows("첫째 점을 직선식에 대입",{m:x1,b:1,y:-1}),rows("둘째 점을 직선식에 대입",{m:x2,b:1,q:-1})],["두 점의 가로 좌표가 서로 다르다."]);
  }

  function crossing(r,names,mode,line) {
    const a=slope(r), b=a+signed(r,2);
    const edges=[onLine(a,-1,"x","y","c"),onLine(b,-1,"x","y","j")];
    const given=["c","j"];
    let target=mode==="x"?single("x","교점의 가로 좌표"):mode==="y"?single("y","교점의 세로 좌표"):pair("x","y","교점의 좌표");
    let question=`두 직선의 교점의 ${mode==="x"?math("x"):mode==="y"?math("y"):""}좌표를 구하시오.`;
    if(mode==="parallel"||mode==="perpendicular") {
      const thirdSlope=Math.max(a,b)+1;
      const normal=mode==="parallel"?[-thirdSlope,1]:[1,a];
      edges.push(onLine(...normal,"x","y","e"));
      target=single("e","세 번째 직선의 상수항");
      const [parameter,coefficient]=names;
      const equation=math((mode==="parallel"?"y":term(a,"y"))+"="+coefficient+"x+"+parameter);
      if(mode==="perpendicular"&&r()<.55) {
        question=`두 직선의 교점을 지나는 직선 ${equation}과 첫째 직선의 기울기의 곱이 ${math(-1)}일 때, ${math(parameter)}의 값을 구하시오.`;
      } else {
        const relation=mode==="parallel"?`기울기가 ${math(thirdSlope)}이다.`:"첫째 직선과 수직이다.";
        question=`직선 ${equation}은 두 직선의 교점을 지나고 ${relation} ${math(parameter)}의 값을 구하시오.`;
      }
    } else if(mode==="inverse") {
      given.splice(1,1,"x");
      target=single("j","둘째 직선의 상수항");
      question=`둘째 직선의 식에서 ${math(names[0])}의 값을 구하시오.`;
    }
    return route(given,target,question,v=>[mode==="inverse"?`두 직선의 교점의 ${math("x") }좌표는 ${math(v.x)}이다.`:"다음 두 직선이 있다.",
      [line(a,-1,v.c),line(b,-1,mode==="inverse"?names[0]:v.j)]],
      ()=>seedValues(r,["x","y"]),edges,["두 직선의 기울기가 서로 달라 교점이 하나이다."]);
  }

  function serial(r,names,mode,line) {
    const a=slope(r),b=slope(r), x=small(r);
    const given=mode==="inverse"?["v","c","j"]:["x","c","j"];
    const target=mode==="inverse"?single("x","처음 가로 좌표"):single("v","마지막 세로 좌표");
    return route(given,target,`${math(mode==="inverse"?names[0]:names[1])}의 값을 구하시오.`,v=>[
      `첫째 직선 위의 점의 가로 좌표가 ${math(mode==="inverse"?names[0]:v.x)}이다. 그 점의 세로 좌표를 둘째 직선 위의 점의 가로 좌표로 놓았더니, 둘째 점의 세로 좌표는 ${math(mode==="inverse"?v.v:names[1])}이다.`,
      [line(a,-1,v.c),line(b,-1,v.j)]],
      ()=>({x,u:small(r),v:small(r)}),[onLine(a,-1,"x","u","c"),onLine(b,-1,"u","v","j")],["첫째 직선의 세로 좌표와 둘째 직선의 가로 좌표가 같다."]);
  }

  function parallelBranches(r,names,mode,line) {
    const a=slope(r), b=slope(r), c=pick(r,[-1,1]), d=pick(r,[-1,1]);
    const form=linear(c,names[0],d,names[1]);
    const inverse=mode==="inverse";
    return route(inverse?["x","p","c","w"]:["x","p","c","j"],inverse?single("j","둘째 직선의 상수항"):single("w","일차식의 값"),
      inverse?`${math(names[2])}의 값을 구하시오.`:`${math(form)}의 값을 구하시오.`,v=>[
      `첫째 직선과 둘째 직선에서 ${math("x")}좌표가 각각 ${math(v.x)}, ${math(v.p)}인 점의 ${math("y")}좌표를 각각 ${math(names[0])}, ${math(names[1])}라 하자.${inverse?` ${math(form+"="+v.w)}이다.`:""}`,
      [line(a,-1,v.c),line(b,-1,inverse?names[2]:v.j)]],
      ()=>{
        const w=mode==="zero"?0:small(r);
        const candidates=[-4,-3,-2,-1,0,1,2,3,4].filter(y=>Math.abs((w-c*y)/d)<=4);
        return {...seedValues(r,["x","p"]),y:pick(r,candidates),w};
      },[onLine(a,-1,"x","y","c"),onLine(b,-1,"p","q","j"),combine(c,d,"y","q","w")],
      ["두 직선에서 구한 세로 좌표를 같은 일차식에 대입한다.",...(mode==="zero"?["출력값이 0이 되도록 두 값을 구성한다."]:[])]);
  }

  function projection(r,names,mode,line) {
    const a=slope(r), distance=signed(r,3);
    const target=mode==="x"?single("x","수선의 발의 가로 좌표"):mode==="y"?single("y","수선의 발의 세로 좌표"):pair("x","y","수선의 발의 좌표");
    return route(["c","p","q"],target,`점 ${math("P")}에서 이 직선에 내린 수선의 발의 ${mode==="x"?math("x"):mode==="y"?math("y"):""}좌표를 구하시오.`,v=>[
      `점 ${math("P"+through(v.p,v.q))}와 다음 직선이 있다.`,[line(a,-1,v.c)]],
      ()=>{const {x,y}=seedValues(r,["x","y"]);return {x,y,p:x+a*distance,q:y-distance};},
      [onLine(a,-1,"x","y","c"),rows("수선에 있는 두 점의 관계",{x:1,y:a,p:-1,q:-a})],["수선의 발은 주어진 직선 위에 있고, 연결선은 그 직선과 수직이다."]);
  }

  function normalWithIntegerLength(r) {
    const u=rand(r,2,4), v=rand(r,1,u-1);
    const a=u*u-v*v, b=2*u*v, n=u*u+v*v;
    return r()<.5?[a,b,n]:[b,a,n];
  }

  function axisIntercept(r,names,mode,line) {
    const a=slope(r), b=slope(r);
    const horizontal=mode==="x-intercept", key=horizontal?"x":"y";
    return route(["c"],single(key,horizontal?"x절편":"y절편"),
      `다음 직선의 ${math(key)}절편을 구하시오.`,v=>["",[line(a,b,v.c)]],
      ()=>({x:horizontal?small(r):0,y:horizontal?0:small(r)}),
      [onLine(a,b,"x","y","c"),rows("좌표축 위의 점",{[horizontal?"y":"x"]:1})],
      ["좌표축 위에서는 다른 한 좌표가 0이다."]);
  }

  function pointDistance(r,names,mode,line) {
    const [a,b,n]=normalWithIntegerLength(r), sign=r()<.5?-1:1;
    const inverse=mode==="inverse", symbol=names[0];

    return route(inverse?["x","y","f"]:["x","y","c"],
      inverse?single("c","직선식의 상수항"):single("f","점과 직선 사이 거리"),
      inverse?`${math(symbol)}의 값을 구하시오.`:"점과 직선 사이의 거리를 구하시오.",v=>{
        const p=math("P"+through(v.x,v.y));
        const condition=inverse?separatingCondition(symbol,v.c,2*(a*v.x+b*v.y)-v.c):null;
        const intro=inverse
          ? condition.phrase&&r()<.75
            ? `점 ${p}에서 직선까지의 거리는 ${math(v.f)}이다. ${condition.phrase}에 대하여 직선의 방정식은 다음과 같다.`
            : `점 ${p}에서 다음 직선까지의 거리는 ${math(v.f)}이다. 단, ${math(condition.math)}이다.`
          : `점 ${p}와 다음 직선이 있다.`;
        return [intro,[line(a,b,inverse?symbol:v.c)]];
      },
      ()=>({...seedValues(r,["x","y"]),f:rand(r,1,5)}),
      [rows("점과 직선 사이의 거리",{c:1,x:-a,y:-b,f:-sign*n})],
      [inverse?"상수항의 범위가 거리식의 절댓값 부호를 결정한다.":"거리의 절댓값을 취해 양수로 나타낸다."]);
  }

  function parallelDistance(r,names,mode,line) {
    const inverse=mode==="inverse", symbol=names[0];
    const radical=inverse&&r()<.65;
    const [a,b,n]=radical?[rand(r,1,3),1,0]:normalWithIntegerLength(r);
    const normSquared=a*a+b*b;
    const gapFactor=radical?normSquared:n;
    const length=radical?String.raw`\sqrt{${normSquared}}`:String(n);
    const distance=value=>radical?(value===1?"":value)+length:String(value);
    const secondScale=inverse?rand(r,2,3):1;
    const sign=r()<.5?-1:1;
    const distanceRow=rows("법선을 맞춘 두 평행선의 거리",{j:1,c:-secondScale,d:-sign*secondScale*gapFactor});
    const bound=w=>separatingCondition(symbol,w.j,2*secondScale*w.c-w.j);
    const model=route(inverse?["c","d"]:["c","j"],
      inverse?single("j","둘째 직선의 상수항"):single("d","두 직선 사이의 거리"),
      inverse?`${math(symbol)}의 값을 구하시오.`:"두 직선 사이의 거리를 구하시오.",w=>{
        const condition=inverse?bound(w):null;
        const intro=inverse
          ? condition.phrase&&r()<.75
            ? `두 평행선 사이의 거리는 ${math(distance(w.d))}이다. ${condition.phrase}에 대하여 두 직선의 방정식은 다음과 같다.`
            : `두 평행선 사이의 거리는 ${math(distance(w.d))}이다. 단, ${math(condition.math)}이다.`
          : "다음 두 평행선이 있다.";
        return [intro,[line(a,b,w.c),line(a,b,inverse?symbol:w.j,{scale:secondScale,nativeConstant:inverse})]];
      },
      ()=>({c:small(r),d:rand(r,1,3)}),[distanceRow],
      ["두 직선의 법선 벡터를 맞춘 후 상수항의 차를 사용한다.",
        ...(inverse?["주어진 부등식으로 절댓값의 부호를 결정한다."]:[])]);
    model.labels=radical?{d:"거리를 나타낸 근호식의 계수"}:{};
    model.explain=w=>{
      const first=`첫째 직선을 ${math(standardLine(a,b,w.c))} 꼴로 정리한다.`;
      const secondConstant=inverse?String.raw`\frac{${symbol}}{${secondScale}}`:String(w.j);
      const second=`둘째 직선을 ${math(standardLine(a,b,secondConstant))} 꼴로 정리한다.`;
      const difference=secondConstant+(w.c<0?"+"+Math.abs(w.c):w.c>0?"-"+w.c:"");
      const formula=String.raw`\frac{\left|${difference}\right|}{${length}}`;
      return [first,second,inverse
        ? `거리 공식에서 ${math(formula+"="+distance(w.d))}이다. ${math(bound(w).math)}를 만족하는 값은 ${math(symbol+"="+w.j)}이다.`
        : `거리 공식으로 ${math(formula+"="+distance(w.d))}이다.`];
    };
    return model;
  }

  const plans={
    "a-point-on-line":{level:"A",label:"직선 위 점의 좌표",make:incidence,modes:["x","y"]},
    "a-line-intercept-from-equation":{level:"A",label:"직선의 절편",make:axisIntercept,modes:["x-intercept","y-intercept"]},
    "a-point-line-distance":{level:"A",label:"점과 직선 사이의 거리",make:pointDistance,modes:["distance"]},
    "a-slope":{level:"A",label:"두 점 사이의 기울기",make:twoPoints,modes:["slope"]},
    "a-line-from-point-slope":{level:"A",label:"직선식의 상수항",make:incidence,modes:["constant"]},
    "concept-line-parallel-distance-a":{level:"A",label:"두 평행선 사이의 거리",make:parallelDistance,modes:["distance"]},
    "line-intersection":{level:"B",label:"두 직선의 교점",make:crossing,modes:["point","x","y","inverse"]},
    "parallel-line":{level:"B",label:"평행 조건과 직선식",make:crossing,modes:["parallel"]},
    "perpendicular-line":{level:"B",label:"수직 조건과 직선식",make:crossing,modes:["perpendicular"]},
    "distance-line-parameter":{level:"B",label:"거리로 직선의 상수항 구하기",make:pointDistance,modes:["inverse"]},
    "line-projection":{level:"B",label:"직선에 내린 수선",make:projection,modes:["point","x","y"]},
    "parallel-lines-distance":{level:"B",label:"평행선 사이 거리 응용",make:parallelDistance,modes:["inverse"]},
    "line-compiler-chain":{level:"B",label:"두 직선의 직렬 연결",make:serial,modes:["forward","inverse"]},
    "line-compiler-aggregate":{level:"B",label:"두 직선의 값 결합",make:parallelBranches,modes:["forward","zero","inverse"]},
    "line-compiler-coefficients":{level:"B",label:"두 점에서 직선식 복원",make:twoPoints,modes:["pair"]},
  };
  const modes={x:"가로 좌표",y:"세로 좌표",point:"두 좌표",slope:"기울기",intercept:"절편",
    constant:"상수항","x-intercept":"x절편","y-intercept":"y절편",distance:"거리",inverse:"입력 역산",parallel:"평행 직선",perpendicular:"수직 직선",
    forward:"출력 계산",zero:"값의 상쇄",pair:"계수 순서쌍"};

  function compile(type,{rng=Math.random,avoidPaths=[],mode,format}={}) {
    const def=plans[type];
    if(!def)throw new RangeError("Unknown line relation");
    if(mode&&!def.modes.includes(mode))throw new RangeError("Unknown line path");
    const recent=avoidPaths.slice(-32);
    const options=(mode?[mode]:def.modes).flatMap(path=>(format?[format]:["written","choice"]).map(kind=>({path,kind,id:"line/"+path+"|"+kind})));
    const counts=options.map(o=>recent.filter(id=>id===o.id).length);
    const plan=pick(rng,options.filter((_,i)=>counts[i]===Math.min(...counts)));
    const parameters=symbols.constants(rng,3);
    const transformations=[];
    const model=def.make(rng,parameters,plan.path,lineRenderer(rng,transformations));
    const seeds=model.seed();
    const values=solve(model.relations,seeds);
    const given=Object.fromEntries(model.known.map(key=>[key,values?.[key]]));
    if(!Object.values(given).every(Number.isSafeInteger))throw new Error("Construction did not determine all givens");
    const verified=solve(model.relations,given);
    const results=model.target.keys.map(key=>verified?.[key]);
    if(!results.every((value,i)=>Number.isSafeInteger(value)&&value===values[model.target.keys[i]]))throw new Error("Answer is not uniquely determined by givens");
    const [intro,expressions]=model.render(values);
    const answer=results.length===1?scalar(results[0]):point(results);
    const display=key=>model.labels?.[key]??fieldNames[key]??key;
    const steps=model.relations.map(row=>{
      const expression=Object.entries(row.terms).filter(([,factor])=>factor!==0).map(([key,factor],i)=>
        `${i&&factor>0?"+":""}${term(factor,key)}`).join("");
      return `${row.relation}에서 ${math(expression+"="+row.constant)}이다.`;
    });
    const solution=model.explain?.(values)??[...steps,`주어진 값을 대입하여 정리하면 ${math(results.join(","))}을 얻는다.`];
    const draft=problem(intro,expressions,model.question,answer,solution);
    if (results.length===2 && plan.path==="pair") draft.answerLabels=parameters.slice(0,2);
    const output=ForgeVariations.present(draft,plan.kind,rng);
    return {
      ...output,type,level:def.level,format:"tex",template:def.label,
      resultType:{baseType:results.length===1?"Scalar":"Point"},
      answerPath:{id:plan.id,label:modes[plan.path],operations:model.relations.map(row=>row.relation)},
      answerConstraints:model.conditions.join(" "),
      parameters:given, actionHistory:transformations,
      inspection:{
        symbols:parameters, presentation:output.answer.kind==="choice"?"선택형":"서답형",
        relations:model.relations.map(row=>({label:row.relation,terms:row.terms,constant:row.constant})),
        variables:Object.entries(values).map(([key,value])=>({key,label:display(key),value,
          given:Object.hasOwn(given,key),target:model.target.keys.includes(key),seed:Object.hasOwn(seeds,key)})),
        conditions:model.conditions, verified:true, target:model.target.label,
      },
    };
  }
  ForgeLineCompiler = globalThis.ForgeLineCompiler = Object.freeze({plans,modes,compile});
})();


;

/* plane-concept-compiler.js */
(() => {
  "use strict";
  const {m,problem,scalar,point,coord,linear,shift,term,pick,rand,signed}=ForgeTopics;
  const add=(a,b)=>a.map((x,i)=>x+b[i]);
  const mul=(a,n)=>a.map(x=>x*n);
  const sub=(a,b)=>add(a,mul(b,-1));
  const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
  const pair=p=>m(coord(p));
  const at=(name,p)=>m(name+coord(p));
  const equation=({normal:[a,b],c})=>b===-1?"y="+(a?shift(term(a,"x"),c):String(-c)):linear(a,"x",b,"y")+"="+c;
  const through=(p,normal)=>({normal,c:dot(p,normal)});
  const slopeLine=(p,s)=>through(p,[s,-1]);
  const twoPointLine=(p,q)=>{const [dx,dy]=sub(q,p);return through(p,[dy/dx,-1]);};
  const evaluate=(L,x)=>(L.c-L.normal[0]*x)/L.normal[1];
  const evaluateX=(L,y)=>(L.c-L.normal[1]*y)/L.normal[0];
  const meet=(L,M)=>{
    const [a,b]=L.normal,[c,d]=M.normal, det=a*d-b*c;
    if(!det)throw Error("교점이 유일해야 한다.");
    return [(d*L.c-b*M.c)/det,(a*M.c-c*L.c)/det];
  };
  const between=(a,b,p,q)=>add(mul(a,q),mul(b,p)).map(x=>x/(p+q));
  const show=value=>Array.isArray(value)?coord(value):typeof value==="object"?equation(value):String(value);
  const recipes={};

  function compiler(rng,concept,format) {
    const kind=pick(rng,["x","y","sum","point"]);
    const [u,v]=pick(rng,[["a","b"],["p","q"],["u","v"]]);
    const nodes=[], explanations=new Map(), evaluators=new Map();
    const create=(label,value,operation,parents=[],explain)=>{
      const depth=parents.length?1+Math.max(...parents.map(parent=>parent.depth)):0;
      const node={id:"n"+nodes.length,label,operation,value,math:show(value),from:parents.map(parent=>parent.id),depth};
      nodes.push(node);
      if(explain)explanations.set(node.id,explain(value));
      return node;
    };
    const given=(label,value)=>create(label,value,"given");
    const run=(operation,label,parents,fn,explain)=>{
      const node=create(label,fn(...parents.map(parent=>parent.value)),operation,parents,explain);
      evaluators.set(node.id,fn);
      return node;
    };
    const mk=()=>[rand(rng,-5,5),rand(rng,-5,5)];
    const finish=(intro,node,subject="구한 점",knownAxis)=>{
      let target=node, question;
      if(!Array.isArray(node.value))question=subject+(/(?:좌표|넓이|개수)$/.test(subject)?"를 구하시오.":"의 값을 구하시오.");
      else if(kind==="point"&&knownAxis===undefined)question=subject+"의 좌표를 구하시오.";
      else {
        const i=knownAxis===undefined?(kind==="x"?0:1):1-knownAxis;
        const sum=kind==="sum"&&knownAxis===undefined;
        const label=sum?u+"+"+v:["x","y"][i];
        target=run(sum?"sum":"coordinate","좌표에서 요구한 값 계산",[node],p=>sum?p[0]+p[1]:p[i],
          value=>`${m(label+"="+value)}이다.`);
        question=sum?`${subject}의 좌표를 ${pair([u,v])}라 할 때, ${m(label)}의 값을 구하시오.`
          :`${subject}의 ${m(label)}좌표를 구하시오.`;
      }
      const needed=new Set([target.id]);
      for(const node of nodes.slice().reverse())if(needed.has(node.id))node.from.forEach(id=>needed.add(id));
      const used=nodes.filter(node=>needed.has(node.id));
      const replayed=new Map(), graph=[];
      for(const node of used) {
        const fn=evaluators.get(node.id);
        const value=fn?fn(...node.from.map(id=>replayed.get(id))):node.value;
        if(JSON.stringify(value)!==JSON.stringify(node.value))throw Error("연산의 재계산 값이 일치하지 않습니다.");
        replayed.set(node.id,value);
        (graph[node.depth]??=[]).push(node);
      }
      const solution=used.flatMap(node=>explanations.has(node.id)?[explanations.get(node.id)]:[]);
      if(![target.value].flat().every(Number.isSafeInteger))throw Error("정수 답 구성에 실패했습니다.");
      const answer=Array.isArray(target.value)?point(target.value):scalar(target.value);
      const result=ForgeVariations.present(problem(intro,[],question,answer,solution),format??pick(rng,["written","choice"]),rng);
      const operations=used.filter(n=>n.operation!=="given").map(n=>n.operation);
      return {...result,format:"tex",answerPath:{id:"composition/"+operations.join("-")+"|"+(result.answer.kind==="choice"?"choice":"written"),
        label:"관계 합성",operations},
        inspection:{graph,conditions:["공개 조건으로 중간 결과를 구한 뒤 다음 관계에 연결한다."],
          variables:[{key:target.label,label:"구할 값",value:show(target.value),target:true}],
          verified:true,environment:"geometry"}};
    };
    const ctx={rng,given,run,mk,finish};
    return recipes[concept](ctx);
  }

  // Reusable inverse steps. Both scalar positions and planar coordinates
  // can be composed with a ratio, and the same line node can feed a section
  // construction, an evaluation, an intersection, or a distance.
  function divide(ctx,A,B,p,q) {
    return ctx.run("section","내분점",[A,B,p,q],(a,b,r,s)=>between(a,b,r,s),x=>`내분 공식을 적용하면 내분점은 ${pair(x)}이다.`);
  }
  function lineFrom(ctx,P,S) {
    return ctx.run("lineFromPointSlope","한 점과 기울기로 직선 결정",[P,S],slopeLine,L=>`직선의 방정식은 ${m(equation(L))}이다.`);
  }
  function intersection(ctx,L,M) {
    return ctx.run("intersectLines","두 직선의 교점",[L,M],meet,p=>`두 식을 연립하면 교점은 ${pair(p)}이다.`);
  }
  function evaluatePoint(ctx,L,X,axis=0) {
    return ctx.run("evaluateLine","직선 위 점의 좌표 결정",[L,X],(line,t)=>axis?[evaluateX(line,t),t]:[t,evaluate(line,t)],
      p=>`주어진 좌표를 직선의 식에 대입하면 ${pair(p)}이다.`);
  }
  function scalarFinish(ctx,intro,label,node) {
    return ctx.finish(intro,node,label);
  }

  const cross=(u,v)=>u[0]*v[1]-u[1]*v[0];
  const triangleArea=(a,b,c)=>Math.abs(cross(sub(b,a),sub(c,a)))/2;
  const parallelogramVertex=(a,b,c)=>add(a,sub(c,b));
  const centroid=(a,b,c)=>add(add(a,b),c).map(value=>value/3);

  // A planar result can feed several independent constructions. Auxiliary
  // points are placed backwards so the intended answer is a small integer.
  const pointExtensions={
    area(ctx,P,intro,name) {
      const p=P.value, width=signed(ctx.rng,4), height=signed(ctx.rng,4);
      const a=add(p,[0,height]), b=add(a,[2*width,0]);
      const A=ctx.given("밑변의 한 끝점",a), B=ctx.given("밑변의 다른 끝점",b);
      const result=ctx.run("triangleArea","삼각형의 넓이",[A,B,P],triangleArea,
        value=>`밑변의 길이와 높이를 곱해 반으로 나누면 ${m(value)}이다.`);
      return ctx.finish(intro+` 두 점 ${at("S",a)}, ${at("T",b)}가 있다.`,result,"삼각형 "+m(name+"ST")+"의 넓이");
    },
    parallelogram(ctx,P,intro,name,knownAxis) {
      const p=P.value, u=[signed(ctx.rng,4),0], v=[signed(ctx.rng,3),signed(ctx.rng,4)];
      const a=add(p,u), b=add(a,v);
      const A=ctx.given("평행사변형의 두 번째 꼭짓점",a), B=ctx.given("평행사변형의 세 번째 꼭짓점",b);
      const Q=ctx.run("parallelogramVertex","평행사변형의 꼭짓점 결정",[P,A,B],parallelogramVertex,
        value=>`마주 보는 변의 좌표 변화량이 같으므로 나머지 꼭짓점은 ${pair(value)}이다.`);
      return ctx.finish(intro+` 네 점 ${m(name)}, ${at("S",a)}, ${at("T",b)}, ${m("U")}는 이 순서대로 평행사변형의 꼭짓점이다.`,Q,"점 "+m("U"),knownAxis);
    },
    centroid(ctx,P,intro,name,knownAxis) {
      const p=P.value, u=signed(ctx.rng,3), v=signed(ctx.rng,3);
      const a=add(p,[3*u,0]), b=add(p,[0,3*v]);
      const G=ctx.run("centroid","삼각형의 무게중심",[P,ctx.given("두 번째 꼭짓점",a),ctx.given("세 번째 꼭짓점",b)],centroid,
        value=>`세 꼭짓점의 좌표를 각각 평균 내면 무게중심은 ${pair(value)}이다.`);
      return ctx.finish(intro+` 두 점 ${at("S",a)}, ${at("T",b)}가 있다.`,G,"삼각형 "+m(name+"ST")+"의 무게중심",knownAxis);
    },
    inequalities(ctx,P,intro,name) {
      const [x,y]=P.value;
      const lower=ctx.run("add","두 좌표의 합",[P],([a,b])=>a+b);
      const offset=2*y-x+rand(ctx.rng,3,8);
      const upper=ctx.run("subtract","좌표로 정한 위쪽 경계",[P,ctx.given("부등식의 상수항",offset)],([a,b],n)=>2*a-b+n);
      const count=ctx.run("intersectIntegerBounds","연립부등식을 만족하는 정수의 개수",[lower,upper],(a,b)=>Math.max(0,b-a-1),
        value=>`두 좌표를 대입하면 ${m((x+y)+"<k<"+(2*x-y+offset))}이다. 이 범위의 정수는 ${m(value)}개이다.`);
      return ctx.finish(intro+` 점 ${m(name)}의 좌표를 ${pair(["a","b"])}라 하자. ${m("a+b<k<"+shift("2a-b",-offset))}이다.`,count,"정수 "+m("k")+"의 개수");
    },
    expression(ctx,P,intro,name) {
      const [x,y]=P.value;
      const c=x===0?pick(ctx.rng,[-2,-1,1,2]):0;
      const d=y===0?pick(ctx.rng,[-2,-1,1,2]):0;
      const label="("+shift("a+b",-(c+d))+")^2-("+shift("a-b",-(c-d))+")^2";
      const factored="4"+(c?"("+shift("a",-c)+")":"a")+(d?"("+shift("b",-d)+")":"b");
      const result=ctx.run("evaluateIdentity","곱셈 공식으로 식의 값 계산",[P],([a,b])=>4*(a+c)*(b+d),
        value=>`곱셈 공식으로 ${m(label+"="+factored)}이고, 구한 좌표를 대입하면 ${m(value)}이다.`);
      return ctx.finish(intro+` 점 ${m(name)}의 좌표를 ${pair(["a","b"])}라 하자.`,result,m(label));
    },
    linearSystem(ctx,P,intro,name) {
      const [x,y]=P.value, k=signed(ctx.rng,4);
      const total=2*x+y+k, difference=x-y;
      const V=ctx.given("가중합",total), D=ctx.given("두 미지수의 차",difference);
      const K=ctx.run("solveLinearSystem","세 미지수의 연립방정식",[P,V,D],([x,y],s,d)=>{
        // Recover u and v from the first two equations before solving for w.
        const v=(x+2*y-d)/3, u=v+d;
        return s-2*u-v;
      },value=>`두 식을 연립하면 ${m("u="+x)}, ${m("v="+y)}이다. 마지막 식에 대입하면 ${m("w="+value)}이다.`);
      return ctx.finish(intro+` 점 ${m(name)}의 좌표를 ${pair(["a","b"])}라 하자. 세 실수 ${m("u,v,w")}는 ${m("u+2v=a+2b")}, ${m("u-v="+difference)}, ${m("2u+v+w="+total)}을 만족시킨다.`,K,m("w"));
    },
  };

  function finishPoint(ctx,intro,node,name,knownAxis) {
    const extensions=Object.values(pointExtensions);
    if(ctx.rng()<.55)return pick(ctx.rng,extensions)(ctx,node,intro,name,knownAxis);
    return ctx.finish(intro,node,"점 "+m(name),knownAxis);
  }

  recipes["a-number-line-distance"]=ctx=>{
    const {rng,given,run}=ctx;
    const a=rand(rng,-6,6), r=rand(rng,2,7), s=pick(rng,[-1,1]), b=a+s*r;
    const c=b-s*rand(rng,1,r-1);
    const A=given("점 A의 좌표",a), R=given("AB의 길이",r), C=given("점 C의 좌표",c);
    const intro=`수직선 위의 점 ${m("A("+a+")")}, ${m("C("+c+")")}가 있다. 선분 ${m("AB")}의 길이는 ${m(r)}이고 점 ${m("C")}는 선분 ${m("AB")}의 내부에 있다.`;
    const roots=run("distanceInverse","거리 조건의 두 후보",[A,R],(x,d)=>[x-d,x+d]);
    const B=run("selectByPosition","위치 조건으로 끝점 결정",[roots,A,C],(roots,x,z)=>roots.find(v=>(v-z)*(z-x)>0),
      x=>`거리 조건의 두 후보 중 점 ${m("C")}를 지나 더 멀리 있는 쪽은 ${m("B("+x+")")}이다.`);
    if(rng()<.5)return scalarFinish(ctx,intro,"점 "+m("B")+"의 좌표",B);
    const result=run("distance","수직선 위 거리",[B,C],(x,z)=>Math.abs(x-z),x=>`두 좌표 차의 절댓값은 ${m(x)}이다.`);
    return scalarFinish(ctx,intro,m("BC"),result);
  };

  recipes["concept-distance-origin-b"]=ctx=>{
    const {rng,given,run}=ctx;
    const [a,b,r]=pick(rng,[[3,4,5],[4,3,5],[5,12,13]]), sign=pick(rng,[-1,1]);
    const x=signed(rng,1)*a, delta=signed(rng,3);
    const quadrant=x>0?(sign>0?"제1":"제4"):(sign>0?"제2":"제3");
    const R=given("원점으로부터의 거리",r), X=given("가로 좌표",x);
    const ys=run("distanceInverse","가능한 세로 좌표",[R,X],(d,v)=>[-1,1].map(s=>s*Math.sqrt(d*d-v*v)),
      p=>`거리 공식으로 가능한 세로 좌표는 ${m(p.join(", "))}이다.`);
    const y=run("selectSign","사분면 조건으로 좌표 선택",[ys,given("세로 좌표의 부호",sign)],(ys,s)=>ys.find(y=>Math.sign(y)===s),
      y=>`사분면 조건을 적용하면 세로 좌표는 ${m(y)}이다.`);
    const result=run("solveLinear","매개변수 복원",[y,given("좌표식의 상수항",delta)],(y,d)=>y-d,v=>`${m("k="+v)}이다.`);
    const transformed=rng()<.5, weight=signed(rng,3), offset=signed(rng,3);
    const expression=transformed?shift(term(weight,"k"),-offset):"k";
    const target=transformed?run("evaluateExpression","일차식의 값",[result],v=>weight*v+offset,v=>`${m(expression+"="+v)}이다.`):result;
    return scalarFinish(ctx,`점 ${at("P",[x,shift("k",-delta)])}는 ${quadrant}사분면 위에 있고 원점에서의 거리는 ${m(r)}이다.`,m(expression),target);
  };

  recipes["concept-division-definition-b"]=ctx=>{
    const {rng,given,run}=ctx;
    const p=rand(rng,2,5), q=p+signed(rng,1), d=rand(rng,2,6);
    const D=given("두 부분의 길이 차",Math.abs(p-q)*d), P=given("첫째 비",p), Q=given("둘째 비",q);
    const unit=run("ratioUnit","비 한 단위의 길이",[D,P,Q],(v,a,b)=>v/Math.abs(a-b),v=>`비의 차로 길이 차를 나누면 한 단위는 ${m(v)}이다.`);
    if(rng()<.45) {
      const base=run("scaleSegments","전체 선분의 길이",[unit,P,Q],(u,a,b)=>u*(a+b));
      const similarity=rand(rng,2,4);
      const answer=run("similarity","닮음비로 대응변의 길이 계산",[base,given("닮음비",similarity)],(v,s)=>v*s,
        value=>`선분 ${m("AB")}의 길이는 ${m(base.value)}이고 닮음비를 적용하면 ${m("DE="+value)}이다.`);
      return scalarFinish(ctx,`점 ${m("P")}는 선분 ${m("AB")}를 ${m(p+":"+q)}로 내분한다. ${m("AP")}와 ${m("PB")}의 길이의 차는 ${m(D.value)}이다. 삼각형 ${m("ABC")}와 삼각형 ${m("DEF")}는 이 순서대로 대응하며 닮음비는 ${m("1:"+similarity)}이다.`,m("DE"),answer);
    }
    const [label,operation]=pick(rng,[["AB",(a,b)=>a+b],["AP",(a,b)=>a],["PB",(a,b)=>b]]);
    const result=run("scaleSegments","요구한 선분의 길이",[unit,P,Q],(u,a,b)=>u*operation(a,b),v=>`${m(label+"="+v)}이다.`);
    return scalarFinish(ctx,`점 ${m("P")}는 선분 ${m("AB")}를 ${m(p+":"+q)}로 내분한다. ${m("AP")}와 ${m("PB")}의 길이의 차는 ${m(D.value)}이다.`,m(label),result);
  };

  recipes["concept-section-number-b"]=ctx=>{
    const {rng,given,run}=ctx;
    const p=rand(rng,1,3), q=rand(rng,2,4), d=2*signed(rng,3), a=rand(rng,-5,5), c=a+p*d;
    const P=given("내분점의 좌표",c), A=given("끝점 A의 좌표",a), ratio=given("내분비",[p,q]);
    const B=run("invertSection","다른 끝점 복원",[P,A,ratio],(x,y,[r,s])=>x+((x-y)/r)*s,v=>`내분비로부터 다른 끝점은 ${m("B("+v+")")}이다.`);
    const intro=`수직선 위에서 점 ${m("P("+c+")")}는 점 ${m("A("+a+")")}와 점 ${m("B")}를 잇는 선분을 ${m(p+":"+q)}로 내분한다.`;
    if(rng()<.5) {
      const result=run("midpoint","양 끝점의 중점",[A,B],(x,y)=>(x+y)/2,v=>`두 끝점의 평균은 ${m(v)}이다.`);
      return scalarFinish(ctx,intro,"선분 "+m("AB")+"의 중점 좌표",result);
    }
    const D=given("점 D의 좌표",a-2*d);
    const result=run("distance","두 점 사이의 거리",[D,B],(x,y)=>Math.abs(x-y),v=>`두 좌표 차의 절댓값은 ${m(v)}이다.`);
    return scalarFinish(ctx,intro+" 점 "+m("D("+D.value+")")+"가 있다.",m("BD"),result);
  };

  recipes["section-internal"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const a=mk(), d=[2*signed(rng,2),2*signed(rng,2)], p=rand(rng,1,3), q=rand(rng,1,3);
    const b=add(a,mul(d,p+q)), c=add(a,mul(d,p)), e=add(c,d);
    const A=given("끝점 A",a), P=given("내분점 P",c), ratio=given("내분비",[p,q]);
    const B=run("invertSection","끝점 B 복원",[A,P,ratio],(a,p,[r,s])=>add(p,sub(p,a).map(x=>x/r*s)),b=>`내분 관계를 거꾸로 적용하면 ${at("B",b)}이다.`);
    const n=pick(rng,[2,3]), dPoint=add(e,mul(sub(e,b),n-1));
    if(rng()<.35) {
      const M=divide(ctx,A,B,given("첫째 비",1),given("둘째 비",1));
      return finishPoint(ctx,`점 ${at("P",c)}는 선분 ${m("AB")}를 ${m(p+":"+q)}로 내분하고 ${at("A",a)}이다. 선분 ${m("AB")}의 중점을 ${m("M")}이라 하자.`,M,"M");
    }
    const E=given("점 D",dPoint);
    const T=divide(ctx,B,E,given("첫째 비",1),given("둘째 비",n-1));
    return finishPoint(ctx,`점 ${at("P",c)}는 선분 ${m("AB")}를 ${m(p+":"+q)}로 내분하고 ${at("A",a)}이다. 점 ${at("D",E.value)}가 있을 때, 선분 ${m("BD")}를 ${m("1:"+(n-1))}로 내분하는 점을 ${m("Q")}라 하자.`,T,"Q");
  };

  recipes["midpoint-inverse"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const a=mk(), d=[signed(rng,3),signed(rng,3)], b=add(a,mul(d,2)), mid=add(a,d), n=add(b,d);
    const A=given("점 A",a), M=given("중점 M",mid), N=given("중점 N",n);
    const reflect=(p,o)=>sub(mul(o,2),p);
    const B=run("invertMidpoint","끝점 B 복원",[A,M],reflect,p=>`중점의 각 좌표를 두 배 한 뒤 ${m("A")}의 좌표를 빼면 ${at("B",p)}이다.`);
    const C=run("invertMidpoint","끝점 C 복원",[B,N],reflect,p=>`같은 관계를 선분 ${m("BC")}에 적용하면 ${at("C",p)}이다.`);
    return finishPoint(ctx,`점 ${at("A",a)}가 있다. 두 선분 ${m("AB")}, ${m("BC")}의 중점은 각각 ${at("M",mid)}, ${at("N",n)}이다.`,C,"C");
  };

  recipes["centroid-inverse"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const g=mk(), u=signed(rng,3), v=signed(rng,3), a=add(g,[u,0]), b=add(g,[0,v]), c=add(g,[-u,-v]);
    const G=given("무게중심 G",g), A=given("꼭짓점 A",a), B=given("꼭짓점 B",b);
    const C=run("invertCentroid","나머지 꼭짓점 복원",[G,A,B],(g,a,b)=>sub(mul(g,3),add(a,b)),p=>`세 꼭짓점의 좌표 합은 무게중심 좌표의 세 배이므로 ${at("C",p)}이다.`);
    const q=add(c,[signed(rng,3),signed(rng,3)]), D=given("점 D",add(q,sub(q,c)));
    const Q=divide(ctx,C,D,given("비의 첫째 항",1),given("비의 둘째 항",1));
    return finishPoint(ctx,`삼각형 ${m("ABC")}의 무게중심은 ${at("G",g)}이고, 두 꼭짓점은 ${at("A",a)}, ${at("B",b)}이다. 점 ${m("Q")}는 ${at("D",D.value)}와 점 ${m("C")}를 잇는 선분의 중점이다.`,Q,"Q");
  };

  recipes["concept-centroid-median-b"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const m0=mk(), d=[signed(rng,3),signed(rng,3)], a=add(m0,mul(d,3)), g=add(m0,d);
    const e=[d[1],-d[0]], b=add(m0,e);
    const A=given("꼭짓점 A",a), G=given("무게중심 G",g), B=given("꼭짓점 B",b);
    const M=run("medianRatio","2:1 내분으로 중점 복원",[A,G],(a,g)=>mul(sub(mul(g,3),a),.5),p=>`변 ${m("BC")}의 중점을 ${m("M")}이라 하면 ${m("AG:GM=2:1")}이므로 ${at("M",p)}이다.`);
    const C=run("invertMidpoint","중점에서 꼭짓점 복원",[M,B],(m,b)=>sub(mul(m,2),b),p=>`점 ${m("M")}은 선분 ${m("BC")}의 중점이므로 ${at("C",p)}이다.`);
    return finishPoint(ctx,`삼각형 ${m("ABC")}의 두 꼭짓점은 ${at("A",a)}, ${at("B",b)}이고 무게중심은 ${at("G",g)}이다.`,C,"C");
  };

  recipes["concept-median-theorem-b"]=ctx=>{
    const {rng,given,run}=ctx;
    const b=rand(rng,2,5), c=rand(rng,2,6), sum=2*(b*b+c*c);
    const S=given("두 변 길이의 제곱합",sum);
    const intro=`삼각형 ${m("ABC")}에서 변 ${m("BC")}의 중점을 ${m("M")}이라 하자. ${m("AB^2+AC^2="+sum)}이고 `;
    if(rng()<.5) {
      const H=given("중선의 길이",c);
      const B=run("medianTheorem","밑변 길이 복원",[S,H],(s,h)=>Math.sqrt(2*s-4*h*h),
        v=>`중선 정리로 ${m("BC^2=2(AB^2+AC^2)-4AM^2="+v*v)}이다. 따라서 ${m("BC="+v)}이다.`);
      return scalarFinish(ctx,intro+`${m("AM="+c)}이다.`,m("BC"),B);
    }
    const B=given("밑변의 길이",2*b);
    const H=run("medianTheorem","중선 길이 복원",[S,B],(s,v)=>Math.sqrt((2*s-v*v)/4),
      h=>`중선 정리로 ${m("AM^2=\\frac{2(AB^2+AC^2)-BC^2}{4}="+h*h)}이다. 따라서 ${m("AM="+h)}이다.`);
    return scalarFinish(ctx,intro+`${m("BC="+2*b)}이다.`,m("AM"),H);
  };

  recipes["line-equation-condition"]=ctx=>{
    const {rng,given,run}=ctx;
    const k=signed(rng,4), factor=pick(rng,[-2,2,3]), offset=signed(rng,5);
    const x=signed(rng,4), h=signed(rng,3);
    const F=given("공통 일차 인수의 상수항",-k);
    const K=run("vanishingCoefficients","두 일차항 계수가 동시에 0",[F],v=>-v,v=>`첫째 식이 직선을 나타내지 않으려면 두 일차항 계수가 모두 0이어야 하므로 ${m("k="+v)}이다.`);
    const L=run("substituteParameter","둘째 직선 결정",[K,given("둘째 식의 상수항",offset)],(k,c)=>slopeLine([0,k+c],h),L=>`둘째 직선은 ${m(equation(L))}이다.`);
    const P=evaluatePoint(ctx,L,given("가로 좌표",x));
    const common="("+shift("k",k)+")";
    return finishPoint(ctx,`두 방정식 ${m(common+"x"+(factor>0?"+":"")+term(factor,common+"y")+"=1")}, ${m("y="+shift(term(h,"x")+"+k",-offset))}이 있다. 첫째 식은 직선을 나타내지 않는다. 둘째 직선 위에 가로 좌표가 ${m(x)}인 점 ${m("P")}가 있다.`,P,"P",0);
  };

  recipes["a-line-from-point-slope"]=ctx=>{
    const {rng,mk,given}=ctx;
    const a=mk(), s=signed(rng,4), t=a[0]+signed(rng,4);
    const L=lineFrom(ctx,given("주어진 점",a),given("주어진 기울기",s));
    const P=evaluatePoint(ctx,L,given("교차할 수직선의 가로 좌표",t));
    return finishPoint(ctx,`점 ${at("A",a)}를 지나고 기울기가 ${m(s)}인 직선이 직선 ${m("x="+t)}와 점 ${m("P")}에서 만난다.`,P,"P",0);
  };

  recipes["concept-line-through-two-b"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const a=mk(), s=signed(rng,4), d=rand(rng,1,3), b=add(a,[d,s*d]), t=a[0]-rand(rng,1,4);
    const L=run("lineThroughTwoPoints","두 점으로 직선 결정",[given("점 A",a),given("점 B",b)],twoPointLine,L=>`두 점의 좌표 차로 기울기를 구하고 대입하면 직선은 ${m(equation(L))}이다.`);
    const P=evaluatePoint(ctx,L,given("가로 좌표",t));
    return finishPoint(ctx,`두 점 ${at("A",a)}, ${at("B",b)}를 지나는 직선과 ${m("x="+t)}의 교점을 ${m("P")}라 하자.`,P,"P",0);
  };

  recipes["concept-line-intercepts-b"]=ctx=>{
    const {rng,given,run}=ctx;
    const a=signed(rng,4), b=signed(rng,5), t=2*a;
    const area=Math.abs(a*b)/2;
    const A=given("가로 절편",a);
    const B=run("recoverIntercept","넓이와 부호로 세로 절편 복원",[A,given("삼각형의 넓이",area),given("세로 절편의 부호",Math.sign(b))],
      (a,s,sign)=>sign*2*s/Math.abs(a),v=>`두 절편의 절댓값의 곱은 넓이의 두 배이므로 세로 절편은 ${m(v)}이다.`);
    const L=run("lineFromIntercepts","두 절편으로 직선 결정",[A,B],(a,b)=>through([a,0],[b,a]),L=>`두 절편을 지나는 직선은 ${m(equation(L))}이다.`);
    const P=evaluatePoint(ctx,L,given("가로 좌표",t));
    const areaTex=Number.isInteger(area)?String(area):`\\frac{${2*area}}{2}`;
    return finishPoint(ctx,`한 직선의 ${m("x")}절편은 ${m(a)}이고 ${m("y")}절편은 ${b>0?"양수":"음수"}이다. 이 직선과 두 좌표축이 만드는 삼각형의 넓이는 ${m(areaTex)}이다. 이 직선 위에 가로 좌표가 ${m(t)}인 점 ${m("P")}가 있다.`,P,"P",0);
  };

  recipes["concept-line-form-b"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const p=mk(), a=signed(rng,4), c=a*p[0]-p[1], t=p[1]+a*signed(rng,3);
    const L=given("일차방정식의 계수",through(p,[a,-1]));
    const X=given("첫째 점의 가로 좌표",p[0]);
    const P=evaluatePoint(ctx,L,X);
    const delta=t-p[1];
    const Q=run("evaluateLine","두 세로 좌표의 차로 둘째 점 결정",[L,P,given("두 세로 좌표의 차",delta)],(L,p,d)=>[evaluateX(L,p[1]+d),p[1]+d],p=>`첫째 점의 세로 좌표에 차를 더해 둘째 점의 세로 좌표를 구하고, 직선의 식에 대입하면 ${pair(p)}이다.`);
    return finishPoint(ctx,`두 점 ${m("P,Q")}는 직선 ${m(linear(a,"x",-1,"y")+"="+c)} 위에 있다. 점 ${m("P")}의 가로 좌표는 ${m(p[0])}이고, 점 ${m("Q")}의 세로 좌표에서 점 ${m("P")}의 세로 좌표를 뺀 값은 ${m(delta)}이다.`,Q,"Q");
  };

  recipes["concept-line-fixed-b"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const p=mk(), slope=signed(rng,3), t=p[0]+signed(rng,3);
    const h=shift("x",p[0]), k=shift("y",p[1]);
    const X=given("가로 좌표식의 상수항",-p[0]), Y=given("세로 좌표식의 상수항",-p[1]);
    const P=run("fixedPoint","매개변수와 무관한 정점",[X,Y],(x,y)=>[-x,-y],p=>`매개변수의 계수와 나머지 항을 모두 0으로 놓으면 정점은 ${pair(p)}이다.`);
    const L=lineFrom(ctx,P,given("새 직선의 기울기",slope));
    const Q=evaluatePoint(ctx,L,given("가로 좌표",t));
    return finishPoint(ctx,`실수 ${m("k")}의 값에 관계없이 직선 ${m(k+"=k("+h+")")}가 지나는 점을 ${m("P")}라 하자. 점 ${m("P")}를 지나고 기울기가 ${m(slope)}인 직선은 ${m("x="+t)}와 점 ${m("Q")}에서 만난다.`,Q,"Q",0);
  };

  recipes["line-through-intersection"]=ctx=>{
    const {rng,mk,given}=ctx;
    const p=mk(), a=signed(rng,3), b=a+rand(rng,1,3), slope=signed(rng,4), t=p[0]+signed(rng,3);
    const first=slopeLine(p,a), second=slopeLine(p,b);
    const P=intersection(ctx,given("첫째 직선",first),given("둘째 직선",second));
    const L=lineFrom(ctx,P,given("새 직선의 기울기",slope));
    const Q=evaluatePoint(ctx,L,given("가로 좌표",t));
    return finishPoint(ctx,`두 직선 ${m(equation(first))}, ${m(equation(second))}의 교점을 ${m("P")}라 하자. 점 ${m("P")}를 지나고 기울기가 ${m(slope)}인 직선과 ${m("x="+t)}의 교점을 ${m("Q")}라 하자.`,Q,"Q",0);
  };

  recipes["concept-line-locus-b"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const p=mk(), d=rand(rng,1,4), a=add(p,[d,d]), b=sub(p,[d,d]), s=signed(rng,3), other=s===-1?1:s;
    const K=slopeLine(p,other);
    const L=run("perpendicularBisector","등거리 자취의 직선",[given("점 A",a),given("점 B",b)],(a,b)=>through(mul(add(a,b),.5),[1,1]),
      L=>`두 점에 이르는 거리의 제곱을 같게 놓고 정리하면 ${m(equation(L))}이다.`);
    const P=intersection(ctx,L,given("교차하는 직선",K));
    return finishPoint(ctx,`두 점 ${at("A",a)}, ${at("B",b)}에서 같은 거리에 있는 점의 자취가 직선 ${m(equation(K))}와 점 ${m("P")}에서 만난다.`,P,"P");
  };

  recipes["line-three-relations"]=ctx=>{
    const {rng,mk,given,run}=ctx;
    const p=mk(), s=signed(rng,4), factor=rand(rng,2,4), t=p[0]+signed(rng,3);
    const L=slopeLine(p,s), c=factor*L.c;
    const K=run("coincidentLine","일치 조건으로 계수 복원",[given("첫째 직선",L),given("대응 계수의 배율",factor)],(L,k)=>k*L.normal[0],
      k=>`두 직선이 일치하므로 대응 계수의 비는 ${m(factor)}이다. 따라서 ${m("k="+k)}이다.`);
    const M=run("substituteParameter","일치하는 직선의 식",[K,given("세로 좌표의 계수",-factor),given("상수항",c)],(k,b,c)=>({normal:[k,b],c}),
      M=>`둘째 식에 대입하면 ${m(equation(M))}이다.`);
    const X=given("새 가로 좌표",t), delta=given("옮긴 세로 좌표의 차",factor);
    const Q=run("evaluateShiftedLine","이동된 식에 좌표 대입",[M,X,delta],(L,x,d)=>[x,evaluate(L,x)+d],p=>`새 식에서 세로 좌표는 둘째 직선보다 ${m(factor)}만큼 크므로 ${pair(p)}이다.`);
    return finishPoint(ctx,`두 직선 ${m(equation(L))}, ${m("kx-"+factor+"y="+c)}는 일치한다. 직선 ${m("kx-"+factor+"y="+(c-factor*factor))} 위에 가로 좌표가 ${m(t)}인 점 ${m("Q")}가 있다.`,Q,"Q",0);
  };

  ForgePlaneConceptCompiler = globalThis.ForgePlaneConceptCompiler = Object.freeze({has:concept=>Object.hasOwn(recipes,concept),compile:compiler, math:Object.freeze({add,sub,mul,dot,through,meet,between,centroid,triangleArea})});
})();


;

/* challenge-relations.js */
(() => {
  "use strict";
  const {m,tex,coord,shift,term,rand,pick}=ForgeTopics;
  const {through,meet,between}=ForgePlaneConceptCompiler.math;
  const pointList=points=>points.map(coord).join(",\\ ");
  const equation=({normal:[a,b],c})=>{
    const terms=[[a,"x"],[b,"y"]].filter(([n])=>n);
    return terms.map(([n,v],i)=>(i&&n>0?"+":"")+term(n,v)).join("")+"="+c;
  };
  const setKey=points=>points.map(coord).sort().join(",");
  const order=points=>{
    const [x,y]=points.reduce(([a,b],[c,d])=>[a+c/points.length,b+d/points.length],[0,0]);
    return points.slice().sort((a,b)=>Math.atan2(a[1]-y,a[0]-x)-Math.atan2(b[1]-y,b[0]-x));
  };
  const edges=points=>order(points).map((p,i,cycle)=>[p,cycle[(i+1)%cycle.length]]);
  const cross=([a,b],[c,d])=>a*d-b*c;
  const squared=([a,b],[c,d])=>(a-c)**2+(b-d)**2;
  const rectangle=([h,k,p])=>[[-p,-1],[-1,-p],[1,p],[p,1]].map(([u,v])=>[h+u,k+v]);
  const poly=([h,k,p])=>{
    const signed=(n,v)=>n?(n>0?"+":"")+term(n,v):"";
    return "xy"+signed(-k,"x")+signed(-h,"y")+"="+(p-h*k);
  };
  const relation={
    integerRelation:{
      cost:1, sample:(rng)=>[rand(rng,-4,4),rand(rng,-4,4),pick(rng,[3,5,7,11])],
      public:value=>`정수 ${m("x,y")}는 ${m(poly(value))}을 만족시킨다.`, math:poly,
    },
    squaredCoordinates:{
      cost:2,
      sample:rng=>[rand(rng,-4,4),rand(rng,-4,4),rand(rng,1,3),rand(rng,4,6)],
      math:([h,k,a,b])=>tex`(${shift("x",h)})^2=${a*a},\quad (${shift("y",k)})^2=${b*b}`,
      public:value=>`점 ${m("(x,y)")}는 두 조건 ${m(relation.squaredCoordinates.math(value))}를 만족시킨다.`,
    },
    linePair:{
      cost:2, sample:rng=>{
        const point=[rand(rng,-4,4),rand(rng,-4,4)];
        const [a,b]=pick(rng,[[1,2],[2,3],[3,4]]);
        return [through(point,[a,b]),through(point,pick(rng,[[a,-b],[b,a]]))];
      },
      public:value=>`두 직선 ${value.map(line=>m(equation(line))).join(", ")}이 있다.`,
      math:value=>value.map(equation).join(",\\ "),
    },
    transversal:{
      cost:1, sample:(rng,[L,M])=>{
        const [h,k]=meet(L,M);
        return through([h,k+6*rand(rng,1,3)],[-2,1]);
      },
      public:value=>`직선 ${m(equation(value))}`,math:equation,
    },
  };

  // A parameterized construction supplies a quadratic quantity to any
  // compatible question about its extremum. Coefficients are recovered by
  // evaluating the geometry, so the vertex is not part of the public input.
  function quadratic(evaluate) {
    const c=evaluate(0), next=evaluate(1), previous=evaluate(-1);
    const a=(next+previous-2*c)/2, b=(next-previous)/2;
    if(!a||evaluate(2)!==4*a+2*b+c)throw Error("이차식의 계수를 검산하지 못했습니다.");
    return [a,b,c];
  }
  function polynomial([a,b,c]){
    return [[a,"t^2"],[b,"t"],[c,""]].filter(([n])=>n)
      .map(([n,v],i)=>(i&&n>0?"+":"")+(v?term(n,v):n)).join("");
  }
  Object.assign(relation,{
    movingMidpoint:{
      cost:2,
      sample:rng=>[rand(rng,1,3),rand(rng,1,4),rand(rng,-4,4)],
      math:([s,h,k])=>`A(t,${s}t),B(${shift("t",-2*h)},${shift(term(-s,"t"),-2*k)})`,
      public:value=>`실수 ${m("t")}에 대하여 두 점 ${m(relation.movingMidpoint.math(value))}가 있다.`,
    },
    movingPointAndAnchor:{
      cost:1,
      sample:rng=>{const s=rand(rng,1,2);return [s,rand(rng,-4,4),(1+s*s)*rand(rng,1,2)];},
      math:([s,h,d])=>`P(t,${shift(term(s,"t"),s*h)}),A(${h},${d})`,
      public:value=>`실수 ${m("t")}에 대하여 두 점 ${m(relation.movingPointAndAnchor.math(value))}가 있다.`,
    },
    varyingIntercepts:{
      cost:1,
      sample:rng=>[rand(rng,2,6),rand(rng,1,3)],
      math:([h,k])=>`y=-${k===1?"":k}x+${2*h*k}`,
      public:value=>`점 ${m("P")}는 직선 ${m(relation.varyingIntercepts.math(value))} 위의 제1사분면에 있고, 가로 좌표는 ${m("t")}이다.`,
    },
    offsetLines:{
      cost:2,
      sample:rng=>[rand(rng,1,3),rand(rng,1,3),rand(rng,2,5)],
      math:([a,b,h])=>`${term(a,"x")}+${term(b,"y")}=0,\\ ${term(a,"x")}-${term(b,"y")}=${2*a*h}`,
      public:value=>`두 직선 ${m(relation.offsetLines.math(value))}이 있다. 실수 ${m("t")}에 대하여 점 ${m("P(t,0)")}를 잡는다.`,
    },
  });
  const rules={
    midpointDistanceQuadratic:{
      out:"quadratic",ports:["movingMidpoint"],family:"움직이는 중점",concepts:["좌표와 거리"],
      label:"중점까지의 거리의 제곱을 식으로 표현",weight:4,
      forward:([[,h,k]])=>quadratic(t=>(t+h)**2+k*k),
      quantity:"두 점을 잇는 선분의 중점에서 원점까지의 거리의 제곱", extremum:"최솟값",
      explain:()=> "두 점의 좌표를 평균 내어 중점을 구한 다음 원점까지의 거리의 제곱을 식으로 나타낸다.",
    },
    movingDistanceQuadratic:{
      out:"quadratic",ports:["movingPointAndAnchor"],family:"직선 위의 움직이는 점",concepts:["좌표와 거리"],
      label:"움직이는 점까지의 거리의 제곱",weight:4,
      forward:([[s,h,d]])=>quadratic(t=>(t-h)**2+(s*(t-h)-d)**2),
      quantity:"두 점 사이의 거리의 제곱", extremum:"최솟값",
      explain:()=> "가로 좌표 차와 세로 좌표 차의 제곱을 더한다.",
    },
    interceptRectangleQuadratic:{
      out:"quadratic",ports:["varyingIntercepts"],family:"직선 위의 움직이는 점",concepts:["수직 투영","직사각형 넓이"],
      label:"두 수선의 발이 정하는 넓이",weight:4,
      forward:([[h,k]])=>quadratic(t=>t*k*(2*h-t)),
      quantity:"원점, 점 $P$, 점 $P$에서 두 좌표축에 내린 수선의 발을 꼭짓점으로 하는 직사각형의 넓이",
      extremum:"최댓값", domain:([h])=>[0,2*h],
      explain:()=> "점의 가로 좌표를 $t$로 두면 직선의 방정식으로 세로 좌표를 얻는다. 두 좌표를 곱해 넓이를 나타낸다.",
    },
    lineDistanceQuadratic:{
      out:"quadratic",ports:["offsetLines"],family:"점과 직선 사이의 거리",concepts:["좌표 대입","거리 제곱의 합"],
      label:"두 직선까지의 제곱거리 합의 분자",weight:4,
      forward:([[a,,h]])=>quadratic(t=>a*a*(t*t+(t-2*h)**2)),
      quantity:"점 $P$에서 두 직선까지의 거리의 제곱의 합", extremum:"최솟값", parameterOnly:true,
      explain:()=> "두 거리 공식의 분모가 같으므로 제곱거리 합의 최솟값을 만드는 매개변수는 그 합의 분자를 최소로 만든다.",
    },
    extremum:{
      out:"scalar",ports:["quadratic"],family:"이차식의 극값",label:"꼭짓점과 극값",weight:4,
      plan:(rng,[input])=>rules[input.op].parameterOnly||rng()<.5?"parameter":"value",
      forward:([[a,b,c]],mode)=>mode==="parameter"?-b/(2*a):c-b*b/(4*a),
      subject:({inputs:[input],data})=>{
        const {quantity,extremum}=rules[input.op];
        return data==="value"?quantity+"의 "+extremum:quantity+(quantity.endsWith("넓이")?"가 ":"이 ")+(extremum==="최댓값"?"최대":"최소")+"가 되는 "+m("t")+"의 값";
      },
      explain:()=> "완전제곱식으로 정리하여 꼭짓점에서의 매개변수와 극값을 구한다.",
    },
    levelCrossings:{
      out:"pointSet",cardinality:2,ports:["quadratic"],family:"조건을 만족하는 두 위치",
      label:"극값 양쪽에서 같은 값을 갖는 두 위치",weight:4,
      plan:rng=>rand(rng,1,2),
      accept:([input])=>["movingDistanceQuadratic","midpointDistanceQuadratic"].includes(input.op),
      forward:([[a,b]],radius)=>{
        const center=-b/(2*a);
        return [[center-radius,0],[center+radius,0]];
      },
      refer:node=>{
        const {quantity}=rules[node.inputs[0].op];
        const [a,b,c]=node.inputs[0].value;
        const level=c-b*b/(4*a)+a*node.data**2;
        return quantity+"이 "+m(level)+"일 때 가능한 "+m("(t,0)")+" 형태의 점";
      },
      explain:()=> "주어진 값을 이차식과 같게 놓고 완전제곱으로 정리하면 꼭짓점을 기준으로 양쪽에 해가 하나씩 있다.",
    },
    restoreIntegerPoints:{
      out:"pointSet",cardinality:4,convex:true,ports:["integerRelation"],family:"정수해 복원",label:"정수해로 점의 집합 복원",weight:4,
      forward:([[h,k,p]])=>{
        const points=[];
        for(let u=-p;u<=p;u++)if(u&&p%u===0)points.push([h+u,k+p/u]);
        if(setKey(points)!==setKey(rectangle([h,k,p])))throw Error("정수해 검산 실패");
        return points;
      },
      refer:()=> "조건을 만족시키는 점",
      explain:({inputs:[{value:[h,k,p]}]})=>`${m(tex`(${shift("x",h)})(${shift("y",k)})=${p}`)}로 정리한 뒤 부호를 포함한 약수쌍을 모두 구한다.`,
    },
    combineCoordinateRoots:{
      out:"pointSet",cardinality:4,convex:true,ports:["squaredCoordinates"],
      family:"좌표 조건의 조합",label:"각 좌표의 두 후보 결합",weight:3,
      forward:([[h,k,a,b]])=>[-a,a].flatMap(u=>[-b,b].map(v=>[h+u,k+v])),
      refer:()=> "조건을 만족시키는 점",
      explain:()=> "각 좌표에 가능한 값이 두 개씩 있으므로 두 후보를 각각 조합한다.",
    },
    boundary:{
      out:"edgeSet",ports:["pointSet"],accept:children=>children[0].convex===true,
      family:"다각형의 변 관계",label:"교차하지 않는 변 연결",weight:3,
      forward:([points])=>{
        const sides=edges(points);
        const directions=sides.map(([[a,b],[c,d]])=>[c-a,d-b]);
        const turns=directions.map((direction,i)=>cross(direction,directions[(i+1)%directions.length]));
        if(!turns.every(turn=>turn>0)&&!turns.every(turn=>turn<0))throw Error("다각형의 변 순서를 검산하지 못했습니다.");
        return sides;
      },
      refer:node=>rules[node.inputs[0].op].refer(node.inputs[0])+"을 꼭짓점으로 하는 다각형",
      explain:()=> "네 점은 직사각형을 이루므로 변이 교차하지 않도록 둘레를 따라 연결한다.",
    },
    areaOfBoundary:{
      out:"scalar",ports:["edgeSet"],family:"넓이",label:"두 이웃한 변으로 넓이 계산",weight:3,
      forward:([sides])=>{
        const [[a,b],[,c]]=sides;
        return Math.abs(cross([b[0]-a[0],b[1]-a[1]],[c[0]-b[0],c[1]-b[1]]));
      },
      subject:({inputs:[node]})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+"의 넓이",
      explain:()=> "서로 수직인 두 이웃한 변의 길이를 곱한다.",
    },
    sideMidpoints:{
      out:"pointSet",cardinality:2,ports:["edgeSet"],family:"중점",label:"두 변의 중점",weight:3,
      plan:rng=>pick(rng,["긴","짧은"]),
      forward:([sides],mode)=>{
        const sizes=sides.map(edge=>squared(...edge)), size=(mode==="긴"?Math.max:Math.min)(...sizes);
        return sides.filter((_,i)=>sizes[i]===size).map(edge=>between(...edge,1,1));
      },
      refer:({inputs:[node],data})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+"에서 가장 "+data+" 두 변의 중점",
      explain:()=> "변의 길이를 비교한 뒤 해당하는 두 변의 양 끝점 좌표를 각각 평균 낸다.",
    },
    bisectorSet:{
      out:"lineSet",ports:["linePair"],concepts:["점과 직선 사이의 거리"],family:"등거리 자취",label:"두 직선에 등거리인 자취 복원",weight:4,
      forward:([[L,M]])=>[-1,1].map(sign=>{
        const normal=L.normal.map((n,i)=>n+sign*M.normal[i]);
        const divisor=Math.max(...normal.map(Math.abs));
        return {normal:normal.map(n=>n/divisor),c:(L.c+sign*M.c)/divisor};
      }),
      refer:()=> "주어진 두 직선에서 같은 거리에 있는 점의 자취",
      explain:()=> "두 직선의 거리 공식에서 분모가 같으므로 분자의 절댓값을 비교한다. 두 식이 같은 경우와 부호가 반대인 경우가 각각 직선을 이룬다.",
    },
    intersectEach:{
      out:"pointSet",cardinality:2,ports:["lineSet","transversal"],
      inputDemand:(index,inputs,rng)=>index===1?relation.transversal.sample(rng,inputs[0].inputs[0].wanted):undefined,
      family:"교점",label:"각 자취에서 교점 복원",weight:4,
      forward:([lines,cut])=>lines.map(line=>meet(line,cut)),
      refer:({inputs:[node,cut]})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+"와 "+relation.transversal.public(cut.value)+"의 교점",
      explain:()=> "자취를 이루는 각 직선의 방정식을 주어진 직선의 방정식과 연립한다.",
    },
    midpointOfPair:{
      out:"point",ports:["pointSet"],accept:children=>children[0].cardinality===2&&!children[0].families.has("중점"),
      family:"두 점의 중점",label:"두 후보를 잇는 선분의 중점",weight:3,
      forward:([points])=>between(...points,1,1),
      clause:({inputs:[node]},suffix)=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+" 두 점을 잇는 선분의 중점"+suffix,
      explain:()=> "두 점의 가로 좌표와 세로 좌표를 각각 평균 낸다.",
    },
    separation:{
      out:"scalar",ports:["pointSet"],accept:children=>children[0].cardinality===2&&!children[0].families.has("조건을 만족하는 두 위치"),
      family:"두 점 사이의 거리",label:"두 후보 사이의 거리의 제곱",weight:3,
      forward:([points])=>squared(...points),
      subject:({inputs:[node]})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+" 두 점 사이의 거리의 제곱",
      explain:()=> "두 점의 가로 좌표 차와 세로 좌표 차를 각각 제곱하여 더한다.",
    },

  };

  Object.assign(relation,{
    latticeRegion:{
      cost:2,
      sample:rng=>[rand(rng,-3,3),rand(rng,-3,3),rand(rng,2,5),rand(rng,1,3),rand(rng,0,3)],
      math:([h,k,r,a,b])=>tex`(${shift("x",h)})^2+(${shift("y",k)})^2\le ${r*r},\quad ${term(a,"x")}+y\ge ${a*h+k+b}`,
      public:value=>`좌표가 모두 정수인 점 ${m("(x,y)")}는 두 조건 ${m(relation.latticeRegion.math(value))}를 만족시킨다.`,
    },
    boundedHalfPlanes:{
      cost:3,
      sample:rng=>[rand(rng,-3,3),rand(rng,-3,3),rand(rng,4,7),rand(rng,1,2),rand(rng,1,2)],
      math:([h,k,n,a,b])=>tex`x\ge ${h},\quad y\ge ${k},\quad ${term(a,"x")}+${term(b,"y")}\le ${n+a*h+b*k}`,
      public:value=>`좌표가 모두 정수인 점 ${m("(x,y)")}는 세 조건 ${m(relation.boundedHalfPlanes.math(value))}를 만족시킨다.`,
    },
    reflectionRoute:{
      cost:3,
      sample:rng=>{
        const k=rand(rng,-4,4), x=rand(rng,-4,4), u=rand(rng,1,3), v=rand(rng,1,3), d=rand(rng,1,3);
        return {A:[x-d*u,k+u],B:[x+d*v,k+v],k,vertical:rng()<.5};
      },
      math:({A,B,k,vertical})=>{
        const orient=p=>vertical?p.slice().reverse():p;
        return `A${coord(orient(A))},\ B${coord(orient(B))},\ ${vertical?"x":"y"}=${k}`;
      },
      public:value=>`두 점과 직선 ${m(relation.reflectionRoute.math(value))}가 있다.`,
    },
  });
  Object.assign(rules,{
    latticeSolutions:{
      out:"pointSet",ports:["latticeRegion"],family:"격자점 열거",concepts:["거리 조건","반평면"],label:"거리와 위치를 동시에 만족하는 격자점",weight:4,
      forward:([[h,k,r,a,b]])=>{
        const points=[];
        for(let x=h-r;x<=h+r;x++){
          const limit=Math.floor(Math.sqrt(r*r-(x-h)**2));
          for(let y=Math.max(k-limit,a*(h-x)+k+b);y<=k+limit;y++)points.push([x,y]);
        }
        return points;
      },
      refer:()=> "두 조건을 모두 만족하는 정수 격자점",
      explain:()=> "가능한 가로 좌표를 각각 대입하여 거리 조건에서 세로 좌표의 범위를 구하고, 일차부등식과 겹치는 정수만 센다.",
    },
    halfPlaneLattice:{
      out:"pointSet",ports:["boundedHalfPlanes"],family:"격자점 열거",concepts:["연립일차부등식","유한 영역"],
      label:"연립일차부등식의 정수점",weight:4,
      forward:([[h,k,n,a,b]])=>{
        const points=[];
        for(let u=0;a*u<=n;u++)for(let v=0;a*u+b*v<=n;v++)points.push([h+u,k+v]);
        return points;
      },
      refer:()=> "세 부등식을 모두 만족하는 정수 격자점",
      explain:()=> "아래 경계를 원점으로 옮겨 가로 좌표의 범위를 구하고, 각 가로 좌표에서 가능한 세로 좌표를 나열한다.",
    },
    extremeCoordinate:{
      out:"scalar",ports:["pointSet"],family:"좌표의 극값",label:"후보 전체에서 좌표의 극값 비교",weight:3,
      plan:(rng,[input])=>[rand(rng,0,1),input.op==="halfPlaneLattice"||rng()<.5?"최댓값":"최솟값"],
      forward:([points],[axis,mode])=>(mode==="최댓값"?Math.max:Math.min)(...points.map(p=>p[axis])),
      subject:({inputs:[node],data:[axis,mode]})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+"에서 "+m(["x","y"][axis])+"좌표의 "+mode,
      explain:()=> "조건에 맞는 모든 후보에서 지정된 좌표를 비교한다.",
    },
    extremePoints:{
      out:"pointSet",ports:["pointSet"],family:"위치별 경우 분류",label:"극값을 달성하는 후보를 모두 선택",weight:3,
      accept:([input])=>["latticeSolutions","halfPlaneLattice","circleLineIntersections"].includes(input.op),
      plan:(rng,[input])=>[rand(rng,0,1),input.op==="halfPlaneLattice"||rng()<.5?"가장 큰":"가장 작은"],
      forward:([points],[axis,mode])=>{
        const extreme=(mode==="가장 큰"?Math.max:Math.min)(...points.map(p=>p[axis]));
        return points.filter(p=>p[axis]===extreme);
      },
      refer:({inputs:[node],data:[axis,mode]})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+" 중 "+m(["x","y"][axis])+"좌표가 "+mode+" 점",
      explain:()=> "모든 후보의 좌표를 비교한 뒤, 극값을 갖는 점을 빠짐없이 고른다.",
    },
    countPoints:{
      out:"scalar",ports:["pointSet"],family:"경우 분류",label:"서로 다른 후보 수 계산",weight:3,
      accept:([input])=>input.cardinality===undefined,
      forward:([points])=>new Set(points.map(coord)).size,
      subject:({inputs:[node]})=>(rules[node.op]??ForgeChallengeGeometry.rules[node.op]).refer(node)+"의 개수",
      explain:()=> "서로 다른 점을 중복 없이 센다.",
    },
    reflectEndpoint:{
      out:"reflectedRoute",ports:["reflectionRoute"],family:"직선 대칭",label:"경로의 한 끝점을 직선에 대칭",weight:4,
      forward:([{A,B,k,vertical}])=>({A:[A[0],2*k-A[1]],B,k,vertical}),
      explain:()=> "한 끝점을 직선에 대칭이동하면 꺾인 경로의 길이를 대칭점에서 시작하는 경로의 길이로 바꿀 수 있다.",
    },
    shortestPoint:{
      out:"point",ports:["reflectedRoute"],family:"반사 최적화",concepts:["삼각부등식","교점"],label:"최단 경로가 직선과 만나는 점",weight:4,
      forward:([{A,B,k,vertical}])=>{
        const p=[A[0]+(B[0]-A[0])*(k-A[1])/(B[1]-A[1]),k];
        return vertical?p.reverse():p;
      },
      clause:(_node,suffix)=>"주어진 직선 위에서 $AP+PB$가 최소가 되는 점 $P$"+suffix,
      explain:()=> "대칭점과 다른 끝점을 잇는 선분이 주어진 직선과 만날 때 삼각부등식의 등호가 성립한다.",
    },
    pathLengthSquared:{
      out:"scalar",ports:["reflectedRoute"],family:"반사 최적화",concepts:["삼각부등식","두 점 사이의 거리"],label:"최단 경로의 제곱",weight:4,
      forward:([{A,B}])=>squared(A,B),
      subject:()=> "점 $P$가 주어진 직선 위를 움직일 때 $AP+PB$의 최솟값의 제곱",
      explain:()=> "대칭점과 다른 끝점을 연결한 선분이 직선과 만나므로 최솟값은 두 끝점 사이의 직선거리이다.",
    },
  });

  const math={
    quadratic:polynomial,reflectedRoute:value=>relation.reflectionRoute.math(value).replace("A(","A'("),pointSet:pointList,edgeSet:sides=>sides.map(([a,b])=>coord(a)+"-"+coord(b)).join(",\\ "),
    lineSet:lines=>lines.map(equation).join(",\\ "),
  };
  const pointSetAnswer=points=>({kind:"point-set",value:points,text:m(pointList(points))});
  function present(data,format,rng) {
    if(format==="choice"&&data.answer.kind==="equation"){
      const equation=ForgeGeometryEquations.answer;
      const isCircle=data.answer.value[3]!==0;
      const value=data.equationObject;
      const distractors=isCircle?[1,2,3].map(n=>equation("circle",{...value,r2:value.r2+n}).text)
        :[1,2,3].map(n=>equation("line",{...value,c:value.c+n}).text);
      return {...data,question:data.question.replace("방정식을 구하시오.","방정식을 고르시오."),answer:ForgeTopics.choice(rng,data.answer.text,distractors)};
    }
    if(format!=="choice"||data.answer.kind!=="point-set")return ForgeVariations.present(data,format,rng);
    const {value,text}=data.answer;
    const wrong=[value.length>1?value.slice(1):[[value[0][0]-1,value[0][1]-1]],value.map(([x,y])=>[x+1,y]),value.map(([x,y])=>[x,y+1])].map(points=>pointSetAnswer(points).text);
    return {...data,question:data.question.replace("모두 구하시오.","모두 나타낸 것을 고르시오."),
      answer:ForgeTopics.choice(rng,text,wrong)};
  }
  ForgeChallengeRelations = globalThis.ForgeChallengeRelations = Object.freeze({rules,relation,math,present,pointSetAnswer,setKey});
})();


;

/* geometry-equations.js */
(() => {
  "use strict";
  const {m,shift,term}=ForgeTopics;
  const powers=["1","x","y","xx","xy","yy"];
  const zero=()=>powers.map(()=>0);
  const add=(a,b,sign=1)=>a.map((n,i)=>n+sign*b[i]);
  function multiply(a,b) {
    const result=zero();
    for(const [i,n] of a.entries())for(const [j,k] of b.entries()){
      if(!n||!k)continue;
      const power=(i?powers[i]:"")+(j?powers[j]:"");
      const index=powers.indexOf([...power].sort().join("")||"1");
      if(index<0)throw new Error("degree");
      result[index]+=n*k;
    }
    return result;
  }
  function parse(input) {
    if(typeof input!=="string"||input.length>120)return null;
    const source=input.replaceAll("²","^2").normalize("NFKC").replaceAll("−","-").replaceAll("·","*").replaceAll(" ","");
    const tokens=source.match(/\d+|[xy()+*^=\-]/g)??[];
    if(tokens.join("")!==source)return null;
    let i=0;
    function atom() {
      const token=tokens[i++], value=zero();
      if(token==="("){
        const nested=expression();
        if(tokens[i++]!==")")throw new Error("parenthesis");
        return nested;
      }
      if(token==="x"||token==="y")value[powers.indexOf(token)]=1;
      else if(token&&/^\d{1,5}$/.test(token))value[0]=Number(token);
      else throw new Error("term");
      return value;
    }
    function factor() {
      const value=atom();
      if(tokens[i]!=="^")return value;
      i++;
      if(tokens[i++]!=="2")throw new Error("power");
      return multiply(value,value);
    }
    function product() {
      let value=factor();
      while(tokens[i]==="*"||tokens[i]==="x"||tokens[i]==="y"||tokens[i]==="(") {
        if(tokens[i]==="*")i++;
        value=multiply(value,factor());
      }
      return value;
    }
    function expression(){
      let value=zero();
      do {
        const sign=tokens[i]==="-"?-1:1;
        if(tokens[i]==="-"||tokens[i]==="+")i++;
        value=add(value,product(),sign);
      }while(tokens[i]==="-"||tokens[i]==="+");
      return value;
    }
    try {
      const left=expression();
      if(tokens[i++]!=="=")return null;
      const result=add(left,expression(),-1);
      return i===tokens.length&&result.some(Boolean)&&result.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1e9)?result:null;
    }catch { return null; }
  }
  const equivalent=(a,b)=>{
    const pivot=b.findIndex(Boolean);
    return pivot>=0&&a[pivot]!==0&&a.every((n,i)=>BigInt(n)*BigInt(b[pivot])===BigInt(b[i])*BigInt(a[pivot]));
  };
  const circleText=({center:[h,k],r2})=>`(${shift("x",h)})^2+(${shift("y",k)})^2=${r2}`;
  const lineText=({normal:[a,b],c})=>[a?term(a,"x"):"",b?(a&&b>0?"+":"")+term(b,"y"):""].join("")+"="+c;
  function answer(shape,value){
    const text=shape==="circle"?circleText(value):lineText(value);
    return {kind:"equation",value:parse(text),text:m(text),input:text};
  }
  function grade(input,answer) {
    const value=parse(input);
    return value?{valid:true,correct:equivalent(value,answer.value)}:{valid:false};
  }
  ForgeGeometryEquations = globalThis.ForgeGeometryEquations = Object.freeze({answer,grade,circleText,lineText,equivalent});
})();


;

/* challenge-geometry.js */
(() => {
  "use strict";
  const {m,rand,pick,signed,coord,shift,term}=ForgeTopics;
  const {add,sub,mul,dot,through,between,meet}=ForgePlaneConceptCompiler.math;
  const {circleText,lineText}=ForgeGeometryEquations;
  const squared=v=>dot(v,v);
  const rotate=([x,y])=>[-y,x];
  const center=rng=>[rand(rng,-5,5),rand(rng,-5,5)];
  const vec=rng=>[signed(rng,3),signed(rng,3)];
  const circle=(p,r2)=>({center:p,r2});
  const at=node=>m(node.name);
  const circleSeed=rng=>circle(center(rng),pick(rng,[4,5,9,16,25]));
  const axes=["x축","y축","원점",m("y=x"),m("y=-x")];
  const images=[([x,y])=>[x,-y],([x,y])=>[-x,y],([x,y])=>[-x,-y],([x,y])=>[y,x],([x,y])=>[-y,-x]];
  const move=(out,op,label,family)=>{
    const isCircle=out==="circle";
    const reflect=op==="reflect";
    const image=(p,d)=>reflect?images[d](p):add(p,d);
    const inverse=(p,d)=>reflect?images[d](p):sub(p,d);
    const convert=(value,d,fn)=>isCircle?circle(fn(value.center,d),value.r2):fn(value,d);
    return {
      out,ports:[out],family,label,weight:3,
      ...(isCircle?{seed:circleSeed}:{}),
      back(value,rng){
        const data=reflect?rand(rng,0,4):vec(rng);
        return {inputs:[convert(value,data,inverse)],data};
      },
      forward:([value],d)=>convert(value,d,image),
      clause:({inputs:[source],data},suffix)=>`${isCircle?"원":"점"} ${at(source)}를 ${reflect?`${axes[data]}에 대하여 대칭이동`:`${m("x")}축 방향으로 ${m(data[0])}, ${m("y")}축 방향으로 ${m(data[1])}만큼 평행이동`}한 ${isCircle?"원":"점"}${suffix}`,
      explain:()=>reflect?"대칭 기준에 따라 좌표의 부호나 위치를 바꾼다.":"가로와 세로 좌표에 각각 이동량을 더한다.",
    };
  };
  const rules={
    translatePoint:move("point","translate","점의 평행이동","평행이동"),
    reflectPoint:move("point","reflect","점의 대칭이동","대칭이동"),
    translateCircle:move("circle","translate","원의 평행이동","평행이동"),
    reflectCircle:move("circle","reflect","원의 대칭이동","대칭이동"),
    axisTangentCircle:{
      out:"circle",ports:["point"],family:"좌표축에 접하는 원",label:"중심과 좌표축 사이의 거리로 반지름 복원",weight:3,
      seed:rng=>{const r=rand(rng,1,5), axis=rand(rng,0,1), p=center(rng);p[axis]=r*pick(rng,[-1,1]);return {...circle(p,r*r),axis};},
      back(value,rng){
        const axis=value.axis??value.center.findIndex(x=>x*x===value.r2);
        return {inputs:[value.center],data:axis<0?rand(rng,0,1):axis};
      },
      forward:([p],axis)=>circle(p,p[axis]**2),
      clause:({inputs:[p],data},suffix)=>`중심이 ${at(p)}이고 ${m(data===0?"y":"x")}축에 접하는 원${suffix}`,
      explain:()=> "반지름은 원의 중심과 접하는 좌표축 사이의 거리이다.",
    },
    reflectLine:{
      out:"line",ports:["line"],family:"대칭이동",label:"대칭이동을 직선의 방정식에 적용",weight:3,
      back({p,normal},rng){
        const data=rand(rng,0,4), f=images[data], q=f(p);
        return {inputs:[{...through(q,f(normal)),p:q}],data};
      },
      forward:([l],axis)=>({normal:images[axis](l.normal),c:l.c}),
      clause:({inputs:[l],data},suffix)=>`직선 ${at(l)}를 ${axes[data]}에 대하여 대칭이동한 직선${suffix}`,
      explain:()=> "대칭이동한 좌표를 원래 직선의 식에 대입하여 정리한다.",
    },
    translateLine:{
      out:"line",ports:["line"],family:"평행이동",label:"직선 방정식에 역이동 대입",weight:3,
      back({p,normal},rng){
        const d=vec(rng), q=sub(p,d);
        return {inputs:[{...through(q,normal),p:q}],data:d};
      },
      forward:([l],d)=>({...l,c:l.c+dot(l.normal,d)}),
      clause:({inputs:[l],data},suffix)=>`직선 ${at(l)}를 ${m("x")}축 방향으로 ${m(data[0])}, ${m("y")}축 방향으로 ${m(data[1])}만큼 평행이동한 직선${suffix}`,
      explain:()=> "이동한 점의 좌표에서 이동량을 빼 원래 방정식에 대입한다.",
    },
    distanceLocus:{
      out:"circle",ports:["point"],family:"일정 거리의 자취",label:"거리 조건에서 원의 방정식 결정",weight:3,extended:true,
      seed:circleSeed,
      back({center,r2}){return {inputs:[center],data:r2};},
      forward:([p],r2)=>circle(p,r2),
      clause:({inputs:[p],data},suffix)=>`점 ${at(p)}에서 거리의 제곱이 ${m(data)}인 점의 자취인 원${suffix}`,
      explain:()=> "거리 공식의 제곱을 쓰면 주어진 점이 중심인 원의 방정식이 된다.",
    },
    circleDiameter:{
      out:"circle",ports:["point","point"],family:"지름과 중점",label:"지름의 끝점으로 원 복원",weight:4,seed:circleSeed,
      back({center:p,r2},rng){
        const d=pick(rng,r2===5?[[1,2],[2,1]]:[[Math.sqrt(r2),0],[0,Math.sqrt(r2)]]);
        return {inputs:[add(p,d),sub(p,d)]};
      },
      forward:([a,b])=>circle(between(a,b,1,1),squared(sub(a,b))/4),
      clause:({inputs:[a,b]},suffix)=>`선분 ${m(a.name+b.name)}를 지름으로 하는 원${suffix}`,
      explain:()=> "지름의 중점이 중심이고 지름의 절반이 반지름이다.",
    },
    circumcircle:{
      out:"circle",ports:["point","point","point"],family:"세 점을 지나는 원",extended:true,label:"세 점에서 원 복원",weight:3,seed:circleSeed,
      back({center:p,r2},rng){
        const d=pick(rng,r2===5?[[1,2],[2,1]]:[[Math.sqrt(r2),0],[0,Math.sqrt(r2)]]);
        return {inputs:[add(p,d),sub(p,d),add(p,rotate(d))]};
      },
      forward:([a,b,c])=>{
        const u=sub(b,a),v=sub(c,a),det=u[0]*v[1]-u[1]*v[0];
        if(!det)return null;
        const s=(squared(b)-squared(a))/2,t=(squared(c)-squared(a))/2;
        const p=[(s*v[1]-t*u[1])/det,(u[0]*t-v[0]*s)/det];
        return circle(p,squared(sub(p,a)));
      },
      clause:({inputs},suffix)=>`세 점 ${m(inputs.map(p=>p.name).join(","))}를 지나는 원${suffix}`,
      explain:()=> "두 현의 수직이등분선을 연립하여 중심을 구한다.",
    },
    circleCenter:{
      out:"point",ports:["circle"],family:"완전제곱과 중심",label:"원의 중심 결정",weight:2,
      back(p,rng){return {inputs:[circle(p,circleSeed(rng).r2)]};},
      forward:([c])=>c.center,
      clause:({inputs:[c]},suffix)=>`원 ${at(c)}의 중심${suffix}`,
      explain:()=> "원의 방정식을 표준형으로 정리해 중심의 좌표를 읽는다.",
    },
    tangentAtPoint:{
      out:"line",ports:["circle","point"],family:"접선과 반지름",label:"접점에서 접선 결정",weight:4,
      back({p,normal},rng){
        const d=mul(normal,rand(rng,1,2));
        return {inputs:[circle(sub(p,d),squared(d)),p]};
      },
      forward:([c,p])=>through(p,sub(p,c.center)),
      clause:({inputs:[c,p]},suffix)=>`원 ${at(c)} 위의 점 ${at(p)}에서 그은 접선${suffix}`,
      explain:()=> "접점에서 접선은 반지름에 수직이다.",
    },
    tangentParallel:{
      out:"line",ports:["circle","givenLine"],family:"기울기로 정한 접선",label:"평행한 두 접선 중 중심 위쪽 접선 결정",weight:4,
      back({p,normal},rng){
        const n=normal[1]<0?mul(normal,-1):normal;
        const d=mul(n,rand(rng,1,2)), c=sub(p,d), q=add(p,d);
        return {inputs:[circle(c,squared(d)),{...through(q,n),p:q}]};
      },
      forward:([c,l])=>{
        const n=l.normal[1]<0?mul(l.normal,-1):l.normal;
        return {normal:n,c:dot(c.center,n)+Math.sqrt(c.r2*squared(n))};
      },
      clause:({inputs:[c,l]},suffix)=>`직선 ${at(l)}과 평행하고 같은 가로 좌표에서 원 ${at(c)}의 중심보다 위에 있는 접선${suffix}`,
      explain:()=> "법선의 방향을 맞춘 뒤 중심에서의 거리가 반지름이고 중심보다 위에 있는 직선을 고른다.",
    },
    reflectAcrossLine:{
      out:"point",ports:["point","line"],family:"직선 대칭의 중점·수직 조건",extended:true,label:"수선과 중점으로 대칭점 결정",weight:4,
      back(p,rng){
        const n=vec(rng), h=add(p,n);
        return {inputs:[add(h,n),{...through(h,n),p:h}]};
      },
      forward:([p,l])=>add(p,mul(l.normal,2*(l.c-dot(p,l.normal))/squared(l.normal))).map(x=>Math.round(x*1e9)/1e9),
      clause:({inputs:[p,l]},suffix)=>`점 ${at(p)}를 직선 ${at(l)}에 대하여 대칭이동한 점${suffix}`,
      explain:()=> "두 점을 잇는 선분은 대칭축과 수직이고 중점은 대칭축 위에 있다.",
    },
  };
  const circlePair={
    cost:2,
    sample(rng){
      const p=center(rng), vertical=rng()<.5, d=rand(rng,1,2);
      const delta=vertical?[0,6*d]:[6*d,0];
      return [circle(p,25*d*d),circle(add(p,delta),25*d*d)];
    },
    math:pair=>pair.map(circleText).join(",\\ "),
    public:pair=>`두 원 ${pair.map(c=>m(circleText(c))).join(", ")}이 있다.`,
  };
  const circlePositions={
    cost:2,
    sample(rng){
      const p=center(rng), r=rand(rng,4,7), q=rand(rng,1,3);
      const d=pick(rng,[r+q+1,r+q,r-q+1,r-q,r-q-1]);
      const delta=rng()<.5?[d,0]:[0,d];
      return [circle(p,r*r),circle(add(p,delta),q*q)];
    },
    math:circlePair.math,public:circlePair.public,
  };
  const axisSection={
    cost:2,
    sample(rng){
      const p=center(rng), vertical=rng()<.5, r=rand(rng,2,5), d=pick(rng,[0,r,r+1,Math.max(1,r-1)]);
      return {circle:circle(p,r*r),vertical,t:p[vertical?0:1]+d};
    },
    math:({circle,vertical,t})=>circleText(circle)+",\\ "+(vertical?"x":"y")+"="+t,
    public:value=>`원과 직선의 방정식은 각각 ${m(axisSection.math(value))}이다.`,
  };
  const externalPoint={
    cost:2,
    sample(rng){
      const p=center(rng), u=rand(rng,1,3), axis=rand(rng,0,1);
      return {circle:circle(p,25*u*u),point:add(p,axis?[0,13*u]:[13*u,0])};
    },
    math:({circle,point})=>circleText(circle)+",\\ P"+coord(point),
    public:value=>`원 ${m(circleText(value.circle))}과 원 밖의 점 ${m("P"+coord(value.point))}가 있다.`,
  };
  Object.assign(rules,{
    commonChord:{
      out:"line",ports:["circlePair"],family:"두 원의 공통현",label:"두 원의 식을 빼 공통현의 직선 결정",weight:4,extended:true,
      forward:([[a,b]])=>through(between(a.center,b.center,1,1),sub(b.center,a.center)),
      clause:(_node,suffix)=>"두 원의 공통현을 포함하는 직선"+suffix,
      explain:()=> "두 원의 방정식을 빼면 두 교점을 지나는 직선의 식이 남는다.",
    },
    circlePairIntersections:{
      out:"pointSet",ports:["circlePair"],family:"두 원의 위치 관계",concepts:["공통현","두 교점의 분기"],label:"공통현에서 두 교점 복원",cardinality:2,weight:4,extended:true,
      forward:([[a,b]])=>{
        const p=between(a.center,b.center,1,1), v=sub(b.center,p);
        const d=mul(rotate(v),Math.sqrt((a.r2-squared(v))/squared(v)));
        return [add(p,d),sub(p,d)];
      },
      refer:()=> "두 원의 교점",
      explain:()=> "공통현의 직선을 원에 대입하면 공통현의 중점을 기준으로 대칭인 두 점을 얻는다.",
    },
    diameterOfPair:{
      out:"circle",ports:["pointSet"],family:"교점을 지나는 원",label:"두 교점을 지름의 끝으로 하는 원",weight:3,extended:true,
      accept:([shape])=>shape.op==="circlePairIntersections",
      forward:([points])=>rules.circleDiameter.forward(points),
      clause:(_node,suffix)=>"두 원의 교점을 지름의 양 끝점으로 하는 원"+suffix,
      explain:()=> "두 교점의 중점을 중심으로, 공통현의 절반을 반지름으로 사용한다.",
    },
    circlePositionCount:{
      out:"scalar",ports:["circlePositions"],family:"두 원의 위치 관계",concepts:["반지름의 합과 차","교점 개수"],
      label:"외접·내접·교차·외부·포함 분류",weight:4,extended:true,
      forward:([[a,b]])=>{
        const d=Math.sqrt(squared(sub(a.center,b.center))),r=Math.sqrt(a.r2),s=Math.sqrt(b.r2);
        return d===r+s||d===Math.abs(r-s)?1:d<r+s&&d>Math.abs(r-s)?2:0;
      },
      subject:()=> "두 원의 교점 개수",
      explain:()=> "두 중심 사이의 거리를 두 반지름의 합과 차에 각각 비교한다.",
    },
    axisIntersectionCount:{
      out:"scalar",ports:["axisSection"],family:"원과 직선의 위치 관계",concepts:["판별식","중심에서 직선까지 거리"],
      label:"반지름과 중심 거리의 비교로 교점 분류",weight:3,
      forward:([{circle,vertical,t}])=>{
        const delta=circle.r2-(t-circle.center[vertical?0:1])**2;
        return delta<0?0:delta===0?1:2;
      },
      subject:()=> "원과 직선의 교점 개수",
      explain:()=> "직선의 식을 원의 식에 대입한 뒤 남은 제곱항의 우변 부호로 교점의 개수를 결정한다.",
    },
    chordIntercept:{
      out:"scalar",ports:["line"],family:"직선의 절편",label:"공통현의 직선에서 절편 결정",weight:3,
      accept:([shape])=>shape.op==="commonChord",
      forward:([l])=>l.c/(l.normal.find(Boolean)),
      subject:({inputs:[l]})=>"직선 "+at(l)+"의 "+m(l.value.normal[0]?"x":"y")+"절편",
      explain:()=> "공통현의 방정식에 다른 좌표를 0으로 대입한다.",
    },
    tangentIntercept:{
      out:"scalar",ports:["line"],family:"절편",label:"접선의 절편 결정",weight:4,
      accept:([shape])=>["tangentAtPoint","tangentParallel"].includes(shape.op),
      seed:rng=>signed(rng,5),
      back(value,rng){
        const p=[value,0],normal=[rand(rng,1,2),signed(rng,2)];
        return {inputs:[{...through(p,normal),p}]};
      },
      forward:([line])=>line.c/line.normal[0],
      subject:({inputs:[line]})=>`직선 ${at(line)}의 ${m("x")}절편`,
      explain:()=> "접선의 방정식에 세로 좌표 0을 대입한다.",
    },
    externalTangentLength:{
      out:"scalar",ports:["externalPoint"],family:"원 밖의 점에서 접선",concepts:["수직","피타고라스 정리"],
      label:"원 밖의 점에서 접점까지의 길이",weight:4,extended:true,
      forward:([{circle,point}])=>Math.sqrt(squared(sub(point,circle.center))-circle.r2),
      subject:()=> "점 $P$에서 원에 그은 접선의 접점까지의 거리",
      explain:()=> "원의 중심과 접점을 잇는 반지름이 접선과 수직이므로 피타고라스 정리를 적용한다.",
    },
  });
  function circleLineCount(discriminant) {
    return {
      out:"scalar",ports:["circle","line"],family:discriminant?"판별식":"중심과 직선 사이의 거리",
      label:discriminant?"대입한 이차방정식의 판별식":"원의 반지름과 중심 거리 비교",weight:4,
      seed:rng=>rand(rng,0,2),
      back(count,rng){
        const p=center(rng), r=rand(rng,2,5);
        const n=pick(rng,[[1,0],[0,1],[3,4],[4,3]]);
        const offset=pick(rng,[-1,1])*(r+1-count);
        const direction=n[0]===3?[3,-1]:n[0]===4?[-1,3]:n;
        const q=add(p,mul(direction,offset));
        return {inputs:[circle(p,r*r),{...through(q,n),p:q}]};
      },
      forward:([c,l])=>{
        const delta=c.r2*squared(l.normal)-(dot(l.normal,c.center)-l.c)**2;
        return delta>0?2:delta===0?1:0;
      },
      subject:({inputs:[c,l]})=>`원 ${at(c)}과 직선 ${at(l)}의 서로 다른 교점의 개수`,
      explain:()=>discriminant?"직선의 식을 원의 식에 대입해 얻은 이차방정식의 판별식을 조사한다.":"중심에서 직선까지의 거리와 반지름을 비교한다.",
    };
  }
  Object.assign(rules,{
    recoverTranslation:{
      out:"point",ports:["point","point"],family:"이동량의 역추론",label:"이동 전후 좌표에서 이동량 결정",weight:3,
      back(displacement,rng){
        const original=center(rng);
        return {inputs:[original,add(original,displacement)]};
      },
      forward:([original,image])=>sub(image,original),
      answerPrompt:({inputs:[a,b]},path)=>{
        const given=`점 ${at(a)}를 점 ${at(b)}로 옮기는 평행이동을 생각하자.`;
        if(path.mode==="pair")return given+" 가로와 세로 방향의 이동량을 순서쌍으로 구하시오.";
        if(path.mode!=="linear")return given+` ${m(path.mode)}축 방향의 이동량을 구하시오.`;
        const [u,v]=path.names,[k,l]=path.weights;
        const expression=ForgeTopics.linear(k,u,l,v);
        return given+` 가로와 세로 방향의 이동량이 각각 ${m(u)}, ${m(v)}일 때, ${m(expression)}의 값을 구하시오.`;
      },
      explain:()=> "대응하는 두 좌표의 차를 구하면 가로와 세로 이동량이 각각 정해진다.",
    },
    circleLineIntersections:{
      out:"pointSet",ports:["circle","line"],family:"원과 직선의 교점",concepts:["두 교점의 분기"],
      label:"원과 직선의 연립방정식에서 실근 복원",weight:3,
      forward:([c,l])=>{
        const n=l.normal, q=squared(n), offset=l.c-dot(n,c.center);
        const discriminant=c.r2*q-offset*offset;
        if(discriminant<=0)return null;
        const foot=add(c.center,mul(n,offset/q)), v=mul(rotate(n),Math.sqrt(discriminant)/q);
        return [sub(foot,v),add(foot,v)];
      },
      refer:({inputs:[c,l]})=>`원 ${at(c)}과 직선 ${at(l)}의 교점`,
      explain:()=> "직선의 방정식을 원의 방정식에 대입해 두 실근에 대응하는 좌표를 모두 구한다.",
      cardinality:2,
    },
    chordCrossing:{
      out:"point",ports:["line","line"],family:"직선의 교점",label:"공통현과 주어진 직선의 교점",weight:3,
      accept:([a,b])=>a.op==="commonChord"&&b.op==="given",
      forward:([a,b])=>a.normal[0]*b.normal[1]===a.normal[1]*b.normal[0]?null:meet(a,b),
      clause:({inputs:[a,b]},suffix)=>`두 직선 ${m(a.name+","+b.name)}의 교점`+suffix,
      explain:()=> "공통현이 놓인 직선과 주어진 직선의 방정식을 연립한다.",
    },
    circleRadiusSquared:{
      out:"scalar",ports:["circle"],family:"지름과 반지름",label:"구성한 원의 반지름의 제곱",weight:3,
      accept:([c])=>c.op==="diameterOfPair",
      forward:([c])=>c.r2,
      subject:({inputs:[c]})=>`원 ${at(c)}의 반지름의 제곱`,
      explain:()=> "두 교점의 거리의 제곱을 4로 나눈다.",
    },
    circleLineDiscriminant:circleLineCount(true),
    circleLineDistance:circleLineCount(false),
    circleExistence:{
      out:"scalar",ports:["point"],family:"원이 되는 조건",label:"완전제곱 후 반지름의 제곱이 양수가 되는 경계",weight:3,
      forward:([p])=>1-squared(p),
      subject:({inputs:[p]})=>`점 ${at(p)}의 좌표를 ${m("(a,b)")}라 할 때, ${m("x^2+y^2-2ax-2by=k")}가 원을 나타내도록 하는 정수 ${m("k")}의 최솟값`,
      explain:()=> "완전제곱하면 반지름의 제곱은 상수에 중심의 두 좌표의 제곱을 더한 값이다. 이 값이 양수가 되는 가장 작은 정수를 고른다.",
    },
    composedCirclePositions:{
      out:"scalar",ports:["circle","circle"],family:"두 원의 위치 관계",label:"두 중심 거리와 반지름의 합·차 비교",weight:4,extended:true,
      seed:rng=>rand(rng,0,2),
      back(count,rng){
        const p=center(rng), r=rand(rng,3,5), s=rand(rng,1,2);
        const d=count===0?pick(rng,[r+s+1,r-s-1]):count===1?pick(rng,[r+s,r-s]):r;
        return {inputs:[circle(p,r*r),circle(add(p,mul(pick(rng,[[1,0],[0,1]]),d)),s*s)]};
      },
      forward:(circles)=>rules.circlePositionCount.forward([circles]),
      subject:({inputs:[a,b]})=>`두 원 ${m(a.name+","+b.name)}의 교점 개수`,
      explain:rules.circlePositionCount.explain,
    },
    composedExternalTangent:{
      out:"scalar",ports:["circle","point"],family:"원 밖의 점에서 접선",label:"접점에서의 직각을 이용해 접선 길이 결정",weight:3,extended:true,
      seed:rng=>12*rand(rng,1,2),
      back(length,rng){
        const p=center(rng), u=length/12;
        return {inputs:[circle(p,25*u*u),add(p,mul(pick(rng,[[1,0],[0,1]]),13*u))]};
      },
      forward:([c,p])=>Math.sqrt(squared(sub(p,c.center))-c.r2),
      subject:({inputs:[c,p]})=>`점 ${at(p)}에서 원 ${at(c)}에 그은 접선의 접점까지의 거리`,
      explain:rules.externalTangentLength.explain,
    },
  });
  function circleGiven(value,rng) {
    const {center:[h,k],r2}=value;
    if(rng()<.5)return circleText(value);
    const terms=[-2*h,-2*k,h*h+k*k-r2].map((n,i)=>n?(n>0?"+":"")+(i===2?n:term(n,["x","y"][i])):"");
    return "x^2+y^2"+terms.join("")+"=0";
  }
  ForgeChallengeGeometry = globalThis.ForgeChallengeGeometry = Object.freeze({rules,circleGiven,circleSeed,circleText,lineText,axes,images,relation:{circlePair,circlePositions,axisSection,externalPoint}});
})();


;

/* challenge-validation.js */
(() => {
  "use strict";
  const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8;
  const cross=([a,b],[c,d])=>a*d-b*c;
  const dot=([a,b],[c,d])=>a*c+b*d;
  const minus=([a,b],[c,d])=>[a-c,b-d];
  const norm=v=>dot(v,v);
  const on=(p,l)=>close(dot(p,l.normal),l.c);
  const pointEqual=(a,b)=>a.every((value,i)=>close(value,b[i]));
  const sameSet=(a,b)=>a.length===b.length&&b.every(point=>a.filter(other=>pointEqual(point,other)).length===1);
  const area2=(a,b,c)=>Math.abs(cross(minus(a,b),minus(a,c)));
  const checks={
    axisTangentCircle:(c,[p],axis)=>c.r2>0&&pointEqual(c.center,p)&&close(c.r2,p[axis]**2),
    reflectLine:(l,[a],axis)=>{
      const [x,y]=a.normal;
      const n=[[x,-y],[-x,y],[-x,-y],[y,x],[-y,-x]][axis];
      return cross(l.normal,n)===0&&close(l.c*norm(n),a.c*dot(l.normal,n));
    },
    translateLine:(l,[a],d)=>cross(l.normal,a.normal)===0&&
      close(l.c*norm(a.normal),(a.c+dot(a.normal,d))*dot(l.normal,a.normal)),
    translatePoint:(p,[a],d)=>pointEqual(minus(p,a),d),
    reflectPoint:(p,[[x,y]],d)=>pointEqual(p,[[x,-y],[-x,y],[-x,-y],[y,x],[-y,-x]][d]),
    translateCircle:(c,[a],d)=>c.r2>0&&c.r2===a.r2&&pointEqual(minus(c.center,a.center),d),
    reflectCircle:(c,[a],d)=>c.r2>0&&c.r2===a.r2&&checks.reflectPoint(c.center,[a.center],d),
    distanceLocus:(c,[p],r2)=>r2>0&&pointEqual(c.center,p)&&c.r2===r2,
    circleDiameter:(c,[a,b])=>c.r2>0&&pointEqual(minus(c.center,a),minus(b,c.center))&&close(c.r2,norm(minus(a,c.center))),
    circumcircle:(c,[a,b,d])=>c.r2>0&&area2(a,b,d)>0&&[a,b,d].every(p=>close(c.r2,norm(minus(p,c.center)))),
    circleCenter:(p,[c])=>c.r2>0&&pointEqual(c.center,p),
    tangentParallel:(l,[c,m])=>c.r2>0&&l.normal[1]!==0&&cross(l.normal,m.normal)===0&&
      (l.c-dot(c.center,l.normal))*l.normal[1]>0&&close((l.c-dot(c.center,l.normal))**2,c.r2*norm(l.normal)),
    tangentAtPoint:(l,[c,p])=>c.r2>0&&close(c.r2,norm(minus(p,c.center)))&&on(p,l)&&close(cross(minus(p,c.center),l.normal),0),
    reflectAcrossLine:(p,[a,l])=>on(p.map((x,i)=>(x+a[i])/2),l)&&close(cross(minus(p,a),l.normal),0),
    commonChord:(l,[[a,b]])=>{
      const delta=minus(b.center,a.center), distance2=norm(delta);
      if(distance2<=0||a.r2!==b.r2||distance2>=4*a.r2||!close(cross(l.normal,delta),0))return false;
      return close(2*l.c,dot(l.normal,a.center)+dot(l.normal,b.center));
    },
    circlePairIntersections:(points,[[a,b]])=>{
      const d=norm(minus(a.center,b.center));
      return d>0&&a.r2===b.r2&&d<4*a.r2&&points.length===2&&!pointEqual(...points)&&
        points.every(p=>[a,b].every(c=>close(norm(minus(p,c.center)),c.r2)));
    },
    diameterOfPair:(c,[points])=>checks.circleDiameter(c,points),
    chordIntercept:(t,[l])=>on(l.normal[0]?[t,0]:[0,t],l),
    tangentIntercept:(t,[l])=>l.normal[0]!==0&&on([t,0],l),
    recoverTranslation:(d,[a,b])=>a.every((value,i)=>close(value+d[i],b[i])),
    circleLineIntersections:(points,[c,l])=>{
      const [u,v]=l.normal, [h,k]=c.center;
      if(c.r2<=0||!u&&!v)return false;
      // Eliminate one coordinate using the published line equation.
      const swapped=Math.abs(u)>Math.abs(v);
      const [a,b,x,y]=swapped?[v,u,k,h]:[u,v,h,k];
      const offset=l.c-a*x-b*y, A=a*a+b*b, B=-2*a*offset;
      const C=offset*offset-c.r2*b*b, discriminant=B*B-4*A*C;
      if(discriminant<=0)return false;
      const candidates=[-1,1].map(sign=>{
        const t=x+(-B+sign*Math.sqrt(discriminant))/(2*A);
        const other=(l.c-a*t)/b;
        return swapped?[other,t]:[t,other];
      });
      return sameSet(points,candidates);
    },
    chordCrossing:(p,lines)=>checks.intersection(p,lines),
    circleRadiusSquared:(n,[c])=>n>0&&n===c.r2,
    circleLineDiscriminant:(n,inputs)=>checks.circleLineDistance(n,inputs),
    circleLineDistance:(n,[c,l])=>{
      const distance=Math.abs(dot(c.center,l.normal)-l.c)/Math.hypot(...l.normal);
      const radius=Math.sqrt(c.r2);
      return c.r2>0&&n===(close(distance,radius)?1:distance<radius?2:0);
    },
    circleExistence:(k,[p])=>Number.isInteger(k)&&k+norm(p)>0&&k-1+norm(p)<=0,
    composedCirclePositions:(n,circles)=>checks.circlePositionCount(n,[circles]),
    composedExternalTangent:(n,[circle,point])=>checks.externalTangentLength(n,[{circle,point}]),
    circlePositionCount:(n,[[a,b]])=>{
      const d2=norm(minus(a.center,b.center));
      if(a.r2<=0||b.r2<=0||d2===0&&a.r2===b.r2)return false;
      const discriminant=4*a.r2*b.r2-(d2-a.r2-b.r2)**2;
      return n===(discriminant>0?2:discriminant===0?1:0);
    },
    axisIntersectionCount:(n,[{circle,vertical,t}])=>{
      const d=Math.abs(t-circle.center[vertical?0:1]),r=Math.sqrt(circle.r2);
      return circle.r2>0&&n===(d>r?0:d===r?1:2);
    },
    externalTangentLength:(n,[{circle,point}])=>circle.r2>0&&n>0&&close(n*n+circle.r2,norm(minus(point,circle.center))),
    section:(p,[a,b],[r,s])=>r>0&&s>0&&norm(minus(a,b))>0&&
      pointEqual(minus(p,a).map(x=>x*s),minus(b,p).map(x=>x*r)),
    externalDivision:(p,[a,b],r)=>r>1&&norm(minus(a,b))>0&&
      pointEqual(minus(p,a),minus(p,b).map(x=>x*r)),
    centralReflection:(p,[a,o])=>norm(minus(a,o))>0&&pointEqual(minus(o,a),minus(p,o)),
    parallelogram:(p,[a,b,c])=>area2(a,b,c)>0&&pointEqual(minus(a,b),minus(p,c)),
    centroid:(p,[a,b,c])=>area2(a,b,c)>0&&p.every((x,i)=>close(3*x,a[i]+b[i]+c[i])),
    restoreVertex:(p,[g,a,b])=>area2(p,a,b)>0&&p.every((x,i)=>close(x+a[i]+b[i],3*g[i])),
    recoverEndpoint:(p,[m,a])=>norm(minus(a,p))>0&&pointEqual(minus(m,a),minus(p,m)),
    medianRatio:(p,[a,g])=>norm(minus(a,p))>0&&pointEqual(minus(g,a),minus(p,g).map(x=>2*x)),
    pointSlope:(l,[p],n)=>on(p,l)&&cross(n,l.normal)===0,
    twoPoints:(l,[a,b])=>norm(minus(a,b))>0&&on(a,l)&&on(b,l),
    parallel:(l,[p,m])=>on(p,l)&&cross(l.normal,m.normal)===0&&!on(p,m),
    perpendicular:(l,[p,m])=>on(p,l)&&dot(l.normal,m.normal)===0,
    bisector:(l,[a,b])=>norm(minus(a,b))>0&&cross(l.normal,minus(a,b))===0&&close(2*l.c,dot(a,l.normal)+dot(b,l.normal)),
    intersection:(p,[l,m])=>cross(l.normal,m.normal)!==0&&on(p,l)&&on(p,m),
    foot:(p,[a,l])=>on(p,l)&&close(cross(minus(p,a),l.normal),0),
    distance:(d,[a,b])=>d>0&&close(d*d,norm(minus(a,b))),
    originDistance:(d,[p])=>d>0&&close(d*d,norm(p)),
    median:(d,[a,b,c])=>area2(a,b,c)>0&&d>0&&close(4*d*d,norm(minus(minus(a,b),minus(c,a)))),
    triangleArea:(s,[a,b,c])=>s>0&&close(2*s,area2(a,b,c)),
    pointLine:(d,[p,l])=>d>0&&close(d*d*norm(l.normal),(dot(p,l.normal)-l.c)**2),
    parallelDistance:(d,[l,m])=>{
      if(d<=0||cross(l.normal,m.normal)!==0)return false;
      const i=l.normal.findIndex(x=>x!==0);
      return close(d*d*norm(l.normal)*m.normal[i]**2,(l.c*m.normal[i]-m.c*l.normal[i])**2);
    },
    latticeSolutions:(points,[[h,k,r,a,b]])=>{
      const candidates=[];
      // The enclosing square contains every point of the disk.
      for(let x=-r;x<=r;x++)for(let y=-r;y<=r;y++){
        if(x*x+y*y<=r*r && a*x+y>=b)candidates.push([h+x,k+y]);
      }
      return candidates.length>0&&sameSet(points,candidates);
    },
    halfPlaneLattice:(points,[[h,k,n,a,b]])=>{
      const candidates=[];
      for(let v=0;v<=Math.floor(n/b);v++){
        for(let u=Math.floor((n-b*v)/a);u>=0;u--)candidates.push([h+u,k+v]);
      }
      return sameSet(points,candidates);
    },
    extremeCoordinate:(value,[points],[axis,mode])=>points.some(p=>p[axis]===value)&&
      points.every(p=>mode==="최댓값"?p[axis]<=value:p[axis]>=value),
    extremePoints:(value,[points],[axis,mode])=>{
      if(!value.length)return false;
      const coordinate=value[0][axis];
      return points.every(p=>mode==="가장 큰"?p[axis]<=coordinate:p[axis]>=coordinate)&&
        sameSet(value,points.filter(p=>p[axis]===coordinate));
    },
    countPoints:(n,[points])=>n===points.length&&points.length>0,
    reflectEndpoint:(route,[original])=>route.vertical===original.vertical&&route.k===original.k&&
      pointEqual(route.B,original.B)&&close(route.A[0],original.A[0])&&close(route.A[1]+original.A[1],2*route.k),
    shortestPoint:(p,[{A,B,k,vertical}])=>{
      const q=vertical?p.slice().reverse():p;
      return (A[1]-k)*(B[1]-k)<0&&close(q[1],k)&&close(cross(minus(q,A),minus(B,A)),0)&&dot(minus(q,A),minus(q,B))<=0;
    },
    pathLengthSquared:(d,[{A,B,k}])=>d>0&&(A[1]-k)*(B[1]-k)<0&&close(d,norm(minus(A,B))),
    restoreIntegerPoints:(points,[[h,k,p]])=>{
      const candidates=[];
      for(let d=1;d*d<=p;d++)if(p%d===0) {
        const factors=d*d===p?[d]:[d,p/d];
        for(const u of factors)for(const sign of [-1,1])candidates.push([h+sign*u,k+sign*p/u]);
      }
      return sameSet(points,candidates);
    },
    combineCoordinateRoots:(points,[[h,k,a,b]])=>a>0&&b>0&&points.length===4&&
      points.every(([x,y])=>(x-h)**2===a*a&&(y-k)**2===b*b),
    midpointDistanceQuadratic:([a,b,c],[[,h,k]])=>a===1&&b===2*h&&c===h*h+k*k,
    movingDistanceQuadratic:([a,b,c],[[s,h,d]])=>a===1+s*s&&b===-2*(a*h+s*d)&&c===h*h+(s*h+d)**2,
    interceptRectangleQuadratic:([a,b,c],[[h,k]])=>a===-k&&b===2*h*k&&c===0,
    lineDistanceQuadratic:([a,b,c],[[n,,h]])=>a===2*n*n&&b===-4*n*n*h&&c===4*n*n*h*h,
    levelCrossings:(points,[[a,b,c]],r)=>{
      if(a<=0||r<=0||points.length!==2)return false;
      const level=c-b*b/(4*a)+a*r*r;
      return points.every(([t,y])=>y===0&&close(a*t*t+b*t+c,level))&&close(points[0][0]+points[1][0],-b/a);
    },
    extremum:(value,[[a,b,c]],mode,[input])=>{
      const t=-b/(2*a);
      if(!a||!Number.isFinite(t))return false;
      if(input.op==="interceptRectangleQuadratic"){
        const [h]=input.inputs[0].value;
        if(!(a<0&&t>0&&t<2*h))return false;
      }else if(a<0)return false;
      return mode==="parameter"?close(2*a*value+b,0):close(value,a*t*t+b*t+c);
    },
    bisectorSet:(lines,[[l,m]])=>lines.length===2&&cross(l.normal,m.normal)!==0&&cross(lines[0].normal,lines[1].normal)!==0&&
      lines.every(({normal:n,c})=>{
        const i=n.findIndex(x=>x!==0);
        const a=n.map(x=>x*c/norm(n)), b=[a[0]+n[1],a[1]-n[0]];
        return i>=0&&[a,b].every(p=>close((dot(p,l.normal)-l.c)**2*norm(m.normal),(dot(p,m.normal)-m.c)**2*norm(l.normal)));
      }),
    intersectEach:(points,[lines,cut])=>points.length===lines.length&&points.every(p=>on(p,cut))&&
      lines.every(l=>cross(l.normal,cut.normal)!==0&&points.filter(p=>on(p,l)).length===1),
    midpointOfPair:(p,[[a,b]])=>pointEqual(minus(p,a),minus(b,p)),
    separation:(d,[[a,b]])=>d>0&&close(d,norm(minus(a,b))),
    boundary:(sides,[points])=>sides.length===points.length&&sameSet(sides.map(([p])=>p),points)&&
      sides.every(([a,b],i)=>pointEqual(b,sides[(i+1)%sides.length][0])&&norm(minus(a,b))>0)&&
      [1,-1].some(sign=>sides.every(([a,b])=>points.every(p=>sign*cross(minus(b,a),minus(p,a))>=0))),
    areaOfBoundary:(s,[sides])=>s>0&&close(2*s,Math.abs(sides.reduce((sum,[a,b])=>sum+cross(a,b),0))),
    sideMidpoints:(points,[sides],mode)=>{
      const lengths=sides.map(([a,b])=>norm(minus(a,b)));
      const best=(mode==="긴"?Math.max:Math.min)(...lengths);
      return sameSet(points,sides.filter((_,i)=>lengths[i]===best).map(([a,b])=>a.map((x,i)=>(x+b[i])/2)));
    },
  };
  ForgeChallengeValidation = globalThis.ForgeChallengeValidation = Object.freeze({
    check({op,value,inputs,data}){
      if(op==="given")return true;
      return Boolean(checks[op]?.(value,inputs.map(node=>node.value),data,inputs));
    },
  });
})();


;

/* problem-prose.js */
(() => {
  "use strict";
  const {m,pick}=ForgeTopics;
  const short=text=>text.replace(/\\[a-z]+/gi,"x").replace(/[$\\{}_^]/g,"").length;
  const join=(first,second)=>first.endsWith("이고")?first+", "+second:first+" "+second;

  // A declaration may move only after all the symbols it reads are available.
  // Prefer parallel declarations of the same kind and keep names in reading order.
  function order(clauses,known,rng){
    const pending=[...clauses], ordered=[], defined=new Set(known);
    while(pending.length){
      const ready=pending.filter(clause=>clause.reads.every(id=>defined.has(id)));
      if(!ready.length)throw new Error("문항의 선언 순서를 결정할 수 없습니다.");
      const last=ordered.at(-1);
      const siblings=last?ready.filter(clause=>clause.group===last.group):[];
      const groups=ready.filter((clause,i)=>ready.findIndex(other=>other.group===clause.group)===i);
      const clause=siblings[0]??(rng()<.35?pick(rng,groups):ready[0]);
      pending.splice(pending.indexOf(clause),1);
      ordered.push(clause);
      defined.add(clause.id);
    }
    return ordered;
  }

  function compose({prefix=[],clauses,known=[],question,reads=[],afterDisplay=false},rng){
    const lines=[...prefix], ordered=order(clauses,known,rng);
    const connect=rng()<.78;
    let tail=question;
    const last=ordered.at(-1);
    // Attach only a condition that directly feeds the question. Leave a
    // question with its own conditional intact.
    if(connect&&last?.when&&reads.includes(last.id)&&!/(?:일|할|는|될|인) 때[, ]/.test(question)&&short(last.when+question)<=105){
      ordered.pop();
      tail=last.when+", "+question;
      const previous=ordered.at(-1);
      if(previous?.and&&previous.group===last.group&&!/(?:이고|이며).+(?:이고|이며)/u.test(previous.and)&&short(previous.and+tail)<=100&&rng()<.65){
        ordered.pop();
        tail=join(previous.and,tail);
      }
    }
    for(let i=0;i<ordered.length;i++){
      const current=ordered[i], next=ordered[i+1];
      if(connect&&current.and&&next?.group===current.group&&!/(?:이고|이며).+(?:이고|이며)/u.test(current.and)&&short(current.and+next.sentence)<=80){
        lines.push(join(current.and,next.sentence));
        i++;
      }else lines.push(current.sentence);
    }
    if(tail===question&&connect&&(prefix.length||lines.length)&&rng()<.25&&
      !/^(?:이때|위 |아래|다음|‘)/u.test(question))tail="이때 "+question;
    return afterDisplay?{intro:prefix.join(" "),question:[...lines.slice(prefix.length),tail].join(" ")}:
      {intro:lines.join(" "),question:tail};
  }

  function equality(id,group,reads,expression){
    return {id,group,reads,sentence:expression+"이다.",and:expression+"이고",when:expression+"일 때"};
  }

  const hasFinal=name=>/(?:[LMNR]|\\ell)$/i.test(name.replace(/_\{?\d+\}?$/u,""));
  const topic=name=>hasFinal(name)?"은":"는";
  const subject=name=>hasFinal(name)?"이":"가";
  const object=name=>hasFinal(name)?"을":"를";
  const formulaOnly=/^\$[^$]+\$$/u;
  function setDefinition(node,reads,expression){
    const name=m(node.name);
    if(formulaOnly.test(expression))return equality(node.id,"set",reads,m(node.name+"="+expression.slice(1,-1)));
    return {id:node.id,group:"set",reads,sentence:name+topic(node.name)+" "+expression+"이다.",
      when:name+subject(node.name)+" "+expression+"일 때"};
  }

  // Older question writers already supply finished prose. Only join an
  // isolated terminal equation, preserving the original order and context.
  function polish(data,{joinLegacy=false}={}){
    const repair=text=>text.replace(/집합 (\$[^$]+\$)(?:을|를) 다음과 같이 정한다\. (\$[^$]+\$)\./gu,
      (_,name,value)=>m(name.slice(1,-1)+"="+value.slice(1,-1))+"이다.")
      .replace(/(개수|좌표|넓이|거리)을 구하시오/gu,"$1를 구하시오")
      .replace(/(최솟값|최댓값|절편|방정식|의 값)를 구하시오/gu,"$1을 구하시오");
    const intro=repair(data.intro), question=repair(data.question)
      .replace(/(?<lead>(?:점|선분|직선|원) )(?<math>\$[^$]+\$)(?<ending>을|를)(?= )/gu,(all,lead,math,ending)=>{
        const name=math.slice(1,-1);
        return /^(?:[A-Z]{1,3}|\\ell(?:_\{?\d+\}?)?)$/u.test(name)?lead+math+object(name):all;
      });
    const finalEquation=intro.match(/(?:^|\. )(?<fact>\$[^$]+\$)이다\.$/u);
    if(joinLegacy&&!data.expressions.length&&finalEquation&&/^\$[^$]+(?:=|<|>|\\le\b|\\ge\b)[^$]+\$$/u.test(finalEquation.groups.fact)&&
      !/(?:일|할|는|될|인) 때[, ]|^(?:다음|위 |아래|이 |그 )/u.test(question)&&short(finalEquation.groups.fact+question)<76&&
      [...question.matchAll(/\$([^$]+)\$/gu)].some(([,formula])=>/[A-Za-z]/.test(formula)&&
        [...formula.matchAll(/(?<![A-Za-z\\])[A-Za-z](?![A-Za-z])/gu)].some(([symbol])=>finalEquation.groups.fact.includes(symbol)))){
      return {...data,intro:intro.slice(0,intro.lastIndexOf(finalEquation.groups.fact)).trimEnd(),
        question:finalEquation.groups.fact+"일 때, "+question};
    }
    return intro===data.intro&&question===data.question?data:{...data,intro,question};
  }

  ForgeProblemProse = globalThis.ForgeProblemProse = Object.freeze({compose,equality,setDefinition,polish,topic,subject,object});
})();


;

/* relation-search.js */
(() => {
  "use strict";

  const equal=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
  const distinct=values=>[...new Map(values.map(value=>[JSON.stringify(value),value])).values()];
  function solve({models,conditions,project,reduce=distinct,check,validateTarget=()=>true,witnessOf}){
    const accepted=(model,items)=>items.every(({accept})=>accept(model));
    const survivors=models.filter(model=>accepted(model,conditions));
    if(!survivors.length||survivors.some(model=>!validateTarget(project(model))))return null;
    if(check&&models.some(model=>accepted(model,conditions)!==check(model,conditions)))return null;
    const answer=reduce(survivors.map(project));
    const effects=[];
    for(const removed of conditions){
      const relaxed=models.filter(model=>accepted(model,conditions.filter(condition=>condition!==removed)));
      const alternative=reduce(relaxed.map(project).filter(validateTarget));
      if(equal(answer,alternative))return null;
      const witness=relaxed.find(model=>!removed.accept(model)&&validateTarget(project(model))&&
        (!witnessOf||witnessOf(project(model),survivors.map(project))));
      if(witness===undefined)return null;
      effects.push({removed,alternative,witness});
    }
    return {survivors,answer,effects};
  }

  // Canonical expression of the dependencies. Labels, coefficients,
  // notation, and presentation are deliberately absent.
  function signature(graph,output){
    const nodes=new Map(graph.flat().map(node=>[node.id,node]));
    const visit=id=>{
      const {operation,from,port,unordered}=nodes.get(id);
      const inputs=from.map(visit);
      if(unordered)inputs.sort();
      return (port?operation+":"+port:operation)+(inputs.length?"("+inputs.join(",")+")":"");
    };
    return visit(output??graph.at(-1).at(-1).id);
  }

  ForgeRelationSearch = globalThis.ForgeRelationSearch = Object.freeze({solve,signature});
})();


;

/* challenge-compiler.js */
(() => {
  "use strict";
  const {m,tex,problem,scalar,point,coord,linear,shift,term,rand,pick,signed,counted}=ForgeTopics;
  const {add,sub,mul,dot,through,meet,between,centroid,triangleArea}=ForgePlaneConceptCompiler.math;
  const offset=(p,v,n=1)=>add(p,mul(v,n));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const samePoint=(a,b)=>a.every((n,i)=>Math.abs(n-b[i])<1e-9);
  const normalOf=([x,y])=>[y,-x];
  const length=(a,b)=>Math.hypot(...sub(a,b));
  const symbol=node=>m(node.name);
  const segment=(a,b)=>m(a.name+b.name);
  const tuple=node=>m(coord(node.value));
  const at=(name,p)=>m(name+coord(p));
  const integralDirection=rng=>pick(rng,[[1,1],[2,1],[1,2],[3,4],[4,3]]).map(n=>n*pick(rng,[-1,1]));
  const distanceVector=(d,rng)=>{
    const legs=d%5===0?[3*d/5,4*d/5]:[5,12];
    return pick(rng,[legs,legs.slice().reverse()]).map(n=>n*pick(rng,[-1,1]));
  };
  const compactNumber=n=>Object.is(n,-0)?0:n;
  const fraction=(a,b)=>{
    if(b<0){a=-a;b=-b;}
    let x=Math.abs(a),y=b;
    while(y)[x,y]=[y,x%y];
    return b===x?String(a/x):tex`${a<0?"-":""}\frac{${Math.abs(a)/x}}{${b/x}}`;
  };
  const equation=({normal:[a,b],c},scale=1,rearrange=false)=>{
    if(!a||!b)return (a?"x":"y")+"="+fraction(c,a||b);
    if(!rearrange)return linear(a*scale,"x",b*scale,"y")+"="+c*scale;
    return term(b*scale,"y")+"="+shift(term(-a*scale,"x"),-c*scale);
  };
  const demandLine=(p,normal)=>({...through(p,normal),p});
  const distanceToLine=(p,L)=>Math.abs(dot(p,L.normal)-L.c)/Math.hypot(...L.normal);
  const sameLine=(a,b)=>b.normal[0]*a.normal[1]===b.normal[1]*a.normal[0]&&
    a.normal.every((n,i)=>n*b.c===b.normal[i]*a.c);
  const midpoint=(a,b)=>between(a,b,1,1);
  const projection=(p,l)=>offset(p,l.normal,(l.c-dot(p,l.normal))/dot(l.normal,l.normal)).map(compactNumber);
  const area=(a,b,c)=>triangleArea(a,b,c);

  // Each rule carries the types of its ports, its inverse construction and
  // the independent forward calculation used to verify the public problem.
  const rules={
    section:{
      out:"point", ports:["point","point"], family:"내분", label:"내분점", weight:2,
      back(p,rng){
        const v=integralDirection(rng), a=rand(rng,1,3), b=a===1?rand(rng,2,3):1;
        return {inputs:[offset(p,v,-a),offset(p,v,b)],data:[a,b]};
      },
      forward:([A,B],[a,b])=>between(A,B,a,b),
      clause:({inputs:[A,B],data:[a,b]},subject)=>`선분 ${segment(A,B)}를 ${m(a+":"+b)}로 내분하는 점${subject}`,
    },
    externalDivision:{
      out:"point", ports:["point","point"], family:"외분", label:"외분점", weight:3,
      back(p,rng){
        const v=integralDirection(rng), a=rand(rng,2,4);
        return {inputs:[offset(p,v,a),offset(p,v)],data:a};
      },
      forward:([A,B],a)=>mul(sub(mul(B,a),A),1/(a-1)).map(n=>Math.round(n*1e9)/1e9),
      clause:({inputs:[A,B],data:a},subject)=>`선분 ${segment(A,B)}를 ${m(a+":1")}로 외분하는 점${subject}`,
    },
    centralReflection:{
      out:"point", ports:["point","point"], family:"점대칭", label:"점대칭으로 대응점 복원", weight:3,
      back(p,rng){const v=integralDirection(rng);return {inputs:[offset(p,v,2),offset(p,v)]};},
      forward:([P,O])=>sub(mul(O,2),P),
      clause:({inputs:[P,O]},subject)=>`점 ${symbol(P)}를 점 ${symbol(O)}에 대하여 대칭이동한 점${subject}`,
    },
    parallelogram:{
      out:"point", ports:["point","point","point"], family:"평행사변형", label:"평행사변형의 꼭짓점 복원", weight:3,
      back(p,rng){
        const u=integralDirection(rng), v=normalOf(u);
        return {inputs:[offset(p,u),add(offset(p,u),v),offset(p,v)]};
      },
      forward:([A,B,C])=>add(A,sub(C,B)),
      declaration:({inputs:[A,B,C],name})=>`네 점 ${m(A.name+B.name+C.name+name)}는 이 순서대로 평행사변형의 꼭짓점이다.`,
    },
    centroid:{
      out:"point", ports:["point","point","point"], family:"무게중심", label:"무게중심", weight:3,
      back(p,rng){
        const u=integralDirection(rng), v=normalOf(u).map(n=>Math.sign(n));
        return {inputs:[offset(p,u),offset(p,v),sub(p,add(u,v))]};
      },
      forward:([A,B,C])=>centroid(A,B,C),
      clause:({inputs},subject)=>`삼각형 ${m(inputs.map(n=>n.name).join(""))}의 무게중심${subject}`,
    },
    restoreVertex:{
      out:"point", ports:["point","point","point"], family:"무게중심", label:"무게중심에서 꼭짓점 역산", weight:3,
      back(p,rng){
        const a=integralDirection(rng), b=normalOf(a).map(n=>Math.sign(n)), g=offset(p,a);
        return {inputs:[g,offset(p,b),sub(offset(p,a,3),b)]};
      },
      forward:([G,A,B])=>sub(mul(G,3),add(A,B)),
      declaration:({inputs:[G,A,B],name})=>`삼각형 ${m(A.name+B.name+name)}의 무게중심은 ${symbol(G)}이다.`,
    },
    recoverEndpoint:{
      out:"point", ports:["point","point"], family:"중점", label:"중점에서 끝점 역산", weight:2,
      back(p,rng){const v=integralDirection(rng);return {inputs:[offset(p,v),offset(p,v,2)]};},
      forward:([M,A])=>sub(mul(M,2),A),
      declaration:({inputs:[M,A],name})=>`선분 ${m(A.name+name)}의 중점은 ${symbol(M)}이다.`,
    },
    medianRatio:{
      out:"point", ports:["point","point"], family:"중선의 내분", label:"무게중심의 2:1 내분 관계", weight:3,
      back(p,rng){
        const v=integralDirection(rng);
        return {inputs:[offset(p,v,3),offset(p,v)]};
      },
      forward:([A,G])=>mul(sub(mul(G,3),A),.5),
      clause:({inputs:[A,G]},subject)=>`삼각형의 한 꼭짓점이 ${symbol(A)}이고 무게중심이 ${symbol(G)}일 때, 꼭짓점 ${symbol(A)}의 대변의 중점${subject}`,
    },
    pointSlope:{
      out:"line", ports:["point"], family:"직선의 결정", label:"점과 기울기로 직선 결정", weight:1,
      back:({p,normal})=>({inputs:[p],data:normal}),
      forward:([P],normal)=>through(P,normal),
      clause:({inputs:[P],data:[a,b]},subject)=>`점 ${symbol(P)}를 지나고 기울기가 ${m(fraction(-a,b))}인 직선${subject}`,
    },
    twoPoints:{
      out:"line", ports:["point","point"], family:"직선의 결정", label:"두 점으로 직선 결정", weight:2,
      back:({p,normal},rng)=>({inputs:[p,offset(p,normalOf(normal),pick(rng,[-1,1]))]}),
      forward:([A,B])=>through(A,normalOf(sub(B,A))),
      clause:({inputs:[A,B]},subject)=>`두 점 ${m(A.name+","+B.name)}를 지나는 직선${subject}`,
    },
    parallel:{
      out:"line", ports:["point","givenLine"], family:"평행·수직", label:"평행 조건으로 직선 결정", weight:3,
      back:({p,normal})=>({inputs:[p,demandLine(offset(p,normal),normal)]}),
      forward:([P,L])=>through(P,L.normal),
      clause:({inputs:[P,L]},subject)=>`점 ${symbol(P)}를 지나고 직선 ${symbol(L)}에 평행한 직선${subject}`,
    },
    perpendicular:{
      out:"line", ports:["point","givenLine"], family:"평행·수직", label:"수직 조건으로 직선 결정", weight:3,
      back:({p,normal})=>({inputs:[p,demandLine(p,normalOf(normal))]}),
      forward:([P,L])=>through(P,normalOf(L.normal)),
      clause:({inputs:[P,L]},subject)=>`점 ${symbol(P)}를 지나고 직선 ${symbol(L)}에 수직인 직선${subject}`,
    },
    bisector:{
      out:"line", ports:["point","point"], family:"등거리 자취", label:"두 점에서 등거리인 점의 자취", weight:3,
      back({p,normal},rng){
        const h=offset(p,normalOf(normal),signed(rng,2));
        return {inputs:[offset(h,normal),sub(h,normal)]};
      },
      forward:([A,B])=>through(midpoint(A,B),sub(A,B)),
      clause:({inputs:[A,B]},subject)=>`두 점 ${m(A.name+","+B.name)}에서 같은 거리에 있는 점의 자취인 직선${subject}`,
    },
    intersection:{
      out:"point", ports:["line","line"], family:"교점", label:"두 직선의 교점", weight:3,
      back(p,rng){
        const n=integralDirection(rng), second=normalOf(n);
        // The two lines need only meet at the chosen point. Separate anchors
        // along each line keep the intersection from being given as a point.
        return {inputs:[n,second].map(v=>demandLine(offset(p,normalOf(v),signed(rng,2)),v))};
      },
      forward:([L,M])=>meet(L,M).map(compactNumber),
      clause:({inputs:[L,M]},subject)=>`두 직선 ${m(L.name+","+M.name)}의 교점${subject}`,
    },
    foot:{
      out:"point", ports:["point","line"], family:"수선의 발", label:"수선의 발 결정", weight:3,
      back(p,rng){
        const n=integralDirection(rng);
        return {inputs:[offset(p,n,signed(rng,2)),demandLine(offset(p,normalOf(n),signed(rng,2)),n)]};
      },
      forward:([P,L])=>projection(P,L),
      clause:({inputs:[P,L]},subject)=>`점 ${symbol(P)}에서 직선 ${symbol(L)}에 내린 수선의 발${subject}`,
    },
    distance:{
      out:"scalar", ports:["point","point"], family:"두 점 사이의 거리", label:"두 점 사이의 거리", weight:2,
      seed:rng=>pick(rng,[5,10,13]),
      back(d,rng){const a=anchor(rng);return {inputs:[a,offset(a,distanceVector(d,rng))]};},
      forward:([A,B])=>length(A,B),
      subject:({inputs:[A,B]})=>`선분 ${segment(A,B)}의 길이`,
    },
    originDistance:{
      out:"scalar",ports:["point"],family:"원점까지의 거리",label:"원점에서 점까지의 거리",
      seed:rng=>pick(rng,[5,10,13]),
      back(d,rng){return {inputs:[distanceVector(d,rng)]};},
      forward:([p])=>Math.hypot(...p),
      subject:({inputs:[p]})=>`원점과 점 ${symbol(p)} 사이의 거리`,
    },
    median:{
      out:"scalar", ports:["point","point","point"], family:"중선의 길이", label:"중점과 꼭짓점 사이의 거리", weight:3,
      seed:rng=>pick(rng,[5,10,13]),
      back(d,rng){
        const h=anchor(rng), v=distanceVector(d,rng), u=normalOf(v).map(n=>Math.sign(n));
        return {inputs:[offset(h,v),offset(h,u),sub(h,u)]};
      },
      forward:([A,B,C])=>length(A,midpoint(B,C)),
      subject:({inputs:[A,B,C]})=>`삼각형 ${m(A.name+B.name+C.name)}에서 꼭짓점 ${symbol(A)}를 지나는 중선의 길이`,
    },
    triangleArea:{
      out:"scalar", ports:["point","point","point"], family:"삼각형의 넓이", label:"삼각형의 넓이", weight:2,
      seed:rng=>rand(rng,3,12),
      back(s,rng){
        const a=anchor(rng), u=pick(rng,[[1,0],[0,1],[1,1],[-1,1]]);
        const v=u[0]?[0,Math.sign(u[0])]:[-1,0];
        return {inputs:[a,offset(a,u,2),offset(offset(a,v,s),u,signed(rng,2))]};
      },
      forward:([A,B,C])=>area(A,B,C),
      subject:({inputs})=>`삼각형 ${m(inputs.map(n=>n.name).join(""))}의 넓이`,
    },
    parallelDistance:{
      out:"scalar", ports:["line","line"], family:"평행선 사이의 거리", label:"평행선 사이의 거리", weight:3,
      seed:rng=>rand(rng,2,6),
      back(d,rng){
        const n=pick(rng,[[3,4],[4,3]]), p=anchor(rng);
        const v=n[0]===3?[3,-1]:[-1,3];
        return {inputs:[demandLine(p,n),demandLine(offset(p,v,d),n)]};
      },
      forward:([L,M])=>{
        const i=M.normal[0]?0:1;
        return Math.abs(L.c-M.c*L.normal[i]/M.normal[i])/Math.hypot(...L.normal);
      },
      subject:({inputs:[L,M]})=>`두 평행선 ${m(L.name+","+M.name)} 사이의 거리`,
    },
    pointLine:{
      out:"scalar", ports:["point","line"], family:"점과 직선 사이의 거리", label:"점과 직선 사이의 거리", weight:3,
      seed:rng=>rand(rng,2,7),
      back(d,rng){
        const n=pick(rng,[[3,4],[4,3]]), p=anchor(rng), c=dot(n,p)-d*5;
        const base=offset(p,n[0]===3?[3,-1]:[-1,3],-d);
        return {inputs:[p,{normal:n,c,p:base}]};
      },
      forward:([P,L])=>distanceToLine(P,L),
      subject:({inputs:[P,L]})=>`점 ${symbol(P)}와 직선 ${symbol(L)} 사이의 거리`,
    },
  };

  const {rules:relationalRules,relation,math:relationMath,present,pointSetAnswer,setKey}=ForgeChallengeRelations;
  const geometry=ForgeChallengeGeometry;
  Object.assign(rules,relationalRules,geometry.rules);
  Object.assign(relation,geometry.relation,{
    circle:{cost:1,sample:geometry.circleSeed,math:geometry.circleText},
  });
  Object.assign(relationMath,{circle:geometry.circleText});
  const circleRules=["circleLineIntersections","axisTangentCircle","distanceLocus","circleDiameter","circumcircle","circleCenter","tangentAtPoint","tangentParallel","tangentIntercept","commonChord","circlePairIntersections","diameterOfPair","chordIntercept"];
  const circlePracticeRules=["chordCrossing","circleRadiusSquared","circleExistence","circleLineDiscriminant","circleLineDistance","composedCirclePositions","composedExternalTangent"];
  const movementRules=["recoverTranslation","translatePoint","translateLine","reflectLine","reflectPoint","translateCircle","reflectCircle","centralReflection","reflectAcrossLine"];

  const units={
    coordinate:{title:"평면좌표",allowed:["section","externalDivision","centralReflection","parallelogram","centroid","restoreVertex","recoverEndpoint","medianRatio","distance","originDistance","median","triangleArea","restoreIntegerPoints","combineCoordinateRoots","boundary","areaOfBoundary","sideMidpoints","separation","midpointDistanceQuadratic","movingDistanceQuadratic","extremum","levelCrossings","latticeSolutions","halfPlaneLattice","countPoints","extremeCoordinate","extremePoints"]},
    lines:{title:"직선의 방정식",allowed:["pointSlope","twoPoints","parallel","perpendicular","bisector","intersection","foot","pointLine","parallelDistance","triangleArea","bisectorSet","intersectEach","midpointOfPair","separation","interceptRectangleQuadratic","lineDistanceQuadratic","extremum","reflectEndpoint","shortestPoint","pathLengthSquared","halfPlaneLattice","countPoints","extremeCoordinate","extremePoints"]},
    circles:{title:"원의 방정식",allowed:[...circleRules,...movementRules,"section","perpendicular","intersection","distance","pointLine","parallelDistance","triangleArea","midpointOfPair","separation","extremeCoordinate","extremePoints"]},
    transformations:{title:"도형의 이동",allowed:[...movementRules,...circleRules,"section","centroid","distance","pointLine","triangleArea","twoPoints","intersection"]},
  };
  const anchor=rng=>[rand(rng,-4,4),rand(rng,-4,4)];
  const leaf=(port)=>({op:"given",port,out:port==="givenLine"?"line":port,children:[],facts:relation[port]?.cost??1,depth:0,families:new Set()});
  function splits(total,ports){
    if(ports===1)return [[total]];
    return Array.from({length:total+1},(_,n)=>splits(total-n,ports-1).map(parts=>[n,...parts])).flat();
  }
  const signature=shape=>shape.op==="given"?shape.port:shape.op+"("+shape.children.map(signature).join(",")+")";
  function sourceKinds(shape) {
    return shape.op==="given"?[shape.out]:shape.children.flatMap(sourceKinds);
  }
  function familyOf(shape) {
    const kinds=[...new Set(sourceKinds(shape).filter(kind=>Object.hasOwn(relation,kind)&&kind!=="transversal"))];
    return kinds.length?kinds.sort().join("+"):"explicit";
  }

  function dependencyPlanner(unit,practice,includeExtensions,rng) {
    const allowed=practice&&unit===units.circles?[...unit.allowed,...circlePracticeRules]:unit.allowed;
    const producers=new Map();
    for(const op of allowed){
      const rule=rules[op];
      if(!includeExtensions&&rule.extended)continue;
      if(!producers.has(rule.out))producers.set(rule.out,[]);
      producers.get(rule.out).push(op);
    }
    const partitionCache=new Map();
    function partitions(count,ports) {
      const key=count+":"+ports;
      if(!partitionCache.has(key))partitionCache.set(key,splits(count,ports));
      return partitionCache.get(key);
    }
    const terminal=port=>["point","line","givenLine"].includes(port)||Object.hasOwn(relation,port);
    const feasibleCache=new Map();
    function feasible(port,count,goal,backwards) {
      const key=JSON.stringify([port,count,goal??null,backwards]);
      if(feasibleCache.has(key))return feasibleCache.get(key);
      const value=count===0?!goal&&terminal(port):options(port,count,goal,backwards).length>0;
      feasibleCache.set(key,value);
      return value;
    }
    const optionsCache=new Map();
    function options(port,count,goal,backwards){
      const key=JSON.stringify([port,count,goal??null,backwards]);
      if(optionsCache.has(key))return optionsCache.get(key);
      const choices=[];
      for(const op of producers.get(port)??[]){
        const rule=rules[op], invertible=Boolean(rule.back);
        if(backwards===true&&!invertible||backwards===false&&invertible)continue;
        const remaining=goal?.includes(op)?null:goal;
        for(const budget of partitions(count-1,rule.ports.length)){
          const seats=remaining?rule.ports.map((_,i)=>i):[-1];
          for(const seat of seats){
            const requirements=rule.ports.map((input,i)=>({port:input,count:budget[i],goal:i===seat?remaining:null,
              backwards:invertible?true:practice?null:false}));
            if(requirements.every(child=>feasible(child.port,child.count,child.goal,child.backwards)))choices.push({op,requirements});
          }
        }
      }
      optionsCache.set(key,choices);
      return choices;
    }
    function grow(port,count,goal,backwards,ancestors=[]) {
      if(!count)return !goal&&terminal(port)?leaf(port):null;
      const candidates=options(port,count,goal,backwards).filter(({op})=>op!==ancestors.at(-1)&&(op!=="recoverTranslation"||ancestors.length===0));
      // A bounded search samples typed port assignments. Cache entries describe
      // reachability only. Complete relation graphs are created for this request.
      for(let i=0;i<Math.min(5,candidates.length);i++){
        const {op,requirements}=candidates.splice(rand(rng,0,candidates.length-1),1)[0], rule=rules[op];
        const children=requirements.map(child=>grow(child.port,child.count,child.goal,child.backwards,[...ancestors,op]));
        if(children.some(child=>!child)||rule.accept&&!rule.accept(children))continue;
        const facts=children.reduce((sum,child)=>sum+child.facts,0);
        if(facts>5||op==="medianRatio"&&children[1].op==="centroid"||
          op==="parallelDistance"&&children.every(child=>["parallel","perpendicular","pointSlope"].includes(child.op))||
          op==="circleCenter"&&["axisTangentCircle","distanceLocus","circleDiameter"].includes(children[0].op))continue;
        const families=new Set([rule.family,...(rule.concepts??[]),...children.flatMap(child=>[...child.families])]);
        return {op,out:port,children,facts,families,cardinality:rule.cardinality,convex:rule.convex,
          depth:1+Math.max(...children.map(child=>child.depth))};
      }
      return null;
    }
    return {grow,feasible};
  }

  function construct(shape,wanted,rng) {
    if(shape.op==="given"){
      const sample=shape.out==="point"?()=>anchor(rng):shape.out==="line"?()=>demandLine(anchor(rng),integralDirection(rng)):relation[shape.out].sample;
      return {...shape,wanted:wanted??sample(rng),inputs:[]};
    }
    const rule=rules[shape.op];
    if(wanted===undefined&&rule.back)wanted=seedFor(shape,rng);
    if(wanted!==undefined){
      const {inputs,data}=rule.back(wanted,rng);
      return {...shape,wanted,data,inputs:shape.children.map((child,i)=>construct(child,inputs[i],rng))};
    }
    const data=rule.plan?.(rng,shape.children);
    const inputs=[];
    for(const child of shape.children){
      inputs.push(construct(child,rule.inputDemand?.(inputs.length,inputs,rng),rng));
    }
    return {...shape,data,inputs};
  }

  function verify(root) {
    const nodes=[], points=[], lines=[];
    function visit(node) {
      if(node.inputs.some(child=>!visit(child)))return false;
      const rule=rules[node.op];
      node.id="c"+nodes.length;
      node.value=rule?rule.forward(node.inputs.map(input=>input.value),node.data):node.wanted;
      if(node.value==null)return false;
      const matches=!rule||node.wanted===undefined|| (node.out==="line"?sameLine(node.value,node.wanted)
        :node.out==="point"?samePoint(node.value,node.wanted):node.out==="circle"?samePoint(node.value.center,node.wanted.center)&&node.value.r2===node.wanted.r2:Math.abs(node.value-node.wanted)<1e-9);
      if(!ForgeChallengeValidation.check(node)||!matches||node.cardinality!==undefined&&node.value.length!==node.cardinality)return false;
      if(node.out==="pointSet"&&(new Set(node.value.map(coord)).size!==node.value.length||!node.value.flat().every(Number.isSafeInteger)))return false;
      nodes.push(node);
      (node.out==="point"?points:node.out==="line"?lines:[]).push(node);
      return true;
    }
    if(!visit(root))return null;
    if(points.some((p,i)=>p.value.some(n=>Math.abs(n)>32)||points.slice(0,i).some(q=>samePoint(p.value,q.value))))return null;
    if(lines.some((line,i)=>lines.slice(0,i).some(other=>sameLine(line.value,other.value))))return null;
    const values=root.out==="circle"?[...root.value.center,root.value.r2]:root.out==="line"?[...root.value.normal,root.value.c]:[root.value].flat(2);
    if(!values.every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=(["circle","line"].includes(root.out)||root.wanted===undefined?10000:36)))return null;
    if(root.out==="pointSet"&&new Set(root.value.map(coord)).size!==root.value.length)return null;
    return nodes;
  }

  function render(unit,shape,root,nodes,rng,format,answerPath) {
    const given=nodes.filter(node=>node.op==="given");
    const derived=nodes.filter(node=>node.op!=="given");
    const publicPoints=given.filter(node=>node.out==="point");
    const publicLines=given.filter(node=>node.out==="line");
    publicPoints.forEach((node,i)=>node.name="ABCDEF"[i]);
    derived.filter(node=>node.out==="point").forEach((node,i)=>node.name="PQRST"[i]);
    [...publicLines,...derived.filter(node=>node.out==="line")].forEach((node,i)=>node.name=tex`\ell_{${i+1}}`);
    if(publicLines.length+derived.filter(node=>node.out==="line").length===1)
      (publicLines[0]??derived.find(node=>node.out==="line")).name=tex`\ell`;

    [...given,...derived].filter(node=>node.out==="circle").forEach((node,i)=>node.name="C_{"+(i+1)+"}");
    const givens=[], declarations=[], expressions=[];
    for(const node of given.filter(node=>node.out==="circle")) {
      givens.push(`원 ${m(node.name+":"+geometry.circleGiven(node.value,rng))}이 있다.`);
    }
    if(publicPoints.length)givens.push(`${counted("점",publicPoints.length)} ${publicPoints.map(node=>at(node.name,node.value)).join(", ")}가 있다.`);
    if(publicLines.length){
      const definitions=publicLines.map(node=>node.name+": "+equation(node.value,pick(rng,[1,1,2]),rng()<.5));
      if(ForgeNotation.needsDisplay(definitions.join(","),58))expressions.push(...definitions);
      else givens.push(`${counted("직선",publicLines.length)} ${definitions.map(m).join(", ")}가 있다.`);
    }

    for(const node of given)if(relation[node.out]?.public&&node.out!=="transversal")givens.push(relation[node.out].public(node.value));

    const makeDeclaration=node=>{
      const rule=rules[node.op], name=symbol(node), group=node.out;
      const subject=rule.clause?.(node,"");
      const kind=group==="point"?"점":group==="circle"?"원":"직선";
      const reads=node.inputs.map(input=>input.id);
      if(rule.declaration)return {id:node.id,group,reads,sentence:rule.declaration(node)};
      const topic=group==="line"?"은":ForgeProblemProse.topic(node.name), particle=group==="line"?"이":ForgeProblemProse.subject(node.name);
      return {id:node.id,group,reads,sentence:`${kind} ${name}${topic} ${subject}이다.`,
        and:`${name}${topic} ${subject}이고`,when:`${name}${particle} ${subject}일 때`};
    };
    for(const node of derived.slice(0,-1))if(!relationalRules[node.op]&&(rules[node.op].clause||rules[node.op].declaration))declarations.push(makeDeclaration(node));
    const rule=rules[root.op];
    let question, target=root.value, targetSubject, answer;
    if(root.out==="circle"||root.out==="line"){
      question=rule.clause(root,"")+"의 방정식을 구하시오.";
      answer=ForgeGeometryEquations.answer(root.out,target);
    }else if(root.out==="pointSet"){
      question=rule.refer(root)+"의 좌표를 모두 구하시오.";
      answer=pointSetAnswer(target);
    } else if(root.out==="scalar"){
      targetSubject=rule.subject(root);
      question=targetSubject+(/(?:값|제곱|절편)$/.test(targetSubject)?"을":"를")+" 구하시오.";
      answer=scalar(target);
    } else {
      const inverse=Boolean(rule.declaration);
      if(inverse)declarations.push(makeDeclaration(root));
      const subject=inverse?`점 ${symbol(root)}`:rule.clause?.(root,"")??"";
      const {mode,names,weights}=answerPath;
      if(mode==="pair"){
        targetSubject=subject+"의 좌표";
        question=targetSubject+"를 구하시오.";
        answer=point(target);
      }else if(mode==="linear"){
        const [a,b]=names, [k,l]=weights;
        targetSubject=m(linear(k,a,l,b));
        question=`${subject}의 좌표가 ${m(coord([a,b]))}일 때, ${targetSubject}의 값을 구하시오.`;
        target=k*target[0]+l*target[1];
        answer=scalar(target);
      }else {
        targetSubject=subject+"의 "+m(mode)+"좌표";
        question=targetSubject+"를 구하시오.";
        target=target[mode==="x"?0:1];
        answer=scalar(target);
      }
    }

    if(rule.answerPrompt)question=rule.answerPrompt(root,answerPath);

    const explanations={
      section:({inputs:[A,B],data:[a,b]})=>`선분 ${segment(A,B)}의 내분비가 ${m(a+":"+b)}이므로 각 좌표에 반대쪽 비를 곱해 더한 뒤 ${m(a+b)}로 나눈다.`,
      externalDivision:()=> "외분점의 좌표는 두 끝점의 좌표에 반대쪽 비를 곱해 빼고 비의 차로 나누어 구한다.",
      centralReflection:()=> "대칭의 중심은 원래 점과 대응점의 중점이다.",
      parallelogram:()=> "두 대각선의 중점이 일치하도록 나머지 꼭짓점을 구한다.",
      centroid:()=> "세 꼭짓점의 좌표를 각각 평균 낸다.",
      restoreVertex:()=> "무게중심의 좌표를 세 배 한 뒤 알려진 두 꼭짓점의 좌표를 뺀다.",
      recoverEndpoint:()=> "중점의 좌표를 두 배 한 뒤 알려진 끝점의 좌표를 뺀다.",
      medianRatio:()=> "무게중심은 중선을 꼭짓점에서부터 2:1로 내분하므로 무게중심에서 대변의 중점까지의 좌표 변화량은 꼭짓점에서 무게중심까지의 절반이다.",
      pointSlope:()=> "기울기를 사용해 점과 기울기로 나타낸 직선의 방정식을 세운다.",
      twoPoints:()=> "두 점의 좌표 차에서 기울기를 구한 뒤 한 점의 좌표를 대입한다.",
      parallel:()=> "기준 직선의 기울기를 그대로 사용하고, 지나야 하는 점의 좌표를 대입한다.",
      perpendicular:()=> "두 직선의 기울기의 곱이 −1이 되도록 기울기를 정한 뒤, 지나야 하는 점의 좌표를 대입한다.",
      bisector:()=> "두 점까지 거리의 제곱을 같게 놓으면 이차항이 소거되어 직선의 방정식을 얻는다.",
      intersection:({inputs:[L,M]})=>`두 직선 ${m(L.name+","+M.name)}의 방정식을 연립한다.`,
      foot:({inputs:[P,L]})=>`점 ${symbol(P)}를 지나고 직선 ${symbol(L)}에 수직인 직선을 구하고 두 직선의 방정식을 연립한다.`,
      distance:()=> "두 좌표의 차를 각각 제곱해 더한 뒤 제곱근을 구한다.",
      originDistance:()=> "각 좌표의 제곱을 더한 뒤 제곱근을 구한다.",
      median:()=> "대변의 중점 좌표를 구한 뒤 꼭짓점과 그 중점 사이의 거리를 계산한다.",
      triangleArea:()=> "두 점으로 밑변을 정하고, 나머지 점에서 밑변이 놓인 직선까지의 거리를 높이로 사용한다.",
      pointLine:()=> "직선의 방정식에 점의 좌표를 대입한 값과 두 일차항 계수로 거리를 구한다.",
      parallelDistance:()=> "두 직선의 일차항 계수를 맞춘 뒤 상수항의 차를 이용해 거리를 구한다.",
    };
    const solution=derived.map(node=>{
      if(geometry.rules[node.op]){
        const display=node.out==="line"?equation(node.value):relationMath[node.out]?.(node.value)??(node.out==="point"?coord(node.value):String(node.value));
        return `${geometry.rules[node.op].explain(node)} 그 결과는 ${m(display)}이다.`;
      }
      if(relationalRules[node.op]){
        const display=relationMath[node.out]?.(node.value)??(node.out==="point"?coord(node.value):String(node.value));
        return `${relationalRules[node.op].explain(node)} 그 결과는 ${m(display)}이다.`;
      }
      const math=node.out==="point"?tuple(node):node.out==="line"?m(equation(node.value)):m(node.value);
      const result=node.out==="point"&&node!==root?`점 ${symbol(node)}의 좌표는`
        :node.out==="line"?`직선 ${symbol(node)}의 방정식은`:"구한 값은";
      return `${explanations[node.op](node)} ${result} ${math}이다.`;
    });
    if(!equal(root.value,target))solution.push(`따라서 구하는 값은 ${m(target)}이다.`);
    const graph=[];
    for(const node of nodes){
      const depth=node.inputs.length?1+Math.max(...node.inputs.map(input=>input.depth)):0;
      node.depth=depth;
      (graph[depth]??=[]).push({id:node.id,label:rules[node.op]?.label??(relation[node.out]?"공개 조건":"주어진 "+(node.out==="point"?"점":"직선")),
        operation:node.op,output:node.out,port:node.port,value:node.value,explanation:rules[node.op]?.explain?.(node)??explanations[node.op]?.(node),from:node.inputs.map(input=>input.id),
        math:(relationMath[node.out]??relation[node.out]?.math)?.(node.value)??(node.out==="point"?(node!==root||rules[node.op].declaration?node.name:"")+coord(node.value)
          :node.out==="line"?node.name+": "+equation(node.value):String(node.value)),
        ...(node.data?{parameters:node.data}:{})});
    }
    if(!equal(root.value,target))graph.push([{id:"target",label:"요구한 좌표 또는 식의 값",operation:"projection",value:target,math:String(target),from:[root.id]}]);
    const structure=signature(shape);
    const declared=new Set(declarations.map(clause=>clause.id));
    const {intro,question:prompt}=ForgeProblemProse.compose({prefix:givens,clauses:declarations,
      known:nodes.filter(node=>!declared.has(node.id)).map(node=>node.id),
      reads:[root.id,...root.inputs.map(input=>input.id)],question,afterDisplay:expressions.length>0},rng);
    const data=present({...problem(intro,expressions,prompt,answer,solution),allowNegative:target<0,...(answer.kind==="equation"?{equationObject:target}:{})},format,rng);
    if(data.answer.kind==="choice"){
      if(data.answer.options.length!==4 || new Set(data.answer.options).size!==4 ||
         data.answer.options[data.answer.value]!== (answer.kind==="scalar"?m(target):answer.text) ||
         !ForgeCatalog.grade(String(data.answer.value),data.answer).correct)return null;
    }else{
      const input=answer.kind==="point"?target.map(String)
        :answer.kind==="point-set"?target.map(coord).join(", "):answer.kind==="equation"?answer.input:String(target);
      if(!ForgeCatalog.grade(input,data.answer).correct)return null;
    }
    return {...data,type:"challenge-"+unit,level:"C",template:units[unit].title,format:"tex",actionHistory:[],
      answerPath:{id:(shape.depth===1?"geometry/":"challenge/")+structure+"/"+answerPath.mode+"/"+answerPath.family+"|"+format,
        label:{equation:"관계 합성 → 방정식",pointSet:"관계 합성 → 모든 좌표",scalar:"관계 합성 → 최종값",pair:"관계 합성 → 좌표",x:"관계 합성 → 가로 좌표",y:"관계 합성 → 세로 좌표",linear:"관계 합성 → 좌표의 식"}[answerPath.mode],
        operations:[...derived.map(node=>node.op),...(!equal(root.value,target)?[answerPath.mode]:[])]},
      inspection:{graph,structure,concepts:[...shape.families],verified:true,environment:"geometry",
        family:answerPath.family,conditions:[`개념 ${shape.families.size}종, 연결 깊이 ${shape.depth}단계, 공개 객체 ${given.length}개`],
        variables:[...given.map(node=>({key:node.name??node.id,value:relation[node.out]?.math(node.value)??(node.out==="point"?coord(node.value):equation(node.value)),label:"공개 조건",given:true})),
          ...(root.wanted===undefined?[]:[{key:"목표",value:root.out==="point"?coord(root.wanted):root.out==="circle"?geometry.circleText(root.wanted):root.out==="line"?equation(root.wanted):root.wanted,label:rule.label,seed:true}]),
          {key:"정답",value:answer.kind==="equation"?answer.input:root.out==="pointSet"?relationMath.pointSet(target):Array.isArray(target)?coord(target):target,label:"구할 값",target:true}]}};
  }

  function difficultyOf(shape) {
    if(shape.depth>=3&&shape.families.has("접선과 반지름")&&shape.families.has("완전제곱과 중심"))return "C3";
    if(shape.depth>=3&&["평행이동","대칭이동","직선 대칭의 중점·수직 조건"].filter(name=>shape.families.has(name)).length>=2)return "C3";
    if(shape.families.has("두 교점의 분기") || shape.families.has("반사 최적화") || shape.families.has("격자점 열거") ||
       (shape.families.has("등거리 자취") && shape.families.has("교점") && shape.out==="pointSet"))return "C3";
    if(shape.families.has("세 점을 지나는 원") || shape.families.has("접선과 반지름") || shape.depth>=3 || shape.cardinality!==undefined || shape.families.size>=4 ||
       ["restoreVertex","recoverEndpoint","medianRatio","externalDivision","parallelogram"].some(op=>contains(shape,op)))return "C2";
    return "C1";
  }
  function contains(shape,operation) {
    return shape.op===operation || shape.children.some(child=>contains(child,operation));
  }
  function seedFor(shape,rng){
    const rule=rules[shape.op];
    return rule.seed?rule.seed(rng):shape.out==="line"?demandLine(anchor(rng),integralDirection(rng)):anchor(rng);
  }
  class UnsatisfiedGraph extends RangeError {}

  function generate(unit,{rng=Math.random,format,avoidPaths=[],difficulty,requiredOperation,requires=[],output,level="C"}={}) {
    const config=units[unit];
    if(!config)throw new RangeError("지원하지 않는 단원입니다.");
    const practice=level==="B";
    const goal=requiredOperation?[requiredOperation].flat():unit==="circles"?circleRules:unit==="transformations"?movementRules:null;
    const planner=dependencyPlanner(config,practice,globalThis.ForgePreferences?.plusEnabled?.()!==false,rng);
    const outputs=output?[output]:["point","scalar","pointSet",...(config.allowed.includes("circleCenter")?["circle","line"]:practice&&unit==="lines"?["line"]:[])];
    const budgets=practice?[2,2,3,3,4]:config.allowed.includes("circleCenter")?[2,3,4]:[2,3,4,5];
    const scopes=budgets.flatMap(count=>outputs.filter(port=>planner.feasible(port,count,goal,null)).map(port=>({port,count})));
    if(level!=="A"&&!scopes.length)throw new RangeError("이 개념을 연결할 수 있는 관계가 없습니다.");
    const recent=avoidPaths.slice(-12);
    for(let attempt=0;attempt<480;attempt++){
      let shape;
      if(level==="A"){
        const rule=rules[requiredOperation];
        if(!rule)throw new RangeError("지원하지 않는 기본 관계입니다.");
        shape={op:requiredOperation,out:rule.out,children:rule.ports.map(leaf),depth:1,families:new Set([rule.family,...(rule.concepts??[])])};
      }else{
        const {port,count}=pick(rng,scopes);
        shape=planner.grow(port,count,goal,null);
        if(!shape||requires.some(op=>!contains(shape,op))||shape.depth<2||practice&&shape.depth>3||
          [...shape.families].filter(family=>family!=="삼각형의 넓이").length<2)continue;
      }
      shape.difficulty=difficultyOf(shape);
      if(difficulty&&shape.difficulty!==difficulty)continue;
      const structure=signature(shape),selected=familyOf(shape),rule=rules[shape.op];
      if(attempt<360&&recent.some(path=>path.includes("/"+structure+"/")))continue;
      const mode=shape.out==="point"?pick(rng,["pair","pair","x","y","linear"]):shape.out==="pointSet"?"pointSet":shape.out==="scalar"?"scalar":"equation";
      const answerPath=mode==="linear"?{mode,names:pick(rng,[["a","b"],["p","q"],["u","v"]]),weights:[signed(rng,3),signed(rng,3)]}:{mode};
      const wanted=rule.back?seedFor(shape,rng):undefined;
      const root=construct(shape,wanted,rng), nodes=verify(root);
      if(!nodes)continue;
      if(nodes.some(node=>{
        const [a,b]=node.inputs;
        return ["circleLineDiscriminant","circleLineDistance","composedCirclePositions","circleLineIntersections"].includes(node.op)&&
          ((a.op.startsWith("translate")&&b.op.startsWith("translate"))||(a.op.startsWith("reflect")&&b.op.startsWith("reflect")))&&equal(a.data,b.data);
      }))continue;
      const result=render(unit,shape,root,nodes,rng,format??pick(rng,["written","choice"]),{...answerPath,family:selected});
      if(result)return level==="C"?{...result,challengeDifficulty:shape.difficulty}:result;
    }
    throw new UnsatisfiedGraph("서로 다른 점과 직선으로 조건을 구성하지 못했습니다.");
  }

  ForgeChallengeCompiler = globalThis.ForgeChallengeCompiler = Object.freeze({generate,UnsatisfiedGraph,units:Object.keys(units)});
})();


;

/* logic-compiler.js */
(() => {
  "use strict";
  const {m, rand, pick, problem, scalar, set}=ForgeTopics;
  const indices=mask=>Array.from({length:8},(_,i)=>i).filter(i=>mask&(1<<i));
  const contains=(a,b)=>(a&b)===a;
  const laws={
    commute:(a,b)=>[(a|b),(b|a)],
    associate:(a,b,c)=>[(a|b)|c,a|(b|c)],
    distribute:(a,b,c)=>[a&(b|c),(a&b)|(a&c)],
    demorgan:(a,b,_c,u)=>[u^(a|b),(u^a)&(u^b)],
  };
  const binary={
    intersection:["교집합","\\cap",(a,b)=>a&b],
    union:["합집합","\\cup",(a,b)=>a|b],
    difference:["차집합","-",(a,b)=>a&~b],
    symmetric:["대칭차집합",null,(a,b)=>a^b],
  };
  const rules={
    ...Object.fromEntries(Object.entries(binary).map(([id,[label,symbol,evalMask]])=>[id,{
      ports:["set","set"],out:"set",label,evalMask,
      describe:([a,b])=>symbol?m(a+symbol+" "+b):"두 집합 "+m(a+", "+b)+"의 대칭차집합",
    }])),
    complement:{ports:["set"],out:"set",label:"여집합",evalMask:(a,u)=>u^a,describe:([a])=>m(a+"^c")},
    truthSet:{ports:["condition"],out:"set",label:"진리집합",evalMask:a=>a,describe:([a])=>"조건 "+m(a)+"의 진리집합"},
    asCondition:{ports:["set"],out:"condition",label:"집합에 속하는 조건",evalMask:a=>a,describe:([a])=>m("x\\in "+a)},
    negation:{ports:["condition"],out:"condition",label:"조건의 부정",evalMask:(a,u)=>u^a,describe:([a])=>m("{\\sim}"+a)},
    conjunction:{ports:["condition","condition"],out:"condition",label:"그리고 조건",evalMask:(a,b)=>a&b,describe:([a,b])=>m(a)+" 그리고 "+m(b)},
    disjunction:{ports:["condition","condition"],out:"condition",label:"또는 조건",evalMask:(a,b)=>a|b,describe:([a,b])=>m(a)+" 또는 "+m(b)},
    counterexample:{ports:["condition","condition"],out:"set",label:"가정은 참이고 결론은 거짓인 원소",evalMask:(a,b)=>a&~b,
      describe:([a,b])=>"명제 "+m(a+"\\to "+b)+"의 반례를 모은 집합"},
    implication:{ports:["condition","condition"],out:"truth",label:"명제의 참·거짓",evalMask:contains,describe:([a,b])=>"명제 "+m(a+"\\to "+b)},
    converse:{ports:["condition","condition"],out:"truth",label:"역의 참·거짓",evalMask:(a,b)=>contains(b,a),describe:([a,b])=>"명제 "+m(a+"\\to "+b)+"의 역"},
    contrapositive:{ports:["condition","condition"],out:"truth",label:"대우의 참·거짓",evalMask:(a,b,u)=>contains(u^b,u^a),describe:([a,b])=>"명제 "+m(a+"\\to "+b)+"의 대우"},
    sufficient:{ports:["condition","condition"],out:"truth",label:"충분조건 판정",evalMask:contains,describe:([a,b])=>m(a)+"가 "+m(b)+"이기 위한 충분조건이다"},
    necessary:{ports:["condition","condition"],out:"truth",label:"필요조건 판정",evalMask:(a,b)=>contains(b,a),describe:([a,b])=>m(a)+"가 "+m(b)+"이기 위한 필요조건이다"},
    iff:{ports:["condition","condition"],out:"truth",label:"필요충분조건 판정",evalMask:(a,b)=>a===b,describe:([a,b])=>m(a)+"가 "+m(b)+"이기 위한 필요충분조건이다"},
    universal:{ports:["condition"],out:"truth",label:"모든 원소에 대한 명제",evalMask:(a,u)=>a===u,describe:([a])=>"모든 "+m("x")+"에 대하여 "+m(a)+"가 성립한다"},
    existential:{ports:["condition"],out:"truth",label:"존재 명제",evalMask:a=>a!==0,describe:([a])=>"어떤 "+m("x")+"에 대하여 "+m(a)+"가 성립한다"},
    notUniversal:{ports:["condition"],out:"truth",label:"전칭 명제의 부정",evalMask:(a,u)=>a!==u,describe:([a])=>"‘모든 "+m("x")+"에 대하여 "+m(a)+"가 성립한다’의 부정"},
    notExistential:{ports:["condition"],out:"truth",label:"존재 명제의 부정",evalMask:a=>a===0,describe:([a])=>"‘어떤 "+m("x")+"에 대하여 "+m(a)+"가 성립한다’의 부정"},
    subset:{ports:["set","set"],out:"truth",label:"부분집합 판정",evalMask:contains,describe:([a,b])=>m(a+"\\subset "+b)},
    proper:{ports:["set","set"],out:"truth",label:"진부분집합 판정",evalMask:(a,b)=>a!==b&&contains(a,b),describe:([a,b])=>m(a)+"는 "+m(b)+"의 진부분집합이다"},
    equal:{ports:["set","set"],out:"truth",label:"집합의 상등",evalMask:(a,b)=>a===b,describe:([a,b])=>m(a+"="+b)},
    disjoint:{ports:["set","set"],out:"truth",label:"서로소 판정",evalMask:(a,b)=>(a&b)===0,describe:([a,b])=>m(a+", "+b)+"는 서로소이다"},
    empty:{ports:["set"],out:"truth",label:"공집합 판정",evalMask:a=>a===0,describe:([a])=>m(a+"=\\varnothing")},
    full:{ports:["set"],out:"truth",label:"전체집합과의 상등",evalMask:(a,u)=>a===u,describe:([a])=>m(a+"=U")},
    count:{ports:["set"],out:"scalar",label:"원소의 개수",evalMask:a=>indices(a).length,describe:([a])=>m("n("+a+")")},
    subsets:{ports:["set"],out:"scalar",label:"부분집합의 개수",evalMask:a=>2**indices(a).length,describe:([a])=>m(a)+"의 부분집합의 개수"},
    properCount:{ports:["set"],out:"scalar",label:"진부분집합의 개수",evalMask:a=>2**indices(a).length-1,describe:([a])=>m(a)+"의 진부분집합의 개수"},
    required:{ports:["set","set"],out:"scalar",label:"지정 원소를 포함하는 부분집합",evalMask:(a,b)=>contains(b,a)?2**indices(a^b).length:0,
      describe:([a,b])=>m(b)+"의 모든 원소를 포함하는 "+m(a)+"의 부분집합의 개수"},
    someRequired:{ports:["set","set"],out:"scalar",label:"지정 원소 중 하나 이상을 포함",extended:true,
      evalMask:(a,b)=>2**indices(a).length-2**indices(a&~b).length,describe:([a,b])=>m(b)+"의 원소를 하나 이상 포함하는 "+m(a)+"의 부분집합의 개수"},
    ...Object.fromEntries(Object.entries(laws).map(([id,calculate])=>[id,{
      ports:["set","set","set"],out:"set",label:{commute:"교환법칙",associate:"결합법칙",distribute:"분배법칙",demorgan:"드모르간 법칙"}[id],
      evalMask:(a,b,c,u)=>calculate(a,b,c,u)[1],
      describe:([a,b,c])=>m({commute:a+"\\cup "+b+"\\cup "+c,associate:"("+a+"\\cup "+b+")\\cup "+c,
        distribute:a+"\\cap ("+b+"\\cup "+c+")",demorgan:"("+a+"\\cup "+b+")^c"}[id]),
    }])),
  };
  Object.assign(rules,{
    roster:{ports:["set"],out:"set",label:"원소나열법",evalMask:a=>a,describe:([a])=>m(a)+"의 원소를 모두 모은 집합"},
    builder:{ports:["set","set"],out:"set",label:"조건제시법",evalMask:(a,b)=>a&b,
      describe:([a,b])=>m("\\{x\\mid x\\in "+a)+" 그리고 "+m("x\\in "+b+"\\}")},
    membership:{ports:["set"],out:"truth",label:"원소와 집합의 관계",evalMask:a=>Boolean(a&2),describe:([a])=>m("2\\in "+a)},
    venn:{ports:["set","set"],out:"set",label:"벤 다이어그램의 공통 영역",evalMask:(a,b)=>a&b,describe:([a,b])=>m(a+"\\cap "+b)},
    excluded:{ports:["set","set"],out:"scalar",label:"지정 원소를 제외한 부분집합",evalMask:(a,b)=>2**indices(a&~b).length,
      describe:([a,b])=>m(b)+"의 원소를 하나도 포함하지 않는 "+m(a)+"의 부분집합의 개수"},
    cardinalArithmetic:{ports:["set","set"],out:"scalar",label:"포함배제 원리",extended:true,
      evalMask:(a,b)=>indices(a).length+indices(b).length-indices(a&b).length,describe:([a,b])=>m("n("+a+"\\cup "+b+")")},
    subsetLaws:{ports:["set","set","set"],out:"truth",label:"부분집합의 추이성 적용 조건",
      evalMask:(a,b,c)=>contains(a,b)&&contains(b,c),
      describe:([a,b,c])=>m(a+"\\subset "+b)+"와 "+m(b+"\\subset "+c)+"가 모두 성립해 추이성으로 "+m(a+"\\subset "+c)+"를 얻을 수 있다"},
    syllogism:{ports:["condition","condition","condition"],out:"truth",label:"두 전제를 연결해 결론 검증",
      evalMask:(a,b,c)=>contains(a,b)&&contains(b,c),
      describe:([a,b,c])=>"두 명제 "+m(a+"\\to "+b+", "+b+"\\to "+c)+"를 모두 참인 전제로 삼아 "+m(a+"\\to "+c)+"를 이끌어 낼 수 있다"},
    contradiction:{ports:["condition","condition"],out:"truth",label:"가정과 결론의 부정이 양립하는지 확인",
      evalMask:(a,b)=>!(a&~b),describe:([a,b])=>m(a)+"와 "+m("{\\sim}"+b)+"를 동시에 만족하는 원소는 없다"},
  });
  rules.demorganIntersection={ports:["set","set"],out:"set",label:"교집합에 대한 드모르간 법칙",
    evalMask:(a,b,u)=>(u^a)|(u^b),describe:([a,b])=>m("("+a+"\\cap "+b+")^c")};
  rules.distributeUnion={ports:["set","set","set"],out:"set",label:"합집합의 분배법칙",
    evalMask:(a,b,c)=>(a|b)&(a|c),describe:([a,b,c])=>m(a+"\\cup ("+b+"\\cap "+c+")")};
  rules.symmetric.extended=true;
  // Laws with two operands have two public dependencies.
  for(const id of ["commute","demorgan"]){
    const rule=rules[id];
    rule.ports=["set","set"];
    rule.evalMask=(a,b,u)=>laws[id](a,b,0,u)[1];
  }
  rules.commute.describe=([a,b])=>m(a+"\\cup "+b);

  // Independent element-wise evaluator. Subset counts are enumerated, and
  // quantifiers are checked over the declared universe.
  function check(id,args,size){
    const values=indices((1<<size)-1);
    const at=(i,n)=>Boolean(args[i]&(1<<n));
    const each=predicate=>values.every(predicate), any=predicate=>values.some(predicate);
    const asMask=predicate=>values.reduce((acc,n)=>acc+(predicate(n)?2**n:0),0);
    const maskTests={
      intersection:n=>at(0,n)&&at(1,n), union:n=>at(0,n)||at(1,n),
      difference:n=>at(0,n)&&!at(1,n), symmetric:n=>at(0,n)!==at(1,n),
      roster:n=>at(0,n), builder:n=>at(0,n)&&at(1,n), venn:n=>at(0,n)&&at(1,n), complement:n=>!at(0,n), negation:n=>!at(0,n), truthSet:n=>at(0,n), asCondition:n=>at(0,n),
      conjunction:n=>at(0,n)&&at(1,n), disjunction:n=>at(0,n)||at(1,n), counterexample:n=>at(0,n)&&!at(1,n),
      commute:n=>at(1,n)||at(0,n), associate:n=>at(0,n)||(at(1,n)||at(2,n)),
      demorganIntersection:n=>!at(0,n)||!at(1,n), distributeUnion:n=>(at(0,n)||at(1,n))&&(at(0,n)||at(2,n)),
      distribute:n=>(at(0,n)&&at(1,n))||(at(0,n)&&at(2,n)), demorgan:n=>!at(0,n)&&!at(1,n),
    };
    if(maskTests[id])return asMask(maskTests[id]);
    const forward=()=>each(n=>!at(0,n)||at(1,n)), backward=()=>each(n=>!at(1,n)||at(0,n));
    const truth={
      membership:()=>at(0,1), contradiction:forward, subsetLaws:()=>forward()&&each(n=>!at(1,n)||at(2,n)),
      syllogism:()=>forward()&&each(n=>!at(1,n)||at(2,n)), implication:forward, sufficient:forward, subset:forward, converse:backward, necessary:backward,
      contrapositive:()=>each(n=>at(1,n)||!at(0,n)),
      iff:()=>forward()&&backward(), equal:()=>forward()&&backward(), proper:()=>forward()&&!backward(),
      disjoint:()=>!any(n=>at(0,n)&&at(1,n)), empty:()=>!any(n=>at(0,n)),full:()=>each(n=>at(0,n)),
      universal:()=>each(n=>at(0,n)), existential:()=>any(n=>at(0,n)),
      notUniversal:()=>any(n=>!at(0,n)),notExistential:()=>each(n=>!at(0,n)),
    };
    if(truth[id])return truth[id]();
    if(id==="cardinalArithmetic")return values.filter(n=>at(0,n)||at(1,n)).length;
    if(id==="count")return values.filter(n=>at(0,n)).length;
    let count=0;
    for(let mask=0;mask<2**size;mask++){
      const has=n=>Boolean(mask&(1<<n));
      if(!each(n=>!has(n)||at(0,n)))continue;
      if(id==="properCount"&&mask===args[0]||id==="required"&&!each(n=>!at(1,n)||has(n))||
        id==="excluded"&&any(n=>at(1,n)&&has(n))||id==="someRequired"&&!any(n=>at(1,n)&&has(n)))continue;
      count++;
    }
    return count;
  }

  const setOperations=["intersection","union","difference","complement","symmetric"];
  const logicOperations=["negation","conjunction","disjunction","truthSet","asCondition","counterexample"];
  const unordered=new Set(["intersection","union","symmetric","conjunction","disjunction","equal","disjoint"]);
  function structuralKey(node){
    if(!node.op)return node.out;
    const inputs=node.inputs.map(structuralKey);
    if(unordered.has(node.op))inputs.sort();
    return node.op+"("+inputs.join(",")+")";
  }

  function plan(unit,goals,level,difficulty,extended,rng,focus){
    const support=unit==="sets"?setOperations:[...logicOperations,...setOperations];
    const targets=level==="B"&&goals.includes("venn")?["count","subsets","complement"]:level==="C"?(unit==="sets"?["count","required","subset","proper","disjoint","subsets","someRequired","equal"]:
      ["counterexample","universal","notUniversal","existential","converse","contrapositive","sufficient","iff","count"]):
      [...goals,...(goals.some(id=>rules[id].out==="set")?["count"]:[])];
    const available=[...new Set([...support,...goals])].filter(id=>extended||!rules[id].extended);
    const maxDepth=level==="C"?(difficulty==="C1"?2:difficulty==="C3"?4:3):level==="A"?1:4;
    const budget=level==="A"?1:level==="B"?rand(rng,2,4):rand(rng,maxDepth,maxDepth+1);
    const possible=targets.filter(id=>extended||!rules[id].extended);
    if(!possible.length)return null;
    const rootOp=pick(rng,possible);
    function make(op){const rule=rules[op];return {op,out:rule.out,inputs:rule.ports.map(out=>({out}))};}
    const root=make(rootOp);
    if(rootOp==="venn")root.inputs.forEach((input,i)=>{input.diagram=i;});
    for(let used=1;used<budget;used++){
      const slots=[];
      function visit(node,depth){
        node.inputs.forEach((child,i)=>{
          if(child.op)visit(child,depth+1);
          else if(depth<maxDepth&&!Object.hasOwn(child,"diagram")){
            const eligible=available.filter(id=>id!==node.op&&rules[id].out===child.out&&
              !(node.op==="truthSet"&&id==="asCondition")&&!(node.op==="asCondition"&&id==="truthSet"));
            if(eligible.length)slots.push({node,i,eligible});
          }
        });
      }
      visit(root,1);
      if(!slots.length)return null;
      const missing=goals.length&&!goals.some(id=>has(root,id));
      const wanted=missing?slots.filter(slot=>slot.eligible.some(id=>goals.includes(id))):[];
      const {node,i,eligible}=pick(rng,wanted.length?wanted:slots);
      const inserted=make(pick(rng,wanted.length?eligible.filter(id=>goals.includes(id)):eligible));
      if(inserted.op==="venn")inserted.inputs.forEach((input,index)=>{input.diagram=index;});
      node.inputs[i]=inserted;
    }
    if(focus==="prop-negation-connectives"&&!has(root,"conjunction")&&!has(root,"disjunction"))return null;
    if(focus==="prop-negation-set"&&(!has(root,"negation")||!has(root,"truthSet")))return null;
    if(focus==="prop-suff-sets"&&!has(root,"truthSet")&&!has(root,"asCondition"))return null;
    return !goals.length||goals.some(id=>has(root,id))?root:null;
  }
  const has=(node,op)=>node.op===op||Boolean(node.inputs?.some(child=>has(child,op)));
  const setText=list=>list.length?"\\{"+list.join(",")+"\\}":"\\varnothing";
  const display=(value,out,universe)=>out==="set"||out==="condition"?setText(indices(value).map(i=>universe[i])):out==="truth"?(value?"참":"거짓"):String(value);
  function finiteUniverse(rng){
    const size=rand(rng,5,8);
    const kind=pick(rng,["natural","integers","sparse","even","odd","multiples","absolute"]);
    const start=rand(rng,-6,-1), step=rand(rng,2,4), radius=rand(rng,2,3);
    const progression=(first,gap,length=size)=>Array.from({length},(_,i)=>first+gap*i);
    const domains={
      natural:()=>[progression(1,1),m(size)+" 이하의 자연수의 집합"],
      integers:()=>[progression(start,1),m(start+"\\le x\\le "+(start+size-1))+"인 정수 "+m("x")+"의 집합"],
      sparse:()=>{
        let n=start;
        const values=Array.from({length:size},(_,i)=>n+=rand(rng,i===1?2:1,4));
        return [values,m(setText(values))];
      },
      even:()=>[progression(2,2),m(2*size)+" 이하의 양의 짝수의 집합"],
      odd:()=>[progression(1,2),m(2*size-1)+" 이하의 양의 홀수의 집합"],
      multiples:()=>[progression(step,step),m(step*size)+" 이하의 자연수 중 "+m(step)+"의 배수의 집합"],
      absolute:()=>[progression(-radius,1,2*radius+1),"절댓값이 "+m(radius)+" 이하인 정수의 집합"],
    };
    const [values,description]=domains[kind]();
    return {kind,values,description};
  }

  function setNames(rng,unknown=false){
    const families=unknown?["XYZABCDE","XYZABCDE","ABCDEFGH","KLMNOPQR"]:["ABCDEFGH","KLMNOPQR","PQRSTVWX"];
    return pick(rng,families);
  }

  const rosterInput={
    element:(parameter,shift=0)=>({parameter,shift}),
    value:(item,assignment)=>typeof item==="number"?item:assignment[item.parameter]+item.shift,
    mask(items,assignment,domain){
      const values=items.map(item=>this.value(item,assignment));
      const positions=values.map(n=>domain.indexOf(n));
      return positions.includes(-1)?null:positions.reduce((mask,i)=>mask|(1<<i),0);
    },
    tex(items,names){
      return "\\{"+items.map(item=>typeof item==="number"?item:ForgeTopics.shift(names[item.parameter],-item.shift)).join(",")+"\\}";
    },
    solutions(values,arity,satisfies){
      const solutions=[];
      for(const a of values)for(const b of arity===1?[undefined]:values){
        const assignment=arity===1?[a]:[a,b];
        if(satisfies(assignment))solutions.push(assignment);
      }
      return solutions;
    },
    bind({leaves,diagram,domain,root,result,solve,rng}){
      const eligible=leaves.filter(leaf=>!diagram?.inputs.includes(leaf));
      if(!eligible.length)return null;
      const leaf=pick(rng,eligible), roster=indices(leaf.value).map(i=>domain[i]);
      const position=rand(rng,0,roster.length-1), offset=pick(rng,[0,0,1,-1]);
      const name=pick(rng,["a","k","h"]), value=roster[position]-offset;
      if(!domain.includes(value))return null;
      roster[position]=this.element(0,offset);
      const models=domain.map(value=>({value,mask:this.mask(roster,[value],domain)})).filter(model=>model.mask!==null);
      const reads=(model,independent)=>solve(new Map([[leaf.id,model.mask]]),independent).get(root.id);
      const outcomes=[
        {id:"equal",value:result,test:n=>n===result},
        ...(root.out==="set"||root.out==="condition"?[
          {id:"cardinality",value:indices(result).length,test:n=>indices(n).length===indices(result).length},
          ...domain.filter((_,i)=>result&(1<<i)).map((element)=>({id:"element",value:element,test:n=>Boolean(n&(1<<domain.indexOf(element)))})),
        ]:[]),
      ];
      const tests=outcomes.map(outcome=>({outcome,proof:ForgeRelationSearch.solve({
        models,conditions:[{accept:model=>outcome.test(reads(model,false))}],project:model=>model.value,
        check:model=>outcome.test(reads(model,true)),
      })})).filter(({proof})=>proof?.answer.length&&proof.answer.includes(value));
      if(!tests.length)return null;
      const {outcome,proof}=pick(rng,[...tests.filter(({proof})=>proof.answer.length===1),...tests]);
      return {leaf,roster,name,value,tex:this.tex(roster,[name]),outcome,values:proof.answer};

    },
  };

  function generate(unit,{rng=Math.random,level="C",difficulty,format,goals=[],avoidPaths=[],focus,inputMode}={}){
    const requested=difficulty??(level==="C"?pick(rng,["C1","C2","C3"]):undefined);
    const extended=globalThis.ForgePreferences?.plusEnabled?.()!==false;
    if(level==="C"&&inputMode===undefined&&format!=="written"&&rng()<.16){
      const periodic=generatePeriodic({rng,avoidPaths,level,format,difficulty:requested,proposition:unit==="propositions"});
      if(periodic)return {...periodic,type:"challenge-"+unit,level,template:unit==="sets"?"집합":"명제",challengeDifficulty:requested};
    }
    const useInput=level!=="A"&&!["prop-definition","prop-proof-definition"].includes(focus)&&(inputMode==="roster"||inputMode===undefined&&rng()<.24);
    for(let attempt=0;attempt<(useInput?700:420);attempt++){
      const root=plan(unit,goals,level,requested,extended,rng,level==="A"?undefined:focus);
      if(!root||focus==="prop-definition"&&root.out!=="truth")continue;
      const structure=structuralKey(root);
      if(attempt<140&&avoidPaths.some(path=>path.startsWith("logic/"+structure+"/")))continue;
      const domain=finiteUniverse(rng), universe=domain.values, size=universe.length, u=(1<<size)-1;
      const names=setNames(rng,useInput);
      const nodes=[], leaves=[];
      let setIndex=0, conditionIndex=0;
      function register(node){
        node.inputs?.forEach(register);
        node.id="v"+nodes.length;
        if(!node.op)leaves.push(node);
        nodes.push(node);
      }
      register(root);
      for(const node of [...leaves,...nodes.filter(node=>node!==root&&node.op)]){
        node.name=node.out==="set"?names[setIndex++]:["p","q","r","s","t","p_1","q_1"][conditionIndex++];
      }
      const diagram=nodes.find(node=>node.op==="venn");
      if(leaves.length>6||nodes.some(node=>node!==root&&!node.name))continue;
      const wanted=root.out==="truth"?rng()<.5:root.out==="set"&&has(root,"counterexample")?pick(rng,[1,2,3]):undefined;
      function solve(overrides=new Map(),independent=false){
        const values=new Map();
        for(const node of nodes){
          const args=node.inputs?.map(child=>values.get(child.id));
          values.set(node.id,node.op?(independent?check(node.op,args,size):rules[node.op].evalMask(...args,u)):
            overrides.get(node.id)??node.value);
        }
        return values;
      }
      for(const leaf of leaves)leaf.value=rand(rng,1,u-1);
      // A demanded result constrains the final free source. Check every mask
      // for that source before choosing one which reaches the requested answer.
      if(wanted!==undefined){
        const last=leaves.at(-1), candidates=[];
        for(let mask=1;mask<u;mask++){
          const result=solve(new Map([[last.id,mask]])).get(root.id);
          if((root.out==="set"?indices(result).length:result)===wanted)candidates.push(mask);
        }
        if(!candidates.length)continue;
        last.value=pick(rng,candidates);
      }
      const height=node=>node.op?1+Math.max(...node.inputs.map(height)):0;

      if(level!=="A"&&leaves.some((leaf,i)=>leaves.slice(0,i).some(other=>other.out===leaf.out&&other.value===leaf.value)))continue;
      const values=solve(), verified=solve(new Map(),true);
      if(nodes.some(node=>values.get(node.id)!==verified.get(node.id)))continue;
      const result=values.get(root.id);
      // A condition contributes when changing just that input can alter the
      // answer. Try its complete finite domain, not a sampled perturbation.
      if(level!=="A"&&leaves.some(leaf=>{
        for(let mask=0;mask<=u;mask++)if(solve(new Map([[leaf.id,mask]]),true).get(root.id)!==result)return false;
        return true;
      }))continue;
      const binding=useInput&&(inputMode==="roster"||attempt<100)?rosterInput.bind({leaves,diagram,domain:universe,root,result,solve,rng}):null;
      if(useInput&&!binding&&(inputMode==="roster"||attempt<100))continue;
      if(inputMode==="roster"&&binding?.values.length!==1)continue;
      if(level==="C"&&height(root)!=={C1:2,C2:3,C3:4}[requested])continue;
      const shown=node=>display(values.get(node.id),node.out,universe);
      const {compose,equality,setDefinition,object}=ForgeProblemProse;
      const clauses=[];
      const intro=["전체집합 "+m("U")+"는 "+domain.description+"이다."];

      if(binding)intro.push(m(binding.name)+"는 "+m("U")+"의 원소이다. 문제에 나오는 집합은 모두 "+m("U")+"의 부분집합이다.");
      if(diagram)intro.push("벤 다이어그램에 각 영역의 원소가 표시되어 있다.");
      for(const leaf of leaves){
        if(diagram?.inputs.includes(leaf))continue;
        if(binding?.leaf===leaf){
          clauses.push(leaf.out==="set"?equality(leaf.id,"set",[],m(leaf.name+"="+binding.tex)):
            {id:leaf.id,group:"condition",reads:[],sentence:"조건 "+m(leaf.name)+": "+m("x\\in "+binding.tex)+"."});
          continue;
        }
        const list=indices(leaf.value).map(i=>universe[i]);
        const descriptions=[];
        for(let n=2;n<=size*2;n++){
          for(const [text,matching] of [[m(n)+"의 배수",universe.filter(x=>x%n===0)],[m(n)+"의 양의 약수",universe.filter(x=>x>0&&n%x===0)]]){
            if(matching.join()===list.join())descriptions.push(text);
          }
        }
        if(list.join()===universe.filter(x=>Math.abs(x%2)===1).join())descriptions.push("홀수");
        if(list.join()===universe.filter(x=>x%2===0).join())descriptions.push("짝수");
        const condition=descriptions.length&&rng()<.65?pick(rng,descriptions):null;
        if(leaf.out==="set"){
          const expression=condition?m(leaf.name+"=\\{x\\mid x")+"는 "+condition+m("\\}"):m(leaf.name+"="+shown(leaf));
          clauses.push(equality(leaf.id,"set",[],expression));
        }else{
          const definition=condition?m("x")+"는 "+condition:m("x\\in "+shown(leaf));
          clauses.push({id:leaf.id,group:"condition",reads:[],sentence:"조건 "+m(leaf.name)+": "+definition+(condition?"이다.":".")});
        }
      }
      for(const node of nodes.filter(node=>node!==root&&node.op)){
        const expression=rules[node.op].describe(node.inputs.map(child=>child.name));
        const reads=node.inputs.map(child=>child.id);
        clauses.push(node.out==="set"?setDefinition(node,reads,expression):{
          id:node.id,group:"condition",reads,sentence:"조건 "+m(node.name)+object(node.name)+" ‘"+expression+"’이라 하자.",
        });
      }
      const target=root.op==="membership"?m(universe[1]+"\\in "+root.inputs[0].name):rules[root.op].describe(root.inputs.map(child=>child.name));
      const presentation=format??(root.out==="truth"?"written":pick(rng,["choice","written"]));
      const concise=presentation==="written"&&rng()<.45;
      const truthClaim="‘"+target.replace(/\.$/,"").replace(/[‘’]/g,'"')+"’";
      let question=root.out==="truth"?(presentation==="choice"?truthClaim+"의 참, 거짓을 고르시오.":
        concise?"다음 진술은 참인가, 거짓인가? "+truthClaim:truthClaim+"의 참, 거짓을 판별하시오.") :
        root.out==="condition"?"조건 ‘"+target+"’의 진리집합"+(concise?"은?":"을 구하시오."):
        root.out==="set"?target+(concise?(target.startsWith("$")&&target.endsWith("$")&&rng()<.5?"는 어떤 집합인가?":"의 원소는?"):"의 원소를 모두 구하시오."):
        ["count","cardinalArithmetic"].includes(root.op)?target+(concise?"의 값은?":"의 값을 구하시오."):
        target+(concise?"는?":"를 구하시오.");
      let answer=root.out==="truth"?{kind:"truth",value:shown(root),text:shown(root)}:
        ["set","condition"].includes(root.out)?set(indices(result).map(i=>universe[i])):scalar(result);
      const terminology=focus==="prop-proof-definition"&&level==="B";
      const classification=focus==="prop-definition"&&root.out==="truth"&&!binding;
      const open=classification?values.get(root.inputs[0].id):null;
      const prefixClass=classification&&open!==0&&open!==u&&root.inputs[0].op&&rng()<.45?"unquantified":classification?"quantified":null;
      if(classification){
        const raw=m(root.inputs[0].name);
        const prompt=prefixClass==="unquantified"?"변수의 값이 정해지지 않았을 때, "+raw+"는 명제와 조건 중 어느 것인가?":
          "‘"+target+"’은 참인 명제, 거짓인 명제, 조건 중 어느 것인가?";
        const value=prefixClass==="unquantified"?"조건":result?"참인 명제":"거짓인 명제";
        question=prompt;
        answer=ForgeTopics.choice(rng,value,["조건","참인 명제","거짓인 명제"].filter(s=>s!==value));
      }
      let termReason;
      if(terminology){
        if(root.out!=="truth"||!result)continue;
        const term=pick(rng,["theorem","proof"]), condition=root.inputs[0].name, conclusion=root.inputs[1].name;
        const [label,extra,rationale]={
          theorem:["정리","‘"+target+"’이 참임을 증명한 뒤 이 결과를 뒤의 문제에서도 사용하기로 하였다.",
            "참임이 증명된 수학적 명제이므로 정리이다."],
          proof:["증명","조건 "+m(condition)+"의 진리집합이 조건 "+m(conclusion)+"의 진리집합에 포함됨을 확인하여, 주어진 명제가 참임을 보였다.",
            "명제가 참임을 근거를 들어 보이는 과정이므로 증명이다."],
        }[term];
        question=extra+" 이 "+(term==="theorem"?"결과":"과정")+"에 해당하는 용어를 고르시오.";
        answer=ForgeTopics.choice(rng,label,["정의","정리","증명"].filter(item=>item!==label));
        termReason={term,rationale};
      }
      if(binding){
        const {outcome,values,name}=binding;
        const subject=root.out==="condition"?"조건 ‘"+target+"’의 진리집합":"집합 "+target;
        const condition=outcome.id==="cardinality"?subject+"의 원소가 "+m(outcome.value)+"개일 때":
          outcome.id==="element"?m(outcome.value)+"가 "+subject+"에 속할 때":
          root.out==="truth"?truthClaim+"가 "+shown(root)+"일 때":
          root.out==="condition"?"조건 ‘"+target+"’의 진리집합이 "+m(shown(root))+"일 때":
          root.out==="set"?target+"의 원소를 나열한 결과가 "+m(shown(root))+"일 때":
          target+(["count","cardinalArithmetic"].includes(root.op)?"의 값이 ":"가 ")+m(shown(root))+"일 때";
        const ask=values.length===1?"unique":pick(rng,["set","count"]);
        question=condition+", "+m(name)+(ask==="unique"?"의 값을":ask==="count"?"로 가능한 값의 개수를":"로 가능한 값을 모두")+" 구하시오.";
        answer=ask==="unique"?scalar(values[0]):ask==="count"?scalar(values.length):set(values);
        binding.ask=ask;
      }
      const solution=nodes.filter(node=>node.op).map(node=>{
        const inputs=node.inputs.map(child=>m(child.name)+"에 대응하는 "+m(shown(child)));
        const output=node.out==="truth"?shown(node):m(shown(node));
        return inputs.join(", ")+"에 "+rules[node.op].label+"을 적용하면 "+output+"이다.";
      });
      if(termReason)solution.push(termReason.rationale);
      if(classification){
        if(prefixClass==="unquantified")solution.splice(solution.length-1,1,
          "이 진술은 변수의 값에 따라 참과 거짓이 달라지므로 조건이다.");
        else solution.push("‘모든’이나 ‘어떤’으로 변수의 범위를 정하면 진술 전체의 참과 거짓을 판단할 수 있다.");
      }
      if(binding){
        solution.length=0;
        solution.push(m("U")+"의 원소를 "+m(binding.name)+"에 대입하여 주어진 조건이 성립하는지 확인한다.",
          "조건을 만족하는 값의 집합은 "+set(binding.values).text+"이다."+
          (binding.ask==="count"?" 원소의 개수는 "+m(binding.values.length)+"이다.":""));
      }
      const layers=[];
      const depth=new Map();
      for(const node of nodes){
        if(prefixClass==="unquantified"&&node===root)continue;
        const d=node.inputs?.length?1+Math.max(...node.inputs.map(child=>depth.get(child.id))):0;
        depth.set(node.id,d);
        (layers[d]??=[]).push({id:node.id,operation:node.op??"given",output:node.out,label:node.op?rules[node.op].label:"공개 "+(node.out==="set"?"집합":"조건"),
          from:node.inputs?.map(child=>child.id)??[], ...(node.out==="truth"?{prose:shown(node)}:{math:binding?.leaf===node?binding.tex:shown(node)})});
      }
      if(classification){
        const parent=prefixClass==="unquantified"?root.inputs[0]:root;
        const d=depth.get(parent.id)+1;
        (layers[d]??=[]).push({id:"classification",operation:prefixClass,label:"명제와 조건의 구분",prose:answer.text,from:[parent.id]});
      }
      if(termReason){
        const parents=[root];
        const d=depth.get(parents[0].id)+1;
        (layers[d]??=[]).push({id:"terminology",operation:termReason.term,label:"정의·증명·정리 구분",prose:answer.text,from:parents.map(node=>node.id)});
      }
      if(binding)layers.push([{id:"parameter",operation:"solveParameter-"+binding.outcome.id+"-"+binding.ask,label:"공개 조건을 만족하는 대입",
        math:setText(binding.values),from:[root.id]}]);
      const wording=compose({prefix:intro,clauses,question,reads:root.inputs.map(child=>child.id),
        known:diagram?.inputs.map(node=>node.id),afterDisplay:Boolean(diagram)},rng);
      const data=problem(wording.intro,[],wording.question,answer,solution);
      if(diagram){
        const [a,b]=diagram.inputs.map(node=>node.value);
        const regions=[a&~b,a&b,b&~a,u&~(a|b)].map(mask=>indices(mask).map(index=>universe[index]));
        data.plot={kind:"venn",names:diagram.inputs.map(node=>node.name),elements:regions,
          counts:regions.map(items=>items.length)};
      }
      const wrongSets=()=>Array.from({length:u+1},(_,mask)=>mask).filter(mask=>mask!==result)
        .map(mask=>({mask,distance:indices(mask^result).length,priority:rng()}))
        .sort((a,b)=>a.distance-b.distance||a.priority-b.priority).slice(0,3)
        .map(({mask})=>m(display(mask,"set",universe)));
      const resultProblem=presentation==="choice"&&answer.kind==="set"&&!binding?{...data,
        question:wording.question.replace("구하시오.","고르시오."),answer:ForgeTopics.choice(rng,answer.text,wrongSets())}:
        !binding&&!classification&&!terminology&&root.out==="truth"&&presentation==="choice"?{...data,answer:{kind:"choice",value:result?0:1,options:["참","거짓"],text:shown(root)}}:
        ForgeVariations.present(data,presentation,rng);
      return {...resultProblem,type:"challenge-"+unit,level,template:unit==="sets"?"집합":"명제",format:"tex",actionHistory:[],
        plus:nodes.some(node=>node.op&&rules[node.op].extended),...(level==="C"?{challengeDifficulty:requested}:{}),
        answerPath:{id:"logic/"+structure+"/"+(binding?"input/":"")+presentation,label:rules[root.op].label,operations:nodes.filter(node=>node.op).map(node=>node.op)},
        inspection:{verified:true,environment:"logic",structure:structure+(binding?"/roster-"+binding.outcome.id+"-"+binding.ask:""),graph:layers,concepts:[...new Set(nodes.filter(node=>node.op).map(node=>rules[node.op].label))],
          conditions:["전체집합의 각 원소에 대해 독립 계산",...(binding?["모든 대입을 검산하여 빠진 후보가 없는지 확인"]:[]),...(wanted===undefined?[]:["목표 결과를 먼저 정하고 이를 만족하는 마지막 조건을 탐색"]),...(level!=="A"?["공개 조건별 답의 의존성 검사"]:[])],
          variables:[...leaves.map(node=>({key:node.name,label:node.out==="set"?"집합":"진리집합",value:binding?.leaf===node?binding.tex:shown(node),given:true})),{key:"답",label:"구할 값",value:binding||classification||terminology?answer.text:shown(root),target:true}],
          universe:domain,...(binding?{input:{name:binding.name,roster:binding.roster,value:binding.value,values:binding.values,observation:binding.outcome.id}}:{})}};
    }
    throw new RangeError("조건과 명제를 조합할 수 있는 문항을 찾지 못했습니다.");
  }
  const inequalities={
    square:{
      seed:rng=>({a:rand(rng,1,3),h:pick(rng,[-3,-2,-1,1,2,3]),k:rand(rng,-4,4)}),
      expression:({a,h,k})=>ForgeTopics.shift((a===1?"":a)+"x^2"+(h<0?"+":"")+(-2*a*h)+"x",-(a*h*h+k)),
      witness:({h})=>h,
      lower:({k})=>k,
      evaluate:({a,h,k},x)=>a*x*x-2*a*h*x+a*h*h+k,
      prove:({a,h,k})=>m(ForgeTopics.shift((a===1?"":a)+ForgeTopics.sq("x",h),-k))+"로 정리한다. 제곱항이 0일 때 하한에 도달한다.",
    },
    absolute:{
      seed:rng=>({a:rand(rng,2,4),b:1,h:rand(rng,-4,-1),j:rand(rng,1,4)}),
      expression:({a,h,j})=>a+"|"+ForgeTopics.shift("x",h)+"|+|"+ForgeTopics.shift("x",j)+"|",
      witness:({h})=>h,
      lower:({h,j})=>j-h,
      evaluate:({a,h,j},x)=>a*Math.abs(x-h)+Math.abs(x-j),
      prove:({a,h,j})=>m("|"+ForgeTopics.shift("x",h)+"|+|"+ForgeTopics.shift("x",j)+"|\\ge "+(j-h))+"이고 남은 "+m((a-1)+"|"+ForgeTopics.shift("x",h)+"|")+"는 음이 아니다. 두 하한은 "+m("x="+h)+"에서 동시에 달성된다.",
    },
    amgm:{
      seed:rng=>({a:rand(rng,1,3),b:rand(rng,1,4)}),
      expression:({a,b})=>(a===1?"":a*a)+"x+\\frac{"+b*b+"}{x}",
      witness:({a,b})=>b/a,
      lower:({a,b})=>2*a*b,
      evaluate:({a,b},x)=>a*a*x+b*b/x,
      prove:({a,b})=>"두 양수에 산술평균과 기하평균의 관계를 적용한다. 두 항이 같아지는 "+m("x=\\frac{"+b+"}{"+a+"}")+"에서 등호가 성립한다.",
    },
    cauchy:{
      extended:true,
      seed:rng=>({a:rand(rng,1,4),b:rand(rng,1,4),n:rand(rng,1,3)}),
      expression:({a,b})=>ForgeTopics.linear(a,"x",b,"y"),
      witness:({a,b,n})=>[n*a,n*b],
      lower:({a,b,n})=>n*(a*a+b*b),
      evaluate:({a,b},[x,y])=>a*x+b*y,
      prove:({a,b,n})=>"코시–슈바르츠 부등식의 등호 조건에서 "+m("(x,y)=("+n*a+","+n*b+")")+"를 얻는다.",
    },
  };
  // Roster inputs are expressions over integer parameters. The relation
  // modules above consume their evaluated sets just like concrete rosters.
  const parameterOperations=["union","intersection","difference","complement"];
  function generateSetParameters({rng=Math.random,format,avoidPaths=[],requiredOperation}={}){
    const {compose,equality}=ForgeProblemProse;
    for(let attempt=0;attempt<180;attempt++){
      const domain=finiteUniverse(rng), numbers=domain.values, size=numbers.length, universe=(1<<size)-1;
      const unknownSets=setNames(rng,true);
      const names=pick(rng,[["a","b"],["k","l"],["p","q"]]).slice(0,rng()<.35?1:2);
      const bothSides=names.length===2&&rng()<.55;
      const target=names.map((_,i)=>numbers[rand(rng,i?Math.ceil(size/2):0,i?size-1:Math.floor(size/2)-1)]);
      const element=rosterInput.element;
      const atoms=(items)=>({items});
      const fixed=(count,excluded=[])=>{
        const candidates=numbers.filter(n=>!excluded.includes(n)), selected=[];
        while(selected.length<count&&candidates.length)selected.push(candidates.splice(rand(rng,0,candidates.length-1),1)[0]);
        return selected;
      };
      const evaluate=(node,assignment,independent=false)=>{
        if(node.items)return rosterInput.mask(node.items,assignment,numbers);
        const operands=node.inputs.map(child=>evaluate(child,assignment,independent));
        if(operands.includes(null))return null;
        return independent?check(node.op,operands,size):rules[node.op].evalMask(...operands,universe);
      };
      const offset=rng()<.28?pick(rng,[-1,1]):0;
      const shifted=target[0]+offset;
      if(!numbers.includes(shifted)||target.slice(1).includes(shifted))continue;
      const first=atoms([...fixed(rand(rng,1,2),[shifted,...target.slice(1)]),element(0,offset),
        ...(names.length===2&&!bothSides?[element(1)]:[])]);
      let left=first;
      const depth=requiredOperation?rand(rng,1,3):rand(rng,0,3);
      for(let step=0;step<depth;step++){
        const op=step===0&&requiredOperation?requiredOperation:pick(rng,parameterOperations);
        if(op==="complement"&&left.op===op)continue;
        const other=atoms(fixed(rand(rng,1,3)));
        left={op,inputs:op==="complement"?[left]:rng()<.5&&op!=="difference"?[other,left]:[left,other]};
      }
      const leftTarget=evaluate(left,target);
      if(!leftTarget)continue;
      const knownElements=indices(leftTarget).map(i=>numbers[i]);
      if(bothSides&&!knownElements.includes(target[1]))continue;
      const right=atoms(bothSides?knownElements.map(n=>n===target[1]?element(1):n):knownElements);
      const roots=[left,right];
      if(rng()<.5)roots.reverse();
      const answers=rosterInput.solutions(numbers,names.length,candidate=>{
        const sides=roots.map(node=>evaluate(node,candidate,true));
        return sides[0]!==null&&sides[0]===sides[1];
      });
      if(answers.length!==1||!target.every((value,i)=>value===answers[0][i]))continue;

      const structure=node=>node.items?"roster("+node.items.map(item=>typeof item==="number"?"n":item.shift?"shift":"parameter").sort().join(",")+")":
        node.op+"("+node.inputs.map(structure).join(",")+")";
      const key=roots.map(structure).sort().join("=");
      const path="set-input/"+key;
      if(attempt<140&&avoidPaths.some(previous=>previous.startsWith(path+"/")))continue;
      const layers=[[]], clauses=[];
      let nextName=0;
      function render(node,isRoot=false){
        if(node.items){
          const tex=rosterInput.tex(node.items,names);
          const id="source"+layers[0].length;
          layers[0].push({id,operation:"given",label:"원소나열법으로 주어진 집합",math:tex,from:[]});
          return {id,tex,depth:0};
        }
        const inputs=node.inputs.map(child=>render(child));
        const parts=inputs.map(child=>child.tex);
        const tex=rules[node.op].describe(parts).slice(1,-1);
        const depth=1+Math.max(...inputs.map(child=>child.depth)), name=unknownSets[nextName++];
        const id="operation"+nextName;
        (layers[depth]??=[]).push({id,operation:node.op,label:rules[node.op].label,math:tex,from:inputs.map(child=>child.id)});
        if(!isRoot){
          clauses.push(equality(id,"set",inputs.map(child=>child.id),m(name+"="+tex)));
          return {id,tex:name,depth};
        }
        return {id,tex,depth};
      }
      const displayed=roots.map(node=>render(node,true));
      const relation=m(displayed.map(node=>node.tex).join("="));
      const labels=names.join(",");
      const pair=names.length===2&&rng()<.3;
      const coefficients=names.map((_,i)=>i?pick(rng,[-3,-2,1,2,3]):rand(rng,1,3));
      const constant=names.length===1?rand(rng,0,4):0;
      const expression=ForgeTopics.shift(names.length===1?ForgeTopics.term(coefficients[0],names[0]):
        ForgeTopics.linear(coefficients[0],names[0],coefficients[1],names[1]),-constant);
      const total=target.reduce((acc,n,i)=>acc+coefficients[i]*n,constant);
      const question=pair?m("("+labels+")")+"의 값을 구하시오.":m(expression)+(rng()<.45?"의 값은?":"의 값을 구하시오.");
      const prefix=["전체집합 "+m("U")+"는 "+domain.description+"이다. "+m(labels)+"는 "+m("U")+"의 원소이고, 문제에 나오는 집합은 모두 "+m("U")+"의 부분집합이다."];
      const condition=equality("equality","set",displayed.map(node=>node.id),relation);
      const known=layers.flat().filter(node=>!clauses.some(clause=>clause.id===node.id)).map(node=>node.id);
      const wording=compose({prefix,clauses:[...clauses,condition],known,question,reads:["equality"]},rng);
      const assignment=m(names.map((name,i)=>name+"="+target[i]).join(","));
      const answer=pair?ForgeTopics.point(target):scalar(total);
      const solution=[
        "집합의 상등은 원소의 순서에 관계없이 양쪽의 원소가 모두 같다는 뜻이다.",
        "주어진 범위에서 집합을 비교하면 "+assignment+"인 경우에만 두 집합이 같다.",
        pair?m("("+labels+")="+ForgeTopics.coord(target))+"이다.":m(expression+"="+total)+"이다.",
      ];
      const last=1+Math.max(...displayed.map(node=>node.depth));
      layers[last]=[{id:"equality",operation:"equal",label:"집합의 상등 조건",math:relation.slice(1,-1),from:displayed.map(node=>node.id)}];
      layers[last+1]=[{id:"assignment",operation:"solveParameters",label:"가능한 대입을 모두 비교",math:assignment.slice(1,-1),from:["equality"]}];
      layers[last+2]=[{id:"target",operation:"answer",label:"구하는 값",math:pair?ForgeTopics.coord(target):String(total),from:["assignment"]}];
      const mode=format??pick(rng,["written","choice"]);
      const data=problem(wording.intro,[],mode==="choice"?wording.question.replace(/의 값은\?$/,"의 값을 구하시오."):wording.question,answer,solution);
      return {...ForgeVariations.present({...data,allowNegative:true},mode,rng),format:"tex",actionHistory:[],
        answerPath:{id:path+"/"+mode,label:"집합 조건에서 미지수 역산",operations:[...layers.flat().filter(node=>node.operation!=="given").map(node=>node.operation)]},
        inspection:{environment:"logic",verified:true,structure:key,graph:layers,
          concepts:[...new Set(layers.flat().filter(node=>node.operation!=="given").map(node=>node.label))],
          conditions:["공개된 자연수 범위의 모든 대입을 원소별 연산으로 검산","조건을 만족하는 대입은 한 가지"],
          variables:names.map((name,i)=>({key:name,value:target[i],label:"미지수",target:true})),
          universe:domain,parameterModel:{size,numbers,names,roots},
        }};
    }
    return null;
  }

  const periodicInput={
    divisors:[2,3,4,5,6,8,10,12],
    gcd(a,b){return b?this.gcd(b,a%b):a;},
    lcm(a,b){return a/this.gcd(a,b)*b;},
    normalize(values,kind){
      const unique=[...new Set(values)].sort((a,b)=>a-b);
      return unique.filter(n=>!unique.some(d=>n!==d&&(kind==="divisors"?d%n===0:n%d===0)));
    },
    evaluate(node,kind){
      if(node.divisor)return [node.divisor];
      const [a,b]=node.inputs.map(child=>this.evaluate(child,kind));
      const intersection=(x,y)=>kind==="divisors"?this.gcd(x,y):this.lcm(x,y);
      return this.normalize(node.op==="union"?[...a,...b]:a.flatMap(x=>b.map(y=>intersection(x,y))),kind);
    },
    matches(node,n,kind){
      if(node.divisor)return kind==="divisors"?node.divisor%n===0:n%node.divisor===0;
      const [a,b]=node.inputs.map(child=>this.matches(child,n,kind));
      return node.op==="union"?a||b:a&&b;
    },
    period(node){
      return node.divisor??node.inputs.map(child=>this.period(child)).reduce((a,b)=>this.lcm(a,b),1);
    },
    tex(node,indexed){
      if(node.divisor)return indexed(node.divisor);
      const parts=node.inputs.map(child=>child.divisor||child.op===node.op?this.tex(child,indexed):"("+this.tex(child,indexed)+")");
      return parts.join(node.op==="union"?"\\cup ":"\\cap ");
    },
  };

  function generatePeriodic({rng=Math.random,requiredOperation,proposition=false,requiredClaim,avoidPaths=[],level="B",difficulty,format,familyKind,measure}={}){
    const p=periodicInput;
    const kind=familyKind??pick(rng,["multiples","multiples","divisors"]);
    const [symbol,parameter]=pick(rng,kind==="divisors"?[["B","n"],["D","k"],["C","m"]]:[["A","m"],["B","n"],["M","k"],["S","a"]]);
    const indexed=n=>symbol+"_{"+n+"}";
    for(let attempt=0;attempt<80;attempt++){
      const leaf=()=>({divisor:pick(rng,p.divisors)});
      const make=(op,inputs)=>({op,inputs});
      const op=()=>pick(rng,["union","intersection"]);
      let root=make(requiredOperation??op(),[leaf(),leaf()]);
      const steps=measure==="finitude"?rand(rng,1,2):rand(rng,1,3);
      for(let i=0;i<steps;i++){
        const side=rand(rng,0,1);
        const insert=rng()<.45?make(op(),[leaf(),leaf()]):leaf();
        root=make(op(),side?[root,insert]:[insert,root]);
      }
      if(measure==="finitude"){
        const used=new Set();
        const unique=node=>node.divisor?(!used.has(node.divisor)&&Boolean(used.add(node.divisor))):node.inputs.every(unique);
        if(!unique(root))continue;
      }
      const normalized=p.evaluate(root,kind), period=p.period(root), tex=p.tex(root,indexed);
      const matches=(d,n)=>kind==="divisors"?d%n===0:n%d===0;
      const valid=Array.from({length:period},(_,i)=>i+1)
        .every(n=>p.matches(root,n,kind)===normalized.some(d=>matches(d,n)));
      if(!valid)throw new Error("배수·약수 집합의 검산에 실패했습니다.");
      const contains=(a,b)=>a.every(d=>b.some(e=>kind==="divisors"?e%d===0:d%e===0));
      const candidate=pick(rng,[...normalized,...p.divisors]);
      const claim=proposition?requiredClaim??pick(rng,["subset","equal"]):null;
      const truth=claim==="equal"?contains(normalized,[candidate])&&contains([candidate],normalized):contains(normalized,[candidate]);
      const property=kind==="divisors"?"양의 약수":"양의 배수";
      const prefix="자연수 "+m(parameter)+"에 대하여 "+m(indexed(parameter)+"=\\{x\\mid x")+"는 "+m(parameter)+"의 "+property+m("\\}")+"라 하자.";
      const target=normalized.map(indexed).join("\\cup ");
      const options=new Map();
      for(const divisors of [normalized,...p.divisors.map(d=>[d]),[2,3],[4,6]]){
        const canonical=p.normalize(divisors,kind), key=canonical.join(",");
        options.set(key,m(canonical.map(indexed).join("\\cup ")));
      }
      const signature=node=>node.divisor?"S":node.op+"("+node.inputs.map(signature).sort().join(",")+")";
      const query=measure==="finitude"?pick(rng,kind==="multiples"?["is-finite","bounded-size"]:["is-finite","size"]):null;
      const structure=kind+"/"+signature(root)+(claim?"/"+claim:query?"/"+query:"");
      const path="family/"+structure;
      if(attempt<65&&avoidPaths.some(previous=>previous.startsWith(path+"/")))continue;
      let question=proposition?(claim==="implication"?
        "조건 "+m("p:x\\in "+tex)+", "+m("q:x\\in "+indexed(candidate))+"에 대하여 명제 "+m("p\\to q")+"의 참, 거짓을 판별하시오.":
        m(tex+(claim==="equal"?"=":"\\subset ")+indexed(candidate))+"의 참, 거짓을 판별하시오."):
        m(tex)+"와 같은 집합을 고르시오.";
      let answer=proposition?{kind:"truth",value:truth?"참":"거짓",text:truth?"참":"거짓"}:
        ForgeTopics.choice(rng,m(target),[...options].filter(([key])=>key!==normalized.join(",")).map(([,value])=>value).slice(0,3));
      const bound=pick(rng,[12,18,24,30]);
      const count=Array.from({length:query==="bounded-size"?bound:period},(_,i)=>i+1).filter(n=>p.matches(root,n,kind)).length;
      let proof;
      if(query==="is-finite"){
        const finite=kind==="divisors";
        answer=ForgeTopics.choice(rng,finite?"유한집합":"무한집합",[finite?"무한집합":"유한집합"]);
        question=m(tex)+"가 유한집합인지 무한집합인지 판별하시오.";
        proof=finite?"모든 원소는 "+m(period)+" 이하이므로 원소의 개수는 유한하다.":
          m(period)+"의 모든 양의 배수는 이 집합에 속하므로 원소의 개수는 무한하다.";
      }else if(query){
        const expected=Array.from({length:query==="bounded-size"?bound:period},(_,i)=>i+1).filter(n=>normalized.some(d=>matches(d,n))).length;
        if(count!==expected)continue;
        answer=scalar(count);
        if(query==="bounded-size")question=m(tex)+"의 원소 중 "+m(bound)+" 이하인 자연수는 몇 개인가?";
        else question=m(tex)+"가 유한집합일 때, 원소의 개수를 구하시오.";
        proof="중복을 제외하여 세면 "+m(count)+"개이다.";
      }
      if(proposition){
        const verifiedTruth=Array.from({length:p.lcm(period,candidate)},(_,i)=>i+1).every(n=>
          claim==="equal"?p.matches(root,n,kind)===matches(candidate,n):!p.matches(root,n,kind)||matches(candidate,n));
        if(verifiedTruth!==truth)throw new Error("배수·약수 조건의 명제 검산에 실패했습니다.");
      }
      const stepsByDepth=[], used=[];
      function trace(node){
        const children=node.inputs?.map(trace)??[];
        const depth=children.length?1+Math.max(...children.map(item=>item.depth)):0;
        const id="set"+used.length;
        used.push(id);
        (stepsByDepth[depth]??=[]).push({id,operation:node.op??"given",label:node.op?rules[node.op].label:property+" 조건",
          math:p.evaluate(node,kind).map(indexed).join("\\cup "),from:children.map(item=>item.id)});
        return {id,depth};
      }
      const last=trace(root);
      const depth=last.depth+Number(proposition);
      if(level==="C"&&depth!=={C1:2,C2:3,C3:4}[difficulty])continue;
      if(query)stepsByDepth.push([{id:"measure",operation:query,label:query==="is-finite"?"유한·무한 판별":"원소의 개수",prose:answer.text,from:[last.id]}]);
      if(proposition)stepsByDepth.push([{id:"claim",operation:claim,label:"명제의 참·거짓",prose:answer.value,from:[last.id]}]);
      const derivation=[kind==="divisors"?"두 약수 집합의 공통 원소는 최대공약수의 양의 약수이다. 합집합에서 다른 약수 집합에 포함되는 항을 정리한다.":
        "두 배수 집합의 공통 원소는 최소공배수의 양의 배수이다. 합집합에서 다른 배수 집합에 포함되는 항을 정리한다.",
        m(tex+"="+target)+"이다.",...(query?[proof]:[]),...(proposition?["두 집합 사이의 관계를 비교하면 "+answer.value+"이다."]:[])];
      const presented=proposition&&format==="choice"?ForgeTopics.choice(rng,answer.value,[truth?"거짓":"참"]):query?ForgeVariations.present({question,answer},format,rng).answer:answer;
      return {...problem(prefix,[],presented.kind==="choice"?question.replace("판별하시오.","고르시오."):question,presented,derivation),format:"tex",actionHistory:[],
        answerPath:{id:path+"/"+answer.kind,label:property+" 조건의 합성",operations:stepsByDepth.flat().map(node=>node.operation)},
        inspection:{environment:"logic",verified:true,structure,graph:stepsByDepth,
          concepts:[...new Set(stepsByDepth.flat().filter(node=>node.operation!=="given").map(node=>node.label))],
          conditions:[kind==="divisors"?"모든 양의 약수가 포함되는 범위에서 검산":m(period)+"을 주기로 배수 조건이 반복되므로 한 주기의 모든 원소를 검산"],
          variables:[{key:"답",value:proposition?answer.value:target,label:"구할 값",target:true}],
          periodicModel:{root,period,normalized,claim,candidate,kind,symbol,parameter}}};
    }
    return null;
  }

  function generateInequality(goal,{rng=Math.random,level,format,avoidPaths=[]}){
    const source=inequalities[goal];
    const high=goal==="cauchy", domain=goal==="amgm"?"양수": "실수";
    const data=source.seed(rng), boundary=source.lower(data), witness=source.witness(data);
    const valueAtEquality=source.evaluate(data,witness);
    // Recompute the global bound separately from the construction.
    const independent=goal==="square"?source.evaluate(data,-(-2*data.a*data.h)/(2*data.a)):
      goal==="absolute"?Math.min(source.evaluate(data,data.h),source.evaluate(data,data.j)):
      goal==="amgm"?2*Math.sqrt(data.a**2*data.b**2):
      Math.sqrt((data.a**2+data.b**2)*data.n**2*(data.a**2+data.b**2));
    if(Math.abs(independent-boundary)>1e-8||Math.abs(valueAtEquality-boundary)>1e-8)throw new Error("극값 검산 실패");
    const expression=source.expression(data);
    const intro=high?"두 실수 "+m("x,y")+"가 "+m("x^2+y^2="+data.n**2*(data.a**2+data.b**2))+"를 만족한다.":
      domain+" "+m("x")+"에 대한 식 "+m("f(x)="+expression)+"를 생각하자.";
    const modes=level==="A"?["boundary"]:["compare",...(Number.isInteger(witness)||high?["equality"]:[])];
    const fresh=modes.filter(mode=>!avoidPaths.some(path=>path.startsWith("inequality/"+goal+"/"+mode+"/")));
    const mode=pick(rng,fresh.length?fresh:modes);
    const subject=high?m(expression)+"의 최댓값":m("f(x)")+"의 최솟값";
    const extra=rand(rng,1,4);
    const target=mode==="boundary"?boundary:mode==="equality"?(high?witness[0]+witness[1]:witness):
      boundary-extra;
    const question=mode==="boundary"?subject+"을 구하시오.":
      mode==="equality"?(high?subject+"을 달성할 때 "+m("x+y")+"의 값을 구하시오.":subject+"을 달성하는 "+m("x")+"의 값을 구하시오."):
      high?(m(expression+"\\le k+"+extra)+"가 항상 성립하도록 하는 "+m("k")+"의 최솟값을 구하시오."):
      m("f(x)\\ge k+"+extra)+"가 항상 성립하도록 하는 "+m("k")+"의 최댓값을 구하시오.";
    const step=mode==="equality"?"등호 조건으로 얻은 값":
      "모든 값에서 성립하는 경계";
    const derivation=problem(intro,[],question,scalar(target),[source.prove(data),subject+"은 "+m(boundary)+"이다.",
      ...(mode==="boundary"?[]:[step+"은 "+m(target)+"이다."])]);
    const result=ForgeVariations.present({...derivation,allowNegative:true},format??pick(rng,["written","choice"]),rng);
    const graph=[[{id:"expression",operation:"given",output:"expression",label:"공개 식",math:expression,from:[]}],
      [{id:"boundary",operation:goal,output:"scalar",label:"극값과 등호 조건",math:String(boundary),from:["expression"]}]];
    if(mode!=="boundary")graph.push([{id:"answer",operation:mode,output:"scalar",label:step,math:String(target),from:["boundary"]}]);
    return {...result,format:"tex",actionHistory:[],plus:Boolean(source.extended),
      answerPath:{id:"inequality/"+goal+"/"+mode+"/"+result.answer.kind,label:step,operations:mode==="boundary"?[goal]:[goal,mode]},
      inspection:{verified:true,environment:"logic",graph,structure:goal+"/"+mode,
        concepts:mode==="boundary"?["극값과 등호 조건"]:["극값과 등호 조건",step],
        conditions:["정의역 전체에서의 상한 또는 하한과 등호가 성립하는 값을 각각 검산"],
        variables:[{key:"극값",value:boundary,label:"극값",seed:true},{key:"답",value:target,label:"구할 값",target:true}]}};
  }
  function realProperties(rng,level,format){
    const axioms=[
      {premise:"a>b", valid:"a+c>b+c", wrong:"a+c<b+c", reason:"양변에 같은 실수를 더해도 부등호의 방향은 유지된다."},
      {premise:"a>b, c>0",valid:"ac>bc",wrong:"ac<bc",reason:"양수로 곱하면 방향이 유지된다."},
      {premise:"a>b, c<0",valid:"ac<bc",wrong:"ac>bc",reason:"음수로 곱하면 방향이 바뀐다."},
      {premise:"a>b, b>c",valid:"a>c",wrong:"a<c",reason:"부등호의 추이성을 적용한다."},
      {premise:"a>b, c>d",valid:"a+c>b+d",wrong:"a+c<b+d",reason:"두 부등식의 같은 쪽을 각각 더한다."},
    ];
    if(level!=="A")return generateInequality("square",{rng,level,format});
    const property=pick(rng,axioms);
    return {...problem("실수에 대하여 "+m(property.premise)+"이다.",[],"항상 성립하는 부등식을 고르시오.",
      ForgeTopics.choice(rng,m(property.valid),[m(property.wrong)]),[property.reason]),
      format:"tex",actionHistory:[],answerPath:{id:"real-order/"+axioms.indexOf(property),label:"실수의 대소 관계"}};
  }

  function foundation(rng){
    const definitions=["용어의 뜻을 약속한 문장","어떤 명제가 참임을 논리적으로 보이는 과정","증명하여 참임이 밝혀진 명제"];
    const terms=["정의","증명","정리"];
    const which=rand(rng,0,2);
    const statement=definitions[which];
    const answer=ForgeTopics.choice(rng,terms[which],terms.filter((_,i)=>i!==which));
    return {...problem("다음 설명을 읽고 물음에 답하시오.",[],statement+"에 해당하는 용어를 고르시오.",answer,
      ["해당 용어는 "+terms[which]+"이다."]),
      format:"tex",actionHistory:[],answerPath:{id:"proof-terminology/"+which,label:"증명에 쓰는 용어"}};
  }
  ForgeLogicCompiler = globalThis.ForgeLogicCompiler = Object.freeze({units:["sets","propositions"],generate,generateSetParameters,generatePeriodic,generateInequality,realProperties,foundation,check});
})();


;

/* function-curriculum.js */
(() => {
  "use strict";
  const units={
    functions:[
      ["함수의 정의",[
        ["correspondence","대응과 함수"],["valid","함수가 되는 조건"],["domain","정의역"],["codomain","공역"],
        ["range","치역"],["value","함숫값"],["same","같은 함수"],["count","함수의 개수",true],
      ]],
      ["함수의 그래프",[
        ["graph","함수 그래프의 정의"],["vertical","그래프가 되는 조건"],["graph-bounds","그래프의 정의역과 치역"],
        ["graph-value","그래프와 함숫값"],["piece","구간별 함수",true],
      ]],
      ["여러 가지 함수",[
        ["injective","일대일함수"],["bijective","일대일대응"],["identity","항등함수"],["constant","상수함수"],
        ["injections","일대일함수의 개수",true],["bijections","일대일대응의 개수",true],
      ]],
      ["합성함수",[
        ["compose","합성함수의 정의"],["compatible","합성이 되는 조건"],["compose-value","합성함수 계산"],
        ["compose-bounds","합성함수의 범위"],["commute","합성 순서와 교환법칙"],["associate","합성의 결합법칙"],
        ["compose-id","항등함수와 합성"],["recover","합성에서 원래 함수 복원"],["iterate","합성함수의 반복",true],
        ["piece-compose","구간별 함수의 합성",true],
      ]],
      ["역함수",[
        ["inverse","역함수의 정의"],["invertible","역함수의 존재 조건"],["inverse-bounds","역함수의 범위"],
        ["inverse-rule","역함수 구하기"],["cancel","원함수와 역함수의 합성"],["double","역함수의 역함수"],
        ["inverse-compose","합성함수의 역함수"],["inverse-graph","역함수의 그래프"],
        ["symmetry","원함수와 역함수의 대칭"],["inverse-cross","원함수와 역함수의 교점",true],
        ["restrict","정의역 제한과 역함수",true],
      ]],
    ],
    rational:[
      ["유리식",[["expression","유리식의 정의"],["fraction","분수식의 정의"],["expr-domain","유리식의 정의 조건"],
        ["reduce","약분과 통분"],["add","유리식의 덧셈과 뺄셈"],["multiply","유리식의 곱셈과 나눗셈"]]],
      ["유리함수의 정의",[["definition","유리함수의 정의"],["domain","유리함수의 정의역"],["range","유리함수의 치역"],["value","유리함수의 함숫값"]]],
      ["유리함수의 그래프",[["graph","기본 유리함수의 그래프"],["translate","그래프의 평행이동"],["reflect","그래프의 대칭이동"],
        ["asymptotes","점근선"],["symmetry","그래프의 대칭성"],["linear-fraction","일차식의 비"],
        ["graph-bounds","그래프의 정의역과 치역"],["point","그래프가 지나는 점"],["intersections","직선과 교점",true],["area","유리함수와 도형의 넓이",true]]],
      ["유리함수의 활용",[["asymptote-fit","점근선에서 함수 결정"],["symmetry-fit","대칭성에서 함수 결정"],["unknown","함숫값에서 미지수 결정"],
        ["extrema","유리함수의 최댓값과 최솟값"],["inverse","유리함수의 역함수"],["line-position","직선과 위치 관계",true],["compose","유리함수의 합성",true]]],
    ],
    radical:[
      ["무리식",[["expression","무리식의 정의"],["expr-domain","무리식의 정의 조건"],["simplify","무리식의 계산"],["rationalize","분모의 유리화"]]],
      ["무리함수의 정의",[["definition","무리함수의 정의"],["defined","무리함수의 성립 조건"],["domain","무리함수의 정의역"],
        ["range","무리함수의 치역"],["value","무리함수의 함숫값"]]],
      ["무리함수의 그래프",[["graph","기본 무리함수의 그래프"],["translate","그래프의 평행이동"],["reflect","그래프의 대칭이동"],
        ["endpoint","그래프의 시작점"],["monotone","그래프의 증가와 감소"],["graph-bounds","그래프의 정의역과 치역"],
        ["linear-root","근호 속 일차식"],["point","그래프가 지나는 점"],["intersections","직선과 교점",true]]],
      ["무리함수의 활용",[["bounds-fit","범위에서 미지수 결정"],["endpoint-fit","시작점에서 함수 결정"],["extrema","무리함수의 최댓값과 최솟값"],
        ["quadratic","이차함수와 역함수 관계"],["inverse","무리함수의 역함수"],["line-position","직선과 위치 관계",true],["compose","무리함수의 합성",true]]],
    ],
  };
  const concepts=Object.entries(units).flatMap(([unit,groups])=>groups.flatMap(([group,items])=>
    items.map(([goal,label,plus=false])=>({id:unit+"-goal-"+goal,unit,group,goal,label,plus}))));
  const merges={
    functions:[
      ["bounds","정의역·공역·치역","domain","codomain","range","graph-bounds"],
      ["function-validity","대응과 함수의 성립","correspondence","valid"],
      ["graph-validity","함수 그래프의 성립","graph","vertical"],
      ["function-value","함숫값","value","graph-value"],
      ["composition","합성함수의 정의와 계산","compose","compose-value"],
      ["inverse-function","역함수의 정의와 계산","inverse","inverse-rule"],
      ["inverse-symmetry","역함수의 그래프와 대칭","inverse-graph","symmetry"],
    ],
    rational:[
      ["bounds","정의역과 치역","domain","range","graph-bounds"],
      ["function-value","함숫값과 그래프 위의 점","value","point"],
      ["graph-fit","그래프 조건에서 함수 결정","asymptote-fit","symmetry-fit"],
      ["line-relation","직선과 교점·위치 관계","intersections","line-position"],
      ["rational-expression","유리식과 분수식","expression","fraction"],
    ],
    radical:[
      ["bounds","정의역과 치역","domain","range","graph-bounds"],
      ["function-value","함숫값과 그래프 위의 점","value","point"],
      ["graph-fit","그래프 조건에서 함수 결정","bounds-fit","endpoint-fit"],
      ["line-relation","직선과 교점·위치 관계","intersections","line-position"],
      ["definition-conditions","무리식과 함수의 성립 조건","expr-domain","defined"],
    ],
  };
  const grouped=new Map();
  for(const [unit,items] of Object.entries(merges))for(const [key,label,...goals] of items){
    const members=goals.map(goal=>concepts.find(concept=>concept.unit===unit&&concept.goal===goal));
    const {group,plus}=members[0];
    if(members.some(member=>member.plus!==plus))throw new RangeError("Mixed extension status in function curriculum");
    const entry={id:unit+"-goal-"+key,unit,group,label,plus,goals};
    for(const member of members)grouped.set(member.id,entry);
  }
  const entries=[...new Set(concepts.map(concept=>grouped.get(concept.id)??{...concept,goals:[concept.goal]}))];
  const previous={
    functions:{
      domain:"a-finite-domain",codomain:"a-function-read-codomain",range:"a-finite-image function-image-restricted",value:"a-function-value a-function-read-missing-output function-identify-image-preimage",
      valid:"function-valid-relation",same:"function-equal-domain function-same-values-different-rule",injective:"function-injective-quadratic a-function-injection-from-table function-linear-injection-parameter",
      bijective:"function-bijection-missing function-codomain-bijection",identity:"a-function-identity-constant",compose:"a-function-compose function-context-composition",
      "compose-id":"function-identity-composition","compose-value":"function-composition-coefficient function-composition-parameter function-composition-table-preimage",
      commute:"function-composition-order function-composition-equality",compatible:"function-composition-finite-domain",recover:"function-composition-recover-rule function-affine-from-pairs",
      inverse:"a-inverse-pair a-function-recover-inverse-input","inverse-rule":"function-inverse-affine",restrict:"function-inverse-restricted",
      "inverse-bounds":"function-inverse-range","inverse-compose":"function-inverse-composition","inverse-cross":"function-inverse-fixed",cancel:"function-inverse-fixed-composition",
    },
    rational:{
      reduce:"a-rational-simplify rational-cancel-domain","expr-domain":"a-rational-denominator-product",add:"a-rational-add-like-fractions rational-sum-forbidden-input",
      domain:"a-rational-domain",range:"a-rational-range rational-interval-signed-output",value:"a-rational-value a-rational-substitute-zero rational-context-fixed-cost",
      asymptotes:"a-rational-asymptotes rational-center-general",graph:"a-rational-graph a-rational-reciprocal-sign rational-match-graph rational-relative-branches",
      "asymptote-fit":"rational-numerator-parameter rational-coefficient-through-point rational-two-points",point:"rational-x-intercept rational-missing-input-from-value-ratio",
      unknown:"rational-y-intercept-parameter",translate:"rational-translate a-rational-shift-horizontal",intersections:"rational-horizontal-intersection rational-two-intersections",
      extrema:"rational-restricted-range",inverse:"rational-inverse-value rational-match-inverse-rule",symmetry:"rational-center-symmetry",
      "linear-fraction":"rational-line-domain-range",reflect:"rational-reflection-x-axis",compose:"rational-composition-affine-domain",
    },
    radical:{
      simplify:"a-radical-simplify a-radical-extract-square a-radical-like-terms",rationalize:"a-radical-rationalize radical-conjugate-coefficient",
      domain:"a-radical-domain radical-parameter-domain radical-two-root-domain","expr-domain":"radical-denominator-open-boundary",
      endpoint:"a-radical-endpoint",range:"a-radical-range radical-no-intercept radical-inequality-output radical-graph-reflection-range",
      value:"a-radical-value a-radical-boundary-value radical-context-threshold",graph:"a-radical-graph radical-match-graph a-radical-x-direction",
      "endpoint-fit":"radical-point-parameter","linear-root":"radical-two-values",point:"radical-root-zero radical-y-intercept-parameter",
      reflect:"radical-reflection-graph",translate:"radical-translate-endpoint",extrema:"radical-restricted-range",
      inverse:"radical-inverse-value radical-inverse-domain radical-inverse-graph-match",intersections:"radical-line-extraneous radical-line-two-intersections radical-two-graphs-intersection",
      compose:"radical-affine-compose-domain",
    },
  };
  const aliases=Object.fromEntries(Object.entries(previous).flatMap(([unit,goals])=>Object.entries(goals)
    .flatMap(([goal,ids])=>ids.split(" ").map(id=>[id,unit+"-goal-"+goal]))));
  for(const [id,target] of Object.entries(aliases))aliases[id]=grouped.get(target)?.id??target;
  for(const [id,entry] of grouped)aliases[id]=entry.id;
  ForgeFunctionCurriculum = globalThis.ForgeFunctionCurriculum = Object.freeze({units:Object.keys(units),concepts,entries,aliases});
})();


;

/* function-relations.js */
(() => {
  "use strict";
  const {rand,pick,shift,term,m}=ForgeTopics;
  const uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const list=xs=>"\\{"+xs.join(",")+"\\}";
  const affine=(a,b)=>a?shift(term(a,"x"),-b):String(b);
  const finite=(xs,ys,codomain=uniq(ys))=>({kind:"table",xs,ys,codomain});
  const tableValue=(f,x)=>f.ys[f.xs.indexOf(x)];
  const slope=f=>f.a*f.s;
  const interval=(start,end,startClosed=true,endClosed=true)=>({start,end,startClosed:start===null?false:startClosed,endClosed:end===null?false:endClosed});
  const half=(n,right)=>right?[interval(n,null)]:[interval(null,n)];
  const except=n=>[interval(null,n,false,false),interval(n,null,false,false)];
  const includes=(bounds,x)=>bounds.some(i=>(i.start===null||x>i.start||x===i.start&&i.startClosed)&&(i.end===null||x<i.end||x===i.end&&i.endClosed));
  function domain(f){
    if(f.kind==="table")return f.xs;
    if(f.kind==="nested")return f.domain;
    if(f.kind==="rational")return except(f.h);
    if(f.kind==="radical")return half(f.h,f.s>0);
    if(f.kind==="quadratic")return half(f.h,f.s>0);
    return [interval(null,null)];
  }
  function range(f){
    if(f.kind==="table")return uniq(f.ys);
    if(f.kind==="nested")return f.range;
    if(f.kind==="rational")return except(f.k);
    if(f.kind==="radical")return half(f.k,f.a>0);
    if(f.kind==="quadratic")return half(f.k,f.a>0);
    return [interval(null,null)];
  }
  function value(f,x){
    if(f.kind==="table")return tableValue(f,x);
    if(!includes(domain(f),x))return undefined;
    if(f.kind==="nested")return value(f.outer,value(f.inner,x));
    if(f.kind==="rational")return f.a/(x-f.h)+f.k;
    if(f.kind==="radical")return f.a*Math.sqrt(f.s*(x-f.h))+f.k;
    if(f.kind==="quadratic")return f.a*(x-f.h)**2+f.k;
    if(f.kind==="piece")return x<f.h?affineValue(f.left,x):affineValue(f.right,x);
    return affineValue(f,x);
  }
  const affineValue=(f,x)=>f.a*x+f.k;
  const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8;
  function rule(f){
    const x=shift("x",f.h);
    if(f.kind==="rational")return shift("\\frac{"+f.a+"}{"+x+"}",-f.k);
    if(f.kind==="radical")return shift((f.a===1?"":f.a===-1?"-":f.a)+"\\sqrt{"+affine(f.s,-f.s*f.h)+"}",-f.k);
    if(f.kind==="quadratic")return shift((f.a===1?"":f.a===-1?"-":f.a)+"("+x+")^2",-f.k);
    if(f.kind==="piece")return "\\begin{cases}"+affine(f.left.a,f.left.k)+"&x<"+f.h+"\\\\ "+affine(f.right.a,f.right.k)+"&x\\ge "+f.h+"\\end{cases}";
    if(f.kind==="nested")return rule(f.outer).replace(/x/g,()=> "("+rule(f.inner)+")");
    if(f.kind==="table")return list(f.xs.map((n,i)=>"("+n+","+f.ys[i]+")"));
    return affine(f.a,f.k);
  }
  function intervalText(bounds){
    if(bounds.length===2&&bounds[0].end===bounds[1].start)return m(bounds[0].end)+"을 제외한 모든 실수";
    return bounds.map(({start,end,startClosed,endClosed})=>{
      if(start===null&&end===null)return "모든 실수";
      return m((start===null?"":start+(startClosed?"\\le ":"<"))+"x"+(end===null?"":(endClosed?"\\le ":"<")+end))+"인 실수";
    }).join(" 또는 ");
  }
  function compose(f,g){
    if(f.kind==="table"&&g.kind==="table"){
      const ys=g.ys.map(y=>tableValue(f,y));
      return ys.includes(undefined)?null:finite(g.xs,ys,f.codomain);
    }
    if(f.kind==="rational"&&g.kind==="rational"){
      const gap=g.k-f.h;
      if(!gap)return {kind:"nested",outer:f,inner:g,domain:except(g.h),range:except(f.k)};
      const pole=g.h-g.a/gap, omitted=f.k+f.a/gap;
      const omit=(a,b)=>{
        const [lo,hi]=[a,b].sort((x,y)=>x-y);
        return [interval(null,lo,false,false),interval(lo,hi,false,false),interval(hi,null,false,false)];
      };
      return {kind:"nested",outer:f,inner:g,domain:omit(g.h,pole),range:omit(f.k,omitted)};
    }
    if(f.kind==="radical"&&g.kind==="radical"&&f.s===1&&g.s===1&&g.a>0&&g.k<=f.h){
      const lower=g.h+((f.h-g.k)/g.a)**2;
      return {kind:"nested",outer:f,inner:g,domain:half(lower,true),range:half(f.k,f.a>0)};
    }
    if(g.kind==="affine"){
      if(!g.a)return null;
      if(f.kind==="rational")return {...f,a:f.a/g.a,h:(f.h-g.k)/g.a};
      if(f.kind==="radical")return {...f,s:f.s*g.a,h:(f.h-g.k)/g.a};
      if(f.kind==="affine")return {kind:"affine",a:f.a*g.a,k:f.a*g.k+f.k};
      if(f.kind==="piece"){
        if(g.a<=0)return null;
        return {...f,h:(f.h-g.k)/g.a,left:compose(f.left,g),right:compose(f.right,g)};
      }
    }
    if(f.kind==="affine"&&["radical","rational"].includes(g.kind))return {...g,a:f.a*g.a,k:f.a*g.k+f.k};
    return null;
  }
  function inverse(f){
    if(f.kind==="table"){
      if(uniq(f.ys).length!==f.xs.length||!same(uniq(f.ys),f.codomain))return null;
      return finite(f.codomain,f.codomain.map(y=>f.xs[f.ys.indexOf(y)]),f.xs);
    }
    if(f.kind==="rational")return {...f,h:f.k,k:f.h};
    if(f.kind==="affine")return {kind:"affine",a:1/f.a,k:-f.k/f.a};
    if(f.kind==="radical")return {kind:"quadratic",h:f.k,k:f.h,a:1/(f.s*f.a**2),s:Math.sign(f.a)};
    if(f.kind==="quadratic")return {kind:"radical",h:f.k,k:f.h,a:f.s,s:1/f.a};
    return null;
  }
  function translate(f,[u,v]){return {...f,h:f.h+u,k:f.k+v};}
  function reflect(f,axis){
    if(axis==="y")return {...f,h:-f.h,...(f.kind==="radical"?{s:-f.s}:{a:-f.a})};
    return {...f,k:-f.k,a:-f.a};
  }
  function points(f){
    if(f.kind==="table")return f.xs.map((x,i)=>[x,f.ys[i]]);
    const inputs=f.kind==="rational"?[-3,-2,-1,1,2,3].map(d=>f.h+d):
      f.kind==="radical"?[0,1,4,9,16].map(d=>f.h+d/f.s):[-2,-1,0,1,2,3];
    return inputs.map(x=>[x,value(f,x)]).filter(([x,y])=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&Math.abs(x)<=30&&Math.abs(y)<=60);
  }
  function verificationPoints(f){
    if(f.kind==="table")return points(f);
    if(f.kind==="nested"){
      const inputs=domain(f).flatMap(i=>i.start!==null?[i.start,i.start+.25,i.start+1,i.start+4,i.start+16,i.start+81]:[i.end-1,i.end-3]);
      return uniq(inputs).filter(x=>includes(domain(f),x)).map(x=>[x,value(f,x)]);
    }
    const xs=f.kind==="rational"?[-3,-1,-.5,.5,1,2].map(d=>f.h+d):
      ["radical","quadratic"].includes(f.kind)?[0,.5,1,2,4].map(d=>f.h+d*Math.sign(f.s)):[-3,-1,.5,2,5];
    return xs.map(x=>[x,value(f,x)]);
  }
  const validTable=(pairs,xs,ys)=>xs.every(x=>new Set(pairs.filter(pair=>pair[0]===x).map(pair=>pair[1])).size===1)&&
    pairs.every(([x,y])=>xs.includes(x)&&ys.includes(y));
  const product=ns=>ns.reduce((a,b)=>a*b,1);
  function count(mode,n,k){
    if(mode==="all")return k**n;
    if(mode==="bijections"&&n!==k||n>k)return 0;
    return product(Array.from({length:n},(_,i)=>k-i));
  }
  function fit(kind,[h,k],[x,y],s=1){
    if(kind==="rational"){
      if(x===h||y===k)return null;
      return {kind,h,k,a:(x-h)*(y-k)};
    }
    const radicand=s*(x-h);
    if(radicand<=0||y===k)return null;
    return {kind,h,k,s,a:(y-k)/Math.sqrt(radicand)};
  }
  function quadratic(a,b,c){
    const d=b*b-4*a*c;
    if(!a)return b?[-c/b]:[];
    if(d<0)return [];
    return uniq([(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)]);
  }
  function lineIntersections(f,line){
    const {a:p,k:q}=line,{a,h,k,s}=f;
    const xs=f.kind==="rational"?quadratic(p,q-k-p*h,-h*(q-k)-a):
      quadratic(p*p,2*p*(q-k)-a*a*s,(q-k)**2+a*a*s*h);
    return xs.filter(x=>close(value(f,x),value(line,x))).map(x=>[x,value(line,x)]);
  }
  const extremum=(f,[a,b])=>a<b&&[a,b].every(x=>includes(domain(f),x))&&!(f.kind==="rational"&&a<f.h&&f.h<b)
    ?[value(f,a),value(f,b)].sort((x,y)=>x-y):null;

  const operations={
    composition:{inputs:["function","function"],output:"function",run:compose,
      verify:(out,[f,g])=>out.kind==="table"?same(out.xs,g.xs)&&out.ys.every((y,i)=>y===tableValue(f,tableValue(g,g.xs[i]))):
        verificationPoints(out).every(([x,y])=>close(value(f,value(g,x)),y))},
    inverse:{inputs:["function"],output:"function",run:inverse,
      verify:(out,[f])=>same(domain(out),range(f))&&same(range(out),domain(f))&&verificationPoints(f).every(([x,y])=>close(value(out,y),x))},
    translation:{inputs:["function","point"],output:"function",run:translate,
      verify:(out,[f,[u,v]])=>verificationPoints(f).every(([x,y])=>close(value(out,x+u),y+v))},
    reflection:{inputs:["function","axis"],output:"function",run:reflect,
      verify:(out,[f,axis])=>verificationPoints(f).every(([x,y])=>close(value(out,axis==="y"?-x:x),axis==="x"?-y:y))},
    fit:{inputs:["kind","point","point","direction"],output:"function",run:fit,
      verify:(out,[kind,[h,k],[x,y],s])=>out.kind===kind&&out.h===h&&out.k===k&&(kind==="rational"||out.s===s)&&close(value(out,x),y)},
    intersections:{inputs:["function","line"],output:"points",run:lineIntersections,
      verify:(out,[f,line])=>{
        if(!out.every(([x,y])=>close(value(f,x),y)&&close(value(line,x),y)))return false;
        // Substitute y = ax + b using the shifted input t = x - h.
        const {a,h,k,s}=f,p=line.a,q=value(line,h)-k;
        const candidates=f.kind==="rational"?quadratic(p,q,-a):
          quadratic(p*p,2*p*q-a*a*s,q*q).filter(t=>s*t>=0&&Math.sign(p*t+q)===Math.sign(a)||s*t>=0&&close(p*t+q,0));
        return candidates.filter(t=>close(value(f,t+h),value(line,t+h))).length===out.length;
      }},
    extrema:{inputs:["function","interval"],output:"pair",run:extremum,
      verify:(out,[f,[a,b]])=>{
        if(!out||!out.every(Number.isFinite))return false;
        const increasing=f.kind==="rational"?f.a<0:slope(f)>0;
        const lo=increasing?a:b,hi=increasing?b:a;
        return close(out[0],value(f,lo))&&close(out[1],value(f,hi));
      }},
    domain:{inputs:["function"],output:"set",run:domain},
    range:{inputs:["function"],output:"set",run:range},
    value:{inputs:["function","scalar"],output:"scalar",run:value},
    graph:{inputs:["function"],output:"points",run:points},
  };
  function apply(op,...inputs){
    const relation=operations[op], output=relation.run(...inputs);
    if(output===null||output===undefined||relation.verify&&!relation.verify(output,inputs))throw new RangeError("함수 관계를 구성할 수 없습니다.");
    return output;
  }
  function sample(kind,rng){
    const nonzero=()=>pick(rng,[-3,-2,-1,1,2,3]);
    const h=rand(rng,-4,4),k=rand(rng,-4,4);
    if(kind==="table"){
      const n=rand(rng,3,5),xs=Array.from({length:n},(_,i)=>h+i);
      const codomain=xs.map((_,i)=>k+2*i);
      const ys=codomain.slice();
      for(let i=ys.length-1;i>0;i--){const j=rand(rng,0,i);[ys[i],ys[j]]=[ys[j],ys[i]];}
      return finite(xs,ys,codomain);
    }
    if(kind==="rational")return {kind,a:pick(rng,[-12,-6,-4,4,6,12]),h,k};
    if(kind==="radical")return {kind,a:pick(rng,[-2,-1,1,2]),s:pick(rng,[-1,1]),h,k};
    if(kind==="quadratic")return {kind,a:pick(rng,[-1,1]),s:pick(rng,[-1,1]),h,k};
    if(kind==="piece")return {kind,h,left:{kind:"affine",a:nonzero(),k},right:{kind:"affine",a:nonzero(),k:k+2}};
    return {kind:"affine",a:nonzero(),k};
  }
  ForgeFunctionRelations = globalThis.ForgeFunctionRelations = Object.freeze({operations,apply,finite,domain,range,value,rule,points,validTable,count,sample,intervalText,
    interval,except,includes,uniq,same,list,close,affine});
})();


;

/* function-bounds.js */
(() => {
  "use strict";
  const {m,pick,rand,shift,term,set,scalar}=ForgeTopics;
  const {uniq,same,list,finite,range}=ForgeFunctionRelations;
  const notation=xs=>m(list(xs));
  const setOf=(name,xs)=>m(name+"="+list(xs));
  const integers=(lo,hi)=>Array.from({length:hi-lo+1},(_,i)=>lo+i);
  const targets={
    domain:["정의역","domain"],codomain:["공역","codomain"],range:["치역","range"],
  };
  function readSet(ctx,target,xs,from,level,rng){
    const [label,op]=targets[target];
    const count=level!=="A"&&rng()<.35;
    const answer=count?scalar(xs.length):set(xs);
    ctx.step(count?op+"-count":op,count?label+"의 원소 개수":label+" 결정",answer.text,from);
    return {answer,query:count?label+"의 원소 개수를 구하시오.":label+"을 구하시오."};
  }
  function quadratic(rng){
    const h=rand(rng,-3,3), a=pick(rng,[-2,-1,1,2]), b=rand(rng,-5,5);
    return {h,a,b,rule:shift(term(a,(h?"("+shift("x",h)+")":"x")+"^2"),-b),eval:x=>a*(x-h)**2+b};
  }
  function domainText(lo,hi){
    return m(lo+"\\le x\\le "+hi)+"인 정수";
  }
  function basic(goal,level,rng,ctx,format){
    const graph=goal==="graph-bounds";
    const f=quadratic(rng),lo=f.h-rand(rng,1,graph?2:3),hi=f.h+rand(rng,1,graph?2:3);
    const xs=integers(lo,hi), image=uniq(xs.map(f.eval));
    const target=goal==="graph-bounds"?pick(rng,["domain","range"]):goal;
    const codomain=uniq([...image,image.at(-1)+1,image[0]-1]);
    const X=setOf("X",xs),Y=setOf("Y",codomain);
    if(level==="A"){
      const src=ctx.source("함수의 조건",graph?"함수 "+m("f")+"의 그래프가 아래와 같다.":target==="range"?
        "정의역이 "+notation(xs)+"인 함수 "+m("f(x)="+f.rule)+"가 있다.":
        "두 집합 "+X+", "+Y+"에 대하여 함수 "+m("f:X\\to Y")+"를 "+m("f(x)="+f.rule)+"로 정한다.");
      const {answer,query}=readSet(ctx,target,{domain:xs,range:image,codomain}[target],[src],level,rng);
      return ctx.finish(query,answer,[target==="range"?"실제로 나오는 함숫값을 모으면 "+answer.text+"이다.":
        (target==="domain"?"입력으로 쓰이는 값의 집합":"출력으로 허용된 집합")+"은 "+answer.text+"이다."],format,
        graph?{plot:{kind:"function-points",points:xs.map(x=>[x,f.eval(x)])}}:undefined);
    }
    const upper=pick(rng,image.slice(0,-1)), lower=pick(rng,image.slice(1));
    const side=rng()<.5, cutoff=side?upper:lower, compare=y=>side?y<=cutoff:y>=cutoff;
    const bounded=xs.filter(x=>compare(f.eval(x))), subset=uniq(bounded.map(f.eval));
    const source=ctx.source(graph?"함수의 그래프":"정수 정의역과 함수식",graph?"함수 "+m("f")+"의 그래프가 아래와 같다.":"함수 "+m("f(x)="+f.rule)+"의 정의역은 "+domainText(lo,hi)+"이다.");
    const inequality=m("f(x)"+(side?"\\le ":"\\ge ")+cutoff);
    const fact=ctx.source("허용하는 함숫값 조건",inequality,false);
    if(target==="codomain"){
      const extras=rand(rng,1,3);
      const candidates=uniq([...image,...integers(image.at(-1)+1,image.at(-1)+extras)]);
      ctx.publish("공역 "+m("Y")+"는 "+notation(candidates)+"의 부분집합이다.");
      const count=rng()<.5;
      const resolved=ctx.step("range","서로 같은 출력을 묶어 치역 복원",notation(image),[source]);
      const answer=count?scalar(2**(candidates.length-image.length)):set(image);
      ctx.step(count?"codomain-count":"codomain-minimum","치역을 포함하는 공역 결정",answer.text,[resolved,ctx.source("공역의 후보 범위",notation(candidates),false)]);
      return ctx.finish(count?"가능한 공역 "+m("Y")+"의 개수를 구하시오.":"원소의 개수가 가장 적은 공역 "+m("Y")+"를 구하시오.",answer,
        ["정의역에서 실제로 나오는 값은 "+notation(image)+"이다.","공역에는 이 값이 모두 포함되어야 한다."+ (count?" 나머지 원소는 각각 넣거나 넣지 않을 수 있다.":" 가장 작은 공역은 치역과 같다.")],format);
    }
    const allowed=ctx.step(side?"upper-bound":"lower-bound","출력 조건을 만족하는 정수 입력 선별",notation(bounded),[source,fact]);
    const {answer,query}=readSet(ctx,target,target==="domain"?bounded:subset,[allowed],level,rng);
    return ctx.finish(inequality+"인 입력만 남겼을 때, 새 함수의 "+query,answer,
      [inequality+"인 정수 입력은 "+notation(bounded)+"이다.",target==="range"?"남은 입력에서 나오는 출력은 "+notation(subset)+"이다.":"이 입력들의 집합이 새 정의역이다."],format,
      graph?{plot:{kind:"function-points",points:xs.map(x=>[x,f.eval(x)])}}:undefined);
  }

  // Start with the observable fibres of a quadratic on a compact integer
  // interval. Link a domain restriction, a range/codomain condition and an
  // inverse or counting goal. The exhaustive verifier constructs the actual
  // restrictions independently of the fibre-count formula.
  function restrictions(rng,depth,ctx,format,ask){
    const f=quadratic(rng);
    const left=rand(rng,1,3),right=rand(rng,2,4),lo=f.h-left,hi=f.h+right;
    const X=integers(lo,hi);
    const image=uniq(X.map(f.eval));
    const fibres=image.map(y=>X.filter(x=>f.eval(x)===y));
    const publicRange=ask!=="codomain"&&depth>=4&&rng()<.65;
    const omitted=publicRange?pick(rng,image):null;
    const kept=image.filter(y=>y!==omitted);
    // A specified image may omit a whole fibre, but must retain a real choice.
    if(ask==="codomain")return codomainProblem(rng,depth,ctx,format,f,X,image,fibres);
    if(ask==="range"&&!publicRange)return rangeProblem(rng,depth,ctx,format,f,X);
    const required=fibres.filter((_,i)=>kept.includes(image[i]));
    const fork=required.filter(xs=>xs.length===2);
    if(!fork.length)throw new RangeError("서로 다른 정의역이 필요합니다.");
    const source=ctx.source("함수식과 입력 범위",m("X")+"는 "+domainText(lo,hi)+"의 집합이다. "+m("X")+"에서 "+m("f(x)="+f.rule)+"이다.");
    const targetRange=publicRange?ctx.source("남겨야 할 치역",setOf("R",kept),false):null;
    const recover=ctx.step("fibres","같은 함숫값을 갖는 입력끼리 묶기",
      image.map((y,i)=>m(y)+": "+notation(fibres[i])).join(", "),[source]);
    const requirement=ctx.step("bijection","일대일대응에서 각 출력의 원상을 하나씩 선택",
      m(required.map(xs=>xs.length).join("\\cdot ")),[recover,...(publicRange?[targetRange]:[])]);
    const subsets=[];
    for(let mask=1;mask<2**X.length;mask++){
      const D=X.filter((_,i)=>mask&2**i);
      const actual=range(finite(D,D.map(f.eval)));
      if(D.length===actual.length&&same(actual,kept))subsets.push(D);
    }
    if(subsets.length!==required.reduce((n,xs)=>n*xs.length,1))throw new RangeError("정의역 후보 검산 실패");
    ctx.publish(m("D")+"는 "+m("X")+"의 부분집합이다. "+(publicRange?setOf("Y",kept)+"에 대하여 "+m("f:D\\to Y")+"가 일대일대응이다.":
      "정의역을 "+m("X")+"에서 "+m("D")+"로 줄여도 치역이 그대로이고 일대일함수가 된다."));
    let answer,question,final=requirement;
    const explanation=["같은 함숫값을 갖는 입력끼리 묶으면 "+required.map(notation).join(", ")+"이다.",
      "같은 출력이 중복되지 않게 각 집합에서 하나씩 골라야 한다."];
    if(ask==="range"){
      const candidates=uniq(subsets.flat());
      final=depth>=4?ctx.step("inverse","역함수에서 원래 정의역과 치역 교환",notation(candidates),[requirement]):requirement;
      if(depth===5)final=ctx.step("union","가능한 역함수의 치역을 합침",notation(candidates),[final]);
      const count=rng()<.5;
      answer=count?scalar(candidates.length):set(candidates);
      question="가능한 역함수들의 치역에 한 번이라도 속하는 원소"+(count?"의 개수를":"를 모두")+" 구하시오.";
      explanation.push("역함수의 치역은 원래 함수의 정의역이다. 각 집합의 원소를 한 번씩 선택할 수 있다.");
    }else{
      const constrained=depth>=4&&rng()<.6;
      const anchor=constrained?pick(rng,pick(rng,fork)):null;
      const chosen=constrained?subsets.filter(D=>D.includes(anchor)):subsets;
      const fact=constrained?ctx.source("포함해야 할 입력",m(anchor+"\\in D"),false):null;
      if(constrained)ctx.publish(m(anchor)+"는 "+m("D")+"의 원소이다.");
      if(depth>=4)final=ctx.step(constrained?"domain-membership":"independent-choices",constrained?"지정한 입력과 함숫값이 같은 입력 제외":"각 출력에서 독립적으로 원상 선택",m(chosen.length),[requirement,...(fact?[fact]:[])]);
      if(depth===5){
        const largest=rng()<.5;
        const best=required.map(xs=>xs.includes(anchor)?anchor:xs.at(largest?-1:0));
        const sum=best.reduce((n,x)=>n+x,0);
        if(sum!==(largest?Math.max:Math.min)(...chosen.map(xs=>xs.reduce((n,x)=>n+x,0))))throw new RangeError("극값 검산 실패");
        final=ctx.step(largest?"maximize-domain":"minimize-domain","각 출력에 대해 허용된 가장 "+(largest?"큰":"작은")+" 입력 선택",notation(best),[final]);
        answer=scalar(sum);
        question=m("D")+"의 원소의 합의 "+(largest?"최댓값":"최솟값")+"을 구하시오.";
        explanation.push("각 함숫값에 대응하는 후보 중 허용된 가장 "+(largest?"큰":"작은")+" 입력을 고른다.");
      }else{
        answer=scalar(chosen.length);
        question="가능한 정의역 "+m("D")+"의 개수를 구하시오.";
        if(constrained)explanation.push(m(anchor)+"를 포함해야 하므로 같은 함숫값을 갖는 다른 입력은 고를 수 없다.");
      }
    }
    ctx.step(ask,"요구한 집합 또는 값 결정",answer.text,[final]);
    return ctx.finish(question,answer,[...explanation,"따라서 답은 "+(answer.kind==="scalar"?m(answer.value):answer.text)+"이다."],format);
  }
  function codomainProblem(rng,depth,ctx,format,f,X,image,fibres){
    const chosen=pick(rng,fibres.filter(xs=>xs.length===2));
    if(!chosen)throw new RangeError("중복된 출력이 필요합니다.");
    const threshold=pick(rng,image.slice(1,-1));
    const upper=rng()<.5;
    const relation=upper?"\\le ": "\\ge ";
    const eligible=y=>upper?y<=threshold:y>=threshold;
    const available=image.filter(eligible);
    const required=f.eval(chosen[0]);
    if(!eligible(required)||available.length<3)throw new RangeError("공역 선택에 필요한 출력이 부족합니다.");
    const size=depth===3?2:rand(rng,2,available.length-1);
    const anchorInput=pick(rng,chosen);
    const eligibleDomains=[];
    for(let mask=1;mask<2**X.length;mask++){
      const D=X.filter((_,i)=>mask&2**i);
      if(D.length!==size||!D.includes(anchorInput))continue;
      const ys=uniq(D.map(f.eval));
      if(ys.length===size&&ys.every(eligible))eligibleDomains.push(ys);
    }
    const options=[...new Map(eligibleDomains.map(ys=>[ys.join(","),ys])).values()];
    const choose=(n,k)=>k===0?1:k>n?0:choose(n-1,k)+choose(n-1,k-1);
    if(options.length!==choose(available.length-1,size-1))throw new RangeError("공역의 개수 검산 실패");
    const source=ctx.source("함수와 정의역 후보",m("f(x)="+f.rule)+"이고 "+m("X")+"는 "+domainText(X[0],X.at(-1))+"의 집합이다.");
    ctx.publish(m("D")+"는 "+m("X")+"의 원소 중 "+m(anchorInput)+"을 포함하는 "+m(size)+"개로 이루어진 집합이다.");
    ctx.publish(m("f:D\\to Y")+"가 일대일대응이고 "+m("Y")+"의 모든 원소 "+m("y")+"가 "+m("y"+relation+threshold)+"를 만족한다.");
    const fact=ctx.source("공역의 제한",m("y"+relation+threshold),false);
    const member=ctx.source("정의역의 필수 원소",m(anchorInput+"\\in D"),false);
    const restrict=ctx.step("output-bound","공역에 들어갈 수 있는 함숫값 선별",notation(available),[source,fact]);
    const anchor=ctx.step("forced-image","지정한 입력이 만드는 공역의 필수 원소",m(required),[restrict,member]);
    const optional=available.filter(y=>y!==required);
    const branch=depth>=4?ctx.step("codomain-choices","필수 원소를 제외하고 서로 다른 출력을 선택",notation(optional),[anchor]):anchor;
    let answer,question;
    const extreme=depth===5;
    const high=rng()<.5;
    if(extreme){
      const picked=high?optional.slice(1-size):optional.slice(0,size-1);
      const sum=required+picked.reduce((a,b)=>a+b,0);
      const checked=(high?Math.max:Math.min)(...options.map(ys=>ys.reduce((a,b)=>a+b,0)));
      if(sum!==checked)throw new RangeError("공역의 원소 합 검산 실패");
      answer=scalar(sum);
      question="공역 "+m("Y")+"의 원소의 합의 "+(high?"최댓값":"최솟값")+"을 구하시오.";
      const best=ctx.step("order-codomain","필수 원소와 함께 극값을 주는 출력 선택",notation(uniq([required,...picked])),[branch]);
      ctx.step("sum-codomain","공역 원소의 합 결정",m(sum),[best]);
    }else{
      answer=scalar(options.length);
      question="가능한 공역 "+m("Y")+"의 개수를 구하시오.";
      ctx.step("count-codomain","서로 다른 공역의 개수",m(answer.value),[branch]);
    }
    return ctx.finish(question,answer,[
      "조건을 만족하는 함숫값은 "+notation(available)+"이다. 이 중 "+m(required)+"은 반드시 공역에 들어간다.",
      "다른 함숫값마다 원래 입력을 하나씩 고를 수 있으므로, 남은 "+m(size-1)+"개의 출력을 고르면 공역이 정해진다.",
      extreme?"원소의 합이 "+(high?"가장 크도록":"가장 작도록")+" 고르면 "+m(answer.value)+"이다.":"가능한 공역은 "+m(answer.value)+"개이다.",
    ],format);
  }
  function rangeProblem(rng,depth,ctx,format,f,X){
    const gA=pick(rng,[-2,-1,1,2]),gB=rand(rng,-3,3);
    const g=x=>gA*x+gB;
    const lo=X[0]-2, hi=X.at(-1)+2;
    const domain=integers(lo,hi).filter(x=>X.includes(g(x)));
    const outputs=uniq(domain.map(x=>f.eval(g(x))));
    const direct=X.map(t=>(t-gB)/gA).filter(x=>Number.isInteger(x)&&lo<=x&&x<=hi).sort((a,b)=>a-b);
    if(outputs.length<2||domain.length===outputs.length||!same(direct,domain))throw new RangeError("서로 다른 입력에서 같은 함숫값이 나와야 합니다.");
    const source=ctx.source("합성함수에 들어갈 두 함수","함수 "+m("f(x)="+f.rule)+"의 정의역은 "+domainText(X[0],X.at(-1))+"이다. "+m("g(x)="+ForgeFunctionRelations.affine(gA,gB))+"이다.");
    const fact=ctx.source("입력 범위",domainText(lo,hi),false);
    const d=ctx.step("composition-domain","안쪽 함수값이 바깥 정의역에 들어가는 입력",notation(domain),[source,fact]);
    const image=ctx.step("composition-image","정의되는 합성함수의 서로 다른 출력",notation(outputs),[d]);
    const h=m("h(x)=f(g(x))");
    const base=domainText(lo,hi)+" 중 "+m("f(g(x))")+"가 정의되는 값에서 "+h+"라 하자.";
    if(depth===3){
      const {answer,query}=readSet(ctx,"range",outputs,[image],"B",rng);
      return ctx.finish(base+" 함수 "+m("h")+"의 "+query,answer,[
        m(X[0]+"\\le g(x)\\le "+X.at(-1))+"을 만족하는 입력은 "+notation(domain)+"이다.",
        "합성함수의 값 중 중복을 제거하면 "+notation(outputs)+"이다.",
      ],format);
    }
    const threshold=pick(rng,outputs.slice(1));
    const possible=outputs.filter(y=>y<threshold);
    const limit=ctx.source("공개 출력 조건",m("h(x)<"+threshold),false);
    const restricted=ctx.step("range-cut","출력 조건에 맞는 치역",notation(possible),[image,limit]);
    const candidates=domain.filter(x=>f.eval(g(x))<threshold);
    let answer,query;
    if(depth===5){
      const multiplicity=possible.map(y=>candidates.filter(x=>f.eval(g(x))===y).length);
      const strongest=Math.max(...multiplicity);
      if(strongest<2||!multiplicity.includes(1))throw new RangeError("원상의 개수를 비교할 수 없습니다.");
      const ys=possible.filter((_,i)=>multiplicity[i]===strongest);
      const witnesses=ctx.step("compare-fibres","치역 원소마다 원상의 개수 비교",notation(ys),[restricted]);
      answer=rng()<.5?set(ys):scalar(strongest);
      query=answer.kind==="set"?"원래 입력의 개수가 가장 많은 함숫값을 모두 구하시오.":"한 함숫값에 대응하는 입력의 최대 개수를 구하시오.";
      ctx.step("range-multiplicity","치역에서 가장 많은 원상을 갖는 값 결정",answer.text,[witnesses]);
    }else{
      const result=readSet(ctx,"range",possible,[restricted],"B",rng);
      answer=result.answer;
      query="제한한 함수의 "+result.query;
    }
    return ctx.finish(base+" 이 중 "+m("h(x)<"+threshold)+"인 입력만 남긴다. "+query,answer,[
      "합성이 가능한 입력은 "+notation(domain)+"이다. 출력 조건까지 만족하는 입력은 "+notation(candidates)+"이다.",
      "남은 입력에서 서로 다른 출력은 "+notation(possible)+"이다."+ (depth===5?" 각 출력을 만드는 입력의 개수를 비교한다.":""),
      "따라서 답은 "+(answer.kind==="scalar"?m(answer.value):answer.text)+"이다.",
    ],format);
  }
  function generate(goal,level,rng,depth,ctx,format){
    if(level==="C")return restrictions(rng,depth,ctx,format,goal);
    if(["domain","range","codomain","graph-bounds"].includes(goal))return basic(goal,level,rng,ctx,format);
    return null;
  }
  ForgeFunctionBounds = globalThis.ForgeFunctionBounds = Object.freeze({generate});
})();


;

/* function-symbolic.js */
(() => {
  "use strict";
  const {m,pick,rand,scalar,point,choice}=ForgeTopics;
  const R=ForgeFunctionRelations;
  const inverseGoals=new Set(["inverse","inverse-rule","inverse-graph","symmetry","inverse-bounds","inverse-compose","cancel","double","invertible"]);
  const composeGoals=new Set(["compose","compose-value","compose-bounds","compose-id","compatible","recover","iterate","commute","associate"]);
  const supports=goal=>inverseGoals.has(goal)||composeGoals.has(goal);
  const nonzero=rng=>pick(rng,[-3,-2,-1,1,2,3]);
  const fx=(name,x)=>name+"("+x+")";
  const line=(a,k)=>({kind:"affine",a,k});
  function generate(goal,level,rng,ctx,format){
    if(!supports(goal)||level==="A"&&!["inverse-rule","compose","compose-value","compose-id","recover"].includes(goal))return null;
    const a=pick(rng,[-3,-2,2,3]), b=nonzero(rng), f=line(a,b), x=rand(rng,-5,5), y=R.value(f,x);
    const A=level==="A";
    const finish=(question,answer,solution)=>ctx.finish(question,answer,solution,format);
    const source=(name,g)=>ctx.source("일차함수의 식",m(fx(name,"x")+"="+R.rule(g))+"이다.");
    const mode=rng()<.5;
    if(["invertible","inverse-bounds","compatible","compose-bounds"].includes(goal)){
      const h=rand(rng,-3,3), k=nonzero(rng), sign=pick(rng,[-1,1]);
      const width=rand(rng,2,4), start=h-width-1, end=h+width+1;
      const parabola=R.affine(1,-h), rule=(h?"("+parabola+")":"x")+"^2"+(k<0?k:"+"+k);
      const interval=(lo,hi)=>m(lo+"\\le x\\le "+hi);
      if(goal==="invertible"||goal==="inverse-bounds"){
        const rangeEnd=k+width**2;
        const side=sign>0?[h,h+width]:[h-width,h];
        const right=sign>0?interval(h,end):interval(start,h);
        const startFact=ctx.source("제한된 이차함수","함수 "+m("f(x)="+rule)+"의 정의역은 "+right+"인 실수의 집합이다.");
        const condition=ctx.source("제한된 출력",m(k+"\\le f(x)\\le "+rangeEnd),false);
        const cut=ctx.step("preimage","정의역 방향과 출력 범위로 남는 입력 결정",interval(...side),[startFact,condition]);
        const swapped=goal==="inverse-bounds"&&mode;
        const values=swapped?side:[k,rangeEnd];
        const input=rangeEnd;
        const probe=goal==="invertible"&&mode;
        const answer=goal==="invertible"?(probe?scalar(h+sign*width):scalar(width)):{kind:"interval",value:[R.interval(...values)],text:R.intervalText([R.interval(...values)])};
        ctx.step(goal==="invertible"?(probe?"inverse-value":"domain-length"):swapped?"inverse-range":"inverse-domain","제한한 함수의 범위와 역함수 결정",answer.text,[cut]);
        return finish(m(k+"\\le f(x)\\le "+rangeEnd)+"인 입력으로 정의역을 제한하고 공역을 새 치역과 같게 한다. "+
          (goal==="invertible"?(probe?"제한한 함수의 역함수가 "+m(input)+"에서 갖는 값을 구하시오.":"제한한 함수의 정의역의 양 끝값의 차를 구하시오."):"역함수의 "+(swapped?"치역을":"정의역을")+" 구하시오."),
          answer,["남는 입력의 범위는 "+interval(...side)+"이고 치역은 "+interval(k,rangeEnd)+"인 실수이다.","역함수에서 정의역과 치역의 역할이 서로 바뀐다."]);
      }
      const g=line(sign,k), gId=source("g",g);
      const fId=ctx.source("바깥 함수의 정의역","함수 "+m("f(x)="+rule)+"의 정의역은 "+interval(start,end)+"인 실수이다.");
      const boundary=[(start-k)/sign,(end-k)/sign].sort((u,v)=>u-v);
      const d=ctx.step("composition-domain","안쪽 함숫값이 바깥 정의역에 속하는 범위",interval(...boundary),[gId,fId]);
      const rangeMax=Math.max((start-h)**2,(end-h)**2)+k;
      const askRange=goal==="compose-bounds"&&mode;
      const bounds=askRange?[k,rangeMax]:boundary;
      const answer={kind:"interval",value:[R.interval(...bounds)],text:R.intervalText([R.interval(...bounds)])};
      ctx.step(askRange?"composition-range":sign<0?"reverse-inequality":"domain","합성에서 실제로 허용되는 범위",answer.text,[d]);
      return finish(m("f(g(x))")+(askRange?"가 가질 수 있는 값의 범위를":"가 정의되는 실수의 범위를")+" 구하시오.",answer,
        [m(start+"\\le g(x)\\le "+end)+"를 풀면 "+interval(...boundary)+"이다.",
          ...(askRange?["이 범위에서 "+m("g(x)")+"는 "+interval(start,end)+"의 모든 값을 갖는다. 꼭짓점과 양 끝점에서 최솟값과 최댓값을 확인한다."]:[])]);
    }
    if(goal==="inverse-rule"||goal==="inverse"||goal==="inverse-graph"||goal==="symmetry"){
      const g=R.apply("inverse",f);
      const id=A?source("f",f):ctx.source("역함수의 계수 조건",m("f(x)=ax+b")+"인 일차함수 "+m("f")+"가 "+
        m(fx("f",x)+"="+y)+", "+m(fx("f^{-1}",y+a)+"="+(x+1))+"을 만족한다.");
      const known=A?id:ctx.step("inverse-pair","역함수 조건을 원래 함수의 두 점으로 변환",
        m(fx("f",x+1)+"="+(y+a)),[id]);
      const eq=A?known:ctx.step("fit-affine","두 점으로 일차함수 복원",m("f(x)="+R.rule(f)),[known]);
      const inverseRule=b=>(a<0?"-":"")+"\\frac{"+R.affine(1,-b)+"}{"+Math.abs(a)+"}";
      const inverseEquation=m("f^{-1}(x)="+inverseRule(b));
      const inv=ctx.step("inverse","입력과 출력을 바꾸어 역함수 복원",inverseEquation,[eq]);
      if(goal==="inverse-rule"&&format==="choice"&&rng()<.6){
        const answer=choice(rng,inverseEquation,[-2,-1,1].map(n=>m("f^{-1}(x)="+inverseRule(b+n))));
        ctx.step("inverse-rule","동치인 역함수식 선택",answer.text,[inv]);
        return finish("역함수 "+m("f^{-1}")+"의 식을 고르시오.",answer,
          [...(A?[]:["역함수의 조건을 원래 함수의 함숫값으로 바꾼다. 두 점을 이용하면 "+m("f(x)="+R.rule(f))+"이다."]),
            m("y="+R.rule(f))+"에서 입력과 출력을 바꾸어 정리하면 "+inverseEquation+"이다."]);
      }
      const z=x+pick(rng,[-3,-2,2,3]), output=R.value(f,z);
      if(!R.close(R.value(g,output),z))throw new RangeError("역함수 검산 실패");
      const graph=["inverse-graph","symmetry"].includes(goal)&&mode;
      const reverse=!A&&!graph&&!mode;
      const answer=graph?point([output,z]):scalar(reverse?output:z);
      ctx.step(graph?"reflection":reverse?"inverse-preimage":"value",graph?"직선 y=x에 대한 대칭으로 점 결정":reverse?"주어진 역함숫값에서 입력 복원":"새 입력의 역함숫값",answer.text,[inv]);
      return finish(graph?"역함수의 그래프에서 가로 좌표가 "+m(output)+"인 점의 좌표를 구하시오.":reverse?
        m("f^{-1}(x)="+z)+"를 만족시키는 "+m("x")+"의 값을 구하시오.":m(fx("f^{-1}",output))+"의 값을 구하시오.",answer,
        [...(A?[]:[m(fx("f^{-1}",y+a)+"="+(x+1))+"이므로 "+m(fx("f",x+1)+"="+(y+a))+"이다. 두 점을 이용하면 "+m("f(x)="+R.rule(f))+"이다."]),
          m(fx("f",z)+"="+output)+"이므로 "+m(fx("f^{-1}",output)+"="+z)+"이다."]);
    }
    if(goal==="iterate"){
      const t=nonzero(rng), power=rand(rng,4,9), reflection=mode;
      const fn=reflection?line(-1,t):line(1,t);
      const id=source("f",fn);
      const answer=scalar(reflection?(power%2?R.value(fn,x):x):x+power*t);
      const recurring=ctx.step(reflection?"cycle":"translation","두 번 합성한 함수에서 반복 규칙 발견",m("f(f(x))="+R.rule(R.apply("composition",fn,fn))),[id]);
      ctx.step("iterate","반복 횟수에 맞게 규칙 적용",m(answer.value),[recurring]);
      return finish(m("f")+"를 "+m(power)+"번 합성한 함수의 "+m(x)+"에서의 함숫값을 구하시오.",answer,
        [reflection?"두 번 합성하면 항등함수가 된다. 따라서 반복 횟수의 홀짝으로 결과가 정해진다.":"한 번 적용할 때마다 "+m(t)+"만큼 변한다."]);
    }
    if(goal==="compose-id"||goal==="cancel"||goal==="double"){
      const id=goal==="cancel"?ctx.source("역함수가 있는 함수","실수 전체에서 정의된 일대일대응 "+m("f")+"가 있다."):source("f",f);
      const identity=goal==="compose-id"?ctx.source("항등함수",m("I")+"는 항등함수이다."):null;
      const expr=goal==="cancel"?"f^{-1}(f(x))":goal==="double"?"(f^{-1})^{-1}(x)":"(f\\circ I)(x)";
      const label=goal==="cancel"?"원래 입력으로 돌아오는 합성":goal==="double"?"역함수를 두 번 취하면 원래 함수":"항등함수와의 합성";
      const simplify=ctx.step(goal,label,m(expr+"="+(goal==="cancel"?"x":"f(x)")),identity?[id,identity]:[id]);
      if(A){
        const answer=scalar(y);
        ctx.step("value","항등함수와 합성한 함수의 값",m(y),[simplify]);
        return finish(m(expr.replace("(x)","("+x+")"))+"의 값을 구하시오.",answer,[m(expr+"=f(x)")+"이다."]);
      }
      const target=rand(rng,-4,4), scale=mode?1:2;
      const translate=nonzero(rng), left=R.affine(scale,translate);
      const expression=expr.replace(/x(?=\)+$)/,left);
      const leftValue=goal==="cancel"?scale*target+translate:R.value(f,scale*target+translate);
      const rightSlope=pick(rng,[-2,-1,1,2].filter(s=>s!==(goal==="cancel"?scale:a*scale)));
      const given=R.affine(rightSlope,leftValue-rightSlope*target);
      const aResult=target;
      const answer=scalar(aResult);
      const fact=ctx.source("합성함수에 대한 방정식",m(expression+"="+given),false);
      ctx.step(mode?"linear-condition":"affine-condition","항등 관계를 적용해 일차방정식 해결",m("x="+answer.value),[simplify,fact]);
      return finish(m(expression+"="+given)+"를 만족시키는 "+m("x")+"의 값을 구하시오.",answer,
        [m(expression)+"을 "+m(goal==="cancel"?left:fx("f",left))+"로 바꾸어 일차방정식을 풀면 "+m("x="+answer.value)+"이다."]);
    }
    const g=line(pick(rng,[-2,-1,1,2]),nonzero(rng));
    const p=R.apply("composition",f,g), q=R.apply("composition",g,f);
    const fId=source("f",f);
    if(goal==="commute"){
      const slope=g.a;
      const parameter=ctx.source("합성에 들어가는 미지의 함수",m("g(x)="+R.affine(slope,0)+"+k")+"이다.");
      const relation=ctx.step("compose-compare","두 합성의 상수항 비교",m(R.affine(a*slope,0)+"+"+R.affine(a,b).replace("x","k")+"="+R.affine(a*slope,slope*b)+"+k"),[fId,parameter]);
      const t=b*(slope-1)/(a-1);
      if(!Number.isInteger(t))throw new RangeError("계수가 정수인 문항을 구성합니다.");
      const actual=line(slope,t);
      if(!R.same(R.apply("composition",actual,f),R.apply("composition",f,actual)))throw new RangeError("합성 검산 실패");
      const output=mode?t:R.value(actual,x);
      ctx.step(mode?"recover-coefficient":"value","함수의 일치 조건에서 상수 복원",m(output),[relation]);
      return finish(m("f\\circ g=g\\circ f")+"일 때, "+m(mode?"k":fx("g",x))+"의 값을 구하시오.",scalar(output),
        ["두 합성의 일차항은 같으므로 상수항을 비교하면 "+m("k="+t)+"이다."]);
    }
    if(goal==="associate"){
      const gId=source("g",g), h=line(1,nonzero(rng)), z=R.value(h,x), output=R.value(p,z);
      const hId=ctx.source("안쪽 함수의 출력",mode?m(fx("h",x)+"="+z)+"이다.":"함수 "+m("h")+"는 실수 전체에서 정의된다.");
      const reframe=ctx.step("associate","결합 순서 변경으로 필요한 입력 확인",m("(f\\circ g)("+(mode?z:fx("h",x))+")"),[hId]);
      if(!mode){
        const relation=ctx.source("합성 결과",m("(f\\circ(g\\circ h))("+x+")="+output),false);
        const inner=R.value(R.apply("inverse",p),output);
        if(!R.close(inner,z))throw new RangeError("결합법칙 역산 검산 실패");
        ctx.step("recover-inner","결합 순서를 바꾸고 합성 결과에서 안쪽 출력 복원",m(z),[reframe,fId,gId,relation]);
        return finish(m("(f\\circ(g\\circ h))("+x+")="+output)+"일 때, "+m(fx("h",x))+"의 값을 구하시오.",scalar(z),
          ["결합 순서를 바꾸면 "+m("(f\\circ g)(h("+x+"))="+output)+"이다. 이를 "+m(fx("h",x))+"에 대한 일차방정식으로 풀면 된다."]);
      }
      ctx.step("composition","두 일차함수로 값 결정",m(output),[reframe,fId,gId]);
      return finish(m("(f\\circ(g\\circ h))("+x+")")+"의 값을 구하시오.",scalar(output),
        ["합성의 결합법칙에 따라 "+m("(f\\circ g)(h("+x+"))")+"와 같다."]);
    }
    if(goal==="recover"||goal==="inverse-compose"){
      const reversed=!mode;
      const result=reversed?q:p;
      const gId=goal==="recover"?ctx.source("합성함수의 식",m((reversed?"(g\\circ f)":"(f\\circ g)")+"(x)="+R.rule(result))+"이다."):source("g",g);
      const s=ctx.step(goal==="recover"?"recover":"inverse-compose",goal==="recover"?"알려진 함수의 역함수로 합성에서 원래 함수 분리":"합성의 역함수에서 적용 순서 반전",
        m(goal==="recover"?(reversed?"g=(g\\circ f)\\circ f^{-1}":"g=f^{-1}\\circ(f\\circ g)"):(reversed?"(g\\circ f)^{-1}=f^{-1}\\circ g^{-1}":"(f\\circ g)^{-1}=g^{-1}\\circ f^{-1}")),[fId,gId]);
      const probe=goal==="recover"?x:R.value(result,x), answer=scalar(goal==="recover"?R.value(g,x):x);
      if(!A&&rng()<.5){
        const selected=goal==="recover"?g:R.apply("inverse",result);
        const probe2=goal==="recover"?R.value(g,x+1):x+1;
        const opposite=goal==="recover"?x+1:R.value(result,x+1);
        if(!R.close(R.value(selected,opposite),probe2))throw new RangeError("역산 검산 실패");
        ctx.step("preimage","구성한 함수에서 출력을 만드는 입력 역산",m(opposite),[s]);
        return finish(m((goal==="recover"?"g":"("+(reversed?"g\\circ f":"f\\circ g")+")^{-1}")+"(x)="+probe2)+"를 만족하는 "+m("x")+"의 값을 구하시오.",
          scalar(opposite),["구성한 함수에서 입력과 출력의 관계를 거꾸로 적용하면 "+m("x="+opposite)+"이다."]);
      }
      ctx.step("evaluate","구성한 함수의 새 입력에서 값 결정",m(answer.value),[s]);
      return finish(m(goal==="recover"?fx("g",probe):"("+(reversed?"g\\circ f":"f\\circ g")+")^{-1}("+probe+")")+"의 값을 구하시오.",answer,
        [goal==="recover"?"알려진 함수의 역함수를 합성하면 "+m("g(x)="+R.rule(g))+"를 얻는다.":m((reversed?"(g\\circ f)":"(f\\circ g)")+"("+x+")="+probe)+"에서 입력과 출력의 역할을 바꾼다."]);
    }
    const gId=source("g",g);
    const reversed=!mode, selected=reversed?q:p;
    const name=reversed?"g\\circ f":"f\\circ g", output=R.value(selected,x);
    const node=ctx.step("composition","합성 순서에 맞게 두 함수식 결합",m("("+name+")(x)="+R.rule(selected)),[fId,gId]);
    const backward=!A&&rng()<.65;
    const answer=scalar(backward?x:output);
    ctx.step(backward?"preimage":"value",backward?"합성의 출력에서 입력 역산":"합성함숫값 결정",m(answer.value),[node]);
    return finish(m("("+name+")("+(backward?"x":x)+")"+(backward?"="+output:""))+(backward?"를 만족시키는 "+m("x")+"의 값을":"의 값을")+" 구하시오.",answer,
      ["안쪽 함수부터 적용하면 "+m("("+name+")(x)="+R.rule(selected))+"이다."+(backward?" 이 식을 주어진 출력과 같게 놓고 푼다.":"")]);
  }
  ForgeFunctionSymbolic = globalThis.ForgeFunctionSymbolic = Object.freeze({generate});
})();


;

/* function-synthesis.js */
(() => {
  "use strict";
  const {m,pick,rand,scalar,set,shift,term}=ForgeTopics;
  const R=ForgeFunctionRelations;
  const integerRange=(lo,hi)=>Array.from({length:hi-lo+1},(_,i)=>lo+i);
  const eq=(x,y)=>Math.abs(x-y)<1e-8;
  const valueList=xs=>set(R.uniq(xs)).text;
  const inputs=[-4,-3,-2,-1,0,1,2,3,4,5];
  const fmt=(name,x)=>name+"("+x+")";
  const windowTex=([lo,hi])=>lo+"\\le x\\le "+hi;
  const shuffle=(rng,xs)=>xs.map(value=>({value,order:rng()})).sort((a,b)=>a.order-b.order).map(item=>item.value);

  // The second parameter is an output shift. The first parameter changes
  // the scale, vertex, or pole according to the mathematical family.
  const families={
    functions:[
      {id:"quadratic",tex:"(x-a)^2+b", family:"vertex",
        make:(a,b)=>({kind:"parabola",a:1,h:a,k:b}), bounds:true},
      {id:"absolute",tex:"|x-a|+b", family:"vertex",
        make:(a,b)=>({kind:"absolute",a:1,h:a,k:b}), bounds:true},
      {id:"affine",tex:"ax+b", family:"scale",
        make:(a,b)=>({kind:"affine",a,b,k:b}), invertible:true},
    ],
    rational:[
      {id:"rational-pole",tex:"\\frac{c}{x-a}+b",family:"pole",
        make:(a,b,c)=>({kind:"rational",a:c,h:a,k:b}),bounds:true,invertible:true},
      {id:"rational-scale",tex:"\\frac{a}{x-c}+b",family:"scale",
        make:(a,b,c)=>({kind:"rational",a,h:c,k:b}),bounds:true,invertible:true},
    ],
    radical:[
      {id:"radical-start",tex:"\\sqrt{x-a}+b",family:"start",
        make:(a,b)=>({kind:"radical",a:1,h:a,k:b,s:1}),bounds:true,invertible:true},
      {id:"radical-scale",tex:"a\\sqrt{x-c}+b",family:"scale",
        make:(a,b,c)=>({kind:"radical",a,h:c,k:b,s:1}),bounds:true,invertible:true},
    ],
  };
  const symmetric=f=>f.kind==="parabola"||f.kind==="absolute";
  const value=(f,x)=>symmetric(f)?(f.kind==="parabola"?(x-f.h)**2:Math.abs(x-f.h))+f.k:R.value(f,x);
  function preimage(f,y){
    if(f.kind==="affine")return [(y-f.k)/f.a];
    if(f.kind==="rational")return y===f.k?[]:[f.h+f.a/(y-f.k)];
    if(f.kind==="radical"){
      const ratio=(y-f.k)/f.a;
      return ratio<0?[]:[f.h+ratio**2];
    }
    const difference=y-f.k;
    if(difference<0)return [];
    const d=f.kind==="parabola"?Math.sqrt(difference):difference;
    return R.uniq([f.h-d,f.h+d]);
  }
  function extrema(f,[lo,hi]){
    if(f.kind==="rational"&&lo<=f.h&&f.h<=hi)return;
    if(f.kind==="radical"&&lo<f.h)return;
    const xs=symmetric(f)&&lo<f.h&&f.h<hi?[lo,f.h,hi]:[lo,hi];
    const ys=xs.map(x=>value(f,x));
    return [Math.min(...ys),Math.max(...ys)];
  }
  const finite=Number.isFinite;
  function checkExtreme(f,[lo,hi],n,minimum){
    if(!extrema(f,[lo,hi]))return false;
    const xs=[lo,hi,...(symmetric(f)&&lo<=f.h&&f.h<=hi?[f.h]:[])];
    return preimage(f,n).some(x=>lo-1e-8<=x&&x<=hi+1e-8)&&
      xs.every(x=>minimum?value(f,x)>=n-1e-8:value(f,x)<=n+1e-8);
  }

  // One mathematical operation per entry. Each operation can be oriented
  // in either direction: apply it to a model, or restrict the model by an
  // observed result. Operation-specific inverses are checked on the same
  // public parameter domain used by the renderer.
  const modules=[
    {id:"value",kind:"evaluation",goals:["value","point","graph","unknown"],input:"number",output:"number",
      read:(f,x)=>value(f,x), text:x=>fmt("f",x),
      match:(f,x,y)=>preimage(f,y).some(t=>eq(t,x)),
      clue:(x,y,mode)=>mode?"그래프가 점 "+m("("+x+","+y+")")+"를 지난다.":m(fmt("f",x)+"="+y)+"이다."},
    {id:"inverse",kind:"inversion",goals:["inverse","inverse-rule","inverse-graph","symmetry"],input:"number",output:"number",
      when:p=>p.invertible,read:(f,y)=>preimage(f,y)[0],match:(f,y,x)=>eq(value(f,x),y),
      text:y=>fmt("f^{-1}",y)},
    {id:"coincidence",kind:"symmetry",goals:["symmetry","injective"],input:"point",output:"number",
      when:p=>p.family==="vertex",eligibleTarget:false,read:(f,[x,y])=>Number(eq(value(f,x),value(f,y))),
      text:([x,y])=>fmt("f",x)+"="+fmt("f",y),
      clue:([x,y],n)=>m(fmt("f",x)+(n?"=":"\\ne ")+fmt("f",y))+"이다."},
    {id:"preimage-count",kind:"fibres",goals:["range","injective","bijective","invertible"],input:"number",output:"number",
      when:p=>p.family==="vertex"||p.id.startsWith("radical"),read:(f,y)=>preimage(f,y).length,
      text:y=>m(fmt("f","x")+"="+y)+"의 서로 다른 실수 해의 개수",prose:true,
      clue:(y,n)=>m(fmt("f","x")+"="+y)+"의 서로 다른 실수 해는 "+m(n)+"개이다."},
    {id:"domain-start",kind:"domain",goals:["domain","defined","endpoint","graph-bounds","bounds-fit","endpoint-fit","linear-root"],input:null,output:"number",
      when:p=>p.id.startsWith("radical"),read:f=>f.h,match:(f,_,x)=>finite(value(f,x))&&!finite(value(f,x-1)),text:()=>"정의역의 최솟값",prose:true},
    {id:"pole",kind:"domain",goals:["domain","asymptotes","graph-bounds","asymptote-fit","linear-fraction"],input:null,output:"number",
      when:p=>p.id.startsWith("rational"),read:f=>f.h,match:(f,_,x)=>!finite(value(f,x)),text:()=>"정의역에서 제외되는 실수",prose:true,
      clue:(_,x)=>"세로 점근선의 방정식은 "+m("x="+x)+"이다."},
    {id:"level",kind:"range",goals:["range","asymptotes","bounds-fit","endpoint","endpoint-fit","graph-bounds","asymptote-fit"],input:null,output:"number",
      when:p=>p.bounds,read:f=>f.k,match:(f,_,y)=>f.kind==="rational"?preimage(f,y).length===0:preimage(f,y).length===1&&eq(preimage(f,y)[0],f.h),text:()=>"치역의 경계값",prose:true,
      describe:f=>f.kind==="rational"?"치역에서 제외되는 실수":f.kind==="radical"?"치역의 경계값":"최솟값"},
    {id:"minimum",kind:"optimization",goals:["extrema","monotone","range","graph-bounds"],input:"window",output:"number",
      read:(f,w)=>extrema(f,w)?.[0],match:(f,w,n)=>checkExtreme(f,w,n,true),text:w=>m(windowTex(w))+"에서 "+m("f(x)")+"의 최솟값",prose:true},
    {id:"maximum",kind:"optimization",goals:["extrema","monotone","range","graph-bounds"],input:"window",output:"number",
      read:(f,w)=>extrema(f,w)?.[1],match:(f,w,n)=>checkExtreme(f,w,n,false),text:w=>m(windowTex(w))+"에서 "+m("f(x)")+"의 최댓값",prose:true},
    {id:"composition",kind:"composition",goals:["compose","compose-value","recover"],input:"point",output:"number",
      read:(f,[x,d])=>Math.abs(value(f,x)-d),
      match:(f,[x,d],y)=>y>=0&&[d-y,d+y].some(t=>preimage(f,t).some(z=>eq(z,x))),
      text:([x])=>fmt("g",fmt("f",x)),prefix:([,d])=>m("g(x)=|"+shift("x",d)+"|")+"라 하자."},
    {id:"inverse-composition",kind:"inverse-composition",goals:["inverse-compose"],input:"point",output:"number",
      when:p=>p.invertible,read:(f,[y,d])=>preimage(f,2*y+d)[0],
      match:(f,[y,d],x)=>eq(value(f,x),2*y+d),
      text:([y])=>fmt("(g\\circ f)^{-1}",y),
      prefix:([,d])=>m("g(x)=\\frac{"+shift("x",d)+"}{2}")+"라 하자."},
    {id:"fixed-point",kind:"intersection",goals:["inverse-cross"],extension:true,input:"number",output:"number",
      read:(f,x)=>finite(value(f,x))?Number(eq(value(f,x),x)):undefined,
      eligibleTarget:false,
      text:x=>m("x="+x)+"에서 두 그래프가 만나는지 나타낸 값",prose:true,
      clue:(x,n)=>"직선 "+m("y=x")+"와 "+m("y=f(x)")+"의 교점 중 "+m("x="+x)+"인 점이 "+(n?"있다.":"없다.")},
    {id:"line-count",kind:"intersections",goals:["intersections","line-position"],input:"line",output:"number",extension:true,
      when:p=>p.id.startsWith("rational")||p.id.startsWith("radical"),
      read:(f,[a,k])=>R.apply("intersections",f,{kind:"affine",a,k}).length,
      text:([a,k])=>m("y=f(x)")+"와 "+m("y="+R.affine(a,k))+"의 교점 개수",prose:true},
    {id:"asymptote-rectangle",kind:"area",goals:["area"],extension:true,input:null,output:"number",
      when:p=>p.id==="rational-scale",read:f=>Math.abs(f.a),match:(f,_,area)=>Math.abs((f.h+1-f.h)*(value(f,f.h+1)-f.k))===area,
      text:()=>"그래프 위의 점에서 두 점근선까지의 거리를 두 변의 길이로 하는 직사각형의 넓이",prose:true},
    {id:"reflected-value",kind:"reflection",goals:["reflect"],input:"number",output:"number",
      read:(f,x)=>value(f,-x),match:(f,x,y)=>preimage(f,y).some(t=>eq(t,-x)),
      text:x=>m("y=f(x)")+"의 그래프를 "+m("y")+"축에 대하여 대칭이동한 그래프에서 "+m("x="+x)+"일 때의 함숫값",prose:true},
    {id:"translation-anchor",kind:"translation",goals:["translate","symmetry-fit","endpoint-fit"],input:"number",output:"number",
      when:p=>p.id==="rational-pole"||p.id==="radical-start",
      read:(f,x)=>f.h-x,match:(f,x,n)=>f.h===x+n,
      text:()=>"",
      describe:(f,x)=>(f.kind==="radical"?"시작점의 가로 좌표":"세로 점근선의 가로 좌표")+"에서 "+m(x)+"를 뺀 값",prose:true},
    {id:"minimal-codomain",kind:"codomain",goals:["codomain"],input:"window",output:"number",
      when:p=>p.family==="vertex",read:(f,[lo,hi])=>R.uniq(integerRange(lo,hi).map(x=>value(f,x))).length,
      text:([lo,hi])=>m(windowTex([lo,hi]))+"인 정수를 정의역으로 할 때, 공역의 최소 원소 개수",prose:true},
    {id:"restricted-image",kind:"finite-range",goals:["domain","range","codomain","graph-bounds","inverse-bounds","injective","bijective","invertible"],input:"window",output:"number",
      when:p=>p.family==="vertex",read:(f,[lo,hi])=>R.uniq(integerRange(lo,hi).map(x=>value(f,x))).length,
      text:([lo,hi])=>"정의역이 "+m(windowTex([lo,hi]))+"인 정수일 때 치역의 원소 개수",prose:true},

  ];
  const rangeGoals=new Set(["domain","codomain","range"]);
  const stableNumber=n=>Math.round(n*1e8)/1e8;

  function atom(module,arg){return {module,arg,key:module.id+":"+JSON.stringify(arg)};}
  function availableAtoms(profile){
    const args={
      number:inputs,
      point:inputs.slice(1,-1).flatMap(x=>[[x,x+2],[x,2]]).filter(([x,d])=>x!==d&&d!==0),
      window:[[-3,1],[-2,3],[0,3],[1,5],[2,5],[3,5]],
      line:[[-1,1],[1,-1],[1,2],[2,-2],[2,3],[-2,2]],
    };
    return modules.filter(module=>!module.when||module.when(profile)).flatMap(module=>
      (args[module.input]??[null]).map(arg=>atom(module,arg)));
  }
  function evalAtom(a,row){
    if(!row.values.has(a.key)){
      try{row.values.set(a.key,a.module.read(row.f,a.arg));}
      catch(error){
        if(!(error instanceof RangeError))throw error;
        row.values.set(a.key,undefined);
      }
    }
    return row.values.get(a.key);
  }
  function expression(a,row){return a.module.describe?.(row.f,a.arg)??a.module.text(a.arg);}
  function age(history,key){
    const index=history.findLastIndex(path=>path.includes("/"+key+"/"));
    return index<0?history.length:history.length-1-index;
  }
  function conditionMode(rows,atom,actual,rng){
    const exact={id:"equal",values:[actual],test:n=>eq(n,actual)};
    const abs={id:"absolute",values:[-Math.abs(actual),Math.abs(actual)],test:n=>eq(Math.abs(n),Math.abs(actual))};
    const above={id:"above",values:null,test:n=>finite(n)&&n>=actual};
    const below={id:"below",values:null,test:n=>finite(n)&&n<=actual};
    const split=R.uniq(rows.map(row=>evalAtom(atom,row)).filter(n=>Number.isSafeInteger(n)&&n!==actual));
    const modes=[exact];
    if(!["coincidence","fixed-point","line-count","preimage-count","composition","inverse-composition","restricted-image","minimal-codomain"].includes(atom.module.id)){
      modes.push(above,below);
      if(actual&&split.includes(-actual))modes.push(abs);
    }
    return pick(rng,modes);
  }
  function conditionText(a,row,mode,n,rng){
    const label=expression(a,row);
    const topic=/(개수|좌표)$/.test(label)?"는 ":"은 ";
    if(mode.id==="equal"&&a.module.clue)return a.module.clue(a.arg,n,rng()<.5);
    if(a.module.prose)return label+(mode.id==="absolute"?"의 절댓값은 "+m(Math.abs(n))+"이다.":
      topic+m(n)+(mode.id==="above"?" 이상이다.":mode.id==="below"?" 이하이다.":"이다."));
    if(mode.id==="absolute")return m("|"+label+"|="+Math.abs(n))+"이다.";
    return m(label+({equal:"=",above:"\\ge ",below:"\\le "}[mode.id])+n)+"이다.";
  }
  function solveRows(rows,conditions,reverse=false){
    return rows.filter(row=>conditions.every(({a,mode})=>{
      if(reverse){
        const predicate=a.module.match;
        if(predicate&&mode.values)return mode.values.some(n=>predicate(row.f,a.arg,n));
      }
      return mode.test(evalAtom(a,row));
    }));
  }
  const projection=(rows,target)=>R.uniq(rows.map(row=>evalAtom(target,row)).filter(finite).map(stableNumber));
  function gradeGraph({conditions,survivors,query,target,C}){
    const role=a=>a.module.kind==="translation"?"domain":a.module.kind;
    const concepts=new Set([role(target),...conditions.map(row=>role(row.a))]);
    const relational=conditions.some(row=>row.mode.id!=="equal"||["composition","inverse-composition","fibres","symmetry","optimization","intersection","intersections","finite-range","codomain"].includes(row.a.module.kind));
    const branch=survivors.length>1&&query!=="single";
    const independent=conditions.length>1&&concepts.size>=3;
    return {concepts:concepts.size, relational, branch, independent,
      grade:C?(branch&&relational?"high":relational||branch?"medium":"low"):independent&&relational&&branch?"high":(relational||independent?"medium":"low")};
  }
  function relationIdentity(profile,a){
    return ({ "minimal-codomain":"restricted-image","reflected-value":"value","translation-anchor":profile.family==="pole"?"pole":"domain-start" }[a.module.id]??a.module.id);
  }
  function graphKey(profile,conditions,target,query){
    const id=a=>relationIdentity(profile,a);
    const clues=conditions.map(({a,mode})=>id(a)+"-"+mode.id).sort();
    // Prompt wording, parameters, units of display, and scalar vs multiple
    // choice do not affect this dependency graph signature.
    return profile.family+"~"+clues.join("+")+"~"+id(target)+"~"+(query==="single"?"unique":query==="all"?"set":query==="count"?"cardinality":"extremum");
  }
  function finish(plan,rng,ctx,format){
    const {profile,target,conditions,rows,survivors,values,query,assessment,key,parameterRange}=plan;
    const {c}=survivors[0];
    const form=m("f(x)="+profile.tex.replace("x-c",shift("x",c)).replace(/(?<![a-z])c(?![a-z])/g,String(c)).replace(/\\frac\{(-\d+)\}/,(_,n)=>"-\\frac{"+(-Number(n))+"}"));
    const subject=target.module.prose?expression(target,survivors[0]):m(expression(target,survivors[0]))+"의 값";
    const [[aLo,aHi],[bLo,bHi]]=parameterRange;
    const declaration="함수 "+form+"에서 두 정수 "+m("a,b")+"의 범위는 각각 "+m(aLo+"\\le a\\le "+aHi)+", "+m(bLo+"\\le b\\le "+bHi)+"이다."+
      (profile.family==="scale"?" 단, "+m("a\\ne0")+"이다.":"");
    const usesInverse=[target,...conditions.map(({a})=>a)].some(a=>["inversion","inverse-composition"].includes(a.module.kind));
    const root=ctx.source("함수식과 계수의 후보 범위",declaration+
      (usesInverse?" 함수 "+m("f")+"의 공역은 치역과 같다.":""));
    const support=plan.support;
    const supportNode=support?ctx.source("합성에 사용하는 함수",support.module.prefix(support.arg)):null;
    const graphObservation=rng()<.28?conditions.find(({a,mode,n})=>a.module.id==="value"&&mode.id==="equal"&&Math.max(Math.abs(a.arg),Math.abs(n))<=6):null;
    const plot=graphObservation?{kind:"function-points",points:[[graphObservation.a.arg,graphObservation.n]]}:undefined;
    const statements=conditions.map((entry)=>entry===graphObservation?
      "아래 좌표평면에 표시된 점은 "+m("y=f(x)")+"의 그래프 위에 있다.":
      conditionText(entry.a,survivors[0],entry.mode,entry.n,rng));
    const given=statements.map((statement,i)=>conditions[i]===graphObservation
      ?ctx.source("그래프에 표시된 점",m("("+graphObservation.a.arg+","+graphObservation.n+")"),false)
      :ctx.source("공개 조건",statement,false));
    for(const statement of statements)ctx.publish(statement);
    const targetLabel=target.module.kind;
    const conceptLabel={evaluation:"함숫값", inversion:"역함수", symmetry:"함숫값의 대칭", fibres:"함숫값과 해의 개수", domain:"정의역", range:"치역", optimization:"극값", composition:"합성함수","inverse-composition":"합성함수의 역함수",intersection:"그래프의 교점",intersections:"직선과 그래프의 교점","finite-range":"제한된 치역",codomain:"공역",area:"점근선과 직사각형의 넓이",translation:"가로 이동",reflection:"그래프의 대칭이동"};
    const labels=conditions.map(({a})=>conceptLabel[a.module.kind]);
    const pairs=xs=>m(R.list(xs.map(row=>"("+row.a+","+row.b+")")));
    const filtered=conditions.map((cond,i)=>{
      const inputs=[root,given[i],...(cond.a.module.prefix?[supportNode]:[])];
      if(cond.a.module.id==="composition"){
        const [x,d]=cond.a.arg;
        const outs=R.uniq([d-cond.n,d+cond.n]);
        inputs.push(ctx.step("outer-absolute-preimage","바깥 함수에서 안쪽 함숫값의 후보 복원",m(fmt("f",x)+"\\in "+R.list(outs)),[given[i],supportNode]));
      }
      return ctx.step(cond.a.module.id,labels[i]+" 조건을 계수의 관계로 바꾸기",
        conditions.length===1?pairs(survivors):m(solveRows(rows,[cond]).length)+"개의 계수 쌍이 조건을 만족한다.",inputs);
    });
    const joined=filtered.length===1?filtered[0]:ctx.step("meet","모든 공개 조건을 동시에 만족시키는 계수",pairs(survivors),filtered);
    const answer=query==="all"?set(values):scalar(query==="count"?values.length:query==="maximum"?values.at(-1):values[0]);
    const topic=target.module.prose?subject:m(expression(target,survivors[0]))+"의 값";
    const possible=target.module.kind==="optimization"?topic+"으로 가능한 값":"가능한 "+topic;
    const questions={
      single:subject+(subject.endsWith("개수")?"를":"을")+" 구하시오.",
      all:possible+(topic.endsWith("개수")?"를":"을")+" 모두 구하시오.",
      count:possible+" 중 서로 다른 값의 개수를 구하시오.",
      maximum:possible+" 중 가장 큰 값을 구하시오.",
      minimum:possible+" 중 가장 작은 값을 구하시오.",
    };
    ctx.step(target.module.id+"-"+query,conceptLabel[targetLabel]+" 결정",answer.text,[joined,...(target.module.prefix?[supportNode]:[])]);
    const solution=conditions.map(({a},i)=>{
      const allowed=solveRows(rows,conditions.slice(0,i+1),true);
      const grouped=R.uniq(allowed.map(row=>row.a)).map(a=>{
        const bs=allowed.filter(row=>row.a===a).map(row=>row.b);
        return m("a="+a)+"일 때 "+m("b\\in "+R.list(bs));
      });
      const bridge=a.module.id==="composition"
        ?m(fmt("f",a.arg[0])+"\\in "+R.list(R.uniq([a.arg[1]-conditions[i].n,a.arg[1]+conditions[i].n])))+"이므로 "
        :a.module.id==="inverse-composition"
          ?m(fmt("f",conditions[i].n)+"="+(2*a.arg[0]+a.arg[1]))+"이므로 ":"";
      return bridge+labels[i]+" 조건을 적용하면 "+grouped.join(", ")+"이다.";
    });
    solution.push("모든 조건을 만족하는 "+m("(a,b)")+"는 "+pairs(survivors)+"이다.",
      "이때 구하는 값의 후보는 "+valueList(values)+"이다.");
    const alternative=plan.without.map(({row,values},i)=>({statement:conditions[i]===graphObservation?m(fmt("f",graphObservation.a.arg)+"="+graphObservation.n):statements[i],witness:m("(a,b)=("+row.a+","+row.b+")"),
      values:query==="maximum"?m(values.at(-1)):query==="minimum"?m(values[0]):query==="count"?m(values.length):valueList(values)}));
    const question=questions[query];
    return ctx.finish(question,answer,solution,format,{...(plot?{plot}:{}),reasoning:{
      key,assessedGrade:assessment.grade,models:rows.length,survivors:survivors.length,relations:labels,
      conditionEffects:alternative,concepts:assessment.concepts,verified:true,
      target:conceptLabel[targetLabel],
    }});
  }

  function build(unit,goal,level,requested,rng,history){
    const extended=globalThis.ForgePreferences?.plusEnabled?.()!==false;
    const C=level==="C";
    const profiles=shuffle(rng,families[unit]);
    const c=unit==="rational"?pick(rng,[2,3,4,6]):rand(rng,-2,2);
    const parameterRange=[[-rand(rng,1,3),rand(rng,2,4)],[-rand(rng,2,5),rand(rng,2,5)]];
    const [modelA,modelB]=parameterRange.map(bounds=>integerRange(...bounds));
    for(const profile of profiles){
      const rows=modelA.filter(a=>profile.family!=="scale"||a).flatMap(a=>modelB.map(b=>({a,b,c,f:profile.make(a,b,c),values:new Map()})));
      const all=availableAtoms(profile).filter(a=>extended||!a.module.extension&&a.module.kind!=="intersection");
      const targets=shuffle(rng,all.filter(a=>a.module.eligibleTarget!==false&&(C?(!rangeGoals.has(goal)||a.module.kind===goal||goal==="range"&&a.module.kind==="finite-range"):
        a.module.goals.includes(goal))));
      const focusIsTarget=targets.length>0;
      const pool=focusIsTarget?targets:shuffle(rng,all.filter(a=>a.module.eligibleTarget!==false));
      if(C&&rangeGoals.has(goal)&&!focusIsTarget)continue;
      for(const target of pool.slice(0,14)){
        const hasFocus=a=>a.module.goals.includes(goal)||goal==="definition"&&a.module.kind==="domain";
        const viable=rows.filter(row=>Number.isSafeInteger(evalAtom(target,row)));
        if(viable.length<10||projection(viable,target).length<2)continue;
        for(const witness of shuffle(rng,viable).slice(0,5)){
          const clues=shuffle(rng,all).filter(a=>a.key!==target.key&&(relationIdentity(profile,a)!==relationIdentity(profile,target)||!C&&a.module.id==="value")&&
            Number.isSafeInteger(evalAtom(a,witness))&&(!a.module.prefix||!target.module.prefix&&(a.module.id!=="composition"||evalAtom(a,witness)>0)))
            .slice(0,26);
          const conditions=[];
          for(const a of clues){
            const n=evalAtom(a,witness);
            const mode=conditionMode(rows,a,n,rng);
            const filtered=solveRows(rows,[{a,mode}]);
            if(filtered.length<2||filtered.length>rows.length-3)continue;
            if(projection(filtered,target).length===projection(rows,target).length&&filtered.length>rows.length*.8)continue;
            conditions.push({a,mode,n});
          }
          const routes=(!C&&requested==="low"?conditions.map(cond=>[cond]):
            conditions.flatMap((cond,i)=>[...(!C&&!requested?[ [cond] ]:[]),
              ...conditions.slice(i+1).filter(other=>(relationIdentity(profile,other.a)!==relationIdentity(profile,cond.a)||!C&&other.a.module.id==="value")&&!(cond.a.module.prefix&&other.a.module.prefix)).map(other=>[cond,other])]));
          for(const proposed of shuffle(rng,routes).slice(0,38)){
            if(!C&&!focusIsTarget&&!proposed.some(cond=>hasFocus(cond.a)))continue;
            const survivors=solveRows(rows,proposed);
            if(!survivors.length||survivors.length>8||survivors.some(row=>!Number.isSafeInteger(evalAtom(target,row))))continue;
            const values=projection(survivors,target);
            if(values.some(n=>Math.abs(n)>100))continue;
            const query=values.length===1?"single":pick(rng,C?["all","count","maximum","minimum"]:["all","count"]);
            const sorted=xs=>R.uniq(xs);
            const reduce=xs=>{
              const values=sorted(xs);
              return query==="maximum"?values.at(-1):query==="minimum"?values[0]:query==="count"?values.length:values;
            };
            const proved=ForgeRelationSearch.solve({models:rows,
              conditions:proposed.map(condition=>({condition,accept:row=>condition.mode.test(evalAtom(condition.a,row))})),
              project:row=>stableNumber(evalAtom(target,row)),reduce,validateTarget:finite,
              check:(row,conditions)=>conditions.every(({condition})=>solveRows([row],[condition],true).length===1),
              witnessOf:(value,prior)=>query==="maximum"?value>values.at(-1):query==="minimum"?value<values[0]:!prior.includes(value)});
            if(!proved)continue;
            const without=proved.effects.map(({removed,witness})=>({
              row:witness,values:projection(solveRows(rows,proposed.filter(condition=>condition!==removed.condition)),target),
            }));
            const assessment=gradeGraph({conditions:proposed,survivors,query,target,C});
            if(requested&&assessment.grade!==requested||C&&!assessment.independent||!C&&assessment.concepts<2&&
              (proposed.length!==2||new Set(proposed.map(cond=>cond.a.key)).size!==2))continue;
            const key=graphKey(profile,proposed,target,query);
            if(history.length&&age(history,key)<Math.min(4,history.length))continue;
            const support=target.module.prefix?target:proposed.find(cond=>cond.a.module.prefix)?.a;
            return {profile,rows,target,conditions:proposed,survivors,values,query,without,assessment,key,support,parameterRange};
          }
        }
      }
    }
  }
  const supported=Object.fromEntries(Object.entries(families).map(([unit,profiles])=>
    [unit,new Set(profiles.flatMap(profile=>availableAtoms(profile).flatMap(a=>a.module.goals)))]));
  const supports=(unit,goal)=>supported[unit]?.has(goal)??false;
  function generate(unit,goal,level,rng,format,requested,history,makeContext){
    const plan=build(unit,goal,level,requested,rng,history);
    if(!plan)return null;
    const result=finish(plan,rng,makeContext(),format);
    return {...result,answerPath:{...result.answerPath,id:"function/"+plan.key+"/"+result.answer.kind}};
  }
  ForgeFunctionSynthesis = globalThis.ForgeFunctionSynthesis = Object.freeze({supports,generate});
})();


;

/* function-interval-synthesis.js */
(() => {
  "use strict";
  const T=ForgeTopics,R=ForgeFunctionRelations;
  const {m,pick,rand,scalar,set,shift}=T;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const integers=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  const sample=xs=>R.uniq(xs.map(x=>Number(x.toFixed(9))));
  const members=(points,predicate)=>points.filter(predicate);
  const safe=values=>values.every(Number.isSafeInteger);
  const value=(f,x)=>f.kind==="absolute"?Math.abs(x-f.h)+f.k:R.value(f,x);
  const mathSet=xs=>set(xs).text;
  const conditionInterval=(x,[lo,hi])=>(lo===null?"":lo+"\\le ")+x+(hi===null?"":"\\le "+hi);
  const wrap=(x,bounds)=>m(conditionInterval(x,bounds));
  const inInterval=(x,[lo,hi])=>Number.isFinite(x)&&(lo===null||x>=lo)&&(hi===null||x<=hi);
  const plus=(unit,f)=>unit==="functions"?shift("|"+shift("x",f.h)+"|",-f.k):R.rule(f).replace(/\\frac\{-(\d+)\}/,"-\\frac{$1}");
  const rels=[
    {id:"input-window",label:"입력의 위치",given:({window})=>wrap("x",window),active:(x,{window})=>inInterval(x,window)},
    {id:"image-window",label:"함숫값의 범위",given:({window,d})=>wrap(d?"f(g(x))":"f(x)",window),
      active:(x,{window,f,d})=>inInterval(value(f,x+d),window)},
    {id:"excluded-image",label:"두 함숫값의 일치와 불일치",
      given:({f,d,y,remove})=>m((d?"f(g(x))":"f(x)")+(remove?"\\ne ":"=")+y),
      active:(x,{f,d,y,remove})=>Number.isFinite(value(f,x+d))&&((value(f,x+d)===y)!==remove)},
  ];
  const goals={
    domain:["domain","defined","graph-bounds","compose-bounds","compatible"],
    range:["range","graph-bounds","compose-bounds"],
    codomain:["codomain"],
    fibres:["injective"],
    extrema:["extrema"],
  };
  const targets={
    domain:{label:"정의역",noun:"조건을 만족시키는 정수",value:xs=>xs},
    range:{label:"치역",noun:"가능한 함숫값",value:(xs,at)=>sample(xs.map(at))},
    codomain:{label:"공역",noun:"가장 작은 공역의 원소",value:(xs,at)=>sample(xs.map(at))},
    fibres:{label:"함숫값과 해의 개수",noun:"두 개 이상의 입력에 대응하는 함숫값",value:(xs,at)=>sample(xs.map(at)).filter(y=>xs.filter(x=>at(x)===y).length>1)},
    extrema:{label:"극값",noun:"극값",value:(xs,at)=>sample(xs.map(at))},
  };
  const supports=(unit,goal)=>Object.entries(goals).some(([id,items])=>
    (id!=="fibres"&&id!=="codomain"||unit==="functions")&&items.includes(goal));

  function generate(unit,goal,level,rng,format,grade,history,makeContext) {
    const C=level==="C";
    if(level==="A"||!C&&!supports(unit,goal))return null;
    const choices=Object.keys(targets).filter(key=>(key!=="fibres"&&key!=="codomain"||unit==="functions")&&
      (C?!goal||key===goal:goals[key].includes(goal)));
    if(!choices.length)return null;
    for(let attempt=0;attempt<90;attempt++){
      const selected=pick(rng,choices),target=targets[selected];
      const h=rand(rng,-2,2),k=rand(rng,-3,3);
      const f=unit==="functions"?{kind:"absolute",h,k}:{kind:unit,h,k,a:unit==="rational"?pick(rng,[-12,12]):pick(rng,[-1,1]),s:1};
      const d=goal.startsWith("compose")||rng()<.55?pick(rng,[-2,-1,1,2]):0;
      const lo=h-d-rand(rng,2,4),hi=h-d+rand(rng,4,8);
      const original=integers(lo,hi),at=x=>value(f,x+d);
      const usable=original.filter(x=>Number.isFinite(at(x)));
      const rawValues=sample(usable.map(at).filter(Number.isSafeInteger));
      if(rawValues.length<3)continue;
      const limits=[rand(rng,lo+1,hi-2),rand(rng,lo+2,hi-1)].sort((a,b)=>a-b);
      const threshold=pick(rng,rawValues.slice(1,-1)), other=pick(rng,rawValues.filter(y=>y!==threshold));
      const pool=[
        {relation:rels[0],args:{window:rng()<.5?limits:rng()<.5?[limits[0],null]:[null,limits[1]]}},
        {relation:rels[1],args:{window:rng()<.5?[threshold,null]:[null,threshold],f,d}},
        {relation:rels[1],args:{window:[Math.min(threshold,other),Math.max(threshold,other)],f,d}},
        {relation:rels[2],args:{y:other,f,d,remove:true}},
      ];
      const need=pick(rng,grade==="high"?[2,3]:grade==="medium"?[2,3]:[1,2]);
      const conditions=[];
      const available=pool.slice();
      while(conditions.length<need&&available.length){
        const candidate=pick(rng,available);
        conditions.push(candidate);
        for(let i=available.length-1;i>=0;i--)if(available[i].relation===candidate.relation)available.splice(i,1);
      }
      const matches=(xs,conds)=>members(xs,x=>conds.every(({relation,args})=>relation.active(x,args)));
      const domain=matches(usable,conditions);
      if(domain.length<2)continue;
      const reverse=usable.filter(x=>conditions.every(({relation,args})=>{
        if(relation!==rels[1])return relation.active(x,args);
        const [low,high]=args.window;
        const t=x+d-h;
        if(unit==="rational"){
          const cmp=(bound,lower)=>{
            if(bound===null)return true;
            const delta=(bound-k)*t;
            return (t>0)===lower?f.a>=delta:f.a<=delta;
          };
          return t!==0&&cmp(low,true)&&cmp(high,false);
        }
        if(unit==="functions")return (low===null||Math.abs(t)>=low-k)&&(high===null||Math.abs(t)<=high-k);
        const edge=bound=>(bound-k)*f.a;
        return t>=0&&(f.a>0?(low===null||edge(low)<=0||t>=edge(low)**2)&&(high===null||edge(high)>=0&&t<=edge(high)**2):
          (high===null||edge(high)<=0||t>=edge(high)**2)&&(low===null||edge(low)>=0&&t<=edge(low)**2));
      }));
      if(!same(domain,reverse))continue;
      const values=target.value(domain,at);
      if(!values.length||!safe(values))continue;
      if(C&&["range","codomain","fibres","extrema"].includes(selected)){
        const outputFacts=conditions.filter(({relation})=>relation!==rels[0]);
        const hasInput=conditions.some(({relation})=>relation===rels[0]);
        const window=outputFacts.find(({relation})=>relation===rels[1])?.args.window;
        if(!hasInput&&window&&window.every(Number.isSafeInteger)&&
          (unit==="functions"||unit==="rational"&&usable.every(x=>Number.isSafeInteger(at(x))))){
          const direct=integers(...window).filter(y=>outputFacts.every(({relation,args})=>relation!==rels[2]||y!==args.y));
          if(same(direct,values))continue;
        }
        if(values.length<2)continue;
        if(selected==="extrema"&&window&&values.some((y,i)=>(i===0||i===values.length-1)&&window.includes(y)))continue;
      }
      const projection=selected==="extrema"?pick(rng,["max","min"]):pick(rng,["set","count"]);
      const outcome=(values)=>projection==="set"?values:projection==="count"?values.length:projection==="max"?values.at(-1):values[0];
      const expected=outcome(values);
      const effects=conditions.map((removed,i)=>{
        const expanded=matches(usable,conditions.filter((_,j)=>i!==j));
        const witness=expanded.find(x=>!domain.includes(x));
        const alternatives=target.value(expanded,at);
        const alternative=outcome(alternatives);
        return witness===undefined||same(expected,alternative)||!safe(alternatives)?null:
          {statement:removed.relation.given(removed.args),witness:m("x="+witness),
            values:Array.isArray(alternative)?mathSet(alternative):m(alternative)};
      });
      if(effects.some(effect=>!effect))continue;
      const branches=conditions.some(({relation,args})=>relation===rels[1]&&
        matches(usable,[{relation,args}]).some((x,i,interval)=>i>0&&x-interval[i-1]>1))&&
        domain[0]<h-d&&h-d<domain.at(-1)&&!domain.includes(h-d);
      const hasImage=conditions.some(({relation})=>relation===rels[1]);
      const relational=hasImage&&(d!==0||selected!=="domain");
      const assessed=branches&&relational&&effects.length>=2?"high":relational&&effects.length>=2?"medium":"low";
      if(C&&(!hasImage||conditions.length===1&&!d)||grade&&grade!==assessed)continue;
      if(C&&assessed==="high"&&selected!=="domain"&&selected!=="fibres"&&unit==="functions"){
        // A two-sided solution has no effect on the answer if one side
        // alone gives the same outputs. Reject that shortcut.
        const sideUnchanged=[domain.filter(x=>x<h-d),domain.filter(x=>x>h-d)]
          .some(xs=>same(outcome(target.value(xs,at)),expected));
        if(sideUnchanged)continue;
      }
      const key=["input",unit,conditions.map(({relation})=>relation.id).sort().join("+"),d?"composition":"plain",selected,projection==="max"||projection==="min"?"extremum":projection].join("~");
      if(history.slice(-4).some(path=>path.includes("/"+key+"/")))continue;
      const ctx=makeContext(), term=d?"f(g(x))":"f(x)";
      const source=ctx.source("함수식",m("f(x)="+plus(unit,f))+"이다.");
      const bridge=d?ctx.source("안쪽 함수",m("g(x)="+shift("x",-d))+"라 하자."):source;
      const universe=ctx.source("정수 입력 범위","정수 "+m("x")+"의 범위는 "+wrap("x",[lo,hi])+"이다.");
      const defined=ctx.step("definition","원래 식이 정의되는 정수",mathSet(usable),[source,...(d?[bridge]:[]),universe]);
      const nodes=conditions.map(({relation,args})=>{
        const text=relation.given(args);
        const pub=ctx.source(relation.label,text,false);
        return ctx.step(relation.id,relation.label+"를 만족하는 입력",mathSet(matches(usable,[{relation,args}])),[defined,pub]);
      });
      ctx.publish("이 중 "+m(term)+"가 정의되고 "+conditions.map(({relation,args})=>relation.given(args)).join(", ")+"를 만족하는 "+m("x")+"만 고려한다.");
      const end=nodes.length===1?nodes[0]:ctx.step("intersection","모든 조건에 공통으로 해당하는 입력",mathSet(domain),nodes);
      const resultNode=ctx.step(selected,target.label+"에서 가능한 결과 결정",mathSet(values),[end]);
      const answer=projection==="set"?set(expected):scalar(expected);
      if(projection!=="set")ctx.step(projection,"정답에 필요한 값 결정",answer.text,[resultNode]);
      const question=selected==="domain"&&rng()<.5?
        "이 조건을 만족하는 입력만 남겼을 때 새 정의역"+(projection==="count"?"의 원소 개수를":"을")+" 구하시오.":selected==="codomain"?
        "남은 "+m("x")+"를 정의역으로 하는 함수 "+m(term)+"의 공역 중 원소 수가 가장 적은 공역"+(projection==="count"?"의 원소 개수를":"을")+" 구하시오.":
        selected==="extrema"?m(term)+"의 "+(projection==="max"?"최댓값":"최솟값")+"을 구하시오.":
          (selected==="domain"?target.noun:selected==="fibres"?"서로 다른 두 입력에서 모두 나오는 "+m(term)+"의 값":m(term)+"의 값")+
            (projection==="count"?"의 개수를":selected==="domain"?"를 모두":"을 모두")+" 구하시오.";
      const solution=[
        "원래 식이 정의되는 정수는 "+mathSet(usable)+"이다.",
        ...conditions.map(({relation,args})=>relation.given(args)+"에 해당하는 입력은 "+mathSet(matches(usable,[{relation,args}]))+"이다."),
        "모든 조건을 만족하는 입력은 "+mathSet(domain)+"이다.",
        "이때 "+(selected==="domain"?"남는 입력":"구하려는 값의 후보")+"은 "+mathSet(values)+"이다.",
      ];
      const p=ctx.finish(question,answer,solution,format,{reasoning:{
        key,assessedGrade:assessed,models:original.length,survivors:domain.length,
        relations:conditions.map(({relation})=>relation.label),conditionEffects:effects,
        concepts:new Set(["정의 조건",...conditions.map(({relation})=>relation.id),selected]).size,
        target:target.label,verified:true,
      }});
      return {...p,answerPath:{...p.answerPath,id:"function/"+key+"/"+p.answer.kind}};
    }
    return null;
  }
  ForgeFunctionIntervalSynthesis = globalThis.ForgeFunctionIntervalSynthesis = Object.freeze({generate,supports});
})();


;

/* function-relation-practice.js */
(() => {
  "use strict";
  const {m,pick,rand,scalar,point,set,choice,shift,term}=ForgeTopics;
  const R=ForgeFunctionRelations;
  const ints=(lo,hi)=>Array.from({length:hi-lo+1},(_,i)=>lo+i);
  const nz=rng=>pick(rng,[-3,-2,-1,1,2,3]);
  const line=(a,k)=>({kind:"affine",a,k});
  const pair=(x,y)=>"("+x+","+y+")";
  const call=(f,x)=>f+"("+x+")";

  // Piecewise affine maps carry intervals along with the rules on them.
  // A decreasing inner map reverses which side owns the breakpoint.
  function segments(f){
    return f.kind==="piece"?[
      {...f.left,lo:-Infinity,hi:f.h,lc:false,hc:false},
      {...f.right,lo:f.h,hi:Infinity,lc:true,hc:false},
    ]:[{...f,lo:-Infinity,hi:Infinity,lc:false,hc:false}];
  }
  const contains=(s,x)=>(x>s.lo||s.lc&&x===s.lo)&&(x<s.hi||s.hc&&x===s.hi);
  function compose(outer,inner){
    return segments(inner).flatMap(g=>segments(outer).flatMap(f=>{
      const forward=g.a>0;
      const preLo=((forward?f.lo:f.hi)-g.k)/g.a, preHi=((forward?f.hi:f.lo)-g.k)/g.a;
      const lo=Math.max(g.lo,preLo),hi=Math.min(g.hi,preHi);
      const lc=(lo!==g.lo||g.lc)&&(lo!==preLo||(forward?f.lc:f.hc));
      const hc=(hi!==g.hi||g.hc)&&(hi!==preHi||(forward?f.hc:f.lc));
      return (lo<hi||lo===hi&&lc&&hc)?[{lo,hi,lc,hc,a:f.a*g.a,k:f.a*g.k+f.k}]:[];
    })).sort((a,b)=>a.lo-b.lo);
  }
  const image=(ss,x)=>{const s=ss.find(s=>contains(s,x));return s?.a*x+s?.k;};
  const preimage=(ss,y)=>R.uniq(ss.map(s=>(y-s.k)/s.a).filter((x,i)=>contains(ss[i],x)));
  const formatSegments=ss=>"\\begin{cases}"+ss.map(s=>R.affine(s.a,s.k)+"&"+
    (s.lo===-Infinity?"x"+(s.hc?"\\le ":"<")+s.hi:
      s.lo+(s.lc?"\\le ":"<")+"x"+(s.hi===Infinity?"":(s.hc?"\\le ":"<")+s.hi))).join("\\\\")+"\\end{cases}";
  function piece(rng){
    const h=rand(rng,-2,2), a=nz(rng), b=pick(rng,[-2,-1,1,2].filter(v=>v!==a));
    const y=rand(rng,-3,3);
    return {kind:"piece",h,left:line(a,y-a*h+rand(rng,-2,2)),right:line(b,y-b*h)};
  }
  function parameterRule(f,slot){
    const l=slot==="left"?R.affine(f.left.a,0)+"+k":R.rule(f.left);
    const r=slot==="right"?R.affine(f.right.a,0)+"+k":R.rule(f.right);
    const h=slot==="boundary"?"k":f.h;
    return "\\begin{cases}"+l+"&x<"+h+"\\\\"+r+"&x\\ge "+h+"\\end{cases}";
  }
  function vary(f,slot,k){
    return slot==="boundary"?{...f,h:k}:{...f,[slot]:{...f[slot],k}};
  }
  function finish(ctx,question,answer,solution,format,grade,extra={}){
    return ctx.finish(question,answer,solution,format,{...extra,relationGrade:grade});
  }

  function piecePractice(rng,level,format,grade,ctx){
    const f=piece(rng), g=line(pick(rng,[-2,-1,1,2]),nz(rng));
    const outerPiece=rng()<.5;
    const both=level==="B"&&grade!=="low"&&rng()<.17;
    const self=level==="B"&&grade!=="low"&&!both&&rng()<.14;
    const other=both?piece(rng):g;
    const outer=self||outerPiece?f:other, inner=self||!outerPiece?f:other;
    const name=self?"f\\circ f":outerPiece?"f\\circ g":"g\\circ f";
    const forward=x=>R.value(outer,R.value(inner,x));
    const ss=compose(outer,inner), H=x=>"("+name+")("+x+")";
    const boundaries=R.uniq(ss.map(s=>s.lo).filter(Number.isFinite));
    const inputs=ints(-8,8);
    if(boundaries.some(x=>!Number.isInteger(x))||!inputs.every(x=>image(ss,x)===forward(x)))return null;
    const available=level==="A"?["value","rule"]:grade==="low"?["rule","preimage","boundary"]:
      grade==="high"?["parameter","compare"]:["preimage","range","rule","parameter","compare","boundary"];
    const query=pick(rng,available);
    const hId=()=>ctx.source("합성할 함수식",m("f(x)="+R.rule(f))+"이다.");
    const gId=()=>self?null:ctx.source("합성할 함수식",m("g(x)="+R.rule(other))+"이다.");
    const composed=(from)=>ctx.step("piece-composition","각 입력 구간과 대응식을 합성",m("("+name+")(x)="+formatSegments(ss)),from);
    const orientation=self?"self-composition":both?"two-piecewise-functions":outerPiece?"outer-piece":"inner-piece";
    const bind=ids=>ctx.step(orientation,"합성 순서에 맞는 입력 관계",m(name),ids.filter(Boolean));

    if(query==="parameter"){
      if(self||both)return null;
      const hidden=grade==="high"?"piece":pick(rng,["piece","piece","affine"]);
      if(hidden==="affine"){
        const w=pick(rng,inputs), actual=forward(w), slot=pick(rng,["slope","intercept"]);
        if(!w&&outerPiece&&slot==="slope")return null;
        const innerInput=R.value(f,w);
        if(!outerPiece&&!innerInput&&slot==="slope")return null;
        const hiddenRule=slot==="slope"?shift("kx",-other.k):R.affine(other.a,0)+"+k";
        const first=hId(), second=ctx.source("미지의 일차함수","일차함수 "+m("g(x)="+hiddenRule)+"에서 "+m("k")+"는 실수이다."+(slot==="slope"?" 단, "+m("k\\ne0")+"이다.":""));
        const fact=ctx.source("합성함숫값",m(H(w)+"="+actual)+"이다.");
        const route=bind([first,second]);
        if(outerPiece){
          const u=preimage(segments(f),actual);
          if(u.length<2)return null;
          const possible=R.uniq(u.map(t=>slot==="slope"?(t-other.k)/w:t-other.a*w)).filter(k=>slot!=="slope"||k!==0);
          if(possible.length<2||possible.some(t=>!Number.isSafeInteger(t))||possible.some(t=>R.value(f,slot==="slope"?t*w+other.k:other.a*w+t)!==actual))return null;
          const at=ctx.step("branch-preimages","바깥 함수의 출력에서 가능한 입력을 구함",set(u).text,[first,fact]);
          const answer=set(possible);
          ctx.step("recover-inner-parameter","안쪽 식에서 미지수 역산",answer.text,[route,at]);
          const steps=["두 구간에서 "+m("f(x)="+actual)+"를 각각 풀면 가능한 입력은 "+set(u).text+"이다.",
            m("g("+w+")")+"를 그 값들과 각각 같게 놓으면 "+answer.text+"를 얻는다."];
          return finish(ctx,"가능한 "+m("k")+"의 값을 모두 구하시오.",answer,steps,format,"medium");
        }
        const k=slot==="slope"?(actual-other.k)/innerInput:actual-other.a*innerInput;
        if(!Number.isSafeInteger(k)||R.value(slot==="slope"?line(k,other.k):line(other.a,k),innerInput)!==actual)return null;
        const known=ctx.step("evaluate-inner-piece","안쪽 함수의 입력 구간에서 값 결정",m("f("+w+")="+innerInput),[first]);
        ctx.step("recover-outer-parameter","바깥 함수의 미지수 역산",m("k="+k),[route,known,fact]);
        return finish(ctx,m("k")+"의 값을 구하시오.",scalar(k),[
          m("f("+w+")="+innerInput)+"이므로 "+m("g("+innerInput+")="+actual)+"을 풀어 "+m("k="+k)+"를 얻는다.",
        ],format,"medium");
      }
      const slot=pick(rng,["left","right","boundary"]);
      const w=pick(rng,inputs), input=outerPiece?R.value(other,w):w;
      if(slot!=="boundary"&&((input<f.h)!==(slot==="left")))return null;
      const k=slot==="boundary"?f.h:f[slot].k;
      const first=ctx.source("미지수가 있는 구간별 함수","함수 "+m("f(x)="+parameterRule(f,slot))+"에서 "+m("k")+"는 정수이다.");
      const second=gId();
      const model=(k,x)=>outerPiece?R.value(vary(f,slot,k),R.value(other,x)):R.value(other,R.value(vary(f,slot,k),x));
      if(slot==="boundary"){
        if(grade==="low")return null;
        const scale=outerPiece?other.a:1, offset=outerPiece?other.k:0;
        const records=inputs.map(x=>{
          const s=scale*x+offset;
          return {x,s,y:forward(x),distinct:R.value(vary(f,"boundary",s),s)!==R.value(vary(f,"boundary",s+1),s)};
        }).filter(p=>p.distinct);
        const left=records.filter(p=>p.s<f.h).sort((a,b)=>b.s-a.s)[0];
        const right=records.filter(p=>p.s>=f.h).sort((a,b)=>a.s-b.s)[0];
        if(!left||!right||right.s-left.s<1)return null;
        const constraints=[left,right].sort((a,b)=>a.x-b.x);
        const checks=constraints.map(p=>ctx.source("합성함숫값",m(H(p.x)+"="+p.y)+"이다."));
        const bounds=[left.s+1,right.s];
        const candidates=ints(...bounds);
        const tested=ints(left.s-2,right.s+2).filter(t=>constraints.every(p=>model(t,p.x)===p.y));
        if(JSON.stringify(tested)!==JSON.stringify(candidates))return null;
        const route=bind([first,second]);
        const parts=constraints.map((p,i)=>ctx.step("infer-branch","출력에서 적용된 가지 판별",m("k"+(p===left?">":"\\le ")+p.s),[route,checks[i]]));
        const answer=candidates.length===1?scalar(candidates[0]):set(candidates);
        ctx.step("integer-boundary","두 조건에 공통인 정수 경계",answer.text,parts);
        return finish(ctx,candidates.length===1?m("k")+"의 값을 구하시오.":"가능한 "+m("k")+"의 값을 모두 구하시오.",answer,[
          "두 입력에서 각 가지의 식이 주는 값이 서로 다르므로, 합성함숫값으로 어느 가지가 쓰였는지 판별할 수 있다.",
          "왼쪽 가지의 조건은 "+m(left.s+"<k")+", 오른쪽 가지의 조건은 "+m("k\\le "+right.s)+"이다.",
          "이 두 조건을 동시에 만족시키는 정수를 구한다.",
        ],format,"high");
      }
      if(grade==="high")return null;
      const condition=ctx.source("합성함숫값",m(H(w)+"="+forward(w))+"이다.");
      const route=bind([first,second]);
      const sub=ctx.step("branch-argument","합성의 입력으로 적용 구간 결정",m("x="+input),[route,condition]);
      if(model(k+1,w)===forward(w)||model(k,w)!==forward(w))return null;
      const answer=scalar(k);
      ctx.step("recover-intercept","해당 가지의 상수항 역산",m("k="+k),[sub,condition]);
      return finish(ctx,m("k")+"의 값을 구하시오.",answer,[
        "구간별 함수에 들어가는 입력은 "+m(input)+"이다.",
        "그 입력에 해당하는 가지를 사용해 "+m(H(w)+"="+forward(w))+"에서 "+m("k="+k)+"를 얻는다.",
      ],format,"medium");
    }
    if((query==="rule"||query==="boundary")&&(self||both))return null;
    if(query==="rule"&&format!=="choice")return null;
    const route=bind([hId(),gId()]);
    const relation=composed([route]);
    if(query==="value"){
      const x=pick(rng,inputs), answer=scalar(forward(x));
      ctx.step("value","안쪽 값을 구한 뒤 바깥 함수에 대입",m(answer.value),[relation]);
      return finish(ctx,m(H(x))+"의 값을 구하시오.",answer,
        [m(call(self||!outerPiece?"f":"g",x)+"="+R.value(inner,x))+"를 바깥 함수에 대입한다."],format,null);
    }
    if(query==="rule"){
      const alternatives=[ss.map((s,i)=>i?{...s,k:s.k+1}:s),ss.map((s,i)=>i?s:{...s,k:s.k-1}),
        ss.map((s,i)=>({...s,lc:i>0?!s.lc:s.lc,hc:i===0?!s.hc:s.hc}))];
      if(ss.length!==2||image(ss,boundaries[0])===image(alternatives[2],boundaries[0]))return null;
      const answer=choice(rng,m(formatSegments(ss)),alternatives.map(s=>m(formatSegments(s))));
      return finish(ctx,m(name)+"의 식을 고르시오.",answer,[
        outerPiece?m("g(x)<"+f.h)+"를 풀어 "+m("f")+"의 첫째 식이 적용되는 구간을 구한다.":m("x<"+f.h)+"와 "+m("x\\ge "+f.h)+"로 나누어 "+m("g")+"에 대입한다.",
        "두 구간의 식을 정리하면 "+answer.text+"이다.",
      ],format,"low");
    }
    if(query==="boundary"){
      if(!outerPiece||boundaries.length!==1||!Number.isSafeInteger(boundaries[0])||boundaries[0]===f.h)return null;
      const answer=scalar(boundaries[0]);
      ctx.step("boundary-preimage","합성 식의 경계가 되는 입력",m(answer.value),[relation]);
      return finish(ctx,m(name)+"에서 구간별 식이 바뀌는 경계의 값을 구하시오.",answer,[
        outerPiece?m("g(x)="+f.h)+"를 푼다.":"안쪽 함수의 구간이 바뀌는 곳이 합성함수의 경계이다.",
      ],format,"low");
    }
    if(query==="range"){
      const h=pick(rng,boundaries.filter(Number.isInteger));
      if(h===undefined)return null;
      const lo=h-2,hi=h+2, from=ctx.source("제한된 정의역",m(lo+"\\le x\\le "+hi)+"인 정수만 고려한다.");
      const answer=set(ints(lo,hi).map(forward));
      const used=ints(lo,hi).map(x=>ss.findIndex(s=>contains(s,x)));
      if(new Set(used).size<2)return null;
      ctx.step("image-union","각 구간의 출력을 합친 치역",answer.text,[relation,from]);
      return finish(ctx,m(name)+"의 치역을 구하시오.",answer,["정의역의 정수를 구간별로 나누어 대입한 뒤, 중복된 출력을 한 번만 적는다."],format,"medium");
    }
    if(query==="compare"){
      const x=pick(rng,inputs);
      const reversed=compose(inner,outer);
      if(self||!boundaries.length||!inputs.some(t=>forward(t)!==image(reversed,t)))return null;
      const otherName=outerPiece?"g\\circ f":"f\\circ g";
      const from=ctx.source("비교하는 정수의 범위",m(x+"\\le x_0\\le "+(x+5))+"인 정수 "+m("x_0")+"를 생각하자.");
      const values=ints(x,x+5);
      const hits=R.uniq(ss.flatMap(left=>reversed.flatMap(right=>{
        const sameBranch=t=>contains(left,t)&&contains(right,t)&&values.includes(t);
        const slope=left.a-right.a;
        if(!slope)return left.k===right.k?values.filter(sameBranch):[];
        const root=(right.k-left.k)/slope;
        return sameBranch(root)?[root]:[];
      })));
      if(hits.join()!==values.filter(t=>forward(t)===image(reversed,t)).join())return null;
      if(!hits.length||hits.length===values.length||!values.every(t=>image(reversed,t)===R.value(inner,R.value(outer,t))))return null;
      const mirror=ctx.step("reverse-composition","합성 순서를 바꾼 식",m("("+otherName+")(x)="+formatSegments(reversed)),[route]);
      const answer=set(hits);
      ctx.step("compare-branches","두 합성의 구간 조건과 출력 비교",answer.text,[relation,mirror,from]);
      return finish(ctx,m(H("x_0")+"=("+otherName+")(x_0)")+"인 모든 "+m("x_0")+"를 구하시오.",answer,[
        "두 합성의 경계를 함께 표시해 구간을 나눈다. 각 구간에서 두 일차식이 같은 입력을 구하고, 그 구간에 속하는 정수만 남긴다.",
        "주어진 범위에서 두 합성의 출력이 같은 입력은 "+answer.text+"이다.",
      ],format,"high");
    }
    const x=pick(rng,inputs),y=forward(x), roots=preimage(ss,y);
    if(roots.some(t=>!Number.isSafeInteger(t))||!roots.every(t=>forward(t)===y))return null;
    const fact=ctx.source("합성함숫값",m(H("x")+"="+y),false);
    const answer=set(roots);
    ctx.step("piece-preimage","가지마다 역산하고 구간을 검사",answer.text,[relation,fact]);
    return finish(ctx,m(H("x")+"="+y)+"인 실수 "+m("x")+"를 모두 구하시오.",answer,[
      "각 가지의 일차식을 "+m(y)+"와 같게 놓고, 구한 해가 그 가지의 구간 안에 있는지 확인한다.",
      "남는 해는 "+answer.text+"이다.",
    ],format,roots.length>1?"medium":"low");
  }

  function inversePractice(rng,level,format,grade,ctx){
    const A=level==="A";
    const path=pick(rng,A?["value","rule","point"]:grade==="low"?["pair","reflect","rule"]:
      grade==="high"?["parameter","restricted","collision"]:["pair","reflect","parameter","restricted","collision","rule"]);
    const x=rand(rng,-4,4),a=pick(rng,[-3,-2,2,3]),b=nz(rng),f=line(a,b),y=R.value(f,x);
    const inputNode=(label,text,visible=true)=>ctx.source(label,text,visible);
    const affine=()=>inputNode("일대일대응의 식","실수 전체에서 정의된 일차함수 "+m("f(x)="+R.rule(f))+"가 있다.");
    if(!A&&path==="restricted"&&grade==="high"){
      const center=rand(rng,-3,3), base=nz(rng), d=rand(rng,2,4), sign=pick(rng,[-1,1]);
      const t=center+sign*d, y=base+d*d;
      const shape=m("f(x)="+shift((center?"("+shift("x",center)+")":"x")+"^2",-base));
      const boundary=m("x"+(sign>0?"\\ge ":"\\le ")+center);
      const fNode=inputNode("제한된 정의역을 갖는 이차함수","함수 "+shape+"의 정의역은 "+boundary+"인 실수 전체이며 역함수가 존재한다.");
      // Reflect a line through the symmetry axis rather than giving a
      // second point directly in either function's coordinates.
      const slope=pick(rng,[-1,1]), intercept=t-slope*y;
      const gNode=inputNode("역함수와 만나는 직선","직선 "+m("y="+R.affine(slope,intercept))+"가 있다.");
      const other=2*center+1/slope-t;
      const second=(other-center)**2+base;
      const kept=[t,other].filter(x=>sign*(x-center)>=0&&x===slope*((x-center)**2+base)+intercept);
      if(kept.length!==1||kept[0]!==t||second===y)return null;
      const swapped=ctx.step("reflect-line","직선과 함께 좌표를 교환",m("x="+term(slope,"y")+(intercept?intercept<0?String(intercept):"+"+intercept:"")),[gNode]);
      const roots=ctx.step("quadratic-intersection","이차함수와 반사된 직선의 교점 후보",set([other,t]).text,[fNode,swapped]);
      const output=rng()<.5;
      const answer=output?point([y,t]):scalar(y);
      ctx.step("restrict-and-reflect","원함수의 정의역으로 해를 걸러 다시 좌표를 교환",answer.text,[roots,fNode]);
      return finish(ctx,"이 직선과 역함수의 그래프가 만나는 점의 "+(output?"좌표를":"가로 좌표를")+" 구하시오.",answer,[
        "교점의 좌표를 바꾸면 원래 이차함수 위에 있으므로 "+m("x="+term(slope,"f(x)")+(intercept?intercept<0?String(intercept):"+"+intercept:""))+"를 푼다.",
        "해는 "+set([other,t]).text+"이며, "+boundary+"에 속하는 것은 "+m(t)+"뿐이다. 다시 좌표를 바꾸면 "+m(pair(y,t))+"이다.",
      ],format,"high");
    }
    if(path==="restricted"){
      const h=rand(rng,-3,3),k=nz(rng), right=rng()<.5, d=rand(rng,2,4),s=right?1:-1;
      const q=t=>(t-h)**2+k, z=q(h+s*d);
      const tex=shift((h?"("+shift("x",h)+")":"x")+"^2",-k);
      const range=m("x"+(right?"\\ge ":"\\le ")+h);
      const fNode=inputNode("이차함수와 제한된 정의역","함수 "+m("f(x)="+tex)+"의 정의역은 "+range+"인 실수 전체이며 역함수가 존재한다.");
      const base=ctx.step("image","이차함수의 꼭짓점으로 치역 확인",m("y\\ge "+k),[fNode]);
      const target=pick(rng,["value","point","boundary"]);
      const roots=[h-d,h+d];
      if(roots.filter(t=>q(t)===z&&(right?t>=h:t<=h)).join()!==String(h+s*d))return null;
      const yNode=inputNode("역함수의 입력",m(z),false);

      const answer=target==="point"?point([z,h+s*d]):target==="boundary"?scalar(k):scalar(h+s*d);
      if(target==="boundary"){
        ctx.step("inverse-domain","원함수의 치역을 역함수의 정의역으로 사용",m(k),[base]);
        return finish(ctx,"역함수의 정의역에 속하는 가장 작은 실수를 구하시오.",answer,["역함수의 정의역은 원함수의 치역이며, 꼭짓점에서 최솟값을 갖는다."],format,"medium");
      }
      ctx.step("quadratic-preimage","두 제곱근에서 제한된 정의역에 속하는 해 선택",m(h+s*d),[base,yNode]);
      return finish(ctx,target==="point"?"역함수의 그래프에서 가로 좌표가 "+m(z)+"인 점의 좌표를 구하시오.":
        m(call("f^{-1}",z))+"의 값을 구하시오.",
        answer,["역함수의 입력을 원함수의 출력으로 놓고 식을 푼다. 두 해 중 "+range+"를 만족하는 해를 사용한다."],format,"medium");
    }
    if(path==="collision"&&rng()<.6){
      const h=nz(rng), target=rand(rng,-3,3), v=h+a*target;
      const first=inputNode("계수가 있는 일차함수","실수 전체에서 "+m("f(x)="+shift("ax",-h))+"인 일대일대응 "+m("f")+"가 있다.");
      const p=inputNode("원함수와 역함수의 관계",m("f^{-1}("+v+")="+target)+"이다.");
      if(!target||v===target||a===1||a===-1)return null;
      const slope=(v-h)/target;
      if(slope!==a||!R.close(R.value(line(1/a,-h/a),v),target))return null;
      const swapped=ctx.step("inverse-condition","역함숫값을 원함수의 등식으로 고침",m("f("+target+")="+v),[p]);
      const fit=ctx.step("recover-slope","아직 주어지지 않은 기울기 결정",m("a="+slope),[first,swapped]);
      const k=h/(1-a);
      if(!Number.isSafeInteger(k)||R.value(line(a,h),k)!==k||k===target)return null;
      const answer=rng()<.5?point([k,k]):scalar(2*k);
      const crossing=ctx.step("intersection","역함수의 그래프와 만나는 점 찾기",m(pair(k,k)),[fit]);
      if(answer.kind==="scalar")ctx.step("sum-coordinates","교점의 좌표를 합함",m(answer.value),[crossing]);
      return finish(ctx,"원함수와 역함수의 그래프가 만나는 점의 "+(answer.kind==="point"?"좌표를":"두 좌표의 합을")+" 구하시오.",answer,[
        "역함수 조건을 바꾸면 "+m("f("+target+")="+v)+"이다. 여기에 함수식을 대입하면 "+m("a="+slope)+"이다.",
        "기울기가 "+m(1)+"과 "+m(-1)+"이 아니므로 두 직선의 교점은 하나이다. "+m("f(x)=x")+"를 풀면 "+m("x="+k)+"이다.",
      ],format,"high");
    }
    if(path==="parameter"||path==="collision"){
      const x2=x+pick(rng,[-2,-1,1,2]), y2=R.value(f,x2);
      const mix=rng()<.5;
      const node=inputNode("함수식",
        "실수 전체에서 정의된 일차함수 "+m("f")+"가 다음 조건을 만족시킨다.");
      const p=inputNode(mix?"원함수 그래프 위의 점":"공개된 함숫값",mix?
        "원함수의 그래프가 점 "+m(pair(x,y))+"를 지난다.":m(call("f",x)+"="+y)+"이다.");
      const q=inputNode("역함수 조건",mix?"역함수의 그래프가 점 "+m(pair(y2,x2))+"를 지난다.":m(call("f^{-1}",y2)+"="+x2)+"이다.");
      const reflected=ctx.step("swap-coordinates","역함수의 조건을 원함수의 조건으로 전환",m(call("f",x2)+"="+y2),[q]);
      const slope=(y2-y)/(x2-x),offset=y-slope*x;
      if(slope!==a||offset!==b)return null;
      const recovered=ctx.step("recover-affine","서로 다른 두 점에서 일차함수 복원",m("f(x)="+R.rule(f)),[node,p,reflected]);
      const probe=x2+(x2>x?2:-2), out=R.value(f,probe);
      const output=pick(rng,grade==="high"?["intersection","point"]:["point","coefficients","value","intersection"]);
      const answer=output==="point"?point([out,probe]):output==="coefficients"?point([a,b]):scalar(probe);
      const fixed=b/(1-a);
      if(output==="intersection"&&!Number.isSafeInteger(fixed))return null;
      const final=output==="intersection"?scalar(fixed):answer;
      ctx.step(output==="intersection"?"fixed-point":output==="coefficients"?"read-coefficients":"inverse-projection",
        output==="intersection"?"원함수와 역함수의 공통점 결정":"복원한 식에서 답을 구함",final.text,[recovered]);
      if(output==="intersection"&&R.value(f,fixed)!==fixed)return null;
      const question=output==="point"?"역함수의 그래프 위에서 가로 좌표가 "+m(out)+"인 점의 좌표를 구하시오.":
        output==="coefficients"?m("f(x)=ax+b")+"로 나타낼 때, 순서쌍 "+m("(a,b)")+"를 구하시오.":
        output==="intersection"?"원함수와 역함수의 그래프의 교점의 가로 좌표를 구하시오.":m(call("f^{-1}",out))+"의 값을 구하시오.";
      return finish(ctx,question,final,[
        m(call("f^{-1}",y2)+"="+x2)+"에서 "+m(call("f",x2)+"="+y2)+"를 얻는다.",
        "두 함숫값을 이용해 일차함수를 정하면 "+m("f(x)="+R.rule(f))+"이다.",
        output==="intersection"?"기울기가 "+m(-1)+"이 아니므로 두 직선의 교점은 유일하다. "+m("f(x)=x")+"를 풀면 "+m(fixed)+"이다.":
          output==="coefficients"?"일차항의 계수와 상수항을 읽는다.":m(call("f",probe)+"="+out)+"에서 입력과 출력을 바꾼다.",
      ],format,grade==="high"?"high":"medium");
    }
    if(path==="rule"&&format!=="choice")return null;
    const plotted=(path==="point"||path==="reflect")&&Math.max(Math.abs(x),Math.abs(y))<=6&&rng()<.5;
    const fact=plotted?inputNode("좌표평면에 표시된 점","일대일대응 "+m("f")+"의 그래프가 아래 표시된 점을 지난다."):path==="point"||path==="reflect"?
      inputNode("일대일대응의 그래프","일대일대응 "+m("f")+"의 그래프가 점 "+m("P"+pair(x,y))+"를 지난다."):
      path==="pair"?inputNode("일대일대응의 함숫값","일대일대응 "+m("f")+"에서 "+m(call("f",x)+"="+y)+"이다."):affine();
    const inv=ctx.step("swap-coordinates","입력과 출력을 바꾸어 역함수 관계 생성",m(call("f^{-1}",y)+"="+x),[fact]);
    if(path==="rule"){
      const text=(v)=>m("f^{-1}(x)="+(a<0?"-":"")+"\\frac{"+shift("x",v)+"}{"+Math.abs(a)+"}");
      const answer=choice(rng,text(b),[-2,1,2].map(d=>text(b+d)));
      ctx.step("inverse-rule","입력과 출력을 바꾼 일차식 정리",answer.text,[inv]);
      return finish(ctx,"역함수 "+m("f^{-1}")+"의 식을 고르시오.",answer,[
        m("y="+R.rule(f))+"에서 "+m("x,y")+"를 바꾸고 "+m("y")+"에 대해 정리하면 "+answer.text+"이다.",
      ],format,"low");
    }
    const nzOffset=path==="pair"?y-2*rand(rng,-4,4):0;
    if(!A&&path==="reflect"){
      const d=nz(rng), dx=y+d;
      const extra=inputNode("이동하는 역함수의 그래프","역함수의 그래프를 "+m("x")+"축 방향으로 "+m(d)+"만큼 평행이동한다.");
      const answer=point([dx,x]);
      ctx.step("translate-inverse-point","좌표 교환 후 가로 이동",answer.text,[inv,extra]);
      return finish(ctx,"이동한 그래프에서 가로 좌표가 "+m(dx)+"인 점의 좌표를 구하시오.",answer,[
        "역함수의 그래프 위의 점은 "+m(pair(y,x))+"이고, 가로로 이동하면 "+answer.text+"이다.",
      ],format,"low",plotted?{plot:{kind:"function-points",points:[[x,y]]}}:undefined);
    }
    const question=path==="point"?"역함수의 그래프에서 가로 좌표가 "+m(y)+"인 점의 좌표를 구하시오.":
      path==="pair"?m("f^{-1}("+shift(term(2,"t"),-nzOffset)+")="+x)+"일 때, "+m("t")+"의 값을 구하시오.":m(call("f^{-1}",y))+"의 값을 구하시오.";
    const answer=path==="point"||path==="reflect"?point([y,x]):scalar(path==="pair"?(y-nzOffset)/2:x);
    ctx.step(path==="pair"?"inverse-input":path==="value"?"inverse-output":"reflect-point","역함수 관계에서 답을 읽음",answer.text,[inv]);
    return finish(ctx,question,answer,["원함수의 입력과 출력을 바꾸면 "+m(call("f^{-1}",y)+"="+x)+"이다.",
      ...(path==="pair"?[m(shift(term(2,"t"),-nzOffset)+"="+y)+"를 풀면 "+m("t="+answer.value)+"이다."]:[])],format,"low",plotted?{plot:{kind:"function-points",points:[[x,y]]}}:undefined);
  }

  const supports=(unit,goal)=>unit==="functions"&&["piece-compose","inverse","inverse-rule"].includes(goal);
  function generate(unit,goal,level,rng,format,grade,ctx){
    if(!supports(unit,goal))return null;
    return (goal==="piece-compose"?piecePractice:inversePractice)(rng,level,format,grade,ctx);
  }
  ForgeFunctionRelationPractice = globalThis.ForgeFunctionRelationPractice = Object.freeze({supports,generate});
})();


;

/* piece-function-synthesis.js */
(() => {
  "use strict";
  const {m,rand,pick,shift,scalar,set,point}=ForgeTopics;
  const R=ForgeFunctionRelations;
  const Search=ForgeRelationSearch;
  const sequence=(lo,hi)=>Array.from({length:hi-lo+1},(_,i)=>lo+i);
  const integer=Number.isSafeInteger;
  const same=(u,v)=>JSON.stringify(u)===JSON.stringify(v);
  const nonzero=rng=>pick(rng,[-3,-2,-1,1,2,3]);
  const near=(a,b)=>Math.abs(a-b)<1e-8;
  const variable=(formula,name)=>formula.replace(/x/g,name);

  const poly=(a,b,c=0)=>({a,b,c});
  const evaluate=({a,b,c},x)=>(a*x+b)*x+c;
  function polynomial({a,b,c}){
    if(!a)return R.affine(b,c);
    const head=(a===1?"":a===-1?"-":a)+"x^2";
    return shift(head+(b?(b===1?"+x":b===-1?"-x":(b>0?"+":"")+b+"x"):""),-c);
  }
  const affine=({a,b,c},x)=>c+b*x+a*x*x;
  function solveQuadratic({a,b,c}){
    if(!a)return b?[-c/b]:null;
    const d=b*b-4*a*c;
    return d<0?[]:R.uniq([(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)]);
  }
  const inBranch=(branch,x)=>(branch.lo===null||x>=branch.lo)&&(branch.hi===null||x<branch.hi);
  const defined=(f,x)=>Number.isFinite(x)&&f.branches.some(branch=>inBranch(branch,x));
  const apply=(f,x)=>defined(f,x)?evaluate(f.branches.find(branch=>inBranch(branch,x)).rule,x):undefined;
  function inverse(f,y){
    const roots=f.branches.flatMap(branch=>{
      const {a,b,c}=branch.rule;
      if(!a&&!b&&c===y)throw new RangeError("상수 구간 전체가 해입니다.");
      return (solveQuadratic(poly(a,b,c-y))??[]).filter(x=>inBranch(branch,x));
    });
    return R.uniq(roots);
  }
  function createMaps(rng,grade){
    const left=pick(rng,[-3,-2,-1,0,1,2]), right=left+rand(rng,1,3);
    const gap=rng()<.33;
    const degree=pick(rng,["affine","quadratic","piece"]);
    const h=rand(rng,-2,2);
    const g=degree==="piece"?{kind:"piece",branches:[
      {lo:null,hi:h,rule:poly(0,nonzero(rng),rand(rng,-3,3))},
      {lo:h,hi:null,rule:poly(0,nonzero(rng),rand(rng,-3,3))},
    ]}:{kind:degree,branches:[{lo:null,hi:null,rule:degree==="quadratic"?
      poly(pick(rng,[-1,1]),0,rand(rng,-4,2)):poly(0,nonzero(rng),rand(rng,-3,3))}]};
    const f={kind:gap?"partial-piece":"piece",branches:[
      {lo:null,hi:left,rule:poly(0,nonzero(rng),rand(rng,-4,4))},
      {lo:gap?right:left,hi:null,rule:poly(0,pick(rng,[0,1,2,-1,-2]),rand(rng,-4,4))},
    ]};
    if(f.branches[0].rule.b===f.branches[1].rule.b&&f.branches[0].rule.c===f.branches[1].rule.c)throw new RangeError("같은 식이 반복됩니다.");
    const hMap={kind:"affine",branches:[{lo:null,hi:null,rule:poly(0,nonzero(rng),rand(rng,-3,3))}]};
    return grade!=="low"&&rng()<.26?{f,g,h:hMap}:{f,g};
  }
  function renderMap(f,name,x,slot){
    const pieces=f.branches.map(({rule,lo,hi},i)=>{
      const base=polynomial({...rule,c:0});
      const ruleText=variable(slot?.branch===i?(base==="0"?"k":base+"+k"):polynomial(rule),x);
      const condition=lo===null?x+"<"+hi:x+"\\ge "+lo;
      return f.branches.length===1?ruleText:ruleText+"&"+condition;
    });
    return name+"("+x+")="+(pieces.length===1?pieces[0]:"\\begin{cases}"+pieces.join("\\\\")+"\\end{cases}");
  }

  // The same application node is usable for a direct value, an inverse
  // condition, or for an input-domain calculation. Its input can itself be
  // an application node or a free input.
  const join=(outer,inner)=>({outer,inner});
  const run=(chain,maps,x)=>apply(maps[chain.outer],apply(maps[chain.inner],x));
  const direct=(chain,maps,x)=>{
    const f=maps[chain.inner], g=maps[chain.outer];
    const i=f.branches.find(p=>inBranch(p,x));
    if(!i)return;
    const t=affine(i.rule,x), j=g.branches.find(p=>inBranch(p,t));
    return j&&affine(j.rule,t);
  };
  const name=chain=>"("+chain.outer+"\\circ "+chain.inner+")";
  function paths(maps,grade){
    const keys=Object.keys(maps);
    return keys.flatMap(inner=>keys.filter(outer=>
      (maps[inner].kind.includes("piece")||maps[outer].kind.includes("piece"))&&
      (inner!==outer||grade!=="low"&&maps[inner].kind==="piece")).map(outer=>join(outer,inner)));
  }
  const targets=[
    {id:"difference",grades:["medium","high"],form:"scalar",branches:2},
    {id:"preimage",grades:["low","medium","high"],form:"set",branches:1},
    {id:"image",grades:["low","medium"],form:"set",branches:1},
    {id:"domain",grades:["low","medium"],form:"set",branches:1},
    {id:"inverse-parameter",grades:["medium","high"],form:"scalar",branches:2},
    {id:"ordered-values",grades:["medium"],form:"point",branches:2},
    {id:"fixed-inputs",grades:["high"],form:"set",branches:1},
  ];
  function build(rng,grade){
    const maps=createMaps(rng,grade), pool=paths(maps,grade);
    const target=pick(rng,targets.filter(item=>!grade||item.grades.includes(grade)));
    const first=pick(rng,pool), other=pool.find(path=>path.inner===first.outer&&path.outer===first.inner)??first;
    const partners=pool.filter(path=>path!==first&&path.inner!==path.outer);
    const second=target.branches===2?(rng()<.58?other:pick(rng,partners)):first;
    const lo=rand(rng,-5,-2),hi=lo+rand(rng,5,9), xs=sequence(lo,hi);
    const usable=chain=>xs.filter(x=>Number.isSafeInteger(run(chain,maps,x)));
    const U=usable(first), V=usable(second);
    if(!U.length||!V.length)return null;
    const x=pick(rng,U),z=pick(rng,V), y=run(first,maps,x),w=run(second,maps,z);
    if(!xs.every(x=>[first,second].every(chain=>Object.is(run(chain,maps,x),direct(chain,maps,x)))))return null;
    return {maps,target,first,second,lo,hi,xs,U,V,x,z,y,w};
  }
  function generate(rng,format,grade,makeContext){
    const plan=build(rng,grade);
    if(!plan)return null;
    const {maps,target,first,second,lo,hi,xs,U,x,z,y,w}=plan;
    const symbol=pick(rng,["x","y","t"]);
    const f=name(first),g=name(second), ctx=makeContext();
    const finiteDomain=()=>ctx.source("입력 범위",m(lo+"\\le "+symbol+"\\le "+hi)+"인 정수만 고려한다.");
    const sources=new Map();
    const given=(key,slot)=>{
      if(!sources.has(key))sources.set(key,ctx.source("함수식",m(renderMap(maps[key],key,symbol,slot))+"이다."));
      return sources.get(key);
    };
    const use=(chain,slot)=>{
      return [...new Set([chain.outer,chain.inner].sort().map(key=>given(key,slot?.key===key?slot:null)))];
    };
    const chainType=chain=>maps[chain.inner].kind+"-"+maps[chain.outer].kind+(chain.inner===chain.outer?"-self":"");
    const application=(chain,x,y,source)=>ctx.step("composition-"+chainType(chain),
      "합성함수의 출력 결정",m(name(chain)+"("+x+")="+y),source);
    const done=(question,answer,solution,rank)=>{
      const result=ctx.finish(question,answer,solution,format,{relationGrade:rank});
      const graph=result.inspection.graph;
      const structure=Search.signature(graph);
      return {...result,answerPath:{...result.answerPath,id:"function/"+structure+"/"+result.answer.kind},
        inspection:{...result.inspection,structure}};
    };

    if(target.id==="inverse-parameter"){
      if(first.inner===first.outer||second.inner===second.outer||f===g)return null;
      const shared=[first.inner,first.outer].filter(key=>[second.inner,second.outer].includes(key));
      if(!shared.length)return null;
      const key=pick(rng,shared), branch=rand(rng,0,maps[key].branches.length-1);
      const slot={key,branch};
      const truth=maps[key].branches[branch].rule.c;
      const candidates=sequence(-5,5);
      const models=candidates.map(k=>{
        const changed={...maps,[key]:{...maps[key],branches:maps[key].branches.map((p,i)=>i===branch?{...p,rule:{...p.rule,c:k}}:p)}};
        return {k,changed};
      });
      const conditions=[{chain:first,input:x,value:y},{chain:second,input:z,value:w}].map(c=>({...c,
        accept:row=>run(c.chain,row.changed,c.input)===c.value}));
      const paired=grade==="high"||!grade&&rng()<.5;
      if(!paired)conditions.pop();
      const conditionText=c=>m(name(c.chain)+"("+c.input+")="+c.value);
      const result=Search.solve({models,conditions,project:row=>row.k,
        check:(row,conditions)=>conditions.every(({chain,input,value})=>direct(chain,row.changed,input)===value)});
      if(!result||result.answer.length!==1||result.answer[0]!==truth)return null;
      const left=use(first,slot), right=paired?use(second,slot):null;
      ctx.publish("정수 "+m("k")+"의 범위는 "+m("-5\\le k\\le 5")+"이다.");
      ctx.publish(conditions.map(conditionText).join(", ")+"이다.");
      const derived=conditions.map((c,i)=>{
        const input=ctx.source("공개된 합성함숫값",conditionText(c),false);
        return ctx.step("parameter-fibre-"+chainType(c.chain),"합성 조건에서 가능한 계수",set(models.filter(c.accept).map(row=>row.k)).text,[...(i?right:left),input]);
      });
      const param=paired?ctx.step("intersect-parameter-candidates","두 합성 조건에 공통인 계수",m(truth),derived):derived[0];
      const chosen=pick(rng,["parameter","parameter","branch-value","point"]);
      const activeBranch=maps[key].branches[branch];
      const input=(activeBranch.lo??(activeBranch.hi===null?2:activeBranch.hi-2))+1;
      const value=apply(maps[key],input);
      if(chosen!=="parameter"&&!inBranch(activeBranch,input))return null;
      const answer=chosen==="point"?point([input,value]):scalar(chosen==="branch-value"?value:truth);
      if(chosen!=="parameter")ctx.step(chosen,"복원한 함수의 그래프 위의 점 또는 함숫값",answer.text,[param]);
      const expr=key+"("+input+")";
      const question=chosen==="parameter"?m("k")+"의 값을 구하시오.":chosen==="branch-value"?m(expr)+"의 값을 구하시오.":
        "함수 "+m(key)+"의 그래프 위에서 "+m(symbol+"="+input)+"인 점의 좌표를 구하시오.";
      return done(question,answer,[
        ...conditions.map(c=>conditionText(c)+"를 만족시키는 "+m("k")+"의 값은 "+set(models.filter(c.accept).map(row=>row.k)).text+"이다."),
        ...(paired?["두 조건에 공통으로 들어 있는 값은 "+m(truth)+"이다."]:[]),
        ...(chosen!=="parameter"?[m("k="+truth)+"를 함수식에 넣으면 "+m(expr+"="+value)+"이다."]:[]),
      ],paired?"high":"medium");
    }
    if(target.id==="preimage"){
      if(grade==="low"&&maps[first.inner].kind==="quadratic")return null;
      let roots;
      try{roots=R.uniq(inverse(maps[first.outer],y).flatMap(t=>inverse(maps[first.inner],t)));}catch(error){
        if(error instanceof RangeError)return null;
        throw error;
      }
      if(!roots.length||!roots.every(t=>integer(t)&&near(run(first,maps,t),y))||
        !same(roots.filter(t=>xs.includes(t)),xs.filter(t=>direct(first,maps,t)===y)))return null;
      const rank=roots.length>=3?"high":roots.length===2?"medium":"low";
      if(grade&&rank!==grade)return null;
      use(first);
      const pub=ctx.source("공개된 출력",m(f+"("+symbol+")="+y),false);
      const mid=inverse(maps[first.outer],y);
      const outer=ctx.step("outer-preimage-"+maps[first.outer].kind,"바깥 함수의 각 구간에서 역산",m(R.list(mid)),[given(first.outer),pub]);
      const inner=ctx.step("inner-preimage-"+chainType(first),"안쪽 함수의 원상과 구간 조건 확인",set(roots).text,[outer,given(first.inner)]);
      const ask=roots.length>1?pick(rng,["set","count","minimum","maximum"]):pick(rng,["set","set","value"]);
      const answer=ask==="set"?set(roots):scalar(ask==="count"?roots.length:ask==="maximum"?roots.at(-1):roots[0]);
      if(ask!=="set")ctx.step(ask,"해에서 요구한 결과",answer.text,[inner]);
      const restriction=m(f+"("+symbol+")="+y)+"를 만족하는 실수 "+m(symbol);
      const question=ask==="set"?restriction+"를 모두 구하시오.":ask==="count"?restriction+"의 개수를 구하시오.":
        restriction+"의 "+(ask==="minimum"?"최솟값":ask==="maximum"?"최댓값":"값")+"을 구하시오.";
      return done(question,answer,[
        "먼저 바깥 함수에 넣을 수 있는 값은 "+m(R.list(mid))+"이다. 각 값이 안쪽 함수의 출력이 되는 입력을 찾고 구간 조건을 확인한다.",
        "원래 합성식에 대입해 확인한 해는 "+set(roots).text+"이다.",
        ...(ask==="set"?[]:["따라서 요구한 값은 "+m(answer.value)+"이다."]),
      ],rank);
    }
    if(target.id==="image"||target.id==="domain"||target.id==="fixed-inputs"){
      const active=U;
      const values=target.id==="domain"?active:target.id==="image"?R.uniq(active.map(x=>run(first,maps,x))):active.filter(x=>run(first,maps,x)===x);
      if(target.id==="domain"&&(active.length===xs.length||active.length<2)||target.id==="image"&&values.length<2||
        target.id==="fixed-inputs"&&(!values.length||values.length===active.length)||values.some(value=>Math.abs(value)>50))return null;
      const rank=target.id==="fixed-inputs"?"high":maps[first.inner].kind==="quadratic"||maps[first.outer].kind==="partial-piece"?"medium":"low";
      if(grade&&rank!==grade)return null;
      const ids=use(first), universe=finiteDomain();
      const valid=ctx.step("composition-domain-"+chainType(first),"두 단계가 모두 정의되는 입력",set(active).text,[...ids,universe]);
      if(target.id!=="domain")ctx.step(target.id==="image"?"image":"fixed-inputs","허용된 입력에서 결과 결정",set(values).text,[valid]);
      const question=target.id==="domain"?m(f+"("+symbol+")")+"가 정의되는 "+m(symbol)+"를 모두 구하시오.":
        target.id==="image"?m(f)+"가 정의되는 입력에서 나오는 함숫값을 모두 구하시오.":
          m(f+"("+symbol+")="+symbol)+"를 만족하는 "+m(symbol)+"를 모두 구하시오.";
      return done(question,set(values),["안쪽 함수의 출력이 바깥 함수의 정의역에 속하는 입력은 "+set(active).text+"이다.",
        ...(target.id==="domain"?[]:["이 입력에 대해 요구한 결과를 구하면 "+set(values).text+"이다."])],rank);
    }

    const cross=f!==g&&first.inner!==first.outer&&second.inner!==second.outer;
    if(!cross||!integer(y)||!integer(w)||y===w||Math.max(Math.abs(y),Math.abs(w))>50)return null;
    const left=application(first,x,y,use(first)),right=application(second,z,w,use(second));
    const ordered=target.id==="ordered-values";
    const kind=ordered?"ordered-pair":pick(rng,["difference","sum"]);
    const answer=ordered?point([y,w]):scalar(kind==="difference"?y-w:y+w);
    ctx.step(kind,"두 합성에서 얻은 값으로 결과 결정",answer.text,[left,right]);
    const pair="("+f+"("+x+"),"+g+"("+z+"))";
    const question=ordered?"순서쌍 "+m(pair)+"를 구하시오.":
      m(f+"("+x+")"+(kind==="difference"?"-":"+")+g+"("+z+")")+"의 값을 구하시오.";
    const rank="medium";
    if(grade&&rank!==grade)return null;
    return done(question,answer,[m(f+"("+x+")="+y)+", "+m(g+"("+z+")="+w)+"이다.",
      ordered?"두 값을 순서대로 적는다.":"따라서 구하는 값은 "+m(answer.value)+"이다."],rank);
  }

  ForgePieceFunctionSynthesis = globalThis.ForgePieceFunctionSynthesis = Object.freeze({generate});
})();


;

/* finite-function-synthesis.js */
(() => {
  "use strict";
  const {m,pick,rand,set,scalar}=ForgeTopics;
  const goals=new Map([["count","함수"],["injections","일대일함수"],["bijections","일대일대응"]]);
  const integers=n=>Array.from({length:n},(_,i)=>i);
  const cardinality=xs=>new Set(xs).size;

  function enumerate(inputs,outputs){
    return inputs.reduce(rows=>rows.flatMap(row=>outputs.map(y=>[...row,y])),[[]]);
  }
  const modules=[
    {id:"equal", describe:([i,j])=>m("f("+i+")=f("+j+")"), read:([i,j],row)=>row[i]===row[j]},
    {id:"order", describe:([i,j])=>m("f("+i+")<f("+j+")"), read:([i,j],row)=>row[i]<row[j]},
    {id:"sum", describe:([i,j,v])=>m("f("+i+")+f("+j+")="+v), read:([i,j,v],row)=>row[i]+row[j]===v},
    {id:"value", describe:([i,v])=>m("f("+i+")="+v), read:([i,v],row)=>row[i]===v},
    {id:"image-size", describe:([v])=>"치역의 원소 수가 "+m(v)+"개이다", read:([v],row)=>cardinality(row)===v},
  ];
  function goalAccepts(goal,row,n){
    const unique=cardinality(row);
    return goal==="count"||(unique===row.length&&(goal!=="bijections"||unique===n));
  }
  function generate(goal,rng,format,requested,makeContext){
    const grade=requested??pick(rng,["low","medium","high"]);
    const size=rand(rng,3,4), n=goal==="bijections"?size:rand(rng,goal==="injections"?size:3,5);
    const inputs=integers(size),start=rand(rng,-3,2), outputs=integers(n).map(i=>start+i);
    const models=enumerate(inputs,outputs).filter(row=>goalAccepts(goal,row,n));
    const seed=pick(rng,models), i=rand(rng,0,size-1), j=pick(rng,inputs.filter(v=>v!==i));
    const atoms=modules.flatMap(module=>{
      const pairs=inputs.flatMap(a=>inputs.filter(b=>a!==b).map(b=>[a,b]));
      const args=module.id==="image-size"?[[cardinality(seed)]]:module.id==="value"?inputs.map(a=>[a,seed[a]]):
        pairs.map(([a,b])=>module.id==="sum"?[a,b,seed[a]+seed[b]]:[a,b]);
      return args.filter(xs=>module.read(xs,seed)).map(xs=>({module,args:xs,accept:row=>module.read(xs,row)}));
    });
    if(!atoms.length)return null;
    const conditions=[pick(rng,atoms)];
    if(grade!=="low"){
      const next=atoms.filter(atom=>atom.module.id!==conditions[0].module.id);
      if(!next.length)return null;
      conditions.push(pick(rng,next));
    }
    const target=grade==="low"||rng()<.40?"count":pick(rng,["image","possible-value","extremum"]);
    const input=pick(rng,[i,j]);
    const direction=rng()<.5?"maximum":"minimum";
    const project=row=>target==="count"?row:target==="image"?cardinality(row):row[input];
    const reduce=values=>target==="count"?values.length:target==="extremum"?
      Math[direction==="maximum"?"max":"min"](...values):ForgeFunctionRelations.uniq(values);
    const checked=ForgeRelationSearch.solve({models,conditions,project,reduce});
    if(!checked||grade==="high"&&(checked.survivors.length<2||conditions.filter(({module})=>module.id!=="value").length<2))return null;
    // Traverse inputs in the opposite order and enforce injectivity while
    // constructing the correspondence, without using the candidate generator.
    const valid=[];
    function visit(partial,index,used){
      if(index<0){
        if(conditions.every(atom=>atom.accept(partial)))valid.push(partial);
        return;
      }
      for(const y of outputs)if(goal==="count"||!used.has(y)){
        const row=partial.slice();row[index]=y;
        visit(row,index-1,new Set([...used,y]));
      }
    }
    visit([],size-1,new Set());
    if(valid.length!==checked.survivors.length||JSON.stringify(reduce(valid.map(project)))!==JSON.stringify(checked.answer))return null;
    const ctx=makeContext(), name=goals.get(goal);
    const src=ctx.source("정의역과 공역",m("X="+ForgeFunctionRelations.list(inputs))+", "+m("Y="+ForgeFunctionRelations.list(outputs))+"이다.");
    ctx.publish(m("X")+"에서 "+m("Y")+"로 가는 "+name+" "+m("f")+" 중 다음 조건을 만족하는 것만 생각하자.");
    const statements=conditions.map(({module,args})=>module.describe(args));
    ctx.publish(statements.map(text=>text+(text.endsWith("이다")?".":"가 성립한다.")).join(" "));
    const steps=conditions.map((atom,k)=>{
      const fact=ctx.source("공개 조건",statements[k],false);
      return ctx.step(atom.module.id,"대응 후보에 조건 적용",m(models.filter(atom.accept).length)+"개",[src,fact]);
    });
    const answer=Array.isArray(checked.answer)?set(checked.answer):scalar(checked.answer);
    ctx.step(target+"-"+goal,"조건을 만족하는 대응에서 답 결정",answer.text,steps);
    const question=target==="count"?"이러한 "+name+"의 개수를 구하시오.":
      target==="image"?"치역의 원소 수로 가능한 값을 모두 구하시오.":
      target==="extremum"?m("f("+input+")")+"의 "+(direction==="minimum"?"최솟값":"최댓값")+"을 구하시오.":
      m("f("+input+")")+"로 가능한 값을 모두 구하시오.";
    const solution=[...(goal==="count"?[]:["함숫값이 서로 다른 대응만 고려한다." ]),
      "정의역의 각 원소에 공역의 원소를 대응시킨 다음 공개된 조건을 각각 확인한다.",
      "조건을 만족하는 대응은 "+m(valid.length)+"개이며, 요구한 결과는 "+(answer.kind==="scalar"?m(answer.value):answer.text)+"이다."];
    const result=ctx.finish(question,answer,solution,format,{relationGrade:grade});
    const structure=ForgeRelationSearch.signature(result.inspection.graph);
    return {...result,answerPath:{...result.answerPath,id:"function/"+structure+"/"+result.answer.kind},
      inspection:{...result.inspection,structure,conditions:checked.effects.map(({removed})=>
        "‘"+removed.module.describe(removed.args)+"’ 조건을 빼면 답이 달라진다.")}};
  }
  ForgeFiniteFunctionSynthesis = globalThis.ForgeFiniteFunctionSynthesis = Object.freeze({supports:goal=>goals.has(goal),generate});
})();


;

/* algebra-synthesis.js */
(() => {
  "use strict";
  const {m,rand,pick,set,scalar,shift}=ForgeTopics;
  const R=ForgeFunctionRelations;
  const S=ForgeRelationSearch;
  const rationalGoals=new Set(["reduce","add","multiply","expr-domain"]);
  const radicalGoals=new Set(["simplify","rationalize"]);
  function fraction(a,b){
    const sign=typeof a==="number"&&a<0?"-":"";
    return sign+"\\frac{"+(sign?-a:a)+"}{"+b+"}";
  }
  const square=n=>n*n;
  const operation={
    plus:{symbol:"+",apply:(u,v)=>u+v},
    minus:{symbol:"-",apply:(u,v)=>u-v},
    times:{symbol:"\\cdot ",apply:(u,v)=>u*v},
    quotient:{symbol:"\\div ",apply:(u,v)=>v===0?NaN:u/v},
  };
  const leaf=(render,value,verify=value)=>({render,value,verify,dependencies:new Set()});
  function relation(id,l,r){
    const op=operation[id];
    const evaluate=(method,x,k)=>{
      const a=l[method](x,k), b=r[method](x,k);
      return Number.isFinite(a)&&Number.isFinite(b)?op.apply(a,b):NaN;
    };
    return {render:(x,k)=>"\\left("+l.render(x,k)+op.symbol+r.render(x,k)+"\\right)",
      value:(x,k)=>evaluate("value",x,k),
      verify:(x,k)=>evaluate("verify",x,k),
      dependencies:new Set([...l.dependencies,...r.dependencies,id])};
  }
  function model(unit,goal,rng){
    const x=pick(rng,["x","t"]), k=pick(rng,["a","k"]), h=rand(rng,-4,2), j=h+rand(rng,1,4);
    const c=rand(rng,1,3), d=pick(rng,[2,3,5]), root="\\sqrt{"+d+"}";
    const xs=Array.from({length:9},(_,i)=>h-3+i);
    let first, second;
    if(unit==="rational"){
      const factor=shift(x,h), other=shift(x,j);
      const a=leaf((_,name)=>fraction(goal==="reduce"?name+"("+factor+")":name,
        goal==="reduce"?"("+factor+")("+other+")":factor),
      (t,n)=>goal==="reduce"?(t===h||t===j?NaN:n/(t-j)):n/(t-h),
      (t,n)=>goal==="reduce"?n*(t-h)/((t-h)*(t-j)):n/(t-h));
      const b=leaf(()=>fraction(c,goal==="reduce"?factor:other),
        t=>c/(t-(goal==="reduce"?h:j)));
      const bridge=pick(rng,goal==="multiply"?["times","quotient"]:["plus","minus"]);
      first=relation(bridge,a,b);
      if(goal==="expr-domain"&&rng()<.6)first=relation("quotient",first,leaf(()=>shift(x,j+1),t=>t-j-1));
      second=relation(pick(rng,["plus","minus","times"]),a,leaf(()=>fraction(1,other),t=>1/(t-j)));
    }else{
      const p=rand(rng,2,4);
      const a=leaf((_,name)=>goal==="rationalize"?fraction(name,root):name+"\\sqrt{"+p*p*d+"}",
        (_,n)=>goal==="rationalize"?n/d:p*n,
        (_,n)=>(goal==="rationalize"?n/Math.sqrt(d):n*Math.sqrt(p*p*d))/Math.sqrt(d));
      const b=leaf(()=>algebraic(c,root),()=>c,()=>c*Math.sqrt(d)/Math.sqrt(d));
      first=relation(pick(rng,["plus","minus"]),a,b);
      second=relation(pick(rng,["plus","minus"]),a,leaf(()=>root,()=>1));
    }
    return {x,k,d,first,second,xs};
  }
  const visible=(node,x,k)=>node.render(x,k).replace(/^\\left\((.*)\\right\)$/,"$1");
  const valueAt=(node,x,a,independent)=>node[independent?"verify":"value"](x,a);
  function number(n){
    if(Number.isInteger(n))return String(n);
    let denominator=1;
    while(denominator<1000&&Math.abs(n*denominator-Math.round(n*denominator))>1e-8)denominator++;
    return fraction(Math.round(n*denominator),denominator);
  }
  const algebraic=(value,root)=>value===0?"0":value===1?root:value===-1?"-"+root:number(value)+root;
  function generate(unit,goal,rng,format,grade,makeContext){
    const {x,k,d,first,second,xs}=model(unit,goal,rng);
    const rational=unit==="rational", ctx=makeContext();
    const parameter=rand(rng,1,4), usable=xs.filter(t=>Number.isFinite(first.value(t,parameter)));
    if(usable.length===0)return null;
    const candidates=[-4,-3,-2,-1,0,1,2,3,4];
    const target=pick(rng,goal==="expr-domain"?["domain","all","count"]:rational?
      ["parameter","evaluate","all","count"]:["parameter","coefficient","squared"]);
    const actual=["parameter","domain"].includes(target)?"low":
      target==="count"||target==="squared"?"high":"medium";
    if(grade&&grade!==actual)return null;
    const places=usable.filter(t=>{
      const n=first.value(t,parameter);
      return Number.isFinite(n)&&Math.abs(n)<100&&Math.abs(n-Math.round(n*1000)/1000)<1e-9;
    });
    if(!places.length)return null;
    const at=pick(rng,places), to=pick(rng,xs.filter(t=>Number.isFinite(second.value(t,parameter))));
    const expected=Math.round(first.value(at,parameter)*1000)/1000;
    const intro=ctx.source("관계식",m("F"+(rational?"("+x+")":"")+"="+visible(first,x,k))+"라 하자.");
    const publicValue=t=>rational?"F("+t+")":"F";
    const eq=(a,b)=>Math.abs(a-b)<1e-9;
    const sidesAgree=(node,t,n)=>{
      const a=node.value(t,n), b=node.verify(t,n);
      return Number.isFinite(a)?eq(a,b):!Number.isFinite(b);
    };
    if(!xs.every(t=>candidates.every(n=>sidesAgree(first,t,n)&&sidesAgree(second,t,n))))return null;

    if(target==="domain"){
      ctx.publish(m(k+"="+parameter)+"이고, "+m(xs[0]+"\\le "+x+"\\le "+xs.at(-1))+"인 정수만 고려하자.");
      // The bounds are an explicit source so that this graph distinguishes a
      // domain intersection from an inverse equation.
      const scope=ctx.source("정수 입력 범위",m(R.list(xs)),false);
      const answer=pick(rng,["set","count"])==="set"?set(usable):scalar(usable.length);
      const coefficient=ctx.source("공개 계수",m(k+"="+parameter),false);
      const domain=ctx.step("defined-"+[...first.dependencies].join("-"),"원래 식이 정의되는 입력",set(usable).text,[intro,scope,coefficient]);
      if(answer.kind==="scalar")ctx.step("count","정의 가능한 입력의 개수",m(answer.value),[domain]);
      return finish(ctx,format,actual,
        m("F("+x+")")+"가 정의되는 정수 "+m(x)+(answer.kind==="scalar"?"의 개수를":"를 모두")+" 구하시오.",answer,
        ["분모와 나누는 식이 각각 0이 되는지 확인한다.","정의되는 입력을 모으면 "+set(usable).text+"이다."]);
    }
    if(target==="all"||target==="count"){
      ctx.publish(m(k+"="+parameter)+"이고, "+m(xs[0]+"\\le "+x+"\\le "+xs.at(-1))+"인 정수만 고려하자.");
      const bound=ctx.source("정수 입력 범위",m(R.list(xs)),false);
      const threshold=expected, cmp=pick(rng,[">","<","="]);
      const predicate=(t,independent=false)=>{
        const value=valueAt(first,t,parameter,independent);
        return Number.isFinite(value)&&(cmp===">"?value>threshold&&!eq(value,threshold):cmp==="<"?value<threshold&&!eq(value,threshold):eq(value,threshold));
      };
      const condition=m(publicValue(x)+cmp+number(threshold));
      const given=ctx.source("원래 식의 함숫값 조건",condition,false);
      const conditions=[{accept:t=>predicate(t)}];
      const thresholdTwo=second.value(to,parameter);
      const comparison=(t,independent=false)=>{
        const value=valueAt(second,t,parameter,independent);
        return Number.isFinite(value)&&value>=thresholdTwo-1e-9;
      };
      const compareText=m("G("+x+")\\ge "+number(thresholdTwo));
      const extra=target==="count"?ctx.source("두 번째 식",m("G("+x+")="+visible(second,x,k))+"라 하자."):null;
      if(extra)conditions.push({accept:t=>comparison(t)});
      const proof=S.solve({models:xs,conditions,project:t=>t,
        check:t=>predicate(t,true)&&(!extra||comparison(t,true))});
      if(!proof)return null;
      const unique=R.uniq(proof.answer);
      const answer=target==="count"?scalar(unique.length):set(unique);
      const domain=ctx.step("defined-"+[...first.dependencies].join("-"),"정의 조건 확인",set(usable).text,[intro,bound]);
      const result=ctx.step("compare-"+{">":"greater","<":"less","=":"equal"}[cmp],"부등식 또는 등식이 성립하는 입력",set(unique).text,[domain,given]);
      if(extra){
        const secondCondition=ctx.source("두 번째 식의 출력 조건",compareText,false);
        ctx.step("intersection-and-count","두 부등식을 동시에 만족하는 입력의 개수",m(unique.length),[result,extra,secondCondition]);
      }
      return finish(ctx,format,actual,condition+(extra?"이고 "+compareText:"")+"를 만족하는 "+m(x)+(target==="count"?"의 개수를":"를 모두")+" 구하시오.",answer,
        ["원래 식을 정의하는 입력만 남긴다.","각 입력에서 "+(extra?"두 조건을":"조건을")+" 확인하면 "+set(unique).text+"이다."]);
    }
    const observation=ctx.source("공개된 식의 값",m(publicValue(at)+"="+(rational?number(expected):algebraic(expected,"\\sqrt{"+d+"}")))+"이다.");
    const proof=S.solve({models:candidates,conditions:[{accept:n=>eq(first.value(at,n),expected)}],project:n=>n,
      check:n=>eq(first.verify(at,n),expected)});
    if(!proof||proof.answer.length!==1||proof.answer[0]!==parameter)return null;
    // The normalized observation is linear in the unknown except when it
    // occurs as a divisor. A check on its affine slope or reciprocal form
    // rules out other real parameters as well.
    const slope=first.value(at,2)-first.value(at,1);
    if(eq(slope,0)||!eq(slope,first.value(at,3)-first.value(at,2)))return null;
    const step=ctx.step("inverse-"+[...first.dependencies].join("-"),"식을 정리해 미지 계수 결정",m(k+"="+parameter),[intro,observation]);
    const solution=["공개된 값을 원래 식에 넣고 정리하면 "+m(k+"="+parameter)+"이다."];
    if(target==="parameter")return finish(ctx,format,actual,m(k)+"의 값을 구하시오.",scalar(parameter),solution);
    const expression=visible(second,x,k);
    const other=ctx.source("복원한 계수를 사용하는 식",m("G"+(rational?"("+x+")":"")+"="+expression)+"라 하자.");
    const normalization=second.value(to,parameter);
    const value=target==="squared"?square(normalization)*d:normalization;
    if(!Number.isSafeInteger(value))return null;
    if(Math.abs(value)>100||eq(normalization,second.value(to,parameter+1)))return null;
    const answer=scalar(value);
    ctx.step(target+"-"+[...second.dependencies].join("-"),"복원한 계수를 다른 식에 적용",m(value),[step,other]);
    return finish(ctx,format,actual,target==="evaluate"?m("G("+to+")")+"의 값을 구하시오.":
      target==="squared"?m("G^2")+"의 값을 구하시오.":m("G=b\\sqrt{"+d+"}")+"일 때 상수 "+m("b")+"의 값을 구하시오.",
    answer,[...solution,"이 값을 다른 식에 대입하면 "+(rational?m("G("+to+")="+value):m("G="+algebraic(normalization,"\\sqrt{"+d+"}")))+"이다."]);
  }
  function finish(ctx,format,grade,question,answer,solution){
    const result=ctx.finish(question,answer,solution,format,{relationGrade:grade});
    const structure=S.signature(result.inspection.graph);
    return {...result,answerPath:{...result.answerPath,id:"function/"+structure+"/"+result.answer.kind},inspection:{...result.inspection,structure}};
  }
  ForgeAlgebraSynthesis = globalThis.ForgeAlgebraSynthesis = Object.freeze({generate,supports:(unit,goal)=>
    (unit==="rational"?rationalGoals:unit==="radical"?radicalGoals:new Set()).has(goal)});
})();


;

/* function-compiler.js */
(() => {
  "use strict";
  const {m,rand,pick,problem,scalar,point,set,choice,shift,term}=ForgeTopics;
  const R=ForgeFunctionRelations, {list,uniq,same,rule,sample,close,apply,affine}=R;
  const yes=value=>({kind:"truth",value:value?"참":"거짓",text:value?"참":"거짓"});
  const interval=bounds=>({kind:"interval",value:bounds,text:R.intervalText(bounds)});
  const pairText=([x,y])=>"("+x+","+y+")";
  const names="fghpqrst";
  function tableText(name,f){
    const domain="정의역은 "+m(list(f.xs));
    const codomain=same(f.xs,f.codomain)?"정의역과 공역은 모두 "+m(list(f.xs)):domain+"이고 공역은 "+m(list(f.codomain));
    const values=f.xs.map((x,i)=>m(name+"("+x+")="+f.ys[i]));
    return "함수 "+m(name)+"의 "+codomain+"이다. "+values.join(", ")+"이다.";
  }
  const isExpression=new Set(["expression","fraction","expr-domain","reduce","add","multiply","simplify","rationalize"]);
  const categories={identity:"항등함수",constant:"상수함수",injective:"일대일함수",bijective:"일대일대응"};
  function property(f,goal){
    const injective=uniq(f.ys).length===f.xs.length;
    return {identity:f.xs.every((x,i)=>x===f.ys[i]),constant:uniq(f.ys).length===1,injective,
      bijective:injective&&same(uniq(f.ys),f.codomain)}[goal];
  }
  function context(level,rng){
    const steps=[], facts=[];
    function source(label,text,visible=true){
      const id="n"+steps.length;
      steps.push({id,operation:"given",label,prose:text,from:[],depth:0});
      if(visible)facts.push(text);
      return id;
    }
    function step(operation,label,text,from){
      const id="n"+steps.length, depth=1+Math.max(...from.map(key=>steps.find(s=>s.id===key).depth));
      steps.push({id,operation,label,prose:text,from,depth});
      return id;
    }
    function finish(question,answer,solution,format,extra={}){
      const graph=[];
      for(const {depth,...node} of steps)(graph[depth]??=[]).push(node);
      const structure=steps.filter(node=>node.operation!=="given").map(node=>node.operation+
        "("+node.from.map(id=>steps.find(parent=>parent.id===id).operation).join(",")+")").join("/");
      const data=problem(facts.filter(Boolean).join(" "),[],answer.kind==="choice"?question.replace(/구하시오\.$/,"고르시오."):question,answer,solution);
      const presented=format==="choice"&&answer.kind==="truth"?{...data,question:question.replace("판별하시오.","고르시오."),
        answer:choice(rng,answer.value,[answer.value==="참"?"거짓":"참"])}:ForgeVariations.present({...data,allowNegative:true},format,rng);
      return {...presented,...extra,format:"tex",actionHistory:[],
        answerPath:{id:"function/"+structure+"/"+presented.answer.kind,label:steps.at(-1)?.label??"함수 관계",
          operations:steps.filter(node=>node.operation!=="given").map(node=>node.operation)},
        inspection:{environment:"expression",verified:true,structure,graph,concepts:uniqLabels(steps),
          conditions:["공개 조건과 함수 관계를 계산하여 답을 확인"],variables:[...steps.filter(node=>node.operation==="given"&&node.prose).map((node,i)=>({key:String(i+1),value:node.prose,label:node.label,given:true})),{key:"답",value:answer.text,label:"구할 값",target:true}]}};
    }
    return {source,step,finish,publish:text=>facts.push(text)};
  }
  const uniqLabels=steps=>[...new Set(steps.filter(node=>node.operation!=="given").map(node=>node.label))];
  function coordinateAnswers(points,rng,format){
    const correct=m(list(points.map(pairText)));
    return format==="written"?{kind:"point-set",value:points,text:correct}:
      choice(rng,correct,[1,2,3].map(d=>m(list(points.map(([x,y])=>pairText([x,y+d]))))));
  }
  function finiteProblem(goal,level,rng,format){
    const ctx=context(level,rng);
    const finish=(q,a,s,extra)=>ctx.finish(q,a,s,format,extra);
    const src=(name,f)=>ctx.source("함수의 대응",tableText(name,f));
    const raw=sample("table",rng), n=raw.xs.length;
    const permutation=ys=>{const a=[...ys];for(let i=a.length-1;i>0;i--){const j=rand(rng,0,i);[a[i],a[j]]=[a[j],a[i]];}return a;};
    const endomorphism=xs=>R.finite(xs,permutation(xs),xs);
    if(["count","injections","bijections"].includes(goal)){
      const k=goal==="bijections"?n:rand(rng,2,6), xs=raw.xs, ys=Array.from({length:k},(_,i)=>i+7);
      const id=ctx.source("정의역과 공역",m("X="+list(xs))+", "+m("Y="+list(ys))+"이다.");
      const mode=goal==="count"?"all":goal, label=goal==="count"?"함수":goal==="injections"?"일대일함수":"일대일대응";
      const enumerate=(fixedIndex=-1,assigned=-1,equal=true)=>{
        const walk=(i,used)=>{
          if(i===n)return 1;
          return ys.reduce((total,y,j)=>total+((mode==="all"||!used.has(j))&&(i!==fixedIndex||(j===assigned)===equal)
            ?walk(i+1,new Set([...used,j])):0),0);
        };
        return walk(0,new Set());
      };
      if(level==="A"){
        const ans=R.count(mode,n,k);
        if(ans!==enumerate())throw new RangeError("함수의 개수 검산에 실패했습니다.");
        ctx.step(mode,label+"의 개수",m(ans),[id]);
        return finish(m("X")+"에서 "+m("Y")+"로 가는 "+label+"의 개수를 구하시오.",scalar(ans),["정의역의 각 원소에 허용되는 대응을 센다."]);
      }
      const x=pick(rng,xs),y=pick(rng,ys), exact=rng()<.5;
      const condition=ctx.source("특정 대응",m("f("+x+")"+(exact?"=":"\\ne ")+y)+"인 경우를 생각한다.");
      const all=R.count(mode,n,k), fixed=R.count(mode,n-1,mode==="all"?k:k-1), ans=exact?fixed:all-fixed;
      if(ans!==enumerate(xs.indexOf(x),ys.indexOf(y),exact))throw new RangeError("조건부 함수의 개수 검산에 실패했습니다.");
      const total=exact?null:ctx.step(mode,label+"의 전체 개수",m(all),[id]);
      const restricted=ctx.step("fixed","한 입력의 대응을 고정",m(fixed),[id,condition]);
      if(!exact)ctx.step("subtract","조건을 만족하는 개수",m(ans),[total,restricted]);
      return finish(m("X")+"에서 "+m("Y")+"로 가는 "+label+" "+m("f")+"의 개수를 구하시오.",scalar(ans),
        ["한 원소의 대응을 고정하면 나머지 정의역의 크기가 하나 줄어든다."+(mode==="all"?"":" 이미 사용한 공역 원소도 제외한다."),
          exact?"고정한 경우의 수는 "+m(ans)+"이다.":"전체 "+m(all)+"에서 고정한 경우 "+m(fixed)+"를 빼면 "+m(ans)+"이다."]);
    }
    if(["correspondence","valid","vertical"].includes(goal)){
      const xs=raw.xs, ys=raw.codomain, x=pick(rng,xs), y=R.value(raw,x);
      const pairs=raw.xs.map((v,i)=>[v,raw.ys[i]]);
      if(level==="A"){
        if(rng()<.5)pairs.push([x,pick(rng,ys.filter(v=>v!==y))]);
        const id=ctx.source("전체 대응",m("X="+list(xs))+", "+m("Y="+list(ys))+"이다. 다음 순서쌍에서 첫째 성분이 둘째 성분에 대응한다. "+m(list(pairs.map(pairText))));
        const ok=R.validTable(pairs,xs,ys);
        ctx.step("valid","입력별 출력의 유일성",ok?"함수":"함수가 아님",[id]);
        return finish(goal==="vertical"?"이 점들의 집합은 함수의 그래프인가?":"이 대응은 함수인가?",yes(ok),
          ["정의역의 모든 원소에 공역의 원소가 정확히 하나씩 대응해야 한다."]);
      }
      const base=pairs.filter(([v])=>v!==x);
      if(rng()<.5)base.push([x,y]);
      const fixed=base.some(([v])=>v===x);
      const candidates=ys.filter(t=>R.validTable([...base,[x,t]],xs,ys)&&(!fixed?uniq([...base.map(p=>p[1]),t]).length===n:true));
      if(!candidates.length)throw new RangeError("함숫값 조건이 성립하지 않습니다.");
      const id=ctx.source("대응 후보",m("X="+list(xs))+", "+m("Y="+list(ys))+"이고, "+m(list([...base.map(pairText),"("+x+",k)"]))+"가 대응 "+m("f")+"를 나타낸다.");
      const requirement=fixed?"이 대응이 함수일 때":"이 대응이 일대일대응일 때";
      const checked=ctx.step("valid","입력별 출력의 유일성",fixed?m(y):"각 입력에 출력이 하나씩 대응한다.",[id]);
      const recovered=ctx.step(fixed?"matching":"bijective","가능한 미지수",m(list(candidates)),[checked]);
      if(rng()<.4){
        const other=pick(rng,raw.xs.filter(v=>v!==x)), sum=candidates[0]+R.value(raw,other);
        ctx.step("sumValues","복원한 출력과 다른 출력의 합",m(sum),[recovered,id]);
        return finish(requirement+", "+m("f("+x+")+f("+other+")")+"의 값을 구하시오.",scalar(sum),
          ["먼저 미지의 출력 "+m(candidates[0])+"를 결정한 뒤 "+m("f("+other+")")+"를 더한다."]);
      }
      return finish(requirement+", "+m("k")+"의 값을 구하시오.",scalar(candidates[0]),[fixed?
        "입력 "+m(x)+"에는 이미 "+m(y)+"가 대응하므로 "+m("k="+y)+"이다.":
        "나머지 출력이 모두 다르므로 아직 쓰이지 않은 공역의 원소 "+m(candidates[0])+"를 대응시킨다."]);

    }
    if(goal==="restrict"||goal==="inverse-cross")return quadraticPractice(goal,level,rng,format);
    const inverseGoals=["inverse","invertible","inverse-bounds","inverse-rule","cancel","double","inverse-compose","inverse-graph","symmetry"];
    const composeGoals=["compose","compatible","compose-value","compose-bounds","commute","associate","compose-id","recover","iterate","piece-compose"];
    if(goal==="piece")return piecePractice(level,rng,format);
    if(goal==="same"){
      const good=rng()<.5, other=R.finite(raw.xs,raw.ys.map((y,i)=>!good&&i===0?y+1:y),R.uniq([...raw.codomain,raw.ys[0]+1]));
      other.codomain=raw.codomain=R.uniq([...other.codomain,...raw.codomain]);
      const a=src("f",raw),b=src("g",other);
      if(level==="A"){
        const equal=same(raw.xs,other.xs)&&same(raw.ys,other.ys);
        ctx.step("same","함수의 일치",equal?"같다":"다르다",[a,b]);
        return finish("두 함수는 같은가?",yes(equal),["정의역과 공역이 같으므로 각 입력의 함숫값을 비교한다."]);
      }
      if(rng()<.5){
        const xs=raw.xs.slice(1), fs=xs.map(x=>R.value(raw,x)), gs=xs.map(x=>R.value(other,x));
        const domain=ctx.source("비교할 정의역",m(list(xs))+"로 두 함수의 정의역을 제한한다.");
        const check=ctx.step("restrict","제한된 정의역의 두 대응",m(list(xs)),[a,b,domain]);
        const equal=same(fs,gs);
        ctx.step("same","제한 후 함수의 일치",equal?"같다":"다르다",[check]);
        return finish("제한된 두 함수가 같은지 판별하시오.",yes(equal),["남은 각 입력에서 두 함숫값이 같은지 확인한다."]);
      }
      const diffs=raw.xs.filter(x=>R.value(raw,x)!==R.value(other,x));
      const check=ctx.step("compare","입력별 함숫값 비교",m(list(diffs)),[a,b]);
      ctx.step("same","두 함수가 달라지는 입력",m(list(diffs)),[check]);
      return finish("두 함수의 함숫값이 서로 다른 모든 입력을 구하시오.",set(diffs),["두 대응에서 같은 입력의 출력을 서로 비교한다."]);
    }
    if(inverseGoals.includes(goal)||composeGoals.includes(goal)){
      return mappingNetwork(goal,level,rng,format);
    }
    if(categories[goal]){
      const label=categories[goal], good=rng()<.5;
      const f=goal==="identity"?R.finite(raw.xs,good?raw.xs:[...raw.xs].reverse(),raw.xs):
        goal==="constant"?R.finite(raw.xs,good?raw.xs.map(()=>raw.ys[0]):raw.ys,raw.codomain):
        good?raw:R.finite(raw.xs,[raw.ys[0],...raw.ys.slice(0,-1)],raw.codomain);
      if(level==="A"){
        const id=src("f",f), answer=property(f,goal);
        ctx.step(goal,label+" 판정",answer?"성립":"성립하지 않음",[id]);
        return finish("함수 "+m("f")+"는 "+label+"인가?",yes(answer),["각 입력에 대응하는 값을 조건에 맞추어 비교한다."]);
      }
      if(goal==="identity"&&rng()<.5){
        const id=src("f",f), stable=f.xs.filter(x=>R.value(f,x)===x);
        const node=ctx.step("fixedPoints","원래 입력과 출력이 같은 원소",m(list(stable)),[id]);
        ctx.step("identity","항등함수가 되는 가장 큰 정의역",m(list(stable)),[node]);
        return finish(m("f")+"를 어떤 부분집합에서 자기 자신으로 가는 항등함수로 제한할 때, 가능한 가장 큰 정의역을 구하시오.",
          set(stable),["함숫값이 입력과 같은 원소만 남긴다. 그런 원소를 모두 모으면 가장 큰 정의역이 된다."]);
      }
      if(goal!=="identity"&&rng()<.5){
        const id=src("f",f), removed=pick(rng,f.xs), domain=f.xs.filter(x=>x!==removed);
        const narrowed=R.finite(domain,domain.map(x=>R.value(f,x)),f.codomain);
        const constraint=ctx.source("제외할 입력",m("f")+"의 정의역에서 "+m(removed)+"을 제외한다.");
        const derived=ctx.step("restrict","제한된 정의역의 대응",m(rule(narrowed)),[id,constraint]);
        const ok=property(narrowed,goal);
        ctx.step(goal,label+"의 성립 여부",ok?"성립":"성립하지 않음",[derived]);
        return finish("제한한 함수가 "+label+"인지 판별하시오.",yes(ok),["남은 정의역의 대응에 "+label+"의 조건을 적용한다."]);
      }
      const x=pick(rng,f.xs), i=f.xs.indexOf(x);
      const options=f.codomain.filter(y=>property(R.finite(f.xs,f.ys.map((v,j)=>j===i?y:v),f.codomain),goal));
      if(!options.length)throw new RangeError("조건을 만족하는 대응이 없습니다.");
      const id=ctx.source("미지수가 있는 대응",m("f:"+list(f.xs)+"\\to"+list(f.codomain))+"의 대응이 "+m(list(f.xs.map((x,j)=>"("+x+","+(i===j?"k":f.ys[j])+")")))+"이다.");
      const mid=ctx.step(goal,label+"의 조건 적용",m(list(options)),[id]);
      ctx.step("admissible","가능한 함숫값",m(list(options)),[mid]);
      return finish(m("f")+"가 "+label+"가 되도록 하는 "+m("k")+"의 값을 모두 구하시오.",set(options),["공역의 각 원소를 빈 자리에 넣어 "+label+"의 조건을 확인한다."]);
    }
    const isGraph=goal==="graph-value";
    const graph=goal==="graph";
    const sign=pick(rng,[-1,1]), h=rand(rng,-2,2), k=rand(rng,-2,2);
    const xs=[h-2,h-1,h,h+1,h+2], f=x=>sign*(x-h)**2+k;
    const fRule=shift((sign<0?"-":"")+(h?"("+shift("x",h)+")":"x")+"^2",-k);
    const fText=m("f(x)="+fRule);
    const pts=xs.map(x=>[x,f(x)]);
    const x=pick(rng,xs), y=f(x);
    const id=ctx.source(isGraph?"함수의 그래프":"함수식과 정의역",isGraph?"함수 "+m("f")+"의 그래프가 아래와 같다.":
      "정의역이 "+m(list(xs))+"인 함수 "+fText+"가 있다.");
    const finishGraph=(q,answer,solution)=>ctx.finish(q,answer,solution,format,isGraph?{plot:{kind:"function-points",points:pts}}:undefined);
    if(graph){
      const b=pick(rng,[-2,-1,1,2]);
      const changed=level==="B";
      const horizontal=changed&&rng()<.5;
      const points=changed?pts.map(([x,y])=>horizontal?[x+b,y]:[x,y+b]):pts;
      const description=changed?m("y="+(horizontal?"f("+shift("x",b)+")":shift("f(x)",-b))):m("y=f(x)");
      const from=changed?ctx.step(horizontal?"input-shift":"output-shift",horizontal?"함수의 입력을 맞추어 가로 좌표 이동":"출력에 상수를 더해 세로 좌표 이동",description,[id]):id;
      const askPoint=changed&&rng()<.55;
      const [u,v]=pick(rng,points);
      const answer=askPoint?scalar(v):coordinateAnswers(points,rng,format);
      ctx.step(askPoint?"ordinate":"graph","입력과 출력을 좌표로 짝지음",answer.text,[from]);
      return finishGraph(description+"의 그래프에서 "+(askPoint?m("x="+u)+"일 때의 "+m("y")+"좌표를":"나타나는 점의 좌표를 모두")+" 구하시오.",
        answer,[horizontal?"원래 입력을 유지하려면 가로 좌표에 "+m(b)+"를 더한다.":changed?"원래 출력에 "+m(b)+"를 더해 세로 좌표를 구한다.":"각 입력과 그 함숫값을 점의 좌표로 짝지으면 된다."]);
    }
    if(level==="A"){
      const answer=scalar(y);
      ctx.step("value","지정한 입력에서 함숫값 확인",m(y),[id]);
      return finishGraph(m("f("+x+")")+"의 값을 구하시오.",answer,[isGraph?"가로 좌표가 "+m(x)+"인 점의 세로 좌표를 읽는다.":m("x="+x)+"를 함수식에 대입한다."]);
    }
    const s=pick(rng,[-1,1]), shiftBy=pick(rng,[-2,-1,1,2]);
    const valueCondition=rng()<.5;
    const witness=pick(rng,xs.filter(t=>t!==h)), output=f(witness);
    if(valueCondition){
      const hits=xs.filter(t=>f(t)===output), shifted=hits.map(t=>s*t+shiftBy);
      const given=ctx.source("공개 함숫값",m("f("+R.affine(s,-s*shiftBy)+")="+output),false);
      const z=ctx.step("preimage","같은 출력이 되는 원래 입력을 모두 찾기",m(list(hits)),[id,given]);
      const answer=set(shifted);
      ctx.step("linear-input","함수의 입력을 실제 미지수로 역산",answer.text,[z]);
      return finishGraph(m("f("+R.affine(s,-s*shiftBy)+")="+output)+"를 만족하는 모든 "+m("x")+"를 구하시오.",answer,
        ["함숫값이 "+m(output)+"인 입력은 "+m(list(hits))+"이다.","각 입력을 "+m(R.affine(s,-s*shiftBy))+"와 같게 놓고 푼다."]);
    }
    const delta=pick(rng,[-2,-1,1,2]);
    const shared=xs.filter(t=>xs.includes(t+delta));
    const smaller=rng()<.5;
    const hits=shared.filter(t=>smaller?f(t+delta)<f(t):f(t+delta)>f(t));
    const both=ctx.step("shared-domain","두 함숫값이 모두 정의되는 입력",m(list(shared)),[id]);
    const answer=set(hits);
    ctx.step("compare-shifted-values","이동 전후의 함숫값 비교",answer.text,[both]);
    const expr="f("+shift("x",-delta)+")"+(smaller?"<":">")+"f(x)";
    return finishGraph(m(expr)+"를 만족하는 모든 "+m("x")+"를 구하시오.",answer,
      ["두 함숫값이 모두 정의되는 입력은 "+m(list(shared))+"이다.","그중 부등식을 만족하는 입력은 "+answer.text+"이다."]);

  }

  function mappingNetwork(goal,level,rng,format){
    const ctx=context(level,rng);
    const xs=sample("table",rng).xs;
    const make=()=>R.finite(xs,xs,xs);
    const permutation=()=>{
      const ys=[...xs];
      for(let i=ys.length-1;i>0;i--){const j=rand(rng,0,i);[ys[i],ys[j]]=[ys[j],ys[i]];}
      return R.finite(xs,ys,xs);
    };
    const given=(f,i)=>({f,tex:names[i],id:ctx.source("주어진 함수",tableText(names[i],f))});
    const compute=(op,a,b)=>{
      const f=b?apply(op,a.f,b.f):apply(op,a.f);
      const tex=b?a.tex+"\\circ "+b.tex:"("+a.tex+")^{-1}";
      return {f,tex,id:ctx.step(op,b?"합성함수의 대응":"역함수의 대응",m(rule(f)),b?[a.id,b.id]:[a.id])};
    };
    const f=permutation();
    if(goal==="invertible"){
      const raw=rng()<.5?f:R.finite(xs,[f.ys[0],...f.ys.slice(0,-1)],xs);
      const id=given(raw,0).id, good=property(raw,"bijective");
      const check=ctx.step("bijective","공역 원소별 원래 입력 확인",m(list(R.range(raw))),[id]);
      if(level==="A")return ctx.finish("역함수가 존재하는지 판별하시오.",yes(good),["공역의 원소마다 원래 입력이 정확히 하나 있어야 한다."],format);
      if(rng()<.5){
        const distinct=R.range(raw), keep=distinct.map(y=>raw.xs.find(x=>R.value(raw,x)===y));
        const narrowed=R.finite(keep,keep.map(x=>R.value(raw,x)),distinct);
        apply("inverse",narrowed);
        ctx.step("restrict","출력마다 하나의 입력을 남길 때 가능한 최대 크기",m(distinct.length),[check]);
        return ctx.finish("정의역을 제한하고 공역을 제한 후의 치역으로 바꾼다. 역함수가 존재할 때 남길 수 있는 정의역의 최대 원소 수를 구하시오.",
          scalar(distinct.length),["서로 다른 출력마다 원래 입력을 하나씩 남기면 일대일대응이 된다."],format);
      }
      const t=pick(rng,xs), candidates=xs.filter(x=>R.value(raw,x)===t);
      ctx.step("preimage","주어진 출력의 원래 입력",m(list(candidates)),[check]);
      return ctx.finish(m("f(x)="+t)+"를 만족하는 모든 "+m("x")+"의 값을 구하시오.",set(candidates),
        ["출력이 "+m(t)+"인 대응을 모두 확인한다. 원래 입력의 집합은 "+m(list(candidates))+"이다."],format);
    }
    if(goal==="compatible"){
      const g=permutation(), missing=pick(rng,xs), allowed=xs.filter(x=>x!==missing);
      const outer=rng()<.5?f:R.finite(allowed,allowed.map(x=>R.value(f,x)),xs);
      const a=given(outer,0),b=given(g,1);
      const valid=R.range(g).every(y=>outer.xs.includes(y));
      const id=ctx.step("compatible","안쪽 함수의 치역과 바깥 함수의 정의역 비교",valid?"포함된다":"포함되지 않는다",[a.id,b.id]);
      if(level==="A")return ctx.finish(m("f\\circ g")+"가 "+m("g")+"의 정의역 전체에서 정의되는지 판별하시오.",yes(valid),
        ["안쪽 함수의 치역이 바깥 함수의 정의역에 포함되는지 확인한다."],format);
      const input=xs.filter(x=>outer.xs.includes(R.value(g,x)));
      const restriction=ctx.step("restrict","합성이 가능한 입력 복원",m(list(input)),[id]);
      if(rng()<.5){
        const values=uniq(input.map(x=>R.value(outer,R.value(g,x))));
        ctx.step("composition","허용된 입력에서 두 함수를 차례로 적용",m(list(values)),[restriction]);
        return ctx.finish("정의되는 모든 입력에서 "+m("f(g(x))")+"가 가질 수 있는 값을 구하시오.",set(values),
          ["안쪽 함수값이 바깥 함수의 정의역에 들어가는 입력만 사용한다."],format);
      }
      return ctx.finish(m("f(g(x))")+"가 정의되는 모든 "+m("x")+"를 구하시오.",set(input),["먼저 "+m("g(x)")+"를 구하고 그 값이 "+m("f")+"의 정의역에 있는 입력만 남긴다."],format);
    }
    if(goal==="compose-bounds"&&level!=="A"&&rng()<.45){
      const g=permutation(), a=given(f,0), b=given(g,1), dropped=pick(rng,xs);
      const input=xs.filter(x=>x!==dropped);
      const condition=ctx.source("제한할 입력",m("x\\ne "+dropped)+"인 입력만 고려한다.");
      const restricted={f:R.finite(input,input.map(x=>R.value(g,x)),xs),tex:"g",
        id:ctx.step("restrict","안쪽 함수의 정의역 제한",m(list(input)),[b.id,condition])};
      let root=compute("composition",a,restricted);
      const ans=set(R.range(root.f));
      ctx.step("range","합성에서 실제로 나오는 출력",ans.text,[root.id]);
      return ctx.finish(m("("+root.tex+")(x)")+"의 치역을 구하시오.",ans,
        ["제외할 입력을 먼저 제거한다. 남은 입력에 합성을 차례대로 적용해 나온 값은 "+ans.text+"이다."],format);
    }
    if(goal==="recover"){
      const g=permutation(), h=apply("composition",f,g);
      const a=given(h,0),b=given(g,1);
      ctx.source(m("f")+"는 "+m("u\\circ g")+"이다.","함수 "+m("u")+"는 "+m(list(xs))+"에서 자기 자신으로 가는 함수이고, "+m("f=u\\circ g")+"이다.");
      const recovered=compute("composition",a,compute("inverse",b));
      if(!same(recovered.f.ys,f.ys))throw new RangeError("함수 복원 검산에 실패했습니다.");
      if(level!=="A"&&rng()<.5){
        const t=pick(rng,recovered.f.ys), candidates=recovered.f.xs.filter(x=>R.value(recovered.f,x)===t);
        const answer=set(candidates);
        ctx.step("preimage","복원된 함수에서 출력이 일치하는 입력 찾기",answer.text,[recovered.id]);
        return ctx.finish(m("u(x)="+t)+"를 만족하는 모든 "+m("x")+"를 구하시오.",answer,
          [m("u=f\\circ g^{-1}")+"이므로 복원한 대응에서 출력이 "+m(t)+"인 입력을 찾는다."],format);
      }
      const x=pick(rng,xs), answer=R.value(f,x);
      ctx.step("value","복원한 함수의 함숫값",m(answer),[recovered.id]);
      return ctx.finish(m("u("+x+")")+"의 값을 구하시오.",scalar(answer),[m("u=f\\circ g^{-1}")+"이다. "+m("u("+x+")="+answer)+"이다."],format);
    }
    if(level==="A"&&goal==="inverse"){
      const x=pick(rng,xs), y=R.value(f,x);
      const id=ctx.source("주어진 대응", "일대일대응 "+m("f")+"에서 "+m("f("+x+")="+y)+"이다.");
      ctx.step("inverse","원래 입력과 출력 교환",m(x),[id]);
      return ctx.finish(m("f^{-1}("+y+")")+"의 값을 구하시오.",scalar(x),
        ["역함수는 원래 함수의 출력 "+m(y)+"를 입력받아 "+m(x)+"를 내놓는다."],format);
    }
    const graphGoal=["inverse-graph","symmetry"].includes(goal);
    const a=graphGoal?{f,tex:"f",id:ctx.source("원함수의 그래프","아래는 함수 "+m("f")+"의 그래프이다. 정의역과 공역은 모두 "+m(list(xs))+"이다.")}:given(f,0);
    if(goal==="commute"||goal==="associate"){
      const b=given(permutation(),1);
      const c=goal==="associate"?given(permutation(),2):null;
      const lhs=c?compute("composition",compute("composition",a,b),c):compute("composition",a,b);
      const rhs=c?compute("composition",a,compute("composition",b,c)):compute("composition",b,a);
      const diffs=xs.filter(x=>R.value(lhs.f,x)!==R.value(rhs.f,x));
      const compared=ctx.step("compare","두 합성의 입력별 비교",m(list(diffs)),[lhs.id,rhs.id]);
      if(c&&diffs.length)throw new RangeError("결합법칙 검산에 실패했습니다.");
      if(level==="A")return ctx.finish(m("("+lhs.tex+")")+"와 "+m("("+rhs.tex+")")+"가 같은 함수인지 판별하시오.",yes(!diffs.length),["각 입력에서 두 합성의 값을 비교한다."],format);
      if(c){
        const x=pick(rng,xs), answer=R.value(lhs.f,x);
        if(rng()<.5){
          const candidates=xs.filter(t=>R.value(lhs.f,t)===answer);
          ctx.step("preimage","공통 출력에서 입력 복원",m(list(candidates)),[compared,lhs.id]);
          return ctx.finish(m("(f\\circ(g\\circ h))(x)="+answer)+"를 만족하는 "+m("x")+"를 모두 구하시오.",set(candidates),
            ["결합 순서와 관계없이 같은 함수가 된다. 완성된 대응에서 주어진 출력을 찾는다."],format);
        }
        ctx.step("value","결합법칙으로 같은 합성값 확인",m(answer),[compared,lhs.id]);
        return ctx.finish(m("((f\\circ g)\\circ h)("+x+")")+"의 값을 구하시오.",scalar(answer),["결합 순서와 무관하게 "+m("f(g(h("+x+")))")+"를 계산한다."],format);
      }
      if(rng()<.5){
        const common=xs.filter(x=>!diffs.includes(x));
        ctx.step("complement","일치하는 입력의 개수",m(common.length),[compared]);
        return ctx.finish(m(lhs.tex)+", "+m(rhs.tex)+"의 함숫값이 같은 정의역 원소의 개수를 구하시오.",
          scalar(common.length),["두 합성의 함숫값이 다른 입력을 전체 정의역에서 제외한다."],format);
      }
      return ctx.finish("두 합성 "+m(lhs.tex)+", "+m(rhs.tex)+"의 함숫값이 다른 입력을 모두 구하시오.",set(diffs),["두 방향의 합성을 계산한 뒤 입력별로 비교한다."],format);
    }
    let root;
    if(goal==="iterate"){
      const power=level==="A"?2:rand(rng,3,5);
      root=a;
      for(let i=1;i<power;i++)root=compute("composition",a,root);
    }else if(goal==="compose-id"){
      const id={f:make(),tex:"g",id:ctx.source("항등함수",m("g")+"는 "+m(list(xs))+"에서 자기 자신으로 가는 항등함수이다.")};
      root=rng()<.5?compute("composition",a,id):compute("composition",id,a);
    }else if(goal==="double"||goal==="cancel"||goal==="inverse-compose"){
      const inv=compute("inverse",a);
      if(goal==="double")root=compute("inverse",inv);
      else if(goal==="cancel")root=rng()<.5?compute("composition",inv,a):compute("composition",a,inv);
      else root=compute("inverse",compute("composition",a,given(permutation(),1)));
    }else if(["inverse","inverse-bounds","inverse-rule","inverse-graph","symmetry"].includes(goal)){
      if(level!=="A"&&goal!=="inverse-graph"&&rng()<.5)root=compute("inverse",compute("composition",a,given(permutation(),1)));
      else root=compute("inverse",a);
    }else{
      const b=given(permutation(),1);
      root=compute("composition",a,b);
    }
    const expression=m(root.tex);
    let answer,question;
    if(["inverse-rule","inverse-graph","symmetry"].includes(goal)&&rng()<.65){
      answer=coordinateAnswers(R.points(root.f),rng,format);
      question=expression+"의 그래프를 이루는 순서쌍의 집합을 구하시오.";
    }else if(["inverse-bounds","compose-bounds"].includes(goal)){
      const domain=rng()<.5;
      answer=set(domain?root.f.xs:R.range(root.f));question=expression+"의 "+(domain?"정의역":"치역")+"을 구하시오.";
    }else if(level!=="A"&&rng()<.4){
      const t=pick(rng,root.f.ys);
      answer=set(root.f.xs.filter(x=>R.value(root.f,x)===t));question=m("("+root.tex+")(x)="+t)+"를 만족하는 모든 "+m("x")+"를 구하시오.";
    }else{
      const x=pick(rng,root.f.xs);answer=scalar(R.value(root.f,x));question=m("("+root.tex+")("+x+")")+"의 값을 구하시오.";
    }
    const read=answer.kind==="set"?(/정의역/.test(question)?"domain":/치역/.test(question)?"range":"preimage"):
      answer.kind==="point-set"||answer.kind==="choice"?"graph":"value";
    ctx.step(read,"완성한 함수에서 답 결정",answer.text,[root.id]);
    return ctx.finish(question,answer,["합성은 오른쪽 함수부터 적용하고, 역함수는 각 대응의 입력과 출력을 바꾼다.",
      expression+"의 전체 대응은 "+m(rule(root.f))+"이다."],format,graphGoal?{plot:{kind:"function-points",points:R.points(f)}}:undefined);
  }

  function piecePractice(level,rng,format){
    const ctx=context(level,rng), f=sample("piece",rng),g=sample("affine",rng);
    const base=ctx.source("구간별 함수",m("f(x)="+rule(f))+"이다.");
    const compose=level!=="A"&&g.a>0;
    const result=compose?apply("composition",f,g):f;
    const node=compose?ctx.step("composition","안쪽 함수와 구간 경계 합성",m(rule(result)),
      [base,ctx.source("안쪽 함수",m("g(x)="+rule(g))+"이다.")]):base;
    if(level!=="A"&&rng()<.55){
      const witness=rand(rng,-4,4), y=R.value(result,witness);
      const candidates=[result.left,result.right].map(branch=>(y-branch.k)/branch.a)
        .filter((x,i)=>Number.isSafeInteger(x)&&(i===0?x<result.h:x>=result.h));
      const id=ctx.step("solveBranches","각 구간에서 같은 출력이 되는 입력 후보",m(list(uniq(candidates))),[node]);
      const answer=set(candidates);
      ctx.step("filter","구간 조건에 맞는 정수 해",answer.text,[id]);
      return ctx.finish(m((compose?"(f\\circ g)":"f")+"(x)="+y)+"를 만족하는 정수 "+m("x")+"를 모두 구하시오.",
        answer,["구간별로 식을 풀고 각 구간에 속하는 정수 해만 모은다."],format);
    }
    const x=rand(rng,-4,4);
    const branch=ctx.step("piece","적용할 구간 결정",x<result.h?"경계의 왼쪽":"경계부터 오른쪽",[node]);
    const y=R.value(result,x);
    ctx.step("value","선택한 식의 함숫값",m(y),[branch]);
    return ctx.finish(m((compose?"(f\\circ g)":"f")+"("+x+")")+"의 값을 구하시오.",scalar(y),
      [compose?"먼저 "+m("g("+x+")="+R.value(g,x))+"를 구하고 해당 구간의 식을 적용한다.":"입력이 속하는 구간의 식을 적용한다."],format);
  }

  function quadraticPractice(goal,level,rng,format){
    const ctx=context(level,rng), h=rand(rng,-3,3), d=rand(rng,1,3);
    if(goal==="inverse-cross"){
      const f={kind:"affine",a:pick(rng,[2,3,-2]),k:0};
      f.k=(1-f.a)*h;
      const id=ctx.source("실수 전체에서 정의된 일차함수",m("f(x)="+rule(f))+"이다.");
      const inv=apply("inverse",f);
      const first=ctx.step("inverse","역함수 결정","대응에서 입력과 출력을 바꾼다.",[id]);
      const x=(inv.k-f.k)/(f.a-inv.a);
      if(!close(R.value(f,x),R.value(inv,x)))throw new RangeError("교점 검산에 실패했습니다.");
      const meet=ctx.step("intersection","두 그래프의 교점",m(pairText([x,h])),[id,first]);
      if(level!=="A"&&rng()<.5){
        const c=pick(rng,[-3,-2,1,2]), ans=h+c;
        const given=ctx.source("두 그래프의 이동", "두 그래프를 모두 "+m("x")+"축 방향으로 "+m(c)+"만큼 평행이동한다.");
        ctx.step("translation","교점도 같은 양만큼 이동",m(pairText([ans,h])),[meet,given]);
        return ctx.finish("이동한 두 그래프의 교점의 가로 좌표를 구하시오.",scalar(ans),["원래 교점은 "+m(pairText([h,h]))+"이며, 가로 좌표에 이동량을 더한다."],format);
      }
      return ctx.finish("함수와 역함수의 그래프가 만나는 점의 "+(level==="A"?"좌표를":"가로 좌표와 세로 좌표의 합을")+" 구하시오.",
        level==="A"?point([x,h]):scalar(x+h),["두 함수의 식을 같게 놓으면 "+m("x="+x)+"이고, 이때 "+m("y="+h)+"이다."],format);
    }
    const f=sample("quadratic",rng), x=f.h+f.s*d, y=R.value(f,x);
    const id=ctx.source("제한된 이차함수",m("f(x)="+rule(f))+"의 정의역은 "+R.intervalText(R.domain(f))+"이다.");
    const inv=apply("inverse",f);
    const first=ctx.step("restrict","일대일인 반쪽 그래프 선택",R.intervalText(R.domain(f)),[id]);
    const second=ctx.step("inverse","정의역 조건으로 부호 결정",m(rule(inv)),[first]);
    if(!close(R.value(inv,y),x))throw new RangeError("제한된 역함수 검산에 실패했습니다.");
    if(level!=="A"&&rng()<.5){
      const shifted=pick(rng,[-3,-2,1,2]), answer=x+shifted;
      const fact=ctx.source("이동량",m("g(x)="+shift("f^{-1}(x)",-shifted))+"라 하자.");
      ctx.step("translation","역함수값에 세로 이동 반영",m(answer),[second,fact]);
      return ctx.finish(m("g("+y+")")+"의 값을 구하시오.",scalar(answer),
        [m("f^{-1}("+y+")="+x)+"이므로 세로 이동을 반영하면 "+m(answer)+"이다."],format);
    }
    ctx.step("value","역함수의 함숫값",m(x),[second]);
    return ctx.finish(m("f^{-1}("+y+")")+"의 값을 구하시오.",scalar(x),
      [m("f(x)="+y)+"를 풀고 주어진 정의역에 속하는 해 "+m(x)+"를 고른다."],format);
  }

  const fractions=(a,b)=>"\\frac{"+a+"}{"+b+"}";
  function expressionPractice(unit,goal,level,rng,format){
    const ctx=context(level,rng), h=rand(rng,-4,2), j=h+rand(rng,2,5), n=rand(rng,2,5);
    const u=shift("x",h),v=shift("x",j), rational=unit==="rational";
    const classifications=["expression","fraction","definition"];
    if(classifications.includes(goal)){
      const polynomial=m("x^2+"+n), fraction=m(fractions(n,u)), radical=m("\\sqrt{"+u+"}");
      const target=rational?fraction:radical;
      const id=ctx.source("식의 종류", "");
      ctx.step("classify","식에 포함된 연산 확인",target,[id]);
      let answer=choice(rng,target,[polynomial,rational?radical:fraction]);
      let question=goal==="fraction"?"분수식인 것을 고르시오.":rational?"다항식이 아닌 유리식을 고르시오.":"무리식을 고르시오.";
      if(level!=="A"){
        const valid=rand(rng,0,1)===0?j:h;
        question=rational?"분수식 중 "+m("x="+valid)+"에서 정의되는 것을 고르시오.":"무리식 중 "+m("x="+valid)+"에서 정의되는 것을 고르시오.";
        const second=rational?m(fractions(n,shift("x",valid))):m("\\sqrt{"+shift("x",valid+1)+"}");
        const good=rational&&valid===h?m(fractions(n,v)):target;
        answer=choice(rng,good,[second,polynomial]);
        const selection=ctx.step("defined","해당 입력에서 식이 정의되는지 확인",good,[id]);
        if(rng()<.5){
          const excluded=rational?(valid===h?j:h):h-1;
          question=rational?"다항식이 아닌 유리식 중 "+m("x="+excluded)+"에서 정의되지 않는 것을 고르시오.":
            "무리식 중 "+m("x="+excluded)+"에서 정의되지 않는 것을 고르시오.";
          const invalid=rational?m(fractions(n,shift("x",excluded))):radical;
          const allowed=rational?m(fractions(n,shift("x",excluded+1))):m("\\sqrt{"+shift("x",excluded)+"}");
          answer=choice(rng,invalid,[allowed,polynomial]);
          ctx.step("exclude","정의 조건을 어기는 식 선택",invalid,[selection]);
        }
      }
      return ctx.finish(question,answer,[rational?"분수식에서는 분모가 0이 되면 안 된다.":"무리식에 포함된 제곱근은 근호 안이 음이 아닌 범위에서 정의된다."],format);
    }
    if(goal==="expr-domain"||goal==="defined"){
      const denominator=rational?fractions(n,"("+u+")("+v+")"):goal==="defined"?fractions(n,"\\sqrt{"+u+"}"):"\\sqrt{"+u+"}";
      const expression=level==="A"?denominator:rational?denominator+"+"+fractions(1,shift("x",j+1)):denominator+"+\\sqrt{"+shift("x",j)+"}";
      const id=ctx.source("원래 식",m(expression)+"가 주어져 있다.");
      const bounds=rational?[intervalPart(null,h),intervalPart(h,j),...(level==="A"?[intervalPart(j,null)]:[intervalPart(j,j+1),intervalPart(j+1,null)])]:
        [R.interval(level==="A"?h:j,null,level!=="A"||goal!=="defined")];
      const first=ctx.step("defined","항마다 정의 조건 확인",rational?"분모가 0이 아닌 조건":"근호 안의 부호 조건",[id]);
      if(level!=="A"){
        if(rng()<.5){
          const candidates=Array.from({length:8},(_,i)=>h-2+i);
          const result=candidates.filter(x=>R.includes(bounds,x));
          const candidatesId=ctx.source("입력 후보", "입력 후보는 "+m(list(candidates))+"이다.");
          ctx.step("filter","정의 조건에 맞는 후보 선별",m(list(result)),[first,candidatesId]);
          return ctx.finish("후보 중 원래 식이 정의되는 모든 입력을 구하시오.",set(result),
            ["각 후보를 원래 식에 대입하여 분모와 근호의 조건을 모두 확인한다."],format);
        }
        ctx.step("intersection","모든 항이 정의되는 범위",R.intervalText(bounds),[first]);
      }
      return ctx.finish("식이 정의되는 "+m("x")+"의 범위를 구하시오.",interval(bounds),
        [rational?"각 분모를 0으로 만드는 입력을 제외한다.":"모든 근호와 분모의 조건이 동시에 성립해야 한다.",R.intervalText(bounds)+"이다."],format);
    }
    if(rational){
      const sign=pick(rng,[-1,1]), div=rng()<.5, k=rand(rng,1,4);
      let original,reduced;
      if(goal==="reduce"){original=fractions(n+"("+u+")","("+u+")("+v+")");reduced=fractions(n,v);}
      else if(goal==="add"){original=fractions(n,u)+(sign>0?"+":"-")+fractions(k,v);reduced=fractions(affine(n+sign*k,-n*j-sign*k*h),"("+u+")("+v+")");}
      else{original=fractions(n,u)+(div?"\\div ":"\\cdot ")+fractions(div?k+"("+v+")":k+"("+u+")",div?u:v);
        reduced=fractions(div?n:n*k,div?(k===1?v:k+"("+v+")"):v);}
      const id=ctx.source("계산할 유리식",m(original)+"이다.");
      const op=ctx.step(goal,"공통분모 또는 공통인수 정리",m(reduced),[id]);
      const forbidden=[h,j];
      if(level==="A"){
        return ctx.finish(m("x\\ne "+h+",\ "+ "x\\ne "+j)+"일 때, 원래 식과 같은 식을 고르시오.",
          choice(rng,m(reduced),[m(reduced+"+1"),m(reduced+"-1"),m(reduced+"+2")]),
          ["원래 정의 조건을 유지한 채 식을 정리하면 "+m(reduced)+"이다."],format);
      }
      const x=pick(rng,[h-2,j+2,j+3]), result=goal==="reduce"?n/(x-j):goal==="add"?n/(x-h)+sign*k/(x-j):div?n/(k*(x-j)):n*k/(x-j);
      const checked=goal==="reduce"?n*(x-h)/((x-h)*(x-j)):goal==="add"?(n*(x-j)+sign*k*(x-h))/((x-h)*(x-j)):
        div?(n/(x-h))/(k*(x-j)/(x-h)):(n/(x-h))*(k*(x-h)/(x-j));
      if(!close(result,checked))throw new RangeError("유리식 검산에 실패했습니다.");
      const bounds=[intervalPart(null,h),intervalPart(h,j),intervalPart(j,null)];
      const checkDomain=!exactDecimal(result)||rng()<.5;
      ctx.step(checkDomain?"domain":"evaluate",checkDomain?"약분 전 제외값 복원":"정의 가능한 입력에서 원래 식과 비교",
        checkDomain?R.intervalText(bounds):m(round(result)),[op]);
      return ctx.finish(checkDomain?"원래 식이 정의되는 "+m("x")+"의 범위를 구하시오.":m("x="+x)+"일 때 원래 식의 값을 구하시오.",
        checkDomain?interval(bounds):scalar(round(result)),["원래 식의 분모와 나누는 식이 0이 되는 값을 먼저 확인한다.",
          "정리하면 "+m(reduced)+"이고, "+m(list(forbidden))+"의 원소는 원래 식에서 제외된다."],format);
    }
    const d=pick(rng,[2,3,5]), a=rand(rng,2,4), b=rand(rng,1,4), sign=pick(rng,[-1,1]);
    const root="\\sqrt{"+d+"}";
    const rationalize=goal==="rationalize";
    const coefficient=rationalize?(level==="A"?n:n*b):a+sign*b;
    const denominator=rationalize?d:1;
    const original=rationalize?(level==="A"?fractions(n,root):fractions(n,"("+root+")")+"\\cdot "+b):
      "\\sqrt{"+a*a*d+"}"+(sign>0?"+":"-")+b+root;
    const id=ctx.source("무리식",m(original)+"이다.");
    const simplified=coefficient===0?"0":(denominator===1?(coefficient===1?"":coefficient===-1?"-":coefficient):fractions(coefficient,denominator))+root;
    const step=ctx.step(goal,"같은 근호의 계수로 정리",m(simplified),[id]);
    const squared=rationalize&&denominator!==2&&!exactDecimal(coefficient/denominator)||level!=="A"&&rng()<.5;
    const answer=squared?coefficient**2*d/denominator**2:coefficient/denominator;
    if(!exactDecimal(answer))throw new RangeError("정확한 수치 답안을 고를 수 없습니다.");
    if(level!=="A")ctx.step(squared?"square":"coefficient","정리한 식에서 결과 결정",m(round(answer)),[step]);
    return ctx.finish(squared?"주어진 식의 제곱을 구하시오.":m("c"+root)+"와 같을 때, "+m("c")+"의 값을 구하시오.",scalar(round(answer)),
      ["근호를 정리하면 "+m(simplified)+"이다."],format);
  }
  const intervalPart=(a,b)=>R.interval(a,b,false,false);
  const round=n=>Number(n.toFixed(8));
  const exactDecimal=n=>Number.isFinite(n)&&Math.abs(n-round(n))<1e-12;
  const curvePlot=f=>f.kind==="rational"?{kind:"rational",a:f.a,h:f.h,k:f.k}:
    {kind:"radical",a:f.s*f.a*f.a,sign:Math.sign(f.a),h:f.h,k:f.k};
  const graphBound=(f,key)=>{
    const name=key==="domain"?"정의역":"치역";
    return {name,answer:interval(apply(key,f))};
  };
  function curveProblem(unit,goal,level,rng,format){
    const ctx=context(level,rng), f=sample(goal==="quadratic"?"quadratic":unit,rng), names="fghpqrs";
    if(goal==="linear-root")f.s*=pick(rng,[2,3,4]);
    if(goal==="graph")Object.assign(f,{h:0,k:0});
    let nameIndex=0;
    function source(f,plot=false){
      const name=names[nameIndex++];
      const id=ctx.source("주어진 함수",plot?"아래는 함수 "+m(name)+"의 그래프이다.":m(name+"(x)="+rule(f))+"이다."+(f.kind==="quadratic"?" 정의역은 "+R.intervalText(R.domain(f))+"이다.":""));
      return {f,name,id};
    }
    function transformation(current,op){
      const {f,name,id}=current, next=names[nameIndex++];
      let result,fact,dependencies=[id];
      if(op==="translation"){
        const u=pick(rng,[-3,-2,1,2]), v=pick(rng,[-2,-1,1,3]);
        result=apply(op,f,[u,v]);
        fact=m(name)+"의 그래프를 "+m("x")+"축 방향으로 "+m(u)+", "+m("y")+"축 방향으로 "+m(v)+"만큼 평행이동한 그래프를 나타내는 함수가 "+m(next)+"이다.";
      }else if(op==="reflection"){
        const axis=pick(rng,["x","y"]);
        result=apply(op,f,axis);
        fact=m(name)+"의 그래프를 "+m(axis)+"축에 대하여 대칭이동한 그래프를 나타내는 함수가 "+m(next)+"이다.";
      }else if(op==="composition"){
        const g={kind:"affine",a:pick(rng,[-1,1]),k:rand(rng,1,3)}, other=source(g);
        const reverse=rng()<.5;
        result=reverse?apply(op,g,f):apply(op,f,g);
        dependencies.push(other.id);
        fact=m(next+"="+(reverse?other.name+"\\circ "+name:name+"\\circ "+other.name))+"라 하자.";
      }else if(op==="inverse"){
        result=apply(op,f);
        fact=m(next)+"는 "+m(name)+"의 역함수이다.";
      }
      const cond=ctx.source("변환 조건",fact);
      return {f:result,name:next,id:ctx.step(op,{translation:"평행이동",reflection:"대칭이동",composition:"함수 합성",inverse:"역함수"}[op],m(next+"(x)="+rule(result)),[...dependencies,cond])};
    }
    if(["asymptote-fit","symmetry-fit","unknown","bounds-fit","endpoint-fit"].includes(goal)){
      const h=f.h,k=f.k, start=m(pairText([h,k]));
      const available=R.points(f).filter(([x,y])=>x!==h&&y!==k);
      if(!available.length)throw new RangeError("계수 복원에 사용할 점이 없습니다.");
      const [x,y]=pick(rng,available);
      const signature=unit==="rational"?(goal==="symmetry-fit"?"대칭의 중심이 "+start:"점근선이 "+m("x="+h)+", "+m("y="+k)):
        goal==="bounds-fit"?"정의역은 "+R.intervalText(R.domain(f))+"이고 치역은 "+R.intervalText(R.range(f)):
        "시작점이 "+start+"이고 그래프는 "+(f.s>0?"오른쪽":"왼쪽")+"으로 뻗는다";
      const id=ctx.source("함수의 위치와 방향",signature+(unit==="rational"||goal==="bounds-fit"?"이다.":"."));
      const p=ctx.source("그래프 위의 점", "그래프는 점 "+m(pairText([x,y]))+"를 지난다.");
      const form=unit==="rational"?fractions("a","x-h")+"+k":"a\\sqrt{"+(f.s>0?"x-h":"h-x")+"}+k";
      const declaration=ctx.source("함수의 꼴","함수 "+m("f(x)="+form)+"에서 "+m("a,h,k")+"는 상수이고 "+m("a\\ne 0")+"이다.");
      const solved=apply("fit",unit,[h,k],[x,y],f.s);
      const position=ctx.step("location","주어진 그래프 조건에서 위치 복원",m("h="+h+", k="+k),[id]);
      const fit=ctx.step("fit","그래프 조건으로 계수 결정",m("a="+solved.a),[position,p,declaration]);
      const points=R.points(solved).filter(([t])=>t!==x&&t!==h);
      if(level==="A"||!points.length){
        if(goal==="bounds-fit"||goal==="endpoint-fit"||goal==="asymptote-fit"||goal==="symmetry-fit"){
          const variants=[rule(solved),rule({...solved,a:-solved.a}),rule({...solved,k:solved.k+1})].map(m);
          return ctx.finish("이 조건을 만족하는 함수식을 고르시오.",choice(rng,variants[0],variants.slice(1)),
            ["그래프 조건으로 위치를 정하고, 주어진 점을 대입해 계수 "+m(solved.a)+"를 구한다."],format);
        }
        return ctx.finish(m("a")+"의 값을 구하시오.",scalar(solved.a),
        ["주어진 점의 좌표를 함수식에 대입해 "+m("a")+"를 구한다."],format);
      }
      const [t,z]=pick(rng,points);
      const target=pick(rng,["value","preimage","translated"]);
      if(target==="translated"){
        const dx=pick(rng,[-2,-1,1,2]),dy=pick(rng,[-2,-1,1,2]), shifted=apply("translation",solved,[dx,dy]);
        const fact=ctx.source("이동 관계",m("g(x)="+shift("f("+shift("x",dx)+")",-dy))+"라 하자.");
        const translated=ctx.step("translation","복원된 함수를 이동",m(rule(shifted)),[fit,fact]);
        const value=R.value(shifted,t+dx);
        if(!close(value,z+dy))throw new RangeError("이동한 함숫값을 검산할 수 없습니다.");
        ctx.step("value","이동 후 지정한 입력의 출력",m(value),[translated]);
        return ctx.finish(m("g("+(t+dx)+")")+"의 값을 구하시오.",scalar(value),["그래프 조건으로 "+m("a="+solved.a)+"를 정한다. 이동 관계에 대입하면 "+m(value)+"이다."],format);
      }
      if(target==="preimage"){
        ctx.step("preimage","다른 함숫값에서 유일한 입력 복원",m(t),[fit]);
        return ctx.finish(m("f(x)="+z)+"를 만족하는 "+m("x")+"의 값을 구하시오.",scalar(t),
          ["주어진 점에서 계수 "+m(solved.a)+"를 먼저 구한다. 복원한 함수는 일대일함수이므로 "+m("x="+t)+"만 조건을 만족한다."],format);
      }
      ctx.step("value","복원한 식에서 다른 함수값 결정",m(z),[fit]);
      return ctx.finish(m("f("+t+")")+"의 값을 구하시오.",scalar(z),["점 "+m(pairText([x,y]))+"를 식에 대입하면 "+m("a="+solved.a)+"이다. 이를 이용해 "+m("f("+t+")="+z)+"를 얻는다."],format);
    }
    if(goal==="compose"&&rng()<.7){
      const inner=sample(unit,rng),outer=sample(unit,rng);
      if(unit==="radical"){
        outer.s=inner.s=1;
        inner.a=1;
        outer.h=inner.k+rand(rng,1,3);
      }else if(rng()<.5)outer.h=inner.k;
      const a=source(outer), b=source(inner), result=apply("composition",outer,inner);
      const node=ctx.step("composition","안쪽 함수의 출력이 바깥 함수의 정의역에 속하는 조건",R.intervalText(R.domain(result)),[a.id,b.id]);
      const key=level!=="A"&&rng()<.4?"range":"domain";
      const {name,answer}=graphBound(result,key);
      if(level!=="A")ctx.step(key,name+"의 경계와 제외값",answer.text,[node]);
      return ctx.finish(m("f\\circ g")+"의 "+name+"을 구하시오.",answer,
        ["안쪽 함수 자체의 정의 조건과 그 출력이 바깥 함수에 들어갈 조건을 함께 적용한다.",
          name+"은 "+answer.text+"이다."],format);
    }
    if(goal==="linear-fraction"){
      const expr=fractions(affine(f.k,f.a-f.k*f.h),shift("x",f.h));
      const id=ctx.source("일차식의 비",m("f(x)="+expr)+"이다.");
      const split=ctx.step("rearrange","분자의 일차항과 상수항 분리",m(rule(f)),[id]);
      if(level==="A")return ctx.finish("세로 점근선의 방정식이 "+m("x=b")+"일 때, "+m("b")+"의 값을 구하시오.",scalar(f.h),["분모가 0인 입력을 확인한다."],format);
      if(rng()<.5){
        const inv=apply("inverse",f), x=pick(rng,R.points(inv))[0], y=R.value(inv,x);
        ctx.step("inverse","분자와 분모의 관계에서 원래 입력 역산",m(y),[split]);
        return ctx.finish(m("f(x)="+x)+"를 만족하는 "+m("x")+"의 값을 구하시오.",scalar(y),
          [m("f(x)="+rule(f))+"로 정리한 뒤 식을 풀면 "+m("x="+y)+"이다."],format);
      }
      ctx.step("range","수평 점근선에서 제외된 출력",m(f.k),[split]);
      return ctx.finish("함숫값으로 나올 수 없는 실수를 구하시오.",scalar(f.k),[m("f(x)="+rule(f))+"로 정리하면 분수 부분이 0이 될 수 없다."],format);
    }
    if(goal==="definition"&&level==="A"){
      const correct=m(rule(f)), other=unit==="rational"?m("\\sqrt{"+shift("x",f.h)+"}"):m(fractions(1,shift("x",f.h)));
      const id=ctx.source("함수식 후보","");
      ctx.step("classify","함수식의 분류",correct,[id]);
      return ctx.finish(unit==="rational"?"유리함수의 식을 고르시오.":"무리함수의 식을 고르시오.",
        choice(rng,correct,[other,m(unit==="rational"?"\\sqrt{x+1}+2":"x^2+1")]),
        [unit==="rational"?"유리함수의 식은 두 다항식의 비로 나타낼 수 있다.":"무리함수의 식에는 변수가 들어 있는 근호가 남는다."],format);
    }
    const asGraph=goal==="graph"||goal==="graph-bounds";
    const original=source(f,asGraph);
    let current=original;
    const required={translate:"translation",reflect:"reflection",compose:"composition",inverse:"inverse",quadratic:"inverse"}[goal];
    if(required&&required!=="inverse")current=transformation(current,required);
    if(required==="inverse")current=transformation(current,required);
    const {f:built,name,id}=current, plot=asGraph?curvePlot(f):undefined;
    if(goal==="graph"&&rng()<.65){
      const options=[rule(built),rule({...built,a:-built.a}),rule({...built,k:built.k+1})].map(m);
      ctx.step("readGraph","그래프의 기준점과 가지 방향에서 식 복원",options[0],[id]);
      return ctx.finish(m(name)+"의 함수식을 고르시오.",choice(rng,options[0],options.slice(1)),
        ["기준 위치와 그래프가 뻗는 방향을 확인한 뒤 그래프가 지나는 점을 대입한다."],format,{plot});
    }
    if(goal==="compare-branches"){
      const second=transformation(original,pick(rng,["translation","reflection"]));
      const candidate=R.points(built).find(([x,y])=>exactDecimal(y)&&exactDecimal(R.value(second.f,x)));
      if(!candidate)throw new RangeError("두 함수의 공통 정의역에서 입력을 고를 수 없습니다.");
      const [x,y]=candidate, z=R.value(second.f,x), sum=rng()<.5;
      const answer=round(sum?y+z:y-z);
      ctx.step(sum?"sumValues":"compareValues","같은 입력에서 두 변환의 함숫값 비교",m(answer),[id,second.id]);
      return ctx.finish(m(name+"("+x+")"+(sum?"+":"-")+second.name+"("+x+")")+"의 값을 구하시오.",scalar(answer),
        ["같은 입력을 두 변환에 각각 적용한다. 두 함숫값은 "+m(y)+", "+m(z)+"이다."],format);
    }
    if(goal==="intersections"||goal==="line-position"){
      const valid=R.points(built);
      if(!valid.length||!["rational","radical"].includes(built.kind))throw new RangeError("교점이 있는 함수 범위가 필요합니다.");
      const [x,y]=pick(rng,valid), a=pick(rng,[-2,-1,0,1,2]), line={kind:"affine",a,k:y-a*x+(goal==="line-position"?rand(rng,-3,3):0)};
      const points=apply("intersections",built,line);
      if(level!=="A"&&goal==="line-position"&&rng()<.55){
        const slopes=[-2,-1,0,1,2], target=points.length;
        const accepted=slopes.filter(a=>apply("intersections",built,{...line,a}).length===target);
        const constraint=ctx.source("교점 개수 조건",m("y=kx"+(line.k<0?line.k:"+"+line.k))+"의 기울기는 "+m(list(slopes))+"에서 고른다.");
        ctx.step("intersections","원래 정의역에서 교점 확인",m(target),[id,constraint]);
        ctx.step("filterSlopes","조건을 만족하는 기울기 후보",m(list(accepted)),[id,constraint]);
        return ctx.finish(m("k\\in "+list(slopes))+"일 때, 직선 "+m("y=kx"+(line.k<0?line.k:"+"+line.k))+"와 함수 "+m(name)+"의 그래프가 "+
          m(target)+"개의 점에서 만나도록 하는 모든 "+m("k")+"를 구하시오.",set(accepted),
          ["각 기울기에 대해 두 식을 연립한다. 원래 식의 정의역과 부호 조건을 만족하는 교점만 센다."],format);
      }
      const constraint=ctx.source("교차하는 직선", "직선의 방정식은 "+m("y="+rule(line))+"이다.");
      const useCount=goal==="line-position"||points.some(([x])=>!Number.isSafeInteger(x));
      const answer=useCount?scalar(points.length):set(points.map(([x])=>x));
      ctx.step("intersections","연립 후 원래 함수식의 해만 선택",useCount?m(points.length):answer.text,[id,constraint]);
      return ctx.finish(useCount?"함수 "+m(name)+"의 그래프와 직선의 서로 다른 교점 개수를 구하시오.":
        "함수 "+m(name)+"의 그래프와 직선의 교점의 가로 좌표를 모두 구하시오.",answer,
        ["두 식을 같게 놓아 후보를 구한다. "+(unit==="radical"?"제곱해서 얻은 후보는 원래 근호식에 대입해 확인한다.":"분모가 0이 되는 입력은 제외한다."),
          useCount?"조건을 만족하는 교점은 "+m(points.length)+"개이다.":"가로 좌표는 "+answer.text+"이다."],format);
    }
    if(goal==="extrema"){
      if(!["rational","radical"].includes(built.kind))throw new RangeError("극값을 물을 함수의 범위가 필요합니다.");
      const pts=R.points(built).filter(([x])=>built.kind==="radical"||x>built.h);
      if(pts.length<2)throw new RangeError("닫힌 구간을 고를 수 없습니다.");
      const a=pts[0][0],b=pts.at(-1)[0],bounds=[a,b].sort((x,y)=>x-y);
      const condition=ctx.source("닫힌 구간",m(bounds[0]+"\\le x\\le "+bounds[1])+"에서 생각한다.");
      const extrema=apply("extrema",built,bounds), i=rand(rng,0,1);
      ctx.step("extrema","증가·감소를 확인해 양 끝 비교",m(pairText(extrema)),[id,condition]);
      return ctx.finish(m(name)+"의 "+(i?"최댓값":"최솟값")+"을 구하시오.",scalar(extrema[i]),
        ["주어진 구간에서 함수는 한 방향으로만 변한다. 양 끝에서의 값은 "+m(extrema[0]+", "+extrema[1])+"이다."],format);
    }
    if(goal==="area"){
      if(built.kind!=="rational")throw new RangeError("유리함수 그래프가 필요합니다.");
      const p=pick(rng,R.points(built)), [x,y]=p;
      const condition=ctx.source("그래프의 점",m(name)+"의 그래프 위에 있는 점 "+m("P"+pairText(p))+"를 생각한다.");
      const projection=ctx.step("length","두 점근선까지의 거리",m(pairText([Math.abs(x-built.h),Math.abs(y-built.k)])),[id,condition]);
      const area=Math.abs((x-built.h)*(y-built.k));
      if(!close(area,Math.abs(built.a)))throw new RangeError("직사각형 넓이 검산에 실패했습니다.");
      ctx.step("area","두 거리의 곱",m(area),[projection]);
      return ctx.finish("점 "+m("P")+"를 지나고 좌표축에 평행한 두 직선과 두 점근선으로 둘러싸인 직사각형의 넓이를 구하시오.",scalar(area),
        ["두 변의 길이는 점에서 각 점근선까지의 거리이다. 두 거리를 곱하면 "+m(area)+"이다."],format);
    }
    if(["domain","range","graph-bounds","definition","linear-root"].includes(goal)||goal==="compose"&&rng()<.5){
      const key=goal==="range"?"range":goal==="domain"||goal==="linear-root"?"domain":pick(rng,["domain","range"]);
      const {name:label,answer}=graphBound(built,key);
      ctx.step(key,label+" 결정",answer.text,[id]);
      return ctx.finish(m(name)+"의 "+label+"을 구하시오.",answer,["함수식과 그래프의 조건을 적용하면 "+label+"은 "+answer.text+"이다."],format,plot?{plot}:undefined);
    }
    if(goal==="symmetry"&&level!=="A"){
      const [x,y]=pick(rng,R.points(built)), image=[2*built.h-x,2*built.k-y];
      if(!close(R.value(built,image[0]),image[1]))throw new RangeError("중심 대칭 검산 실패");
      const condition=ctx.source("그래프 위의 점",m(name)+"의 그래프는 점 "+m("P"+pairText([x,y]))+"를 지난다.");
      const node=ctx.step("symmetry","대칭의 중심",m(pairText([built.h,built.k])),[id]);
      ctx.step("centralReflection","중점 조건으로 대응점 결정",m(pairText(image)),[node,condition]);
      return ctx.finish("그래프의 대칭의 중심에 대하여 "+m("P")+"와 대칭인 점의 좌표를 구하시오.",point(image),
        ["대칭의 중심은 원래 점과 대응점의 중점이다. 따라서 대응점은 "+m(pairText(image))+"이다."],format);
    }
    if(goal==="asymptotes"||goal==="symmetry"||goal==="endpoint"){
      const p=[built.h,built.k];
      const title=goal==="endpoint"?"시작점":goal==="symmetry"?"대칭의 중심":"점근선의 교점";
      const node=ctx.step(goal,title+"의 좌표",m(pairText(p)),[id]);
      if(goal==="asymptotes"&&rng()<.6){
        const variants=[p,[p[0]+1,p[1]],[p[0],p[1]-1]].map(([x,y])=>m("x="+x)+", "+m("y="+y));
        return ctx.finish(m(name)+"의 두 점근선을 고르시오.",choice(rng,variants[0],variants.slice(1)),
          ["분모가 0이 되는 입력과 분수 부분이 0에 가까워질 때의 출력을 확인한다."],format);
      }
      if(level==="A"||rng()<.5)return ctx.finish(m(name)+"의 그래프에서 "+title+"의 좌표를 구하시오.",point(p),[title+"은 "+m(pairText(p))+"이다."],format);
      const target=pick(rng,["sum","difference"]), sum=target==="sum"?p[0]+p[1]:p[0]-p[1];
      ctx.step(target,"두 좌표의 "+(target==="sum"?"합":"차"),m(sum),[node]);
      return ctx.finish(m(name)+"의 그래프에서 "+title+"의 가로 좌표"+(target==="sum"?"와 세로 좌표의 합":"에서 세로 좌표를 뺀 값")+"을 구하시오.",
        scalar(sum),[title+"은 "+m(pairText(p))+"이다. 따라서 답은 "+m(sum)+"이다."],format);
    }
    if(goal==="monotone"){
      if(built.kind!=="radical")throw new RangeError("무리함수 그래프가 필요합니다.");
      const ok=built.a*built.s>0;
      ctx.step("monotone","정의역에서 두 입력의 순서 비교",ok?"증가":"감소",[id]);
      return ctx.finish(m(name)+"는 정의역에서 증가하는가?",yes(ok),["근호 안의 일차식과 근호 앞 계수의 부호를 함께 확인한다."],format);
    }
    if(goal==="inverse"||goal==="quadratic"){
      const candidates=[rule(built),rule({...built,k:built.k+1}),rule({...built,k:built.k-1})].map(m);
      const askRule=rng()<.6;
      if(askRule){
        ctx.step("range","역함수의 정의역 확인",R.intervalText(R.domain(built)),[id]);
        return ctx.finish("정의역이 "+R.intervalText(R.domain(built))+"인 역함수 "+m(name)+"의 식을 고르시오.",choice(rng,candidates[0],candidates.slice(1)),
          ["원래 함수의 입력과 출력을 바꾸고, 원래 함수의 치역을 정의역으로 삼는다."],format);
      }
    }
    const pts=R.points(built);
    if(!pts.length)throw new RangeError("구할 함숫값을 선정할 수 없습니다.");
    const [x,y]=pick(rng,pts), preimage=level!=="A"&&rng()<.35;
    ctx.step(preimage?"preimage":"value","주어진 입력과 출력의 관계",m(preimage?x:y),[id]);
    return ctx.finish(preimage?m(name+"(x)="+y)+"를 만족하는 "+m("x")+"의 값을 구하시오.":
      goal==="point"?m(name)+"의 그래프가 "+m("("+x+",t)")+"를 지날 때, "+m("t")+"의 값을 구하시오.":m(name+"("+x+")")+"의 값을 구하시오.",
      scalar(preimage?x:y),["최종 함수식에 대입하면 "+m(name+"("+x+")="+y)+"이다."],format,plot?{plot}:undefined);
  }

  const routineOperations=new Set(["value","evaluate","coefficient","square","sum","difference","graph","endpoint"]);
  function generate(unit,goal,{rng=Math.random,level="B",difficulty,format,avoidPaths=[]}={}){
    const gradeByChallenge={C1:"low",C2:"medium",C3:"high"};
    const requestedGrade=gradeByChallenge[difficulty]??difficulty;
    const mode=format??pick(rng,["written","choice"]);
    const recent=avoidPaths.slice(-8);
    const boundsTargets=unit==="functions"?["domain","codomain","range"]:["domain","range"];
    const planGoal=level==="C"?(rng()<.4?pick(rng,boundsTargets):""):goal;
    const grade=level==="C"?requestedGrade??pick(rng,["low","medium","high"]):requestedGrade;
    const graphSupport=ForgeFunctionSynthesis.supports(unit,goal);
    const intervalSupport=ForgeFunctionIntervalSynthesis.supports(unit,goal);
    const pieceSynthesis=unit==="functions"&&goal==="piece-compose"&&level==="B";
    const finiteSynthesis=unit==="functions"&&level==="B"&&ForgeFiniteFunctionSynthesis.supports(goal);
    const algebraSynthesis=level==="B"&&ForgeAlgebraSynthesis.supports(unit,goal);
    const relationPractice=finiteSynthesis||algebraSynthesis||ForgeFunctionRelationPractice.supports(unit,goal)&&level!=="C";
    const synthesis=level==="C"||level==="B"&&(graphSupport||intervalSupport);
    const useIntervals=level==="C"
      ?planGoal==="domain"&&unit==="functions"||rng()<.45
      :intervalSupport&&(!graphSupport||rng()<.32);
    for(let attempt=0;attempt<(relationPractice?160:synthesis?16:100);attempt++){
      try{
        const history=attempt<12?recent:recent.slice(-1);
        const makeContext=()=>context(level,rng);
        const search=engine=>engine.generate(unit,planGoal,level,rng,mode,grade,history,makeContext);
        const result=pieceSynthesis?ForgePieceFunctionSynthesis.generate(rng,mode,grade,makeContext):finiteSynthesis?ForgeFiniteFunctionSynthesis.generate(goal,rng,mode,grade,makeContext):algebraSynthesis?ForgeAlgebraSynthesis.generate(unit,goal,rng,mode,grade,makeContext):relationPractice?ForgeFunctionRelationPractice.generate(unit,goal,level,rng,mode,grade,makeContext()):synthesis?(useIntervals?search(ForgeFunctionIntervalSynthesis):null)??
          (level==="C"||graphSupport?search(ForgeFunctionSynthesis):null)??
          (!useIntervals&&(level==="C"||intervalSupport)?search(ForgeFunctionIntervalSynthesis):null):
          (unit==="functions"?ForgeFunctionBounds.generate(goal,level,rng,0,context(level,rng),mode)??
            ForgeFunctionSymbolic.generate(goal,level,rng,context(level,rng),mode)??finiteProblem(goal,level,rng,mode):
            isExpression.has(goal)||goal==="defined"?expressionPractice(unit,goal,level,rng,mode):
            curveProblem(unit,goal,level,rng,mode));
        if(!result||result.answer.kind==="scalar"&&!Number.isFinite(result.answer.value))continue;
        if(relationPractice&&level==="B"&&recent.at(-1)?.slice(0,recent.at(-1).lastIndexOf("/"))===result.answerPath.id.slice(0,result.answerPath.id.lastIndexOf("/")))continue;
        if((relationPractice||!synthesis)&&attempt<20&&recent.some(id=>id.slice(0,id.lastIndexOf("/"))===result.answerPath.id.slice(0,result.answerPath.id.lastIndexOf("/"))))continue;
        const depth=result.inspection.graph.length-1;
        const concepts=result.reasoning?.concepts??new Set(result.answerPath.operations.filter(op=>!routineOperations.has(op))).size;
        const assessed=result.relationGrade??result.reasoning?.assessedGrade??(concepts>1?"medium":"low");
        if(grade&&grade!==assessed)continue;
        return {...result,level,type:"challenge-"+unit,template:{functions:"함수",rational:"유리함수",radical:"무리함수"}[unit]+" 종합",
          ...(level==="C"?{challengeDifficulty:Object.keys(gradeByChallenge).find(key=>gradeByChallenge[key]===assessed)}:{}),
          difficulty:level==="A"?null:{grade:assessed,depth,concepts}};
      }catch(error){
        if(!(error instanceof RangeError))throw error;
      }
      if(!relationPractice&&!synthesis&&grade&&attempt>=30)break;
    }
    throw new RangeError("주어진 조건에서 함수 문제를 구성할 수 없습니다.");
  }
  ForgeFunctionCompiler = globalThis.ForgeFunctionCompiler = Object.freeze({generate});
})();


;

/* catalog.js */
(() => {
  "use strict";

  const base = globalThis.MathForge;
  const added = globalThis.ForgeTopics;
  for(const [type,variant] of Object.entries(globalThis.ForgePlaneCompositions??{})) {
    if(!added.types[type])continue;
    added.types[type].variants.push(variant);
    added.types[type].compositeVariant=variant.id;
  }
  // Result contracts for legacy scalar templates. These are declarations,
  // not question-text matching; new templates can declare the same paths directly.
  const scalarContracts={
    "k": [
      "a-point-on-line::main",
      "section-internal::section-ratio:main",
      "section-internal::coordinate-directed-number-line:main",
      "concurrent-lines::main",
      "circle-general::circle-origin-constant:main",
      "factor-parameter::main",
      "double-root-parameter::main",
      "equality-unordered-set::main",
      "equality-unordered-set::expanded-집합의 순서와 매개변수",
      "root-gap::expanded-root-gap-application",
      "coordinate-right-vertex::main",
      "line-parameter-vertical::main",
      "function-valid-relation::main",
      "function-bijection-missing::function-bijection-missing:main",
      "function-composition-coefficient::expanded-function-composition-coefficient-application"
    ],
    "t": [
      "parallel-line::line-parameter-parallel:main",
      "perpendicular-line::line-unknown-slope-two-points:main",
      "coordinate-distance-coordinate::main",
      "line-distance-on-axis::main",
      "circle-axis-tangency::main",
      "translate-circle-tangency::main",
      "rational-numerator-parameter::main",
      "rational-y-intercept-parameter::main",
      "radical-restricted-range::expanded-radical-restricted-range-application",
      "coordinate-missing-collinear::main",
      "transform-shift-line-through-point::main",
      "function-linear-injection-parameter::main",
      "radical-y-intercept-parameter::main"
    ],
    "a": [
      "product-coefficient::expanded-product-coefficient-application",
      "rational-two-points::expanded-rational-two-points-application",
      "radical-point-parameter::main",
      "a-poly-factor::direct"
    ],
    "c": [
      "rational-coefficient-through-point::main"
    ],
    "b": [
      "radical-parameter-domain::main",
      "radical-two-values::main"
    ]
  };
  for(const [symbol,keys] of Object.entries(scalarContracts)) for(const key of keys) {
    const [type,id]=key.split("::"), variant=added.types[type]?.variants.find(v=>v.id===id);
    if(!variant) throw new Error("Missing scalar contract: "+key);
    variant.resultType={baseType:"Scalar",capabilities:["value","affine"],symbol};
    variant.answerPaths=globalThis.ForgeAnswerPaths.scalarValuePaths(symbol);
  }
  const UNITS = {
    polynomials: "다항식",
    quadratics: "이차방정식과 이차부등식",
    coordinate: "평면좌표",
    lines: "직선의 방정식",
    circles: "원의 방정식",
    transformations: "도형의 이동",
    sets: "집합",
    propositions: "명제",
    functions: "함수",
    rational: "유리함수",
    radical: "무리함수",
  };
  const COURSES = {
    common1: { label:"공통수학 1", units:["polynomials","quadratics"] },
    common2: { label:"공통수학 2", units:["coordinate","lines","circles","transformations","sets","propositions","functions","rational","radical"] },
    algebra: { label:"대수", units:[] },
    calculus1: { label:"미적분Ⅰ", units:[] },
    calculus2: { label:"미적분Ⅱ", units:[] },
    probability: { label:"확률과 통계", units:[] },
  };
  const courseForUnit = unit => Object.keys(COURSES).find(course => COURSES[course].units.includes(unit));
  const previousTypes = [
    ["remainder-linear", "polynomials", "일차식으로 나눈 나머지", "A", "remainder", "constant"],
    ["remainder-eval", "polynomials", "이차식으로 나눈 나머지의 함숫값", "B", "remainder", "evaluate"],
    ["remainder-leading", "polynomials", "나머지의 일차항 계수", "B", "remainder", "linear"],
    ["remainder-constant", "polynomials", "나머지의 상수항", "B", "remainder", "intercept"],
    ["intersection-count", "quadratics", "판별식으로 교점 개수 구하기", "A", "intersection", "count"],
    ["intersection-sum", "quadratics", "근과 계수의 관계로 교점 좌표의 합 구하기", "B", "intersection", "sum"],
    ["intersection-positive", "quadratics", "조건을 만족하는 교점의 좌표", "B", "intersection", "positiveY"],
    ["intersection-distance", "quadratics", "포물선과 직선의 두 교점 사이 거리", "B", "intersection", "distance"],
    ["inequality-sign", "quadratics", "인수분해로 이차부등식의 해 구하기", "A", "inequality", "direct"],
    ["inequality-compare", "quadratics", "두 식의 대소 비교로 구간 구하기", "B", "inequality", "compare"],
    ["inequality-count", "quadratics", "주어진 범위에서 정수 해의 개수", "B", "inequality", "integerCount"],
  ];
  const legacy = Object.fromEntries(previousTypes.map(([id, , , , type, path]) => [`${type}:${path}`, id]));
  const TYPES = {
    ...Object.fromEntries(previousTypes.map(([id, unit, label, level, type, path]) => [id, { unit, label, level, source:{type,path} }])),
    ...added.types,
  };
  // Short display names retain the original label for search and stable type IDs.
  const compactLabels = {
  "intersection-distance": "포물선과 직선의 교점 거리",
  "inequality-sign": "인수분해와 이차부등식",
  "inequality-compare": "두 식의 대소와 해",
  "inequality-count": "범위 내 정수 해 개수",
  "and-or": "‘또는’과 ‘그리고’ 조건",
  "suff-necessary-parameter": "충분·필요조건과 상수",
  "real-properties-proof": "실수의 성질과 절대부등식",
  "absolute-value-inequality": "절댓값을 포함한 절대부등식",
  "amgm-product": "산술기하평균과 곱의 최솟값",
  "cauchy-linear": "코시 부등식과 일차식 최댓값",
  "cauchy-square": "코시 부등식과 제곱합",
  "cauchy-geometry": "코시 부등식의 도형 활용",
  "set-cardinality": "두 집합의 포함배제",
  "set-subset-count": "원소 포함·제외 부분집합",
  "set-range-parameter": "집합의 포함 관계와 상수",
  "set-demorgan": "집합 연산과 드모르간 법칙",
  "suff-necessary": "충분·필요·필요충분조건",
  "true-parameter": "참인 명제의 상수",
  "quantifiers": "‘모든’과 ‘어떤’ 명제",
  "suff-necessary-truth": "필요충분조건과 명제",
  "a-amgm": "산술평균과 기하평균",
  "amgm-sum": "산술기하평균과 합의 최솟값",
  "amgm-fixed": "합 또는 곱이 일정할 때",
  "a-set-empty": "조건과 공집합",
  "a-set-cardinality-list": "원소나열법과 중복 원소",
  "a-set-builder-multiples": "조건제시법과 원소나열법",
  "set-application-neither": "설문에서 둘 다 아닌 인원",
  "set-complement-inclusion-missing": "여집합의 포함과 차집합",
  "a-proposition-compare-squares": "제곱의 부호와 명제",
  "proposition-converse-and-contrapositive": "역과 대우의 참·거짓",
  "proposition-quantifier-intersection": "존재 조건과 논리곱",
  "a-slope": "두 점을 지나는 직선 기울기",
  "midpoint-inverse": "중점에서 끝점 역산",
  "centroid-inverse": "무게중심에서 꼭짓점 역산",
  "axis-equidistance": "두 점에 등거리인 축 위 점",
  "parallel-line": "평행 조건과 직선의 방정식",
  "perpendicular-line": "수직 조건과 직선의 방정식",
  "concurrent-lines": "세 직선의 교점과 상수",
  "line-through-intersection": "교점을 지나는 평행선",
  "line-projection": "점에서 직선에 내린 수선",
  "distance-line-parameter": "점과 직선 사이의 거리 활용",
  "circle-diameter": "지름의 양 끝점과 원",
  "circle-line-position": "원과 직선의 위치 관계",
  "circle-tangent-point": "원 위 점에서 그은 접선",
  "circle-tangent-parallel": "평행 조건과 원의 접선",
  "circle-three-points": "세 점을 지나는 원의 중심",
  "division-rebuild": "몫과 나머지로 다항식 복원",
  "factor-parameter": "인수정리와 미지계수",
  "two-factors-parameters": "두 인수와 미지계수",
  "quartic-even-factorization": "짝수차 사차식의 인수분해",
  "power-remainder": "거듭제곱을 나눈 나머지",
  "cube-sum-identity": "합과 곱에서 세제곱합",
  "remainder-algebra": "나머지의 합과 곱",
  "known-root-cubic": "한 인수로 삼차식 인수분해",
  "double-root-parameter": "중근 조건과 미지계수",
  "real-roots-parameter": "서로 다른 실근과 상수",
  "positive-roots-parameter": "두 양의 근과 상수",
  "opposite-roots-parameter": "부호가 다른 두 근과 상수",
  "shifted-roots": "평행이동한 근과 계수",
  "root-square-sum": "근과 계수로 제곱합",
  "axis-equal-values": "같은 함숫값과 대칭축",
  "quadratic-restricted-min": "제한 구간 이차함수 최솟값",
  "quadratic-restricted-max": "제한 구간 이차함수 최댓값",
  "quadratic-always-sign": "판별식과 이차부등식의 해",
  "venn-complement-count": "벤 다이어그램과 여집합",
  "exactly-two-of-three": "세 집합 중 두 곳에 속함",
  "complement-intersection-count": "여집합과 교집합의 원소 수",
  "recover-a-set": "합집합과 교집합에서 복원",
  "power-set-union-difference": "합집합과 멱집합의 차",
  "subsets-fixed-size": "원소를 포함하는 부분집합",
  "subsets-intersection": "교집합이 정해진 부분집합",
  "nested-subsets": "포함 관계인 부분집합 쌍",
  "equality-unordered-set": "집합의 상등과 상수",
  "set-divisibility-count": "배수 조건의 교집합",
  "weighted-absolute-min": "가중 절댓값의 합",
  "abs-maximum-bounded": "절댓값 조건과 최댓값",
  "amgm-three-sum": "세 양수의 곱과 합의 최솟값",
  "amgm-three-product": "세 양수의 가중합과 곱",
  "cauchy-reciprocals": "코시 부등식과 역수의 합",
  "cauchy-equality-coordinate": "코시 부등식의 등호와 좌표",
  "degree-after-cancellation": "최고차항 소거와 차수",
  "two-point-product-remainder": "곱을 이차식으로 나눈 나머지",
  "translated-polynomial-factor": "평행이동 다항식과 인수",
  "root-gap": "판별식과 두 실근의 거리",
  "quadratic-vertex-point": "꼭짓점·한 점과 이차함수",
  "quadratic-union": "이차부등식의 합집합",
  "intersection-bound": "전체집합과 교집합 범위",
  "disjoint-sets-parameter": "서로소 정수 집합과 상수",
  "reverse-triangle-equality": "절댓값 차의 최댓값과 등호",
  "a-number-line-distance": "수직선의 두 점 사이 거리",
  "coordinate-distance-coordinate": "거리·좌우 조건과 좌표",
  "coordinate-directed-number-line": "수직선 내분과 끝점 역산",
  "coordinate-section-inverse": "내분점에서 끝점 복원",
  "coordinate-section-distance": "두 내분점 사이 거리",
  "coordinate-nested-section": "내분점과 중점",
  "coordinate-triangle-perimeter": "좌표와 삼각형의 둘레",
  "coordinate-square-diagonal": "정사각형 대각선과 넓이",
  "coordinate-right-vertex": "세 점의 거리와 직각 조건",
  "line-parameter-parallel": "평행 조건과 직선 계수",
  "line-intercepts-rebuild": "두 절편으로 직선 위의 점",
  "line-parallel-bisector": "두 평행선의 등거리 직선",
  "line-distance-on-axis": "축 위 점과 직선 사이 거리",
  "line-perpendicular-bisector": "수직이등분선의 y절편",
  "a-circle-equation": "중심과 반지름에서 원의 식",
  "circle-radius-from-point": "원 위 두 점과 반지름의 비",
  "circle-origin-constant": "원점 지나는 원과 상수",
  "circle-axis-intersection": "축 교점과 원의 반지름",
  "circle-axis-tangency": "좌표축에 접하는 원의 중심",
  "circle-center-on-axis": "두 점과 중심축으로 원 복원",
  "circle-nearest-axis": "원 위 점과 축의 최소 거리",
  "translate-two-stages": "연속 평행이동의 이동량",
  "translate-circle-tangency": "원이 축에 접하는 평행이동",
  "translate-parabola-vertex": "꼭짓점과 평행이동량",
  "reflect-line-diagonal": "대각선 대칭 후 직선의 절편",
  "translation-reflection-order": "평행·대칭이동의 순서",
  "transform-fixed-axis": "대칭·평행이동과 고정 좌표",
  "transform-isometry": "이동 전후 거리의 불변성",
  "transform-identify-reflection": "이동 전후 좌표와 대칭 기준",
  "function-valid-relation": "함수가 되는 조건",
  "function-image-restricted": "유한 정의역과 이차함수 치역",
  "function-injective-quadratic": "제한 정의역의 일대일함수",
  "function-composition-order": "합성 순서와 함수값의 차",
  "function-composition-finite-domain": "대응표에서 합성 가능한 입력",
  "function-composition-parameter": "합성 함수값의 상수 역산",
  "function-inverse-restricted": "제한 이차함수의 역함수값",
  "function-inverse-fixed": "함수와 역함수의 공통점",
  "function-context-composition": "변환 관계의 합성과 함수값",
  "a-rational-simplify": "유리식의 공통인수 약분",
  "a-rational-range": "유리함수에서 빠진 함숫값",
  "a-rational-graph": "유리함수 그래프의 중심",
  "rational-center-general": "유리함수 정의역·치역·점근선",
  "rational-numerator-parameter": "수평 점근선과 분자 계수",
  "rational-coefficient-through-point": "점근선과 한 점으로 계수",
  "rational-y-intercept-parameter": "y절편과 유리함수 상수",
  "rational-relative-branches": "점근선과 그래프 가지의 위치",
  "rational-translate": "점근선과 평행이동량",
  "rational-restricted-range": "제한 구간의 유리함수 치역",
  "rational-center-symmetry": "중심 대칭인 점",
  "rational-match-graph": "점근선과 가지로 식 선택",
  "rational-two-points": "두 점과 점근선으로 식 결정",
  "rational-line-domain-range": "유리함수 정의역·치역",
  "a-radical-simplify": "실수의 부호와 제곱근",
  "a-radical-domain": "근호와 정의역",
  "a-radical-graph": "무리함수 그래프의 시작점",
  "radical-parameter-domain": "정의역의 경계와 근호 상수",
  "radical-point-parameter": "시작점과 근호의 계수",
  "radical-two-values": "두 함수값과 근호 속 일차식",
  "radical-no-intercept": "치역과 x축 교점의 존재",
  "radical-reflection-graph": "y축 대칭과 무리함수 정의역",
  "radical-translate-endpoint": "평행이동과 시작점 역산",
  "radical-restricted-range": "제한 구간의 무리함수 치역",
  "radical-inverse-domain": "치역과 역함수의 정의역",
  "radical-two-root-domain": "두 제곱근의 정의역",
  "radical-match-graph": "무리함수 그래프와 식 선택",
  "radical-context-threshold": "제곱근 모형과 조건의 경계",
  "coordinate-axis-section-ratio": "축을 지나는 선분의 내분비",
  "coordinate-parallel-midsegments": "삼각형의 두 중점 사이 길이",
  "coordinate-parallelogram-fourth": "평행사변형의 꼭짓점 복원",
  "coordinate-triangle-horizontal-area": "수평인 변과 삼각형 넓이",
  "coordinate-rectangle-two-sides": "직사각형의 두 변과 넓이",
  "coordinate-two-travel-legs": "꺾인 경로와 직선 거리 차",
  "coordinate-missing-collinear": "일직선 위 세 점의 좌표",
  "a-line-slope-intercept": "기울기·절편과 직선식",
  "a-line-parallel-test": "기울기와 평행 판별",
  "a-line-from-point-slope": "한 점·기울기와 직선식",
  "line-two-slopes-area": "두 직선과 y축의 삼각형",
  "line-intercept-area-parameter": "축과 이루는 넓이와 절편",
  "line-three-relations": "직선의 일치·평행·교차",
  "line-point-half-plane": "직선에 대한 두 점의 위치",
  "line-two-distance-axes": "두 직선에 등거리인 점",
  "line-perpendicular-distance-area": "점과 직선의 거리와 넓이",
  "line-unknown-slope-two-points": "수직 조건과 점의 좌표",
  "a-circle-radius-distance": "원 위 점과 중심의 거리",
  "a-circle-axis-distance": "평행선과 원 중심의 거리",
  "a-circle-expanded-linear": "원 방정식의 전개와 일차항",
  "circle-nonzero-radius-parameter": "원이 되는 일반형의 상수",
  "circle-oblique-chord": "기울어진 직선과 현의 길이",
  "circle-area-annulus": "동심원의 반지름과 넓이",
  "circle-both-axis-chords": "원과 두 축이 이루는 현",
  "circle-tangent-center-position": "접선과 중심 좌표",
  "circle-tangent-two-intercepts": "원 접선과 두 축의 넓이",
  "a-transform-only-one-axis": "한 축 방향 평행이동의 좌표",
  "a-transform-fixed-point": "축 대칭에서 고정되는 점",
  "a-transform-shift-circle-equation": "원의 가로 이동과 표준형",
  "transform-shift-line-through-point": "한 점을 지나는 이동한 직선",
  "transform-reflected-parabola-vertex": "포물선의 대칭과 평행이동",
  "transform-circle-radius-after-two": "원 이동과 반지름",
  "transform-diagonal-and-axis": "이동 후 축 위에 있는 점",
  "transform-matching-images": "두 점의 이동 결과 일치",
  "transform-two-parallel-line-distance": "이동 전후 평행선 사이 거리",
  "transform-moved-circle-chord": "이동한 원과 축이 만드는 현",
  "a-function-recover-inverse-input": "역함수 기호와 원래 함수",
  "function-same-values-different-rule": "식이 다른 두 함수의 일치",
  "function-identify-image-preimage": "같은 함수값을 갖는 입력",
  "function-codomain-bijection": "일대일대응과 유한 공역",
  "function-composition-table-preimage": "유한 대응의 합성과 입력",
  "function-composition-equality": "두 합성 순서의 결과와 계수",
  "function-composition-recover-rule": "합성식에서 바깥 함수 복원",
  "function-inverse-fixed-composition": "함수와 역함수 합성의 상쇄",
  "function-linear-injection-parameter": "일대일함수 조건과 계수",
  "a-rational-shift-horizontal": "유리함수의 가로 평행이동",
  "a-rational-denominator-product": "유리식 분모가 0인 값",
  "rational-missing-input-from-value-ratio": "함숫값의 비와 입력",
  "rational-match-inverse-rule": "유리함수의 역함수와 점근선",
  "rational-reflection-x-axis": "대칭이동한 유리함수와 상수",
  "rational-two-intersections": "유리함수와 직선의 교점",
  "rational-context-fixed-cost": "공동 부담 비용과 인원",
  "rational-sum-forbidden-input": "유리식의 합과 제외되는 값",
  "rational-composition-affine-domain": "일차함수 합성과 제외값",
  "rational-interval-signed-output": "유리함수의 특정 함숫값 범위",
  "a-radical-extract-square": "근호 밖으로 제곱인수 빼기",
  "a-radical-like-terms": "같은 제곱근 항의 계수",
  "a-radical-rationalize": "단일 근호 분모의 유리화",
  "a-radical-x-direction": "무리함수 그래프의 방향",
  "a-radical-boundary-value": "정의역의 끝과 함수값",
  "radical-conjugate-coefficient": "켤레식을 이용한 유리화",
  "radical-denominator-open-boundary": "근호 분모와 정의역 끝점",
  "radical-inequality-output": "무리함수값의 상한과 입력",
  "radical-graph-reflection-range": "x축 대칭·이동 후 치역",
  "radical-y-intercept-parameter": "무리함수의 y절편과 상수",
  "radical-inverse-graph-match": "무리함수의 역함수와 정의역",
  "radical-line-two-intersections": "무리함수와 직선의 교점",
  "radical-affine-compose-domain": "일차함수 합성과 정의역",
  "a-poly-add": "다항식의 덧셈·뺄셈과 계수",
  "a-poly-multiply": "두 일차식의 곱과 일차항",
  "a-poly-coefficient": "다항식의 차수와 최고차항",
  "a-poly-factor": "완전제곱식의 인수와 상수",
  "a-roots-sum": "이차방정식의 두 근의 합·곱",
  "a-quadratic-vertex": "이차함수 꼭짓점·최대·최소",
  "a-absolute-linear": "절댓값 포함 일차부등식",
  "concept-circle-form-a": "원의 방정식이 되는 조건",
  "concept-circle-form-b": "원의 방정식이 되는 조건",
  "concept-circle-locus-a": "일정 거리인 점의 자취",
  "concept-circle-locus-b": "일정 거리인 점의 자취",
  "concept-set-required-a": "특정 원소를 포함한 부분집합",
  "concept-set-required-b": "특정 원소를 포함한 부분집합",
  "concept-line-locus-a": "두 점의 등거리 자취",
  "concept-line-locus-b": "두 점의 등거리 자취",
  "concept-tangent-outside-equation-a": "원 밖의 점에서 그은 접선",
  "concept-tangent-outside-equation-b": "원 밖의 점에서 그은 접선",
  "concept-reflect-oblique-a": "기울어진 직선의 대칭이동",
  "concept-reflect-oblique-b": "기울어진 직선의 대칭이동"
};
  Object.assign(compactLabels, {
    "parallel-lines-distance":"평행선 사이 거리 응용",
    "concept-line-parallel-distance-b":"평행선 사이 거리와 이동",
    "circle-line-position":"원과 직선의 교점 개수",
    "concept-circle-line-position-b":"원과 직선의 거리·위치",
    "a-radical-graph":"그래프에서 시작점 찾기",
    "concept-external-tangent-a":"원 밖의 점과 접선의 길이",
    "concept-external-tangent-b":"접선의 길이와 반지름",
    "concept-tangent-outside-equation-a":"원 밖의 점과 접점 거리",
    "concept-tangent-outside-equation-b":"원 밖의 점과 접선의 절편"
  });
  for (const [id,label] of Object.entries(compactLabels)) {
    if(!TYPES[id]) throw new Error("Unknown type label: "+id);
    TYPES[id]={...TYPES[id], searchLabel:TYPES[id].label, label};
  }
  const reclassified = {
    lines: ["a-slope","a-point-on-line","a-point-line-distance","parallel-line","perpendicular-line","line-intersection","concurrent-lines","line-through-intersection","line-projection","distance-line-parameter","parallel-lines-distance"],
    circles: ["a-circle-standard","circle-general","circle-diameter","circle-line-position","circle-tangent-point","circle-tangent-parallel","circle-three-points","distance-locus"],
  };
  for (const [unit, ids] of Object.entries(reclassified)) {
    for (const id of ids) TYPES[id] = { ...TYPES[id], unit };
  }
  const outsideScope = new Set([
    "section-external","line-reflection","power-set-union-difference","nested-subsets","subsets-fixed-size",
    "a-cauchy","cauchy-linear","cauchy-square","cauchy-geometry","cauchy-reciprocals","cauchy-equality-coordinate",
    "amgm-three-sum","amgm-three-product","amgm-cyclic-ratios",
  ]);
  for (const [id, type] of Object.entries(TYPES)) {
    if (type.unit === "absolute") TYPES[id] = { ...type, unit:"propositions" };
    if (outsideScope.has(id)) TYPES[id] = { ...TYPES[id], active:false };
  }
  const {aliases}=globalThis.ForgeTypeFamilies;
  const DEFAULT_SETTINGS = { unit:"propositions", level:"B", strategy:"balanced" };
  const LEVELS = { A:"기본", B:"유형", C:"발전" };
  const legacyFoundations = {
    "statement-meaning":"a-classification", "negation":"a-negation", "truth-set":"a-truth-set", "counterexample":"a-counterexample",
  };

  // Only curriculum concepts are public types. Source IDs identify generators,
  // including composition and answer paths, and can be reused across levels.
  const planeCurriculum=[
    ["coordinate","두 점 사이의 거리",[
      ["a-number-line-distance","수직선의 두 점 사이 거리","a-number-line-distance","numberDistance"],
      ["distance-use","좌표평면의 두 점 사이 거리","a-point-distance","distance-use"],
      ["concept-distance-origin-b","원점과 한 점 사이의 거리","concept-distance-origin-a","originDistance"],
    ]],
    ["coordinate","선분의 내분점",[
      ["concept-division-definition-b","내분점의 정의","concept-division-definition-a","concept-division-definition-b"],
      ["concept-section-number-b","수직선 위의 내분","concept-section-number-a","concept-section-number-b coordinate-directed-number-line"],
      ["section-internal","좌표평면 위의 내분","a-coordinate-section","section-internal coordinate-section-distance coordinate-nested-section"],
      ["midpoint-inverse","중점","a-midpoint a-coordinate-midpoint-number","midpoint-inverse coordinate-parallelogram-fourth coordinate-parallel-midsegments"],
    ]],
    ["coordinate","삼각형의 무게중심",[
      ["centroid-inverse","무게중심의 좌표","a-coordinate-centroid","centroid-inverse"],
      ["concept-centroid-median-b","무게중심의 성질","concept-centroid-median-a","concept-centroid-median-b coordinate-centroid-median"],
      ["concept-median-theorem-b","중선 정리","concept-median-theorem-a","concept-median-theorem-b",true],
    ]],
    ["lines","직선의 방정식",[
      ["line-equation-condition","직선 방정식의 조건","concept-line-form-a","lineCondition"],
      ["a-line-from-point-slope","한 점과 기울기로 정한 직선","a-line-from-point-slope","pointSlope"],
      ["concept-line-through-two-b","두 점을 지나는 직선","concept-line-through-two-a a-slope","concept-line-through-two-b line-compiler-coefficients"],
      ["concept-line-intercepts-b","두 절편으로 정한 직선","concept-line-intercepts-a","concept-line-intercepts-b line-intercepts-rebuild line-intercepts-area"],
      ["concept-line-form-b","일차방정식이 나타내는 직선","a-line-intercept-from-equation a-point-on-line","line-compiler-chain line-compiler-aggregate"],
      ["concept-line-fixed-b","정점을 지나는 직선","concept-line-fixed-a","concept-line-fixed-b",true],
      ["line-through-intersection","교점을 지나는 직선","concept-line-intersection-fixed-a","line-through-intersection concurrent-lines concept-line-intersection-fixed-b",true],
      ["concept-line-locus-b","자취로 나타낸 직선","concept-line-locus-a","concept-line-locus-b line-perpendicular-bisector",true],
    ]],
    ["lines","두 직선의 위치관계",[
      ["parallel-line","평행","a-line-parallel-test","parallel-line"],
      ["line-three-relations","일치","coincident","coincident"],
      ["perpendicular-line","수직","a-line-perpendicular-slope","perpendicular-line"],
      ["line-intersection","한 점에서 만나는 두 직선","a-horizontal-vertical","line-intersection"],
    ]],
    ["lines","점과 직선 사이의 거리",[
      ["distance-line-parameter","점과 직선 사이의 거리","a-point-line-distance","distance-line-parameter line-distance-on-axis line-two-distance-axes line-perpendicular-distance-area"],
      ["parallel-lines-distance","평행한 두 직선 사이 거리","concept-line-parallel-distance-a","parallel-lines-distance",true],
    ]],
  ];
  const geometryCurriculum=[
    ["circles","원의 방정식",[
      ["concept-circle-form-b","원이 되는 조건","concept-circle-form-a","concept-circle-form-b circle-nonzero-radius-parameter"],
      ["a-circle-standard","중심과 반지름","a-circle-standard a-circle-equation a-circle-point-on a-circle-radius-distance","circle-diameter circle-radius-from-point circle-area-annulus circle-inscribed-square-area"],
      ["concept-circle-axis-b","좌표축에 접하는 원","concept-circle-axis-a","concept-circle-axis-b circle-axis-tangency circle-center-on-axis circle-nearest-axis"],
      ["circle-general","이차방정식이 나타내는 원","a-circle-expanded-linear a-circle-origin-membership","circle-general circle-origin-constant"],
      ["concept-circle-radical-axis-b","두 원의 공통현","concept-circle-radical-axis-a","concept-circle-radical-axis-b",true],
      ["concept-circle-intersection-family-b","두 원의 교점을 지나는 원","concept-circle-intersection-family-a","concept-circle-intersection-family-b",true],
      ["concept-circle-three-b","세 점을 지나는 원","concept-circle-three-a","concept-circle-three-b circle-three-points",true],
      ["concept-circle-locus-b","자취로 나타낸 원","concept-circle-locus-a","concept-circle-locus-b distance-locus",true],
    ]],
    ["circles","원과 직선의 위치 관계",[
      ["circle-line-discriminant","판별식과 교점","circleDiscriminant","circleDiscriminant"],
      ["circle-line-position","중심에서 직선까지의 거리","concept-circle-line-position-a a-circle-axis-distance","circle-line-position concept-circle-line-position-b circle-horizontal-chord circle-axis-intersection circle-oblique-chord circle-both-axis-chords circle-tangency-radius"],
      ["concept-circle-pair-position-b","두 원의 위치 관계","concept-circle-pair-position-a","concept-circle-pair-position-b",true],
    ]],
    ["circles","원의 접선의 방정식",[
      ["circle-tangent-parallel","기울기가 주어진 접선","circle-tangent-parallel","circle-tangent-parallel circle-tangent-center-position circle-tangent-two-intercepts"],
      ["concept-circle-tangent-b","접점이 주어진 접선","concept-circle-tangent-a","concept-circle-tangent-b circle-tangent-point"],
      ["concept-tangent-outside-equation-b","원 밖의 점에서 그은 접선","concept-tangent-outside-equation-a concept-external-tangent-a","concept-tangent-outside-equation-b concept-external-tangent-b",true],
    ]],
    ["transformations","평행이동",[
      ["translation-definition","평행이동의 정의","a-transform-only-one-axis","translate-two-stages transform-two-parallel-line-distance"],
      ["a-translate-point","점의 평행이동","a-translate-point","translate-inverse-point transform-matching-images"],
      ["concept-transform-equation-b","도형의 평행이동","concept-transform-equation-a a-transform-shift-circle-equation","concept-transform-equation-b translate-line-intercept translate-circle-center translate-circle-tangency translate-parabola-vertex transform-shift-line-through-point transform-circle-radius-after-two transform-moved-circle-chord"],
    ]],
    ["transformations","대칭이동",[
      ["reflection-definition","대칭이동의 정의","a-transform-fixed-point","transform-fixed-axis transform-isometry transform-identify-reflection"],
      ["a-reflect-point-axis","점의 대칭이동","a-reflect-point-axis a-reflect-origin a-reflect-diagonal","reflect-two-axes translation-reflection-order transform-diagonal-and-axis transform-intersection"],
      ["concept-transform-reflect-equation-b","도형의 대칭이동","concept-transform-reflect-equation-a a-transform-general-axis","concept-transform-reflect-equation-b reflect-line-axis reflect-line-diagonal reflect-circle transform-reflected-parabola-vertex"],
      ["concept-reflect-center-b","한 점에 대한 대칭이동","concept-reflect-center-a","concept-reflect-center-b",true],
      ["concept-reflect-line-b","한 직선에 대한 대칭이동","concept-reflect-line-a concept-reflect-oblique-a","concept-reflect-line-b concept-reflect-oblique-b",true],
    ]],
  ];
  // Public curriculum categories and their reusable relation goals.
  const logicCurriculum=[
    ["sets","집합의 정의",[
      ["set-definition","집합과 원소의 정의","a-set-membership","membership"],
      ["set-membership","집합과 원소의 관계","concept-set-subset-symbol-a","membership","concept-set-subset-symbol-b"],
    ]],
    ["sets","집합의 표현",[
      ["set-roster","원소나열법","a-set-cardinality-list","roster"],
      ["set-builder","조건제시법","a-set-builder-multiples concept-set-representation-a","builder","concept-set-representation-b set-divisibility-count"],
      ["set-venn","벤 다이어그램","concept-venn-a","venn","concept-venn-b venn-complement-count"],
    ]],
    ["sets","집합의 원소의 개수",[
      ["set-finitude","유한집합과 무한집합","concept-set-kind-a","", "concept-set-kind-b"],
      ["set-empty","공집합","a-set-empty","empty"],
      ["set-universe","전체집합","","full","intersection-bound set-application-neither"],
      ["set-count","원소의 개수","","count"],
      ["set-count-arithmetic","원소의 개수의 연산","concept-set-cardinality-arithmetic-a","cardinalArithmetic","concept-set-cardinality-arithmetic-b set-cardinality three-set-inclusion exactly-two-of-three",true],
    ]],
    ["sets","집합 사이의 포함 관계",[
      ["set-subset","부분집합","a-set-subset","subset","set-range-parameter set-complement-inclusion-missing"],
      ["set-subset-laws","부분집합의 성질","concept-set-subset-laws-a","subsetLaws","concept-set-subset-laws-b"],
      ["set-equality","집합의 상등","concept-set-equality-a","equal","concept-set-equality-b equality-unordered-set recover-a-set"],
      ["set-proper","진부분집합","","proper"],
    ]],
    ["sets","부분집합의 개수",[
      ["set-subsets-count","부분집합의 개수","concept-set-counts-a","subsets"],
      ["set-proper-count","진부분집합의 개수","","properCount","concept-set-counts-b"],
      ["set-subsets-required","지정 원소의 포함과 제외","concept-set-required-a","required excluded","set-subset-count subsets-intersection"],
      ["set-subsets-some","지정 원소 중 하나 이상","","someRequired","concept-set-required-b",true],
    ]],
    ["sets","집합의 연산",[
      ["set-intersection","교집합","a-set-operation","intersection","set-expressions"],
      ["set-union","합집합","","union"],
      ["set-complement","여집합","a-set-complement","complement","complement-intersection-count"],
      ["set-difference","차집합","a-set-direct-difference","difference","complement-of-difference"],
      ["set-disjoint","서로소","concept-set-disjoint-a","disjoint","concept-set-disjoint-b disjoint-sets-parameter"],
      ["set-symmetric","대칭차집합","concept-set-symmetric-a","symmetric","concept-set-symmetric-b symmetric-difference",true],
    ]],
    ["sets","집합의 연산 법칙",[
      ["set-law-commute","교환법칙","concept-set-laws-a","commute"],
      ["set-law-associate","결합법칙","","associate"],
      ["set-law-distribute","분배법칙","","distribute distributeUnion","concept-set-laws-b"],
      ["set-law-demorgan","드모르간의 법칙","","demorgan demorganIntersection","set-demorgan"],
    ]],
    ["propositions","명제의 정의",[
      ["prop-definition","명제와 조건","a-classification","universal existential","statement-meaning"],
      ["prop-truth-set","진리집합","a-truth-set","truthSet","truth-set"],
    ]],
    ["propositions","명제와 조건의 부정",[
      ["prop-negation","부정의 정의","a-negation","negation","negation"],
      ["prop-negation-truth","부정의 참·거짓","","notUniversal notExistential"],
      ["prop-negation-set","부정의 진리집합","","negation truthSet"],
      ["prop-negation-connectives","그리고·또는 조건의 부정","","negation","and-or"],
    ]],
    ["propositions","명제의 참과 거짓",[
      ["prop-antecedent","가정과 결론","a-proposition-antecedent","implication"],
      ["prop-truth","진리집합과 명제의 참·거짓","","implication","truth-and-sets truth-value true-parameter"],
      ["prop-counterexample","반례","a-counterexample","counterexample","counterexample"],
    ]],
    ["propositions","모든이나 어떤이 있는 명제",[
      ["prop-universal","모든이 있는 명제","","universal","quantifiers"],
      ["prop-existential","어떤이 있는 명제","","existential","proposition-quantifier-intersection"],
      ["prop-quantifier-negation","모든·어떤 명제의 부정","","notUniversal notExistential"],
    ]],
    ["propositions","명제의 역과 대우",[
      ["prop-converse","명제의 역","a-proposition-implication-converse","converse"],
      ["prop-contrapositive","명제의 대우","a-implication","contrapositive","contrapositive-parameter"],
      ["prop-converse-truth","역과 대우의 참·거짓","","converse contrapositive","proposition-converse-and-contrapositive"],
    ]],
    ["propositions","충분조건과 필요조건",[
      ["prop-sufficient","충분조건","","sufficient","suff-necessary"],
      ["prop-necessary","필요조건","","necessary"],
      ["prop-iff","필요충분조건","","iff","suff-necessary-truth set-operations-iff"],
      ["prop-suff-sets","진리집합과 충분·필요조건","","sufficient necessary","suff-necessary-sets suff-necessary-parameter"],
    ]],
    ["propositions","증명",[
      ["prop-proof-definition","정의·증명·정리","","implication",""],
      ["prop-proof-contrapositive","대우를 이용한 증명","","contrapositive","contrapositive-proof"],
      ["prop-proof-contradiction","귀류법","","contradiction","contradiction-proof"],
      ["prop-syllogism","삼단논법","","syllogism","syllogism syllogism-inference"],
    ]],
    ["propositions","절대부등식",[
      ["prop-absolute-definition","절대부등식의 정의","a-square-positive","","absolute-inequality"],
      ["prop-real-properties","부등식과 실수의 성질","a-proposition-compare-squares","","real-properties-proof"],
      ["prop-absolute-inequalities","여러 가지 절대부등식","","","absolute-value-inequality weighted-absolute-min abs-maximum-bounded reverse-triangle-equality"],
      ["prop-amgm","산술평균과 기하평균","a-amgm","","amgm-product amgm-sum amgm-fixed amgm-geometry"],
      ["prop-cauchy","코시–슈바르츠 부등식","a-cauchy","","cauchy-linear cauchy-square cauchy-geometry cauchy-reciprocals cauchy-equality-coordinate",true],
    ]],
  ];
  const logicTypes=new Map();
  const geometryUnits=new Set(geometryCurriculum.map(([unit])=>unit));
  const planeTypes=new Map(), sourceConcepts=new Map();
  const generators={...TYPES};
  for(const [id,plan] of Object.entries(globalThis.ForgeLineCompiler?.plans??{}))
    generators[id]={...generators[id],level:plan.level,label:plan.label,compiled:true};
  for(const [unit,group,concepts] of [...planeCurriculum,...geometryCurriculum]) {
    for(const [id,label,basic,applied,plus=false] of concepts) {
      const sources={A:basic.split(" "),B:applied.split(" ")};
      planeTypes.set(id,{sources});
      TYPES[id]={...TYPES[id],unit,group,label,level:"AB",plus,active:true};
      for(const source of [...sources.A,...sources.B])if(generators[source]&&!sourceConcepts.has(source))sourceConcepts.set(source,id);
    }
  }
  for(const [unit,group,concepts] of logicCurriculum){
    for(const [id,label,basic,goals,applied="",plus=false] of concepts){
      const sources={A:basic.split(" ").filter(Boolean),B:applied.split(" ").filter(Boolean)};
      logicTypes.set(id,{sources,goals:goals.split(" ").filter(Boolean)});
      TYPES[id]={unit,group,label,level:"AB",plus,active:true};
      for(const source of [...sources.A,...sources.B])sourceConcepts.set(source,id);
    }
  }
  for(const [source,id] of Object.entries({
    "line-distance-perimeter":"distance-line-parameter","line-projection":"distance-line-parameter",
    "coordinate-distance-coordinate":"distance-use","coordinate-triangle-perimeter":"distance-use",
    "coordinate-square-diagonal":"distance-use","coordinate-right-vertex":"distance-use",
    "coordinate-rectangle-two-sides":"distance-use","coordinate-two-travel-legs":"distance-use",
    "line-reflection":"concept-reflect-line-b",
    "axis-equidistance":"concept-line-locus-b","line-parameter-vertical":"perpendicular-line",
    "line-two-slopes-area":"line-intersection","line-point-half-plane":"concept-line-form-b",
  }))sourceConcepts.set(source,id);
  const functionGoals=new Map(ForgeFunctionCurriculum.entries.map(entry=>[entry.id,entry]));
  for(const entry of functionGoals.values())TYPES[entry.id]={...entry,level:"AB"};
  for(const [previous,current] of Object.entries(ForgeFunctionCurriculum.aliases)){
    sourceConcepts.set(previous,current);
  }
  const functionUnits=new Set(ForgeFunctionCurriculum.units);
  for(const [id,type] of Object.entries(TYPES)){
    const grouped=["coordinate","lines"].includes(type.unit)||geometryUnits.has(type.unit)||ForgeLogicCompiler.units.includes(type.unit);
    if(grouped&&!planeTypes.has(id)&&!logicTypes.has(id)||functionUnits.has(type.unit)&&!functionGoals.has(id)){
      TYPES[id]={...type,active:false};
    }
  }
  for(const unit of [...(globalThis.ForgeChallengeCompiler?.units??["coordinate","lines","circles","transformations"]),...ForgeLogicCompiler.units,...ForgeFunctionCurriculum.units]) {
    TYPES["challenge-"+unit]={unit,level:"C",label:UNITS[unit]+" 종합",plus:false};
  }
  const canonicalType=id=>planeTypes.has(id)||logicTypes.has(id)||functionGoals.has(id)?id:sourceConcepts.get(id)??sourceConcepts.get(aliases[id])??aliases[id]??id;

  function typeFor(problem) {
    if (!problem) return undefined;
    if (problem.level==="A" && Object.hasOwn(legacyFoundations,problem.type)) return canonicalType(legacyFoundations[problem.type]);
    return canonicalType(Object.hasOwn(generators, problem.type)||Object.hasOwn(TYPES, problem.type)||sourceConcepts.has(problem.type) ? problem.type : legacy[problem.type+":"+problem.answerPath?.id]);
  }

  function levelFor(type, requested) {
    const available = TYPES[type].level;
    return requested && available.includes(requested) ? requested : available.at(-1);
  }

  function curriculumProblem(source,level,rng,format) {
    const {m,problem,scalar,rand,pick,signed,linear,shift,term,sq}=added;
    const output=data=>({...globalThis.ForgeVariations.present(data,format??pick(rng,["written","choice"]),rng),format:"tex"});
    if(source==="circleDiscriminant") {
      const h=rand(rng,-5,5), k=rand(rng,-5,5), radius=rand(rng,2,7);
      const offset=radius+rand(rng,-1,1), horizontal=pick(rng,[true,false]);
      const variable=horizontal?"x":"y", fixed=horizontal?"y":"x";
      const center=horizontal?h:k, constant=(horizontal?k:h)+offset;
      const residual=radius**2-offset**2, count=residual>0?2:residual===0?1:0;
      const circle=m(sq("x",h)+"+"+sq("y",k)+"="+radius**2);
      const prompt="원 "+circle+"과 직선 "+m(fixed+"="+constant);
      const useParameter=level==="B"&&rng()<.5;
      const parameter=horizontal?k:h, sign=pick(rng,[-1,1]);
      const tangentQuestion="원 "+circle+"에 직선 "+m(fixed+"=t")+"가 접한다. "+m(sign>0?"t>"+parameter:"t<"+parameter)+"이다.";
      return output(problem(useParameter?tangentQuestion:prompt+"이 있다.",[],
        useParameter?m("t")+"의 값을 구하시오.":"두 도형의 서로 다른 교점의 개수를 구하시오.",
        scalar(useParameter?parameter+sign*radius:count),
        useParameter?[m(fixed+"=t")+"를 대입한 이차방정식의 판별식이 0이어야 하므로 "+m(sq("t",parameter)+"="+radius**2)+"이다. 부등식으로 해를 하나 고른다."]
          :[m(fixed+"="+constant)+"을 대입하면 "+m(sq(variable,center)+"="+residual)+"이다.", "이 이차방정식의 판별식은 "+m(4*residual)+"이므로 교점은 "+m(count)+"개이다."]));
    }
    if(source==="originDistance") {
      const [u,v,d]=pick(rng,[[3,4,5],[5,12,13]]);
      const sign=pick(rng,[-1,1]), offset=signed(rng,3), x=u*pick(rng,[-1,1]);
      const value=sign*v-offset;
      return output(problem(`점 ${m("P("+x+","+shift("k",-offset)+")")}에서 원점까지의 거리는 ${m(d)}이다. 점 ${m("P")}는 ${sign>0?"제1 또는 제2":"제3 또는 제4"}사분면에 있다.`,[],
        `${m("k")}의 값을 구하시오.`,scalar(value),
        [`거리 공식으로 점 ${m("P")}의 세로 좌표의 절댓값은 ${m(v)}이다. 사분면 조건에 따라 세로 좌표는 ${m(sign*v)}이므로 ${m("k="+value)}이다.`]));
    }
    if(source==="pointSlope") {
      const x=rand(rng,-4,4), y=rand(rng,-5,5), a=signed(rng,4), t=x+signed(rng,3);
      const b=y-a*x, value=a*t+b;
      return output(problem(`점 ${m("P("+x+","+y+")")}를 지나고 기울기가 ${m(a)}인 직선이 있다. 이 직선은 ${m("x="+t)}인 직선과 점 ${m("Q")}에서 만난다.`,[],
        `점 ${m("Q")}의 ${m("y")}좌표를 구하시오.`,scalar(value),
        [`점 ${m("P")}의 좌표를 대입해 직선의 식을 구하면 ${m("y="+shift(term(a,"x"),-b))}이다.`,`${m("x="+t)}을 대입하면 ${m("y="+value)}이다.`]));
    }
    if(source==="lineCondition") {
      const k=signed(rng,4), h=signed(rng,4), c=signed(rng,4);
      const coefficient=(v,x)=>"("+shift("a",v)+")"+x;
      return output(problem(`상수 ${m("a")}에 대하여 ${m(coefficient(k,"x")+"+"+coefficient(k,"y")+"="+c)}와 ${m(coefficient(h,"x")+"+y="+c)}가 주어져 있다.`,[],
        "둘째 방정식은 직선을 나타내고 첫째 방정식은 직선을 나타내지 않을 때, "+m("a")+"의 값을 구하시오.",scalar(k),
        [`첫째 식이 직선을 나타내지 않으려면 두 일차항의 계수가 모두 ${m(0)}이어야 한다. 따라서 ${m("a="+k)}이다. 둘째 식의 ${m("y")}의 계수는 ${m(1)}이다.`]));
    }
    if(source==="numberDistance") {
      const center=rand(rng,-6,6), d=rand(rng,2,9), sign=pick(rng,[-1,1]);
      const p=center+sign*d;
      const intro=`수직선 위의 두 점 ${m("A("+center+"), B(k)")} 사이의 거리는 ${m(d)}이고, 점 ${m("B")}는 점 ${m("A")}의 ${sign>0?"오른쪽":"왼쪽"}에 있다.`;
      return output(problem(intro,[],`${m("k")}의 값을 구하시오.`,scalar(p),[`${m("|"+shift("k",center)+"|="+d)}에서 위치 조건을 적용하면 ${m("k="+p)}이다.`]));
    }
    const a=signed(rng,4), b=signed(rng,4), c=signed(rng,5), factor=rand(rng,2,4), axis=rand(rng,0,2);
    const lhs=linear(a,"x",b,"y"), scaled=linear(factor*a,"x",factor*b,"y");
    const second=level==="A"||axis===2?scaled+"=k":axis===0?linear(1,"kx",factor*b,"y")+"="+factor*c:linear(factor*a,"x",1,"ky")+"="+factor*c;
    const value=factor*(level==="A"||axis===2?c:axis===0?a:b);
    return output(problem(`두 직선 ${m(lhs+"="+c)}, ${m(second)}가 일치한다.`,[],"상수 "+m("k")+"의 값을 구하시오.",scalar(value),
      [`두 방정식의 대응하는 계수와 상수항은 같은 비율로 변한다. 이 비율은 ${m(factor)}이므로 ${m("k="+value)}이다.`]));
  }

  const difficultyLabels=Object.freeze({low:"하",medium:"중",high:"상"});
  const conceptFamilies={
    distance:"distance",distanceInverse:"distance",pointLine:"pointLineDistance",parallelDistance:"pointLineDistance",
    parallelLineDistance:"pointLineDistance",solveFunctionDifference:"intersection",
    pointsAtDistance:"distance",section:"section",invertSection:"section",ratioUnit:"ratio",scaleSegments:"ratio",
    midpoint:"midpoint",invertMidpoint:"midpoint",centroid:"centroid",invertCentroid:"centroid",
    lineThrough:"lineEquation",lineFromPointSlope:"lineEquation",lineThroughTwoPoints:"lineEquation",
    lineFromIntercepts:"lineEquation",evaluateLine:"substitution",evaluateShiftedLine:"substitution",
    intersectLines:"intersection",intersection:"intersection",solveLinearSystem:"intersection",
    sum:"arithmetic",sumSegments:"arithmetic",combineSegments:"arithmetic",add:"arithmetic",subtract:"arithmetic",
    minimum:"extremum",maximum:"extremum",argminEquality:"extremum",
    selectByPosition:"condition",selectSign:"condition",filterCandidates:"condition",
    inequality:"condition",sign:"condition",product:"condition",locus:"condition",
    coordinate:"projection",selectCoordinate:"projection",readLinearConstraint:"projection",
    answer:"projection",evaluateExpression:"arithmetic",
  };

  function assessDifficulty(problem) {
    if(problem.level==="C") {
      const grade={C1:"low",C2:"medium",C3:"high"}[problem.challengeDifficulty];
      if(!grade)return null;
      const graph=problem.inspection?.graph??[];
      return {grade,concepts:problem.reasoning?.concepts??problem.inspection?.concepts?.length??0,depth:Math.max(0,graph.length-1)};
    }
    if(problem.level!=="B")return null;
    if(problem.answerPath?.id.startsWith("function/"))return problem.difficulty;
    if(problem.inspection?.environment==="logic"){
      const depth=problem.inspection.graph.length-1, concepts=problem.inspection.concepts.length;
      return {depth,concepts,grade:depth>=4?"high":depth>=3?"medium":"low"};
    }
    const graph=problem.inspection?.graph?.flat();
    const ignored=new Set(["given","givenLine","moving","projection","arithmetic"]);
    const family=operation=>conceptFamilies[operation]??operation;
    let depth=0, operations=[];
    if(graph?.length) {
      const depths=new Map();
      for(const {id,operation,from=[]} of graph) {
        const name=family(operation), counts=operation&&!ignored.has(name);
        const length=Math.max(0,...from.map(key=>depths.get(key)??0))+Number(Boolean(counts));
        depths.set(id,length);
        depth=Math.max(depth,length);
        if(counts)operations.push(name);
      }
    } else {
      operations=(problem.answerPath?.operations??[]).map(family).filter(name=>!ignored.has(name));
    }
    const concepts=new Set(operations).size;
    if(!concepts)return null;
    const grade=concepts>=4&&depth>=3?"high":concepts>=3||depth>=3?"medium":"low";
    return {grade,concepts,depth};
  }

  const proseUnits=new Set(["coordinate","lines","circles","transformations","sets","propositions",...ForgeFunctionCurriculum.units]);
  function generateChallenge(unit,options) {
    if(ForgeFunctionCurriculum.units.includes(unit))return ForgeProblemProse.polish(ForgeFunctionCompiler.generate(unit,
      unit==="functions"?"compose-value":"value",{...options,level:"C"}));
    const problem=(ForgeLogicCompiler.units.includes(unit)?ForgeLogicCompiler:ForgeChallengeCompiler).generate(unit,options);
    return ForgeProblemProse.polish(problem);
  }

  function generatePlanePractice(options={}) {
    const rng=options.rng??Math.random;
    const types=[...pool("coordinate","B"),...pool("lines","B")];
    return findDifficulty(()=>generateCandidate(added.pick(rng,types),"B",{...options,rng}),options.difficulty);
  }

  function generate(type,level,options={}) {
    const canonical=canonicalType(type);
    if(Object.hasOwn(TYPES,canonical)&&levelFor(canonical,level)==="C")
      return ForgeNotation.compactPrompt(generateChallenge(TYPES[canonical].unit,options));
    if(functionGoals.has(canonical)){
      const problem=generateCandidate(type,level,options);
      return ForgeNotation.compactPrompt(ForgeProblemProse.polish(problem));
    }
    const {difficulty,...request}=options;
    return findDifficulty(()=>generateCandidate(type,level,request),difficulty);
  }

  function findDifficulty(build,difficulty) {
    if(difficulty&&!Object.hasOwn(difficultyLabels,difficulty))throw new RangeError("지원하지 않는 난도입니다.");
    const attempts=difficulty?120:1;
    for(let attempt=0;attempt<attempts;attempt++) {
      let generated;
      try{generated=build();}
      catch(error){
        if(difficulty&&error instanceof ForgeChallengeCompiler.UnsatisfiedGraph)continue;
        throw error;
      }
      const problem=ForgeNotation.compactPrompt(proseUnits.has(TYPES[generated.type]?.unit)?ForgeProblemProse.polish(generated,{joinLegacy:!generated.inspection?.graph}):generated);
      const assessment=assessDifficulty(problem);
      if(!difficulty||assessment?.grade===difficulty)
        return assessment?{...problem,difficulty:assessment}:problem;
    }
    throw new RangeError("현재 유형과 답 경로에서 선택한 난도의 문항을 찾지 못했습니다. 유형이나 답 경로를 바꿔 보세요.");
  }

  const geometryBasicOperations=new Set(["a-circle-standard","a-translate-point","a-transform-shift-circle-equation","concept-circle-axis-a","concept-circle-line-position-a","circle-tangent-parallel"]);
  const geometryOperations={
    "a-circle-standard":"circleCenter",
    "circle-general":"circleCenter", "concept-circle-locus-b":"distanceLocus", "circle-diameter":"circleDiameter",
    "concept-circle-axis-a":"axisTangentCircle", "concept-circle-axis-b":"axisTangentCircle",
    "circle-line-position":"axisIntersectionCount", "concept-circle-line-position-a":"axisIntersectionCount",
    "concept-circle-line-position-b":"axisIntersectionCount",
    "concept-circle-pair-position-b":"circlePositionCount",
    "circle-three-points":"circumcircle", "concept-circle-three-a":"circumcircle", "concept-circle-three-b":"circumcircle",
    "circle-tangent-parallel":"tangentParallel", "circle-tangent-point":"tangentAtPoint", "concept-circle-tangent-a":"tangentAtPoint", "concept-circle-tangent-b":"tangentAtPoint",
    "concept-circle-radical-axis-a":"commonChord", "concept-circle-radical-axis-b":"commonChord",
    "concept-circle-intersection-family-a":"diameterOfPair", "concept-circle-intersection-family-b":"diameterOfPair",
    "concept-tangent-outside-equation-a":"externalTangentLength", "concept-tangent-outside-equation-b":"externalTangentLength",
    "a-translate-point":"translatePoint",
    "translate-line-intercept":"translateLine", "a-transform-shift-circle-equation":"translateCircle",
    "translate-circle-center":"translateCircle", "reflect-circle":"reflectCircle",
    "translation-reflection-order":"reflectPoint", "transform-diagonal-and-axis":"reflectPoint",
    "concept-reflect-center-a":"centralReflection", "concept-reflect-center-b":"centralReflection",
    "concept-reflect-oblique-a":"reflectAcrossLine", "concept-reflect-oblique-b":"reflectAcrossLine",
  };

  const geometryPracticeOperations={
    "concept-circle-form-b":"circleExistence",
    "a-circle-standard":["circleDiameter","circleCenter"],
    "concept-circle-axis-b":"axisTangentCircle",
    "circle-general":"circleCenter",
    "concept-circle-radical-axis-b":"commonChord",
    "concept-circle-intersection-family-b":"diameterOfPair",
    "concept-circle-three-b":"circumcircle",
    "concept-circle-locus-b":"distanceLocus",
    "circle-line-discriminant":"circleLineDiscriminant",
    "circle-line-position":"circleLineDistance",
    "concept-circle-pair-position-b":"composedCirclePositions",
    "circle-tangent-parallel":"tangentParallel",
    "concept-circle-tangent-b":"tangentAtPoint",
    "concept-tangent-outside-equation-b":"composedExternalTangent",
    "translation-definition":["translatePoint","recoverTranslation"],
    "a-translate-point":["translatePoint","recoverTranslation"],
    "concept-transform-equation-b":["translateLine","translateCircle"],
    "reflection-definition":"reflectPoint",
    "a-reflect-point-axis":"reflectPoint",
    "concept-transform-reflect-equation-b":["reflectCircle","reflectLine"],
    "concept-reflect-center-b":"centralReflection",
    "concept-reflect-line-b":"reflectAcrossLine",
  };

  const planePracticeOperations={
    "distance-use":"distance",
    "concept-distance-origin-b":"originDistance",
    "concept-division-definition-b":"section",
    "section-internal":"section",
    "midpoint-inverse":["recoverEndpoint","midpointOfPair"],
    "centroid-inverse":["centroid","restoreVertex"],
    "concept-centroid-median-b":"medianRatio",
    "concept-median-theorem-b":"median",
    "a-line-from-point-slope":"pointSlope",
    "concept-line-through-two-b":"twoPoints",
    "line-through-intersection":["pointSlope","twoPoints","parallel","perpendicular"],
    "concept-line-locus-b":"bisector",
    "parallel-line":"parallel",
    "perpendicular-line":"perpendicular",
    "line-intersection":"intersection",
    "distance-line-parameter":"pointLine",
    "parallel-lines-distance":"parallelDistance",
  };

  const inequalityGoals={
    "prop-absolute-definition":"square","prop-real-properties":"square","prop-absolute-inequalities":"absolute","prop-amgm":"amgm","prop-cauchy":"cauchy",
  };

  function generateCandidate(type, level, options={}) {
    const requested=type;
    type=canonicalType(type);
    if (!Object.hasOwn(TYPES,type)) throw new RangeError("Unknown problem type");
    const actualLevel=levelFor(type,level), concept=planeTypes.get(type);
    if(actualLevel==="C")return generateChallenge(TYPES[type].unit,options);
    if(functionGoals.has(type)){
      const {unit,goals,label,plus}=functionGoals.get(type);
      const {rng=Math.random,avoidPaths=[]}=options;
      if(goals.length===1){
        const result=ForgeFunctionCompiler.generate(unit,goals[0],{...options,level:actualLevel});
        return {...result,type,template:label,plus};
      }
      const prefix=goal=>"function/"+goal+"/";
      const recent=avoidPaths.slice(-goals.length);
      const lastUsed=goals.map(goal=>recent.findLastIndex(path=>path.startsWith(prefix(goal))));
      const goal=added.pick(rng,goals.filter((_,i)=>lastUsed[i]===Math.min(...lastUsed)));
      const prefixForGoal=prefix(goal);
      const result=ForgeFunctionCompiler.generate(unit,goal,{...options,level:actualLevel,
        avoidPaths:avoidPaths.filter(path=>goals.some(member=>path.startsWith(prefix(member))&&
          (member===goal||ForgeFunctionRelationPractice.supports(unit,member)&&ForgeFunctionRelationPractice.supports(unit,goal))))
          .map(path=>"function/"+path.slice(path.indexOf("/", "function/".length)+1))});
      return {...result,type,template:label,plus,answerPath:{...result.answerPath,id:prefixForGoal+result.answerPath.id.slice("function/".length)}};
    }
    if(logicTypes.has(type)){
      const {sources,goals}=logicTypes.get(type), rng=options.rng??Math.random;
      const inputOperations=["equal","union","intersection","difference","complement"];
      const inputGoal=goals.find(goal=>inputOperations.includes(goal));
      const familyProblem=actualLevel==="B"&&type==="set-finitude"?ForgeLogicCompiler.generatePeriodic({...options,rng,measure:"finitude"}):null;
      const parameterProblem=actualLevel==="B"&&TYPES[type].unit==="sets"&&inputGoal&&rng()<(inputGoal==="equal"?.65:.25)
        ?ForgeLogicCompiler.generateSetParameters({...options,rng,requiredOperation:inputGoal==="equal"?undefined:inputGoal})
        :null;
      const periodicGoal=type!=="prop-proof-definition"&&goals.find(goal=>["union","intersection","equal","subset","implication"].includes(goal));
      const periodicProblem=!parameterProblem&&actualLevel==="B"&&periodicGoal&&(options.format!=="written"||["equal","subset","implication"].includes(periodicGoal))&&rng()<.24?
        ForgeLogicCompiler.generatePeriodic({...options,rng,requiredOperation:["union","intersection"].includes(periodicGoal)?periodicGoal:undefined,
          proposition:TYPES[type].unit==="propositions"||["equal","subset"].includes(periodicGoal),requiredClaim:["equal","subset","implication"].includes(periodicGoal)?periodicGoal:undefined}):null;
      const direct=sources[actualLevel].length&&(actualLevel==="A"||!goals.length);
      const result=familyProblem??parameterProblem??periodicProblem??(type==="prop-real-properties"?ForgeLogicCompiler.realProperties(rng,actualLevel,options.format):inequalityGoals[type]&&(actualLevel==="B"||!sources.A.length)?ForgeLogicCompiler.generateInequality(inequalityGoals[type],{...options,rng,level:actualLevel}):actualLevel==="A"&&type==="prop-proof-definition"?ForgeLogicCompiler.foundation(rng):direct?generateSource(sources[actualLevel].includes(requested)?requested:added.pick(rng,sources[actualLevel]),actualLevel,options):
        goals.length?ForgeLogicCompiler.generate(TYPES[type].unit,{...options,goals,level:actualLevel,focus:type}):
        ForgeLogicCompiler.foundation(rng));
      return {...result,type,level:actualLevel,template:TYPES[type].label,plus:result.plus||TYPES[type].plus};
    }
    if(geometryUnits.has(TYPES[type].unit)&&actualLevel==="B"){
      const result=ForgeChallengeCompiler.generate(TYPES[type].unit,{...options,level:"B",requiredOperation:geometryPracticeOperations[type]});
      return {...result,type,level:actualLevel,template:TYPES[type].label,plus:TYPES[type].plus};
    }
    if(geometryUnits.has(TYPES[type].unit)) {
      const sources=concept.sources[actualLevel];
      const history=options.avoidPaths??[], rng=options.rng??Math.random;
      const counts=sources.map(source=>history.filter(path=>path.startsWith(source+"/")).length);
      const source=sources.includes(requested)&&requested!==type?requested:
        added.pick(rng,sources.filter((_,i)=>counts[i]===Math.min(...counts)));
      const operation=geometryOperations[source];
      const sourceOptions={...options,avoidPaths:history.filter(path=>path.startsWith(source+"/")).map(path=>path.slice(source.length+1))};
      const canCompose=operation&&globalThis.ForgeChallengeCompiler&&!options.mode&&!options.variantId&&!options.environment&&
        geometryBasicOperations.has(source);
      const result=canCompose&&rng()<.5
        ?ForgeChallengeCompiler.generate(TYPES[type].unit,{...sourceOptions,level:actualLevel,requiredOperation:operation})
        :generators[source]?generateSource(source,actualLevel,sourceOptions):curriculumProblem(source,actualLevel,rng,options.format);
      return {...result,type,level:actualLevel,template:TYPES[type].label,plus:TYPES[type].plus,
        answerPath:{...result.answerPath,id:source+"/"+(result.answerPath?.id??"value")}};
    }

    if(actualLevel==="B"&&planePracticeOperations[type]&&!options.mode&&!options.variantId&&options.environment!=="expression"){
      const result=ForgeChallengeCompiler.generate(TYPES[type].unit,{...options,level:"B",requiredOperation:planePracticeOperations[type],
        ...(type==="line-through-intersection"?{requires:["intersection"],output:"line"}:{})});
      return {...result,type,level:actualLevel,template:TYPES[type].label,plus:TYPES[type].plus};
    }

    if(!concept)return generateSource(type,actualLevel,options);
    const {pick}=added, rng=options.rng??Math.random;
    if(actualLevel==="B"&&!options.mode&&!options.variantId&&globalThis.ForgePlaneConceptCompiler?.has(type)) {
      const output=ForgePlaneConceptCompiler.compile(rng,type,options.format);
      return {...output,type,level:actualLevel,template:TYPES[type].label,plus:TYPES[type].plus};
    }

    const sources=actualLevel==="B"&&globalThis.ForgePlaneConceptCompiler&&type==="distance-line-parameter"
      ?[type]:concept.sources[actualLevel];
    const explicit=options.mode||options.variantId;
    const oldSource=explicit&&requested!==type&&generators[requested]&&(concept.sources[actualLevel].includes(requested)||generators[requested].compiled)?requested:undefined;
    const history=options.avoidPaths??[];
    const counts=sources.map(source=>history.filter(path=>path.startsWith(source+"/")).length);
    const source=oldSource??(explicit&&sources.includes(requested)&&generators[requested]?requested:
      options.environment&&actualLevel==="B"&&sources.includes(type)?type:
      pick(rng,sources.filter((_,i)=>counts[i]===Math.min(...counts))));
    const generated=actualLevel==="B"&&!options.mode&&globalThis.ForgePlaneConceptCompiler&&
      (type==="distance-line-parameter"||type==="distance-use"&&!options.environment);
    const sourceOptions={...options,...(generated?{mode:"generated"}:{}),avoidPaths:history.map(path=>path.startsWith(source+"/")?path.slice(source.length+1):path)};
    const result=generators[source]?generateSource(source,actualLevel,sourceOptions):curriculumProblem(source,actualLevel,rng,options.format);
    const path=result.answerPath?.id??"value";
    return {...result,type,level:actualLevel,template:TYPES[type].label,plus:TYPES[type].plus,
      answerPath:{...result.answerPath,label:result.answerPath?.label??TYPES[type].label,id:explicit||oldSource?path:source+"/"+path}};

  }

  function generateSource(type,actualLevel,options) {
    if(type==="distance-line-parameter"&&(options?.environment==="expression"&&!options.mode||
        options?.mode==="generated"||options?.mode?.startsWith("distance-")||
        !options?.mode&&(options?.rng??Math.random)()<.5)) {
      return {...added.generate(type,actualLevel,{...options,variantId:"distance-conditions"}),plus:Boolean(generators[type].plus)};
    }
    const composite=added.types[type]?.compositeVariant;
    const compositePaths=globalThis.ForgePlaneCompositions?.[type]?.answerPaths;
    if(generators[type].compiled && composite && (!options?.mode || compositePaths?.some(path=>path.id===options.mode))) {
      return {...added.generate(type,actualLevel,{...options,variantId:composite}),plus:Boolean(generators[type].plus)};
    }
    if(generators[type].compiled) return {...ForgeLineCompiler.compile(type,options),plus:Boolean(generators[type].plus)};
    const source = generators[type].source;
    if (!source) return {...added.generate(type,actualLevel,options),plus:Boolean(generators[type].plus)};
    const problem = base.generate(source.type,actualLevel,{ ...options, pathId:source.path });
    return { ...problem, type };
  }

  const isPlaneType=id=>planeTypes.has(id);

  function pool(unit, level) {
    if(level==="C")return Object.hasOwn(TYPES,"challenge-"+unit)?["challenge-"+unit]:[];
    const ids=["coordinate","lines"].includes(unit)?[...planeTypes.keys()]:Object.keys(TYPES);
    return ids.filter(id => (!Object.hasOwn(aliases,id)||planeTypes.has(id)||logicTypes.has(id)) && TYPES[id].active !== false && TYPES[id].unit === unit && TYPES[id].level.includes(level) && (globalThis.ForgePreferences?.plusEnabled?.() !== false || !TYPES[id].plus));
  }

  function normalizeSelection(unit,level,ids) {
    if(!Array.isArray(ids)) return [];
    const available=new Set((Array.isArray(unit)?unit:[unit]).flatMap(id=>pool(id,level)));
    return [...new Set(ids.map(canonicalType))].filter(id=>available.has(id));
  }

  function grade(input, answer) {
    if(answer.kind==="equation")return ForgeGeometryEquations.grade(input,answer);
    if(answer.kind==='truth') {
      if(typeof input!=='string')return {valid:false};
      const word=input.trim().toLowerCase(),value=({참:'참',거짓:'거짓',o:'참',x:'거짓',true:'참',false:'거짓'})[word];
      return value?{valid:true,correct:value===answer.value}:{valid:false};
    }
    if (answer.kind === "choice") {
      const index = Number(input);
      const valid = typeof input === "string" && /^\d+$/u.test(input) && index < answer.options.length;
      return valid ? { valid, correct:index === answer.value } : { valid };
    }
    if (answer.kind === "point" || answer.kind === "graph") {
      if (!Array.isArray(input) || input.length !== answer.value.length) return {valid:false};
      const results = input.map((item,i) => base.grade(item, { kind:"scalar", value:answer.value[i] }));
      return results.every(item => item.valid)
        ? { valid:true, correct:results.every(item => item.correct) } : { valid:false };
    }
    if (answer.kind === "point-set") {
      if(typeof input!=="string"||input.length>120)return {valid:false};
      const raw=input.normalize("NFKC").replaceAll("−","-").trim();
      if(!/^\{?\s*\(\s*[+-]?\d+\s*,\s*[+-]?\d+\s*\)(?:\s*[,;]\s*\(\s*[+-]?\d+\s*,\s*[+-]?\d+\s*\))*\s*\}?$/u.test(raw)
        ||raw.startsWith("{")!==raw.endsWith("}"))return {valid:false};
      const keys=[...raw.matchAll(/\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\)/gu)]
        .map(([,x,y])=>BigInt(x)+","+BigInt(y));
      const values=new Set(keys);
      return {valid:true,correct:keys.length===answer.value.length&&values.size===keys.length&&answer.value.every(point=>values.has(point.join(",")))};
    }
    if (answer.kind === "set") {
      if (typeof input !== "string" || input.length > 120) return {valid:false};
      const raw = input.normalize("NFKC").trim();
      if (/^(?:∅|공집합|\{\s*\})$/u.test(raw)) return {valid:true,correct:answer.value.length === 0};
      const wrapped = raw.match(/^\{(.*)\}$/u);
      const items = (wrapped ? wrapped[1] : raw).split(",").map(item => item.trim());
      if (!items.every(item => /^[+−-]?\d+$/u.test(item))) return {valid:false};
      const values = new Set(items.map(item => BigInt(item.replace("−","-"))));
      return { valid:true,correct:values.size === answer.value.length && answer.value.every(n => values.has(BigInt(n))) };
    }
    return base.grade(input, answer);
  }

  ForgeCatalog = globalThis.ForgeCatalog = Object.freeze({ COURSES, UNITS, TYPES, LEVELS, DEFAULT_SETTINGS, courseForUnit, canonicalType, normalizeSelection, isPlaneType, typeFor, pool, generate, generatePlanePractice, generateChallenge, grade, assessDifficulty, difficultyLabels });
})();


;

/* curriculum.js */
(() => {
  "use strict";

  const standards = {
    common1: {
      "10공수1-01-01":"다항식의 사칙연산",
      "10공수1-01-02":"항등식과 나머지정리",
      "10공수1-01-03":"다항식의 인수분해",
      "10공수1-02-01":"복소수의 뜻과 성질",
      "10공수1-02-02":"판별식과 이차방정식의 근",
      "10공수1-02-03":"이차방정식의 근과 계수의 관계",
      "10공수1-02-04":"이차방정식과 이차함수의 관계",
      "10공수1-02-05":"이차함수의 그래프와 직선의 위치 관계",
      "10공수1-02-06":"이차함수의 최대·최소",
      "10공수1-02-07":"간단한 삼차방정식과 사차방정식",
      "10공수1-02-08":"연립이차방정식",
      "10공수1-02-09":"연립일차부등식",
      "10공수1-02-10":"절댓값을 포함한 일차부등식",
      "10공수1-02-11":"이차부등식과 연립이차부등식",
      "10공수1-03-01":"합의 법칙과 곱의 법칙",
      "10공수1-03-02":"순열",
      "10공수1-03-03":"조합",
      "10공수1-04-01":"행렬의 뜻과 표현",
      "10공수1-04-02":"행렬의 연산",
    },
    common2: {
      "10공수2-01-01":"두 점 사이의 거리와 선분의 내분",
      "10공수2-01-02":"두 직선의 평행·수직 조건",
      "10공수2-01-03":"점과 직선 사이의 거리",
      "10공수2-01-04":"원의 방정식과 그래프",
      "10공수2-01-05":"원과 직선의 위치 관계",
      "10공수2-01-06":"평행이동",
      "10공수2-01-07":"대칭이동",
      "10공수2-02-01":"집합의 뜻과 표현",
      "10공수2-02-02":"집합의 포함 관계",
      "10공수2-02-03":"집합의 연산과 벤 다이어그램",
      "10공수2-02-04":"명제와 조건, 모든·어떤",
      "10공수2-02-05":"명제의 역과 대우",
      "10공수2-02-06":"충분조건과 필요조건",
      "10공수2-02-07":"대우와 귀류법을 이용한 증명",
      "10공수2-02-08":"절대부등식",
      "10공수2-03-01":"함수의 개념과 그래프",
      "10공수2-03-02":"합성함수",
      "10공수2-03-03":"역함수",
      "10공수2-03-04":"유리함수의 그래프와 성질",
      "10공수2-03-05":"무리함수의 그래프와 성질",
    },
  };
  const defaults = {
    polynomials:"1-01-02",quadratics:"1-02-11",coordinate:"2-01-01",lines:"2-01-02",circles:"2-01-04",
    transformations:"2-01-07",sets:"2-02-03",propositions:"2-02-04",functions:"2-03-01",rational:"2-03-04",radical:"2-03-05",
  };
  const groups = {
    "1-01-01":"product-coefficient quotient-linear division-rebuild degree-after-cancellation a-poly-add a-poly-multiply a-poly-coefficient",
    "1-01-03":"factor-parameter two-factors-parameters quartic-even-factorization reciprocal-cube cube-sum-identity known-root-cubic translated-polynomial-factor a-poly-factor",
    "1-02-01":"a-complex-powers",
    "1-02-02":"double-root-parameter real-roots-parameter a-discriminant",
    "1-02-03":"positive-roots-parameter opposite-roots-parameter shifted-roots root-square-sum root-gap a-roots-sum",
    "1-02-04":"a-quadratic-x-intercepts",
    "1-02-05":"intersection-count intersection-sum intersection-positive intersection-distance",
    "1-02-06":"axis-equal-values quadratic-restricted-min quadratic-restricted-max quadratic-always-sign quadratic-vertex-point a-quadratic-vertex",
    "1-02-08":"quadratic-system",
    "1-02-09":"a-linear-system-bound",
    "1-02-10":"a-absolute-linear",
    "2-01-03":"a-point-line-distance line-projection distance-line-parameter parallel-lines-distance line-distance-on-axis line-two-distance-axes line-perpendicular-distance-area",
    "2-01-05":"circle-line-position circle-tangent-point circle-tangent-parallel circle-horizontal-chord circle-axis-tangency circle-tangency-radius circle-both-axis-chords circle-tangent-two-intercepts",
    "2-01-06":"a-translate-point a-transform-shift-circle-equation translate-inverse-point translate-line-intercept translate-circle-center translate-circle-tangency translate-parabola-vertex transform-shift-line-through-point transform-two-parallel-line-distance transform-moved-circle-chord",
    "2-02-01":"a-set-membership a-set-empty a-set-cardinality-list a-set-builder-multiples equality-unordered-set",
    "2-02-02":"a-set-subset set-subset-count subsets-intersection",
    "2-02-05":"a-proposition-implication-converse contrapositive-parameter proposition-converse-and-contrapositive",
    "2-02-06":"suff-necessary-sets suff-necessary-parameter set-operations-iff suff-necessary suff-necessary-truth",
    "2-02-07":"contradiction-proof contrapositive-proof",
    "2-02-08":"a-square-positive a-amgm real-properties-proof absolute-inequality absolute-value-inequality amgm-product amgm-geometry amgm-sum amgm-fixed a-proposition-compare-squares weighted-absolute-min abs-maximum-bounded reverse-triangle-equality",
    "2-03-02":"a-function-compose function-identity-composition function-composition-order function-composition-coefficient function-composition-finite-domain function-composition-parameter function-context-composition function-composition-table-preimage function-composition-equality function-composition-recover-rule rational-composition-affine-domain radical-affine-compose-domain",
    "2-03-03":"a-inverse-pair a-function-recover-inverse-input function-inverse-affine function-inverse-restricted function-inverse-range function-inverse-composition function-inverse-fixed function-inverse-fixed-composition rational-inverse-value radical-inverse-value",
  };
  const byType = new Map(Object.entries(groups).flatMap(([code,ids])=>ids.split(" ").map(id=>[id,code])));

  // New families retain their curriculum grouping at both practice levels.
  for (const [code, names] of Object.entries({
    "2-01-03": "line-parallel-distance",
    "2-01-05": "circle-line-position circle-tangent circle-pair-position external-tangent",
    "2-01-06": "transform-equation",
    "2-02-01": "set-kind set-representation set-equality",
    "2-02-02": "set-counts set-required set-subset-laws set-subset-symbol",
    "2-02-03": "set-symmetric set-laws set-disjoint set-cardinality-arithmetic"
  })) for (const name of names.split(" ")) for (const level of ["a","b"]) byType.set(`concept-${name}-${level}`,code);

  const logicGroupCodes={
    "집합의 정의":"2-02-01","집합의 표현":"2-02-01","집합의 원소의 개수":"2-02-01",
    "집합 사이의 포함 관계":"2-02-02","부분집합의 개수":"2-02-02","집합의 연산":"2-02-03","집합의 연산 법칙":"2-02-03",
    "명제의 역과 대우":"2-02-05","충분조건과 필요조건":"2-02-06","증명":"2-02-07","절대부등식":"2-02-08",
  };

  function forType(id) {
    const type=ForgeCatalog.TYPES[id];
    const functionCode=type?.unit==="functions"?(type.group==="합성함수"?"2-03-02":type.group==="역함수"?"2-03-03":undefined):undefined;
    const code = byType.get(id) ?? functionCode ?? (["sets","propositions"].includes(type?.unit)?logicGroupCodes[type.group]:undefined) ?? defaults[type?.unit];
    return code ? "10공수"+code : undefined;
  }

  ForgeCurriculum = globalThis.ForgeCurriculum = Object.freeze({standards,forType});
})();


;

/* learning.js */
(() => {
  "use strict";

  const prefix = "math-forge:learning:v1:";
  const cache = new Map();
  const inkCache = new Map();
  const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone:"Asia/Seoul", year:"numeric", month:"2-digit", day:"2-digit" });
  const day = (timestamp = Date.now()) => dateFormat.format(timestamp);
  const offset = (date, days) => new Date(Date.parse(date + "T00:00:00Z") + days * 86400000).toISOString().slice(0,10);
  const uid = () => globalThis.crypto?.randomUUID?.() ?? Date.now() + "-" + Math.random().toString(36).slice(2);
  const intervals = [1,3,7];
  let database;
  let saved = true;

  function read(key, fallback = null) {
    try {
      const value = window.studyBridge.local.getItem(prefix + key);
      if (value !== null) return JSON.parse(value);
    } catch { saved = false; }
    return cache.has(key) ? cache.get(key) : fallback;
  }

  function write(key, value) {
    cache.set(key,value);
    try { window.studyBridge.local.setItem(prefix + key,JSON.stringify(value)); }
    catch { saved = false; }
  }

  function inkDatabase() {
    if (database) return database;
    database = new Promise((resolve,reject) => {
      const request = indexedDB.open(window.studyBridge.namespace + ":ink",1);
      request.onupgradeneeded = () => request.result.createObjectStore("ink",{keyPath:"id"});
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => reject(request.error);
    });
    return database;
  }

  async function putInk(value) {
    if (!value?.id) return;
    const snapshot = structuredClone(value);
    inkCache.set(snapshot.id,snapshot);
    try {
      const db = await inkDatabase();
      await new Promise((resolve,reject) => {
        const tx = db.transaction("ink","readwrite");
        tx.objectStore("ink").put(snapshot);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = reject;
      });
    } catch { saved = false; }
  }

  async function deleteInk(id) {
    const db=await inkDatabase();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("ink","readwrite");
      tx.objectStore("ink").delete(id);
      tx.oncomplete=resolve; tx.onerror=tx.onabort=reject;
    });
    inkCache.delete(id);
  }

  async function getInk(id) {
    if (inkCache.has(id)) return inkCache.get(id);
    try {
      const db = await inkDatabase();
      return await new Promise((resolve,reject) => {
        const request = db.transaction("ink").objectStore("ink").get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
    } catch { saved = false; return undefined; }
  }

  async function allInk() {
    try {
      const db = await inkDatabase();
      const entries = await new Promise((resolve,reject) => {
        const request = db.transaction("ink").objectStore("ink").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
      for (const entry of entries) if (!inkCache.has(entry.id)) inkCache.set(entry.id,entry);
    } catch { saved = false; }
    return [...inkCache.values()];
  }

  function reviews(attempts,today = day()) {
    const queue = new Map();
    for (const record of [...attempts].sort((a,b)=>a.date-b.date)) {
      const current = queue.get(record.reviewOf);
      if (!current) {
        if (!record.correct && !record.reviewOf) queue.set(record.id,{record,stage:0,due:offset(day(record.date),1)});
        continue;
      }
      if (current.due === null) continue;
      if (record.correct) {
        if (day(record.date) < current.due) continue;
        current.stage += 1;
      } else current.stage = 0;
      current.due = current.stage >= intervals.length ? null : offset(day(record.date),intervals[current.stage]);
    }
    const ignored=new Set(read("ignored-reviews",[]));
    return [...queue.values()].filter(entry=>!ignored.has(entry.record.id)).map(entry=>({...entry,ready:entry.due !== null && entry.due<=today}))
      .sort((a,b)=>(a.due ?? "9999").localeCompare(b.due ?? "9999"));
  }

  // A later successful review changes a wrong daily result to reviewed.
  function dailyStatus(item, attempts) {
    const original=attempts.find(record=>record.id===item.id);
    if(!original) return "unanswered";
    if(original.correct) return "correct";
    const root=original.reviewOf ?? original.id;
    return attempts.some(record=>record.correct && record.date>original.date
      && (record.reviewOf===original.id || record.reviewOf===root)) ? "reviewed" : "wrong";
  }

  function activity(attempts,typeFor,today = day()) {
    const days = new Map();
    const earned = new Set();
    for (const record of [...attempts].sort((a,b)=>a.date-b.date)) {
      const date = day(record.date);
      const entry = days.get(date) ?? {date,count:0,points:0};
      entry.count++;
      const type = typeFor(record.problem);
      const key = record.reviewOf ? "review:"+date+":"+record.reviewOf : record.problem.level+":"+type;
      if (record.correct && !earned.has(key)) {
        earned.add(key);
        entry.points += record.reviewOf ? 5 : 10;
      }
      days.set(date,entry);
    }
    let streak = 0;
    for (let date = days.has(today) ? today : offset(today,-1); days.has(date); date = offset(date,-1)) streak++;
    const ranking = [...days.values()].filter(entry=>entry.points).sort((a,b)=>b.points-a.points || b.date.localeCompare(a.date));
    return {streak, points:ranking.reduce((sum,entry)=>sum+entry.points,0), ranking};
  }

  function park(draft) {
    if (!draft || draft.record) return;
    const items = read("parked",[]).filter(item=>item.id!==draft.id);
    write("parked",[{...draft,savedAt:draft.savedAt ?? Date.now()},...items]);
  }

  function unpark(id) {
    write("parked",read("parked",[]).filter(item=>item.id!==id));
  }

  async function clearLearning() {
    const db=await inkDatabase();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction("ink","readwrite");
      tx.objectStore("ink").clear();
      tx.oncomplete=resolve;
      tx.onerror=tx.onabort=reject;
    });
    inkCache.clear();
    cache.clear();
    for (const key of Object.keys(window.studyBridge.local)) {
      if (key.startsWith(prefix) || key.startsWith("math-forge:attempt:v1:")) window.studyBridge.local.removeItem(key);
    }
    window.studyBridge.session.removeItem("math-forge:draft:v1");
    window.studyBridge.session.removeItem("math-forge:active-ink");
  }

  ForgeLearning = globalThis.ForgeLearning = Object.freeze({clearLearning,
    day,offset,uid,read,write,dailyStatus,putInk,deleteInk,getInk,allInk,reviews,activity,park,unpark,
    persistent:()=>saved,
  });
})();


;

/* backup.js */
(() => {
  "use strict";

  const {TYPES,LEVELS,UNITS,typeFor,canonicalType,grade}=ForgeCatalog;
  const text=(value,max=4000)=>typeof value==="string" && value.length<=max;
  const list=(value,test,max)=>Array.isArray(value) && value.length<=max && value.every(test);
  const number=value=>Number.isFinite(value) && Math.abs(value)<=1e9;
  const id=value=>text(value,100) && /^[A-Za-z0-9_-]+$/u.test(value);
  const date=value=>text(value,10) && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value));
  const kinds=["scalar","choice","point","graph","set","point-set","interval","truth","equation"];
  const validPlot=plot=>!plot || (plot.kind==="function-points"?list(plot.points,p=>list(p,number,2)&&p.length===2,12)&&plot.points.length>0:plot.kind==="venn"
    ? list(plot.counts,number,4) && plot.counts.length===4
      && (!plot.names || list(plot.names,name=>typeof name==="string"&&/^[A-Z]$/u.test(name),2)&&plot.names.length===2)
      && (!plot.elements || list(plot.elements,items=>list(items,Number.isSafeInteger,8),4)
        && plot.elements.length===4 && plot.elements.every((items,i)=>items.length===plot.counts[i])
        && new Set(plot.elements.flat()).size===plot.elements.flat().length)
    : ["rational","radical","circle"].includes(plot.kind) && [plot.h,plot.k,plot.a].every(number) && [undefined,-1,1].includes(plot.sign));
  const validAnswer=answer=>{
    if (!answer || !kinds.includes(answer.kind) || !text(answer.text) || !validPlot(answer.plot)) return false;
    switch (answer.kind) {
      case "choice": return list(answer.options,textValue=>text(textValue),12) && Number.isInteger(answer.value) && answer.value>=0 && answer.value<answer.options.length;
      case "equation": return list(answer.value,Number.isSafeInteger,6) && answer.value.length===6 && ForgeGeometryEquations.grade(answer.input,answer).correct;
      case "truth": return ["참","거짓"].includes(answer.value);
      case "point": return list(answer.value,number,2) && answer.value.length===2;
      case "graph": return list(answer.value,number,3) && list(answer.labels,label=>text(label,80),3) && answer.labels.length===answer.value.length && validPlot(answer.plot);
      case "point-set": return answer.value?.length>=1 && list(answer.value,point=>list(point,Number.isSafeInteger,2)&&point.length===2,12);
      case "set": return list(answer.value,Number.isSafeInteger,120);
      case "interval": return list(answer.value,item=>item && [item.start,item.end].every(value=>value===null || number(value))
        && typeof item.startClosed==="boolean" && typeof item.endClosed==="boolean",20);
      default: return number(answer.value);
    }
  };
  function validProblem(problem) {
    const type=typeFor(problem);
    return Object.hasOwn(TYPES,type) && Object.hasOwn(LEVELS,problem.level)
      && [undefined,"tex"].includes(problem.format) && text(problem.intro) && text(problem.question)
      && list(problem.expressions,item=>text(item),30) && list(problem.solution,item=>text(item),30)
      && validAnswer(problem.answer) && validPlot(problem.plot) && text(problem.answerPath?.id,512)
      && (!problem.answerLabels || list(problem.answerLabels,label=>text(label,80),3));
  }
  function validRecord(record) {
    if (!record || !id(record.id) || typeof record.correct!=="boolean" || !Number.isFinite(record.date)
      || record.date<0 || record.date>8640000000000000 || !Number.isFinite(record.elapsed) || record.elapsed<0 || !validProblem(record.problem)
      || (record.reviewOf!==undefined && !id(record.reviewOf)) || (record.dailyDay!==undefined && !date(record.dailyDay))
      || ![undefined,"","calculation","concept","reading","other"].includes(record.error)) return false;
    const result=grade(record.input,record.problem.answer);
    return result.valid && result.correct===record.correct;
  }
  function validDraft(draft) {
    return draft && id(draft.id) && validProblem(draft.problem) && (!draft.record || (validRecord(draft.record) && draft.record.id===draft.id))
      && Number.isFinite(draft.elapsed ?? 0) && (draft.elapsed ?? 0)>=0
      && (draft.input==null || text(draft.input,120) || list(draft.input,item=>text(item,120),3))
      && Object.hasOwn(UNITS,draft.settings?.unit) && Object.hasOwn(LEVELS,draft.settings?.level)
      && ["balanced","new","wrong","custom"].includes(draft.settings?.strategy)
      && (!draft.settings.customTypes || list(draft.settings.customTypes,type=>typeof type==="string" && Object.hasOwn(TYPES,canonicalType(type)),400))
      && (draft.reviewOf===undefined || id(draft.reviewOf)) && (draft.dailyDay===undefined || date(draft.dailyDay));
  }
  function validInk(value) {
    return value && value.version===2 && id(value.id) && number(value.paperHeight) && value.paperHeight>=0
      && list(value.commands,command=>command && (command.tool==="clear" || (["pen","eraser"].includes(command.tool)
        && list(command.points,point=>list(point,coordinate=>number(coordinate) && coordinate>=0,2) && point.length===2,100000)
        && command.points.length>0)),20000);
  }
  function readBackup(content) {
    const data=JSON.parse(content);
    if (data?.version!==1 || (data.ignoredReviews!==undefined && !list(data.ignoredReviews,id,100000)) || !list(data.attempts,validRecord,100000) || !list(data.ink,validInk,100000)
      || !list(data.parked,validDraft,100000) || !(data.draft===null || validDraft(data.draft))
      || !list(data.daily,entry=>entry && date(entry.date) && list(entry.plan?.items,validDraft,3)
        && entry.plan.items.length===3 && entry.plan.items.every(item=>item.dailyDay===entry.date),20000)) {
      throw new TypeError("Invalid practice backup");
    }
    return data;
  }
  ForgeBackup = globalThis.ForgeBackup = Object.freeze({readBackup});
})();


;

/* recommendations.js */
(() => {
  "use strict";
  const {pool,typeFor,canonicalType,normalizeSelection} = globalThis.ForgeCatalog;
  const STRATEGIES = {
    new:"신규",
    balanced:"균형",
    wrong:"오답",
    custom:"직접 설정",
  };

  function chooseWeighted(rows, weight, rng) {
    const weights=rows.map(weight);
    let value=rng()*weights.reduce((sum,n)=>sum+n,0);
    return rows.find((_,i)=>(value-=weights[i])<0) ?? rows.at(-1);
  }

  function recommend({settings, attempts, exposures={}, previous, rng=Math.random}) {
    const ids=settings.strategy==="custom" ? normalizeSelection(settings.units ?? [settings.unit],settings.level,settings.customTypes) : (settings.units ?? [settings.unit]).flatMap(unit=>pool(unit,settings.level));
    if (!ids.length) throw new RangeError("No problems in the selected range");
    const mergedExposures={};
    for(const [id,count] of Object.entries(exposures)) {
      const key=canonicalType(id);
      mergedExposures[key]=(mergedExposures[key]||0)+count;
    }
    const rows=ids.map(type=>({type,seen:mergedExposures[type]||0,attempts:0,wrong:0,lastWrong:false,lastDate:-Infinity}));
    const byType=new Map(rows.map(row=>[row.type,row]));
    for(const record of attempts){
      if(record.problem.level!==settings.level) continue;
      const row=byType.get(typeFor(record.problem));
      if(!row) continue;
      row.attempts++;
      if(!record.correct) row.wrong++;
      if(record.date>row.lastDate){
        row.lastWrong=!record.correct;
        row.lastDate=record.date;
      }
    }
    const avoidRepeat = candidates => {
      const fresh=candidates.filter(row=>row.type!==previous);
      return fresh.length ? fresh : candidates;
    };
    const fresh=rows.filter(row=>!row.seen&&!row.attempts);
    const wrong=rows.filter(row=>row.wrong);
    let reason;
    let chosen;
    if(settings.strategy==="custom"){
      chosen=chooseWeighted(avoidRepeat(rows),row=>1/(1+row.seen),rng);
      reason="직접 고른 유형을 반복 연습합니다.";
    }else if(settings.strategy==="wrong" && wrong.length){
      const unresolved=wrong.filter(row=>row.lastWrong);
      chosen=chooseWeighted(avoidRepeat(unresolved.length?unresolved:wrong),row=>(1+row.wrong/row.attempts)/(1+row.seen),rng);
      reason=chosen.lastWrong?"최근에 틀린 유형을 다시 연습합니다.":"이전에 틀린 적이 있는 유형을 복습합니다.";
    }else if(settings.strategy==="new" || settings.strategy==="wrong"){
      const candidates=avoidRepeat(fresh.length?fresh:rows);
      const lowest=Math.min(...candidates.map(row=>Math.max(row.attempts,row.seen)));
      chosen=chooseWeighted(candidates.filter(row=>Math.max(row.attempts,row.seen)===lowest),()=>1,rng);
      reason=fresh.length?"이 범위에서 아직 접하지 않은 유형입니다.":"이 범위에서 연습 횟수가 적은 유형입니다.";
      if(settings.strategy==="wrong") reason="이 범위에 오답 기록이 아직 없어 새 유형부터 추천합니다.";
    }else{
      const candidates=avoidRepeat(rows);
      const newTypes=candidates.filter(row=>!row.seen&&!row.attempts);
      const review=candidates.filter(row=>row.seen||row.attempts);
      const nextPool=newTypes.length&&review.length?(rng()<.5?newTypes:review):candidates;
      chosen=chooseWeighted(nextPool,row=>(1+(row.lastWrong ? .8 : 0))/(1+.6*row.seen),rng);
      reason=chosen.attempts?(chosen.lastWrong?"이전에 틀린 유형도 함께 복습합니다.":"풀어 본 유형을 복습합니다.")
        :chosen.seen?"이 유형을 다른 문제로 한 번 더 연습합니다.":"새로운 유형을 섞어 연습합니다.";
    }
    return {type:chosen.type,reason};
  }

  ForgeRecommendations = globalThis.ForgeRecommendations = Object.freeze({STRATEGIES,recommend});
})();


;

/* math-view.js */
(() => {
  "use strict";

  const esc = value => String(value).replace(/[&<>"']/gu, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]);
  const symbols = {
    "−":"-", "²":"^{2}", "³":"^{3}", "≤":"\\le ", "≥":"\\ge ", "≶":"\\lessgtr ",
    "×":"\\cdot ", "∪":"\\cup ", "∞":"\\infty ", "∅":"\\varnothing ",
  };
  function legacyTeX(formula) {
    return formula
      .replace(/(\d+)\/(\d+)/gu, "\\frac{$1}{$2}")
      .replace(/√\(([^()]+)\)/gu, "\\sqrt{$1}")
      .replace(/[−²³≤≥≶×∪∞∅]/gu, symbol => symbols[symbol]);
  }

  function renderMath(tex, displayMode = false) {
    try {
      return globalThis.katex.renderToString(tex, { displayMode, strict:"ignore", trust:false, maxExpand:100, maxSize:12 });
    } catch {
      return '<span class="math-fallback">' + esc(tex) + '</span>';
    }
  }

  // 한글은 KaTeX 글꼴에 넣지 않고 주변 문장과 같은 일반 텍스트로 출력한다.
  function render(tex, displayMode = false) {
    const parts = ForgeNotation.math(tex).split(/\\text\{([^{}]*[가-힣][^{}]*)\}/u);
    if (parts.length === 1) return renderMath(tex, displayMode);
    return parts.map((part, index) => index % 2 ? esc(part) : (part.trim() ? renderMath(part, false) : "")).join("");
  }

  function prose(text, format, largeMath=false) {
    const formula=value=>{
      // Retained finite-function questions contain long lists of pairs.
      // Break at a pair boundary and keep each coordinate intact.
      const wrapPairs=value.startsWith(String.raw`\{(`)?
        value.replace(/\),\s*(?=\()/g,String.raw`),\allowbreak `):value;
      return render(largeMath?String.raw`\displaystyle `+wrapPairs:wrapPairs);
    };
    if (format === "tex") {
      return text.split("$").map((part, index) => index % 2 ? formula(part) : esc(part).replaceAll("\n","<br>")).join("");
    }
    // Previous versions stored plain text alongside formula-only display lines.
    const fragments = /[A-Za-z0-9()[\]−+√∅∞][A-Za-z0-9²³()[\]−+√∅∞≤≥<>≶=×∪, \/.\t-]*/gu;
    let result = "";
    let end = 0;
    for (const match of text.matchAll(fragments)) {
      const candidate = match[0].replace(/[ ,.\t]+$/u,"");
      if (!/[A-Za-z0-9∅∞]/u.test(candidate)) continue;
      result += esc(text.slice(end,match.index)) + formula(legacyTeX(candidate));
      end = match.index + candidate.length;
    }
    return result + esc(text.slice(end));
  }

  function mathBlock(problem) {
    if (!problem.expressions.length) return "";
    return '<div class="math-block">' + problem.expressions
      .map(text => '<div class="formula-line">' + render(problem.format === "tex" ? text : legacyTeX(text), true) + '</div>')
      .join("") + '</div>';
  }

  function plotDescription(plot) {
    if(plot.kind==="function-points")return "좌표평면에 표시된 점 "+plot.points.map(([x,y])=>"("+x+", "+y+")").join(", ");

    if (plot.kind === "venn") {
      const [a,both,b,outside] = plot.counts;
      const [left,right]=plot.names??["A","B"];
      if(plot.elements){
        const [a,both,b,outside]=plot.elements.map(items=>items.join(", ")||"없음");
        return `벤 다이어그램의 원소. ${left}에만 ${a}, 공통 부분 ${both}, ${right}에만 ${b}, 두 집합의 바깥 ${outside}.`;
      }
      return `벤 다이어그램의 원소 수. ${left}에만 ${a}개, 공통 부분 ${both}개, ${right}에만 ${b}개, 두 집합의 바깥 ${outside}개.`;
    }
    const {kind,h,k,a} = plot;
    if (kind === "circle") return `중심이 (${h}, ${k})이고 반지름이 ${a}인 원.`;
    if (kind === "rational") {
      const direction = a > 0 ? "오른쪽 위와 왼쪽 아래" : "왼쪽 위와 오른쪽 아래";
      return `점선은 x = ${h}와 y = ${k}이고, 가지는 교점의 ${direction}에 있다. 그래프는 (${h+1}, ${k+a})를 지난다.`;
    }
    return `그래프는 (${h}, ${k})에서 시작해 ${a > 0 ? "오른쪽" : "왼쪽"} ${plot.sign===-1?"아래":"위"}로 뻗으며, (${h+Math.sign(a)}, ${k+(plot.sign??1)*Math.sqrt(Math.abs(a))})를 지난다.`;
  }

  function plotBlock(problem) {
    const plot = problem.plot;
    if (!plot) return "";
    const label = esc(plotDescription(plot));
    if (plot.kind === "venn") {
      const regions=plot.elements?.map(items=>{
        const lines=[];
        for(let i=0;i<items.length;i+=2)lines.push(items.slice(i,i+2).join(", "));
        return lines;
      });
      const [a,both,b,outside] = plot.counts;
      const [left,right]=plot.names??["A","B"];
      const region=(i,x,y,count)=>regions?regions[i].map((line,j)=>`<text x="${x}" y="${y+15*j}" font-size="14">${esc(line)}</text>`).join(""):
        `<text x="${x}" y="${y}">${count}</text>`;
      return `<svg class="problem-plot" viewBox="0 0 350 214" role="img" aria-label="${label}">
        <rect x="10" y="12" width="330" height="190" rx="8" fill="var(--panel)" stroke="var(--plot-line)" stroke-width="2"/>
        <circle cx="134" cy="106" r="68" fill="var(--plot-fill)" fill-opacity=".72" stroke="var(--plot-ink)" stroke-width="2"/>
        <circle cx="216" cy="106" r="68" fill="var(--plot-fill)" fill-opacity=".60" stroke="var(--plot-ink)" stroke-width="2"/>
        <g fill="var(--ink)" text-anchor="middle" font-size="20" font-weight="700">
          <text x="22" y="39">U</text><text x="102" y="72">${esc(left)}</text><text x="246" y="72">${esc(right)}</text>
          ${region(0,110,115,a)}${region(1,175,115,both)}${region(2,240,115,b)}
          ${region(3,312,regions?135:179,outside)}
        </g></svg>`;
    }

    if(plot.kind==="function-points"){
      const extent=Math.max(3,...plot.points.flat().map(Math.abs))+1;
      const coord=n=>150+n*118/extent;
      const ticks=Array.from({length:2*extent+1},(_,i)=>i-extent);
      return `<svg class="problem-plot" viewBox="0 0 300 300" role="img" aria-label="${label}">
        <g stroke="var(--plot-grid)">${ticks.map(t=>`<path d="M${coord(t)} 28v244 M28 ${coord(t)}h244"/>`).join("")}</g>
        <path stroke="var(--ink)" d="M150 24v252 M24 150h252"/>
        <g fill="var(--ink)" font-size="11" text-anchor="middle">${ticks.filter(t=>t===0||extent<10||t%2===0).map(t=>
          `<text x="${coord(t)}" y="164">${t}</text>${t?`<text x="139" y="${coord(-t)+4}">${t}</text>`:""}`).join("")}
          <text x="282" y="147">x</text><text x="156" y="21">y</text></g>
        <g fill="var(--plot-ink)">${plot.points.map(([x,y])=>`<circle cx="${coord(x)}" cy="${coord(-y)}" r="4"/>`).join("")}</g></svg>`;
    }
    const {kind,h,k,a} = plot;
    const edge = Math.min(36, Math.max(6, Math.ceil(Math.max(Math.abs(h),Math.abs(k)) + (kind === "circle" ? Math.abs(a) : 2))));
    const size = 288, step = size/(2*edge), margin = 23;
    const X = x => margin + (x+edge)*step;
    const Y = y => margin + (edge-y)*step;
    const limit = margin + size;
    const tickStep = Math.ceil(edge/6);
    const ticks = Array.from({length:2*edge-1},(_,i)=>i-edge+1).filter(t=>t!==0 && t%tickStep===0);
    const grid = ticks.map(t=>`<path d="M${X(t)} ${margin}v${size} M${margin} ${Y(t)}h${size}"/>`).join("");
    const numbers = ticks.map(t=>`<text x="${X(t)}" y="${Y(0)+16}" text-anchor="middle">${t}</text><text x="${X(0)-5}" y="${Y(t)+4}" text-anchor="end">${t}</text>`).join("");
    const isRational = kind === "rational";
    const curve = (min,max,f) => {
      const points = Array.from({length:121},(_,i) => {
        const x = min + (max-min)*i/120;
        const y = Math.max(-24,Math.min(24,f(x)));
        return `${X(x).toFixed(2)},${Y(y).toFixed(2)}`;
      });
      return `<polyline points="${points.join(" ")}"/>`;
    };
    const border = isRational ? `<path stroke="var(--plot-line)" stroke-width="2" stroke-dasharray="5 5" d="M${X(h)} ${margin}v${size} M${margin} ${Y(k)}h${size}"/>` : "";
    const data = kind === "circle" ? `<circle cx="${X(h)}" cy="${Y(k)}" r="${step*a}"/>` : isRational
      ? curve(-edge,h-.015,x=>a/(x-h)+k) + curve(h+.015,edge,x=>a/(x-h)+k)
      : curve(h,a>0?edge:-edge,x=>(plot.sign??1)*Math.sqrt(a*(x-h))+k) + `<circle cx="${X(h)}" cy="${Y(k)}" r="4.6" fill="var(--plot-ink)"/>`;
    const outer = limit+margin;
    return `<svg class="problem-plot" viewBox="0 0 ${outer} ${outer}" role="img" aria-label="${label}">
      <rect x="${margin}" y="${margin}" width="${size}" height="${size}" fill="var(--panel)" stroke="var(--plot-grid)"/>
      <g stroke="var(--plot-grid)">${grid}</g>
      <path stroke="var(--ink)" stroke-width="1.55" d="M${X(0)} ${limit}V${margin-6}l-4 6 m4-6 4 6 M${margin} ${Y(0)}H${limit+6}l-6-4 m6 4-6 4"/>
      ${border}
      <svg x="${margin}" y="${margin}" width="${size}" height="${size}" viewBox="${margin} ${margin} ${size} ${size}" overflow="hidden">
        <g fill="none" stroke="var(--plot-ink)" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${data}</g>
      </svg>
      <g class="plot-labels" fill="var(--ink)" font-size="13" stroke="var(--panel)" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round">
        ${numbers}<text x="${X(0)-5}" y="${Y(0)+16}" text-anchor="end">0</text>
        <text x="${limit+8}" y="${Y(0)-7}">x</text><text x="${X(0)+7}" y="${margin-6}">y</text>
      </g></svg>`;
  }

  function shareText(problem, includeSolution = true) {
    const lines = [problem.intro, ...problem.expressions.map(value => problem.format === "tex" ? `$$${value}$$` : value)];
    if (problem.plot) lines.push(plotDescription(problem.plot));
    lines.push(problem.question);
    if (problem.answer.kind === "choice") {
      lines.push(...problem.answer.options.map((value,i)=>`${i+1}. ${value}`));
    }
    if (includeSolution) lines.push("", `정답  ${problem.answer.text}`, "", "풀이", ...problem.solution.map((step,i)=>`${i+1}. ${step}`));
    if (includeSolution && problem.answer.plot) lines.push(plotDescription(problem.answer.plot));
    return ForgeNotation.plainText(lines.join("\n").trim());
  }

  function solutionList(problem) {
    return '<ol class="solution-list">' + problem.solution.map(step => '<li>' + prose(step,problem.format) + '</li>').join("") + '</ol>';
  }

  function answer(problem) {
    const value = problem.answer.text;
    return (problem.answer.kind === "choice" || problem.answer.kind === "truth" || problem.format === "tex" && problem.answer.kind !== "scalar") ? prose(value, "tex") : render(legacyTeX(value));
  }

  ForgeMathView = globalThis.ForgeMathView = Object.freeze({ esc, prose, mathBlock, plotBlock, shareText, solutionList, answer });
})();


;

/* scratchpad.js */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const canvas=$("ink");
  const panel=$("scratchpad");
  const dock=$("pad-dock");
  const fullscreen=$("pad-fullscreen");
  const expand=$("pad-expand");
  const toolbar=$("pad-tools");
  const penOnly=$("pen-only");
  const undo=$("pad-undo");
  const clear=$("pad-clear");
  const pen=$("tool-pen");
  const eraser=$("tool-eraser");
  const ctx=canvas.getContext("2d");
  const inkKey="math-forge:active-ink";
  const sensitivityInput=$("pen-sensitivity");
  let id;
  let commands=[];
  let tool="pen";
  let active=null;
  let touchScroll=null;
  let width=0;
  let height=0;
  let scale=1;
  let inkColor;
  let paperHeight=0;
  let revision=0;

  function acceptsPointer(type, onlyPen) {
    return onlyPen ? type==="pen" : type==="pen" || type==="touch" || type==="mouse";
  }

  function snapshot() {
    return {version:2,id,commands,paperHeight};
  }

  function storeInk() {
    revision++;
    const value = snapshot();
    globalThis.ForgeLearning.putInk(value);
    try { window.studyBridge.session.setItem(inkKey,JSON.stringify(value)); }
    catch { /* Drawing remains usable without browser storage. */ }
  }

  function syncTools() {
    pen.setAttribute("aria-pressed",String(tool==="pen"));
    eraser.setAttribute("aria-pressed",String(tool==="eraser"));
    undo.disabled=!commands.length;
    const lastClear=commands.findLastIndex(command=>command.tool==="clear");
    clear.disabled=!commands.slice(lastClear+1).some(command=>command.tool==="pen");
  }

  function strokeWidth(event) {
    if (event.pointerType!=="pen" || !Number.isFinite(event.pressure) || event.pressure<=0) return 3;
    const response=Math.pow(Math.min(1,event.pressure),1.8-sensitivityInput.valueAsNumber*0.015);
    return Math.max(1.8, Math.min(5, 1.8+response*3.2));
  }

  function draw(kind, from, to, ctx=canvas.getContext("2d"), color=inkColor, lineWidth=3) {
    ctx.globalCompositeOperation=kind==="eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle=color;
    ctx.fillStyle=color;
    ctx.lineWidth=kind==="eraser"?24:lineWidth;
    ctx.lineCap="round";
    ctx.lineJoin="round";
    ctx.beginPath();
    if (!to || (from[0]===to[0] && from[1]===to[1])) {
      ctx.arc(from[0],from[1],ctx.lineWidth/2,0,2*Math.PI);
      ctx.fill();
    } else {
      ctx.moveTo(...from);
      ctx.lineTo(...to);
      ctx.stroke();
    }
  }

  function repaint() {
    if (!ctx || !width || !height) return;
    ctx.clearRect(0,0,width/scale,height/scale);
    const lastClear=commands.findLastIndex(command=>command.tool==="clear");
    const strokes=commands.slice(lastClear+1);
    if (active) strokes.push(active);
    for (const command of strokes) {
      draw(command.tool,command.points[0],null,ctx,inkColor,command.widths?.[0]);
      for (let i=1;i<command.points.length;i++) draw(command.tool,command.points[i-1],command.points[i],ctx,inkColor,command.widths?.[i]);
    }
  }

  function fitScale() {
    let right=1, bottom=1;
    const lastClear=commands.findLastIndex(command=>command.tool==="clear");
    const strokes=commands.slice(lastClear+1);
    if (active) strokes.push(active);
    for (const stroke of strokes) {
      if (stroke.tool !== "pen") continue;
      for (const [x,y] of stroke.points) {
        right=Math.max(right,x+2);
        bottom=Math.max(bottom,y+2);
      }
    }
    return Math.min(1,width/right,height/bottom);
  }

  function resize() {
    const rect=canvas.getBoundingClientRect();
    if (!ctx||!rect.width||!rect.height) return;
    width=rect.width;
    height=rect.height;
    scale=fitScale();
    inkColor=getComputedStyle(canvas).getPropertyValue("--pen-ink").trim();
    const ratio=Math.min(devicePixelRatio||1,2,8192/width,8192/height,Math.sqrt(12000000/(width*height)));
    const pixelWidth=Math.round(width*ratio);
    const pixelHeight=Math.round(height*ratio);
    if (canvas.width!==pixelWidth || canvas.height!==pixelHeight) {
      canvas.width=pixelWidth;
      canvas.height=pixelHeight;
    }
    ctx.setTransform(pixelWidth/width*scale,0,0,pixelHeight/height*scale,0,0);
    repaint();
  }

  function setPaperHeight(nextHeight) {
    paperHeight=nextHeight;
    canvas.style.setProperty("--paper-height",paperHeight+"px");
  }

  function extendIfNeeded(event) {
    if (active?.tool!=="pen") return;
    const rect=canvas.getBoundingClientRect();
    if (event.clientY<rect.bottom-Math.max(112,Math.min(220,innerHeight*.18)) || event.clientY<rect.top || event.clientX<rect.left || event.clientX>rect.right) return;
    const extra=Math.max(300,Math.round(innerHeight*.5));
    setPaperHeight(rect.height+extra);
  }

  function start(problemId) {
    if (id===problemId) return;
    let saved;
    try { saved=JSON.parse(window.studyBridge.session.getItem(inkKey)); }
    catch { /* A new pad starts blank. */ }
    id=problemId;
    active=null;
    touchScroll=null;
    commands=saved?.id===id && Array.isArray(saved.commands) ? saved.commands : [];
    if (commands.length && saved.version!==2) {
      const oldSquare=Math.min(440,innerWidth-58);
      commands=commands.map(command=>command.points
        ? {...command,points:command.points.map(([x,y])=>[x*oldSquare,y*oldSquare])}
        : command);
    }
    setPaperHeight(saved?.id===id && Number.isFinite(saved.paperHeight) ? Math.max(0,saved.paperHeight) : 0);
    resize();
    syncTools();
    if (saved?.id===id) {
      if (commands.length) storeInk();
      return;
    }
    const startingRevision=++revision;
    globalThis.ForgeLearning.getInk(id).then(past=>{
      if (id!==problemId || revision!==startingRevision || active || !past?.commands.length) return;
      commands=past.commands;
      setPaperHeight(Math.max(0,past.paperHeight));
      resize();
      syncTools();
    });
  }

  function renderSaved(target,past) {
    const strokes=past.commands.slice(past.commands.findLastIndex(command=>command.tool==="clear")+1);
    if (!strokes.some(stroke=>stroke.tool==="pen")) return false;
    let right=32,bottom=32;
    for (const stroke of strokes) for (const [x,y] of stroke.points) {
      right=Math.max(right,x+8);
      bottom=Math.max(bottom,y+8);
    }
    const factor=Math.min(2,1400/right,2400/bottom);
    target.width=Math.ceil(right*factor);
    target.height=Math.ceil(bottom*factor);
    target.style.width=Math.ceil(right)+"px";
    const context=target.getContext("2d");
    context.scale(factor,factor);
    const color=getComputedStyle(target).getPropertyValue("--pen-ink").trim();
    for (const stroke of strokes) {
      draw(stroke.tool,stroke.points[0],null,context,color,stroke.widths?.[0]);
      for (let i=1;i<stroke.points.length;i++) draw(stroke.tool,stroke.points[i-1],stroke.points[i],context,color,stroke.widths?.[i]);
    }
    return true;
  }

  function point(event,rect) {
    const clamp=(n,max)=>Math.max(0,Math.min(max,n))/scale;
    return [clamp(event.clientX-rect.left,rect.width),clamp(event.clientY-rect.top,rect.height)];
  }

  function finish(pointerId) {
    if (active?.pointerId!==pointerId) return;
    commands.push({tool:active.tool,points:active.points,widths:active.widths});
    active=null;
    syncTools();
    storeInk();
  }

  function exitFullscreen(returnToQuestion=false) {
    if (!fullscreen.open) return;
    fullscreen.close();
    updateFloatingControls();
    dock.append(panel);
    dock.style.minHeight="";
    expand.setAttribute("aria-pressed","false");
    expand.setAttribute("aria-label","필기 전체 화면");
    expand.title="필기 전체 화면";
    expand.querySelector("use").setAttribute("href","#ico-expand");
    resize();
    if ($("session-view").hidden) return;
    if (returnToQuestion) {
      window.scrollTo({top:0});
      $("problem-card").focus({preventScroll:true});
    } else {
      panel.scrollIntoView({block:"start"});
      expand.focus({preventScroll:true});
    }
  }

  if (ctx) {
    new ResizeObserver(resize).observe(canvas);
    document.addEventListener("forge-themechange",resize);
    function beginStroke(event) {
      const p=point(event,canvas.getBoundingClientRect());
      const strokeTool=event.pointerType==="pen" && (event.button===5 || (event.buttons & 32)!==0) ? "eraser" : tool;
      active={pointerId:event.pointerId,tool:strokeTool,points:[p],widths:[strokeWidth(event)]};
      if (canvas.isConnected) {
        try { canvas.setPointerCapture(event.pointerId); } catch { /* The pointer may have already ended. */ }
      }
      draw(active.tool,p,null,ctx,inkColor,active.widths[0]);
      extendIfNeeded(event);
    }

    canvas.addEventListener("pointerdown",event=>{
      if (event.pointerType==="touch" && penOnly.checked) {
        if (active || touchScroll) return;
        touchScroll={pointerId:event.pointerId, y:event.clientY};
        canvas.setPointerCapture(event.pointerId);
        return;
      }
      if (active||!acceptsPointer(event.pointerType,penOnly.checked)||(event.pointerType==="mouse"&&event.button!==0)) return;
      event.preventDefault();
      beginStroke(event);
    });
    canvas.addEventListener("pointermove",event=>{
      if (event.pointerType==="pen" && !active && (event.pressure>0 || (event.buttons & 33)!==0)) {
        beginStroke(event);
      }
      if (touchScroll?.pointerId===event.pointerId) {
        if (active) return;
        const delta=touchScroll.y-event.clientY;
        touchScroll.y=event.clientY;
        (fullscreen.open ? fullscreen : window).scrollBy(0,delta);
        return;
      }
      if (active?.pointerId!==event.pointerId) return;
      const rect=canvas.getBoundingClientRect();
      const batch=event.getCoalescedEvents?.();
      for (const sample of batch?.length ? batch : [event]) {
        const p=point(sample,rect);
        const width=strokeWidth(sample);
        draw(active.tool,active.points.at(-1),p,ctx,inkColor,width);
        active.points.push(p);
        active.widths.push(width);
      }
      extendIfNeeded(event);
    });
    for (const type of ["pointerup","pointercancel","lostpointercapture"]) {
      canvas.addEventListener(type,event=>{
        if (touchScroll?.pointerId===event.pointerId) touchScroll=null;
        finish(event.pointerId);
      });
    }
  }

  function updateFloatingControls() {
    const header=$("session-header").getBoundingClientRect();
    document.documentElement.style.setProperty("--session-header-height", header.height+"px");
    const belowQuestion=$("problem-card").getBoundingClientRect().bottom < header.bottom;
    $("pad-return").hidden = fullscreen.open || $("session-view").hidden || !belowQuestion;
  }
  new ResizeObserver(updateFloatingControls).observe($("session-header"));
  window.addEventListener("scroll",updateFloatingControls,{passive:true});
  window.addEventListener("resize",updateFloatingControls);
  window.addEventListener("hashchange",updateFloatingControls);
  updateFloatingControls();

  expand.addEventListener("click",()=>{
    if (fullscreen.open) {
      exitFullscreen();
      return;
    }
    dock.style.minHeight=panel.offsetHeight+"px";
    fullscreen.append(panel);
    expand.setAttribute("aria-pressed","true");
    expand.setAttribute("aria-label","전체 화면 닫기");
    expand.title="전체 화면 닫기";
    expand.querySelector("use").setAttribute("href","#ico-collapse");
    fullscreen.showModal();
    updateFloatingControls();
    expand.focus({preventScroll:true});
    resize();
  });
  fullscreen.addEventListener("cancel",event=>{
    event.preventDefault();
    exitFullscreen();
  });
  $("pad-return").addEventListener("click",()=>{
    if (fullscreen.open) exitFullscreen(true);
    else {
      window.scrollTo({top:0});
      $("problem-card").focus({preventScroll:true});
    }
  });
  pen.addEventListener("click",()=>{tool="pen";syncTools();});
  eraser.addEventListener("click",()=>{tool="eraser";syncTools();});
  undo.addEventListener("click",()=>{commands.pop();resize();syncTools();storeInk();});
  clear.addEventListener("click",()=>{commands.push({tool:"clear"});resize();syncTools();storeInk();});
  ForgeScratchpad = globalThis.ForgeScratchpad = Object.freeze({start,acceptsPointer,exitFullscreen,renderSaved});
})();


;

/* inspection.js */
(() => {
  "use strict";
  const plans={...ForgeLineCompiler.plans,
    "a-point-distance":{level:"A",label:"두 점 사이의 거리",modes:["direct"],variants:{direct:"distance-composition"}},
    "distance-use":{level:"B",label:"두 점 사이의 거리 활용",
      modes:["generated","inverse","minimum","positive-parameter","negative-parameter"],
      variants:Object.fromEntries(["generated","inverse","minimum","positive-parameter","negative-parameter"].map(mode=>[mode,"distance-composition"]))},
  };
  for(const [id,plan] of Object.entries(plans)) {
    const composition=ForgePlaneCompositions[id];
    if(composition) plans[id]={...plan,modes:[...composition.answerPaths.map(path=>path.id),...plan.modes]};
  }
  const distancePaths=ForgeTopics.types["distance-line-parameter"].variants.find(variant=>variant.id==="distance-conditions").answerPaths;
  plans["distance-line-parameter"]={...plans["distance-line-parameter"],label:"점과 직선 사이의 거리 활용",
    modes:[...distancePaths.map(path=>path.id),...plans["distance-line-parameter"].modes]};
  const modes={...ForgeLineCompiler.modes,...Object.fromEntries(distancePaths.map(path=>[path.id,path.label])),"common-value":"함숫값 차와 부호 조건",direct:"단독 거리 계산",generated:"연산 연결 자동 생성",inverse:"연산 연결 후 좌표 역산",minimum:"거리 합의 최솟값",
    "positive-parameter":"양수 좌표 역산","negative-parameter":"음수 좌표 역산"};
  const inspectionUnits=[...ForgeChallengeCompiler.units,...ForgeLogicCompiler.units,...ForgeFunctionCurriculum.units];
  const diagnosticPlans=Object.entries(plans).filter(([id])=>id==="a-point-distance"||ForgeCatalog.isPlaneType(id));
  let selectable={};
  const generatedStructures=new Map();
  function optionsForLevel(level) {
    return inspectionUnits.flatMap(unit=>ForgeCatalog.pool(unit,level).map(id=>{
      const diagnostic=diagnosticPlans.find(([source,def])=>def.level===level&&ForgeCatalog.canonicalType(source)===id)?.[1];
      return [id+"|"+level,{...diagnostic,id,level,label:ForgeCatalog.TYPES[id].label,modes:diagnostic?.modes??[]}];
    }));
  }
  const {esc,prose,mathBlock,plotBlock,answer,solutionList}=ForgeMathView;
  const $=id=>document.getElementById("inspection-"+id);
  const type=$("type"), path=$("path"), format=$("format"), environment=$("environment"), seed=$("seed");
  const difficulty=$("difficulty");
  const anyB={id:"",level:"B",label:"평면좌표·직선 전체",modes:[]};
  const challengeScopes=inspectionUnits.map(unit=>["challenge-"+unit,{unit,level:"C",label:ForgeCatalog.UNITS[unit]+" 전체",modes:[]}]);
  const option=(value,label)=>new Option(label,value);
  function randomSeed() {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  function seeded(number) {
    let state=number;
    return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  }
  function updateEnvironment() {
    const selected=selectable[type.value], mode=path.value;
    if(ForgeLogicCompiler.units.includes(selected.unit??ForgeCatalog.TYPES[selected.id]?.unit)){
      environment.value="logic";
      environment.disabled=true;
      return;
    }
    if(ForgeFunctionCurriculum.units.includes(selected.unit??ForgeCatalog.TYPES[selected.id]?.unit)){
      environment.value="expression";
      environment.disabled=true;
      return;
    }
    if(selected.level==="C") {
      environment.value="geometry";
      environment.disabled=true;
      return;
    }
    if(environment.disabled)environment.value="";
    if(!selected.id) {
      environment.disabled=false;
      return;
    }
    if(selected.id==="distance-line-parameter"&&selected.level==="B") {
      environment.disabled=mode==="inverse";
      if(environment.disabled)environment.value="";
      return;
    }
    environment.disabled=!selected.variants&&!ForgeTopics.types[selected.id]?.compositeVariant
      ||Boolean(!selected.variants&&mode&&mode!=="generated");
    if(environment.disabled)environment.value="";
  }
  function updatePaths() {
    path.replaceChildren(option("","자동"),...selectable[type.value].modes.map(id=>option(id,modes[id])));
    path.disabled=selectable[type.value].level==="C";
    const level=selectable[type.value].level, previous=difficulty.value;
    const grades=level==="C"?{C1:"하",C2:"중",C3:"상"}
      :level==="B"?ForgeCatalog.difficultyLabels:{};
    difficulty.replaceChildren(option("","자동"),...Object.entries(grades).map(([id,label])=>option(id,label)));
    difficulty.disabled=level==="A";
    if(Object.hasOwn(grades,previous))difficulty.value=previous;
    updateEnvironment();
  }
  function variableTag(v,withValue=false) {
    const role=v.given?"given":v.target?"target":"internal";
    return `<span class="inspection-tag ${role}">${iconMarkup("function")}<code>${esc(v.key)}${withValue?" = "+esc(v.value):""}</code> ${esc(v.label)}</span>`;
  }
  function render(p,comparison) {
    const data=p.inspection??{variables:[],conditions:[]};
    const assessment=p.difficulty??ForgeCatalog.assessDifficulty(p);
    const challenge=p.challengeDifficulty;
    const presentation=p.answer.kind==="choice"?"선택형":"서답형";
    const byKey=Object.fromEntries(data.variables.map(v=>[v.key,v]));
    const known=data.variables.filter(v=>v.given), targets=data.variables.filter(v=>v.target);
    const anchors=data.variables.filter(v=>v.seed);
    const text=value=>prose(value,"tex");
    const groups=[
      ["공개값",known],
      ["구할 값",targets],
    ].map(([label,variables])=>`<div><strong>${label}</strong><div class="inspection-tags">${variables.map(v=>variableTag(v)).join("")}</div></div>`).join("");
    const relations=data.relations??[];
    const connections=relations.map((relation,i)=>{
      const terms=Object.entries(relation.terms).filter(([,c])=>c!==0);
      const eq=terms.map(([key,c],j)=>`${j&&c>0?"+":""}${ForgeTopics.term(c,key)}`).join("")+"="+relation.constant;
      return `<li><div class="inspection-node-title"><span>${i+1}</span><strong>${esc(relation.label)}</strong></div>
        <div>${text(ForgeTopics.m(eq))}</div><div class="inspection-tags">${terms.map(([key])=>variableTag(byKey[key])).join("")}</div></li>`;
    }).join("");
    const links=data.variables.flatMap(variable=>{
      const refs=relations.flatMap((relation,i)=>relation.terms[variable.key]?[i+1]:[]);
      if(refs.length<2)return [];
      const label=refs.map(i=>"관계 "+i).join(" ↔ ");
      return [`<li><span>${esc(label)}</span> ${variableTag(variable)}</li>`];
    }).join("");
    const nodes=Object.fromEntries((data.graph??[]).flat().map(node=>[node.id,node]));
    const hasTrace=Boolean(data.graph?.length||data.relations?.length);
    const graph=data.graph?.map((layer,i)=>`${i?'<div class="inspection-graph-arrow" aria-hidden="true">↓</div>':""}
      <div class="inspection-graph-layer">${layer.map(node=>`<div class="inspection-graph-node">
        <strong>${esc(node.label)}</strong><div>${node.prose?text(node.prose):node.math?text(ForgeTopics.m(node.math)):""}</div>
        ${node.from?.length?`<small>입력 ${node.from.map(id=>(nodes[id].math?text(ForgeTopics.m(nodes[id].math)):text(nodes[id].prose??nodes[id].label))).join(", ")}</small>`:""}
        ${node.explanation?`<p>${text(node.explanation)}</p>`:""}
      </div>`).join("")}</div>`).join("");
    const changes=(p.actionHistory??[]).map(({expression,scale,form})=>
      `<li>${text(ForgeTopics.m(expression))} <span>(${scale!==1?"양변 "+scale+"배"+(form!=="standard"?", ":""):""}${form!=="standard"?"이항":""})</span></li>`).join("");
    const evidence=p.reasoning;
    const structure=p.inspection?.graph?.length?ForgeRelationSearch.signature(p.inspection.graph):null;
    const choices=p.answer.options?.map((value,i)=>`<li${i===p.answer.value?' class="inspection-right"':''}>${text(value)}</li>`).join("");
    $("result").innerHTML=`<div class="inspection-grid">
      <article class="inspection-card">
        <h2>생성된 문제</h2>
        <div class="inspection-tags"><span class="inspection-tag">${iconMarkup("math")}${esc(p.level)} · ${esc(p.template)}</span><span class="inspection-tag">${iconMarkup("info")}${esc(presentation)}</span>${assessment?`<span class="context-chip chip-difficulty" data-difficulty="${assessment.grade}"><svg class="icon" aria-hidden="true"><use href="#ico-difficulty-${assessment.grade}"/></svg>${ForgeCatalog.difficultyLabels[assessment.grade]}</span>`:""}</div>
        <div class="inspection-problem"><p>${prose(p.intro,p.format,true)}</p>${mathBlock(p)}${plotBlock(p)}<p><strong>${prose(p.question,p.format,true)}</strong></p>${choices?`<ol>${choices}</ol>`:""}</div>
        <p class="inspection-answer"><strong>정답</strong> ${answer(p)}</p>
        <details><summary>풀이 보기</summary>${solutionList(p)}</details>
      </article>
      <article class="inspection-card">
        <h2>생성 과정</h2>
        <ol class="inspection-flow">
          <li><h3>답 경로 선택</h3><p>${esc(p.answerPath.label)} · ${esc(presentation)}</p><div class="inspection-roles">${groups}</div></li>
          ${data.concepts?`<li><h3>연결된 개념</h3><div class="inspection-tags">${data.concepts.map(concept=>`<span class="inspection-tag">${iconMarkup("book")}${esc(concept)}</span>`).join("")}</div></li>`:""}
          ${assessment?`<li><h3>수학 개념 연결 난도</h3><p>개념 ${assessment.concepts}종${!evidence&&assessment.depth?` · 가장 긴 연결 ${assessment.depth}단계`:""}</p></li>`:""}
          ${hasTrace?`<li><h3>수학 관계 연결</h3>${graph??`<ol class="inspection-relations">${connections}</ol>${links?`<ul class="inspection-links" aria-label="관계 사이 연결">${links}</ul>`:""}`}</li>`:"<li>기록된 관계 연결이 없습니다.</li>"}
          ${hasTrace?`<li><h3>조건과 수치 구성</h3><ul>${(data.conditions??[]).map(c=>`<li>${esc(c)}</li>`).join("")}</ul>
            <div class="inspection-roles">
              <div><strong>먼저 정한 값</strong><div class="inspection-tags">${anchors.map(v=>variableTag(v,true)).join("")}</div></div>
              <div><strong>문제에 제시한 값</strong><div class="inspection-tags">${known.map(v=>variableTag(v,true)).join("")}</div></div>
            </div>
          </li>`:""}
          ${structure? `<li><h3>관계 구조</h3>
            <p><code>${esc(structure)}</code></p>
            ${comparison?`<p>이 설정에서 비교한 문항 ${comparison.total}개 중 관계 구조 ${comparison.unique}개. ${comparison.repeated?"이전과 같은 구조입니다.":"새로운 구조입니다."}</p>`:""}
            ${evidence?`<p>검토한 후보 ${esc(evidence.models)}개, 모든 공개 조건을 만족하는 후보 ${esc(evidence.survivors)}개</p>
            <ul>${evidence.conditionEffects.map(check=>`<li>${text(check.statement)} 이 조건을 빼면 ${text(check.witness)}도 가능하다. 다시 구한 결과는 ${text(check.values)}이다.</li>`).join("")}</ul>`:""}
          </li>`:""}
          ${data.conditionChecks?.length?`<li><h3>핵심 추론과 조건 검증</h3><p>${esc(data.principle)}</p>
            <ul>${data.conditionChecks.map(check=>`<li>${text(check.statement)} 이 조건을 빼면 ${text(check.witness)}도 가능하며, 답은 ${text(ForgeTopics.m(check.alternative))}이 된다.</li>`).join("")}</ul></li>`:""}
          ${changes?`<li><h3>직선식 표현 변형</h3><ul>${changes}</ul></li>`:""}
          ${(data.verified||data.conditionChecks?.length)?`<li><h3>정답 검산</h3><p class="inspection-right">${evidence?"공개 후보를 다시 계산하고 각 조건을 제거했을 때 답이 달라지는지 확인했습니다.":challenge?"공개 조건에서 구한 후보와 정답을 독립적으로 검산했습니다.":"공개된 값과 관계식으로 답을 다시 확인했습니다."}</p>
            <div class="inspection-tags">${targets.map(v=>variableTag(v,true)).join("")}</div>
          </li>`:""}
        </ol>
      </article>
    </div>`;
  }
  function generate() {
    if(!$("form").reportValidity())return;
    const value=Number(seed.value);
    try {
      const rng=seeded(value), plan=selectable[type.value];
      const mode=path.value||(plan.level==="A"&&plan.variants?plan.modes[0]:undefined);
      const options={rng,variantId:plan.variants?.[mode],mode,format:format.value||undefined,
        environment:environment.value||undefined,difficulty:difficulty.value||undefined};
      const p=plan.level==="C"?ForgeCatalog.generateChallenge(plan.unit,options)
        :plan.id?ForgeCatalog.generate(plan.id,plan.level,options):ForgeCatalog.generatePlanePractice(options);
      let comparison;
      if(p.inspection?.graph?.length){
        const key=ForgeRelationSearch.signature(p.inspection.graph);
        const settings=[type.value,path.value,environment.value,difficulty.value,format.value].join("/");
        const history=generatedStructures.get(settings)??new Map();
        const previous=new Set(history.values());
        comparison={repeated:previous.has(key)};
        history.set(value,key);
        generatedStructures.set(settings,history);
        comparison.total=history.size;
        comparison.unique=new Set(history.values()).size;
      }
      render(p,comparison);
      $("status").textContent=`생성 번호 ${value}${p.inspection?.verified?" · 검산 통과":""}`;
    } catch(error) {
      $("result").replaceChildren();
      $("status").textContent=`생성 번호 ${value} · 생성 실패. ${error.message}`;
    }
  }
  function open() {
    const previous=type.value;
    const entries=[...["A","B"].map(level=>[level,optionsForLevel(level)]),["C",challengeScopes]];
    selectable={...Object.fromEntries(entries.flatMap(([,items])=>items)),anyB};
    type.replaceChildren();
    for(const [level,items] of entries) {
      const group=document.createElement("optgroup");
      group.label={A:"A 기본",B:"B 유형",C:"C 발전"}[level];
      if(level==="B")group.append(option("anyB",anyB.label));
      group.append(...items.map(([key,def])=>option(key,def.label)));
      type.append(group);
    }
    type.value=selectable[previous]?previous:"distance-use|B";
    updatePaths();
    if(!seed.value)seed.value=randomSeed();
    generate();
  }
  type.addEventListener("change",updatePaths);
  path.addEventListener("change",updateEnvironment);
  $("form").addEventListener("submit",event=>{event.preventDefault();generate();});
  $("random").addEventListener("click",()=>{seed.value=randomSeed();generate();});
  ForgeInspection = globalThis.ForgeInspection = {open};
})();


;

/* app.js */
(() => {
  "use strict";

  const { COURSES, UNITS, TYPES, LEVELS, DEFAULT_SETTINGS, courseForUnit, normalizeSelection, typeFor, pool, generate, grade } = globalThis.ForgeCatalog;
  const { STRATEGIES, recommend } = globalThis.ForgeRecommendations;
  const { esc, prose, mathBlock, plotBlock, shareText, solutionList, answer: renderAnswer } = globalThis.ForgeMathView;
  const learning = globalThis.ForgeLearning;
  const curriculum = globalThis.ForgeCurriculum;
  const { play } = globalThis.ForgePreferences;
  const unitIcons = {
    polynomials:"poly", quadratics:"quad", coordinate:"geo", lines:"line", circles:"circle",
    transformations:"move", sets:"set", propositions:"prop", functions:"function", rational:"rational", radical:"radical",
  };
  const $ = id => document.getElementById(id);
  const form = $("answer-form");
  const answerFields = $("answer-fields");
  const setup = $("setup-form");
  const selected = name => setup.querySelector(`input[name="${name}"]:checked`)?.value;
  const lastUnit = {};
  const selectedUnits = {};
  let mixEnabled = false;
  const customSelections = {};
  const prefsKey = "math-forge:preferences:v3";
  const draftKey = "math-forge:draft:v1";
  const recordPrefix = "math-forge:attempt:v1:";
  const errorLabels = {
    calculation: "계산 실수",
    concept: "개념 오류",
    reading: "조건 해석",
    other: "기타",
  };
  let storageAvailable = true;
  const memory = new Map();
  let draft = loadDraft();
  let activeSince = null;
  let historyLimit = 20;
  let reviewLimit = 8;
  let parkedLimit = 8;
  let pendingRemoval = null;
  let previewSelection = null;
  let previewDate = null;

  if (runtime.recordsOnly) {
    recordTools = { exportRecords, importRecords, resetRecords };
    return;
  }

  function parseJSON(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  function loadDraft() {
    const stored = learning.read("draft");
    let previous;
    try { previous = parseJSON(window.studyBridge.session.getItem(draftKey)); } catch { /* The durable draft can still be used. */ }
    const value = stored ?? previous;
    const type = TYPES[typeFor(value?.problem)];
    if (value?.problem?.answer && type && LEVELS[value.problem.level] && Number.isFinite(value.elapsed)) return value;
    return null;
  }

  function captureDraft() {
    return { ...draft, settings:draft.settings ?? draftSettings(), elapsed:elapsedNow(), input:draft.record?.input ?? readInput() };
  }

  function saveDraft() {
    if (!draft) return;
    const value = captureDraft();
    learning.write("draft",value);
    try { window.studyBridge.session.setItem(draftKey,JSON.stringify(value)); }
    catch { /* Older tabs can continue to use their own copy. */ }
  }

  function finishSession(destination) {
    draft = null;
    activeSince = null;
    learning.write("draft",null);
    try { window.studyBridge.session.removeItem(draftKey); } catch { /* The durable draft is already cleared. */ }
    location.replace(destination);
  }

  function parkDraft() {
    if (!draft || draft.record) return;
    if (draft.dailyReview) {
      const key="daily-review:"+draft.dailyReview.date, plan=learning.read(key);
      if(plan) { plan.items=plan.items.map(item=>item.id===draft.id ? {...item,...captureDraft()} : item); learning.write(key,plan); }
      return;
    }
    if (!draft.dailyDay) { learning.park(captureDraft()); return; }
    const key="daily:"+draft.dailyDay;
    const plan=learning.read(key);
    if (!plan) return;
    plan.items=plan.items.map(item=>item.id===draft.id ? {...item,...captureDraft()} : item);
    learning.write(key,plan);
  }

  function isAttempt(record) {
    return record && typeof record.id === "string" && typeof record.correct === "boolean"
      && Number.isFinite(record.elapsed) && Number.isFinite(record.date)
      && typeFor(record.problem) && LEVELS[record.problem?.level]
      && record.problem.answer && Array.isArray(record.problem.expressions) && Array.isArray(record.problem.solution);
  }

  function listAttempts() {
    try {
      const keys = Object.keys(window.studyBridge.local).filter(key => key.startsWith(recordPrefix));
      for (const key of keys) {
        const record = parseJSON(window.studyBridge.local.getItem(key));
        if (isAttempt(record)) memory.set(record.id, record);
      }
    } catch {
      storageAvailable = false;
    }
    return [...memory.values()].sort((a, b) => b.date - a.date);
  }

  function saveAttempt(record) {
    memory.set(record.id, record);
    try {
      window.studyBridge.local.setItem(recordPrefix + record.id, JSON.stringify(record));
    } catch {
      storageAvailable = false;
    }
  }

  function storageNotice() {
    const note = $("storage-note");
    note.hidden = storageAvailable && learning.persistent();
    note.textContent = note.hidden ? "" : "일부 기록을 브라우저에 저장하지 못했습니다. 페이지를 닫기 전에 기록을 내보낼 수 있습니다.";
  }

  function getSettings() {
    const course=$("course-select").value, level=selected("level");
    const units=[...setup.querySelectorAll('input[name="unit"]:checked')].map(input=>input.value);
    const unit=units[0], key=units.join(',')+":"+level;
    return {course,unit,units,level,mix:mixEnabled,strategy:selected("strategy"),
      customTypes:normalizeSelection(units,level,customSelections[key] ?? customSelections[unit+":"+level])};
  }

  function selectRadio(name, value) {
    for (const radio of setup.querySelectorAll(`input[name="${name}"]`)) radio.checked = radio.value === value;
  }

  function selectSettings(settings) {
    const course = settings.course ?? courseForUnit(settings.unit);
    if(typeof settings.mix === "boolean") mixEnabled=settings.mix;
    else if(settings.units?.length>1) mixEnabled=true;
    $("mix-enabled").checked=mixEnabled;
    $("course-select").value = course;
    selectRadio("strategy", settings.strategy);
    selectRadio("level", settings.level);
    selectedUnits[course]=(settings.units?.length?settings.units:[settings.unit]).filter(id=>COURSES[course].units.includes(id));
    if(!mixEnabled) selectedUnits[course]=selectedUnits[course].slice(0,1);
    if(settings.customTypes) customSelections[selectedUnits[course].join(',')+":"+settings.level]=normalizeSelection(selectedUnits[course],settings.level,settings.customTypes);
    renderUnits(course, settings.unit);
    renderCustomTypes();
    renderStart();
  }

  function loadSettings() {
    try {
      const saved = parseJSON(window.studyBridge.local.getItem(prefsKey));
      if (saved) {
        const unit = saved.unit === "absolute" ? "propositions" : saved.unit;
        const course = Object.hasOwn(COURSES,saved.course) ? saved.course : courseForUnit(unit);
        if (course && Object.hasOwn(LEVELS,saved.level) && Object.hasOwn(STRATEGIES,saved.strategy)) {
          for (const [key, group] of Object.entries(COURSES)) {
            if (group.units.includes(saved.units?.[key])) lastUnit[key] = saved.units[key];
          }
          if(saved.selectedUnits && typeof saved.selectedUnits==="object") for(const [key,ids] of Object.entries(saved.selectedUnits)) if(COURSES[key] && Array.isArray(ids)) selectedUnits[key]=ids.filter(id=>COURSES[key].units.includes(id));
          if(saved.customSelections && typeof saved.customSelections==="object") {
            for(const [key,ids] of Object.entries(saved.customSelections)) {
              const [units,level]=key.split(":");
              customSelections[key]=normalizeSelection(units.split(","),level,ids);
            }
          }
          return { ...saved, course, unit:COURSES[course].units.includes(unit) ? unit : lastUnit[course], units:selectedUnits[course], mix:typeof saved.mix==="boolean" ? saved.mix : (selectedUnits[course]?.length>1) };
        }
      }
    } catch { /* Use the current range if preferences are unavailable. */ }
    return draftSettings() || DEFAULT_SETTINGS;
  }

  function saveSettings() {
    const settings = getSettings();
    try { window.studyBridge.local.setItem(prefsKey, JSON.stringify({...settings,units:lastUnit,selectedUnits,customSelections})); } catch { /* Continue with the current selection. */ }
  }

  function draftSettings() {
    if (!draft) return null;
    return {
      unit:TYPES[typeFor(draft.problem)].unit,
      level:draft.problem.level,
      units:draft.settings?.units ?? [TYPES[typeFor(draft.problem)].unit],
      customTypes:draft.settings?.customTypes,
      strategy:draft.settings?.strategy ?? (Object.hasOwn(STRATEGIES,draft.strategy) ? draft.strategy : DEFAULT_SETTINGS.strategy),
    };
  }

  function canResume(settings) {
    const previous=draftSettings();
    return previous && JSON.stringify(previous.units)===JSON.stringify(settings.units) && previous.level===settings.level && previous.strategy===settings.strategy
      && (settings.strategy!=="custom" || JSON.stringify(normalizeSelection(settings.units,settings.level,previous.customTypes).sort())===JSON.stringify([...settings.customTypes].sort()));
  }

  const metaIcon = name => `<svg class="icon" aria-hidden="true"><use href="${iconHref(name, "math")}"/></svg>`;

  function metricRows(entries) {
    return entries.map(([icon,label,value,tone,detail])=>`<div class="metric ${tone ?? ""}">
      <dt>${metaIcon(icon)}<span>${esc(label)}</span></dt>
      <dd><strong>${esc(value)}</strong>${detail ? `<span>${esc(detail)}</span>` : ""}</dd>
    </div>`).join("");
  }

  function renderStart() {
    if (inSession() || inHistory()) return;
    const settings = getSettings();
    const canPractice = settings.strategy==="custom"?settings.customTypes.length>0
      :settings.units.some(unit=>pool(unit,settings.level).length>0);
    $("generate").disabled = !canPractice;
    $("generate").firstChild.nodeValue = "이 범위 연습 ";
    if (settings.strategy === "custom") $("generate").setAttribute("aria-describedby",canPractice?"custom-type-count":"custom-type-help");
    else $("generate").removeAttribute("aria-describedby");

    const attempts = listAttempts();
    const today = learning.day();
    const plan = learning.read("daily:"+today) ?? (canPractice ? ensureDailyPlan(settings) : null);
    const completed = plan ? plan.items.filter(item=>memory.has(item.id)).length : 0;
    const ongoing = draft && (!draft.record || draft.dailyDay || draft.reviewOf);
    const unit = ongoing ? TYPES[typeFor(draft.problem)].unit : null;
    const course = unit ? courseForUnit(unit) : null;
    $("last-range").innerHTML = ongoing ? metricRows([
      ["book","과목",COURSES[course]?.label ?? ""],
      ["logo","단원",UNITS[unit]],
      ["pen","연습 방식",`${draft.problem.level} ${LEVELS[draft.problem.level]}`],
    ]) : "";
    $("last-range").hidden = !ongoing;
    $("home-current-empty").hidden = Boolean(ongoing);
    $("home-start").hidden = !ongoing;
    $("home-start").innerHTML = metaIcon("resume") + "<span>이어 풀기</span>";
    if (previewDate !== today) { previewDate = today; previewSelection = null; }
    const firstUnanswered = plan?.items.findIndex(item => !memory.has(item.id)) ?? -1;
    const previewIndex = previewSelection ?? (firstUnanswered >= 0 ? firstUnanswered : 0);
    const preview = plan?.items[previewIndex];
    $("daily-preview").innerHTML = preview ? (()=>{
      const p=preview.problem, type=TYPES[typeFor(p)];
      const signals=plan.items.map((item,index)=>dailySignal(item,index,previewIndex,attempts,"preview")).join("");
      return `<article class="daily-preview-card"><div class="daily-preview-heading"><div class="daily-signals" aria-label="오늘의 문제 선택">${signals}</div><div class="history-tags"><span class="context-chip chip-level ${'chip-'+p.level.toLowerCase()}">${metaIcon(p.level==='A'?'foundation':p.level==='C'?'challenge':'application')}${esc(p.level)}</span><span class="context-chip chip-unit unit-${esc(type.unit)}">${metaIcon(unitIcons[type.unit] ?? "book")}${esc(UNITS[type.unit])}</span>${(p.plus ?? type.plus)?`<span class="context-chip chip-plus">${metaIcon("plus")}확장</span>`:''}</div></div><div class="daily-preview-problem">${problemText(p)}</div></article>`;
    })() : '<p>학습 범위를 선택하면 오늘의 문제가 준비됩니다.</p>';
    $("quick-practice").hidden = false;
    $("quick-practice").disabled = !plan && !canPractice;
    $("quick-practice").innerHTML = metaIcon(completed===3 ? "repeat" : "calendar") + `<span>${completed===3 ? "오늘의 문제 복습" : `오늘의 문제 ${completed}/3`}</span>`;
    const activity = learning.activity(attempts,typeFor,today);
    $("home-activity").innerHTML = metricRows([
      ["calendar","오늘 푼 문제",`${attempts.filter(record=>learning.day(record.date)===today).length}문제`,"tone-count"],
      ["flame","연속 학습",`${activity.streak}일`,"tone-streak"],
      ["history","누적 점수",`${activity.points}점`,"tone-score"],
    ]);
    renderProgress(settings);
    renderCurriculum(settings.course);
  }

  function renderCurriculum(course) {
    const standards = curriculum.standards[course];
    $("curriculum").innerHTML = standards ? '<dl class="standards-list">' + Object.entries(standards).map(([id,label])=>{
      const counts=["A","B"].map(level=>COURSES[course].units.flatMap(unit=>pool(unit,level)).filter(type=>curriculum.forType(type)===id).length);
      const coverage=counts.some(Boolean) ? `A ${counts[0]}개 · B ${counts[1]}개` : "준비 중";
      return `<dt>${esc(id)} · ${esc(label)}</dt><dd>${coverage}</dd>`;
    }).join("") + '</dl>' : '<p>이 과목은 준비 중입니다.</p>';
  }

  function renderProgress({unit,level}) {
    const settings=getSettings();
    const ids = new Set(settings.strategy==="custom"?settings.customTypes:settings.units.flatMap(id=>pool(id,level)));
    const solved = new Set();
    const seen = new Set();
    for (const record of listAttempts()) {
      const type = typeFor(record.problem);
      if (record.problem.level !== level || !ids.has(type)) continue;
      seen.add(type);
      if (record.correct) solved.add(type);
    }
    $("unit-progress").hidden = !seen.size;
    if (!seen.size) return;
    $("unit-progress-label").textContent = `${level==="A"?"기본 항목":"유형"} ${ids.size}개 중 ${seen.size}개를 풀고 ${solved.size}개를 맞혔습니다.`;
    $("unit-progress-meter").max = ids.size;
    $("unit-progress-meter").value = solved.size;
  }

  function readInput() {
    switch (draft.problem.answer.kind) {
      case "graph": return [...answerFields.querySelectorAll(".answer-editor")].map(input=>input.textContent.trim());
      case "point": return [ $("answer-x").textContent.trim(), $("answer-y").textContent.trim() ];
      case "choice": return form.querySelector('input[name="choice"]:checked')?.value ?? "";
      default: return $("answer-input").textContent.trim();
    }
  }

  function renderFields(answer, input, labels) {
    const attributes = 'class="answer-editor" role="textbox" contenteditable="plaintext-only" aria-multiline="false" autocorrect="off" autocapitalize="off" spellcheck="false" aria-describedby="answer-help answer-error"';
    $("answer-help").hidden = !["set","point-set","interval"].includes(answer.kind);
    if (answer.kind === "choice") {
      answerFields.innerHTML = '<fieldset class="choice-list"><legend>답안 선택</legend>' + answer.options
        .map((option,index) => `<label class="choice-option"><input type="radio" name="choice" value="${index}" aria-describedby="answer-error"${input === String(index) ? " checked" : ""}><span class="choice-number">${index+1}<span class="sr-only">번</span></span><span class="choice-text">${prose(option,"tex",true)}</span></label>`)
        .join("") + '</fieldset>';

    } else if (answer.kind === "graph") {
      answerFields.innerHTML='<div class="graph-fields">'+answer.labels.map((label,i)=>
        `<div><label id="graph-label-${i}" for="graph-${i}">${esc(label)}</label><div id="graph-${i}" ${attributes} aria-labelledby="graph-label-${i}" inputmode="text"></div></div>`).join("")+'</div>';
      answerFields.querySelectorAll(".answer-editor").forEach((field,i)=>{field.textContent=input?.[i] ?? "";});
      answerFields.insertAdjacentHTML("beforeend",'<details class="graph-preview"><summary>내 그래프 미리 보기</summary><div id="graph-preview"></div></details>');
      answerFields.querySelector(".graph-preview").addEventListener("toggle",updateGraphPreview);
    } else if (answer.kind === "point") {
      answerFields.innerHTML = '<div class="coordinate-fields">' + ["x","y"]
        .map((axis,i) => {
          const variable = labels?.[i] ?? axis;
          const label = variable === axis ? axis + "좌표" : prose("$" + variable + "$","tex") + " 값";
          return `<div><label id="answer-label-${axis}" for="answer-${axis}">${label}</label><div id="answer-${axis}" ${attributes} aria-labelledby="answer-label-${axis}" data-placeholder="예  −3"></div></div>`;
        })
        .join("") + '</div>';
      $("answer-x").textContent = input?.[0] ?? "";
      $("answer-y").textContent = input?.[1] ?? "";

    } else {
      const interval = answer.kind === "interval";
      const set = answer.kind === "set";
      const pointSet = answer.kind === "point-set";
      const placeholder = answer.kind === "equation" ? "예  (x-1)^2+y^2=9" : answer.kind === "truth" ? "참 또는 거짓" : interval ? "예  x <= -2 또는 x >= 3" : pointSet ? "예  (1, 2), (−3, 4)" : set ? "예  {−2, 0, 2}" : "예  7 또는 −3";
      answerFields.innerHTML = `<label id="answer-input-label" for="answer-input">답안 입력</label><div id="answer-input" ${attributes} aria-labelledby="answer-input-label" data-placeholder="${placeholder}"></div>`;
      $("answer-input").textContent = input ?? "";
      $("answer-help").textContent = interval ? "예: -2 < x <= 3, x != 2, x <= -2 또는 x >= 3"
        : pointSet ? "각 점을 (x, y)로 쓰고 쉼표로 구분하세요. 점의 순서는 자유입니다."
        : set ? "원소는 쉼표로 구분하세요." : "";
    }
  }

  function updateGraphPreview() {
    const preview=$("graph-preview");
    if (!preview?.parentElement.open) return;
    const values=readInput().map(input=>{
      const parts=input.normalize("NFKC").replaceAll("−","-").split("/");
      if (parts.length>2 || !parts.every(value=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value.trim()))) return NaN;
      return Number(parts[0])/Number(parts[1] ?? 1);
    });
    const [h,k,a]=values;
    const {kind}=draft.problem.answer.plot;
    if (!values.every(Number.isFinite)) preview.innerHTML="<p>세 값을 입력하면 그래프가 표시됩니다.</p>";
    else if (a===0 || (kind==="circle" && a<0)) preview.innerHTML="<p>입력한 값으로 이 그래프를 그릴 수 없습니다.</p>";
    else if (Math.max(Math.abs(h),Math.abs(k),Math.abs(a))>15) preview.innerHTML="<p>절댓값이 15 이하인 값까지 미리 볼 수 있습니다.</p>";
    else preview.innerHTML=plotBlock({plot:{kind,h,k,a}});
  }

  function submittedAnswer(record) {
    const answer = record.problem.answer;
    if (answer.kind === "choice") return prose(answer.options[Number(record.input)],"tex");
    if (["point","graph"].includes(answer.kind)) return '(' + record.input.map(esc).join(", ") + ')';
    return esc(record.input);
  }

  function inHistory() {
    return location.hash === "#history";
  }

  function inSession() {
    return location.hash === "#session";
  }

  function elapsedNow() {
    return draft.elapsed + (activeSince === null ? 0 : Math.max(0, performance.now() - activeSince));
  }

  function syncTimer() {
    if (!draft) return;
    const running = !draft.record && inSession() && !document.hidden;
    if (!running && activeSince !== null) {
      draft.elapsed = elapsedNow();
      activeSince = null;
    }
    if (running && activeSince === null) activeSince = performance.now();
  }

  function readableTime(ms) {
    const seconds = Math.round(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes ? `${minutes}분 ${seconds % 60}초` : `${seconds}초`;
  }

  function currentStreak() {
    let count=0;
    for (const attempt of listAttempts()) { if (!attempt.correct) break; count++; }
    return count;
  }

  function nextProblem(settings = draftSettings() || getSettings(), starting = false) {
    const previous = draft?.problem;
    const previousType = typeFor(previous);
    const exposures = { ...draft?.exposures };
    const cycles = { ...draft?.cycles };
    const {type} = recommend({settings,attempts:listAttempts(),exposures,previous:previousType});
    const cycle = cycles[type] || (type===previousType ? [previous.answerPath.id] : []);
    const problem = generate(type,settings.level,{avoidPaths:cycle});
    const path = problem.answerPath.id;
    cycles[type] = [...cycle,path].slice(-128);
    exposures[type] = (exposures[type]||0) + 1;
    const id = learning.uid();
    const sessionNumber=starting ? 1 : (draft?.sessionNumber ?? 1)+1;
    const streak = currentStreak();
    draft = {problem,id,settings,exposures,cycles,sessionNumber,streak,elapsed:0,input:null,record:null};
    activeSince = null;
    renderProblem();
    syncTimer();
    saveDraft();
    if (inSession()) focusQuestion();
  }

  function focusQuestion() {
    window.scrollTo({top:0});
    $("problem-card").focus({preventScroll:true});
  }

  function begin(settings, forceNew=false) {
    if (forceNew || !canResume(settings)) {
      parkDraft();
      nextProblem(settings,true);
    }
    if (!inSession()) location.replace("#session");
  }

  function updateProblemCount() {
    const element=$("problem-index");
    const isDaily=Boolean(draft?.dailyDay || draft?.dailyReview);
    element.hidden=isDaily;
    if(isDaily) { element.replaceChildren(); return; }
    const today=learning.day();
    const count=listAttempts().filter(record=>learning.day(record.date)===today).length;
    element.innerHTML=metaIcon("calendar")+esc(`${count}문제`);
    element.setAttribute("aria-label",`오늘 푼 문제 ${count}개`);
  }

  const narrowPortrait=matchMedia("(max-width: 620px) and (orientation: portrait)");
  function placeSessionInfo() {
    const info=$("session-context-info");
    const parent=narrowPortrait.matches ? $("session-status-dock") : $("session-heading").parentElement;
    if(info.parentElement!==parent) parent.append(info);
  }
  narrowPortrait.addEventListener("change",placeSessionInfo);
  placeSessionInfo();

  function renderProblem() {
    const p = draft.problem;
    const type = TYPES[typeFor(p)];
    $("session-heading").textContent=type.label;
    $("session-heading").title=type.label;
    $("session-heading").classList.toggle("sr-only", Boolean(draft.dailyDay || draft.dailyReview));
    $("problem-meta").innerHTML = `<span class="context-chip chip-level ${'chip-'+p.level.toLowerCase()}">${metaIcon(p.level==='A'?'foundation':p.level==='C'?'challenge':'application')}${esc(p.level)}</span><span class="context-chip chip-unit unit-${esc(type.unit)}">${metaIcon(unitIcons[type.unit] ?? "book")}${esc(UNITS[type.unit])}</span>${p.plus?`<span class="context-chip chip-plus">${metaIcon("plus")}확장</span>`:''}`;
    const difficulty=ForgeCatalog.assessDifficulty(p);
    if(difficulty) {
      const tag=document.createElement("span");
      tag.className="context-chip chip-difficulty";
      tag.dataset.difficulty=difficulty.grade;
      const label=ForgeCatalog.difficultyLabels[difficulty.grade];
      tag.title=`수학 개념 연결 난도 ${label}`;
      tag.setAttribute("aria-label",tag.title);
      tag.innerHTML=metaIcon("difficulty-"+difficulty.grade)+esc(label);
      $("problem-meta").append(tag);
    }
    updateProblemCount();
    renderDailyNavigation();
    $("problem-body").innerHTML = problemText(p);
    renderFields(p.answer, draft.record?.input ?? draft.input,p.answerLabels);
    clearInputError();
    $("share-status").hidden = true;
    renderFeedback(false);
    globalThis.ForgeScratchpad.start(draft.id);
  }

  function problemText(problem) {
    const {intro,question,format} = problem;
    return (intro ? '<p class="prompt">' + prose(intro,format,true) + '</p>' : '') + mathBlock(problem) + plotBlock(problem) + '<p class="prompt question">' + prose(question,format,true) + '</p>';
  }

  function clearInputError() {
    for (const input of answerFields.querySelectorAll('[aria-invalid]')) input.removeAttribute("aria-invalid");
    $("answer-error").hidden = true;
  }

  const errorIcons = {calculation:"pen", concept:"book", reading:"search", other:"settings"};
  function errorButtons(record) {
    return `<fieldset class="error-reasons"><legend>오답 원인</legend><div class="error-reason-options">${Object.entries(errorLabels).map(([id,label]) => `<button type="button" class="button secondary error-reason" data-error-reason="${id}" data-error-record="${esc(record.id)}" aria-pressed="${record.error===id}">${metaIcon(errorIcons[id])}<span>${label}</span></button>`).join("")}</div></fieldset>`;
  }
  function changeErrorReason(button) {
    const record = memory.get(button.dataset.errorRecord);
    if (!record || record.correct || !errorLabels[button.dataset.errorReason]) return;
    record.error = record.error === button.dataset.errorReason ? "" : button.dataset.errorReason;
    saveAttempt(record);
    if (draft?.record?.id === record.id) { draft.record = record; saveDraft(); }
    for (const option of button.closest(".error-reason-options").querySelectorAll("[data-error-reason]")) {
      option.setAttribute("aria-pressed", String(option.dataset.errorReason === record.error));
    }
  }

  function renderFeedback(moveFocus) {
    const streak = draft.streak ?? 0;
    updateProblemCount();
    $("streak-badge").classList.toggle("is-active",streak>0);
    $("streak-badge").setAttribute("aria-label", `연속 정답 ${streak}회`);
    const streakLabel = `${streak}콤보`;
    if ($("streak-count").textContent !== streakLabel) $("streak-count").textContent = streakLabel;
    const feedback = $("feedback");
    const record = draft.record;
    form.hidden = Boolean(record);
    $("skip-problem").hidden = Boolean(record || draft.dailyDay || draft.dailyReview);
    $("discard-problem").hidden = Boolean(record || draft.dailyDay || draft.dailyReview);
    $("check-answer").hidden = Boolean(record);
    $("next-problem").hidden = !record;
    renderDailyNavigation();
    $("next-problem").querySelector("span").textContent = draft.dailyReview ? (draft.dailyReview.index===2 ? "복습 완료" : "다음 문제") : draft.reviewOf && !draft.dailyDay ? "복습 목록"
      : draft.dailyDay && dailyRemaining(draft.dailyDay).length===0 ? "오늘의 학습 완료" : "다음 문제";
    $("share-problem").setAttribute("aria-label",record ? "문제와 풀이 공유" : "문제 공유");
    $("share-problem").title = record ? "문제와 풀이 공유" : "문제 공유";
    feedback.hidden = !record;
    if (!record) {
      feedback.replaceChildren();
      return;
    }
    const answer = renderAnswer(record.problem);
    feedback.innerHTML = `
      <p id="verdict" class="verdict ${record.correct ? '' : 'is-wrong'}" tabindex="-1">${metaIcon(record.correct ? 'check' : 'close')} ${record.correct ? '정답입니다' : '오답입니다'}</p>
      <dl class="answer-comparison"><div><dt>제출한 답</dt><dd>${submittedAnswer(record)}</dd></div><div><dt>정답</dt><dd>${answer}</dd></div></dl>
      <details${record.correct ? '' : ' open'}><summary>풀이 보기</summary>${solutionList(record.problem)}${plotBlock({plot:record.problem.answer.plot})}</details>
      ${record.correct ? '' : errorButtons(record)}
      <p class="review-type">${esc(TYPES[typeFor(record.problem)].label)}</p>`;
    if (moveFocus) {
      const verdict=$("verdict");
      verdict.focus({preventScroll:true});
      verdict.scrollIntoView({block:"nearest"});
    }
  }

  function summarize(attempts) {
    const total = attempts.length;
    const correct = attempts.filter(record => record.correct).length;
    const average = total ? attempts.reduce((sum, record) => sum + record.elapsed, 0) / total : null;
    return { total, correct, wrong: total - correct, accuracy: total ? Math.round(100 * correct / total) : null, average };
  }

  const dayFormat = new Intl.DateTimeFormat("ko-KR", {timeZone:"Asia/Seoul",year:"numeric",month:"long",day:"numeric"});
  const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

  function cardActions(problem, id, section) {
    const available=pool(TYPES[typeFor(problem)].unit,problem.level).includes(typeFor(problem));
    const retry=section==='parked'?'data-resume':'data-retry';
    const variant=section==='parked'?'data-parked-variant':'data-variant';
    const label={review:'복습',parked:'이어 풀기',attempt:'다시 풀기'}[section];
    const tone={review:'action-save',parked:'action-start',attempt:'action-skip'}[section];
    const removal={review:'복습 무시',parked:'보관 취소',attempt:'학습 기록 삭제'}[section];
    return `<div class="review-actions card-actions">
      <button type="button" class="button secondary ${tone}" ${retry}="${esc(id)}">${metaIcon(section==='parked'?'resume':'repeat')}<span>${label}</span></button>
      ${available?`<button type="button" class="button secondary action-share" ${variant}="${esc(id)}">${metaIcon('new')}<span>비슷한 유형</span></button>`:''}
      <button type="button" class="button secondary card-remove" data-remove-kind="${section}" data-remove-id="${esc(id)}" ${section === "attempt" && memory.get(id)?.dailyDay ? 'aria-disabled="true"' : ""} title="${removal}" aria-label="${removal}">${metaIcon('trash')}</button>
    </div>`;
  }

  function historyTags(problem, timestamp, dateLabel, daily = false) {
    const type=TYPES[typeFor(problem)];
    const difficulty=ForgeCatalog.assessDifficulty(problem);
    const difficultyTag=difficulty?'<span class="context-chip chip-difficulty" data-difficulty="'+difficulty.grade+'">'+metaIcon("difficulty-"+difficulty.grade)+esc(ForgeCatalog.difficultyLabels[difficulty.grade])+'</span>':"";
    return `<span class="history-tags"><span class="context-chip chip-level ${'chip-'+problem.level.toLowerCase()}">${metaIcon(problem.level==='A'?'foundation':problem.level==='C'?'challenge':'application')}${esc(problem.level)}</span><span class="context-chip chip-unit unit-${esc(type.unit)}">${metaIcon(unitIcons[type.unit] ?? "book")}${esc(UNITS[type.unit])}</span>${difficultyTag}${(problem.plus ?? type.plus)?`<span class="context-chip chip-plus">${metaIcon("plus")}확장</span>`:''}${daily?`<span class="context-chip chip-daily">${metaIcon("calendar")}오늘의 문제</span>`:''}${Number.isFinite(timestamp)?`<time class="context-chip chip-date" datetime="${new Date(timestamp).toISOString()}" aria-label="${esc(dateLabel)} ${esc(dateFormat.format(timestamp))}">${metaIcon("calendar")}${esc(dateFormat.format(timestamp))}</time>`:''}</span>`;

  }
  function historyCardSummary(problem, status, icon, timestamp, dateLabel, daily = false) {
    const type=TYPES[typeFor(problem)];
    const statusClass = {check:"correct", close:"wrong", archive:"archived", repeat:"review"}[icon];
    return `<span class="attempt-expand" aria-hidden="true">${metaIcon("chevron-right")}</span><span class="attempt-summary"><strong>${esc(type.label)}</strong><span class="mark ${statusClass}">${metaIcon(icon)}${esc(status)}</span>${historyTags(problem,timestamp,dateLabel,daily)}</span>`;
  }
  function savedProblemCard(problem, status, icon, actions, timestamp, dateLabel) {
    return `<details class="attempt-row saved-problem"><summary>${historyCardSummary(problem,status,icon,timestamp,dateLabel)}</summary>
      <div class="attempt-review">${problemText(problem)}<div class="saved-actions">${actions}</div></div></details>`;
  }

  function renderHistory() {
    const all = listAttempts();
    storageNotice();
    if (!inHistory()) return;
    const reviewQueue = learning.reviews(all);
    const pending = reviewQueue.filter(entry=>entry.due);
    const ready = pending.filter(entry=>entry.ready);
    $("review-heading").textContent="복습할 문제";
    $("review-list").innerHTML = ready.length
      ? ready.slice(0,reviewLimit).map(entry=>savedProblemCard(entry.record.problem,`${entry.stage+1}차 복습`,"repeat",cardActions(entry.record.problem,entry.record.id,"review"),entry.record.date,"푼 날짜")).join("")
      : pending.length ? `<p>다음 복습 예정 ${esc(pending[0].due)}</p>` : "<p>표시할 문제가 없습니다.</p>";
    $("review-more").hidden=ready.length<=reviewLimit;
    const parked=learning.read("parked",[]).filter(item=>!memory.has(item.id));
    $("parked-heading").textContent="보관한 문제";
    $("parked-list").innerHTML=parked.length ? parked.slice(0,parkedLimit).map(item=>savedProblemCard(item.problem,"보관","archive",
      cardActions(item.problem,item.id,"parked"),item.savedAt,"보관 날짜")).join("") : "<p>표시할 문제가 없습니다.</p>";
    $("parked-more").hidden=parked.length<=parkedLimit;
    const unit=$("history-unit").value;
    const filter=$("history-filter").value;
    const scoped = all.filter(record=>!unit || TYPES[typeFor(record.problem)].unit===unit);
    const filtered=scoped.filter(record=>filter==="all" || (filter==="wrong" && !record.correct)
      || (filter==="first" && !record.reviewOf) || (filter==="review" && record.reviewOf));
    const first=summarize(scoped.filter(record=>!record.reviewOf));
    const review=summarize(scoped.filter(record=>record.reviewOf));
    const accuracy = stats => stats.total ? `${stats.accuracy}%` : "기록 없음";
    const ratio = stats => stats.total ? `${stats.total}문제 중 ${stats.correct}개 정답` : "";
    $("history-summary").innerHTML = metricRows([
      ["book","일반 풀이 정답률",accuracy(first),"tone-progress",ratio(first)],
      ["repeat","복습 정답률",accuracy(review),"tone-score",ratio(review)],
      ["check","간격 복습 완료",`${reviewQueue.filter(entry=>entry.due===null && (!unit || TYPES[typeFor(entry.record.problem)].unit===unit)).length}문제`,"tone-progress"],
    ]);
    const groups = new Map();
    for (const record of all) {
      const id=typeFor(record.problem)+":"+record.problem.level;
      if (!groups.has(id)) groups.set(id,[]);
      groups.get(id).push(record);
    }
    const typeQuery = $("type-search").value.trim().toLocaleLowerCase();
    const typeUnit = $("type-unit").value;
    const matches = [...groups].filter(([key]) => {
      const [type] = key.split(":");
      return (!typeUnit || TYPES[type].unit === typeUnit) && (!typeQuery || (TYPES[type].label+" "+(TYPES[type].searchLabel ?? "")).toLocaleLowerCase().includes(typeQuery));
    });
    const searching = Boolean(typeQuery || typeUnit);
    const openedTypes = new Set([...$("type-stats").querySelectorAll("details[open]")].map(node => node.dataset.stat));
    $("type-search-status").textContent = !groups.size ? "아직 채점 기록이 없습니다." : !searching ? "유형 이름을 검색하거나 단원을 선택하세요." : matches.length ? `${matches.length}개의 유형 기록` : "일치하는 유형 기록이 없습니다.";
    $("type-stats").innerHTML = (searching ? matches : []).map(([key,records])=>{
      const [type,level]=key.split(":");
      const label=esc(TYPES[type].label);
      const initial=summarize(records.filter(record=>!record.reviewOf));
      const retries=summarize(records.filter(record=>record.reviewOf));
      const errors=Object.entries(errorLabels).map(([id,name])=>{
        const count=records.filter(record=>!record.correct && record.error===id).length;
        return count ? `${name} ${count}건` : null;
      }).filter(Boolean);
      const available=pool(TYPES[type].unit,level).includes(type);
      return `<details class="stat-row" data-stat="${esc(key)}"${openedTypes.has(key)?" open":""}><summary class="stat-title"><strong>${label}</strong><span class="meta-tag">${metaIcon(unitIcons[TYPES[type].unit] ?? "book")}${esc(UNITS[TYPES[type].unit])} · ${level}</span></summary><div class="stat-detail">
        <dl class="range-list stat-metrics">${metricRows([["book","일반 정답률",accuracy(initial),"tone-progress",ratio(initial)],["repeat","복습 정답률",accuracy(retries),"tone-score",ratio(retries)]])}</dl>
        ${initial.total ? `<p>일반 풀이 평균 ${readableTime(initial.average)}</p>` : ""}
        ${errors.length ? `<ul class="error-counts" aria-label="오답 원인">${errors.map(error=>`<li>${esc(error)}</li>`).join("")}</ul>` : ""}
        ${available ? `<button type="button" class="inline-action" data-drill="${type}" data-mode="${level}">이 유형 연습</button>` : ""}</div></details>`;
    }).join("");
    const opened=new Set([...$("recent-attempts").querySelectorAll("details[open]")].map(node=>node.dataset.attempt));
    const visible = filtered.slice(0,historyLimit);
    let previousDay = "";
    $("recent-attempts").innerHTML = visible.map(record=>{
      const day = learning.day(record.date);
      const dayHeader = day!==previousDay ? `<h3 class="attempt-date">${dayFormat.format(record.date)}</h3>` : "";
      previousDay=day;
      const p=record.problem;
      const id=esc(record.id);
      return `${dayHeader}<details class="attempt-row" data-attempt="${id}"${opened.has(record.id)?" open":""}><summary>
        ${historyCardSummary(p,record.correct?"정답":"오답",record.correct?"check":"close",record.date,"푼 날짜",Boolean(record.dailyDay))}
        </summary>
        <div class="attempt-review">${!record.correct ? errorButtons(record) : ''}
        ${problemText(p)}
        <dl class="answer-comparison"><div><dt>제출한 답</dt><dd>${submittedAnswer(record)}</dd></div><div><dt>정답</dt><dd>${renderAnswer(p)}</dd></div></dl>
        <details><summary>해설 보기</summary>${solutionList(p)}${plotBlock({plot:p.answer.plot})}</details>
        <details class="saved-ink" data-ink="${id}"><summary>내 필기 보기</summary><canvas role="img" aria-label="이 문제에 남긴 필기" hidden></canvas><p hidden>저장된 필기가 없습니다.</p></details>
        ${cardActions(p,record.id,"attempt")}</div></details>`;
    }).join("") || '<p class="empty">선택한 범위에 풀이 기록이 없습니다.</p>';
    $("history-more").hidden=filtered.length<=historyLimit;

  }

  function openProblem(value) {
    listAttempts();
    draft = {exposures:{},cycles:{},sessionNumber:1,elapsed:0,input:null,record:null,...value,streak:currentStreak()};
    if (memory.has(draft.id)) draft.record=memory.get(draft.id);
    activeSince=null;
    renderProblem();
    syncTimer();
    saveDraft();
    if (inSession()) focusQuestion();
    else location.replace("#session");
  }

  function openReview(record,variant) {
    if (!record) return;
    parkDraft();
    const type=typeFor(record.problem);
    const {level}=record.problem;
    const unit=TYPES[type].unit;
    const settings={unit,level,strategy:"custom",customTypes:[type]};
    let problem=record.problem;
    if (variant) {
      const original=problemText(problem);
      for (let i=0;i<8;i++) {
        problem=generate(type,level,{avoidPaths:[record.problem.answerPath.id]});
        if (problemText(problem)!==original) break;
      }
    }
    openProblem({problem,id:learning.uid(),settings,reviewOf:record.reviewOf ?? record.id});
  }

  function dailySignal(item, index, current, attempts, scope) {
    const state=learning.dailyStatus(item,attempts);
    const labels={unanswered:"풀지 않음",correct:"정답",wrong:"오답",reviewed:"오답을 다시 풀어 맞힘"};
    const selected=index===current;
    return `<button type="button" class="daily-signal-button" data-daily-${scope}="${index}" aria-label="${index+1}번 문제 ${labels[state]}" aria-pressed="${selected}"><span class="daily-signal signal-${state}${selected?' is-current':''}" aria-hidden="true"></span></button>`;
  }

  function renderDailyNavigation() {
    const bar=$("daily-navigation");
    const date=draft?.dailyDay ?? draft?.dailyReview?.date;
    bar.hidden=!date;
    if(bar.hidden) return;
    const items=learning.read("daily:"+date)?.items ?? [];
    if(draft.dailyReview && items.length && !learning.read("daily-review:"+date)) {
      const current=draft.dailyReview.index;
      const migrated=items.map((item,index)=>index===current ? {...draft} : ({problem:item.problem,id:learning.uid(),settings:item.settings,reviewOf:item.id,dailyReview:{date,index}}));
      learning.write("daily-review:"+date,{items:migrated});
    }
    const current=draft.dailyReview ? draft.dailyReview.index : items.findIndex(item=>item.id===draft.id);
    const attempts=listAttempts();
    $("daily-signals").innerHTML=items.map((item,index)=>dailySignal(item,index,current,attempts,"session")).join("");
  }
  $("daily-preview").addEventListener("click", event => {
    const button=event.target.closest("[data-daily-preview]");
    if (!button) return;
    previewSelection=Number(button.dataset.dailyPreview);
    renderStart();
    $("daily-preview").querySelector(`[data-daily-preview="${previewSelection}"]`)?.focus();
  });
  $("daily-signals").addEventListener("click", event => {
    const button=event.target.closest("[data-daily-session]");
    if (!button || !draft) return;
    const index=Number(button.dataset.dailySession);
    const review=draft.dailyReview;
    const date=draft.dailyDay ?? review?.date;
    const plan=learning.read((review ? "daily-review:" : "daily:")+date);
    const target=plan?.items[index];
    if (!target || target.id===draft.id) return;
    parkDraft();
    openProblem(target);
  });

  function dailyRemaining(date) {
    return (learning.read("daily:"+date)?.items ?? []).filter(item=>!memory.has(item.id));
  }

  function ensureDailyPlan(settings) {
    const dailyDay=learning.day();
    const attempts=listAttempts();
    const previous=learning.read("daily:"+dailyDay);
    if (previous) return previous;
    {
      const available=settings.strategy==="custom" ? settings.customTypes : (settings.units ?? [settings.unit]).flatMap(unit=>pool(unit,settings.level));
      if(!available.length)return;
      const allowed=new Set(available);
      const seen=new Set(attempts.filter(record=>record.problem.level===settings.level).map(record=>typeFor(record.problem)));
      const targets=learning.reviews(attempts,dailyDay).filter(entry=>entry.ready
        && entry.record.problem.level===settings.level && allowed.has(typeFor(entry.record.problem))).slice(0,2);
      const items=targets.map(({record})=>({problem:record.problem,reviewOf:record.id}));
      const chosen=new Set(items.map(item=>typeFor(item.problem)));
      const paths=new Map();
      while (items.length<3) {
        const newTypes=available.filter(type=>!seen.has(type) && !chosen.has(type));
        const unpicked=available.filter(type=>!chosen.has(type));
        const candidates=newTypes.length ? newTypes : unpicked.length ? unpicked : available;
        const type=candidates[Math.floor(Math.random()*candidates.length)];
        const problem=generate(type,settings.level,{avoidPaths:paths.get(type) ?? []});
        paths.set(type,[...(paths.get(type) ?? []),problem.answerPath.id]);
        items.push({problem});
        chosen.add(type);
      }
      learning.write("daily-days",[...new Set([...learning.read("daily-days",[]),dailyDay])]);
      const plan={items:items.map((item,index)=>({...item,id:learning.uid(),settings,dailyDay,sessionNumber:index+1}))};
      learning.write("daily:"+dailyDay,plan);
      return plan;
    }
  }

  function openDaily(settings) {
    const dailyDay=learning.day();
    const previous=ensureDailyPlan(settings);
    if (!previous) return;
    const remaining=dailyRemaining(dailyDay);
    const next=remaining[0];
    if (next) { if(next.deferred) { const plan=learning.read("daily:"+dailyDay); plan.items=plan.items.map(item=>({...item,deferred:false})); learning.write("daily:"+dailyDay,plan); } openProblem(next); }
    else {
      parkDraft();
      const key="daily-review:"+dailyDay;
      let review=learning.read(key);
      if(!review) {
        review={items:previous.items.map((item,index)=>({problem:item.problem,id:learning.uid(),settings:item.settings,reviewOf:item.id,dailyReview:{date:dailyDay,index}}))};
        learning.write(key,review);
      }
      const item=review.items.find(item=>!memory.has(item.id)) ?? review.items[0];
      openProblem(item);
    }
  }

  function updateRoute(moveFocus = true) {
    if (inSession()) listAttempts();
    const history = inHistory();
    const inspection = location.hash === "#inspection";
    const session = inSession();
    if (session && draft && memory.has(draft.id) && !draft.record) { draft.record=memory.get(draft.id); renderProblem(); }
    if (session && !draft) nextProblem(getSettings().unit ? getSettings() : DEFAULT_SETTINGS,true);
    $("app-header").hidden = session;
    $("practice-view").hidden = history || inspection || session;
    $("inspection-view").hidden = !inspection;
    if (inspection) globalThis.ForgeInspection.open();
    $("session-view").hidden = !session;
    $("history-view").hidden = !history;
    const tab=inspection?"inspection":history?"history":"practice";
    runtime.updateView(tab, session);
    for (const name of ["practice","history","inspection"]) {
      const link=$(name+"-nav");
      if(name===tab) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    }
    syncTimer();
    saveDraft();
    renderHistory();
    renderStart();
    if (session) focusQuestion();
    else {
      globalThis.ForgeScratchpad.exitFullscreen();
      window.scrollTo({top:0});
      if (moveFocus) $(inspection ? "inspection-heading" : history ? "history-heading" : "setup-heading").focus({preventScroll:true});
    }
  }

  $("course-select").innerHTML = Object.entries(COURSES).map(([id,{label,units}]) =>
    `<option value="${id}">${esc(label)}${units.length ? "" : " · 준비 중"}</option>`).join("");
  const strategyIcons = { new:"new", balanced:"balance", wrong:"repeat", custom:"settings" };
  $("strategy-options").innerHTML = Object.entries(STRATEGIES).map(([id,label]) => `
    <label class="select-card strategy-card strategy-${id}"><input type="radio" name="strategy" value="${id}">
      <span><svg class="icon" aria-hidden="true"><use href="${iconHref(strategyIcons[id], "math")}"/></svg><strong>${esc(label)}</strong></span>
    </label>`).join("");

  function updateUnitCounts() {
    const level = selected("level");
    for (const count of setup.querySelectorAll("[data-type-count]")) {
      const total=pool(count.dataset.typeCount,level).length;
      count.textContent = level==="C"?(total?"C 발전":"C 준비 중"):`${level==="A"?"A 기본":"B 유형"} ${total}개`;
    }
  }

  function renderUnits(course, unit = lastUnit[course]) {
    const {label,units} = COURSES[course];
    $("unit-options").innerHTML = units.map(id => `
      <label class="select-card unit-card unit-${id}">
        <input type="checkbox" name="unit" value="${id}">
        <span><svg class="icon" aria-hidden="true"><use href="${iconHref(unitIcons[id], "math")}"/></svg>
          <span class="unit-copy"><strong>${esc(UNITS[id])}</strong><span data-type-count="${id}"></span></span>
        </span>
      </label>`).join("");
    if (units.length) lastUnit[course] = units.includes(unit) ? unit : units[0];
    const unitsToSelect=selectedUnits[course]?.length ? selectedUnits[course] : [lastUnit[course]];
    for(const input of setup.querySelectorAll('input[name="unit"]')) input.checked=unitsToSelect.includes(input.value);
    selectedUnits[course]=unitsToSelect.filter(id=>units.includes(id));
    for (const id of ["unit-options","mode-section","strategy-section","generate"]) $(id).hidden = !units.length;
    $("course-empty").hidden = Boolean(units.length);
    $("course-empty").textContent = units.length ? "" : `${label} 연습 문제를 준비하고 있습니다.`;
    updateUnitCounts();
  }

  function renderCustomTypes() {
    const {course,unit,units,level,strategy}=getSettings();
    const key=units.join(',')+":"+level;
    const available=units.flatMap(id=>pool(id,level));
    const chosen=new Set(normalizeSelection(units,level,customSelections[key] ?? customSelections[unit+":"+level]));
    $("custom-type-section").hidden=strategy!=="custom" || !available.length;
    const groups=new Map();
    const query=$("custom-search").value.trim().toLocaleLowerCase("ko");
    for (const id of available) {
      const code=curriculum.forType(id);
      const label=TYPES[id].group??curriculum.standards[course]?.[code]??"연결 연습";
      if (query && !(TYPES[id].label+" "+(TYPES[id].searchLabel ?? "")+" "+label).toLocaleLowerCase("ko").includes(query)) continue;
      if (!groups.has(label)) groups.set(label,[]);
      groups.get(label).push(id);
    }
    $("custom-type-options").innerHTML=[...groups].map(([label,ids])=>`<fieldset class="custom-type-group"><legend>${esc(label)}</legend>`+ids.map(id=>
      `<label class="custom-type-option"><input type="checkbox" name="custom-type" value="${id}"${chosen.has(id)?" checked":""}><span class="custom-type-label">${esc(TYPES[id].label)}</span>${TYPES[id].plus?`<span class="context-chip chip-plus custom-plus">${metaIcon("plus")}확장</span>`:""}</label>`).join("")+"</fieldset>").join("") || "<p>검색 결과가 없습니다.</p>";
    $("custom-type-count").textContent=`${available.length}개 중 ${chosen.size}개 선택`;
  }

  function setCustomTypes(ids) {
    const {units,level}=getSettings();
    customSelections[units.join(",")+":"+level]=normalizeSelection(units,level,ids);
    renderCustomTypes();
    renderStart();
    saveSettings();
  }
  $("custom-select-all").addEventListener("click",()=>{
    const {units,level}=getSettings();
    setCustomTypes(units.flatMap(unit=>pool(unit,level)));
  });
  $("custom-clear").addEventListener("click",()=>setCustomTypes([]));
  $("custom-search").addEventListener("input",renderCustomTypes);
  $("home-start").addEventListener("click",()=>{
    if (draft && (!draft.record || draft.dailyDay || draft.reviewOf)) { location.replace("#session"); return; }
    begin(getSettings(),true);
  });
  $("quick-practice").addEventListener("click",()=>{ parkDraft(); openDaily(getSettings()); });

  setup.addEventListener("change", event => {
    if (event.target.name === "course") renderUnits(event.target.value);
    if (event.target.id === "mix-enabled") {
      mixEnabled=event.target.checked;
      if(!mixEnabled) {
        const checked=[...setup.querySelectorAll('input[name="unit"]:checked')];
        checked.slice(1).forEach(input=>{input.checked=false;});
        selectedUnits[$("course-select").value]=checked.slice(0,1).map(input=>input.value);
      }
    }
    if (event.target.name === "unit") {
      if(!mixEnabled && event.target.checked) for(const other of setup.querySelectorAll('input[name="unit"]')) if(other!==event.target) other.checked=false;
      const checked=[...setup.querySelectorAll('input[name="unit"]:checked')];
      if(!checked.length) { event.target.checked=true; return; }
      selectedUnits[$("course-select").value]=checked.map(input=>input.value);
      lastUnit[$("course-select").value]=checked[0].value;
    }
    if (event.target.name === "level") updateUnitCounts();
    if(event.target.name==="custom-type") {
      const {unit,units,level}=getSettings();
      const key=units.join(",")+":"+level;
      const choices=new Set(customSelections[key] ?? customSelections[unit+":"+level] ?? []);
      if (event.target.checked) choices.add(event.target.value);
      else choices.delete(event.target.value);
      customSelections[key]=[...choices];
      const total=units.flatMap(id=>pool(id,level)).length;
      $("custom-type-count").textContent=total+"개 중 "+choices.size+"개 선택";
    }else { $("custom-search").value=""; renderCustomTypes(); }
    saveSettings();
    renderStart();
  });
  setup.addEventListener("submit",event=>{
    event.preventDefault();
    const settings = getSettings();
    if ($("generate").disabled) return;
    saveSettings();
    begin(settings,true);
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (draft.record) return;
    listAttempts();
    if (memory.has(draft.id)) {
      draft.record=memory.get(draft.id);
      syncTimer();
      saveDraft();
      renderFeedback(true);
      return;
    }
    const input = readInput();
    const {answer} = draft.problem;
    const result = grade(input,answer);
    if (!result.valid) {
      play("tap");
      const messages = {
        choice: "답을 하나 선택해 주세요.",
        truth: "참 또는 거짓으로 입력해 주세요. O, X도 사용할 수 있습니다.",
        point: "두 답안을 각각 숫자로 입력해 주세요.",
        graph: "그래프의 각 항목을 숫자로 입력해 주세요.",
        set: "집합의 원소를 쉼표로 구분해 입력해 주세요.",
        interval: "부등식 표기를 확인해 주세요. 예: -2 < x <= 3",
        scalar: "숫자나 분수 표기로 입력해 주세요. 예를 들어 7 또는 3/2처럼 쓸 수 있습니다.",
      };
      $("answer-error").textContent = input === "" && answer.kind !== "choice" ? "답을 입력해 주세요." : messages[answer.kind];
      $("answer-error").hidden = false;
      const inputs = [...answerFields.querySelectorAll("input, .answer-editor")];
      const invalid = ["point","graph"].includes(answer.kind) ? inputs.filter((field,i) => !grade(input[i], {kind:"scalar",value:0}).valid) : inputs;
      for (const field of invalid) field.setAttribute("aria-invalid","true");
      invalid[0]?.focus();
      return;
    }
    const elapsed = elapsedNow();
    draft.streak = result.correct ? (draft.streak ?? 0)+1 : 0;
    play(result.correct ? "correct" : "wrong");
    draft.record = { id: draft.id, problem: draft.problem, input, correct: result.correct, date: Date.now(), elapsed, error: "",
      reviewOf:draft.reviewOf, dailyDay:draft.dailyDay };
    learning.unpark(draft.id);
    saveAttempt(draft.record);
    window.studyBridge.report({
      id: "math-" + draft.record.id,
      subject: "math",
      label: TYPES[typeFor(draft.problem)]?.label ?? "수학 연습",
      mode: draft.record.dailyDay ? "오늘의 문제" : draft.record.reviewOf ? "복습" : "연습",
      result: draft.record.correct ? "correct" : "wrong",
      elapsedMs: Math.round(elapsed),
      answer: Array.isArray(input) ? input.join(", ") : answer.kind === "choice" ? answer.options[Number(input)] : input,
      prompt: shareText(draft.problem, false)
    });
    syncTimer();
    saveDraft();
    renderFeedback(true);
    renderHistory();
  });
  $("ask-on-wall").addEventListener("click", () => {
    if (draft) window.studyBridge.ask(shareText(draft.problem, false));
  });
  answerFields.addEventListener("click", event => {
    const label = event.target.closest("label[for]");
    if (label) document.getElementById(label.htmlFor)?.focus();
  });
  answerFields.addEventListener("keydown", event => {
    if (event.target.matches(".answer-editor") && event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  answerFields.addEventListener("input", () => {
    clearInputError();
    updateGraphPreview();
    saveDraft();
  });
  function openShare() {
    $("share-text").hidden=true;
    $("share-text-label").hidden=true;
    $("share-solution").hidden=!draft.record;
    $("share-title").textContent=draft.record ? "문제와 풀이 공유" : "문제 공유";
    $("share-dialog").showModal();
  }

  async function share(includeSolution) {
    const problem = draft.problem;
    const title = `문제공방 · ${UNITS[TYPES[typeFor(problem)].unit]}`;
    const text = shareText(problem,includeSolution);
    if ($("share-dialog").open) $("share-dialog").close();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({title,text});
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${title}

${text}`);
      if (draft?.problem === problem) {
        $("share-status").textContent = includeSolution ? "문제와 풀이를 복사했습니다." : "문제만 복사했습니다.";
        $("share-status").hidden = false;
      }
    } catch {
      if (draft?.problem !== problem || !inSession()) return;
      openShare();
      $("share-text-label").hidden=false;
      $("share-text").hidden=false;
      $("share-text").value = `${title}

${text}`;
      $("share-text").select();
    }
  }
  $("share-problem").addEventListener("click", () => draft.record ? openShare() : share(false));
  $("share-question").addEventListener("click", () => share(false));
  $("share-solution").addEventListener("click", () => { if (draft.record) share(true); });

  function fitAnswerActions() {
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const visibleBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const session = inSession() && (viewport?.scale ?? 1) === 1;
    const inset = session ? Math.max(0,window.innerHeight - visibleBottom) : 0;
    $("session-content").style.setProperty("--keyboard-inset", `${inset}px`);
    const input = document.activeElement;
    if (!session || !form.contains(input) || input.type !== "text") return;
    const actions = $("session-actions").getBoundingClientRect();
    const field = input.getBoundingClientRect();
    const top = Math.max(viewportTop,$("session-header").getBoundingClientRect().bottom);
    const needed = actions.bottom + 12 - visibleBottom;
    const available = Math.max(0,field.top - top - 8);
    if (needed > 0 && available > 0) window.scrollBy(0,Math.min(needed,available));
  }
  window.addEventListener("resize",fitAnswerActions);
  window.visualViewport?.addEventListener("resize",fitAnswerActions);
  $("skip-problem").addEventListener("click", () => {
    const current = draft;
    if (current.dailyDay) {
      const plan = learning.read("daily:"+current.dailyDay);
      const index = plan.items.findIndex(item=>item.id===current.id);
      learning.park(captureDraft());
      plan.items[index] = {...plan.items[index], ...captureDraft(), deferred:true};
      learning.write("daily:"+current.dailyDay,plan);
      const remaining = dailyRemaining(current.dailyDay).filter(item=>!item.deferred);
      if (remaining.length) openProblem({...remaining[0],streak:current.streak});
      else finishSession("#practice");
    } else {
      parkDraft();
      if (current.reviewOf) finishSession("#history");
      else nextProblem();
    }
  });
  $("discard-problem").addEventListener("click", () => {
    const current=draft;
    learning.unpark(current.id);
    if (current.dailyDay) {
      const plan=learning.read("daily:"+current.dailyDay);
      const index=plan.items.findIndex(item=>item.id===current.id);
      plan.items[index]={...plan.items[index],...captureDraft(),deferred:true};
      learning.write("daily:"+current.dailyDay,plan);
      const next=dailyRemaining(current.dailyDay).find(item=>!item.deferred);
      if(next) openProblem(next); else finishSession("#practice");
    } else if (current.reviewOf) finishSession("#history");
    else nextProblem();
  });
  $("next-problem").addEventListener("click", () => {
    if (draft.dailyReview) {
      const {date,index}=draft.dailyReview;
      const item=learning.read("daily-review:"+date)?.items?.[index+1];
      if(item) openProblem(item); else finishSession("#practice");
    } else if (draft.dailyDay) {
      const remaining = dailyRemaining(draft.dailyDay);
      const next = remaining.find(item=>!item.deferred);
      if (next) openProblem({...next,streak:draft.streak});
      else finishSession("#practice");
    } else if (draft.reviewOf) finishSession("#history");
    else nextProblem();
  });
  $("type-stats").addEventListener("click", event => {
    const button = event.target.closest("button[data-drill]");
    if (!button) return;
    selectSettings({unit:TYPES[button.dataset.drill].unit,level:button.dataset.mode,strategy:"custom",customTypes:[button.dataset.drill]});
    saveSettings();
    begin(getSettings(),true);
  });

  $("type-unit").insertAdjacentHTML("beforeend",Object.entries(UNITS).map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join(""));
  $("type-unit").addEventListener("change",renderHistory);
  $("type-search").addEventListener("input",renderHistory);
  $("history-unit").insertAdjacentHTML("beforeend",Object.entries(UNITS).map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join(""));
  for (const id of ["history-filter","history-unit"]) $(id).addEventListener("change",()=>{historyLimit=20;renderHistory();});
  for (const [button,list] of [["review-more","review-list"],["parked-more","parked-list"]]) {
    $(button).addEventListener("click",()=>{
      const index=list==='review-list'?reviewLimit:parkedLimit;
      if(list==='review-list') reviewLimit+=8; else parkedLimit+=8;
      renderHistory();
      $(list).querySelectorAll(".attempt-row > summary")[index]?.focus();
    });
  }
  $("history-more").addEventListener("click",()=>{
    const nextIndex=historyLimit;
    historyLimit+=20;
    renderHistory();
    $("recent-attempts").querySelectorAll(".attempt-row > summary")[nextIndex]?.focus();
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-error-reason]");
    if (button) changeErrorReason(button);
  });
  $("history-view").addEventListener("click",async event=>{
    const remove=event.target.closest("[data-remove-kind]");
    if(remove) {
      const {removeKind:kind,removeId:id}=remove.dataset;
      const prompts={
        review:["복습을 무시할까요?","복습 목록에서 제외하며 풀이 기록은 유지됩니다.","복습 무시"],
        parked:["보관을 취소할까요?","보관 목록에서 이 문제를 삭제합니다.","보관 취소"],
        attempt:["풀이 기록을 삭제할까요?","이 풀이 기록과 필기가 삭제되며 통계와 오늘의 문제 상태에도 반영됩니다.","기록 삭제"]
      };
      if (kind === "attempt" && memory.get(id)?.dailyDay) { $("daily-protected-dialog").showModal(); return; }
      if(!prompts[kind]) return;
      pendingRemoval={kind,id};
      $("item-confirm-title").textContent=prompts[kind][0];
      $("item-confirm-message").textContent=prompts[kind][1];
      $("item-confirm").querySelector("span").textContent=prompts[kind][2];
      $("item-confirm-dialog").showModal();
      return;
    }
    const button=event.target.closest("[data-retry],[data-variant],[data-resume],[data-parked-variant]");
    if (!button) return;
    if (button.dataset.resume || button.dataset.parkedVariant) {
      const item=learning.read("parked",[]).find(record=>record.id===(button.dataset.resume ?? button.dataset.parkedVariant));
      if(!item) return;
      parkDraft();
      if(button.dataset.resume) openProblem(item);
      else {
        const type=typeFor(item.problem),level=item.problem.level;
        const problem=generate(type,level,{avoidPaths:[item.problem.answerPath.id]});
        openProblem({problem,id:learning.uid(),settings:{unit:TYPES[type].unit,level,strategy:"custom",customTypes:[type]}});
      }
    } else openReview(memory.get(button.dataset.retry ?? button.dataset.variant),Boolean(button.dataset.variant));
  });

  $("item-cancel").addEventListener("click",()=>$("item-confirm-dialog").close());
  $("item-confirm-dialog").addEventListener("close",()=>{pendingRemoval=null;});
  $("item-confirm").addEventListener("click",async()=>{
    if(!pendingRemoval) return;
    const {kind,id}=pendingRemoval;
    const confirm=$("item-confirm"); confirm.disabled=true;
    try {
      if(kind==='review') {
        const ignored=new Set(learning.read("ignored-reviews",[])); ignored.add(id); learning.write("ignored-reviews",[...ignored]);
      } else if(kind==='parked') {
        learning.unpark(id);
      } else {
        await learning.deleteInk(id);
        window.studyBridge.local.removeItem(recordPrefix+id); memory.delete(id);
        if(draft?.id===id) {draft=null;activeSince=null;learning.write("draft",null);try {window.studyBridge.session.removeItem(draftKey);}catch{}}
      }
      $("item-confirm-dialog").close();
      renderHistory();
    } catch {
      $("item-confirm-message").textContent="처리하지 못했습니다. 저장 공간을 확인한 후 다시 시도해 주세요.";
    } finally { confirm.disabled=false; }
  });

  async function showSavedInk(panel) {
    const past=await learning.getInk(panel.dataset.ink);
    if (!panel.isConnected || !panel.open) return;
    const canvas=panel.querySelector("canvas");
    const visible=Boolean(past && globalThis.ForgeScratchpad.renderSaved(canvas,past));
    canvas.hidden=!visible;
    panel.querySelector("p").hidden=visible;
  }
  $("recent-attempts").addEventListener("toggle",event=>{
    if (event.target.matches(".saved-ink[open]")) showSavedInk(event.target);
  },true);
  document.addEventListener("forge-pluschange",()=>{updateUnitCounts();renderCustomTypes();renderStart();});
  document.addEventListener("forge-themechange",()=>{
    for (const panel of $("recent-attempts").querySelectorAll(".saved-ink[open]")) showSavedInk(panel);
  });
  async function resetRecords() {
    const today = learning.day();
    const todayPlan = learning.read("daily:" + today);
    const todayAttempts = listAttempts().filter(record => record.dailyDay === today);
    await learning.clearLearning();
    memory.clear();
    if (todayPlan) { learning.write("daily:" + today, todayPlan); learning.write("daily-days", [today]); }
    for (const record of todayAttempts) saveAttempt(record);
    draft=null;
    activeSince=null;
  }

  async function exportRecords() {
    const daily=learning.read("daily-days",[]).map(date=>({date,plan:learning.read("daily:"+date)})).filter(item=>item.plan);
    return {version:1,ignoredReviews:learning.read("ignored-reviews",[]),attempts:listAttempts(),parked:learning.read("parked",[]),draft:draft,daily,ink:await learning.allInk()};
  }

  async function importRecords(content) {
    const data=ForgeBackup.readBackup(content);
    listAttempts();
    const previousIds=new Set(memory.keys());
    const imported=data.attempts.filter(record=>!previousIds.has(record.id));
    for (const record of imported) saveAttempt(record);
    const known=new Set((await learning.allInk()).map(item=>item.id));
    await Promise.all(data.ink.filter(item=>!known.has(item.id)).map(learning.putInk));
    const parked=new Map(learning.read("parked",[]).map(item=>[item.id,item]));
    const candidates=data.draft && !data.draft.record ? [...data.parked,data.draft] : data.parked;
    for (const item of candidates) if (!memory.has(item.id) && !parked.has(item.id)) parked.set(item.id,item);
    learning.write("parked",[...parked.values()]);
    learning.write("ignored-reviews",[...new Set([...learning.read("ignored-reviews",[]),...(data.ignoredReviews ?? [])])]);
    const days=new Set(learning.read("daily-days",[]));
    for (const {date,plan} of data.daily) {
      if (!learning.read("daily:"+date)) learning.write("daily:"+date,plan);
      days.add(date);
    }
    learning.write("daily-days",[...days]);
    if (!storageAvailable || !learning.persistent()) throw new Error("기록을 저장하지 못했습니다.");
    return imported.length;
  }
  addEventListener("hashchange", updateRoute);
  addEventListener("storage", event => {
    if (event.key === null) memory.clear();
    if (event.key?.startsWith(recordPrefix) && event.newValue === null) memory.delete(event.key.slice(recordPrefix.length));
    renderHistory();
  });
  addEventListener("pagehide", saveDraft);
  document.addEventListener("visibilitychange", () => {
    syncTimer();
    saveDraft();
  });
  selectSettings(loadSettings());
  if (draft) renderProblem();
  updateRoute(false);
})();
  if (runtime.recordsOnly) return recordTools;
  runtime.ready();
}
