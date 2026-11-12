import sys, json, base64, argparse
ap=argparse.ArgumentParser(); ap.add_argument('--out',default='player.html'); ap.add_argument('--fontface',default='')
ap.add_argument('--vo',default=''); ap.add_argument('--config',default='')
a=ap.parse_args()
t=open('player_template.html').read()
ff=''
if a.fontface=='dejavu':
    ff='@font-face{font-family:"Space Grotesk";font-weight:700;src:local("DejaVu Sans Bold")}@font-face{font-family:"Space Grotesk";font-weight:400;src:local("DejaVu Sans")}@font-face{font-family:"Space Mono";font-weight:700;src:local("DejaVu Sans Mono Bold")}@font-face{font-family:"Space Mono";font-weight:400;src:local("DejaVu Sans Mono")}'
elif a.fontface:
    for spec in a.fontface.split(','):
        fam,w,path=spec.split(':'); b=base64.b64encode(open(path,'rb').read()).decode()
        ff+='@font-face{font-family:"%s";font-weight:%s;src:url(data:font/woff2;base64,%s) format("woff2")}'%(fam,w,b)
cfg=open(a.config).read() if a.config else ''
if a.vo: cfg+='\nwindow.VO_SRC="data:audio/mpeg;base64,%s";'%base64.b64encode(open(a.vo,'rb').read()).decode()
for k,f in [('HARNESS','harness.js'),('SOUND','sound.js'),('ENGINE','engine.js'),('SCORE','score.js')]:
    t=t.replace('/*__%s__*/'%k,open(f).read())
t=t.replace('/*__FONTFACE__*/',ff).replace('/*__VOCONFIG__*/',cfg)
open(a.out,'w').write(t); print('built',a.out,len(t))
