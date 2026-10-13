"""Small ADB UI helper for repeatable manual acceptance checks on the test emulator."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(['adb', '-s', 'emulator-5554', *args]).decode('utf-8', errors='replace')
def nodes():
    result = adb('shell', 'uiautomator', 'dump', '/sdcard/lekhpal-check.xml')
    if 'UI hierchary dumped to:' not in result and 'UI hierarchy dumped to:' not in result:
        raise RuntimeError('Fresh UI dump failed; refusing to reuse an older screen snapshot.')
    return list(ET.fromstring(adb('shell', 'cat', '/sdcard/lekhpal-check.xml')).iter('node'))
def center(n):
    x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')))
    return str((x+a)//2),str((y+b)//2)

cmd=sys.argv[1] if len(sys.argv)>1 else 'dump'
if cmd=='dump':
    for n in nodes():
        t=n.get('text') or n.get('content-desc')
        if t: print(t, n.get('bounds'))
elif cmd=='tap':
    label=sys.argv[2]
    candidates=[n for n in nodes() if n.get('text')==label or n.get('content-desc')==label]
    if not candidates: raise RuntimeError('Control not visible: '+label)
    candidates.sort(key=lambda n: (n.get('content-desc') != label, n.get('clickable') != 'true'))
    print('Tapped',label,adb('shell','input','tap',*center(candidates[0])));time.sleep(1.2)
elif cmd=='fill':
    label,value=sys.argv[2:4]
    candidates=[n for n in nodes() if n.get('content-desc')==label and n.get('class')=='android.widget.EditText']
    if not candidates: raise RuntimeError('Field not visible: '+label)
    adb('shell','input','tap',*center(candidates[0]))
    adb('shell','input','keycombination','113','29')
    adb('shell','input','text',value.replace(' ','%s'))
    print('Filled',label)
elif cmd=='findtap':
    label=sys.argv[2]
    for attempt in range(8):
        candidates=[n for n in nodes() if n.get('text')==label or n.get('content-desc')==label]
        candidates=[n for n in candidates if 390<int(center(n)[1])<2180]
        if candidates:
            adb('shell','input','tap',*center(candidates[0]));print('Tapped',label);break
        adb('shell','input','swipe','30','1900','30','800','300')
    else: raise RuntimeError('Control not found: '+label)
elif cmd=='xy':
    adb('shell','input','tap',sys.argv[2],sys.argv[3])
elif cmd=='scroll':
    adb('shell','input','swipe','30','1900','30','700','400')
elif cmd=='up':
    adb('shell','input','swipe','30','650','30','1850','400')
elif cmd=='type':
    adb('shell','input','text',sys.argv[2].replace(' ','%s'))
elif cmd=='back':
    adb('shell','input','keyevent','4')
elif cmd=='shot':
    with open(sys.argv[2],'wb') as f: subprocess.run(['adb','-s','emulator-5554','exec-out','screencap','-p'],stdout=f,check=True)
else: raise RuntimeError('Unknown command')
