(function(root) {
  'use strict';
  const ASSETS = Array.from({length:16},(_,i)=>'./assets/celebration/meme-'+String(i+1).padStart(2,'0')+'.png');
  function shuffled(items,random=Math.random) {
    const result=[...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    return result;
  }
  function flight({x,y,drift,fall,lift,rotation},steps=36) {
    return Array.from({length:steps+1},(_,i)=>{
      const t=i/steps;
      return {offset:t,transform:'translate3d('+(x-drift*t)+'px,'+(y-lift*t+(fall+lift)*t*t)+'px,0) rotate('+(rotation*t)+'deg) scale('+(0.5+0.5*Math.min(t*8,1))+')',opacity:t===0||t===1?0:1};
    });
  }
  function create(button,layer,announce) {
    let bag=[];
    const active=new Map();
    const next=()=>{if(!bag.length)bag=shuffled(ASSETS);return bag.pop();};
    return function celebrate() {
      announce('Тест завершен. Отличная работа!');
      const box=button.getBoundingClientRect(),width=window.innerWidth,height=window.innerHeight;
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const size=Math.min(150,width*0.3),count=reduced?1:6;
      for(let i=0;i<count;i++){
        if(active.size>=18){const [old,animation]=active.entries().next().value;animation.cancel();old.remove();active.delete(old);}
        const img=document.createElement('img');img.className='meme-particle';img.alt='';img.draggable=false;img.width=size;img.height=size;img.src=next();
        const x=Math.min(width-size-8,Math.max(8,box.right-size/2-15)),y=box.bottom+8;
        const frames=reduced?[{opacity:0,transform:'translate3d('+x+'px,'+y+'px,0)'},{opacity:1,offset:0.15,transform:'translate3d('+x+'px,'+y+'px,0)'},{opacity:1,offset:0.8,transform:'translate3d('+x+'px,'+y+'px,0)'},{opacity:0,transform:'translate3d('+x+'px,'+y+'px,0)'}]:flight({x,y,drift:Math.min(width*0.75,250+Math.random()*380),fall:height+size-y,lift:130+Math.random()*190,rotation:(Math.random()-.5)*190});
        layer.append(img);
        const animation=img.animate(frames,{duration:reduced?1800:2400+Math.random()*700,delay:i*100,easing:'linear',fill:'both'});
        active.set(img,animation);
        const clear=()=>{img.remove();active.delete(img);};
        img.onerror=()=>{animation.cancel();clear();};
        animation.finished.then(clear,clear);
      }
    };
  }
  const api={ASSETS,shuffled,flight,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TestCelebration=api;
})(typeof globalThis!=='undefined'?globalThis:this);
