(function (global) {
  'use strict';

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) {
      if (attrs.hasOwnProperty(k)) el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  function renderDonut(container, segments, options) {
    options = options || {};
    container.innerHTML = '';
    var size = options.size || 220;
    var stroke = options.stroke || 34;
    var radius = (size - stroke) / 2;
    var cx = size / 2;
    var cy = size / 2;
    var total = 0;
    for (var i = 0; i < segments.length; i++) total += segments[i].value;
    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, width: '100%', height: size });
    svg.style.maxWidth = size + 'px';

    var track = svgEl('circle', {
      cx: cx, cy: cy, r: radius, fill: 'none',
      stroke: '#eef2f8', 'stroke-width': stroke
    });
    svg.appendChild(track);

    if (total <= 0) return container.appendChild(svg);

    var startAngle = -Math.PI / 2;
    var colors = ['#0E4DA4', '#57A635', '#8DC63F', '#2E7CD6'];
    for (var j = 0; j < segments.length; j++) {
      var seg = segments[j];
      if (seg.value <= 0) continue;
      var frac = seg.value / total;
      var angle = frac * Math.PI * 2;
      var endAngle = startAngle + angle;
      var large = angle > Math.PI ? 1 : 0;
      var x1 = cx + radius * Math.cos(startAngle);
      var y1 = cy + radius * Math.sin(startAngle);
      var x2 = cx + radius * Math.cos(endAngle);
      var y2 = cy + radius * Math.sin(endAngle);
      var path = svgEl('path', {
        d: 'M ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2,
        fill: 'none',
        stroke: seg.color || colors[j % colors.length],
        'stroke-width': stroke,
        'stroke-linecap': 'butt'
      });
      svg.appendChild(path);
      startAngle = endAngle;
    }

    if (options.centerLabel) {
      var t1 = svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#5a6b82', 'font-size': '12' });
      t1.textContent = options.centerLabel;
      svg.appendChild(t1);
      if (options.centerValue) {
        var t2 = svgEl('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', fill: '#0b1b33', 'font-size': '16', 'font-weight': '700' });
        t2.textContent = options.centerValue;
        svg.appendChild(t2);
      }
    }
    container.appendChild(svg);

    if (options.legend !== false) {
      var leg = document.createElement('div');
      leg.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:14px;';
      for (var l = 0; l < segments.length; l++) {
        if (segments[l].value <= 0 && options.hideZero) continue;
        var item = document.createElement('div');
        item.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;color:#5a6b82;';
        var dot = document.createElement('span');
        dot.style.cssText = 'width:12px;height:12px;display:inline-block;background:' + (segments[l].color || colors[l % colors.length]);
        item.appendChild(dot);
        var txt = document.createElement('span');
        txt.innerHTML = segments[l].label + ' <strong style="color:#0b1b33">' + (segments[l].display || '') + '</strong>';
        item.appendChild(txt);
        leg.appendChild(item);
      }
      container.appendChild(leg);
    }
    return svg;
  }

  function renderLine(container, series, options) {
    options = options || {};
    container.innerHTML = '';
    var width = options.width || 520;
    var height = options.height || 240;
    var pad = options.pad || 40;
    var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, width: '100%', height: height });
    svg.style.maxWidth = width + 'px';

    var colors = options.colors || ['#0E4DA4', '#57A635'];

    function valOf(v) {
      if (typeof v === 'object' && v !== null && 'value' in v) return v.value;
      return v;
    }

    var max = 0;
    for (var mi = 0; mi < series.length; mi++) {
      var mpts = series[mi].points || series;
      for (var mj = 0; mj < mpts.length; mj++) {
        var mv = valOf(mpts[mj]);
        if (mv > max) max = mv;
      }
    }
    if (max <= 0) max = 1;

    function plot(points, color, fill) {
      var n = points.length;
      if (n === 0) return;
      var stepX = (width - pad * 2) / Math.max(1, n - 1);
      var path = '';
      var area = '';
      for (var p = 0; p < n; p++) {
        var x = pad + p * stepX;
        var y = height - pad - (valOf(points[p]) / max) * (height - pad * 2);
        if (p === 0) { path += 'M ' + x + ' ' + y; area += 'M ' + x + ' ' + (height - pad) + ' L ' + x + ' ' + y; }
        else { path += ' L ' + x + ' ' + y; area += ' L ' + x + ' ' + y; }
      }
      area += ' L ' + (pad + (n - 1) * stepX) + ' ' + (height - pad) + ' Z';
      if (fill) {
        var ar = svgEl('path', { d: area, fill: color, opacity: 0.12, stroke: 'none' });
        svg.appendChild(ar);
      }
      var ln = svgEl('path', { d: path, fill: 'none', stroke: color, 'stroke-width': 2.5 });
      svg.appendChild(ln);
    }

    if (series[0] && series[0].points) {
      for (var s = 0; s < series.length; s++) {
        plot(series[s].points, series[s].color || colors[s % colors.length], true);
      }
    } else if (series.length) {
      plot(series, colors[0], true);
    }

    container.appendChild(svg);
  }

  function renderBar(container, items, options) {
    options = options || {};
    container.innerHTML = '';
    var width = options.width || 520;
    var height = options.height || 240;
    var pad = 50;
    var max = 0;
    for (var i = 0; i < items.length; i++) if (items[i].value > max) max = items[i].value;
    if (max <= 0) max = 1;
    var svg = svgEl('svg', { viewBox: '0 0 ' + width + ' ' + height, width: '100%', height: height });
    svg.style.maxWidth = width + 'px';
    var colors = ['#0E4DA4', '#57A635', '#8DC63F'];
    var bw = (width - pad * 2) / items.length * 0.6;
    var gap = (width - pad * 2) / items.length;
    for (var j = 0; j < items.length; j++) {
      var x = pad + j * gap + (gap - bw) / 2;
      var h = (items[j].value / max) * (height - pad * 2);
      var y = height - pad - h;
      var rect = svgEl('rect', { x: x, y: y, width: bw, height: h, fill: items[j].color || colors[j % colors.length] });
      svg.appendChild(rect);
      var lbl = svgEl('text', { x: x + bw / 2, y: height - pad + 16, 'text-anchor': 'middle', 'font-size': 11, fill: '#5a6b82' });
      lbl.textContent = items[j].label;
      svg.appendChild(lbl);
    }
    container.appendChild(svg);
  }

  var charts = {
    renderDonut: renderDonut,
    renderLine: renderLine,
    renderBar: renderBar
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = charts;
  if (global) global.CalcCharts = charts;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
