import { useState } from 'react';

// data-testid values are the contract with the test framework (Agentic-qa-demo) locators
// in features/Locators/*.locators.js. Change them there too if they ever change here.

const API_BASE = import.meta.env.VITE_API_BASE || '';

const formatGbp = (value) => '£' + Number(value).toLocaleString('en-GB');

const hidden = (show) => (show ? undefined : { display: 'none' });

export default function App() {
  const [income, setIncome] = useState('');
  const [commitments, setCommitments] = useState('');
  const [loan, setLoan] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function getDecision() {
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/mortgages/dip/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annualIncome: parseFloat(income),
          loanAmount: parseFloat(loan),
          existingCommitments: parseFloat(commitments) || 0
        })
      });
      const body = await response.json();
      if (body.decision) {
        setResult(body);
      } else {
        setResult(null);
        setError(body.error || 'Unable to get a decision');
      }
    } catch (e) {
      console.error('Error calling API:', e);
      setError('Service unavailable, please try again');
    }
  }

  const decision = result?.decision;

  return (
    <main className="aip">
      <h1>Mortgage Agreement in Principle</h1>
      <p className="lede">Check what you could borrow. This won't affect your credit score.</p>

      <form id="aip-form" onSubmit={(e) => { e.preventDefault(); getDecision(); }}>
        <label htmlFor="applicant-annual-income">Annual income (£)</label>
        <input
          id="applicant-annual-income"
          data-testid="applicant-annual-income"
          placeholder="Annual Income"
          inputMode="decimal"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
        />

        <label htmlFor="monthly-commitments">Monthly credit commitments (£)</label>
        <input
          id="monthly-commitments"
          data-testid="monthly-commitments"
          placeholder="Monthly Commitments"
          inputMode="decimal"
          value={commitments}
          onChange={(e) => setCommitments(e.target.value)}
        />

        <label htmlFor="requested-loan-amount">Loan amount (£)</label>
        <input
          id="requested-loan-amount"
          data-testid="requested-loan-amount"
          placeholder="Loan Amount"
          inputMode="decimal"
          value={loan}
          onChange={(e) => setLoan(e.target.value)}
        />

        <button id="get-decision" data-testid="get-decision" type="button" onClick={getDecision}>
          Get Decision
        </button>
      </form>

      <section className="result" aria-live="polite">
        <div
          id="decision-badge"
          data-testid="decision-outcome"
          className={`badge badge-${(decision || '').toLowerCase()}`}
          style={hidden(decision)}
        >
          {decision}
        </div>
        <div id="max-borrowing" data-testid="max-borrowing-amount" style={hidden(result)}>
          {result ? formatGbp(result.borrowingPower) : ''}
        </div>
        <div id="referral-guidance" data-testid="referral-guidance" style={hidden(decision === 'Referred')}>
          {decision === 'Referred' ? result.reason : ''}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
