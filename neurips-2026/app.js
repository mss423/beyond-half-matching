(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = window.PAPER || {nodes:[], edges:[], sections:[], notation:[]};
  const nodes = data.nodes || [], edges = data.edges || [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cap = s => String(s || 'result').replace(/^./, c => c.toUpperCase());
  const label = n => [cap(n.kind), n.number].filter(Boolean).join(' ');
  const title = n => n.title && n.title !== label(n) ? n.title : label(n);
  const shortLabel = n => label(n) + (n.title && n.title !== label(n) ? '\n' + String(n.title).replace(/<[^>]*>/g,'') : '');
  const sectionName = key => (data.sections || []).find(s => s.id === key)?.title || key || '';
  const storage = {get(k){try{return localStorage.getItem('visual-paper-'+k);}catch{return null;}},set(k,v){try{localStorage.setItem('visual-paper-'+k,v);}catch{}}};
  let mode = 'main', selected = null, cy = null, visible = [], fontSize = Number(storage.get('font')) || 18, lastGraphWidth = 0, lastGraphHeight = 0;
  const primaryIds = ['thm:divisible-algo','thm:indivisible-alg','thm:price-of-fairness','thm:impossibility','thm:rounded-cprop'];
  const mainNodes = nodes.filter(n => primaryIds.includes(n.id));
  const entryNodes = mainNodes.length ? mainNodes : nodes.filter(n => n.kind === 'theorem').slice(0,5);
  const toast = text => { $('toast').textContent=text; $('toast').hidden=false; clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').hidden=true,2300); };
  const source = (text, location) => `<details class="source-details"><summary>View exact TeX source${location ? ' · '+esc(location) : ''}</summary><pre>${esc(typeof text === 'object' ? JSON.stringify(text,null,2) : text || '')}</pre></details>`;
  const locationText = loc => typeof loc === 'string' ? loc : loc ? [loc.file, loc.startLine || loc.start?.line].filter(Boolean).join(':') : '';
  const go = id => { if (byId.has(id)) { const hash = '#/'+encodeURIComponent(id); if(location.hash === hash) select(id); else location.hash = hash; }};

  function applyTheme(theme) {
    document.body.dataset.theme=theme;
    $('theme').setAttribute('aria-label',theme === 'dark'?'Use light theme':'Use dark theme');
    storage.set('theme',theme);
    if(cy) cy.style().fromJson(graphStyle()).update();
  }
  applyTheme(storage.get('theme') || 'light');
  document.documentElement.style.setProperty('--reader-size',fontSize+'px');
  $('theme').addEventListener('click',()=>applyTheme(document.body.dataset.theme === 'dark'?'light':'dark'));
  const setFont = delta => {fontSize=Math.max(15,Math.min(25,fontSize+delta));document.documentElement.style.setProperty('--reader-size',fontSize+'px');storage.set('font',fontSize);};
  $('font-smaller').addEventListener('click',()=>setFont(-1));
  $('font-larger').addEventListener('click',()=>setFont(1));
  (data.sections || []).forEach(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.title;$('section-filter').append(option);});

  function graphStyle() {
    const dark=document.body.dataset.theme==='dark';
    return [
      {selector:'node',style:{'label':'data(label)','background-color':dark?'#182c46':'#fcfcfd','border-color':dark?'#5d7492':'#a6b5c9','border-width':1,'color':dark?'#f2f5fa':'#12243a','font-family':'Arial, sans-serif','font-size':10,'text-wrap':'wrap','text-max-width':140,'text-valign':'center','text-halign':'center','width':160,'height':55,'padding':9,'shape':'round-rectangle','text-events':'yes','line-height':1.4}},
      {selector:'node[kind = "theorem"]',style:{'background-color':dark?'#333144':'#fff0e1','border-color':dark?'#f58025':'#bb5a08','border-width':1.5,'font-weight':600}},
      {selector:'node.selected',style:{'background-color':dark?'#f58025':'#12243a','color':dark?'#12243a':'#ffffff','border-color':dark?'#ffbc80':'#12243a','border-width':2}},
      {selector:'edge',style:{'width':1.4,'line-color':dark?'#7a91af':'#798ca6','target-arrow-color':dark?'#7a91af':'#798ca6','target-arrow-shape':'triangle','curve-style':'bezier','arrow-scale':.8}},
      {selector:'edge.related',style:{'line-color':dark?'#f58025':'#b85300','target-arrow-color':dark?'#f58025':'#b85300','width':2}},
      {selector:':selected',style:{'overlay-opacity':0}}
    ];
  }
  function initGraph() {
    if(!window.cytoscape) {$('graph-empty').textContent='Use the result outline to explore the proofs.';$('graph-empty').hidden=false;$('outline-details').open=true;return;}
    if(window.cytoscapeDagre) window.cytoscape.use(window.cytoscapeDagre);
    cy=window.cytoscape({container:$('graph'),elements:[],style:graphStyle(),minZoom:.18,maxZoom:2.4,wheelSensitivity:.18,selectionType:'single',boxSelectionEnabled:false,autoungrabify:true});
    cy.on('tap','node',event=>go(event.target.id()));
  }
  function graphNodes() {
    let included=new Set(nodes.map(n=>n.id));
    if(mode==='main' && entryNodes.length){
      included=new Set(entryNodes.map(n=>n.id));
      const targets=new Set(included);
      edges.forEach(e=>{if(targets.has(e.to))included.add(e.from);});
    }
    if(mode==='focus' && selected){
      included=new Set([selected]);
      edges.forEach(e=>{if(e.from===selected)included.add(e.to);if(e.to===selected)included.add(e.from);});
    }
    const section=$('section-filter').value;
    const query=$('search').value.toLowerCase().trim();
    if(query) included=new Set(nodes.map(n=>n.id));
    return nodes.filter(n=>included.has(n.id) && (!section || n.section===section) && (!query || [n.id,n.title,n.kind,n.number,n.section,...(n.claims||[]).map(c=>c.text)].join(' ').toLowerCase().includes(query)));
  }
  function updateGraph() {
    visible=graphNodes();
    const ids=new Set(visible.map(n=>n.id));
    const links=edges.filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to);
    $('graph-count').textContent=`${visible.length} results · ${links.length} links`;
    $('outline-count').textContent=visible.length;
    $('graph-empty').hidden=visible.length>0;
    $('outline').innerHTML=visible.map(n=>`<button class="outline-result ${n.id===selected?'active':''}" data-go="${esc(n.id)}" ${n.id===selected?'aria-current="true"':''}><span class="result-tag">${esc(label(n))}</span><span>${esc(title(n))}</span></button>`).join('') || '<p class="muted-small">No matching results.</p>';
    if(!cy)return;
    cy.batch(()=>{
      cy.elements().remove();
      cy.add(visible.map(n=>({data:{id:n.id,label:shortLabel(n),kind:n.kind}})));
      cy.add(links.map((e,i)=>({data:{id:'edge-'+i,source:e.from,target:e.to}})));
    });
    const layout={name:'dagre',rankDir:'LR',nodeSep:22,rankSep:70,padding:35,animate:false,fit:true};
    try{cy.layout(layout).run();}catch{cy.layout({name:'breadthfirst',directed:true,padding:35,animate:false}).run();}
    highlight();
  }
  function highlight(){
    if(!cy)return;
    cy.nodes().removeClass('selected');cy.edges().removeClass('related');
    if(selected){const node=cy.getElementById(selected);node.addClass('selected');node.connectedEdges().addClass('related');}
  }
  function dependencyHtml(id,direction) {
    const matching=edges.filter(e=>direction==='uses'?e.to===id:e.from===id);
    const seen=new Set();
    return matching.map(e=>{const other=byId.get(direction==='uses'?e.from:e.to);if(!other||seen.has(other.id))return '';seen.add(other.id);return `<button class="dependency-link" data-go="${esc(other.id)}">${esc(label(other))}${other.title&&other.title!==label(other)?`<span>${esc(other.title)}</span>`:''}</button>`;}).join('') || '<span class="muted-small">None recorded.</span>';
  }
  function renderProof(proof,index) {
    const steps=proof.steps || [];
    return `<section class="proof-block"><h3>${proof.title || (index?'Additional proof':'Proof')}</h3>${steps.length?steps.map((step,i)=>`<section class="proof-step"><div class="step-label">Step ${i+1}</div><div class="proof-text">${step.html || ''}</div>${source(step.source,locationText(step.location))}</section>`).join(''):`<div class="proof-text">${proof.html || '<p class="muted-small">No proof text attached.</p>'}</div>${source(proof.source)}`}</section>`;
  }
  function renderNotation() {
    const entries=data.notation || [];
    if(!entries.length)return '';
    return `<section><h3>Notation</h3><div class="notation-list">${entries.map((n,i)=>`<button class="notation-button" data-notation="${i}" aria-haspopup="dialog">${n.symbolHtml || esc(n.macro)}</button>`).join('')}</div></section>`;
  }
  function select(id) {
    const n=byId.get(id);if(!n){welcome();return;}
    selected=id;
    $('reader-breadcrumb').textContent=[sectionName(n.section),label(n)].filter(Boolean).join(' / ');
    $('reader').innerHTML=`<div class="result-meta"><span>${esc(label(n))}</span><a href="./neurips_2026.pdf${n.page?'#page='+encodeURIComponent(n.page):''}" target="_blank" rel="noopener">Open in paper${n.page?' · p. '+esc(n.page):''} ↗</a></div><h2>${esc(title(n))}</h2>${n.optionalTitleHtml ? `<div class="optional-title">${n.optionalTitleHtml}</div>` : ''}${(n.claims||[]).length?`<div class="claim-text">${n.claims.map(c=>`<p>${c.html || esc(c.text)}</p>`).join('')}</div>`:''}${n.contextHtml ? `<details class="source-context"><summary>Source context</summary><div>${n.contextHtml}</div></details>` : ''}<section class="statement" aria-label="Exact statement">${n.statementHtml || ''}</section><div class="source-location">${esc(locationText(n.sourceLocation))}</div>${source(n.statementSource,locationText(n.sourceLocation))}<section class="dependency-columns"><div><h3>Uses</h3><div class="dependency-list">${dependencyHtml(id,'uses')}</div></div><div><h3>Used by</h3><div class="dependency-list">${dependencyHtml(id,'usedby')}</div></div></section>${n.id === 'lem:hybrid-cef' ? `<figure class="proof-diagram"><figcaption><span class="eyebrow">PROOF DEPENDENCY DIAGRAM</span></figcaption><a href="./proof-overview.pdf" target="_blank" rel="noopener"><img src="./proof-overview.svg" alt="Schematic proof dependency diagram for Hybrid Ranking class envy-freeness" loading="lazy"></a><a class="small-note" href="./proof-overview.pdf" target="_blank" rel="noopener">Open diagram PDF ↗</a></figure>` : ''}${(n.proofs||[]).map(renderProof).join('')}${renderNotation()}<div class="edition-note">Paper text is extracted from the source of the frozen NeurIPS 2026 PDF.</div>`;
    prepareInlineNotation($('reader'));
    if(mode==='focus')updateGraph();else{highlight();$('outline').querySelectorAll('[data-go]').forEach(b=>{b.classList.toggle('active',b.dataset.go===selected);b.toggleAttribute('aria-current',b.dataset.go===selected);});}
    $('reader-pane').scrollTop=0;
    if(matchMedia('(max-width:760px)').matches && document.activeElement?.closest('#outline'))$('reader-pane').scrollIntoView({block:'start'});
  }
  function welcome() {
    selected=null;
    $('reader-breadcrumb').textContent='Reading companion';
    const authors=Array.isArray(data.authors)?data.authors.join(' · '):data.authors||'';
    $('reader').innerHTML=`<section class="intro-card"><span class="eyebrow">STATEMENTS · PROOFS · DEPENDENCIES</span><h2>${esc(data.title || 'Beyond the Half-Approximation')}</h2>${authors?`<p class="muted-small">${esc(authors)}</p>`:''}<p class="intro-subtitle">Follow an argument.<br>Read the source at every step.</p><p class="muted-small">Choose a result on the map, or start with a theorem below. Its supporting results appear under Uses; later results appear under Used by.</p><div class="welcome-links">${entryNodes.map(n=>`<button data-go="${esc(n.id)}">${esc(label(n))}${n.title&&n.title!==label(n)?' · '+esc(n.title):''}<span aria-hidden="true">↗</span></button>`).join('')}</div><div class="edition-note">NeurIPS 2026 edition. The frozen paper PDF is the reference. Open a result to read its statement, follow its proof, or inspect the original TeX.</div></section>`;
    highlight();
  }
  function openNotation(index) {
    const n=(data.notation||[])[Number(index)];
    if(!n)return;
    $('notation-content').innerHTML=`<span class="eyebrow">NOTATION</span><h2>${n.symbolHtml || esc(n.macro)}</h2>${n.html||''}`;
    if(!$('notation-dialog').open)$('notation-dialog').showModal();
  }
  function notationIndex(element) {
    const match=String(element?.className || '').match(/(?:^|\s)vp-notation-(\d+)(?:\s|$)/);
    return match ? Number(match[1]) : null;
  }
  function prepareInlineNotation(scope) {
    scope.querySelectorAll('[class*="vp-notation-"]').forEach(element=>{
      const index=notationIndex(element);if(index===null)return;
      element.tabIndex=0;element.setAttribute('role','button');element.setAttribute('aria-haspopup','dialog');
      element.setAttribute('title','Open notation definition');
    });
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-go]');if(link){go(link.dataset.go);return;}
    const notation=event.target.closest('[data-notation]');if(notation){openNotation(notation.dataset.notation);return;}
    const inline=event.target.closest('[class*="vp-notation-"]');if(inline){const index=notationIndex(inline);if(index!==null){event.preventDefault();openNotation(index);}}
  });
  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const inline=event.target.closest('[class*="vp-notation-"]');
    if(inline){const index=notationIndex(inline);if(index!==null){event.preventDefault();openNotation(index);}}
  });
  $('search').addEventListener('input',updateGraph);
  $('section-filter').addEventListener('change',updateGraph);
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.mode;
    if(mode==='focus'&&!selected&&entryNodes.length)go(entryNodes[0].id);
    document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    updateGraph();
  }));
  $('zoom-in').addEventListener('click',()=>{if(cy)cy.zoom({level:cy.zoom()*1.2,renderedPosition:{x:cy.width()/2,y:cy.height()/2}});});
  $('zoom-out').addEventListener('click',()=>{if(cy)cy.zoom({level:cy.zoom()/1.2,renderedPosition:{x:cy.width()/2,y:cy.height()/2}});});
  $('fit').addEventListener('click',()=>cy?.fit(undefined,35));
  function toggleMap(force){const hide=force===undefined?!$('workspace').classList.contains('reading-only'):force;$('workspace').classList.toggle('reading-only',hide);$('show-map').hidden=!hide;storage.set('reading',hide?'1':'0');if(!hide&&cy)requestAnimationFrame(()=>{cy.resize();cy.fit(undefined,35);});}
  $('hide-map').addEventListener('click',()=>toggleMap(true));$('show-map').addEventListener('click',()=>toggleMap(false));
  $('about').addEventListener('click',()=>{$('about-dialog').showModal();});
  document.querySelectorAll('dialog').forEach(dialog=>{dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
  $('copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);toast('Result link copied.');}catch{toast('Use the address bar to copy this result link.');}});
  document.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,select')||event.target.isContentEditable)return;if(event.key==='/'&&!event.metaKey&&!event.ctrlKey){event.preventDefault();$('search').focus();}if(event.key.toLowerCase()==='g'&&!event.metaKey&&!event.ctrlKey)toggleMap();});
  const loadHash=()=>{let id='';try{id=decodeURIComponent(location.hash.replace(/^#\/?/,''));}catch{}if(byId.has(id))select(id);else welcome();};
  window.addEventListener('hashchange',loadHash);

  function setDivider(value){const width=Math.max(28,Math.min(65,value));document.documentElement.style.setProperty('--map-width',width+'%');$('divider').setAttribute('aria-valuenow',Math.round(width));storage.set('split',width);}
  const oldSplit=Number(storage.get('split'));if(oldSplit)setDivider(oldSplit);
  let drag=false;
  $('divider').addEventListener('pointerdown',e=>{drag=true;$('divider').setPointerCapture(e.pointerId);});
  $('divider').addEventListener('pointermove',e=>{if(drag)setDivider(e.clientX/window.innerWidth*100);});
  $('divider').addEventListener('pointerup',()=>{drag=false;cy?.fit(undefined,35);});
  $('divider').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setDivider(Number($('divider').getAttribute('aria-valuenow'))+(e.key==='ArrowRight'?2:-2));cy?.resize();cy?.fit(undefined,35);}});
  const resize=new ResizeObserver(entries=>{for(const entry of entries){const {width,height}=entry.contentRect;if(Math.abs(width-lastGraphWidth)<1&&Math.abs(height-lastGraphHeight)<1)return;lastGraphWidth=width;lastGraphHeight=height;if(cy){cy.resize();if(!drag&&width>0&&height>0)cy.fit(undefined,35);}}});resize.observe($('graph'));
  const mobile=matchMedia('(max-width:760px)');
  const setMobile=()=>{if(mobile.matches)$('outline-details').open=true;};mobile.addEventListener('change',setMobile);setMobile();

  function exportSvg(){
    if(!cy||!cy.nodes().length){toast('There is no diagram to export.');return;}
    const box=cy.elements().boundingBox({includeLabels:false}),margin=40,width=box.w+margin*2,height=box.h+margin*2;
    const shift=p=>({x:p.x-box.x1+margin,y:p.y-box.y1+margin});
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>Proof dependencies</title><desc>An arrow points from a supporting result to the result that uses it.</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#b85300"/></marker></defs><rect width="100%" height="100%" fill="#fcfcfd"/>`;
    cy.edges().forEach(e=>{const a=shift(e.source().position()),b=shift(e.target().position());a.x+=e.source().outerWidth()/2;b.x-=e.target().outerWidth()/2;const mid=(a.x+b.x)/2;svg+=`<path d="M${a.x},${a.y} C${mid},${a.y} ${mid},${b.y} ${b.x},${b.y}" fill="none" stroke="#b85300" stroke-width="1.4" marker-end="url(#arrow)"/>`;});
    cy.nodes().forEach(n=>{const p=shift(n.position()),w=n.outerWidth(),h=n.outerHeight();const lines=String(n.data('label')).split('\n').flatMap(line=>{const result=[];let current='';line.split(/\s+/).forEach(word=>{if((current+' '+word).trim().length>27&&current){result.push(current);current=word;}else current=(current+' '+word).trim();});if(current)result.push(current);return result;});svg+=`<g><rect x="${p.x-w/2}" y="${p.y-h/2}" width="${w}" height="${h}" rx="7" fill="${n.data('kind')==='theorem'?'#fff0e1':'#fcfcfd'}" stroke="#bb5a08"/><text x="${p.x}" text-anchor="middle" fill="#12243a" font-family="Arial,sans-serif" font-size="10">${lines.map((line,i)=>`<tspan x="${p.x}" y="${p.y-(lines.length-1)*6+i*12+3}">${esc(line)}</tspan>`).join('')}</text></g>`;});
    svg+='</svg>';const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const a=document.createElement('a');a.href=url;a.download='proof-dependencies.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  $('export-svg').addEventListener('click',exportSvg);
  initGraph();updateGraph();loadHash();if(storage.get('reading')==='1')toggleMap(true);
})();
