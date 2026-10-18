#!/usr/bin/env python3
"""Net Arcade 단일 HTML 빌드

허브와 플레이 가능한 모든 게임, 공통 CSS/JS, 폰트를 HTML 파일 하나로 묶는다.
결과: dist/net-arcade.html  (이 파일 하나만 보내면 누구나 브라우저로 열어 플레이할 수 있다)

사용법 (net-arcade 폴더에서):
    python tools/build_single.py

동작 방식
- 폰트(woff2)는 base64로 한 번만 넣고, 열 때 blob URL로 만들어 허브와 각 게임에 같이 쓴다.
- 각 게임 페이지는 CSS/JS를 모두 인라인한 완성 HTML로 만든 뒤, 허브 안에 문자열로 저장한다.
- 허브에서 게임을 누르면 그 HTML을 전체 화면 iframe(srcdoc)으로 띄운다.
- 게임의 "← 허브" 링크는 iframe을 닫고 허브로 돌아오게 바꾼다.
- 진행도는 기존과 같이 브라우저 localStorage에 저장된다.
"""
import base64
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


FONT_FILES = ['Galmuri11.woff2', 'Galmuri11-Bold.woff2']


def base_css_without_fonts():
    # @font-face는 빼고, 실행할 때 한 번만 만든 폰트(blob URL)를 끼워 넣을 자리를 둔다
    css = read('shared/base.css')
    css = re.sub(r"@font-face \{[^}]*\}\n?", '', css)
    return '/*NA_FONTFACE*/\n' + css


BASE_CSS = base_css_without_fonts()


def font_b64():
    return [base64.b64encode(open(os.path.join(ROOT, 'shared/fonts', n), 'rb').read()).decode('ascii') for n in FONT_FILES]


def safe_script(js):
    # 인라인 <script> 안에서 문자열 "</script>"가 태그를 닫지 않도록
    return js.replace('</script', '<\\/script')


def inline_page(html, page_dir):
    """<link rel=stylesheet>와 <script src>를 내용으로 바꾼다."""
    def css_repl(m):
        href = m.group(1)
        if href.endswith('shared/base.css'):
            return '<style>\n' + BASE_CSS + '\n</style>'
        return '<style>\n' + read(os.path.normpath(os.path.join(page_dir, href))) + '\n</style>'

    def js_repl(m):
        src = m.group(1)
        return '<script>\n' + safe_script(read(os.path.normpath(os.path.join(page_dir, src)))) + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_repl, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js_repl, html)
    return html


# 게임 안에서 허브로 가는 링크를 부모 창 메시지로 바꾸는 스크립트
GAME_BRIDGE = """<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a');
  if (a && /index\\.html$/.test(a.getAttribute('href') || '')) { e.preventDefault(); parent.postMessage('na-hub', '*'); }
}, true);
</script>"""

# 허브에서 게임을 iframe으로 여는 스크립트
HUB_FONTS = """<script>
(function () {
  var faces = '', weights = [400, 700];
  NA_FONTS.forEach(function (b64, i) {
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k);
    var url = URL.createObjectURL(new Blob([arr], { type: 'font/woff2' }));
    faces += "@font-face { font-family: 'Galmuri11'; src: url('" + url + "') format('woff2'); font-weight: " + weights[i] + "; font-display: swap; }\\n";
  });
  window.NA_FONTFACE = faces;
  var st = document.createElement('style'); st.textContent = faces; document.head.appendChild(st);
})();
</script>"""

HUB_BRIDGE = """<script>
(function () {
  var frame = null;
  function open(id, hash) {
    var html = NA_BUNDLE[id]; if (!html) return;
    frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:100;background:#0a0e1c';
    html = html.replace('/*NA_FONTFACE*/', window.NA_FONTFACE || '');
    if (hash) html = html.replace('<head>', '<head><script>window.NA_HASH = ' + JSON.stringify('#' + hash) + ';<\\/script>');
    frame.srcdoc = html;
    document.body.appendChild(frame);
    frame.focus();
  }
  function close() {
    if (frame) { frame.remove(); frame = null; }
    window.dispatchEvent(new Event('pageshow'));
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="games/"]');
    if (!a) return;
    e.preventDefault();
    var href = a.getAttribute('href');
    open(href.split('/')[1], href.split('#')[1]);
  }, true);
  window.addEventListener('message', function (e) { if (e.data === 'na-hub') close(); });
})();
</script>"""


def before_last_body(html, extra):
    # 스크립트 문자열 안에 '</body>'가 들어 있을 수 있으니 문서의 마지막 </body> 앞에 넣는다
    i = html.rfind('</body>')
    return html[:i] + extra + '\n' + html[i:]


def main():
    # 플레이 가능한 게임 목록은 qc-data.js의 ready 값으로 정한다
    qc = read('shared/qc-data.js')
    ids = re.findall(r"\{ id: '([a-z0-9-]+)', week: [0-9]+, ready: true", qc)
    bundle = {}
    for gid in ids:
        page_dir = 'games/' + gid
        html = inline_page(read(page_dir + '/index.html'), page_dir)
        html = before_last_body(html, GAME_BRIDGE)
        bundle[gid] = html

    hub = inline_page(read('index.html'), '.')
    data = 'var NA_FONTS = ' + json.dumps(font_b64()) + ';\nvar NA_BUNDLE = ' + json.dumps(bundle, ensure_ascii=False) + ';'
    data = data.replace('</', '<\\/')
    hub = hub.replace('<body>', '<body>\n<script>\n' + data + '\n</script>\n' + HUB_FONTS, 1)
    hub = before_last_body(hub, HUB_BRIDGE)

    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    out = os.path.join(ROOT, 'dist', 'net-arcade.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(hub)
    print('게임 %d개 포함: %s' % (len(ids), ', '.join(ids)))
    print('생성: %s (%.1f MB)' % (out, os.path.getsize(out) / 1024 / 1024))


if __name__ == '__main__':
    main()
