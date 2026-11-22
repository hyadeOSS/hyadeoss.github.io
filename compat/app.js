// hyadeOSS compatibility check: reads what the browser tells about this PC, scores it with
// compat.js and draws the result. Nothing leaves the page: there is no request, no storage
// and no analytics here.
(function () {
  'use strict';

  var C = window.HyadeCompat;
  var PAGE_URL = 'https://hyadeoss.github.io/compat/';
  var lastResult = null;

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // The graphics card name, when the browser allows reading it.
  function readGpu() {
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return C.describeGpu('', false);
      var info = gl.getExtension('WEBGL_debug_renderer_info');
      var renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return C.describeGpu(renderer, true);
    } catch (error) {
      return C.describeGpu('', false);
    }
  }

  async function collect() {
    var high = {};
    var uad = navigator.userAgentData;
    if (uad && uad.getHighEntropyValues) {
      try { high = await uad.getHighEntropyValues(['bitness', 'platformVersion']); } catch (error) { high = {}; }
    }
    return {
      os: C.parseOs({ ua: navigator.userAgent, platformVersion: high.platformVersion }),
      cores: navigator.hardwareConcurrency || null,
      memoryGb: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
      gpu: readGpu(),
      bitness: high.bitness || null
    };
  }

  var FIT_TEXT = { great: 'Great fit', ok: 'Should work', poor: 'Unlikely' };
  var STATUS_TEXT = { today: 'Works today', planned: 'Planned' };

  function render(result) {
    lastResult = result;
    $('score').textContent = String(result.score);
    $('verdict-title').textContent = result.verdict.title;
    $('verdict-text').textContent = result.verdict.text;
    $('ring').style.setProperty('--pct', String(result.score));

    var factors = $('factors');
    factors.replaceChildren();
    result.factors.forEach(function (f) {
      var row = el('div', 'factor');
      row.appendChild(el('span', 'factor-name', f.label));
      row.appendChild(el('span', 'factor-value', f.value));
      var bar = el('span', 'bar');
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', f.points + ' out of ' + f.max);
      var fill = el('i');
      fill.style.width = Math.round((f.points / f.max) * 100) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      factors.appendChild(row);
    });

    var roles = $('roles');
    roles.replaceChildren();
    result.roles.forEach(function (r) {
      var item = el('li', 'role fit-' + r.fit);
      var head = el('div', 'role-head');
      head.appendChild(el('strong', '', r.name));
      head.appendChild(el('span', 'tag tag-' + r.status, STATUS_TEXT[r.status]));
      head.appendChild(el('span', 'tag tag-fit', FIT_TEXT[r.fit]));
      item.appendChild(head);
      item.appendChild(el('p', '', r.note));
      roles.appendChild(item);
    });

    var warnings = $('warnings');
    warnings.replaceChildren();
    result.warnings.forEach(function (w) { warnings.appendChild(el('li', '', w)); });
    $('warnings-box').hidden = result.warnings.length === 0;

    $('result').hidden = false;
    $('check').textContent = 'Check again';
    $('verdict-title').focus();
  }

  function shareText() {
    return 'My old PC scored ' + lastResult.score + '/100 on the hyadeOSS compatibility check: "' +
      lastResult.verdict.title + '". Try yours: ' + PAGE_URL;
  }

  // The picture holds only the score and the verdict: no hardware details, so it is safe to post.
  function drawShareImage(result) {
    var w = 1200, h = 630;
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var g = canvas.getContext('2d');
    var accent = (getComputedStyle(document.documentElement).getPropertyValue('--mw-accent') || '').trim() || '#0a84ff';
    var font = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';

    g.fillStyle = '#0b0b0c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f2f2f2';
    g.font = '600 34px ' + font;
    g.fillText('Can your old PC live again?', 70, 100);

    var cx = 300, cy = 350, radius = 170;
    g.lineWidth = 26;
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.beginPath(); g.arc(cx, cy, radius, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = accent;
    g.beginPath();
    g.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * result.score) / 100);
    g.stroke();

    g.fillStyle = '#f2f2f2';
    g.textAlign = 'center';
    g.font = '700 130px ' + font;
    g.fillText(String(result.score), cx, cy + 40);
    g.font = '500 30px ' + font;
    g.fillStyle = '#8d8d8d';
    g.fillText('/ 100', cx, cy + 90);

    g.textAlign = 'left';
    g.fillStyle = '#f2f2f2';
    g.font = '700 64px ' + font;
    var below = wrapText(g, result.verdict.title, 560, 250, 600, 76);
    g.fillStyle = '#8d8d8d';
    g.font = '500 28px ' + font;
    wrapText(g, result.verdict.text, 560, below + 20, 580, 40);

    g.fillStyle = accent;
    g.font = '600 30px ' + font;
    g.fillText('hyadeoss.github.io/compat', 70, 580);
    return canvas;
  }

  function wrapText(g, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    words.forEach(function (word) {
      var test = line ? line + ' ' + word : word;
      if (g.measureText(test).width > maxWidth && line) {
        g.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else {
        line = test;
      }
    });
    if (line) g.fillText(line, x, y);
    return y + lineHeight;
  }

  function setStatus(message) { $('share-status').textContent = message; }

  function saveImage() {
    if (!lastResult) return;
    drawShareImage(lastResult).toBlob(function (blob) {
      if (!blob) return setStatus('Could not create the image.');
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = 'hyadeoss-compatibility.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      setStatus('Image saved.');
    }, 'image/png');
  }

  function share() {
    if (!lastResult) return;
    var text = shareText();
    if (navigator.share) {
      navigator.share({ text: text, url: PAGE_URL }).catch(function () { /* closed by the user */ });
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { setStatus('Copied. Paste it anywhere.'); },
        function () { setStatus(text); }
      );
      return;
    }
    setStatus(text);
  }

  $('check').addEventListener('click', function () {
    var button = $('check');
    button.disabled = true;
    collect().then(function (signals) { render(C.assess(signals)); }).catch(function () {
      $('verdict-title').textContent = 'The check could not run';
      $('result').hidden = false;
    }).then(function () { button.disabled = false; });
  });
  $('save-image').addEventListener('click', saveImage);
  $('share').addEventListener('click', share);
})();
