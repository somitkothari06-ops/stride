import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type WorldController = { chapter: (index: number) => void; play: () => void; pause: () => void; destroy: () => void; reduced: (value: boolean) => void; explode: (value: boolean) => void };
type Pose = { p: [number, number, number]; r?: [number, number, number]; s?: number };
type Moving = { object: THREE.Object3D; poses: Pose[]; delay: number };
const mix = THREE.MathUtils.lerp;
const smooth = (x: number) => x * x * (3 - 2 * x);
const ink = '#26352f', paper = '#e8ede6', citron = '#d9e887';

/** A local, illustrative motion scene. No inference, student data or remote assets. */
export function createLandingWorld(canvas: HTMLCanvasElement, options: {
  reduced: boolean; onChapter: (index: number) => void; onPlaying: (playing: boolean) => void; onFailure: () => void;
}): WorldController {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x24282b, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, .1, 60);
  const root = new THREE.Group(); scene.add(root);
  const moving: Moving[] = [], textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [], geometries: THREE.BufferGeometry[] = [];
  function material(color: string, roughness = .7, metalness = .05) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.push(m); return m;
  }
  const charcoal = material('#292f32'), edge = material('#52605c', .45, .3), chalk = material(paper), lime = material(citron), soft = material('#a9b7ac'), black = material('#18201f');
  function box(parent: THREE.Object3D, w: number, h: number, d: number, m: THREE.Material, x=0, y=0, z=0, radius=.06) {
    const g = new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w/4,h/4,d/4)); geometries.push(g);
    const mesh = new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, m: THREE.Material, x=0,y=0,z=0) {
    const g=new THREE.CylinderGeometry(radius,radius,height,40); geometries.push(g);
    const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function surfaceTexture(draw: (c: CanvasRenderingContext2D) => void, w=1024,h=768) {
    const element=document.createElement('canvas');element.width=w;element.height=h;
    const c=element.getContext('2d'); if(!c)throw new Error('Canvas drawing unavailable');draw(c);
    const t=new THREE.CanvasTexture(element);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();textures.push(t);return t;
  }
  function label(parent: THREE.Object3D, w:number,h:number,t:THREE.Texture,x:number,y:number,z:number,flat=false) {
    const g=new THREE.PlaneGeometry(w,h);geometries.push(g);
    const m=new THREE.MeshBasicMaterial({map:t,transparent:true,side:THREE.DoubleSide,depthWrite:false});materials.push(m);
    const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);if(flat)mesh.rotation.x=-Math.PI/2;parent.add(mesh);return mesh;
  }
  function track(object:THREE.Object3D,poses:Pose[],delay=0){moving.push({object,poses,delay});}
  const font='"Plus Jakarta Sans", sans-serif';
  function noteTexture(title:string,subtitle:string,mode:'note'|'result'|'small'='note') {
    return surfaceTexture(c=>{
      c.fillStyle=paper;c.fillRect(0,0,1024,768);c.fillStyle=ink;
      c.font=`600 26px ${font}`;c.fillText('STRIDE  /  '+(mode==='result'?'YOUR BUILD':'YOUR NOTES'),64,88);
      c.font=`800 ${mode==='result'?78:72}px ${font}`;c.fillText(title,64,215);
      c.font=`400 31px ${font}`;c.fillStyle='#52645b';c.fillText(subtitle,64,276);
      if(mode==='note') {
        c.fillStyle='#d2dcd1';c.fillRect(64,330,896,2);
        [['R','Riya','Falcons'],['D','Dev','No team yet'],['S','Sam','Tigers']].forEach((row,i)=>{
          const y=400+i*110;c.fillStyle=i===1?citron:'#dce3da';c.beginPath();c.roundRect(64,y-38,896,92,12);c.fill();
          c.fillStyle=ink;c.font=`800 30px ${font}`;c.fillText(row[0],94,y+18);c.font=`600 34px ${font}`;c.fillText(row[1],170,y+18);c.font=`400 28px ${font}`;c.fillText(row[2],620,y+18);
        });
      } else {
        c.fillStyle=ink;c.beginPath();c.roundRect(64,350,896,240,20);c.fill();
        c.fillStyle=citron;c.font=`800 132px ${font}`;c.fillText('D',112,520);c.fillStyle=paper;c.font=`800 62px ${font}`;c.fillText('Dev',300,465);c.font=`400 32px ${font}`;c.fillText('Needs a team',300,525);
        c.fillStyle='#52645b';c.font=`500 26px ${font}`;c.fillText('One idea from class. Something you can use.',64,690);
      }
    });
  }
  scene.add(new THREE.HemisphereLight(0xe4f0e6,0x20252a,2.4));
  const sun=new THREE.DirectionalLight(0xfff8e6,4);sun.position.set(-4,10,5);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:30});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.045;sun.shadow.bias=-.0002;scene.add(sun);
  const rim=new THREE.DirectionalLight(0xc4decd,2.5);rim.position.set(6,4,-6);scene.add(rim);
  const groundG=new THREE.PlaneGeometry(100,100);geometries.push(groundG);
  const groundM=new THREE.ShadowMaterial({opacity:.22});materials.push(groundM);
  const ground=new THREE.Mesh(groundG,groundM);ground.rotation.x=-Math.PI/2;ground.position.y=-.45;ground.receiveShadow=true;scene.add(ground);

  // A machined plinth and fine registration marks ground the whole sequence.
  const base=new THREE.Group();root.add(base);
  box(base,7,.24,5,charcoal,0,-.1,0,.1);const midLayer=box(base,6.85,.045,4.85,edge,0,.045,0);
  const topLayer=box(base,6.65,.06,4.65,black,0,.09,0);
  for(const x of [-3.15,3.15])for(const z of [-2.15,2.15])cylinder(base,.055,.018,soft,x,.13,z);
  for(let i=0;i<23;i++)box(base,.013,.008,i%5===0?.14:.07,soft,-2.95+i*.26,.13,2.18,.001);
  track(base,[{p:[0,0,0],s:.78},{p:[0,0,0],s:.9},{p:[0,0,0]},{p:[-.25,0,0]}]);

  const note=new THREE.Group();root.add(note);
  box(note,3.7,2.8,.055,chalk);label(note,3.6,2.7,noteTexture('Filter a list.','Keep the items that pass your test.'),0,0,.034);
  box(note,.6,.18,.025,lime,0,1.39,.05,.01);
  track(note,[{p:[0,1.8,.1],r:[-.12,-.12,0]},{p:[-2.7,2.5,-1.2],r:[-.08,.22,0],s:.65},{p:[-2.8,2,-1.6],r:[-.04,.25,0],s:.52},{p:[-3,1.6,-1.65],r:[0,.24,0],s:.42}]);

  // Paper fragments converge, then become the components of the build.
  for(let i=0;i<12;i++){
    const shard=new THREE.Group();root.add(shard);box(shard,.4+(i%3)*.13,.025,.55,i%4===0?lime:chalk);
    const a=i*2.399;
    track(shard,[{p:[Math.cos(a)*3.2,.45+(i%4)*.5,Math.sin(a)*2],r:[i*.15,a,.1],s:.7},{p:[Math.cos(a)*3.5,1+(i%3)*.5,Math.sin(a)*2.5],r:[0,a,0],s:.5},{p:[-2.8+(i%6)*1.1,.18,1.5+Math.floor(i/6)*.42],r:[0,0,0],s:.25},{p:[-2.8+(i%6)*1.1,.18,1.5+Math.floor(i/6)*.42],s:.25}],i*.008);
  }
  const bridge=new THREE.Group();root.add(bridge);
  for(let i=0;i<13;i++)box(bridge,.17,.025,.07,i<9?lime:edge,-1.25+i*.21,.19,.2,.01);
  track(bridge,[{p:[0,0,0],s:.001},{p:[0,.4,0],s:.5},{p:[0,0,0]},{p:[0,0,0]}]);

  const codePanel=new THREE.Group();root.add(codePanel);
  box(codePanel,3.25,2.1,.08,charcoal);
  const codeTexture=surfaceTexture(c=>{
    c.fillStyle='#29332e';c.fillRect(0,0,1024,768);c.fillStyle='#aebdab';c.font='500 28px monospace';c.fillText('THE CONNECTION  /  players.js',64,90);
    c.fillStyle=paper;c.font=`800 64px ${font}`;c.fillText('Keep what passes.',64,215);
    c.fillStyle=citron;c.font='500 42px monospace';c.fillText('players.filter(',64,365);c.fillText('  p => !p.team',64,440);c.fillText(')',64,515);
    c.fillStyle='#aebdab';c.font=`400 30px ${font}`;c.fillText('No team? Keep the player.',64,660);
  });
  label(codePanel,3.17,2.02,codeTexture,0,0,.045);
  track(codePanel,[{p:[0,.3,-1],s:.001},{p:[.2,2.2,-.6],r:[-.08,0,0],s:1},{p:[-1.6,.3,-1.5],r:[-Math.PI/2,0,0],s:.4},{p:[-1.6,.3,-1.5],r:[-Math.PI/2,0,0],s:.4}]);

  // Three physical data keys, not cartoon people.
  ['R','D','S'].forEach((letter,i)=>{
    const token=new THREE.Group();root.add(token);cylinder(token,.4,.18,i===1?lime:chalk);cylinder(token,.32,.012,i===1?black:charcoal,0,.1);
    const tex=surfaceTexture(c=>{c.fillStyle=paper;c.textAlign='center';c.textBaseline='middle';c.font=`800 180px ${font}`;c.fillText(letter,256,256);},512,512);
    label(token,.43,.43,tex,0,.112,0,true);
    const x=-1.3+i*1.3;
    track(token,[{p:[x,-.3,.8],s:.001},{p:[x,1.2,.6],s:.9},{p:[x,.24,.65],s:1},{p:i===1?[1.9,.7,.15]:[-1.2+i*.6,.24,.65],s:i===1?1.2:.75}],i*.045);
  });
  // Filter gate: a sculptural split ring with a visible path through it.
  const gate=new THREE.Group();root.add(gate);
  const ringG=new THREE.TorusGeometry(.8,.032,8,72,Math.PI*1.75);geometries.push(ringG);
  const ring=new THREE.Mesh(ringG,lime);ring.rotation.z=.4;gate.add(ring);
  box(gate,1.95,.08,.25,edge,0,-.85,0);box(gate,.08,1.8,.1,charcoal,-.95,0,0);box(gate,.08,1.8,.1,charcoal,.95,0,0);
  track(gate,[{p:[0,0,0],s:.001},{p:[.1,1.3,-.5],r:[0,-.3,0],s:.7},{p:[.1,1.1,-.45],r:[0,0,0]},{p:[.1,1.1,-.45],r:[0,0,0],s:.82}]);

  const result=new THREE.Group();root.add(result);
  box(result,2.5,.2,2.55,edge,0,0,0);box(result,2.35,.1,2.4,chalk,0,.15,0);
  const resultPlate=new THREE.Group();result.add(resultPlate);box(resultPlate,2.8,2.13,.07,chalk);
  label(resultPlate,2.74,2.06,noteTexture('Team finder.','A list becomes a useful little tool.','result'),0,0,.044);
  resultPlate.position.set(0,1.45,-.85);resultPlate.rotation.x=-.1;
  track(result,[{p:[2.7,-1,-.3],s:.001},{p:[2.7,-.3,-.3],s:.001},{p:[2.35,.25,-.65],r:[0,-.18,0],s:.65},{p:[2.2,.22,-.45],r:[0,-.18,0],s:.9}]);

  // Thin orbital traces and registration points provide depth without a particle cloud.
  for(let i=0;i<2;i++){
    const g=new THREE.TorusGeometry(4.5+i*.5,.006,4,160,Math.PI*1.55);geometries.push(g);
    const m=material(i===0?'#69786d':'#46524c');const mesh=new THREE.Mesh(g,m);mesh.rotation.set(-Math.PI/2,0,i*.4);mesh.position.y=-.2-i*.03;root.add(mesh);
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;const dot=cylinder(root,.028,.02,lime,Math.cos(a)*4.5,-.18,Math.sin(a)*4.5);dot.castShadow=false;
  }

  let contextFailed=false;
  let destroyed=false,reduce=options.reduced,playing=false,visible=true,raf=0,last=0,elapsed=0,position=0,target=0,reported=-1,settle=1;
  let explosion=0,explodeTarget=0;
  let yaw=0,pitch=0,targetYaw=0,targetPitch=0,drag=false,startX=0,startY=0,startYaw=0,startPitch=0;
  const angles=[[-.1,1.15],[.12,1.07],[-.12,.92],[.02,1.0]];
  function wake(){if(!destroyed&&!contextFailed&&visible&&!document.hidden&&!raf)raf=requestAnimationFrame(render);}
  function setPlaying(value:boolean){playing=value;options.onPlaying(value);}
  function pose(item:Moving,where:number){
    const a=Math.floor(where),b=Math.min(3,a+1),f=smooth(Math.max(0,Math.min(1,(where-a-item.delay)/(1-item.delay))));
    const from=item.poses[a],to=item.poses[b];
    item.object.position.set(...from.p.map((v,i)=>mix(v,to.p[i],f)) as [number,number,number]);
    const ar=from.r||[0,0,0],br=to.r||[0,0,0];item.object.rotation.set(...ar.map((v,i)=>mix(v,br[i],f)) as [number,number,number]);
    item.object.scale.setScalar(mix(from.s??1,to.s??1,f));
  }
  function render(time:number){
    raf=0;if(destroyed||!visible||document.hidden)return;
    const dt=Math.min((time-(last||time))/1000,.05);last=time;
    if(playing){elapsed+=dt;target=Math.min(3,elapsed/3.8);if(elapsed>=13.6)setPlaying(false);}
    position=reduce?target:mix(position,target,1-Math.exp(-dt*5));if(Math.abs(target-position)<.0003)position=target;
    yaw=reduce?0:mix(yaw,targetYaw,.08);pitch=reduce?0:mix(pitch,targetPitch,.08);
    moving.forEach(item=>pose(item,position));
    explosion=reduce?explodeTarget:mix(explosion,explodeTarget,1-Math.exp(-dt*4));
    midLayer.position.y=.045+explosion*.36;topLayer.position.y=.09+explosion*.75;
    for(const item of moving){if(item.object!==base){item.object.position.y+=explosion*(.8+item.delay*2);}}
    gate.rotation.y+=explosion*.7;codePanel.rotation.x+=explosion*.3;
    resultPlate.position.y=1.45+explosion*.65;
    const stage=Math.min(3,Math.floor(position+.12));if(stage!==reported){reported=stage;if(playing)options.onChapter(stage);}
    const a=Math.floor(position),b=Math.min(3,a+1),f=smooth(position-a);
    const cameraAngle=mix(angles[a][0],angles[b][0],f)+yaw, height=mix(angles[a][1],angles[b][1],f)+pitch;
    camera.position.set(Math.sin(cameraAngle+.53)*11,7.5*height,Math.cos(cameraAngle+.53)*11);camera.lookAt(0,1,0);
    renderer.render(scene,camera);
    settle=Math.abs(explosion-explodeTarget)+Math.abs(target-position)+Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch);
    if(playing||(!reduce&&settle>.0006)||drag)wake();
  }
  function resize(){const {width,height}=canvas.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height;const size=aspect<1?4.6:3.55;camera.left=-size*aspect;camera.right=size*aspect;camera.top=size;camera.bottom=-size;camera.updateProjectionMatrix();wake();}
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;if(visible){last=0;wake();}else{cancelAnimationFrame(raf);raf=0;}},{threshold:.01});intersection.observe(canvas);
  function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=0;wake();}}
  function down(e:PointerEvent){if(reduce||e.pointerType!=='mouse')return;drag=true;startX=e.clientX;startY=e.clientY;startYaw=targetYaw;startPitch=targetPitch;canvas.setPointerCapture(e.pointerId);wake();}
  function move(e:PointerEvent){if(!drag)return;targetYaw=THREE.MathUtils.clamp(startYaw+(e.clientX-startX)*.004,-.65,.65);targetPitch=THREE.MathUtils.clamp(startPitch+(e.clientY-startY)*.002,-.2,.2);wake();}
  function up(){drag=false;wake();}
  function lost(e:Event){e.preventDefault();contextFailed=true;setPlaying(false);options.onFailure();cancelAnimationFrame(raf);raf=0;}
  document.addEventListener('visibilitychange',visibility);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('webglcontextlost',lost);
  resize();wake();
  if(!reduce)setPlaying(true);
  return {
    chapter(index){explodeTarget=0;setPlaying(false);target=Math.max(0,Math.min(3,index));elapsed=target*3.8;last=0;wake();},
    play(){explodeTarget=0;if(reduce)return;if(target>=3){target=0;position=0;elapsed=0;}setPlaying(true);last=0;wake();},
    pause(){setPlaying(false);target=position;elapsed=position*3.8;},
    explode(value){setPlaying(false);target=2;elapsed=7.6;explodeTarget=value?1:0;options.onChapter(2);last=0;wake();},
    reduced(value){reduce=value;if(value){drag=false;setPlaying(false);target=Math.round(position);position=target;options.onChapter(target);targetYaw=0;targetPitch=0;}wake();},
    destroy(){destroyed=true;cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('lostpointercapture',up);canvas.removeEventListener('webglcontextlost',lost);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();}
  };
}
