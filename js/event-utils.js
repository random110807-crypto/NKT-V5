const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function safeEventUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}
}
export function eventState(event,now=Date.now()){
  const start=Date.parse(event.startAt||'');
  const end=Date.parse(event.endAt||'');
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return 'invalid';
  if(end<=now)return 'finished';
  if(start<=now)return 'live';
  return 'upcoming';
}
export function configuredEvents(config){
  const demo=Boolean(config?.demoMode ?? config?.DEMO_MODE);
  const raw=config?.events||{};
  const manual=[
    ...(raw.mca||[]).map((e,i)=>({...e,type:'mca',id:e.id||`mca-${i}`})),
    ...(raw.voteChess||[]).map((e,i)=>({...e,type:'voteChess',id:e.id||`vote-${i}`}))
  ];
  const validManual=manual.filter(e=>eventState(e)!=='invalid'&&eventState(e)!=='finished'&&safeEventUrl(e.url||e.joinUrl||e.eventUrl));
  if(!demo)return {events:validManual.map(e=>({...e,_demo:false})),demo:false};
  const sample=config?.demoData?.events||[];
  const events=[];
  for(const type of ['mca','voteChess']){
    const real=validManual.filter(e=>e.type===type);
    if(real.length)events.push(...real.map(e=>({...e,_demo:false})));
    else events.push(...sample.filter(e=>e.type===type&&eventState(e)!=='invalid'&&eventState(e)!=='finished').map(e=>({...e,_demo:true})));
  }
  return {events,demo:events.some(e=>e._demo)};
}
export function renderEventCard(root,event,{compact=false,demo=false}={}){
  const card=make('article',`nkt-event-card ${event.type==='mca'?'nkt-event-mca':'nkt-event-vote'}${compact?' nkt-event-compact':''}`);
  const state=eventState(event);
  const type=event.type==='mca'?'NKT CLASH OF CLUBS':'VOTE CHESS';
  card.append(make('div','nkt-event-kicker',type));
  card.append(make('h4','nkt-event-title',event.type==='mca'?'NKT CLASH OF CLUBS':(event.title||'NKT Vote Chess')));
  if(event.opponent)card.append(make('p','nkt-event-opponent',event.opponent));
  const start=new Date(event.startAt);
  card.append(make('p','nkt-event-date',start.toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})));
  const timer=make('div','nkt-event-countdown',state==='live'?'LIVE NOW':'—');
  timer.dataset.countdown='true';timer.dataset.start=String(start.getTime());
  timer.dataset.end=event.endAt?String(Date.parse(event.endAt)):'';
  timer.setAttribute('aria-live','off');card.append(timer);
  if(demo)card.append(make('span','demo-ribbon','DEMO PREVIEW · SAMPLE EVENT'));
  const href=safeEventUrl(event.url||event.joinUrl||event.eventUrl);
  if(href){const link=make('a','nkt-event-join','JOIN NOW ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
  return card;
}
let timer=null;
function updateCountdowns(){
  document.querySelectorAll('[data-countdown="true"]').forEach(node=>{
    const start=Number(node.dataset.start),end=Number(node.dataset.end)||null,now=Date.now();
    if(end&&now>=end){node.textContent='EVENT ENDED';const card=node.closest('.nkt-event-card');if(card)card.hidden=true;return;}
    if(now>=start){node.textContent='LIVE NOW';node.classList.add('is-live');return;}
    const total=Math.max(0,start-now),days=Math.floor(total/86400000),hours=Math.floor(total%86400000/3600000),
      minutes=Math.floor(total%3600000/60000),seconds=Math.floor(total%60000/1000);
    node.textContent=`STARTS IN  ${days}D ${String(hours).padStart(2,'0')}H ${String(minutes).padStart(2,'0')}M ${String(seconds).padStart(2,'0')}S`;
  });
}
export function startCountdownClock(){
  if(timer!==null)return;
  const start=()=>{if(timer===null){updateCountdowns();timer=setInterval(updateCountdowns,1000);}};
  const stop=()=>{if(timer!==null){clearInterval(timer);timer=null;}};
  document.addEventListener('visibilitychange',()=>document.hidden?stop():start());
  start();
}
