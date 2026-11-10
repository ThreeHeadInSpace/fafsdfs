(() => {
  'use strict';
  const C=globalThis.TestingCore,$=id=>document.getElementById(id);
  const state={clients:[],loaded:false,busy:false,query:'',products:new Set(),statuses:new Set(),availability:new Set()};
  const labels={name:'ФИО',login:'Логин',password:'Пароль',id:'ID'};
  let toastTimer,lastFocus;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  function view(name,focus=true){
    if(!['welcome','catalog','help'].includes(name))name='welcome';
    document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!==name);
    document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(name==='catalog'&&!state.loaded)load();
    if(focus){const h=$(name).querySelector('h1');h.setAttribute('tabindex','-1');h.focus();window.scrollTo({top:0,behavior:'instant'});}
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();view('welcome');});
  $('start').addEventListener('click',()=>view('catalog'));
  function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2800);}
  function openDialog(d){lastFocus=document.activeElement;d.showModal();}
  document.querySelectorAll('dialog').forEach(d=>{
    d.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>d.close()));
    d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close();});
    d.addEventListener('close',()=>{if(d.id==='manual-copy')$('copy-value').value='';lastFocus?.focus();});
  });
  $('finish').addEventListener('click',globalThis.TestCelebration.create($('finish'),$('celebration-layer'),notify));
  async function copy(value,message,button){
    try{
      if(!navigator.clipboard?.writeText)throw new Error();
      await navigator.clipboard.writeText(value);
    }catch{
      openDialog($('manual-copy'));
      $('copy-value').value=value;$('copy-value').focus();$('copy-value').select();
      return;
    }
    notify(message);
    const icon=button.querySelector('.copy-icon');
    if(icon){icon.textContent='✓';setTimeout(()=>icon.textContent='⧉',1800);}
  }
  function copyField(key,value,label=labels[key]){
    const missing=value===null||value===undefined||value==='';
    const b=node('button','copy-field');b.type='button';b.setAttribute('aria-label','Скопировать: '+label);b.title=missing?'Значение не указано':'Скопировать: '+label;
    b.append(node('span','copy-label',label),node('span','copy-value',missing?'Не указан':value),node('span','copy-icon',missing?'—':'⧉'));
    b.lastChild.setAttribute('aria-hidden','true');b.disabled=missing;
    if(!missing)b.addEventListener('click',()=>copy(value,label+' — скопировано',b));return b;
  }
  function card(c,index){
    const access=C.access(c),el=node('article','account-card '+(access.available?'available':'unavailable')),head=node('div','card-head'),body=node('div','card-body');
    const full=node('button','copy-full','Copy full');
    full.type='button';
    full.title='Скопировать ФИО, логин, основной пароль и ID';
    full.addEventListener('click',()=>copy([c.name,c.login,c.password,c.id].join('\n'),'Данные клиента скопированы',full));
    const actions=node('div','card-actions');
    actions.append(node('span','card-index','УЧЁТКА / '+String(index+1).padStart(2,'0')),full);
    head.append(actions,node('span','availability',access.available?'Доступна':'Недоступна'));el.append(head);
    if(!access.available)el.append(node('div','warning-ribbon','⚠ НЕДОСТУПНА · '+access.reason));
    const title=node('h3','',c.name),summary=node('div','card-tags product-summary');title.id='client-'+index;el.setAttribute('aria-labelledby',title.id);body.append(title);
    summary.setAttribute('aria-label','Продукты клиента');
    C.visibleProducts(c).forEach((product,i)=>{
      if(i)summary.append(node('span','description-separator',' · '));
      const tone={arrest:'tag-arrest',overdue:'tag-overdue',blocked_cards:'tag-blocked'}[C.tagStatuses(product)[0]]||'';
      summary.append(node('span','tag product '+tone,product));
    });body.append(summary);
    const fields=node('div','fields');['name','login','password','id'].forEach(k=>fields.append(copyField(k,c[k])));
    (c.other_passwords||[]).forEach((password,i)=>fields.append(copyField('password',password,'Другой пароль '+(i+1))));body.append(fields);el.append(body);return el;
  }
  function render(){
    document.querySelectorAll('[data-product],[data-status],[data-availability]').forEach(b=>{const active=b.dataset.product?state.products.has(b.dataset.product):b.dataset.status?state.statuses.has(b.dataset.status):state.availability.has(b.dataset.availability);b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
    const all=!state.query&&!state.products.size&&!state.statuses.size&&!state.availability.size;$('all').classList.toggle('selected',all);$('all').setAttribute('aria-pressed',String(all));
    if(!state.loaded)return;
    const result=C.catalogOrder(state.clients.filter(c=>C.matches(c,state)));$('result-count').textContent='Найдено: '+result.length+' из '+state.clients.length;$('empty').hidden=result.length>0;$('cards').replaceChildren(...result.map(card));
  }
  function reset(){state.query='';state.products.clear();state.statuses.clear();state.availability.clear();$('search').value='';render();}
  ['reset','all','empty-reset'].forEach(id=>$(id).addEventListener('click',reset));
  $('search').addEventListener('input',e=>{state.query=e.target.value;render();});
  document.querySelectorAll('[data-columns-choice]').forEach(b=>b.addEventListener('click',()=>{$('cards').dataset.columns=b.dataset.columnsChoice;document.querySelectorAll('[data-columns-choice]').forEach(o=>o.setAttribute('aria-pressed',String(o===b)));}));
  function filters(target,values,attribute,set){Object.entries(values).forEach(([key,label])=>{const b=node('button','chip',label);b.dataset[attribute]=key;b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{set.has(key)?set.delete(key):set.add(key);render();});$(target).append(b);});}
  filters('product-filters',C.PRODUCTS,'product',state.products);filters('status-filters',C.STATUSES,'status',state.statuses);
  document.querySelectorAll('[data-availability]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.availability;state.availability.has(k)?state.availability.delete(k):state.availability.add(k);render();}));
  async function load(){
    if(state.busy)return;state.busy=true;
    $('loading').hidden=false;$('error').hidden=true;$('empty').hidden=true;$('cards').replaceChildren();$('cards').setAttribute('aria-busy','true');
    try{
      if(location.protocol==='file:')throw new Error();
      const response=await fetch('./data/test_clients_simple.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error();
      const raw=await response.text();
      if(raw.length>5000000)throw new Error();
      const data=JSON.parse(raw);
      C.validate(data);state.clients=data.clients;state.loaded=true;render();
    }catch(error){
      state.loaded=false;state.clients=[];$('error').hidden=false;$('result-count').textContent='Не удалось загрузить';
      if(location.protocol==='file:'){
        $('error-message').textContent='Запустите каталог через «Открыть сайт.cmd» или npm start.';
      }else $('error-message').textContent=error.message?.startsWith('Ошибка структуры JSON:')?error.message:'Не удалось прочитать данные. Проверьте test_clients_simple.json и обновите страницу.';
    }finally{state.busy=false;$('loading').hidden=true;$('cards').setAttribute('aria-busy','false');}
  }
  $('retry').addEventListener('click',load);view('catalog',false);
})();
