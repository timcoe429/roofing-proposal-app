import React from 'react';
import { TrendingUp, DollarSign, Percent } from 'lucide-react';
import './MarginDashboard.css';

const MarginDashboard = ({ breakdown, overheadPercent, profitPercent, onUpdatePercentages }) => {
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
    <div className="margin-dashboard">
      <div className="dashboard-card profit-card">
        <div className="card-header">
          <Percent size={16} />
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
          <Percent size={16} />
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
          <DollarSign size={16} />
          <span className="card-label">Overhead Costs</span>
        </div>
        <div className="card-content">
          <div className="card-value fixed">{formatPercentage(breakdown.overheadCostPercent || 10)}</div>
        </div>
        <div className="card-amount">{formatCurrency(breakdown.overheadCosts || 0)}</div>
      </div>

      <div className="dashboard-card net-margin-card" style={{ borderColor: netMarginColor }}>
        <div className="card-header">
          <TrendingUp size={16} />
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
          <DollarSign size={16} />
          <span className="card-label">Total Cost</span>
        </div>
        <div className="card-content">
          <div className="card-value">{formatCurrency(breakdown.totalCost || 0)}</div>
        </div>
      </div>

      <div className="dashboard-card final-total-card">
        <div className="card-header">
          <DollarSign size={16} />
          <span className="card-label">Final Total</span>
        </div>
        <div className="card-content">
          <div className="card-value final">{formatCurrency(breakdown.finalTotal || 0)}</div>
        </div>
      </div>
    </div>
  );
};

export default MarginDashboard;

