(function () {
  'use strict';

  var E = window.CalcEngine;
  var F = window.CalcFormat;
  var C = window.CalcCharts;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function fmtVal(v, fmt) {
    if (fmt === 'inr') return F.formatINR(v);
    if (fmt === 'inr2') return F.formatINR(v, 2);
    if (fmt === 'num') return F.formatNumber(v);
    if (fmt === 'num2') return F.formatNumber(v, 2);
    if (fmt === 'percent') return F.formatPercent(v);
    return String(v);
  }

  var ICONS = {
    sip: 'bi-graph-up-arrow', lumpsum: 'bi-cash-stack', swp: 'bi-arrow-down-circle',
    goal: 'bi-bullseye', retirement: 'bi-bank', inflation: 'bi-receipt',
    tax: 'bi-calculator', fd: 'bi-piggy-bank', rd: 'bi-currency-rupee', emi: 'bi-house-door'
  };

  var configs = {
    sip: {
      title: 'SIP Calculator',
      desc: 'Estimate the future value of your monthly Systematic Investment Plan contributions using the effective monthly compounding rate.',
      fields: [
        { name: 'monthlyInvestment', label: 'Monthly Investment (₹)', min: 100, max: 100000, step: 500, placeholder: 'e.g. 5000', unit: '₹' },
        { name: 'returnRate', label: 'Expected Return Rate (% p.a.)', min: 1, max: 30, step: 0.5, placeholder: 'e.g. 12', unit: '%' },
        { name: 'years', label: 'Investment Duration (Years)', min: 1, max: 40, step: 1, placeholder: 'e.g. 10', unit: 'Yr' }
      ],
      outputs: [
        { key: 'invested', label: 'Invested Amount', fmt: 'inr' },
        { key: 'returns', label: 'Estimated Returns', fmt: 'inr' },
        { key: 'totalValue', label: 'Total Value', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateSIP(v); },
      render: function (r, ctx) {
        C.renderDonut(ctx.chart,
          [
            { label: 'Invested', value: r.invested, color: '#0E4DA4', display: F.formatINR(r.invested) },
            { label: 'Returns', value: r.returns, color: '#57A635', display: F.formatINR(r.returns) }
          ],
          { centerLabel: 'Total Value', centerValue: F.formatINR(r.totalValue) });
      }
    },

    lumpsum: {
      title: 'Lumpsum Calculator',
      desc: 'Calculate the maturity value of a one-time investment with annual compounding.',
      fields: [
        { name: 'amount', label: 'Investment Amount (₹)', min: 1000, max: 10000000, step: 1000, placeholder: 'e.g. 100000', unit: '₹' },
        { name: 'returnRate', label: 'Expected Return Rate (% p.a.)', min: 1, max: 30, step: 0.5, placeholder: 'e.g. 12', unit: '%' },
        { name: 'years', label: 'Investment Duration (Years)', min: 1, max: 40, step: 1, placeholder: 'e.g. 10', unit: 'Yr' }
      ],
      outputs: [
        { key: 'invested', label: 'Invested Amount', fmt: 'inr' },
        { key: 'returns', label: 'Estimated Returns', fmt: 'inr' },
        { key: 'totalValue', label: 'Total Value', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateLumpsum(v); },
      render: function (r, ctx) {
        C.renderDonut(ctx.chart,
          [
            { label: 'Invested', value: r.invested, color: '#0E4DA4', display: F.formatINR(r.invested) },
            { label: 'Returns', value: r.returns, color: '#57A635', display: F.formatINR(r.returns) }
          ],
          { centerLabel: 'Total Value', centerValue: F.formatINR(r.totalValue) });
      }
    },

    swp: {
      title: 'SWP Calculator',
      desc: 'Find out how long your corpus lasts and the total amount withdrawn under a Systematic Withdrawal Plan.',
      fields: [
        { name: 'initial', label: 'Initial Investment (₹)', min: 10000, max: 50000000, step: 10000, placeholder: 'e.g. 1000000', unit: '₹' },
        { name: 'monthlyWithdrawal', label: 'Monthly Withdrawal (₹)', min: 100, max: 500000, step: 500, placeholder: 'e.g. 5000', unit: '₹' },
        { name: 'returnRate', label: 'Expected Return Rate (% p.a.)', min: 0, max: 30, step: 0.5, placeholder: 'e.g. 8', unit: '%' },
        { name: 'years', label: 'Withdrawal Period (Years)', min: 1, max: 50, step: 1, placeholder: 'e.g. 20', unit: 'Yr' }
      ],
      outputs: [
        { key: 'totalWithdrawn', label: 'Total Withdrawn', fmt: 'inr' },
        { key: 'finalBalance', label: 'Final Balance', fmt: 'inr' },
        { key: 'totalGrowth', label: 'Total Growth', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateSWP(v); },
      render: function (r, ctx) {
        var points = r.series.map(function (b, i) { return { value: b }; });
        C.renderLine(ctx.chart, [{ points: points }], { colors: ['#0E4DA4'], height: 240 });
        ctx.note.innerHTML = r.exhausted
          ? '<div style="font-size:13px;color:#a30000;margin-top:8px;">Corpus exhausted in ' + r.monthsRun + ' months. Withdrawals exceeded sustainable levels.</div>'
          : '';
      }
    },

    goal: {
      title: 'Goal Based Investment Calculator',
      desc: 'Work out the monthly SIP required to reach your target corpus, accounting for your current investments.',
      fields: [
        { name: 'target', label: 'Target Amount (₹)', min: 100000, max: 100000000, step: 100000, placeholder: 'e.g. 10000000', unit: '₹' },
        { name: 'current', label: 'Current Investment (₹)', min: 0, max: 100000000, step: 100000, placeholder: 'e.g. 500000', unit: '₹' },
        { name: 'returnRate', label: 'Expected Return Rate (% p.a.)', min: 1, max: 30, step: 0.5, placeholder: 'e.g. 12', unit: '%' },
        { name: 'years', label: 'Time to Goal (Years)', min: 1, max: 40, step: 1, placeholder: 'e.g. 15', unit: 'Yr' }
      ],
      outputs: [
        { key: 'currentFV', label: 'Future Value of Current Investment', fmt: 'inr' },
        { key: 'required', label: 'Additional Amount Required', fmt: 'inr' },
        { key: 'requiredSIP', label: 'Required Monthly SIP', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateGoal(v); },
      render: function (r, ctx) {
        C.renderBar(ctx.chart, [
          { label: 'Current FV', value: r.currentFV, color: '#57A635' },
          { label: 'Required', value: Math.max(r.required, 0), color: '#0E4DA4' },
          { label: 'Target', value: r.target, color: '#8DC63F' }
        ], { height: 240 });
        ctx.note.innerHTML = r.noAdditionalNeeded
          ? '<div style="font-size:13px;color:#2e7d32;margin-top:8px;">Your current investment already covers the goal — no additional SIP required.</div>'
          : '';
      }
    },

    retirement: {
      title: 'Retirement Planning Calculator',
      desc: 'Estimate the corpus you need at retirement and the monthly investment required to build it.',
      fields: [
        { name: 'currentAge', label: 'Current Age (Years)', min: 18, max: 70, step: 1, placeholder: 'e.g. 30', unit: 'Yr' },
        { name: 'retirementAge', label: 'Retirement Age (Years)', min: 40, max: 80, step: 1, placeholder: 'e.g. 60', unit: 'Yr' },
        { name: 'lifeExpectancy', label: 'Life Expectancy (Years)', min: 60, max: 100, step: 1, placeholder: 'e.g. 85', unit: 'Yr' },
        { name: 'currentMonthlyExpense', label: 'Current Monthly Expenses (₹)', min: 5000, max: 1000000, step: 1000, placeholder: 'e.g. 50000', unit: '₹' },
        { name: 'inflationRate', label: 'Inflation Rate (% p.a.)', min: 1, max: 15, step: 0.5, placeholder: 'e.g. 6', unit: '%' },
        { name: 'returnBefore', label: 'Expected Return Before Retirement (% p.a.)', min: 1, max: 25, step: 0.5, placeholder: 'e.g. 12', unit: '%' },
        { name: 'returnAfter', label: 'Expected Return After Retirement (% p.a.)', min: 1, max: 20, step: 0.5, placeholder: 'e.g. 8', unit: '%' },
        { name: 'existingInvestment', label: 'Existing Investment / Savings (₹)', min: 0, max: 100000000, step: 100000, placeholder: 'e.g. 2000000', unit: '₹' }
      ],
      outputs: [
        { key: 'futureMonthlyExpense', label: 'Future Monthly Expense', fmt: 'inr' },
        { key: 'requiredCorpus', label: 'Required Retirement Corpus', fmt: 'inr' },
        { key: 'monthlySIP', label: 'Monthly Investment Required', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateRetirement(v); },
      render: function (r, ctx) {
        C.renderBar(ctx.chart, [
          { label: 'From Existing', value: r.fvExisting, color: '#57A635' },
          { label: 'Additional', value: r.additionalNeeded, color: '#0E4DA4' }
        ], { height: 220 });
        var issues = [];
        if (r.yearsToRetirement <= 0) issues.push('Retirement age must be greater than current age.');
        if (r.retirementYears <= 0) issues.push('Life expectancy must be greater than retirement age.');
        ctx.note.innerHTML = issues.length ? '<div style="font-size:13px;color:#a30000;margin-top:8px;">' + issues.join(' ') + '</div>' : '';
      }
    },

    inflation: {
      title: 'Inflation Calculator',
      desc: 'See how the purchasing power of your money changes over time due to inflation.',
      fields: [
        { name: 'amount', label: 'Current Amount (₹)', min: 1000, max: 100000000, step: 1000, placeholder: 'e.g. 100000', unit: '₹' },
        { name: 'inflationRate', label: 'Inflation Rate (% p.a.)', min: 1, max: 20, step: 0.5, placeholder: 'e.g. 6', unit: '%' },
        { name: 'years', label: 'Time Period (Years)', min: 1, max: 50, step: 1, placeholder: 'e.g. 10', unit: 'Yr' }
      ],
      outputs: [
        { key: 'futureValue', label: 'Future Value', fmt: 'inr' },
        { key: 'inflationImpact', label: 'Inflation Impact', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateInflation(v); },
      render: function (r, ctx) {
        C.renderDonut(ctx.chart, [
          { label: 'Current Amount', value: r.amount, color: '#0E4DA4', display: F.formatINR(r.amount) },
          { label: 'Inflation Impact', value: r.inflationImpact, color: '#8DC63F', display: F.formatINR(r.inflationImpact) }
        ], { centerLabel: 'Future Value', centerValue: F.formatINR(r.futureValue) });
      }
    },

    tax: {
      title: 'Income Tax Calculator',
      desc: 'Estimate your tax liability under the old or new regime using configurable FY slab rules.',
      fields: [
        { name: 'financialYear', label: 'Assessment Year', type: 'select', options: [{ v: 'AY2026-27', t: 'AY 2026-27 (FY 2025-26)' }, { v: 'AY2025-26', t: 'AY 2025-26 (FY 2024-25)' }], value: 'AY2026-27' },
        { name: 'regime', label: 'Tax Regime', type: 'select', options: [{ v: 'new', t: 'New Tax Regime' }, { v: 'old', t: 'Old Tax Regime' }], value: 'new' },
        { name: 'ageCategory', label: 'Age Category', type: 'select', options: [{ v: 'under60', t: 'Below 60' }, { v: '60to80', t: '60 or Above 60' }, { v: 'over80', t: '80 or Above 80' }], value: 'under60' },
        { name: 'grossSalary', label: 'Gross Salary Income (₹ per Annum)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 1500000', unit: '₹' },
        { name: 'otherIncome', label: 'Annual Income from Other Sources (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'interestIncome', label: 'Annual Income from Interest (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'rentalIncome', label: 'Annual Rental Income — Let-out House Property (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'homeLoanInterestSelf', label: 'Home Loan Interest Paid — Self-occupied (₹ per Annum)', min: 0, max: 200000, step: 5000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'homeLoanInterestLetOut', label: 'Home Loan Interest Paid — Let-out (₹ per Annum)', min: 0, max: 2000000, step: 5000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'section80C', label: 'Basic Deductions u/s 80C (₹, max ₹1,50,000)', min: 0, max: 150000, step: 1000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'section80CCD1B', label: 'NPS Contribution u/s 80CCD(1B) (₹, max ₹50,000)', min: 0, max: 50000, step: 1000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'section80D', label: 'Medical Insurance Premium u/s 80D (₹)', min: 0, max: 100000, step: 1000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'section80G', label: 'Donations to Charity u/s 80G (₹)', min: 0, max: 100000, step: 1000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'section80E', label: 'Interest on Education Loan u/s 80E (₹)', min: 0, max: 100000, step: 1000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'section80TTA', label: 'Savings Interest u/s 80TTA/TTB (₹, max ₹10,000)', min: 0, max: 10000, step: 500, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'basicSalary', label: 'Basic Salary per Annum — for HRA (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'da', label: 'Dearness Allowance per Annum — for HRA (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'hraReceived', label: 'HRA Received per Annum (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'rentPaid', label: 'Total Rent Paid per Annum (₹)', min: 0, max: 100000000, step: 10000, placeholder: 'e.g. 0', unit: '₹' },
        { name: 'metro', label: 'Do you live in a Metro City?', type: 'select', options: [{ v: 'yes', t: 'Yes' }, { v: 'no', t: 'No' }], value: 'no' }
      ],
      outputs: [
        { key: 'grossTotalIncome', label: 'Gross Total Income', fmt: 'inr' },
        { key: 'standardDeduction', label: 'Standard Deduction (Salary)', fmt: 'inr' },
        { key: 'section80CApplied', label: 'Deduction u/s 80C Applied', fmt: 'inr' },
        { key: 'totalDeductions', label: 'Total Eligible Deductions', fmt: 'inr' },
        { key: 'taxableIncome', label: 'Taxable Income', fmt: 'inr' },
        { key: 'taxBeforeRebate', label: 'Tax Before Rebate (Slab Tax)', fmt: 'inr' },
        { key: 'rebate', label: 'Rebate u/s 87A', fmt: 'inr' },
        { key: 'incomeTaxAfterRebate', label: 'Income Tax After Rebate', fmt: 'inr' },
        { key: 'cess', label: 'Health & Education Cess (4%)', fmt: 'inr' },
        { key: 'totalTaxPayable', label: 'Total Tax Payable', fmt: 'inr', highlight: true },
        { key: 'effectiveRate', label: 'Effective Rate', fmt: 'percent' }
      ],
      compute: function (v) { return E.calculateIncomeTax(v); },
      render: function (r, ctx) {
        var postTax = r.grossTotalIncome - r.totalTaxPayable;
        C.renderDonut(ctx.chart, [
          { label: 'Tax Payable', value: Math.max(r.totalTaxPayable, 0), color: '#0E4DA4', display: F.formatINR(r.totalTaxPayable) },
          { label: 'Post-Tax Income', value: Math.max(postTax, 0), color: '#57A635', display: F.formatINR(postTax) }
        ], { centerLabel: 'Tax Payable', centerValue: F.formatINR(r.totalTaxPayable) });

        var dd = r.deductionBreakdown || {};
        var parts = [];
        if (dd.standardDeduction) parts.push('Standard Deduction u/s 16(ia): <strong>' + F.formatINR(dd.standardDeduction) + '</strong>');
        if (dd.hra) parts.push('HRA Exemption: <strong>' + F.formatINR(dd.hra) + '</strong>');
        if (dd.section80C) parts.push('80C: <strong>' + F.formatINR(dd.section80C) + '</strong>');
        if (dd.section80CCD1B) parts.push('80CCD(1B): <strong>' + F.formatINR(dd.section80CCD1B) + '</strong>');
        if (dd.section80D) parts.push('80D: <strong>' + F.formatINR(dd.section80D) + '</strong>');
        if (dd.otherDeductions) parts.push('Other: <strong>' + F.formatINR(dd.otherDeductions) + '</strong>');
        var naMsg = r.regime === 'new'
          ? '<div style="font-size:13px;color:#a30000;margin-top:6px;">80C, HRA and Chapter VI-A deductions are not applicable under the New Tax Regime — only the Standard Deduction of ₹75,000 has been applied.</div>'
          : '';
        ctx.note.innerHTML =
          '<div style="font-size:13px;color:var(--muted);margin-top:10px;line-height:1.7;">' +
          '<strong>' + (r.regimeLabel || (r.regime === 'new' ? 'New Tax Regime' : 'Old Tax Regime')) + '</strong> — deductions applied:' +
          (parts.length ? '<br>' + parts.join(' &nbsp;|&nbsp; ') : '<br>None') +
          '</div>' + naMsg +
          '<div style="font-size:13px;color:var(--muted);margin-top:8px;line-height:1.7;">' +
          'Tax before rebate: <strong>' + F.formatINR(r.taxBeforeRebate) + '</strong> &minus; 87A Rebate: <strong>' + F.formatINR(r.rebate) + '</strong><br>' +
          (r.surcharge ? 'Surcharge: <strong>' + F.formatINR(r.surcharge) + '</strong> &nbsp;|&nbsp; ' : '') +
          'Health &amp; Education Cess (4%): <strong>' + F.formatINR(r.cess) + '</strong></div>';
      }
    },

    fd: {
      title: 'FD Calculator',
      desc: 'Calculate the maturity amount of a Fixed Deposit with your chosen compounding frequency.',
      fields: [
        { name: 'principal', label: 'Principal Amount (₹)', min: 1000, max: 100000000, step: 1000, placeholder: 'e.g. 100000', unit: '₹' },
        { name: 'interestRate', label: 'Interest Rate (% p.a.)', min: 1, max: 15, step: 0.1, placeholder: 'e.g. 8', unit: '%' },
        { name: 'tenure', label: 'Tenure (Years)', min: 0.5, max: 30, step: 0.5, placeholder: 'e.g. 5', unit: 'Yr' },
        { name: 'compoundingFrequency', label: 'Compounding Frequency', type: 'select', options: [{ v: 'yearly', t: 'Yearly' }, { v: 'halfYearly', t: 'Half-Yearly' }, { v: 'quarterly', t: 'Quarterly' }, { v: 'monthly', t: 'Monthly' }], value: 'quarterly' }
      ],
      outputs: [
        { key: 'principal', label: 'Principal Amount', fmt: 'inr' },
        { key: 'interest', label: 'Interest Earned', fmt: 'inr' },
        { key: 'maturityAmount', label: 'Maturity Amount', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateFD(v); },
      render: function (r, ctx) {
        C.renderDonut(ctx.chart, [
          { label: 'Principal', value: r.principal, color: '#0E4DA4', display: F.formatINR(r.principal) },
          { label: 'Interest', value: r.interest, color: '#57A635', display: F.formatINR(r.interest) }
        ], { centerLabel: 'Maturity', centerValue: F.formatINR(r.maturityAmount) });
      }
    },

    rd: {
      title: 'RD Calculator',
      desc: 'Calculate the maturity value of a Recurring Deposit with quarterly compounding of monthly deposits.',
      fields: [
        { name: 'monthlyDeposit', label: 'Monthly Deposit (₹)', min: 100, max: 1000000, step: 500, placeholder: 'e.g. 5000', unit: '₹' },
        { name: 'interestRate', label: 'Interest Rate (% p.a.)', min: 1, max: 15, step: 0.1, placeholder: 'e.g. 8', unit: '%' },
        { name: 'years', label: 'Tenure (Years)', min: 0.5, max: 30, step: 0.5, placeholder: 'e.g. 5', unit: 'Yr' }
      ],
      outputs: [
        { key: 'deposits', label: 'Total Deposited', fmt: 'inr' },
        { key: 'interest', label: 'Total Interest', fmt: 'inr' },
        { key: 'maturityAmount', label: 'Maturity Amount', fmt: 'inr', highlight: true }
      ],
      compute: function (v) { return E.calculateRD(v); },
      render: function (r, ctx) {
        C.renderDonut(ctx.chart, [
          { label: 'Deposits', value: r.deposits, color: '#0E4DA4', display: F.formatINR(r.deposits) },
          { label: 'Interest', value: r.interest, color: '#57A635', display: F.formatINR(r.interest) }
        ], { centerLabel: 'Maturity', centerValue: F.formatINR(r.maturityAmount) });
      }
    },

    emi: {
      title: 'EMI Calculator',
      desc: 'Calculate your Equated Monthly Installment, total interest and view the full amortization schedule.',
      fields: [
        { name: 'loanAmount', label: 'Loan Amount (₹)', min: 10000, max: 100000000, step: 10000, placeholder: 'e.g. 1000000', unit: '₹' },
        { name: 'interestRate', label: 'Interest Rate (% p.a.)', min: 1, max: 20, step: 0.1, placeholder: 'e.g. 10', unit: '%' },
        { name: 'tenure', label: 'Loan Tenure (Years)', min: 1, max: 30, step: 1, placeholder: 'e.g. 10', unit: 'Yr' }
      ],
      outputs: [
        { key: 'emi', label: 'Monthly EMI', fmt: 'inr' },
        { key: 'totalInterest', label: 'Total Interest', fmt: 'inr' },
        { key: 'totalPayment', label: 'Total Payment', fmt: 'inr', highlight: true }
      ],
      schedule: true,
      compute: function (v) { return E.calculateEMI(v); },
      render: function (r, ctx) {
        C.renderDonut(ctx.chart, [
          { label: 'Principal', value: r.loanAmount, color: '#0E4DA4', display: F.formatINR(r.loanAmount) },
          { label: 'Interest', value: r.totalInterest, color: '#57A635', display: F.formatINR(r.totalInterest) }
        ], { centerLabel: 'EMI', centerValue: F.formatINR(r.emi, 2) });
        if (ctx.scheduleEl) {
          var sched = E.emiSchedule(r.loanAmount, r.interestRate, r.tenure).schedule;
          var rows = sched.map(function (s) {
            return '<tr><td>' + s.month + '</td><td>' + F.formatINR(s.openingBalance, 2) + '</td><td>' + F.formatINR(s.emi, 2) +
              '</td><td>' + F.formatINR(s.principal, 2) + '</td><td>' + F.formatINR(s.interest, 2) + '</td><td>' + F.formatINR(s.closingBalance, 2) + '</td></tr>';
          }).join('');
          ctx.scheduleEl.innerHTML =
            '<div class="schedule-wrap"><table class="sched"><thead><tr><th>Month</th><th>Opening</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Closing</th></tr></thead><tbody>' +
            rows + '</tbody></table></div>';
        }
      }
    }
  };

  var ORDER = ['sip', 'lumpsum', 'swp', 'goal', 'retirement', 'inflation', 'tax', 'fd', 'rd', 'emi'];

  var state = {};

  function buildField(cfg, field) {
    var wrap = el('div', 'field');
    var fl = el('div', 'field-label');
    fl.appendChild(el('span', 'lbl', field.label));
    var val = el('span', 'val');
    fl.appendChild(val);
    wrap.appendChild(fl);

    if (field.type === 'select') {
      var sel = el('select', 'num');
      sel.dataset.field = field.name;
      field.options.forEach(function (o) {
        var opt = el('option', null, o.t);
        opt.value = o.v;
        if (String(o.v) === String(field.value)) opt.selected = true;
        sel.appendChild(opt);
      });
      wrap.appendChild(sel);
      val.textContent = sel.options[sel.selectedIndex].text;
    } else {
      var slider = el('input');
      slider.type = 'range';
      slider.className = 'slider';
      slider.dataset.field = field.name;
      slider.min = field.min; slider.max = field.max; slider.step = field.step;
      slider.value = field.min !== undefined ? field.min : 0;
      wrap.appendChild(slider);

      var irow = el('div', 'field-inputrow');
      var num = el('input', 'num');
      num.type = 'number';
      num.dataset.field = field.name;
      num.min = field.min; num.max = field.max; num.step = field.step;
      num.placeholder = field.placeholder || '';
      irow.appendChild(num);
      wrap.appendChild(irow);
    }
    wrap.appendChild(el('div', 'field-note'));
    return wrap;
  }

  var TAX_NEW_EXCLUDED = [
    'section80C', 'section80CCD1B', 'section80D', 'section80G', 'section80E',
    'section80TTA', 'basicSalary', 'da', 'hraReceived', 'rentPaid', 'metro',
    'homeLoanInterestSelf'
  ];

  function updateTaxFieldStates(panel, regime) {
    var isNew = regime === 'new';
    TAX_NEW_EXCLUDED.forEach(function (name) {
      panel.querySelectorAll('[data-field="' + name + '"]').forEach(function (n) {
        n.disabled = isNew;
      });
      var sample = panel.querySelector('[data-field="' + name + '"]');
      var fwrap = sample ? sample.closest('.field') : null;
      if (fwrap) {
        fwrap.classList.toggle('field-na', isNew);
        var note = fwrap.querySelector('.field-note');
        if (note) note.textContent = isNew ? 'Not applicable under New Tax Regime' : '';
      }
    });
  }

  function buildPanel(key) {
    var cfg = configs[key];
    var panel = el('section', 'calc-panel');
    panel.id = 'panel-' + key;
    panel.dataset.calc = key;

    var head = el('div', 'calc-head');
    head.appendChild(el('h1', null, '<i class="bi ' + ICONS[key] + '"></i>&nbsp; ' + cfg.title));
    head.appendChild(el('p', null, cfg.desc));
    panel.appendChild(head);

    var body = el('div', 'calc-body');

    var left = el('div', 'card');
    left.appendChild(el('h3', null, 'Inputs'));
    cfg.fields.forEach(function (f) { left.appendChild(buildField(cfg, f)); });
    body.appendChild(left);

    var right = el('div', 'card');
    right.appendChild(el('h3', null, 'Results'));
    var rgrid = el('div', 'result-grid');
    cfg.outputs.forEach(function (o) {
      var rc = el('div', 'rcard' + (o.highlight ? ' highlight' : ''));
      rc.appendChild(el('div', 'rlabel', o.label));
      var rv = el('div', 'rval');
      rv.dataset.out = o.key;
      rc.appendChild(rv);
      rgrid.appendChild(rc);
    });
    right.appendChild(rgrid);

    var note = el('div');
    note.dataset.note = '1';
    right.appendChild(note);

    var chart = el('div', 'chart-box');
    right.appendChild(chart);

    var err = el('div', 'validation');
    right.appendChild(err);

    var schedule = null;
    if (cfg.schedule) {
      schedule = el('div');
      schedule.dataset.schedule = '1';
      right.appendChild(schedule);
    }

    body.appendChild(right);
    panel.appendChild(body);

    panel._refs = { chart: chart, err: err, note: note, schedule: schedule };
    return panel;
  }

  function recompute(key) {
    var cfg = configs[key];
    var panel = document.getElementById('panel-' + key);
    var refs = panel._refs;

    var values = {};
    var rules = [];
    var selectValues = {};
    cfg.fields.forEach(function (f) {
      var node = f.type === 'select'
        ? panel.querySelector('select[data-field="' + f.name + '"]')
        : panel.querySelector('input[type="number"][data-field="' + f.name + '"]');
      var raw = node ? node.value : '';
      if (f.type === 'select') {
        selectValues[f.name] = raw;
        return;
      }
      values[f.name] = raw;
      rules.push({ name: f.name, label: f.label, min: f.min, max: f.max, required: true });
    });

    if (key === 'tax') {
      updateTaxFieldStates(panel, selectValues.regime || 'new');
    }

    if (!panel._touched) {
      refs.err.classList.remove('show');
      cfg.outputs.forEach(function (o) {
        var node = panel.querySelector('[data-out="' + o.key + '"]');
        if (node) node.textContent = '—';
      });
      refs.note.innerHTML = '<div style="font-size:13px;color:var(--muted);margin-top:10px;">Enter your details above to see the results.</div>';
      return;
    }

    var v = F.validate(values, rules);
    if (!v.valid) {
      refs.err.textContent = v.errors[0];
      refs.err.classList.add('show');
      return;
    }
    for (var sk in selectValues) {
      if (selectValues.hasOwnProperty(sk)) v.values[sk] = selectValues[sk];
    }
    refs.err.classList.remove('show');

    var result;
    try {
      result = cfg.compute(v.values);
    } catch (e) {
      refs.err.textContent = 'Calculation error.';
      refs.err.classList.add('show');
      return;
    }

    cfg.outputs.forEach(function (o) {
      var node = panel.querySelector('[data-out="' + o.key + '"]');
      if (node && result[o.key] !== undefined) node.textContent = fmtVal(result[o.key], o.fmt);
    });

    cfg.render(result, { chart: refs.chart, note: refs.note, schedule: refs.schedule });
  }

  function syncField(panel, name, value) {
    var nodes = panel.querySelectorAll('[data-field="' + name + '"]');
    nodes.forEach(function (n) {
      if (n.type === 'range') {
        n.value = value === '' ? (n.min || 0) : value;
      } else if (n.value !== String(value)) {
        n.value = value;
      }
    });
    var cfg = configs[panel.dataset.calc];
    var field = cfg.fields.filter(function (f) { return f.name === name; })[0];
    var valNode = panel.querySelector('.field [data-field="' + name + '"]');
    var labelNode = valNode ? valNode.closest('.field').querySelector('.val') : null;
    if (labelNode && field && field.type === 'select') {
      var sel = panel.querySelector('select[data-field="' + name + '"]');
      labelNode.textContent = sel ? sel.options[sel.selectedIndex].text : value;
    } else if (labelNode && field) {
      labelNode.textContent = value === ''
        ? ''
        : (field.unit === '₹' ? F.formatINR(value) : F.formatNumber(value)) + (field.unit && field.unit !== '₹' ? ' ' + field.unit : '');
    }
  }

  function bindPanel(key) {
    var panel = document.getElementById('panel-' + key);
    panel.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.dataset || !t.dataset.field) return;
      panel._touched = true;
      syncField(panel, t.dataset.field, t.value);
      recompute(key);
    });
    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (!t.dataset || !t.dataset.field) return;
      if (t.type !== 'range') panel._touched = true;
      syncField(panel, t.dataset.field, t.value);
      recompute(key);
    });
  }

  function activate(key) {
    ORDER.forEach(function (k) {
      var p = document.getElementById('panel-' + k);
      var s = document.querySelector('.side-link[data-calc="' + k + '"]');
      if (k === key) { p.classList.add('active'); s.classList.add('active'); }
      else { p.classList.remove('active'); s.classList.remove('active'); }
    });
    if (location.hash !== '#' + key) {
      history.replaceState(null, '', '#' + key);
    }
  }

  function init() {
    var sidebar = document.getElementById('sidebar');
    var root = document.getElementById('calc-root');

    ORDER.forEach(function (key) {
      var cfg = configs[key];
      var link = el('div', 'side-link');
      link.dataset.calc = key;
      link.innerHTML = '<i class="bi ' + ICONS[key] + '"></i><span>' + cfg.title.replace(' Calculator', '') + '</span>';
      link.addEventListener('click', function () { activate(key); });
      sidebar.appendChild(link);

      var panel = buildPanel(key);
      root.appendChild(panel);
      bindPanel(key);
      recompute(key);
    });

    var initial = location.hash.replace('#', '');
    if (ORDER.indexOf(initial) === -1) initial = 'sip';
    activate(initial);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
