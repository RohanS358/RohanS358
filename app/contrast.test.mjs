const TONE={simblip:"#2b57ff",saul:"#0a0a0a",looni:"#ff5147",rotary:"#1f9c6b",copaila:"#ffc93f",bijulibatti:"#7b61ff",orbital:"#0a0a0a",refill:"#127a54",rover:"#1d3fd4",fraud:"#8e93a3",hackforbusiness:"#e8402f"};
const REL=h=>{const c=h.replace('#','').match(/../g).map(x=>{let v=parseInt(x,16)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
const con=(a,b)=>{const[l1,l2]=[REL(a),REL(b)];return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
const PAPER="#ffffff", INK="#0a0a0a";
const inkOn=s=>{const bg=TONE[s];return con(bg,PAPER)>=con(bg,INK)?PAPER:INK;};
let fail=0;
for(const [slug,bg] of Object.entries(TONE)){
  const fg=inkOn(slug); const r=con(bg,fg);
  const ok=r>=4.5;
  if(!ok){console.log(`FAIL ${slug} ${bg} fg=${fg} ratio=${r.toFixed(2)}`);fail++;}
  else console.log(`ok   ${slug.padEnd(16)} ${bg} fg=${fg==='#ffffff'?'white':'black'} ${r.toFixed(2)}`);
}
console.log(fail? `\n${fail} FAILURES` : '\nPASS — every tone clears WCAG AA (4.5:1) with its chosen text colour');
process.exit(fail?1:0);
