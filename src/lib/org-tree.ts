/**
 * Recorre el árbol organizacional hacia abajo (BFS) a partir de una nómina.
 * Devuelve todos los empleados que reportan directa o indirectamente a esa nómina,
 * sin importar cuántos niveles haya en la jerarquía.
 *
 * Director/ADMIN → pasa todos los empleados de su UN directamente.
 * JT → sus coordinadores + operadores de esos coordinadores + ...
 * Coordinador → sus operadores directos.
 */
export function getEquipoCompleto<T extends { clave: string; jefe_inmed: string }>(
  nominaRaiz: string,
  todos: T[],
): T[] {
  const resultado: T[] = []
  const visitados = new Set<string>()
  const queue: string[] = [nominaRaiz]

  while (queue.length > 0) {
    const jefeActual = queue.shift()!
    const directos = todos.filter(
      e => e.jefe_inmed === jefeActual && !visitados.has(e.clave),
    )
    for (const emp of directos) {
      visitados.add(emp.clave)
      resultado.push(emp)
      queue.push(emp.clave)
    }
  }

  return resultado
}
