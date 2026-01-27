'use client';

import { useSiteStore, ComputedTradeEstimate } from '@/lib/site/store';

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString();
}

function TradeEstimateCard({ estimate }: { estimate: ComputedTradeEstimate }) {
  const activeTradeId = useSiteStore((s) => s.activeTradeId);
  const setActiveTradeId = useSiteStore((s) => s.setActiveTradeId);
  const isActive = activeTradeId === estimate.tradeId;

  return (
    <div
      className={`trade-card ${isActive ? 'active' : ''}`}
      onClick={() => setActiveTradeId(isActive ? null : estimate.tradeId)}
    >
      <div className="trade-card-header">
        <div className="trade-name">
          <span className="trade-code">{estimate.tradeCode}</span>
          {estimate.tradeName}
        </div>
        <div className="trade-total">{formatCurrency(estimate.total)}</div>
      </div>

      {isActive && (
        <div className="trade-card-details">
          {estimate.lineItems.map((item, idx) => (
            <div key={idx} className="trade-line-item">
              <div className="line-item-name">{item.serviceName}</div>
              <div className="line-item-qty">
                {item.quantity.toLocaleString()} {item.unit}
              </div>
              <div className="line-item-cost">{formatCurrency(item.subtotal)}</div>
            </div>
          ))}

          <div className="trade-breakdown">
            <div className="breakdown-row">
              <span>Subtotal</span>
              <span>{formatCurrency(estimate.subtotal)}</span>
            </div>
            <div className="breakdown-row">
              <span>Mobilization</span>
              <span>{formatCurrency(estimate.mobilization)}</span>
            </div>
            <div className="breakdown-row">
              <span>Margin ({Math.round(estimate.margin * 100)}%)</span>
              <span>{formatCurrency(estimate.marginAmount)}</span>
            </div>
            <div className="breakdown-row total">
              <span>Total</span>
              <span>{formatCurrency(estimate.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TradePanel() {
  const tradeEstimates = useSiteStore((s) => s.tradeEstimates);
  const objects = useSiteStore((s) => s.objects);

  // Calculate grand total
  const grandTotal = tradeEstimates.reduce((sum, est) => sum + est.total, 0);

  // Calculate summary stats
  const totalArea = objects.reduce((sum, obj) => sum + (obj.measurements.area || 0), 0);
  const totalLinear = objects.reduce((sum, obj) => sum + (obj.measurements.length || 0), 0);

  return (
    <div className="trade-panel">
      <div className="trade-panel-header">
        <h2>Estimates</h2>
      </div>

      {tradeEstimates.length === 0 ? (
        <div className="trade-panel-empty">
          <p>No estimates yet</p>
          <p className="text-muted">Draw and classify objects to see trade estimates</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="trade-summary-stats">
            <div className="stat">
              <span className="stat-value">{totalArea.toLocaleString()}</span>
              <span className="stat-label">sq ft</span>
            </div>
            <div className="stat">
              <span className="stat-value">{totalLinear.toLocaleString()}</span>
              <span className="stat-label">linear ft</span>
            </div>
            <div className="stat">
              <span className="stat-value">{objects.length}</span>
              <span className="stat-label">objects</span>
            </div>
          </div>

          {/* Trade cards */}
          <div className="trade-cards">
            {tradeEstimates.map((estimate) => (
              <TradeEstimateCard key={estimate.tradeId} estimate={estimate} />
            ))}
          </div>

          {/* Grand total */}
          <div className="trade-grand-total">
            <span>Grand Total</span>
            <span className="grand-total-amount">{formatCurrency(grandTotal)}</span>
          </div>
        </>
      )}
    </div>
  );
}

export default TradePanel;
