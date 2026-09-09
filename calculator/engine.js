(function (global) {
  'use strict';

  function effectiveMonthlyRate(annualPct) {
    return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
  }

  function nominalMonthlyRate(annualPct) {
    return (annualPct / 12) / 100;
  }

  function annuityDueFactor(monthlyRate, months) {
    if (monthlyRate === 0) return months;
    var f = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    return f * (1 + monthlyRate);
  }

  function calculateSIP(input) {
    var P = Number(input.monthlyInvestment);
    var rate = Number(input.returnRate);
    var years = Number(input.years);
    var n = Math.round(years * 12);
    var invested = P * n;
    var fv;
    if (rate === 0) {
      fv = invested;
    } else {
      var r = effectiveMonthlyRate(rate);
      fv = P * annuityDueFactor(r, n);
    }
    var returns = fv - invested;
    return {
      invested: invested,
      returns: returns,
      totalValue: fv,
      fv: fv
    };
  }

  function calculateLumpsum(input) {
    var P = Number(input.amount);
    var rate = Number(input.returnRate);
    var years = Number(input.years);
    var fv = rate === 0 ? P : P * Math.pow(1 + rate / 100, years);
    var invested = P;
    var returns = fv - invested;
    return {
      invested: invested,
      returns: returns,
      totalValue: fv,
      fv: fv
    };
  }

  function calculateSWP(input) {
    var initial = Number(input.initial);
    var withdrawal = Number(input.monthlyWithdrawal);
    var rate = Number(input.returnRate);
    var years = Number(input.years);
    var n = Math.round(years * 12);
    var r = rate === 0 ? 0 : effectiveMonthlyRate(rate);
    var balance = initial;
    var totalWithdrawn = 0;
    var series = [];
    var monthsRun = 0;
    for (var m = 1; m <= n; m++) {
      balance = balance * (1 + r);
      var w = balance < withdrawal ? balance : withdrawal;
      balance = balance - w;
      totalWithdrawn = totalWithdrawn + w;
      monthsRun = m;
      series.push(balance);
      if (balance <= 0) {
        balance = 0;
        break;
      }
    }
    var finalBalance = balance;
    var totalGrowth = finalBalance + totalWithdrawn - initial;
    return {
      initial: initial,
      monthlyWithdrawal: withdrawal,
      totalWithdrawn: totalWithdrawn,
      finalBalance: finalBalance,
      totalGrowth: totalGrowth,
      monthsRun: monthsRun,
      exhausted: finalBalance <= 0,
      series: series
    };
  }

  function calculateGoal(input) {
    var target = Number(input.target);
    var current = Number(input.current);
    var rate = Number(input.returnRate);
    var years = Number(input.years);
    var n = Math.round(years * 12);
    var currentFV = current * (rate === 0 ? 1 : Math.pow(1 + rate / 100, years));
    var required = target - currentFV;
    var requiredSIP = 0;
    if (required > 0) {
      if (rate === 0) {
        requiredSIP = required / n;
      } else {
        var rm = effectiveMonthlyRate(rate);
        requiredSIP = required / annuityDueFactor(rm, n);
      }
    }
    return {
      target: target,
      current: current,
      currentFV: currentFV,
      required: required,
      requiredSIP: requiredSIP,
      years: years,
      noAdditionalNeeded: required <= 0
    };
  }

  // Central retirement planning calculation. Uses a single, internally
  // consistent methodology: all rates are converted to effective monthly
  // rates exactly once, and the required corpus is a monthly growing annuity
  // (expenses rising with inflation, discounted at the post-retirement
  // monthly return). No annual/monthly mixing, no arbitrary multipliers.
  function calculateRetirement(input) {
    var currentAge = Number(input.currentAge);
    var retirementAge = Number(input.retirementAge);
    var lifeExpectancy = Number(input.lifeExpectancy);
    var currentMonthlyExpense = Number(input.currentMonthlyExpense);
    var inflationRate = Number(input.inflationRate);
    var returnBefore = Number(input.returnBefore);
    var returnAfter = Number(input.returnAfter);
    var existingInvestment = Number(input.existingInvestment);

    // Convert percentages to decimals exactly once.
    var inflation = inflationRate / 100;
    var preReturn = returnBefore / 100;
    var postReturn = returnAfter / 100;

    var yearsToRetirement = retirementAge - currentAge;
    var retirementYears = lifeExpectancy - retirementAge;
    var retirementMonths = retirementYears * 12;

    // Monthly expense at retirement (annual inflation).
    var retirementMonthlyExpense = currentMonthlyExpense * Math.pow(1 + inflation, yearsToRetirement);

    // Effective monthly pre-retirement return (NOT annual/12).
    var monthlyPreReturn = Math.pow(1 + preReturn, 1 / 12) - 1;
    var monthsToRetirement = yearsToRetirement * 12;

    // Future value of existing savings at retirement (monthly compounding).
    var existingSavingsFV = existingInvestment * Math.pow(1 + monthlyPreReturn, monthsToRetirement);

    // Effective monthly post-retirement return and inflation.
    var monthlyPostReturn = Math.pow(1 + postReturn, 1 / 12) - 1;
    var monthlyInflation = Math.pow(1 + inflation, 1 / 12) - 1;

    // Required corpus = present value (at retirement) of a growing monthly annuity.
    var requiredCorpus = 0;
    if (retirementMonths > 0) {
      if (Math.abs(monthlyPostReturn - monthlyInflation) < 1e-12) {
        // Limiting form when post-retirement return equals inflation.
        requiredCorpus = retirementMonthlyExpense * retirementMonths / (1 + monthlyPostReturn);
      } else {
        var ratio = Math.pow((1 + monthlyInflation) / (1 + monthlyPostReturn), retirementMonths);
        requiredCorpus = retirementMonthlyExpense * (1 - ratio) / (monthlyPostReturn - monthlyInflation);
      }
    }

    // Additional corpus required (never negative).
    var additionalCorpus = Math.max(0, requiredCorpus - existingSavingsFV);

    // Required monthly SIP (end-of-month contributions, same rate as savings FV).
    var requiredMonthlySIP = 0;
    if (additionalCorpus > 0 && monthsToRetirement > 0) {
      if (monthlyPreReturn === 0) {
        requiredMonthlySIP = additionalCorpus / monthsToRetirement;
      } else {
        requiredMonthlySIP = additionalCorpus * monthlyPreReturn /
          (Math.pow(1 + monthlyPreReturn, monthsToRetirement) - 1);
      }
    }

    // Never return non-finite / negative values.
    function safe(x) { return (isFinite(x) && x > 0) ? x : 0; }
    retirementMonthlyExpense = isFinite(retirementMonthlyExpense) ? retirementMonthlyExpense : 0;
    existingSavingsFV = isFinite(existingSavingsFV) ? existingSavingsFV : 0;
    requiredCorpus = isFinite(requiredCorpus) ? requiredCorpus : 0;
    additionalCorpus = isFinite(additionalCorpus) ? additionalCorpus : 0;
    requiredMonthlySIP = isFinite(requiredMonthlySIP) ? requiredMonthlySIP : 0;

    return {
      // Spec-standard keys
      yearsToRetirement: yearsToRetirement,
      retirementYears: retirementYears,
      retirementMonths: retirementMonths,
      retirementMonthlyExpense: retirementMonthlyExpense,
      monthlyPreReturn: monthlyPreReturn,
      existingSavingsFV: existingSavingsFV,
      monthlyPostReturn: monthlyPostReturn,
      monthlyInflation: monthlyInflation,
      requiredCorpus: requiredCorpus,
      additionalCorpus: additionalCorpus,
      requiredMonthlySIP: requiredMonthlySIP,
      // Legacy keys consumed by the UI layer
      futureMonthlyExpense: retirementMonthlyExpense,
      futureAnnualExpense: retirementMonthlyExpense * 12,
      fvExisting: existingSavingsFV,
      additionalNeeded: additionalCorpus,
      monthlySIP: requiredMonthlySIP,
      existingInvestment: existingInvestment
    };
  }

  function calculateInflation(input) {
    var amount = Number(input.amount);
    var rate = Number(input.inflationRate);
    var years = Number(input.years);
    var fv = amount * Math.pow(1 + rate / 100, years);
    var impact = fv - amount;
    return {
      amount: amount,
      inflationRate: rate,
      years: years,
      futureValue: fv,
      inflationImpact: impact
    };
  }

  function calculateFD(input) {
    var P = Number(input.principal);
    var rate = Number(input.interestRate);
    var years = Number(input.tenure);
    // Map Groww-style named frequencies to compounding periods per year
    var freqMap = { yearly: 1, annual: 1, halfyearly: 2, 'half-yearly': 2, quarterly: 4, monthly: 12 };
    var raw = input.compoundingFrequency;
    var key = String(raw === undefined ? '' : raw).toLowerCase().replace(/\s+/g, '');
    var n = freqMap[key] !== undefined ? freqMap[key] : Number(raw);
    if (!n || n <= 0) n = 1;
    // A = P (1 + r/n) ^ (n * t)  — standard compound-interest FD formula
    var A = rate === 0 ? P : P * Math.pow(1 + (rate / 100) / n, n * years);
    var interest = A - P;
    return {
      principal: P,
      interestRate: rate,
      tenure: years,
      compoundingFrequency: n,
      interest: interest,
      maturityAmount: A
    };
  }

  function calculateRD(input) {
    var P = Number(input.monthlyDeposit);
    var rate = Number(input.interestRate);
    var years = Number(input.years);
    var n = Math.round(years * 12);
    var M;
    if (rate === 0) {
      M = P * n;
    } else {
      var q = rate / 100 / 4;
      var num = Math.pow(1 + q, 4 * years) - 1;
      var den = 1 - Math.pow(1 + q, -1 / 3);
      M = P * (num / den);
    }
    var deposited = P * n;
    var interest = M - deposited;
    return {
      monthlyDeposit: P,
      interestRate: rate,
      years: years,
      deposits: deposited,
      interest: interest,
      maturityAmount: M
    };
  }

  function calculateEMI(input) {
    var P = Number(input.loanAmount);
    var rate = Number(input.interestRate);
    var years = Number(input.tenure);
    var n = Math.round(years * 12);
    var r = nominalMonthlyRate(rate);
    var emi;
    if (r === 0) {
      emi = P / n;
    } else {
      var pow = Math.pow(1 + r, n);
      emi = (P * r * pow) / (pow - 1);
    }
    var totalPayment = emi * n;
    var totalInterest = totalPayment - P;
    return {
      loanAmount: P,
      interestRate: rate,
      tenure: years,
      emi: emi,
      totalPayment: totalPayment,
      totalInterest: totalInterest,
      months: n
    };
  }

  function emiSchedule(loanAmount, interestRate, tenureYears) {
    var n = Math.round(tenureYears * 12);
    var r = nominalMonthlyRate(interestRate);
    var P = loanAmount;
    var emi;
    if (r === 0) {
      emi = P / n;
    } else {
      var pow = Math.pow(1 + r, n);
      emi = (P * r * pow) / (pow - 1);
    }
    var opening = P;
    var schedule = [];
    var totalPrincipal = 0;
    var totalInterest = 0;
    for (var m = 1; m <= n; m++) {
      var interest = opening * r;
      var principal = emi - interest;
      var closing = opening - principal;
      if (m === n) {
        closing = 0;
        principal = opening;
        interest = emi - principal;
      }
      totalPrincipal = totalPrincipal + principal;
      totalInterest = totalInterest + interest;
      schedule.push({
        month: m,
        openingBalance: opening,
        emi: emi,
        principal: principal,
        interest: interest,
        closingBalance: closing
      });
      opening = closing;
    }
    return { schedule: schedule, emi: emi, totalInterest: totalInterest, totalPayment: emi * n };
  }

  var taxConfigs = {
    'AY2026-27': {
      label: 'FY 2025-26 (AY 2026-27)',
      cess: 0.04,
      regimes: {
        new: {
          label: 'New Tax Regime',
          standardDeduction: 75000,
          basicExemption: { under60: 400000, '60to80': 400000, over80: 400000 },
          rebate: { limit: 1200000, maxRebate: Infinity },
          allowedDeductions: ['standardDeduction'],
          selfOccupiedInterestAllowed: false,
          slabs: [
            { upTo: 400000, rate: 0 },
            { upTo: 800000, rate: 0.05 },
            { upTo: 1200000, rate: 0.10 },
            { upTo: 1600000, rate: 0.15 },
            { upTo: 2000000, rate: 0.20 },
            { upTo: 2400000, rate: 0.25 },
            { upTo: Infinity, rate: 0.30 }
          ],
          surcharge: [
            { upTo: 5000000, rate: 0 },
            { upTo: 10000000, rate: 0.10 },
            { upTo: 20000000, rate: 0.15 },
            { upTo: Infinity, rate: 0.25 }
          ]
        },
        old: {
          label: 'Old Tax Regime',
          standardDeduction: 50000,
          basicExemption: { under60: 250000, '60to80': 300000, over80: 500000 },
          rebate: { limit: 500000, maxRebate: 12500 },
          allowedDeductions: [
            'standardDeduction', 'hra', 'section80C', 'section80CCD1B',
            'section80D', 'section80G', 'section80E', 'section80TTA', 'otherDeductions'
          ],
          selfOccupiedInterestAllowed: true,
          slabs: [
            { upTo: 250000, rate: 0 },
            { upTo: 500000, rate: 0.05 },
            { upTo: 1000000, rate: 0.20 },
            { upTo: Infinity, rate: 0.30 }
          ],
          surcharge: [
            { upTo: 5000000, rate: 0 },
            { upTo: 10000000, rate: 0.10 },
            { upTo: 20000000, rate: 0.15 },
            { upTo: 50000000, rate: 0.25 },
            { upTo: Infinity, rate: 0.37 }
          ]
        }
      }
    },
    'AY2025-26': {
      label: 'FY 2024-25 (AY 2025-26)',
      cess: 0.04,
      regimes: {
        new: {
          label: 'New Tax Regime',
          standardDeduction: 75000,
          basicExemption: { under60: 300000, '60to80': 300000, over80: 300000 },
          rebate: { limit: 700000, maxRebate: 25000 },
          allowedDeductions: ['standardDeduction'],
          selfOccupiedInterestAllowed: false,
          slabs: [
            { upTo: 300000, rate: 0 },
            { upTo: 600000, rate: 0.05 },
            { upTo: 900000, rate: 0.10 },
            { upTo: 1200000, rate: 0.15 },
            { upTo: 1500000, rate: 0.20 },
            { upTo: Infinity, rate: 0.30 }
          ],
          surcharge: [
            { upTo: 5000000, rate: 0 },
            { upTo: 10000000, rate: 0.10 },
            { upTo: 20000000, rate: 0.15 },
            { upTo: Infinity, rate: 0.25 }
          ]
        },
        old: {
          label: 'Old Tax Regime',
          standardDeduction: 50000,
          basicExemption: { under60: 250000, '60to80': 300000, over80: 500000 },
          rebate: { limit: 500000, maxRebate: 12500 },
          allowedDeductions: [
            'standardDeduction', 'hra', 'section80C', 'section80CCD1B',
            'section80D', 'section80G', 'section80E', 'section80TTA', 'otherDeductions'
          ],
          selfOccupiedInterestAllowed: true,
          slabs: [
            { upTo: 250000, rate: 0 },
            { upTo: 500000, rate: 0.05 },
            { upTo: 1000000, rate: 0.20 },
            { upTo: Infinity, rate: 0.30 }
          ],
          surcharge: [
            { upTo: 5000000, rate: 0 },
            { upTo: 10000000, rate: 0.10 },
            { upTo: 20000000, rate: 0.15 },
            { upTo: 50000000, rate: 0.25 },
            { upTo: Infinity, rate: 0.37 }
          ]
        }
      }
    }
  };

  function ageCategory(age) {
    if (age >= 80) return 'over80';
    if (age >= 60) return '60to80';
    return 'under60';
  }

  function slabTax(taxable, slabs) {
    var prev = 0;
    var tax = 0;
    for (var i = 0; i < slabs.length; i++) {
      var s = slabs[i];
      var bracket = Math.min(taxable, s.upTo) - prev;
      if (bracket > 0) {
        tax = tax + bracket * s.rate;
      }
      prev = s.upTo;
      if (taxable <= s.upTo) break;
    }
    return tax;
  }

  function surchargeOn(tax, income, surchargeSlabs) {
    for (var i = 0; i < surchargeSlabs.length; i++) {
      if (income <= surchargeSlabs[i].upTo || surchargeSlabs[i].upTo === Infinity) {
        return tax * surchargeSlabs[i].rate;
      }
    }
    return 0;
  }

  function calculateIncomeTax(input) {
    var fy = input.financialYear || 'AY2026-27';
    var regimeKey = input.regime || 'new';
    var cfg = taxConfigs[fy];
    var regime = cfg.regimes[regimeKey];
    var ageCat = input.ageCategory;
    if (!ageCat) {
      var age = Number(input.age) || 0;
      ageCat = age >= 80 ? 'over80' : (age >= 60 ? '60to80' : 'under60');
    }

    var grossSalary = Number(input.grossSalary) || 0;
    var otherIncome = Number(input.otherIncome) || 0;
    var interestIncome = Number(input.interestIncome) || 0;
    var rentalIncome = Number(input.rentalIncome) || 0;
    // Self-occupied home loan interest u/s 24(b) is NOT allowed under the
    // new regime (only against rental / let-out property).
    var homeLoanSelf = regime.selfOccupiedInterestAllowed === false
      ? 0
      : Math.min(Number(input.homeLoanInterestSelf) || 0, 200000);
    var homeLoanLetOut = Number(input.homeLoanInterestLetOut) || 0;

    // House property income (Section 24): 30% standard deduction on gross rent
    var housePropertyIncome = 0;
    if (rentalIncome > 0) {
      housePropertyIncome = rentalIncome * 0.70 - homeLoanSelf - homeLoanLetOut;
    } else if (homeLoanSelf > 0) {
      housePropertyIncome = -homeLoanSelf; // self-occupied: loss up to 2L
    }
    if (housePropertyIncome < -200000) housePropertyIncome = -200000;

    var grossTotalIncome = grossSalary + otherIncome + interestIncome + housePropertyIncome;

    var deductions = 0;
    var deductionBreakdown = {};
    function add(name, val) {
      if (val > 0) { deductions = deductions + val; deductionBreakdown[name] = val; }
    }

    if (regime.allowedDeductions.indexOf('standardDeduction') !== -1 && grossSalary > 0) {
      add('standardDeduction', Math.min(regime.standardDeduction, grossSalary));
    }
    if (regime.allowedDeductions.indexOf('hra') !== -1) {
      var hraBasic = Number(input.basicSalary) || 0;
      var hraDA = Number(input.da) || 0;
      var hraReceived = Number(input.hraReceived) || 0;
      var hraRent = Number(input.rentPaid) || 0;
      var hraMetro = input.metro === true || input.metro === 'yes' || input.metro === 'Yes';
      var hraExemption = 0;
      if (grossSalary > 0 && (hraReceived > 0 || hraRent > 0)) {
        var hra1 = hraReceived;
        var hra2 = (hraBasic + hraDA) * (hraMetro ? 0.50 : 0.40);
        var hra3 = Math.max(0, hraRent - 0.10 * (hraBasic + hraDA));
        hraExemption = Math.min(hra1, hra2, hra3);
      } else if (input.hra) {
        hraExemption = Number(input.hra) || 0; // backward-compatible flat input
      }
      add('hra', hraExemption);
    }
    if (regime.allowedDeductions.indexOf('section80C') !== -1) {
      add('section80C', Math.min(Number(input.section80C) || 0, 150000));
    }
    if (regime.allowedDeductions.indexOf('section80CCD1B') !== -1) {
      add('section80CCD1B', Math.min(Number(input.section80CCD1B) || 0, 50000));
    }
    if (regime.allowedDeductions.indexOf('section80D') !== -1) {
      add('section80D', Number(input.section80D) || 0);
    }
    if (regime.allowedDeductions.indexOf('section80G') !== -1) {
      add('section80G', Number(input.section80G) || 0);
    }
    if (regime.allowedDeductions.indexOf('section80E') !== -1) {
      add('section80E', Number(input.section80E) || 0);
    }
    if (regime.allowedDeductions.indexOf('section80TTA') !== -1) {
      add('section80TTA', Math.min(Number(input.section80TTA) || 0, 10000));
    }
    // Home loan interest is handled via house property income above
    if (regime.allowedDeductions.indexOf('otherDeductions') !== -1) {
      add('otherDeductions', Number(input.otherDeductions) || 0);
    }

    var taxableIncome = grossTotalIncome - deductions;
    var basicEx = regime.basicExemption[ageCat];
    if (taxableIncome < basicEx) taxableIncome = 0;

    var taxBeforeRebate = slabTax(taxableIncome, regime.slabs);

    var rebate = 0;
    var rb = regime.rebate;
    if (taxableIncome <= rb.limit) {
      rebate = Math.min(taxBeforeRebate, rb.maxRebate === Infinity ? taxBeforeRebate : rb.maxRebate);
    } else if (taxBeforeRebate > 0 && taxableIncome <= rb.limit + taxBeforeRebate) {
      rebate = taxBeforeRebate - (taxableIncome - rb.limit); // marginal relief
    }
    if (rebate < 0) rebate = 0;
    var taxAfterRebate = Math.max(0, taxBeforeRebate - rebate);

    var surcharge = surchargeOn(taxAfterRebate, taxableIncome, regime.surcharge);
    var taxPlusSurcharge = taxAfterRebate + surcharge;
    var cess = taxPlusSurcharge * cfg.cess;
    var totalTax = taxPlusSurcharge + cess;

    return {
      financialYear: fy,
      regime: regimeKey,
      regimeLabel: regime.label,
      ageCategory: ageCat,
      grossTotalIncome: grossTotalIncome,
      housePropertyIncome: housePropertyIncome,
      hraExemption: deductionBreakdown.hra || 0,
      standardDeduction: deductionBreakdown.standardDeduction || 0,
      section80CApplied: deductionBreakdown.section80C || 0,
      totalDeductions: deductions,
      deductionBreakdown: deductionBreakdown,
      taxableIncome: taxableIncome,
      taxBeforeRebate: taxBeforeRebate,
      rebate: rebate,
      incomeTaxAfterRebate: taxAfterRebate,
      surcharge: surcharge,
      cess: cess,
      totalTaxPayable: totalTax,
      effectiveRate: taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0
    };
  }

  var engine = {
    effectiveMonthlyRate: effectiveMonthlyRate,
    nominalMonthlyRate: nominalMonthlyRate,
    annuityDueFactor: annuityDueFactor,
    calculateSIP: calculateSIP,
    calculateLumpsum: calculateLumpsum,
    calculateSWP: calculateSWP,
    calculateGoal: calculateGoal,
    calculateRetirement: calculateRetirement,
    calculateRetirementPlan: calculateRetirement,
    calculateInflation: calculateInflation,
    calculateFD: calculateFD,
    calculateRD: calculateRD,
    calculateEMI: calculateEMI,
    emiSchedule: emiSchedule,
    calculateIncomeTax: calculateIncomeTax,
    taxConfigs: taxConfigs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  }
  if (global) {
    global.CalcEngine = engine;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
