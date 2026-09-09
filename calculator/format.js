(function (global) {
  'use strict';

  var inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });

  var inrFormatter2 = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  var numFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  var numFormatter2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function formatINR(value, decimals) {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '₹0';
    if (decimals === 2) return inrFormatter2.format(value);
    return inrFormatter.format(Math.round(value));
  }

  function formatNumber(value, decimals) {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0';
    if (decimals === 2) return numFormatter2.format(value);
    return numFormatter.format(Math.round(value));
  }

  function formatPercent(value) {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
    return numFormatter2.format(value) + '%';
  }

  function parseNum(v, fallback) {
    if (v === null || v === undefined) return fallback === undefined ? 0 : fallback;
    var s = String(v).replace(/,/g, '').replace(/₹/g, '').replace(/^\s+|\s+$/g, '');
    var n = parseFloat(s);
    if (isNaN(n)) return fallback === undefined ? 0 : fallback;
    return n;
  }

  function isValidNumber(v) {
    return typeof v === 'number' && !isNaN(v) && isFinite(v);
  }

  function validate(inputs, rules) {
    var errors = [];
    var cleaned = {};
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var raw = inputs[rule.name];
      var val = parseNum(raw, rule.allowEmpty && raw === '' ? '' : NaN);
      if (raw === '' || raw === null || raw === undefined) {
        if (rule.required) {
          errors.push(rule.label + ' is required.');
          cleaned[rule.name] = NaN;
          continue;
        } else {
          cleaned[rule.name] = rule.default !== undefined ? rule.default : 0;
          continue;
        }
      }
      if (isNaN(val)) {
        errors.push('Please enter a valid ' + rule.label.toLowerCase() + '.');
        cleaned[rule.name] = NaN;
        continue;
      }
      if (rule.min !== undefined && val < rule.min) {
        if (rule.min === 0) errors.push(rule.label + ' must be greater than 0.');
        else errors.push(rule.label + ' must be at least ' + rule.min + '.');
        cleaned[rule.name] = NaN;
        continue;
      }
      if (rule.max !== undefined && val > rule.max) {
        errors.push(rule.label + ' must be at most ' + rule.max + '.');
        cleaned[rule.name] = NaN;
        continue;
      }
      cleaned[rule.name] = val;
    }
    return { errors: errors, values: cleaned, valid: errors.length === 0 };
  }

  var fmt = {
    formatINR: formatINR,
    formatNumber: formatNumber,
    formatPercent: formatPercent,
    parseNum: parseNum,
    isValidNumber: isValidNumber,
    validate: validate
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = fmt;
  if (global) global.CalcFormat = fmt;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
