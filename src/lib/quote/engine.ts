import { QuoteLine, ServiceTemplate, Geometry } from "./types";

export function computeQuoteLines(args: {
  templates: ServiceTemplate[];
  geometries: Geometry[];
  rateOverrides?: Record<string, number>;
  minimumOverrides?: Record<string, number>;
}): { lines: QuoteLine[]; total: number } {
  const { templates, geometries, rateOverrides = {}, minimumOverrides = {} } = args;

  const templateById = new Map(templates.map(t => [t.id, t]));
  const qtyByService = new Map<string, number>();

  for (const g of geometries) {
    qtyByService.set(g.serviceId, (qtyByService.get(g.serviceId) ?? 0) + (g.measurementValue ?? 0));
  }

  const lines: QuoteLine[] = [];
  let total = 0;

  for (const [serviceId, qty] of qtyByService.entries()) {
    const t = templateById.get(serviceId);
    if (!t) continue;

    const rate = rateOverrides[serviceId] ?? t.defaultRate;
    const min = minimumOverrides[serviceId] ?? t.minimumCharge ?? 0;

    let subtotal = qty * rate;
    let minApplied = false;

    if (min > 0 && subtotal < min) {
      subtotal = min;
      minApplied = true;
    }

    total += subtotal;

    lines.push({
      serviceId,
      serviceName: t.name,
      qty,
      unitLabel: t.unitLabel,
      rate,
      subtotal,
      minApplied,
    });
  }

  // Order lines by templates order
  lines.sort((a, b) => templates.findIndex(t => t.id === a.serviceId) - templates.findIndex(t => t.id === b.serviceId));

  return { lines, total };
}
