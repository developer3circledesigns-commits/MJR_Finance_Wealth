const E = require('./calculator/engine.js');
const F = require('./calculator/format.js');

let pass = 0, fail = 0;
const results = [];

function check(name, actual, expected, tol) {
  tol = tol === undefined ? 0.01 : tol;
  const diff = Math.abs(actual - expected);
  const ok = diff <= tol;
  if (ok) pass++; else fail++;
  results.push({ name, actual, expected, diff, ok });
}

function checkTrue(name, cond) {
  if (cond) pass++; else { fail++; results.push({ name, actual: cond, expected: true, diff: 0, ok: false }); }
}

function checkStr(name, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++; else { fail++; results.push({ name, actual, expected, diff: 0, ok: false }); }
}

function assertValid(name, obj) {
  let ok = true;
  for (const k in obj) {
    if (typeof obj[k] === 'number' && (isNaN(obj[k]) || !isFinite(obj[k]))) ok = false;
  }
  if (ok) pass++; else { fail++; results.push({ name, actual: 'NaN/Inf', expected: 'valid', diff: 0, ok: false }); }
}

console.log('=== SIP ===');
check('SIP 10000/12%/10y FV', E.calculateSIP({monthlyInvestment:10000,returnRate:12,years:10}).totalValue, 2240358.90, 1);
check('SIP 500/0%/1y FV', E.calculateSIP({monthlyInvestment:500,returnRate:0,years:1}).totalValue, 6000, 0.01);
checkTrue('SIP 10000/15%/20y returns>0', E.calculateSIP({monthlyInvestment:10000,returnRate:15,years:20}).returns > 0);
assertValid('SIP valid', E.calculateSIP({monthlyInvestment:1000,returnRate:12,years:10}));
check('SIP invested', E.calculateSIP({monthlyInvestment:1000,returnRate:12,years:10}).invested, 120000, 0.01);
checkTrue('SIP small >0', E.calculateSIP({monthlyInvestment:100,returnRate:8,years:3}).totalValue > 0);
checkTrue('SIP decimal >0', E.calculateSIP({monthlyInvestment:5000,returnRate:11.5,years:7}).totalValue > 0);
checkTrue('SIP long >0', E.calculateSIP({monthlyInvestment:25000,returnRate:14,years:30}).totalValue > 0);

console.log('=== LUMPSUM ===');
check('LS 100000/12%/10y', E.calculateLumpsum({amount:100000,returnRate:12,years:10}).totalValue, 310584.79, 1);
check('LS 10000/0%/10y', E.calculateLumpsum({amount:10000,returnRate:0,years:10}).totalValue, 10000, 0.01);
check('LS 500000/8%/15y', E.calculateLumpsum({amount:500000,returnRate:8,years:15}).totalValue, 1586084.62, 1);
assertValid('LS valid', E.calculateLumpsum({amount:100000,returnRate:12,years:10}));
check('LS invested', E.calculateLumpsum({amount:100000,returnRate:12,years:10}).invested, 100000, 0.01);
checkTrue('LS decimal >0', E.calculateLumpsum({amount:250000,returnRate:9.5,years:6}).totalValue > 0);
checkTrue('LS small >0', E.calculateLumpsum({amount:1000,returnRate:10,years:1}).totalValue > 0);

console.log('=== SWP ===');
let swp1 = E.calculateSWP({initial:1000000,monthlyWithdrawal:5000,returnRate:8,years:20});
checkTrue('SWP sustainable final>0', swp1.finalBalance > 0);
check('SWP totalWithdrawn', swp1.totalWithdrawn, 1200000, 1);
assertValid('SWP valid', swp1);
let swp2 = E.calculateSWP({initial:100000,monthlyWithdrawal:50000,returnRate:6,years:5});
check('SWP excessive exhausts', swp2.finalBalance, 0, 0.01);
checkTrue('SWP excessive no negative', swp2.finalBalance >= 0);
let swp3 = E.calculateSWP({initial:500000,monthlyWithdrawal:0,returnRate:10,years:10});
check('SWP zero withdrawal grows', swp3.finalBalance, 500000*Math.pow(1.1,10), 1);
let swp4 = E.calculateSWP({initial:1000000,monthlyWithdrawal:10000,returnRate:0,years:10});
check('SWP zero rate exhausts', swp4.finalBalance, 0, 0.01);
checkTrue('SWP totalGrowth valid', isFinite(E.calculateSWP({initial:2000000,monthlyWithdrawal:8000,returnRate:7,years:25}).totalGrowth));

console.log('=== GOAL ===');
let g1 = E.calculateGoal({target:10000000,current:500000,returnRate:12,years:15});
check('GOAL currentFV', g1.currentFV, 500000*Math.pow(1.12,15), 1);
checkTrue('GOAL requiredSIP>0', g1.requiredSIP > 0);
let g2 = E.calculateGoal({target:500000,current:1000000,returnRate:12,years:10});
checkTrue('GOAL no additional', g2.noAdditionalNeeded);
check('GOAL requiredSIP 0', g2.requiredSIP, 0, 0.01);
let g3 = E.calculateGoal({target:2000000,current:0,returnRate:0,years:10});
check('GOAL zero rate SIP', g3.requiredSIP, 2000000/120, 0.01);
assertValid('GOAL valid', g1);

console.log('=== RETIREMENT ===');
let r1 = E.calculateRetirement({currentAge:30,retirementAge:60,lifeExpectancy:85,currentMonthlyExpense:50000,inflationRate:6,returnBefore:12,returnAfter:8,existingInvestment:2000000});
check('RET futureMonthlyExpense', r1.futureMonthlyExpense, 50000*Math.pow(1.06,30), 1);
check('RET yearsToRet', r1.yearsToRetirement, 30, 0.01);
checkTrue('RET requiredCorpus>0', r1.requiredCorpus > 0);
checkTrue('RET monthlySIP finite', isFinite(r1.monthlySIP) && r1.monthlySIP > 0);
assertValid('RET valid', r1);
let r2 = E.calculateRetirement({currentAge:45,retirementAge:60,lifeExpectancy:90,currentMonthlyExpense:100000,inflationRate:7,returnBefore:10,returnAfter:7,existingInvestment:0});
check('RET no existing', r2.fvExisting, 0, 0.01);
check('RET additional=corpus', r2.additionalNeeded, r2.requiredCorpus, 1);
let r3 = E.calculateRetirement({currentAge:55,retirementAge:60,lifeExpectancy:80,currentMonthlyExpense:80000,inflationRate:5,returnBefore:9,returnAfter:6,existingInvestment:5000000});
assertValid('RET high existing', r3);
checkTrue('RET long horizon', E.calculateRetirement({currentAge:25,retirementAge:60,lifeExpectancy:85,currentMonthlyExpense:30000,inflationRate:6,returnBefore:12,returnAfter:8,existingInvestment:100000}).monthlySIP > 0);

console.log('=== INFLATION ===');
check('INF 100000/6%/10y', E.calculateInflation({amount:100000,inflationRate:6,years:10}).futureValue, 179084.77, 1);
check('INF impact', E.calculateInflation({amount:100000,inflationRate:6,years:10}).inflationImpact, 79084.77, 1);
check('INF 0%', E.calculateInflation({amount:50000,inflationRate:0,years:10}).futureValue, 50000, 0.01);
assertValid('INF valid', E.calculateInflation({amount:100000,inflationRate:6,years:10}));
checkTrue('INF decimal >0', E.calculateInflation({amount:250000,inflationRate:5.5,years:7}).futureValue > 0);

console.log('=== FD ===');
check('FD 100000/8%/5y annual', E.calculateFD({principal:100000,interestRate:8,tenure:5,compoundingFrequency:1}).maturityAmount, 100000*Math.pow(1.08,5), 1);
check('FD 100000/8%/5y quarterly', E.calculateFD({principal:100000,interestRate:8,tenure:5,compoundingFrequency:4}).maturityAmount, 100000*Math.pow(1.02,20), 1);
check('FD 0%', E.calculateFD({principal:100000,interestRate:0,tenure:5,compoundingFrequency:4}).maturityAmount, 100000, 0.01);
checkTrue('FD monthly >0', E.calculateFD({principal:50000,interestRate:6,tenure:3,compoundingFrequency:12}).maturityAmount > 0);
assertValid('FD valid', E.calculateFD({principal:100000,interestRate:8,tenure:5,compoundingFrequency:4}));

console.log('=== RD ===');
check('RD 5000/8%/5y', E.calculateRD({monthlyDeposit:5000,interestRate:8,years:5}).maturityAmount, 369309.33, 1);
check('RD deposits', E.calculateRD({monthlyDeposit:5000,interestRate:8,years:5}).deposits, 300000, 0.01);
check('RD 0%', E.calculateRD({monthlyDeposit:5000,interestRate:0,years:5}).maturityAmount, 300000, 0.01);
checkTrue('RD short >0', E.calculateRD({monthlyDeposit:2000,interestRate:7,years:1}).maturityAmount > 0);
checkTrue('RD long >0', E.calculateRD({monthlyDeposit:10000,interestRate:9,years:10}).maturityAmount > 0);
assertValid('RD valid', E.calculateRD({monthlyDeposit:5000,interestRate:8,years:5}));

console.log('=== EMI ===');
check('EMI 1000000/10%/10y', E.calculateEMI({loanAmount:1000000,interestRate:10,tenure:10}).emi, 13215.07, 1);
check('EMI total payment', E.calculateEMI({loanAmount:1000000,interestRate:10,tenure:10}).totalPayment, 13215.073688176193*120, 1);
check('EMI 0%', E.calculateEMI({loanAmount:120000,interestRate:0,tenure:10}).emi, 1000, 0.01);
checkTrue('EMI long tenure >0', E.calculateEMI({loanAmount:5000000,interestRate:8.5,tenure:30}).emi > 0);
assertValid('EMI valid', E.calculateEMI({loanAmount:1000000,interestRate:10,tenure:10}));
let sched = E.emiSchedule(1000000,10,10);
check('EMI sched last closing 0', sched.schedule[sched.schedule.length-1].closingBalance, 0, 0.01);
check('EMI sched count', sched.schedule.length, 120, 0);

console.log('=== INCOME TAX ===');
let t1 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'new',age:30,grossSalary:1500000,otherIncome:0,interestIncome:0,rentalIncome:0});
checkTrue('TAX new 15L >0', t1.totalTaxPayable > 0);
check('TAX new std deduction', t1.totalDeductions, 75000, 0.01);
let t2 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'new',age:30,grossSalary:1000000,otherIncome:0,interestIncome:0,rentalIncome:0});
checkTrue('TAX new 10L >=0', t2.totalTaxPayable >= 0);
let t3 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'old',age:30,grossSalary:1000000,section80C:150000,section80D:25000});
check('TAX old 80C applied', t3.deductionBreakdown.section80C, 150000, 0.01);
let t4 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'old',age:65,grossSalary:400000});
check('TAX old senior taxable', t4.taxableIncome, 350000, 0.01);
let t5 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'new',age:30,grossSalary:1200000,otherIncome:0,interestIncome:0,rentalIncome:0});
check('TAX new rebate at 12L => 0', t5.totalTaxPayable, 0, 0.01);
let t6 = E.calculateIncomeTax({financialYear:'AY2025-26',regime:'new',age:30,grossSalary:600000});
check('TAX AY25 new 6L zero (rebate)', t6.totalTaxPayable, 0, 0.01);
// Required AY 2026-27 test case: salary 10L, 80C 1.5L, New Regime
let t7 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'new',age:30,grossSalary:1000000,section80C:150000});
check('TAX GTI', t7.grossTotalIncome, 1000000, 0.01);
check('TAX std deduction only', t7.standardDeduction, 75000, 0.01);
check('TAX 80C ignored in new regime', t7.section80CApplied, 0, 0.01);
check('TAX total deductions', t7.totalDeductions, 75000, 0.01);
check('TAX taxable income 925000', t7.taxableIncome, 925000, 0.01);
check('TAX before rebate 32500', t7.taxBeforeRebate, 32500, 0.01);
check('TAX 87A rebate 32500', t7.rebate, 32500, 0.01);
check('TAX after rebate 0', t7.incomeTaxAfterRebate, 0, 0.01);
check('TAX cess 0 when tax 0', t7.cess, 0, 0.01);
check('TAX total payable 0', t7.totalTaxPayable, 0, 0.01);
// Same inputs under Old Regime must use eligible deductions
let t8 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'old',age:30,grossSalary:1000000,section80C:150000});
check('TAX old std deduction 50k', t8.standardDeduction, 50000, 0.01);
check('TAX old 80C applied (capped)', t8.deductionBreakdown.section80C, 150000, 0.01);
check('TAX old taxable 800000', t8.taxableIncome, 800000, 0.01);
checkTrue('TAX old tax > new for this case', t8.totalTaxPayable > 0);
// 80C above statutory limit is capped at 150000
let t9 = E.calculateIncomeTax({financialYear:'AY2026-27',regime:'old',age:30,grossSalary:2000000,section80C:300000});
check('TAX old 80C cap 150k', t9.deductionBreakdown.section80C, 150000, 0.01);
assertValid('TAX valid', t1);

console.log('=== FORMAT ===');
checkStr('FMT inr', F.formatINR(100000), '₹1,00,000');
checkStr('FMT inr big', F.formatINR(1250000), '₹12,50,000');
check('FMT parse', F.parseNum('1,00,000'), 100000, 0);
check('FMT parse inr', F.parseNum('₹5,00,000'), 500000, 0);
checkStr('FMT 2dp', F.formatINR(1234.5, 2), '₹1,234.50');

console.log('\n=== SUMMARY ===');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
let failed = results.filter(r => !r.ok);
if (failed.length) {
  console.log('\nFAILURES:');
  failed.forEach(f => console.log(JSON.stringify(f)));
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED (' + pass + ' cases)');
}
