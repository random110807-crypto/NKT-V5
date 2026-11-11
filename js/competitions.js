import { configuredEvents, renderEventCard, startCountdownClock, safeEventUrl, eventState } from './event-utils.js';
const byId=id=>document.getElementById(id);
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function renderConfiguredGroup(root,title,events,demo=false){
  if(!events.length)return;
  const section=make('section','clubhouse-section competition-group');
  const head=make('div','clubhouse-section-head');head.append(make('h3','clubhouse-subtitle',title));section.append(head);
  events.sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).forEach(event=>section.append(renderEventCard(section,event,{demo:Boolean(event._demo)})));
  root.append(section);
}
export function initCompetitions(config){
 const button=byId('open-competitions'),fallback=byId('competitions-fallback'),root=byId('competition-content');
 const render=dashboard=>{
  root.replaceChildren();
  const configured=configuredEvents(config);
  renderConfiguredGroup(root,'NKT CLASH OF CLUBS',configured.events.filter(e=>e.type==='mca'),configured.demo);
  renderConfiguredGroup(root,'VOTE CHESS',configured.events.filter(e=>e.type==='voteChess'),configured.demo);

  const now=Date.now();
  const matches=(dashboard?.clubMatches?.matches||[]).filter(m=>
    (m.status==='in_progress'&&(!m.endTime||m.endTime*1000>now))||(m.status==='registered'&&m.startTime&&m.startTime*1000>now))
    .sort((a,b)=>a.status===b.status?(a.startTime||0)-(b.startTime||0):(a.status==='in_progress'?-1:1));
  if(matches.length){
    const group=make('section','clubhouse-section competition-group');
    const head=make('div','clubhouse-section-head');head.append(make('h3','clubhouse-subtitle','♜  CLUB TEAM MATCHES'));group.append(head);
    matches.slice(0,8).forEach(m=>{
      const card=make('article','nkt-event-card nkt-event-team');
      card.append(make('div','nkt-event-kicker',m.status==='in_progress'?'LIVE MATCH':'UPCOMING MATCH'));
      card.append(make('h4','nkt-event-title',m.name||'NKT Team Match'));
      if(m.opponent)card.append(make('p','nkt-event-opponent',`Opponent: ${m.opponent.replaceAll('-',' ')}`));
      if(m.startTime){
        const date=make('p','nkt-event-date',new Date(m.startTime*1000).toLocaleString());card.append(date);
        if(m.status!=='in_progress'){
          const timer=make('div','nkt-event-countdown','—');timer.dataset.countdown='true';timer.dataset.start=String(m.startTime*1000);timer.dataset.end=m.endTime?String(m.endTime*1000):'';card.append(timer);
        }else card.append(make('div','nkt-event-countdown is-live','LIVE NOW'));
      }
      const href=safeEventUrl(m.url);
      if(href){const link=make('a','nkt-event-join','VIEW MATCH ↗');link.href=href;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
      group.append(card);
    });
    root.append(group);
  }
  if(!root.children.length){
    const p=make('p','empty-state','No upcoming or active club events are configured right now. Add MCA or Vote Chess events in js/config.js.');
    root.append(p);
  }
  button.hidden=false;
  fallback.hidden=true;
  startCountdownClock();
 };
 button.hidden=false;
 return render;
}
