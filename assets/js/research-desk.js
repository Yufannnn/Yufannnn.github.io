(() => {
  'use strict';
  const base = new URL('../', document.currentScript.src);
  const clock = document.getElementById('singapore-clock');
  const updateClock = () => {
    if (!clock) return;
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Singapore', hour:'2-digit', minute:'2-digit'}).format(now);
  };
  updateClock();
  if (clock) setInterval(updateClock, 60000);

  const calendar = document.getElementById('research-calendar');
  const renderActivity = data => {
    if (!calendar || !Number.isSafeInteger(data.commits) || !data.daily_commits || !Number.isFinite(Date.parse(data.updated_at))) throw Error('Invalid activity data');
    const sum = Object.values(data.daily_commits).reduce((n, value) => n + value, 0);
    if (sum !== data.commits || Object.values(data.daily_commits).some(n => !Number.isSafeInteger(n) || n < 0)) throw Error('Invalid activity counts');
    const ns = 'http://www.w3.org/2000/svg';
    const end = new Date(data.updated_at.slice(0,10) + 'T00:00:00Z');
    const start = new Date(+end - 364 * 86400000);
    const first = new Date(+start - start.getUTCDay() * 86400000);
    const svg = document.createElementNS(ns, 'svg');
    const weeks = Math.floor((+end - +first) / 604800000) + 1;
    svg.setAttribute('viewBox', `0 0 ${weeks * 12} 105`);
    svg.setAttribute('aria-hidden','true');
    const max = Math.max(1, ...Object.values(data.daily_commits));
    const colors = ['#e9eef2','#c9dce6','#8db5c9','#4e88a6','#163f63'];
    let month = -1;
    for (let time = +first; time <= +end; time += 86400000) {
      const day = new Date(time), key = day.toISOString().slice(0,10);
      const x = Math.floor((time - +first)/604800000)*12;
      if (+day < +start) continue;
      const count = data.daily_commits[key] || 0;
      const level = count ? Math.min(4, 1 + Math.floor(3 * Math.log1p(count)/Math.log1p(max))) : 0;
      const cell = document.createElementNS(ns,'rect');
      cell.setAttribute('x',x); cell.setAttribute('y',21+day.getUTCDay()*12); cell.setAttribute('width',10); cell.setAttribute('height',10); cell.setAttribute('fill',colors[level]);
      const title = document.createElementNS(ns,'title'); title.textContent = `${key}: ${count} authored commits`; cell.append(title); svg.append(cell);
      if (day.getUTCMonth() !== month && (month === -1 || day.getUTCDate() === 1)) {
        month = day.getUTCMonth();
        // Alternate months keep labels legible on narrow screens.
        if (month % 2 === 0) { const label=document.createElementNS(ns,'text');label.setAttribute('x',x);label.setAttribute('y',11);label.textContent=day.toLocaleDateString('en',{month:'short',timeZone:'UTC'});svg.append(label); }
      }
    }
    calendar.replaceChildren(svg);
    calendar.setAttribute('aria-label',`${data.commits.toLocaleString('en-US')} authored commits in the past 365 days, including private work.`);
    document.getElementById('commit-total').textContent=data.commits.toLocaleString('en-US');
    document.getElementById('active-repos').textContent=data.active_repositories;
    document.getElementById('activity-updated').textContent='Updated '+new Date(data.updated_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Singapore'});
  };
  const load = async url => { const r=await fetch(url,{referrerPolicy:'no-referrer',credentials:'omit',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Unavailable');return r.json(); };
  let remoteLoaded=false;
  if(calendar) load(new URL('data/research-activity.json',base)).then(data=>{if(!remoteLoaded)renderActivity(data);}).catch(()=>{if(!remoteLoaded)calendar.textContent='Activity unavailable.';});
  if(calendar) load('https://raw.githubusercontent.com/Yufannnn/Yufannnn/main/assets/github-pulse/activity.json').then(data=>{renderActivity(data);remoteLoaded=true;}).catch(()=>{});

  const dialog=document.getElementById('citation-dialog');
  if(!dialog)return;
  const ids=['encformer','physics-tool','quasileak-bench','fesc'];
  const papers=[...document.querySelectorAll('.paper')];
  papers.forEach((paper,index)=>{
    const id=ids[index];if(!id)return;
    const link=document.createElement('button');link.type='button';link.textContent='BibTeX';link.setAttribute('aria-label','BibTeX citation for '+paper.querySelector('h3').textContent);
    link.addEventListener('click',async()=>{
      const url=new URL(`citations/${id}.bib`,base);
      document.getElementById('citation-text').textContent='Loading citation…';
      document.getElementById('citation-status').textContent='';
      const download=document.getElementById('download-citation');download.href=url.href;download.download=id+'.bib';
      dialog.showModal();
      try {const r=await fetch(url);if(!r.ok)throw Error();document.getElementById('citation-text').textContent=await r.text();}catch{document.getElementById('citation-text').textContent='Citation unavailable. Please use the arXiv link.';}
    });
    paper.querySelector('.paper-links').append(link);
  });
  dialog.querySelector('[data-close-citation]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
  document.getElementById('copy-citation').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(document.getElementById('citation-text').textContent);document.getElementById('citation-status').textContent='Copied';}
    catch{const range=document.createRange();range.selectNodeContents(document.getElementById('citation-text'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);document.getElementById('citation-status').textContent='Selected — press Ctrl+C / ⌘C to copy';}
  });
})();
