(function(root){
  'use strict';
  const PRODUCTS=Object.freeze({loan:'Кредит',credit_card:'Кредитная карта',debit_card:'Дебетовая карта',deposit:'Вклад',subscription:'Подписка',savings:'Накопительный счёт',other:'Другие продукты'});
  const STATUSES=Object.freeze({arrest:'Есть арест',overdue:'Есть просрочка',blocked_cards:'Есть заблокированные карты',no_products:'Без продуктов'});
  const fail=path=>{throw new Error('Ошибка структуры JSON: '+path);};
  const str=(v,max,path,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim())||/[\u0000-\u001f\u007f]/.test(v))fail(path+': ожидается '+(empty?'строка':'непустая строка')+' до '+max+' символов без управляющих знаков');};
  function validate(data){
    if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).some(k=>k!=='clients')||!Array.isArray(data.clients)||data.clients.length>1000)fail('clients: ожидается массив до 1000 клиентов');
    const keys=['name','login','password','id','products','available','access_note','other_passwords','no_products'];
    data.clients.forEach((c,i)=>{
      const p='clients['+i+']';
      if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!keys.includes(k)))fail(p+': неизвестные поля или неверный объект');
      str(c.name,160,p+'.name');
      for(const [k,max] of [['login',128],['password',256],['id',128]])if(c[k]!==null&&c[k]!==undefined)str(c[k],max,p+'.'+k,true);
      if(typeof c.available!=='boolean')fail(p+'.available: ожидается true или false');
      if(!Array.isArray(c.products)||c.products.length>50)fail(p+'.products: ожидается массив строк до 50 элементов');
      c.products.forEach((v,j)=>str(v,500,p+'.products['+j+']'));
      if(c.access_note!==undefined)str(c.access_note,1000,p+'.access_note',true);
      if(c.other_passwords!==undefined){if(!Array.isArray(c.other_passwords)||c.other_passwords.length>30)fail(p+'.other_passwords');c.other_passwords.forEach((v,j)=>str(v,256,p+'.other_passwords['+j+']'));}
      if(c.no_products!==undefined&&typeof c.no_products!=='boolean')fail(p+'.no_products');
      if(c.no_products===true&&c.products.length)fail(p+'.no_products: не совмещается с непустым products');
    });
    return data;
  }
  function access(c){
    const missing=[];
    if(!c.login?.trim())missing.push('Не указан логин.');
    if(!c.password?.trim())missing.push('Не указан пароль.');
    const available=c.available&&!missing.length;
    const note=c.access_note?.trim()||'';
    const reasons=available?[]:[note,...missing.filter(reason=>!note.toLocaleLowerCase('ru').includes(reason.slice(0,-1).toLocaleLowerCase('ru')))].filter(Boolean);
    return {available,reason:available?'':reasons.join(' ')||'Учётная запись недоступна.'};
  }
  function visibleProducts(c){return c.products.length?[...c.products]:[c.no_products===true?'Продуктов нет':'Нет данных о продуктах'];}
  const description=c=>visibleProducts(c).join(' · ');
  function tagStatuses(text){
    const result=[];
    if(/арест/i.test(text)&&!/без\s+арест|арест[а-яё]*\s+нет/i.test(text))result.push('arrest');
    if(/просроч/i.test(text)&&!/без\s+просроч|не\s*просроч|просроч[а-яё]*\s+нет/i.test(text))result.push('overdue');
    if(/карт/i.test(text)&&/заблокирован|блокиров/i.test(text)&&!/разблокирован|не\s*заблокирован|без\s+блокиров/i.test(text))result.push('blocked_cards');
    return result;
  }
  function productTypes(c){return [...new Set(c.products.flatMap(v=>{
    if(/кредитн[а-яё]*\s+карт|кредитк/i.test(v))return ['credit_card'];
    if(/дебетов|прибыл|бюджетн[а-яё]*\s+карт/i.test(v))return ['debit_card'];
    if(/накопител/i.test(v))return ['savings'];
    if(/вклад/i.test(v))return ['deposit'];
    if(/подпис|премиал[а-яё]*\s+пакет/i.test(v))return ['subscription'];
    if(/кредит|ипотек|рефинанс/i.test(v))return ['loan'];
    if(/арест|продукт[а-яё]*\s+нет|нет\s+данных/i.test(v))return [];
    return ['other'];
  }))];}
  const clientStatuses=c=>[...new Set([...c.products.flatMap(tagStatuses),...(c.no_products===true?['no_products']:[])])];
  const normalize=v=>String(v??'').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
  function matches(c,f){
    const any=(selected,values)=>!selected.size||values.some(v=>selected.has(v));
    if(!any(f.products,productTypes(c))||!any(f.statuses,clientStatuses(c))||!any(f.availability,[access(c).available?'available':'unavailable']))return false;
    const hay=normalize([c.name,c.login,c.id,...c.products,c.access_note,...productTypes(c).map(t=>PRODUCTS[t]),...clientStatuses(c).map(s=>STATUSES[s])].join(' '));
    return normalize(f.query).split(/\s+/).filter(Boolean).every(word=>hay.includes(word));
  }
  const catalogOrder=clients=>[...clients].sort((a,b)=>Number(!access(a).available)-Number(!access(b).available));
  const api={PRODUCTS,STATUSES,validate,access,description,visibleProducts,tagStatuses,productTypes,clientStatuses,matches,catalogOrder};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TestingCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
