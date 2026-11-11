import { configuredEvents, renderEventCard } from './event-utils.js';
const byId = id => document.getElementById(id);
const el = (tag, cls, value) => { const n=document.createElement(tag); if(cls)n.className=cls; if(value!==undefined)n.textContent=value; return n; };
function fallbackAvatar(username){
  const raw=safeUser(username)||'?';
  const initials=raw.split(/[_\s-]+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?';
  const escaped=initials.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
  let hash=0;for(let i=0;i<raw.length;i++)hash=(hash*31+raw.charCodeAt(i))>>>0;
  const palette=['#24543b','#5c4824','#294a58','#4c3559','#6b3f32','#315b5a'];
  const bg=palette[hash%palette.length];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${bg}"/><circle cx="50" cy="50" r="43" fill="none" stroke="#d8b66e" stroke-opacity=".75" stroke-width="2"/><text x="50" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#f5e7c6">${escaped}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
const safeUser = value => String(value || '').trim();
function personLink(username, label=username) {
  const a=el('a','clubhouse-user',label || `@${username}`);
  if(username){a.href=`https://www.chess.com/member/${encodeURIComponent(username)}`;a.target='_blank';a.rel='noopener noreferrer';}
  return a;
}
function section(root,title,icon='♛',extra=''){
  const s=el('section','clubhouse-section');
  const head=el('div','clubhouse-section-head');head.append(el('h3','clubhouse-subtitle',`${icon}  ${title}`));
  if(extra)head.append(el('span','clubhouse-section-extra',extra));
  s.append(head);root.append(s);return s;
}
function avatar(username,src,cls='clubhouse-avatar'){
  const img=el('img',cls);img.alt=username?`${username} profile picture`:'';img.loading='lazy';img.decoding='async';
  img.src=typeof src==='string'&&/^https:\/\//i.test(src)?src:fallbackAvatar(username);
  img.onerror=()=>{img.onerror=null;img.src=fallbackAvatar(username);};return img;
}
function fmt(n,d=0){return Number.isFinite(Number(n))?Number(n).toLocaleString(undefined,{maximumFractionDigits:d}):'—';}
function renderMemberOfMonth(root,manual,profiles={}){
  if(!manual||!safeUser(manual.username))return false;
  const username=safeUser(manual.username),profile=profiles[username.toLowerCase()]||{};
  const s=section(root,'MEMBER OF THE MONTH','★','MANUAL SPOTLIGHT');s.classList.add('motm-section');
  const card=el('div','motm-card');
  card.append(avatar(username,manual.avatar||profile.avatar,'motm-avatar'));
  const copy=el('div','motm-copy');copy.append(personLink(username,manual.name||username));
  const rating=manual.rating||profile.bestRating;
  if(rating)copy.append(el('span','motm-rating',`♛ ${fmt(rating)} ${manual.ratingType||'Rapid'}`));
  if(manual.achievement)copy.append(el('p','motm-note',manual.achievement));
  else copy.append(el('p','motm-note','Recognised by the NKT team.'));
  card.append(copy,el('span','motm-crown','♛'));s.append(card);return true;
}
function renderPodium(root,rows,profiles={},opts={}){
  const valid=(Array.isArray(rows)?rows:[]).filter(r=>safeUser(r?.username)&&Number.isFinite(Number(r.ratingChange))&&Number(r.ratingChange)>0)
    .sort((a,b)=>Number(b.ratingChange)-Number(a.ratingChange)).slice(0,3);
  if(!valid.length)return false;
  const s=section(root,'MOST IMPROVED · MONTHLY','🏆',opts.demo?'DEMO PREVIEW':(opts.month||'THIS MONTH'));
  s.classList.add('nkt-podium-section','improved-section');
  const podium=el('div','clubhouse-podium premium-podium');
  const order=[1,0,2];
  order.forEach(i=>{
    const r=valid[i];if(!r)return;
    const username=safeUser(r.username),profile=profiles[username.toLowerCase()]||{};
    const item=el('article',`podium-card podium-${i+1} premium-podium-card`);
    item.append(avatar(username,r.avatar||profile.avatar,'podium-avatar'),el('span','podium-medal',i===0?'Ⅰ':i===1?'Ⅱ':'Ⅲ'),
      personLink(username,r.displayName||username),
      el('strong','podium-rating',`+${fmt(r.ratingChange)} pts`),
      el('span','podium-games',`Rapid ${fmt(r.rating ?? r.ratings?.chess_rapid)} · ${fmt(r.games)} games`));
    podium.append(item);
  });
  s.append(podium);
  const note=el('p','clubhouse-footnote','Monthly improvement is measured using Rapid rating only, against each player’s first valid monthly baseline.');s.append(note);
  if(opts.demo)s.append(el('span','demo-ribbon','SAMPLE DATA · NOT REAL CLUB RANKINGS'));
  return true;
}
function renderManualMca(root,rows,profiles={},demo=false){
  const valid=(Array.isArray(rows)?rows:[]).map(row=>({...row,username:safeUser(row?.username),points:Number(row?.points)}))
    .filter(row=>row.username&&Number.isFinite(row.points)&&row.points>0)
    .sort((a,b)=>b.points-a.points).slice(0,3);
  if(!valid.length)return false;
  const s=section(root,'MCA TOP PERFORMERS','✦',demo?'DEMO PREVIEW':'MANUAL RANKING');
  s.classList.add('nkt-podium-section','mca-podium-section');
  const podium=el('div','clubhouse-podium premium-podium');
  [1,0,2].forEach(i=>{
    const row=valid[i];if(!row)return;
    const profile=profiles[row.username.toLowerCase()]||{};
    const item=el('article',`podium-card podium-${i+1} premium-podium-card`);
    item.append(avatar(row.username,row.avatar||profile.avatar,'podium-avatar'),el('span','podium-medal',i===0?'Ⅰ':i===1?'Ⅱ':'Ⅲ'),
      personLink(row.username,row.name||row.username),el('strong','podium-rating',`${fmt(row.points)} pts`),
      el('span','podium-games','MCA points'));
    podium.append(item);
  });
  s.append(podium);
  if(demo)s.append(el('span','demo-ribbon','SAMPLE DATA · NOT REAL CLUB RANKINGS'));
  return true;
}

function renderFeaturedEvents(root,config){
  const {events,demo}=configuredEvents(config);
  if(!events.length)return false;
  const mca=events.filter(e=>e.type==='mca'),vote=events.filter(e=>e.type==='voteChess');
  if(mca.length){
    const s=section(root,'NKT CLASH OF CLUBS','♛',mca.some(e=>e._demo)?'DEMO PREVIEW':'FEATURED EVENT');
    s.classList.add('nkt-events-section','nkt-events-featured');
    mca.sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).forEach(e=>s.append(renderEventCard(s,e,{compact:true,demo:Boolean(e._demo)})));
  }
  if(vote.length){
    const s=section(root,'VOTE CHESS','♞',vote.some(e=>e._demo)?'DEMO PREVIEW':'UPCOMING & LIVE');
    s.classList.add('nkt-events-section','nkt-events-vote');
    vote.sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)).forEach(e=>s.append(renderEventCard(s,e,{compact:true,demo:Boolean(e._demo)})));
  }
  return true;
}

function renderOverall(root,rows,profiles={}){
  if(!Array.isArray(rows)||!rows.length)return;
  const s=section(root,'OVERALL CLUB RANKING','♜','MONTHLY');
  const list=el('div','clubhouse-rank-list');
  rows.slice(0,10).forEach((r,i)=>{
    const username=safeUser(r.username),profile=profiles[username.toLowerCase()]||{};
    const row=el('div','clubhouse-rank-row');
    row.append(el('span','rank-number',String(i+1)),avatar(username,r.avatar||profile.avatar,'rank-avatar'));
    const info=el('div','rank-info');info.append(personLink(username));info.append(el('small','rank-sub',`${fmt(r.games)} games · ${fmt(r.wins)} wins`));
    row.append(info,el('strong','rank-value',`${fmt(r.score,1)} pts`));list.append(row);
  });
  s.append(list);
  s.append(el('p','clubhouse-footnote','Activity score combines tracked rating progress, games played and win rate.'));
}
export function initClubhouse(config){
  const button=byId('open-clubhouse'),root=byId('clubhouse-content');
  button.hidden=false;
  return dashboard=>{
    root.replaceChildren();
    const demo=Boolean(config?.demoMode ?? config?.DEMO_MODE);
    const sample=config?.demoData||{};
    const liveProfiles=dashboard?.profiles||{};
    const heading=el('div','clubhouse-brand');
    heading.append(el('span','clubhouse-brand-crown','♛'),el('h2','clubhouse-brand-title','THE CLUB HOUSE'),
      el('p','clubhouse-brand-subtitle','NASHEDIYON KI TOLI · NKT'),
      el('p','clubhouse-brand-tagline','Play · Improve · Compete · Together'));root.append(heading);

    renderMemberOfMonth(root,config?.clubhouse?.memberOfTheMonth,liveProfiles);
    const realImproved=dashboard?.monthlyRace?.rows||[];
    const improved=realImproved.length?realImproved:(demo?sample.mostImproved:[]);
    const improvedProfiles=demo&&!realImproved.length?{}:liveProfiles;
    renderPodium(root,improved,improvedProfiles,{demo:demo&&!realImproved.length,month:dashboard?.monthlyRace?.month});

    const manual=config?.mcaLeaderboard?.length?config.mcaLeaderboard:(config?.clubhouse?.mcaLeaderboard||[]);
    const renderedManualMca=renderManualMca(root,manual,liveProfiles,false);
    if(!renderedManualMca&&demo)renderManualMca(root,sample.mcaLeaderboard,{},true);
    renderFeaturedEvents(root,config);

    renderOverall(root,dashboard?.overallLeaderboard?.rows,liveProfiles);

    if(!root.querySelector('.clubhouse-section')){
      root.append(el('p','empty-state','Monthly improvement rankings will appear after enough valid rating history has been collected.'));
    }
  };
}
