// hyadeOS compatibility check: turns what a browser can see about a PC into an estimate.
// No network, no storage: everything here is a pure function of the signals it is given,
// so it can be tested in Node (see the end of the file) and runs the same in the page.
//
// A browser cannot see the exact RAM (navigator.deviceMemory is rounded and capped at 8),
// the CPU model or the TPM, so the result is an estimate and the page says so.
(function (root) {
  'use strict';

  // Renderer names that mean "no graphics card is being used".
  var SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|microsoft basic render|basic render driver|mesa offscreen/i;
  // A few families too old to draw a modern desktop smoothly. Deliberately short: a guess, not a database.
  var VERY_OLD_GPU = /\bgma\b|intel\(r\) (945|946|g33|g41|q33|q35|q43|q45)|mobile intel\(r\) 9[46]5|geforce (6|7)\d{3}\b/i;

  var WINDOWS_NT = {
    '10.0': 'Windows 10 or 11', '6.3': 'Windows 8.1', '6.2': 'Windows 8',
    '6.1': 'Windows 7', '6.0': 'Windows Vista', '5.2': 'Windows XP', '5.1': 'Windows XP'
  };

  // input: { ua, platform, platformVersion, bitness }  ->  { family, name, supported, note }
  function parseOs(input) {
    var ua = String((input && input.ua) || '');
    var nt = /Windows NT (\d+\.\d+)/.exec(ua);
    if (nt) {
      var name = WINDOWS_NT[nt[1]] || 'Windows';
      var major = parseInt(String((input && input.platformVersion) || '0').split('.')[0], 10);
      if (nt[1] === '10.0' && major >= 13) name = 'Windows 11';
      else if (nt[1] === '10.0' && major > 0) name = 'Windows 10';
      var modern = nt[1] === '10.0';
      return {
        family: 'windows', name: name, supported: modern,
        note: modern ? '' : 'Recent Electron, which hyadeOS runs on, needs Windows 10 or later.'
      };
    }
    if (/Android|iPhone|iPad|iPod/.test(ua)) {
      return { family: 'mobile', name: 'Phone or tablet', supported: false, note: 'This looks like a phone or tablet. Open this page on the old PC.' };
    }
    if (/CrOS/.test(ua)) {
      return { family: 'chromeos', name: 'ChromeOS', supported: false, note: 'ChromeOS cannot run hyadeOS.' };
    }
    if (/Mac OS X|Macintosh/.test(ua)) return { family: 'macos', name: 'macOS', supported: true, note: '' };
    if (/Linux|X11/.test(ua)) return { family: 'linux', name: 'Linux', supported: true, note: '' };
    return { family: 'unknown', name: 'Unknown system', supported: null, note: 'The system could not be identified.' };
  }

  function describeGpu(renderer, webgl) {
    if (!webgl) return { hardware: false, old: false, label: 'No WebGL (graphics acceleration is off or missing)' };
    var text = String(renderer || '');
    if (!text) return { hardware: null, old: false, label: 'Hidden by the browser' };
    if (SOFTWARE_GPU.test(text)) return { hardware: false, old: false, label: text + ' (software drawing)' };
    return { hardware: true, old: VERY_OLD_GPU.test(text), label: text };
  }

  function memoryPoints(gb) {
    if (gb === null || gb === undefined) return 18;
    if (gb <= 0.5) return 0;
    if (gb <= 1) return 4;
    if (gb <= 2) return 14;
    if (gb <= 4) return 22;
    return 40;
  }

  function memoryLabel(gb) {
    if (gb === null || gb === undefined) return 'Hidden by the browser (Firefox and Safari do not tell)';
    if (gb >= 8) return '8 GB or more';
    return 'About ' + gb + ' GB';
  }

  function corePoints(cores) {
    if (!cores) return 15;
    if (cores <= 1) return 5;
    if (cores === 2) return 15;
    if (cores === 3) return 19;
    return 25;
  }

  // signals: { os, cores, memoryGb, gpu, bitness }
  function assess(signals) {
    var os = signals.os || parseOs({});
    var gpu = signals.gpu || describeGpu('', true);
    var mem = signals.memoryGb === undefined ? null : signals.memoryGb;
    var cores = signals.cores || null;

    var gpuPoints = gpu.hardware === false ? 4 : gpu.old ? 8 : gpu.hardware === null ? 12 : 20;
    var osPoints = os.supported === false ? 0 : os.supported === true ? 15 : 8;

    var factors = [
      { id: 'memory', label: 'Memory', value: memoryLabel(mem), points: memoryPoints(mem), max: 40 },
      { id: 'cpu', label: 'Processor', value: cores ? cores + ' threads' : 'Hidden by the browser', points: corePoints(cores), max: 25 },
      { id: 'gpu', label: 'Graphics', value: gpu.label, points: gpuPoints, max: 20 },
      { id: 'os', label: 'System', value: os.name + (signals.bitness === '32' ? ' (32-bit)' : ''), points: osPoints, max: 15 }
    ];
    var score = factors.reduce(function (sum, f) { return sum + f.points; }, 0);
    if (mem !== null && mem <= 1) score = Math.min(score, 30);
    if (os.supported === false) score = Math.min(score, 25);

    var verdict;
    if (os.supported === false) {
      verdict = { id: 'blocked', title: 'Not on this system yet', text: 'hyadeOS needs Windows 10 or later, or a recent Linux or macOS.' };
    } else if (score >= 85) {
      verdict = { id: 'reborn', title: 'Reborn', text: 'This PC can run hyadeOS comfortably, whatever role you give it.' };
    } else if (score >= 60) {
      verdict = { id: 'alive', title: 'Alive and useful', text: 'Good for a shared PC, a family PC or a TV box.' };
    } else if (score >= 40) {
      verdict = { id: 'light', title: 'Light duty', text: 'It will run, with limits. A simple, single-purpose role suits it best.' };
    } else {
      verdict = { id: 'tough', title: 'Probably too old for now', text: 'It is likely to struggle. We want to change that in the future.' };
    }

    var warnings = [];
    if (os.note) warnings.push(os.note);
    if (gpu.hardware === false) warnings.push('Your browser is not using the graphics card. Updating the graphics driver can change this result a lot.');
    if (mem === null) warnings.push('Your browser hides the memory, so that part of the score is a guess. Chrome or Edge show it.');
    if (mem !== null && mem >= 8) warnings.push('Browsers report at most 8 GB, so the real memory may be higher.');
    if (signals.bitness === '32') warnings.push('A 32-bit system was detected. hyadeOS is built for 64-bit systems.');

    return { score: score, verdict: verdict, factors: factors, roles: roles(os, mem, cores, gpu), warnings: warnings };
  }

  // Roles are plans, not products yet. Only the shared PC can be set up today (guest account and time limits).
  function roles(os, mem, cores, gpu) {
    var supported = os.supported !== false;
    var ramKnown = mem !== null;
    var ram4 = !ramKnown || mem >= 4;
    var ram2 = !ramKnown || mem >= 2;
    var gpuOk = gpu.hardware !== false;

    var tv = !supported || !ram4 || (cores && cores < 2) || !gpuOk ? 'poor' : (ramKnown && cores >= 4 ? 'great' : 'ok');
    var shared = !supported || (ramKnown && mem <= 1) ? 'poor' : (ramKnown && ram4 ? 'great' : 'ok');
    var simple = shared;
    var retro = !supported || !ram2 ? 'poor' : 'ok';

    return [
      { id: 'shared', name: 'Shared or kids PC', fit: shared, status: 'today',
        note: 'Works today: a guest account that resets itself, plus time limits.' },
      { id: 'tv', name: 'Smart TV box', fit: tv, status: 'planned',
        note: 'Planned. YouTube and your own files; some paid streaming services may not work.' },
      { id: 'simple', name: 'PC for grandparents', fit: simple, status: 'planned',
        note: 'Planned. A simpler desktop that cannot be broken.' },
      { id: 'retro', name: 'Retro machine', fit: retro, status: 'planned',
        note: 'Planned, later. Old games and old systems in a window.' }
    ];
  }

  var api = { assess: assess, parseOs: parseOs, describeGpu: describeGpu };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HyadeCompat = api;
})(typeof self !== 'undefined' ? self : this);
