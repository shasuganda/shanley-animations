from playwright.sync_api import sync_playwright
import os, sys
S=sys.argv[1]; out=sys.argv[2]
css='''
html, body { background: #203028 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { padding: 0 56px !important; }
.wrap { gap: 30px !important; max-width: none !important; }
section { gap: 20px !important; }
.step { padding-top: 18px !important; }
.f { padding-bottom: 18px !important; }
.row, .fix { padding: 12px 0 !important; }
.hero { padding-top: 0 !important; }
.step, .code, .pack, .row, .fix, .f, .ask, .clock, .doctor, .mock, .spec > div, .steps4, .facts, .tree, .swatches, .note, .shots, .psteps { break-inside: avoid; }
.head, h2, h3, .label, .pdf-os { break-after: avoid; }
.head + *, .pdf-os + * { break-before: avoid; }
.tabs, [data-copy] { display: none !important; }
.code pre { white-space: pre-wrap !important; overflow-wrap: anywhere; overflow: visible !important; }
.tree { white-space: normal !important; overflow: visible !important; font-size: 11px; }
.pdf-os { font-family: "Instrument Serif", serif; font-size: 34px; color: #f5cf45; margin: 10px 0 0; }
.player .ring, .player .pop { display: none; }
footer { break-inside: avoid; }
.pack { padding: 16px 18px !important; gap: 8px !important; }
.packs { gap: 12px !important; }
.ask { padding: 12px 18px !important; gap: 6px !important; }
.packs + .rows .row { padding: 8px 0 !important; }
.pack ul { gap: 5px !important; }
.ask h3 { font-size: 25px !important; }
.ask p { font-size: 14px !important; line-height: 1.45; }
'''
band='<style>#header,#footer{padding:0!important;margin:0!important}</style><div style="width:100%;height:0.6in;background:#203028;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0"></div>'
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':816,'height':1056})
    pg.goto('file://'+S+'/prev.html'); pg.wait_for_timeout(1500)
    pg.add_style_tag(content=css)
    pg.evaluate('''()=>{
      const mac=document.getElementById('panel-mac'), pc=document.getElementById('panel-pc');
      mac.hidden=false; pc.hidden=false;
      const h=(t)=>{const e=document.createElement('div');e.className='pdf-os';e.textContent=t;return e};
      mac.prepend(h('On a Mac')); pc.prepend(h('On a Windows PC'));
      for(let i=1;i<99999;i++) clearInterval(i);
      document.getElementById('player').setAttribute('data-step','5');
      const ask=document.querySelector('.wrap > .ask'); if(ask){ const prev=ask.previousElementSibling; if(prev && prev.tagName==='SECTION') prev.appendChild(ask); }
    }''')
    pg.emulate_media(media='screen'); pg.wait_for_timeout(800)
    pg.pdf(path=out, format='Letter', print_background=True, display_header_footer=True, header_template=band, footer_template=band,
           margin={'top':'0.6in','bottom':'0.6in','left':'0','right':'0'})
    b.close(); print(os.path.getsize(out))
