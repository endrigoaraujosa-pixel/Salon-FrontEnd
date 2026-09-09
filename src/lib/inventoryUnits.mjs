// O saldo interno de insumos usa o conteúdo da embalagem; a contagem usa unidades de estoque.
export const stockFactor = (product) => {
  const factor = Number(product?.quantidade_por_unidade || 0);
  return Number.isFinite(factor) && factor > 0 ? factor : 1;
};
export const stockUnits = (product, quantity = product?.quantidade_estoque) => Number(quantity || 0) / stockFactor(product);
export const internalStock = (product, units) => Number((Number(units) * stockFactor(product)).toFixed(3));
export const stockUnitLabel = (product) => (product?.unidade_medida || 'UN').toUpperCase();
