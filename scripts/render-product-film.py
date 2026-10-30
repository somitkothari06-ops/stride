"""Create the submission film from actual CUA screen captures; no invented UI."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math, wave, array, subprocess, sys, json
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/product-film'; SHOTS=OUT/'screens'; R=OUT/'render';R.mkdir(parents=True,exist_ok=True)
FF=sys.argv[1]
W,H=1920,1080
BG='#f0f0f5';INK='#242734';MUTED='#626674';LILAC='#ded8eb';PEACH='#ecc8b5';PAPER='#ffffff'
F='/System/Library/Fonts/Supplemental/'
def font(n,serif=False):return ImageFont.truetype(F+('Georgia.ttf' if serif else 'Arial.ttf'),n)
def bold(n):return ImageFont.truetype(F+'Arial Bold.ttf',n)
def wrap(d,text,f,width):
 lines=[];line=''
 for word in text.split():
  test=(line+' '+word).strip()
  if d.textlength(test,font=f)>width and line:lines.append(line);line=word
  else:line=test
 if line:lines.append(line)
 return lines
scenes=[
 ('intro',6,'Your class.','Your next move.','A personal workspace for engineering students.'),
 ('01-landing.png',9,'01 / START SOMEWHERE','Your notes. Your ideas. Your next move.','A working desktop, from the first visit.'),
 ('02-home.png',7,'02 / MAKE ROOM','A desk that stays yours.','Open tools, move them and keep your work in view.'),
 ('03-library.png',9,'03 / BRING YOUR COURSE','Real college files.','PDFs and lecture slides, imported into this filming workspace.'),
 ('04-study.png',11,'04 / UNDERSTAND IT','Teach from the actual pages.','Text and selected PDF-page images become a source-linked lesson.'),
 ('05-example.png',8,'05 / GO DEEPER','One idea. Worked through.','Switch between an explanation, an example and a question to try.'),
 ('06-build-code.png',10,'06 / MAKE IT REAL','Write it. Run it.','JavaScript executes in an isolated browser worker. The result is real.'),
 ('07-feedback.png',10,'07 / TAKE ANOTHER STEP','Feedback on your own attempt.','Save the work, ask for feedback and continue with a concrete next step.'),
 ('08-memory.png',11,'08 / PICK UP THE THREAD','Your earlier work comes back.','Pip retrieves relevant dated records instead of starting from zero.'),
 ('09-journal.png',9,'09 / SEE THE MONTH','Small sessions add up.','20 illustrative study sessions across a month. Sample history, clearly labelled.'),
 ('10-artifacts.png',8,'10 / KEEP THE WORK','More than a chat transcript.','Open saved artifacts, explanations and the next thing you wanted to try.'),
 ('11-themes.png',7,'11 / MAKE IT YOURS','A space you want to return to.','Choose the palette and button style that suit you.'),
 ('12-customize.png',7,'12 / THE LITTLE DETAILS','Your desktop, your way.','Graph paper. Roomy dock. Crisp windows. Preview before saving.'),
 ('13-desktop.png',9,'13 / WORK SIDE BY SIDE','Notes. Code. Pip. Together.','Independent windows resize, minimise and reopen while retaining drafts.'),
 ('architecture',10,'POWERED BY NVIDIA × NEBIUS','The models do useful work.','Not a decorative chat wrapper.'),
 ('outro',7,'stride.','Learn it. Make it yours.','Try the public demo. Build a next step of your own.'),
]
manifest=[]
for i,(shot,duration,kicker,title,caption) in enumerate(scenes):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 d.text((66,38),'stride.',font=bold(38),fill=INK)
 d.text((1510,48),'PRODUCT WALKTHROUGH',font=font(17),fill=MUTED)
 d.line((66,100,1854,100),fill='#c9cbd4',width=2)
 if shot in ('intro','outro'):
  d.rounded_rectangle((1250,230,1740,820),18,fill=LILAC,outline=INK,width=2)
  d.rectangle((1250,230,1740,302),fill='#d1d9e4',outline=INK,width=2)
  d.text((1280,254),'Your next thing',font=bold(23),fill=INK)
  for j,(label,col) in enumerate([('Your notes','#d5dfe9'),('Your build',PEACH),('Your progress','#dbe4ca')]):
   yy=360+j*128;d.rounded_rectangle((1290,yy,1700,yy+98),10,fill=col,outline=INK,width=2);d.text((1320,yy+33),label,font=bold(27),fill=INK)
  d.text((90,245),'FROM A LECTURE TO SOMETHING OF YOUR OWN',font=bold(20),fill=MUTED)
  yy=330
  for line in [kicker,title]:
   for sub in wrap(d,line,font(106,True),1090):d.text((85,yy),sub,font=font(106,True),fill=INK);yy+=132
  for j,line in enumerate(wrap(d,caption,font(31),1040)):d.text((92,yy+45+j*42),line,font=font(31),fill=MUTED)
  d.rounded_rectangle((92,850,720,940),12,fill=INK);d.text((124,880),'Open Stride  →',font=bold(30),fill=PAPER)
  d.text((90,993),'NVIDIA Nemotron on Nebius Token Factory',font=font(23),fill=MUTED)
 elif shot=='architecture':
  d.text((85,155),kicker,font=bold(23),fill=MUTED);d.text((85,220),title,font=font(66,True),fill=INK)
  boxes=[(90,'YOUR WORK','Course files · questions · attempts','#d5dfe9'),(680,'NEBIUS TOKEN FACTORY','NVIDIA Nemotron models',LILAC),(1270,'YOUR NEXT STEP','Lesson · feedback · saved context',PEACH)]
  for x,head,body,col in boxes:
   d.rounded_rectangle((x,370,x+540,670),16,fill=col,outline=INK,width=2);d.text((x+30,414),head,font=bold(23),fill=INK)
   for j,line in enumerate(wrap(d,body,font(33),475)):d.text((x+30,480+j*45),line,font=font(33),fill=INK)
  d.text((637,490),'→',font=font(42),fill=INK);d.text((1227,490),'→',font=font(42),fill=INK)
  details=['Nemotron Lightning — chat, planning and formative feedback.','Nemotron Super VL — selected PDF-page images plus text.','Nebius Devlab — application, private SQLite storage and background preparation.']
  for j,line in enumerate(details):d.text((92,735+j*64),line,font=font(28),fill=INK)
  d.text((92,1000),'Retrieved context is bounded. Model feedback is not proof of mastery.',font=font(23),fill=MUTED)
 else:
  p=SHOTS/shot
  if not p.exists():raise SystemExit('Missing capture: '+str(p))
  screen=Image.open(p).convert('RGB');screen.thumbnail((1510,850),Image.Resampling.LANCZOS)
  x=(W-screen.width)//2;y=118
  d.rounded_rectangle((x+9,y+10,x+screen.width+9,y+screen.height+10),12,fill='#c5c6ce')
  im.paste(screen,(x,y));d=ImageDraw.Draw(im);d.rectangle((x,y,x+screen.width,y+screen.height),outline='#b7b9c4',width=2)
  # A small top ribbon and a separate caption bar keep the actual interface legible.
  d.rounded_rectangle((x+20,y+18,x+600,y+61),6,fill=INK);d.text((x+36,y+29),kicker,font=bold(19),fill=PAPER)
  d.rectangle((0,925,W,H),fill=BG)
  d.text((88,945),title,font=bold(35),fill=INK)
  d.text((88,999),caption,font=font(25),fill=MUTED)
  d.text((1600,1050),'REAL APP · DEMO DATA',font=font(14),fill=MUTED)
 d.rectangle((0,H-5,int(W*(i+1)/len(scenes)),H),fill=INK)
 png=R/f'{i:02d}.png';im.save(png)
 clip=R/f'{i:02d}.mp4';frames=duration*30
 # Smooth camera move on genuine captures; no fake loading or simulated model output.
 zoom="min(1.035,1+on*0.00010)"
 vf=f"scale=2304:1296,zoompan=z='{zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={frames}:s=1920x1080:fps=30,fade=t=in:st=0:d=0.18,fade=t=out:st={duration-.18}:d=0.18,format=yuv420p"
 if not clip.exists():subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-i',str(png),'-vf',vf,'-frames:v',str(frames),'-c:v','libx264','-preset','veryfast','-crf','20','-threads','4',str(clip)],check=True)
 manifest.append({'capture':shot,'duration':duration,'caption':caption});print(f'Rendered {i+1}/{len(scenes)}: {shot}',flush=True)
(OUT/'edit-manifest.json').write_text(json.dumps(manifest,indent=2))
concat=R/'clips.txt';concat.write_text(''.join("file '"+str(R/f'{i:02d}.mp4')+"'\n" for i in range(len(scenes))))
total=sum(s[1] for s in scenes)
# Original instrumental score. No external recording, copyrighted song or voice clone.
sr=16000;audio=array.array('h');chords=[(146.83,185,220),(130.81,164.81,196),(164.81,196,246.94),(110,138.59,164.81)];beat=60/108
for n in range(total*sr):
 t=n/sr;bar=int(t/(beat*4));chord=chords[(bar//2)%4];phase=t%(beat*4);envelope=min(1,phase/.08)*min(1,(beat*4-phase)/.2)
 pad=sum(math.sin(2*math.pi*f*t)*.06 for f in chord)*envelope
 b=t%beat;kick=math.sin(2*math.pi*(48*b+15*(1-math.exp(-35*b))))*math.exp(-b*24)*.2
 note=chord[int(t/(beat/2))%3]*4;pos=t%(beat/2);pluck=math.sin(2*math.pi*note*t)*math.exp(-pos*12)*.075
 pulse=math.sin(2*math.pi*6500*t)*math.exp(-(t%(beat/2))*120)*.025
 fade=min(1,t/2,(total-t)/3);v=int(max(-.95,min(.95,(pad+kick+pluck+pulse)*fade)) * 22000);audio.extend([v,int(v*.96)])
score=OUT/'original-score.wav'
with wave.open(str(score),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(sr);f.writeframes(audio.tobytes())
final=OUT/'Stride-Product-Demo.mp4'
subprocess.run([FF,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-i',str(score),'-c:v','copy','-c:a','aac','-b:a','192k','-af','loudnorm=I=-18:TP=-2:LRA=8','-movflags','+faststart','-shortest',str(final)],check=True)
print(json.dumps({'output':str(final),'durationSeconds':total,'sizeMB':round(final.stat().st_size/1e6,1)}),flush=True)
