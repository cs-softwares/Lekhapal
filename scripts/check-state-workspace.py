"""Emulator acceptance checks for state selection, drawer dismissal and browser navigation."""
import subprocess, time, re, xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(['adb','-s','emulator-5554',*args], timeout=20).decode('utf-8',errors='replace')
def nodes():
    adb('shell','uiautomator','dump','/sdcard/lekhpal-acceptance.xml')
    return list(ET.fromstring(adb('shell','cat','/sdcard/lekhpal-acceptance.xml')).iter('node'))
def wait_for(label, attempts=12):
    for _ in range(attempts):
        found=[n for n in nodes() if n.get('content-desc')==label or n.get('text')==label]
        if found:return found[0]
        time.sleep(1)
    raise RuntimeError('Missing control: '+label)
def tap(label):
    n=wait_for(label);x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')))
    adb('shell','input','tap',str((x+a)//2),str((y+b)//2));time.sleep(.5)
def shot(path):
    with open(path,'wb') as f:subprocess.run(['adb','-s','emulator-5554','exec-out','screencap','-p'],stdout=f,check=True)
adb('shell','am','force-stop','com.lekhpal')
adb('shell','am','start','-n','com.lekhpal/.MainActivity')
wait_for('Open menu')
tap('Open menu');wait_for('Close menu');shot('/tmp/lekhpal-drawer-accepted.png')
tap('Close menu');wait_for('Open menu');print('PASS drawer close button',flush=True)
tap('Open menu');wait_for('Close menu');adb('shell','input','keyevent','4');wait_for('Open menu');print('PASS drawer Android Back',flush=True)
tap('Open menu');wait_for('Close drawer backdrop');adb('shell','input','tap','1030','1200');wait_for('Open menu');print('PASS drawer backdrop',flush=True)
tap('Open menu');tap('Change state');wait_for('Choose your state');shot('/tmp/lekhpal-state-selection.png')
tap('Select Bihar');wait_for('Bihar');print('PASS change state to Bihar',flush=True)
tap('Open menu');tap('Change state');tap('Select Chandigarh');wait_for('Chandigarh');print('PASS change state to Chandigarh',flush=True)
tap('Land records & revenue services');wait_for('Refresh government website');shot('/tmp/lekhpal-portal-browser.png');print('PASS opens in-app browser',flush=True)
tap('Back');wait_for('Open menu');print('PASS return from browser',flush=True)
shot('/tmp/lekhpal-workspace-accepted.png')
