// The sheet's automatic fields (totals, modifiers, loads...) are calculated by small scripts stored in the PDF.
// The viewer does not run PDF scripts. This file runs the subset those scripts use, with no eval:
// variables, numbers, strings, + - * / % comparisons, if/else, getField(name).value, event.value = ...,
// Math.floor/round/pow/min/max, AFMakeNumber and AFSimple_Calculate.

const TOKEN = /\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\d*\.?\d+(?:e[+-]?\d+)?)|([A-Za-z_$][\w$]*)|(===|!==|==|!=|<=|>=|&&|\|\||[-+*/%()<>=!,;{}.:])/y;

function tokenize(src) {
  const out = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    const start = TOKEN.lastIndex;
    const m = TOKEN.exec(src);
    if (!m || TOKEN.lastIndex === start) throw new Error('Unsupported script at ' + start);
    if (m[1] !== undefined) out.push({ t: 'str', v: m[1].slice(1, -1) });
    else if (m[2] !== undefined) out.push({ t: 'num', v: Number(m[2]) });
    else if (m[3] !== undefined) out.push({ t: 'id', v: m[3] });
    else if (m[4] !== undefined) out.push({ t: 'op', v: m[4] });
  }
  return out;
}

// ---- parser: builds a small tree; nothing here can call anything except the known functions below ----
function parse(src) {
  const toks = tokenize(src);
  let i = 0;
  const peek = (v) => toks[i] && toks[i].v === v;
  const take = (v) => {
    if (v !== undefined && !peek(v)) throw new Error(`Expected ${v}`);
    return toks[i++];
  };

  function statement() {
    if (peek(';')) {
      take();
      return { k: 'block', body: [] }; // an empty statement
    }
    if (peek('{')) {
      take('{');
      const body = [];
      while (!peek('}')) body.push(statement());
      take('}');
      return { k: 'block', body };
    }
    if (peek('var')) {
      take();
      const name = take().v;
      let init = null;
      if (peek('=')) {
        take('=');
        init = expr();
      }
      if (peek(';')) take();
      return { k: 'var', name, init };
    }
    if (peek('break')) {
      take();
      if (peek(';')) take();
      return { k: 'break' };
    }
    if (peek('switch')) {
      take();
      take('(');
      const disc = expr();
      take(')');
      take('{');
      const cases = [];
      while (!peek('}')) {
        let test = null;
        if (peek('case')) {
          take();
          test = expr();
        } else take('default');
        take(':');
        const body = [];
        while (!peek('case') && !peek('default') && !peek('}')) body.push(statement());
        cases.push({ test, body });
      }
      take('}');
      return { k: 'switch', disc, cases };
    }
    if (peek('if')) {
      take();
      take('(');
      const cond = expr();
      take(')');
      const then = statement();
      let other = null;
      if (peek('else')) {
        take();
        other = statement();
      }
      return { k: 'if', cond, then, other };
    }
    const target = expr();
    if (peek('=')) {
      take('=');
      const value = expr();
      if (peek(';')) take();
      return { k: 'assign', target, value };
    }
    if (peek(';')) take();
    return { k: 'expr', e: target };
  }

  const BIN = [['||'], ['&&'], ['===', '!==', '==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];
  function binary(level) {
    if (level === BIN.length) return unary();
    let left = binary(level + 1);
    while (toks[i] && toks[i].t === 'op' && BIN[level].includes(toks[i].v)) {
      const op = take().v;
      left = { k: 'bin', op, a: left, b: binary(level + 1) };
    }
    return left;
  }
  const expr = () => binary(0);

  function unary() {
    if (peek('!') || peek('-') || peek('+')) {
      const op = take().v;
      return { k: 'un', op, a: unary() };
    }
    return postfix();
  }

  function postfix() {
    let e = primary();
    for (;;) {
      if (peek('.')) {
        take('.');
        e = { k: 'member', obj: e, prop: take().v };
      } else if (peek('(')) {
        take('(');
        const args = [];
        while (!peek(')')) {
          args.push(expr());
          if (peek(',')) take();
        }
        take(')');
        e = { k: 'call', fn: e, args };
      } else return e;
    }
  }

  function primary() {
    const t = toks[i];
    if (!t) throw new Error('Unexpected end of script');
    if (t.t === 'num') return take(), { k: 'lit', v: t.v };
    if (t.t === 'str') return take(), { k: 'lit', v: t.v };
    if (t.t === 'id' && t.v === 'new') {
      take();
      const c = postfix();
      if (c.k !== 'call') throw new Error('Unsupported new');
      return { k: 'newcall', fn: c.fn, args: c.args };
    }
    if (t.t === 'id') return take(), { k: 'id', name: t.v };
    if (t.v === '(') {
      take('(');
      const e = expr();
      take(')');
      return e;
    }
    throw new Error('Unsupported syntax: ' + t.v + ' after ' + toks.slice(Math.max(0, i - 6), i).map(x => x.v).join(' '));
  }

  const body = [];
  while (i < toks.length) body.push(statement());
  return body;
}

// ---- evaluation ----
const MATH = { floor: Math.floor, round: Math.round, pow: Math.pow, min: Math.min, max: Math.max, abs: Math.abs };
const num = v => {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const asValue = v => (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? Number(v) : v);

const COLLECT = {
  SUM: xs => xs.reduce((a, b) => a + b, 0),
  PRD: xs => xs.reduce((a, b) => a * b, 1),
  AVG: xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0),
  MIN: xs => Math.min(...xs),
  MAX: xs => Math.max(...xs),
};

const BREAK = { break: true };

function run(ast, api) {
  const vars = new Map();
  const event = { value: undefined };
  const globals = {
    event,
    Math: MATH,
    Array: { construct: args => args },
    AFMakeNumber: v => num(v),
    AFSimple_Calculate: (op, names) => {
      const xs = (names || []).map(n => num(api.get(n)));
      event.value = (COLLECT[String(op).toUpperCase()] || COLLECT.SUM)(xs);
    },
    // Acrobat hands numeric fields over as numbers, so 1 + 2 adds (and "1" + "2" would not)
    this: { getField: name => ({ get value() { return asValue(api.get(name)); } }) },
  };
  const lookup = name => {
    if (vars.has(name)) return vars.get(name);
    if (name in globals) return globals[name];
    throw new Error('Unknown name ' + name);
  };
  const ev = e => {
    switch (e.k) {
      case 'lit': return e.v;
      case 'id': return lookup(e.name);
      case 'member': {
        const o = ev(e.obj);
        if (o && o.construct) return undefined;
        return o == null ? undefined : o[e.prop];
      }
      case 'newcall': {
        if (e.fn.k === 'id' && e.fn.name === 'Array') return e.args.map(ev);
        throw new Error('Unsupported new');
      }
      case 'call': {
        if (e.fn.k === 'member' && e.fn.prop === 'getField') return ev(e.fn.obj).getField(...e.args.map(ev));
        if (e.fn.k === 'member' && e.fn.obj.k === 'id' && e.fn.obj.name === 'Math') return MATH[e.fn.prop](...e.args.map(ev));
        if (e.fn.k === 'member' && e.fn.obj.k === 'id' && e.fn.obj.name === 'this') return ev(e.fn.obj)[e.fn.prop](...e.args.map(ev));
        if (e.fn.k === 'id' && e.fn.name === 'getField') return globals.this.getField(...e.args.map(ev));
        if (e.fn.k === 'id' && e.fn.name === 'AFSimple_Calculate') return globals.AFSimple_Calculate(...e.args.map(ev));
        if (e.fn.k === 'id' && e.fn.name === 'AFMakeNumber') return num(ev(e.args[0]));
        if (e.fn.k === 'id' && MATH[e.fn.name]) return MATH[e.fn.name](...e.args.map(ev));
        throw new Error('Unsupported call');
      }
      case 'un': {
        const a = ev(e.a);
        return e.op === '!' ? !a : e.op === '-' ? -a : +a;
      }
      case 'bin': {
        if (e.op === '&&') return ev(e.a) && ev(e.b);
        if (e.op === '||') return ev(e.a) || ev(e.b);
        const a = ev(e.a), b = ev(e.b);
        switch (e.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '%': return a % b;
          case '===': return a === b;
          case '!==': return a !== b;
          case '==': return a == b;
          case '!=': return a != b;
          case '<': return a < b;
          case '>': return a > b;
          case '<=': return a <= b;
          case '>=': return a >= b;
        }
        throw new Error('Unsupported operator ' + e.op);
      }
      default: throw new Error('Unsupported expression');
    }
  };
  const exec = s => {
    switch (s.k) {
      case 'block':
        for (const x of s.body) if (exec(x) === BREAK) return BREAK;
        return;
      case 'break': return BREAK;
      case 'switch': {
        const v = ev(s.disc);
        let start = s.cases.findIndex(c => c.test && ev(c.test) == v);
        if (start < 0) start = s.cases.findIndex(c => !c.test);
        if (start < 0) return;
        for (const c of s.cases.slice(start)) {
          for (const x of c.body) if (exec(x) === BREAK) return;
        }
        return;
      }
      case 'var': vars.set(s.name, s.init ? ev(s.init) : undefined); return;
      case 'if': return ev(s.cond) ? exec(s.then) : s.other ? exec(s.other) : undefined;
      case 'assign': {
        const v = ev(s.value);
        if (s.target.k === 'id') vars.set(s.target.name, v);
        else if (s.target.k === 'member' && s.target.obj.k === 'id' && s.target.obj.name === 'event') event[s.target.prop] = v;
        else if (s.target.k === 'member' && s.target.prop === 'value' && s.target.obj.k === 'call' && s.target.obj.fn.k === 'id' && s.target.obj.fn.name === 'getField') {
          // a script may also set another field, e.g. the encumbrance checkboxes
          if (api.set) api.set(String(ev(s.target.obj.args[0])), v);
        }
        else throw new Error('Unsupported assignment');
        return;
      }
      case 'expr': ev(s.e); return;
      default: throw new Error('Unsupported statement');
    }
  };
  ast.forEach(exec);
  return event.value;
}

/** Runs one calculate script. `get(name)` returns the current value of another field. Returns the new value or undefined. */
export function runCalc(script, get, set) {
  return run(parse(script), { get, set });
}

/**
 * Recalculates every automatic field, a few passes so chains (a total used by a modifier) settle.
 * `calcs` maps field name -> script. Returns { name: value } for the fields whose value changed.
 */
export function recalc(values, calcs) {
  const work = { ...values };
  const changed = {};
  const put = (name, v) => {
    if (work[name] === v) return false;
    work[name] = v;
    changed[name] = v;
    return true;
  };
  const names = Object.keys(calcs);
  for (let pass = 0; pass < 6; pass++) {
    let moved = false;
    for (const name of names) {
      let next;
      try {
        next = runCalc(calcs[name], n => work[n], (n, v) => { if (put(n, String(v))) moved = true; });
      } catch {
        continue; // a script we do not support is left as it is
      }
      if (next === undefined) continue;
      // stored like Acrobat stores it: 6 decimals at most; the number of decimals shown is a display setting
      const str = typeof next === 'number' && Number.isFinite(next) ? String(Number(next.toFixed(6))) : String(next);
      if (put(name, str)) moved = true;
    }
    if (!moved) break;
  }
  return changed;
}
