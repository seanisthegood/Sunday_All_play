// DATA LOADING — update the CSVs in data/ to refresh the league snapshot.
function parseCSV(text) {
  const records = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"' && field === '') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(v => v.trim())) records.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw Error('CSV contains an unclosed quote.');
  row.push(field); if (row.some(v => v.trim())) records.push(row);
  const headers = records.shift()?.map(v => v.trim());
  if (!headers) throw Error('CSV is empty.');
  return records.map((values, i) => { if (values.length !== headers.length) throw Error('CSV row '+(i+2)+' has the wrong number of columns.'); return Object.fromEntries(headers.map((key,j)=>[key,values[j].trim()])); });
}
async function loadDashboardData() {
  async function read(path, headers) {
    const response = await fetch(path, {cache:'no-store'});
    if (!response.ok) throw Error(path+' returned HTTP '+response.status);
    const records = parseCSV(await response.text());
    if (!records.length || headers.some(key => !(key in records[0]))) throw Error(path+' is empty or missing required columns: '+headers.join(', '));
    return records;
  }
  const [scores, standings] = await Promise.all([
    read('./data/every_team_weekly_scores.csv',['Week','Team ID','Team Name','Score','Status']),
    read('./data/actual_standings.csv',['Team ID','Team Name','Wins','Losses','Points For','Points Against'])
  ]);
  function number(value, label, integer=false) { if (value==='' || !Number.isFinite(Number(value)) || (integer && (!Number.isInteger(Number(value)) || Number(value)<0))) throw Error('Invalid '+label+': '+value); return Number(value); }
  const seen = new Set();
  const rows = scores.filter(r => r['Team Name'] && r.Score !== '').map(r => {
    const row = {week:number(r.Week,'week',true),id:number(r['Team ID'],'team ID',true),team:r['Team Name'],score:number(r.Score,'score'),status:r.Status};
    if (!row.week || !['Played','Bye'].includes(row.status)) throw Error('Invalid week or status for '+row.team);
    const key=row.week+':'+row.id;if(seen.has(key))throw Error('Duplicate team/week: '+key);seen.add(key);return row;
  });
  if (!rows.length) throw Error('No valid scores found.');
  const actual = {}, ids = new Map();
  for (const r of standings) { const id=number(r['Team ID'],'team ID',true); if(ids.has(id))throw Error('Duplicate standings team ID '+id);ids.set(id,r['Team Name']); actual[r['Team Name']]={w:number(r.Wins,'wins',true),l:number(r.Losses,'losses',true),pf:number(r['Points For'],'points for'),pa:number(r['Points Against'],'points against')}; }
  for(const r of rows)if(ids.get(r.id)!==r.team)throw Error('Team ID/name does not match standings: '+r.team);
  const teams=[...new Set(rows.map(r=>r.team))],weeks=[...new Set(rows.map(r=>r.week))];
  for(const week of weeks)for(const team of teams)if(!rows.some(r=>r.week===week&&r.team===team))throw Error('Missing score/status for '+team+' in week '+week+'. Include a Bye row when applicable.');
  return {rows,actual};
}


async function startDashboard(){

const DATA=await loadDashboardData(),rows=DATA.rows,actual=DATA.actual,teams=[...new Set(rows.map(r=>r.team))].sort(),weeks=[...new Set(rows.map(r=>r.week))].sort((a,b)=>a-b);let include=false,sortKey="actual",sortDir="desc";

// Compact labels are visual only; full names remain available to screen readers.
const mobileLabels={1:['My Lung Hurts','MLH'],2:['Wet Dawgs','WD'],3:['Very Polite Boys','VPB'],5:['Rodgers Victim','ARV'],6:['Sixty-Niners','69'],7:['East Palestine','EPM'],9:["Sean’s Hart",'SH'],10:['Daddy Fat Sacks','DFS'],11:['CeeDeez Nuts','CDN'],12:['OKLA-OWN-YA','OKL'],13:["Noah’s Gold",'NG'],14:['Drake Maye','DM'],15:['Chris Hart Attack','CHA']};
function matrixName(team,heading=false){const id=rows.find(r=>r.team===team).id,labels=mobileLabels[id]||[team,team.split(/\s+/).map(w=>w[0]).join('').slice(0,4)];return '<span class="matrix-desktop">'+(heading?'':teamHelmet(team))+esc(team)+'</span><span class="matrix-mobile" aria-hidden="true">'+esc(labels[heading?1:0])+'</span>';}


// Team helmet colors: [shell, stripe]. Edit these pairs to customize each team.
const helmetColors={1:['#70dfaa','#173c40'],2:['#ffbd46','#4b224d'],3:['#eeeaf9','#8244cc'],5:['#ff779d','#23234c'],6:['#e9c55b','#b43240'],7:['#ff883b','#202543'],9:['#62d7fa','#f5f7ff'],10:['#bd8dff','#ffe06b'],11:['#eeeef8','#357fe6'],12:['#c93448','#f9eee0'],13:['#efc44b','#5e3996'],14:['#274d9f','#ff7067'],15:['#ee604e','#fff4e5']};
function teamHelmet(team){const id=rows.find(r=>r.team===team).id,[shell,stripe]=helmetColors[id]||['#819be0','#ffe46b'];return `<svg class="team-helmet" viewBox="0 0 24 22" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><path fill="#050d30" d="M5 1h11v2h4v3h2v10h-5v5H7v-3H3V6h2z"/><path fill="${shell}" d="M6 3h10v2h3v3h1v6h-6v5H8v-3H5V7h1z"/><path fill="${stripe}" d="M10 3h3v11h-3z"/><path fill="#fff" opacity=".6" d="M6 6h3v2H6z"/><path fill="#081441" d="M16 10h5v6h-5v-3h-2v-3z"/><path fill="#c6d7f5" d="M19 14h2v3h3v2h-3v3h-6v-2h4v-2h-4v-2h4z"/></svg>`;}

const sortColumns=[["team","Team"],["actual","Actual W–L"],["all","All-play W–L"],["points","Points for"],["average","Avg / week"],["against","Points against"]];
function changeSort(key){sortDir=sortKey===key?(sortDir==="asc"?"desc":"asc"):(key==="team"?"asc":"desc");sortKey=key;render();}
function sortValue(t,all){return sortKey==="team"?t:sortKey==="actual"?rate([actual[t].w,actual[t].l,0]):sortKey==="all"?rate(all.records[t]):sortKey==="average"?all.points[t]/all.pool.filter(r=>r.team===t).length:sortKey==="against"?actual[t].pa:all.points[t];}
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),rec=r=>r[0]+'–'+r[1]+(r[2]?'–'+r[2]:''),rate=r=>(r[0]+r[2]*.5)/(r.reduce((a,b)=>a+b,0)||1);
function compute(s){const pool=rows.filter(r=>(include||r.status==='Played')&&(s==='season'||r.week===+s)),records=Object.fromEntries(teams.map(t=>[t,[0,0,0]])),pairs=Object.fromEntries(teams.map(t=>[t,Object.fromEntries(teams.map(o=>[o,[0,0,0]]))])),points=Object.fromEntries(teams.map(t=>[t,0]));for(const a of pool){points[a.team]+=a.score;for(const b of pool){if(a.week!==b.week||a.team===b.team)continue;const k=a.score>b.score?0:a.score<b.score?1:2;records[a.team][k]++;pairs[a.team][b.team][k]++}}return{pool,records,pairs,points}}
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function render(){const all=compute('season'),s=$('week').value,v=compute(s),season=s==='season';$('with').setAttribute('aria-pressed',include);$('without').setAttribute('aria-pressed',!include);$('mode').textContent=include?'Bye scores count in points and all-play.':'Bye scores excluded from points and all-play.';
const ranked=[...teams].sort((a,b)=>{const av=sortValue(a,all),bv=sortValue(b,all),d=sortKey==="team"?av.localeCompare(bv):av-bv;return (sortDir==="asc"?d:-d)||all.points[b]-all.points[a]||a.localeCompare(b)}),leader=[...teams].sort((a,b)=>rate(all.records[b])-rate(all.records[a])||all.points[b]-all.points[a])[0],top=[...teams].sort((a,b)=>all.points[b]-all.points[a])[0];
$('cards').innerHTML=`<div class="card"><small>THE TEAM TO BEAT</small><strong>${esc(leader)}</strong><small>${rec(all.records[leader])} · ${(rate(all.records[leader])*100).toFixed(1)}% win rate</small></div><div class="card"><small>THE POINTS DEPARTMENT</small><strong>${esc(top)}</strong><small>${fmt(all.points[top])} points ${include?'including':'excluding'} byes</small></div><div class="card"><small>FROM THE PRESS BOX</small><strong>${teams.length} teams · ${weeks.length} weeks</strong><small>${all.pool.length} eligible scores · opponent counts depend on weekly eligibility</small></div>`;
$('standNote').textContent=`Season totals · Points ${include?'include':'exclude'} byes · Actual records exclude byes`;
$('standings').innerHTML='<thead><tr>'+sortColumns.map(([key,label])=>`<th scope="col" aria-sort="${sortKey===key?(sortDir==='asc'?'ascending':'descending'):'none'}"><button type="button" data-sort="${key}" title="Sort by ${label}${key==='actual'||key==='all'?' (win rate)':''}">${label} <span aria-hidden="true">${sortKey===key?(sortDir==='asc'?'↑':'↓'):'↕'}</span></button></th>`).join('')+'</tr></thead><tbody>'+ranked.map((t,i)=>`<tr><td><span class="rank">${i+1}</span><span class="team-name">${teamHelmet(t)}<span>${esc(t)}</span></span></td><td>${actual[t].w}–${actual[t].l}</td><td>${rec(all.records[t])}</td><td>${fmt(all.points[t])}</td><td>${fmt(all.points[t]/all.pool.filter(r=>r.team===t).length)}</td><td>${fmt(actual[t].pa)}</td></tr>`).join('')+'</tbody>';
document.querySelectorAll('[data-sort]').forEach(button=>{button.onclick=()=>{changeSort(button.dataset.sort);document.querySelector('[data-sort="'+sortKey+'"]').focus({preventScroll:true});}});
$('title').textContent=season?'Season cumulative all-play':`Week ${s} · All-play matrix`;
$('matrix').className='matrix'+(season?' season-matrix':'');
$('matrix').innerHTML='<thead><tr><th scope="col">Team / '+(season?'season points':'weekly score')+'</th><th scope="col" class="total-heading">All-play<br>total</th>'+teams.map((t,i)=>`<th scope="col" title="${esc(t)}" aria-label="${esc(t)}">${matrixName(t,true)}<small>${season?fmt(v.points[t])+' pts':fmt(rows.find(r=>r.team===t&&r.week===+s).score)+' pts'+(rows.find(r=>r.team===t&&r.week===+s).status==='Bye'?' · BYE':'')}</small></th>`).join('')+'</tr></thead><tbody>'+teams.map((t,i)=>{const raw=rows.find(r=>r.week===+s&&r.team===t),bye=raw?.status==='Bye';return `<tr><td><span class="rank">${String(i+1).padStart(2,'0')}</span>${matrixName(t)}<small>${season?fmt(v.points[t])+' pts':fmt(raw.score)+' pts'+(bye?' · BYE'+(!include?' · excluded':''):'')}</small></td><td class="total">${!season&&bye&&!include?'—':rec(v.records[t])}</td>`+teams.map((o,j)=>{const r=v.pairs[t][o],n=r.reduce((a,b)=>a+b,0),cls=!n?'muted':r[0]>r[1]?'win':r[0]<r[1]?'loss':'tie',label=!n?'—':season?rec(r):r[0]?'W':r[1]?'L':'T';return `<td class="${cls}" ${n?`tabindex="0" role="button" data-a="${i}" data-b="${j}" aria-label="${esc(t)} versus ${esc(o)}: ${label}"`:''}>${label}</td>`}).join('')+'</tr>'}).join('')+'</tbody>';
renderTeam(v,s);$('detail').textContent='';document.querySelectorAll('[data-a]').forEach(cell=>{const show=()=>{const a=teams[+cell.dataset.a],b=teams[+cell.dataset.b];$('detail').textContent=season?`${a} vs ${b}: ${rec(v.pairs[a][b])} across eligible weeks.`:`${a} (${fmt(rows.find(r=>r.team===a&&r.week===+s).score)}) vs ${b} (${fmt(rows.find(r=>r.team===b&&r.week===+s).score)}): ${cell.textContent}`};cell.onclick=show;cell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();show()}}});try{history.replaceState(null,'','#'+new URLSearchParams({week:s,byes:include?'with':'without',sort:sortKey,dir:sortDir}))}catch{}}

let compactView=typeof matchMedia==='function'?matchMedia('(max-width:650px)').matches:false;
function updateView(){ $('teamResults').hidden=!compactView;$('fullMatrix').hidden=compactView;$('teamPickerLabel').hidden=!compactView;$('teamView').setAttribute('aria-pressed',compactView);$('matrixView').setAttribute('aria-pressed',!compactView); }
function renderTeam(v,s){const t=$('teamPicker').value||teams[0],season=s==='season',raw=rows.find(r=>r.team===t&&r.week===+s),excluded=!season&&!include&&raw.status==='Bye';$('teamResults').innerHTML=`<div class="team-summary"><div><h3 class="team-name">${teamHelmet(t)}<span>${esc(t)}</span></h3><small>${season?fmt(v.points[t])+' season points':fmt(raw.score)+' points'+(raw.status==='Bye'?' · BYE':'')}${excluded?' · excluded from all-play':''}</small></div><div><strong>${excluded?'—':rec(v.records[t])}</strong><div class="note">ALL-PLAY TOTAL</div></div></div>`+teams.filter(o=>o!==t).map(o=>{const r=v.pairs[t][o],n=r.reduce((a,b)=>a+b,0),opp=rows.find(r=>r.team===o&&r.week===+s),cls=!n?'muted':r[0]>r[1]?'win':r[0]<r[1]?'loss':'tie',label=!n?'—':season?rec(r):r[0]?'W':r[1]?'L':'T';return `<div class="opponent"><span class="team-name">${teamHelmet(o)}<span>${esc(o)}</span>${!season&&opp.status==='Bye'?'<small> · BYE</small>':''}</span><small>${fmt(season?v.points[o]:opp.score)} pts</small><span class="result ${cls}">${label}</span></div>`}).join('');updateView();}
$('teamPicker').innerHTML=teams.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('');$('teamPicker').value=teams.includes("Sean's Hart")?"Sean's Hart":teams[0];$('teamPicker').onchange=()=>renderTeam(compute($('week').value),$('week').value);$('teamView').onclick=()=>{compactView=true;updateView()};$('matrixView').onclick=()=>{compactView=false;updateView()};

document.getElementById('loadStatus').textContent='';document.getElementById('dashboard').hidden=false;document.getElementById('editionRange').textContent='2026 SEASON · WEEKS '+weeks[0]+'–'+weeks.at(-1);
const params=new URLSearchParams(location.hash.slice(1));include=params.get('byes')==='with';$('week').innerHTML=weeks.map(w=>`<option value="${w}">Week ${w}</option>`).join('')+'<option value="season">Season cumulative</option>';$('week').value=weeks.map(String).concat('season').includes(params.get('week'))?params.get('week'):String(weeks.at(-1));if(sortColumns.some(([key])=>key===params.get('sort')))sortKey=params.get('sort');sortDir=['asc','desc'].includes(params.get('dir'))?params.get('dir'):(sortKey==='team'?'asc':'desc');$('with').onclick=()=>{include=true;render()};$('without').onclick=()=>{include=false;render()};$('week').onchange=render;
$('csv').onclick=()=>{const s=$('week').value,v=compute(s),q=x=>'"'+String(x).replace(/"/g,'""')+'"',header=['Team',s==='season'?'Season points':'Weekly score','Status','All-play W-L-T',...teams],lines=teams.map(t=>{const raw=rows.find(r=>r.team===t&&r.week===+s);return[t,s==='season'?v.points[t]:raw.score,s==='season'?'':raw.status,rec(v.records[t]),...teams.map(o=>{const r=v.pairs[t][o];return r.reduce((a,b)=>a+b,0)?s==='season'?rec(r):r[0]?'W':r[1]?'L':'T':'—'})].map(q).join(',')});download('\ufeff'+[header.map(q).join(','),...lines].join('\r\n'),`all-play-${s}-${include?'with':'without'}-byes.csv`,'text/csv;charset=utf-8')};render();

}
startDashboard().catch(error=>{document.getElementById('loadStatus').textContent='Could not load league data: '+error.message+' Preview this folder with VS Code Live Preview or use the GitHub Pages URL; opening index.html directly cannot load CSV files.';});
