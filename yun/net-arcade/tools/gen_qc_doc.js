// docs/QUICK_CHECK.md를 shared/qc-data.js에서 다시 만든다.  사용법: node tools/gen_qc_doc.js
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
global.window = global;
eval(fs.readFileSync(path.join(root, 'shared/qc-data.js'), 'utf8'));
var md = '# Quick Check 지도\n\n강의자료 마지막 장의 Quick Check 32문항과 그 문항을 클리어하는 게임. 이 문서는 shared/qc-data.js 내용을 옮긴 것이다. 문항을 고칠 때는 qc-data.js를 고친다.\n';
[1, 2, 3, 4].forEach(function (w) {
  md += '\n## Week ' + w + '\n\n';
  NA.QC.filter(function (q) { return q.week === w; }).forEach(function (q) {
    var games = NA.GAMES.filter(function (g) { return g.qc.indexOf(q.id) >= 0; })
      .map(function (g) { return g.title + (g.ready ? '' : ' (예정)'); });
    md += '- **' + q.id + '** ' + q.q + '\n  - 게임: ' + (games.join(', ') || '없음') + '\n  - 정답: ' + q.a + '\n';
  });
});
fs.writeFileSync(path.join(root, 'docs/QUICK_CHECK.md'), md);
console.log('docs/QUICK_CHECK.md 생성');
