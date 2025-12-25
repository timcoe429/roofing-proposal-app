import React, { useState } from 'react';
import { TrendingUp, DollarSign, Percent, ChevronDown, ChevronUp } from 'lucide-react';
import './MarginDashboard.css';

const MarginDashboard = ({ breakdown, overheadPercent, profitPercent, onUpdatePercentages }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const handleProfitChange = (e) => {
    const newProfit = parseFloat(e.target.value) || 0;
    onUpdatePercentages({ profitPercent: newProfit });
  };

  const handleOverheadChange = (e) => {
    const newOverhead = parseFloat(e.target.value) || 0;
    onUpdatePercentages({ overheadPercent: newOverhead });
  };

  const netMarginColor = breakdown.netMarginActual >= (breakdown.netMarginTarget || 20) 
    ? '#10b981' 
    : breakdown.netMarginActual >= (breakdown.netMarginTarget || 20) * 0.8
    ? '#f59e0b'
    : '#ef4444';

  return (
    <div className={`margin-dashboard ${isCollapsed ? 'collapsed' : ''}`}>
      <button 
        className="dashboard-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? 'Expand dashboard' : 'Collapse dashboard'}
      >
        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        <span>{isCollapsed ? 'Show Margins' : 'Hide'}</span>
      </button>

      {/* Compact summary shown when collapsed */}
      {isCollapsed && (
        <div className="dashboard-summary">
          <div className="summary-item">
            <span className="summary-label">Profit:</span>
            <span className="summary-value">{formatPercentage(profitPercent || 20)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Overhead:</span>
            <span className="summary-value">{formatPercentage(overheadPercent || 10)}</span>
          </div>
          <div className="summary-item net-margin-summary" style={{ color: netMarginColor }}>
            <TrendingUp size={14} />
            <span className="summary-label">NET:</span>
            <span className="summary-value">{formatPercentage(breakdown.netMarginActual || 0)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total:</span>
            <span className="summary-value final">{formatCurrency(breakdown.finalTotal || 0)}</span>
          </div>
        </div>
      )}

      {/* Full dashboard when expanded */}
      {!isCollapsed && (
        <div className="dashboard-content">
          <div className="dashboard-card profit-card">
            <div className="card-header">
              <Percent size={14} />
              <span className="card-label">Profit %</span>
            </div>
            <div className="card-content">
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={profitPercent || 20}
                onChange={handleProfitChange}
                className="slider"
              />
              <div className="card-value">{formatPercentage(profitPercent || 20)}</div>
            </div>
            <div className="card-amount">{formatCurrency(breakdown.profitAmount || 0)}</div>
          </div>

          <div className="dashboard-card overhead-card">
            <div className="card-header">
              <Percent size={14} />
              <span className="card-label">Overhead %</span>
            </div>
            <div className="card-content">
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={overheadPercent || 10}
                onChange={handleOverheadChange}
                className="slider"
              />
              <div className="card-value">{formatPercentage(overheadPercent || 10)}</div>
            </div>
            <div className="card-amount">{formatCurrency(breakdown.overheadAmount || 0)}</div>
          </div>

          <div className="dashboard-card overhead-costs-card">
            <div className="card-header">
              <DollarSign size={14} />
              <span className="card-label">Overhead Costs</span>
            </div>
            <div className="card-content">
              <div className="card-value fixed">{formatPercentage(breakdown.overheadCostPercent || 10)}</div>
            </div>
            <div className="card-amount">{formatCurrency(breakdown.overheadCosts || 0)}</div>
          </div>

          <div className="dashboard-card net-margin-card" style={{ borderColor: netMarginColor }}>
            <div className="card-header">
              <TrendingUp size={14} />
              <span className="card-label">NET Margin</span>
            </div>
            <div className="card-content">
              <div className="card-value net-margin-value" style={{ color: netMarginColor }}>
                {formatPercentage(breakdown.netMarginActual || 0)}
              </div>
              <div className="card-subtext">Target: {formatPercentage(breakdown.netMarginTarget || 20)}</div>
            </div>
            <div className="card-status" style={{ color: netMarginColor }}>
              {breakdown.netMarginActual >= (breakdown.netMarginTarget || 20) ? '✓ ON TARGET' : '⚠ BELOW TARGET'}
            </div>
          </div>

          <div className="dashboard-card total-cost-card">
            <div className="card-header">
              <DollarSign size={14} />
              <span className="card-label">Total Cost</span>
            </div>
            <div className="card-content">
              <div className="card-value">{formatCurrency(breakdown.totalCost || 0)}</div>
            </div>
          </div>

          <div className="dashboard-card final-total-card">
            <div className="card-header">
              <DollarSign size={14} />
              <span className="card-label">Final Total</span>
            </div>
            <div className="card-content">
              <div className="card-value final">{formatCurrency(breakdown.finalTotal || 0)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarginDashboard;

