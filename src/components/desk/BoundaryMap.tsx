import React, {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useRef,
} from 'react';
import { WebView } from 'react-native-webview';
import { Point } from '../../types';
export type BoundaryMapHandle = { locate: () => void };
// Offline geometry and touch interactions are self-contained; only background tiles use the network.
export const BoundaryMap = forwardRef<
  BoundaryMapHandle,
  {
    center: Point;
    points: Point[];
    satellite: boolean;
    online: boolean;
    onPoint: (point: Point) => void;
    onGps: (point: Point) => void;
    onError: (error: string) => void;
  }
>(function BoundaryMap(
  { center, points, satellite, online, onPoint, onGps, onError },
  ref,
) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const latest = useRef({ points, satellite, online });
  latest.current = { points, satellite, online };
  const update = useCallback(
    () =>
      web.current?.injectJavaScript(
        `window.updateMap(${JSON.stringify(latest.current)});true;`,
      ),
    [],
  );
  useImperativeHandle(ref, () => ({
    locate: () => web.current?.injectJavaScript('window.locate();true;'),
  }));
  React.useEffect(() => {
    if (ready.current) {
      update();
    }
  }, [points, satellite, online, update]);
  const html = React.useMemo(
    () => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><style>html,body{margin:0;overflow:hidden;font-family:Arial;background:#E7EEE8}canvas{touch-action:none}button{position:absolute;right:12px;background:white;border:1px solid #cbd5e1;border-radius:9px;width:44px;height:44px;font-size:24px;color:#0f172a}#credit{position:absolute;bottom:0;left:0;background:#ffffffdf;padding:5px 8px;font-size:9px}#hint{position:absolute;top:10px;left:10px;background:#ffffffed;border-radius:6px;padding:7px;font-size:11px;max-width:65%;color:#334155}</style></head><body><canvas id="map"></canvas><div id="hint">Tap a corner · Drag to pan</div><button style="top:12px" onclick="zoom(1)" aria-label="Zoom in">+</button><button style="top:62px" onclick="zoom(-1)" aria-label="Zoom out">−</button><div id="credit"></div><script>
 const canvas=document.getElementById('map'),ctx=canvas.getContext('2d');let z=17,center=${JSON.stringify(
   { latitude: center.latitude, longitude: center.longitude },
 )},points=[],satellite=false,online=true,tiles={},gps=null,watch=null;
 const send=(type,data)=>window.ReactNativeWebView.postMessage(JSON.stringify({type,...data}));
 function project(p){let scale=256*Math.pow(2,z),lat=Math.max(-85,Math.min(85,p.latitude))*Math.PI/180;return{x:(p.longitude+180)/360*scale,y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2*scale};}
 function unproject(x,y){let scale=256*Math.pow(2,z);return{longitude:x/scale*360-180,latitude:Math.atan(Math.sinh(Math.PI*(1-2*y/scale)))*180/Math.PI};}
 function screen(p){let a=project(p),b=project(center);return{x:a.x-b.x+innerWidth/2,y:a.y-b.y+innerHeight/2};}
 function draw(){canvas.width=innerWidth;canvas.height=innerHeight;ctx.fillStyle=satellite?'#344B3C':'#E7EEE8';ctx.fillRect(0,0,canvas.width,canvas.height);let c=project(center),ox=c.x-innerWidth/2,oy=c.y-innerHeight/2;ctx.strokeStyle=satellite?'#526A59':'#CDDACE';for(let x=0;x<innerWidth;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,innerHeight);ctx.stroke();}for(let y=0;y<innerHeight;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(innerWidth,y);ctx.stroke();}
 if(online){for(let x=Math.floor(ox/256);x<=Math.floor((ox+innerWidth)/256);x++){for(let y=Math.floor(oy/256);y<=Math.floor((oy+innerHeight)/256);y++){if(y<0||y>=Math.pow(2,z)){continue;}let tx=((x%Math.pow(2,z))+Math.pow(2,z))%Math.pow(2,z);let key=[satellite,z,tx,y].join('/');if(!tiles[key]){let img=new Image();tiles[key]=img;img.onload=draw;img.onerror=()=>{document.getElementById('hint').textContent='Tiles unavailable · Corner tagging still works';};img.src=satellite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+z+'/'+y+'/'+tx:'https://tile.openstreetmap.org/'+z+'/'+tx+'/'+y+'.png';}let img=tiles[key];if(img.complete&&img.naturalWidth){ctx.drawImage(img,x*256-ox,y*256-oy,256,256);}}}}
 if(points.length){ctx.beginPath();points.forEach((p,i)=>{let a=screen(p);i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y);});if(points.length>2){ctx.closePath();ctx.fillStyle='#0F52BA33';ctx.fill();}ctx.lineWidth=3;ctx.strokeStyle='#0F52BA';ctx.stroke();points.forEach((p,i)=>{let a=screen(p);ctx.beginPath();ctx.arc(a.x,a.y,12,0,Math.PI*2);ctx.fillStyle='#FFFFFF';ctx.fill();ctx.stroke();ctx.fillStyle='#0A387E';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(String(i+1),a.x,a.y+4);});}
 if(gps){let a=screen(gps);ctx.beginPath();ctx.arc(a.x,a.y,7,0,Math.PI*2);ctx.fillStyle='#00A86B';ctx.fill();}
 document.getElementById('credit').textContent=satellite?'Imagery © Esri, Maxar, Earthstar Geographics, GIS User Community':'© OpenStreetMap contributors';}
 window.updateMap=function(v){points=v.points;satellite=v.satellite;online=v.online;document.getElementById('hint').textContent=online?'Tap a corner · Drag to pan':'Offline grid · Tap to tag coordinates';draw();};
 window.zoom=function(d){z=Math.max(3,Math.min(20,z+d));tiles={};draw();};
 let start=null;canvas.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,c:project(center)};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!start)return;let dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dx)+Math.abs(dy)<10){let c=project(center);send('point',{point:unproject(c.x+e.clientX-innerWidth/2,c.y+e.clientY-innerHeight/2)});}else{center=unproject(start.c.x-dx,start.c.y-dy);draw();}start=null;});
 window.locate=function(){if(!navigator.geolocation){send('error',{message:'GPS is unavailable. Enter coordinates or tap the map.'});return;}if(watch!==null){navigator.geolocation.clearWatch(watch);}document.getElementById('hint').textContent='Waiting for GPS…';let first=true;watch=navigator.geolocation.watchPosition(p=>{gps={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};if(first){center=gps;first=false;}send('gps',{point:gps});document.getElementById('hint').textContent='Live GPS · Tap to add corners';draw();},e=>{send('error',{message:e.message||'Location permission or GPS unavailable.'});document.getElementById('hint').textContent='GPS unavailable · Manual tagging available';},{enableHighAccuracy:true,timeout:20000,maximumAge:5000});};window.addEventListener('beforeunload',()=>{if(watch!==null)navigator.geolocation.clearWatch(watch);});window.onresize=draw;draw();send('ready',{});
 </script></body></html>`,
    [center.latitude, center.longitude],
  );
  const source = React.useMemo(
    () => ({ html, baseUrl: 'https://lekhpal.local' }),
    [html],
  );
  return (
    <WebView
      ref={web}
      source={source}
      originWhitelist={['*']}
      userAgent="LekhpalMobileDesk/1.0 (field survey demo)"
      javaScriptEnabled
      geolocationEnabled
      onMessage={event => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'ready') {
            ready.current = true;
            update();
          } else if (data.type === 'point') {
            onPoint(data.point);
          } else if (data.type === 'gps') {
            onGps(data.point);
          } else if (data.type === 'error') {
            onError(data.message);
          }
        } catch {
          onError('Map response could not be read.');
        }
      }}
      onError={() =>
        onError(
          'Map failed to load. Manual coordinate entry remains available.',
        )
      }
      style={{ flex: 1, backgroundColor: '#E7EEE8' }}
    />
  );
});
