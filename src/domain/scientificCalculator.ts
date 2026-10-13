/** A bounded expression parser. User input is never executed as JavaScript. */
export function scientificResult(input: string, angle: 'degree' | 'radian') {
  const source = input
    .trim()
    .replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966))
    .replace(/×/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi');
  if (!source || source.length > 160) throw Error('expression');
  let at = 0,
    steps = 0;
  const space = () => {
    while (/\s/.test(source[at] || '') && at < source.length) at++;
  };
  const take = (s: string) => {
    space();
    if (source.slice(at, at + s.length) === s) {
      at += s.length;
      return true;
    }
    return false;
  };
  const finite = (n: number) => {
    if (!Number.isFinite(n) || ++steps > 512) throw Error('expression');
    return Object.is(n, -0) ? 0 : n;
  };
  const atom = (): number => {
    space();
    if (take('(')) {
      const n = sum();
      if (!take(')')) throw Error('expression');
      return n;
    }
    const name = source
      .slice(at)
      .match(/^[a-z]+/i)?.[0]
      ?.toLowerCase();
    if (name) {
      at += name.length;
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      if (!take('(')) throw Error('expression');
      const n = sum();
      if (!take(')')) throw Error('expression');
      const a = angle === 'degree' ? (n * Math.PI) / 180 : n;
      if (name === 'sqrt') return finite(Math.sqrt(n));
      if (name === 'ln') return finite(Math.log(n));
      if (name === 'log') return finite(Math.log10(n));
      if (name === 'sin') return finite(Math.sin(a));
      if (name === 'cos') return finite(Math.cos(a));
      if (name === 'tan' && Math.abs(Math.cos(a)) > 1e-14)
        return finite(Math.tan(a));
      throw Error('expression');
    }
    const token = source
      .slice(at)
      .match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)?.[0];
    if (!token) throw Error('expression');
    at += token.length;
    return finite(Number(token));
  };
  const postfix = (): number => {
    let n = atom();
    while (true) {
      if (take('!')) {
        if (!Number.isInteger(n) || n < 0 || n > 170) throw Error('expression');
        let product = 1;
        for (let i = 2; i <= n; i++) product *= i;
        n = finite(product);
      } else if (take('%')) n = finite(n / 100);
      else return n;
    }
  };
  const power = (): number => {
    const n = postfix();
    return take('^') ? finite(n ** unary()) : n;
  };
  const unary = (): number =>
    take('+') ? unary() : take('-') ? finite(-unary()) : power();
  const product = (): number => {
    let n = unary();
    while (true) {
      if (take('*')) n = finite(n * unary());
      else if (take('/')) n = finite(n / unary());
      else return n;
    }
  };
  const sum = (): number => {
    let n = product();
    while (true) {
      if (take('+')) n = finite(n + product());
      else if (take('-')) n = finite(n - product());
      else return n;
    }
  };
  const result = sum();
  space();
  if (at !== source.length) throw Error('expression');
  return finite(result);
}
