/* Country-level aggregates only. Map outlines: Natural Earth, public domain. */
(() => {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const atlas = document.getElementById('visitor-atlas');
  let map;
  const aliases = {'United States of America':'US','United Kingdom':'GB','Russia':'RU','S. Korea':'KR','N. Korea':'KP','Czechia':'CZ','Dem. Rep. Congo':'CD','Congo':'CG','Central African Rep.':'CF','Eq. Guinea':'GQ','S. Sudan':'SS','Dominican Rep.':'DO','Bosnia and Herz.':'BA','Solomon Is.':'SB','Falkland Is.':'FK','eSwatini':'SZ','W. Sahara':'EH','Taiwan':'TW','Palestine':'PS','Kosovo':'XK'};
  async function paintCountries(countries) {
    if (!atlas || !Array.isArray(countries)) return;
    if (!map) map = fetch(new URL('../img/visitor-atlas.svg',base)).then(r=>r.ok?r.text():Promise.reject()).then(source=>{
      const svg = new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
      if (svg.localName !== 'svg') throw Error('Invalid atlas map');
      svg.setAttribute('aria-label','Country-level page views. Dots mark approximate country locations, not visitor addresses.');
      svg.style.width = '100%';
      svg.style.height = 'auto';
      svg.removeAttribute('aria-labelledby');
      const description = svg.querySelector('desc');
      if (description) description.textContent = 'Shading and dots show aggregate country-level page views. Dot positions are approximate.';
      atlas.querySelector('.atlas-map').replaceChildren(document.importNode(svg,true));
      return atlas.querySelector('.atlas-map svg');
    });
    const svg = await map;
    svg.querySelector('.atlas-markers')?.remove();
    const markers = document.createElementNS('http://www.w3.org/2000/svg','g');
    markers.setAttribute('class','atlas-markers');
    const counts = new Map();
    const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'],{type:'region'}) : null;
    let maximum = 1;
    for (const country of countries) {
      if (!Number.isFinite(country.visits) || country.visits <= 0) continue;
      counts.set(normalize(country.code),country.visits);
      counts.set(normalize(country.name),country.visits);
      if (names && /^[A-Z]{2}$/.test(country.code)) counts.set(normalize(names.of(country.code)),country.visits);
      maximum = Math.max(maximum,country.visits);
    }
    for (const path of svg.querySelectorAll('path')) {
      const title = path.querySelector('title');
      if (!title) continue;
      const name = path.dataset.countryName || title.textContent;
      path.dataset.countryName = name;
      const visits = counts.get(normalize(name)) || counts.get(normalize(aliases[name] || '')) || 0;
      if (visits) {
        path.dataset.visits = String(visits);
        path.style.fill = 'var(--atlas-accent)';
        path.style.fillOpacity = String(0.35 + 0.65 * Math.log1p(visits) / Math.log1p(maximum));
        title.textContent = name + ': ' + visits.toLocaleString('en-US') + ' page views';
      } else {
        delete path.dataset.visits; path.style.fill = ''; path.style.fillOpacity = ''; title.textContent = name;
      }
    }
    // This low-resolution outline omits Singapore and other small states.
    // Singapore is anchored on the map's equirectangular projection; other
    // countries use the centre of their largest polygon, not a visitor location.
    const paths = [...svg.querySelectorAll('path')];
    for (const country of countries) {
      if (!Number.isFinite(country.visits) || country.visits <= 0) continue;
      let point = country.code === 'SG' ? [709.6,209.1] : null;
      const displayName = names && /^[A-Z]{2}$/.test(country.code) ? names.of(country.code) : country.name;
      if (!point) {
        const path = paths.find(path => {
          const name = path.dataset.countryName || '';
          return normalize(name) === normalize(displayName) || normalize(name) === normalize(country.name) || aliases[name] === country.code;
        });
        let largest = 0;
        for (const polygon of (path?.getAttribute('d') || '').split('M')) {
          const numbers = polygon.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
          if (numbers.length < 6) continue;
          const xs = numbers.filter((_,i)=>i%2===0), ys = numbers.filter((_,i)=>i%2===1);
          const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
          const area=(x1-x0)*(y1-y0);
          if(area>largest){largest=area;point=[(x0+x1)/2,(y0+y1)/2];}
        }
      }
      if (!point) continue;
      const marker=document.createElementNS('http://www.w3.org/2000/svg','g');
      const title=document.createElementNS('http://www.w3.org/2000/svg','title');
      title.textContent=displayName+': '+country.visits.toLocaleString('en-US')+' page views (approximate country location)';
      marker.append(title);
      for(const [radius,style] of [[9,'atlas-marker-halo'],[4.5,'atlas-marker']]){
        const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');
        circle.setAttribute('cx',String(point[0]));circle.setAttribute('cy',String(point[1]));
        circle.setAttribute('r',String(radius));circle.setAttribute('class',style);marker.append(circle);
      }
      markers.append(marker);
    }
    svg.append(markers);
  }

  const status = document.getElementById('atlas-status');
  const names = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], {type:'region'}) : null;
  const show = async stats => {
    if (!atlas || !Number.isSafeInteger(stats.pageViews) || stats.pageViews < 0 || !Number.isSafeInteger(stats.countries) || stats.countries < 0 || !Array.isArray(stats.countryVisits)) throw Error('Invalid visitor statistics');
    atlas.querySelectorAll('[data-atlas-stat]').forEach(node => {node.textContent=stats[node.dataset.atlasStat].toLocaleString('en-US');});
    await paintCountries(stats.countryVisits);
    const list = document.getElementById('atlas-countries');
    list.replaceChildren();
    for (const country of stats.countryVisits.slice(0,5)) {
      if (!/^[A-Z]{2}$/.test(country.code) || !Number.isSafeInteger(country.visits) || country.visits < 0) continue;
      const item=document.createElement('li'), label=document.createElement('span'), count=document.createElement('b');
      label.textContent=names ? names.of(country.code) : country.code;count.textContent=country.visits.toLocaleString('en-US');item.append(label,count);list.append(item);
    }
    if (!list.children.length) {const item=document.createElement('li');item.textContent='Waiting for the first visits.';list.append(item);}
    status.textContent='Live';status.classList.add('is-live');
    const updated=document.getElementById('atlas-updated');updated.dateTime=stats.generatedAt;
    updated.textContent='Updated '+new Date(stats.generatedAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Singapore'})+' SGT';
  };
  if(atlas)paintCountries([]).catch(()=>{atlas.querySelector('.atlas-map').textContent='Map unavailable.';});
  fetch(new URL('../data/atlas-config.json',base)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(config=>{
    if(!config.endpoint){if(status)status.textContent='Awaiting connection';return;}
    const endpoint=new URL(config.endpoint);
    if(endpoint.protocol!=='https:' || !endpoint.hostname.endsWith('.workers.dev'))throw Error('Invalid Atlas endpoint');
    const refresh=()=>fetch(new URL('/stats',endpoint),{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(show).catch(()=>{if(status){status.textContent='Refresh delayed';status.classList.remove('is-live');}});
    if(atlas){refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});}
    if(location.hostname!==config.hostname || !config.paths.includes(location.pathname) || navigator.globalPrivacyControl || navigator.doNotTrack==='1')return;
    fetch(new URL('/visit',endpoint),{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({path:location.pathname}),credentials:'omit',referrerPolicy:'origin',keepalive:true}).then(r=>{if(r.status===201&&atlas)refresh();}).catch(()=>{});
  }).catch(()=>{if(status)status.textContent='Connection unavailable';});
})();
