/**
 * One argument as a shell would read it whole, for showing only: quoted when
 * it holds a space or a quote (REQ-054). Commands run with an argument array
 * and no shell (REQ-007).
 */
export const quoted = (a: string) =>
  /^[\w./:=@%+,-]+$/.test(a) ? a : `'${a.replace(/'/g, "'\\''")}'`;
