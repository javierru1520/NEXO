/* ─── DATA ─── */
let OPS=[
  {id:'04821',name:'Jorge Ramírez',coord:'M. López',dep:'MTY Sur',nivel:'Intermedio',pct:20,status:'crit',pending:[{cap:'Manejo defensivo',prog:20,dl:'3 días',s:'crit'},{cap:'NOM-087',prog:0,dl:'3 días',s:'crit'}]},
  {id:'03317',name:'Luis Aguirre',coord:'M. López',dep:'MTY Sur',nivel:'Piloto',pct:0,status:'nostart',pending:[{cap:'NOM-087 Seguridad vial',prog:0,dl:'4 días',s:'crit'},{cap:'Actuación ante accidentes',prog:0,dl:'15 días',s:'risk'}]},
  {id:'07724',name:'Alejandro Vega',coord:'F. Cruz',dep:'GDL Oriente',nivel:'Intermedio',pct:35,status:'crit',pending:[{cap:'Actuación ante accidente',prog:35,dl:'5 días',s:'crit'},{cap:'Conducción nocturna',prog:20,dl:'22 días',s:'warn'}]},
  {id:'02209',name:'Carmen Delgado',coord:'F. Cruz',dep:'GDL Oriente',nivel:'Intermedio',pct:55,status:'risk',pending:[{cap:'Revisión preoperacional',prog:55,dl:'6 días',s:'risk'}]},
  {id:'05530',name:'Martín Soto',coord:'S. Herrera',dep:'GDL Poniente',nivel:'Intermedio',pct:60,status:'risk',pending:[{cap:'Conducción nocturna',prog:60,dl:'7 días',s:'risk'}]},
  {id:'08812',name:'Patricia Ruiz',coord:'M. López',dep:'MTY Sur',nivel:'Piloto',pct:45,status:'risk',pending:[{cap:'Manejo defensivo',prog:45,dl:'12 días',s:'warn'},{cap:'NOM-087',prog:0,dl:'20 días',s:'warn'}]},
  {id:'01134',name:'Roberto Núñez',coord:'F. Cruz',dep:'GDL Oriente',nivel:'Piloto',pct:30,status:'crit',pending:[{cap:'Seguridad básica vial',prog:30,dl:'8 días',s:'risk'}]},
  {id:'06677',name:'Ana Torres',coord:'R. Salinas',dep:'MTY Norte',nivel:'Intermedio',pct:75,status:'warn',pending:[{cap:'Checklist preoperacional',prog:75,dl:'18 días',s:'warn'}]},
  {id:'09901',name:'David Morales',coord:'S. Herrera',dep:'GDL Poniente',nivel:'Intermedio',pct:80,status:'warn',pending:[{cap:'Actuación ante accidentes',prog:80,dl:'21 días',s:'warn'}]},
  {id:'03388',name:'Lucía Mendoza',coord:'R. Salinas',dep:'MTY Norte',nivel:'Máster',pct:92,status:'ok',pending:[{cap:'Mentoría de operadores',prog:92,dl:'45 días',s:'ok'}]},
  {id:'11203',name:'Fernando Ibarra',coord:'R. Salinas',dep:'MTY Norte',nivel:'Intermedio',pct:68,status:'warn',pending:[{cap:'Ahorro de combustible',prog:68,dl:'25 días',s:'warn'}]},
  {id:'07432',name:'Claudia Moreno',coord:'M. López',dep:'MTY Sur',nivel:'Piloto',pct:5,status:'nostart',pending:[{cap:'Introducción al reglamento',prog:5,dl:'10 días',s:'crit'},{cap:'Protocolo de bienvenida',prog:0,dl:'10 días',s:'crit'}]},
];

const CAPS=[
  {name:'Introducción al reglamento',nivel:'Piloto',ob:'Sí',asig:422,comp:398,prog:18,si:6,venc:2,cov:94},
  {name:'Protocolo de bienvenida',nivel:'Piloto',ob:'Sí',asig:422,comp:410,prog:8,si:4,venc:1,cov:97},
  {name:'Seguridad básica vial',nivel:'Piloto',ob:'Sí',asig:422,comp:389,prog:22,si:11,venc:5,cov:92},
  {name:'Manejo defensivo carretera',nivel:'Intermedio',ob:'Sí',asig:422,comp:280,prog:89,si:53,venc:18,cov:66},
  {name:'Conducción nocturna y lluvia',nivel:'Intermedio',ob:'Sí',asig:422,comp:198,prog:110,si:114,venc:22,cov:47},
  {name:'Checklist preoperacional',nivel:'Intermedio',ob:'Sí',asig:422,comp:310,prog:74,si:38,venc:11,cov:73},
  {name:'Actuación ante accidentes',nivel:'Intermedio',ob:'Sí',asig:422,comp:244,prog:98,si:80,venc:14,cov:58},
  {name:'NOM-087 Seguridad vial',nivel:'Intermedio',ob:'Sí',asig:422,comp:212,prog:101,si:109,venc:21,cov:50},
  {name:'Ahorro de combustible',nivel:'Intermedio',ob:'No',asig:422,comp:190,prog:120,si:112,venc:3,cov:45},
  {name:'Mentoría de operadores',nivel:'Máster',ob:'No',asig:89,comp:34,prog:28,si:27,venc:0,cov:38},
];

const ALERTAS=[
  {type:'crit',icon:'🔴',title:'18 operadores con vencimientos en menos de 7 días',body:'Acción inmediata requerida. Fernando Cruz (8 ops.) y Mariana López (6 ops.) son los coordinadores más afectados.',action:'Ver operadores',dest:'operadores'},
  {type:'crit',icon:'🔴',title:'23 operadores no han iniciado ningún módulo',body:'Llevan más de 30 días registrados sin actividad en la plataforma. Riesgo alto de incumplimiento Q2.',action:'Ver lista',dest:'operadores'},
  {type:'risk',icon:'🟠',title:'GDL Oriente — cumplimiento 62%, muy por debajo de meta',body:'Fernando Cruz tiene 47 operadores con capacitaciones pendientes. Meta Q2: 85%. Gap actual: 23 pts.',action:'Ver coordinador',dest:'org'},
  {type:'risk',icon:'🟠',title:'Conducción nocturna y lluvia — cobertura crítica 47%',body:'Solo 198 de 422 operadores completaron este curso obligatorio. 22 certificaciones vencen en los próximos 30 días.',action:'Ver capacitación',dest:'capacitaciones'},
  {type:'warn',icon:'🟡',title:'Mariana López — 28 pendientes en MTY Sur',body:'Cumplimiento cayó de 79% a 71% en el último mes. Requiere plan de acción inmediato antes de cierre Q2.',action:'Ver equipo',dest:'org'},
  {type:'warn',icon:'🟡',title:'NOM-087 — 21 certificaciones por vencer en 30 días',body:'Operadores en proceso de renovación. Priorizar asignación y completar antes del 31 de julio.',action:'Ver capacitación',dest:'capacitaciones'},
  {type:'ok',icon:'🟢',title:'Ricardo Salinas supera meta mensual — 89%',body:'Depósito MTY Norte logró 89% de cumplimiento, superando la meta de 85%. Se recomienda reconocimiento formal.',action:'Ver detalle',dest:'org'},
];

const CURSOS_MOVIL=[
  {em:'🚌',cat:'Conducción',nm:'Manejo defensivo en carretera federal',nivel:'Intermedio',ob:true,dur:'18 min',pct:75,status:'warn'},
  {em:'🌙',cat:'Conducción',nm:'Conducción nocturna y en condiciones de lluvia',nivel:'Intermedio',ob:true,dur:'15 min',pct:0,status:'nostart'},
  {em:'🦺',cat:'Seguridad vial',nm:'Distancias de frenado y puntos ciegos',nivel:'Intermedio',ob:true,dur:'12 min',pct:50,status:'warn'},
  {em:'🚧',cat:'Seguridad vial',nm:'Zonas de obra y señalización vial',nivel:'Intermedio',ob:false,dur:'8 min',pct:0,status:'new'},
  {em:'🔧',cat:'La unidad',nm:'Revisión preoperacional diaria — checklist',nivel:'Intermedio',ob:true,dur:'20 min',pct:30,status:'warn'},
  {em:'⛽',cat:'La unidad',nm:'Ahorro de combustible y conducción eficiente',nivel:'Intermedio',ob:false,dur:'14 min',pct:0,status:'nostart'},
  {em:'🤝',cat:'Pasajeros',nm:'Protocolo de abordaje y atención al cliente',nivel:'Piloto',ob:true,dur:'16 min',pct:90,status:'ok'},
  {em:'🚨',cat:'Emergencias',nm:'Actuación ante accidente de tránsito',nivel:'Intermedio',ob:true,dur:'20 min',pct:0,status:'nostart'},
];

/* ─── NAVIGATION ─── */
let currentPage='dashboard';
let currentBStep=1;
let phCkCount=5;
const phCkTotal=10;

function navTo(page){
  // Hide all pages - reset any inline display
  document.querySelectorAll('.page').forEach(p=>{
    p.classList.remove('on');
    p.style.display='';
  });
  document.querySelectorAll('.sn').forEach(n=>n.classList.remove('on'));
  const pg=document.getElementById('p-'+page);
  if(pg){
    pg.classList.add('on');
    // Force correct display type
    if(pg.classList.contains('flex-page')||pg.classList.contains('phone-page')){
      pg.style.display='flex';
    } else {
      pg.style.display='block';
    }
  }
  const sn=document.getElementById('sn-'+page);
  if(sn) sn.classList.add('on');
  document.getElementById('content').scrollTop=0;
  currentPage=page;
  if(page==='operadores') renderOps('all');
  if(page==='capacitaciones') renderCaps();
  if(page==='alertas') renderAlertas();
  if(page==='app-operador'){renderCursosMovil();phNav('ph-home','ph-nb-home');}
  if(page==='crear'){document.getElementById('builder-sidebar').classList.add('hidden');goBStep(1,false);}
}

/* ─── OPS TABLE ─── */
let currentFilter='all';
function renderOps(filter){
  currentFilter=filter;
  const label=document.getElementById('op-coord-label');
  if(filter==='all') label.textContent='Todos los depósitos';
  else label.textContent='Depósito: '+filter;
  const data=OPS.filter(o=>{
    if(filter==='all') return true;
    if(filter==='crit') return o.status==='crit';
    if(filter==='risk') return o.status==='risk'||o.status==='crit'||o.status==='nostart';
    if(filter==='nostart') return o.status==='nostart';
    return o.dep===filter;
  });
  const tbody=document.getElementById('ops-tbody');
  tbody.innerHTML=data.map(o=>{
    const sc=o.status==='ok'?'ok':o.status==='warn'?'warn':o.status==='risk'?'risk':'crit';
    const dl=o.pending[0];
    const pends=o.pending.map(p=>`<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;"><span class="badge b-${p.s}" style="font-size:9px;">${p.dl}</span><span style="font-size:11px;color:rgba(255,255,255,0.7);">${p.cap}</span></div>`).join('');
    const cr=o.status==='crit'||o.status==='nostart'?' crit-r':'';
    return `<tr class="${cr}"><td><b style="color:var(--blanco)">${o.name}</b><br><span style="color:var(--mu2);font-size:11px;">#${o.id}</span></td><td style="color:var(--mu)">${o.coord}</td><td style="color:var(--mu)">${o.dep}</td><td>${pends}</td><td><span class="badge b-${dl.s}">⏰ ${dl.dl}</span></td><td><span class="badge b-na">${o.nivel}</span></td><td><div class="pp"><div class="pp-bar"><div class="prog-fill f-${sc}" style="width:${o.pct}%"></div></div><span class="pp-pct pct-${sc}">${o.pct}%</span></div></td><td><button class="row-btn" onclick="showOpDetail('${o.name}','#${o.id}','${o.dep}','${o.coord}')">Ver →</button><button class="row-btn" style="margin-left:5px;" onclick="showToast('📱 Notificación enviada por WhatsApp a ${o.name}')">📱 Notificar</button></td></tr>`;
  }).join('');
}

function filterOps(filter,btn){
  document.querySelectorAll('#op-filter-bar button').forEach(b=>{b.className='btn btn-ghost';});
  btn.className='btn btn-primary';
  document.getElementById('op-detail-panel').classList.add('hidden');
  renderOps(filter);
}

function searchOps(val){
  const v=val.toLowerCase();
  const data=OPS.filter(o=>o.name.toLowerCase().includes(v)||o.id.includes(v)||o.dep.toLowerCase().includes(v)||o.coord.toLowerCase().includes(v));
  const tbody=document.getElementById('ops-tbody');
  tbody.innerHTML=data.map(o=>{
    const sc=o.status==='ok'?'ok':o.status==='warn'?'warn':o.status==='risk'?'risk':'crit';
    const dl=o.pending[0];
    const pends=o.pending.map(p=>`<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;"><span class="badge b-${p.s}" style="font-size:9px;">${p.dl}</span><span style="font-size:11px;color:rgba(255,255,255,0.7);">${p.cap}</span></div>`).join('');
    const cr=o.status==='crit'||o.status==='nostart'?' crit-r':'';
    return `<tr class="${cr}"><td><b style="color:var(--blanco)">${o.name}</b><br><span style="color:var(--mu2);font-size:11px;">#${o.id}</span></td><td style="color:var(--mu)">${o.coord}</td><td style="color:var(--mu)">${o.dep}</td><td>${pends}</td><td><span class="badge b-${dl.s}">⏰ ${dl.dl}</span></td><td><span class="badge b-na">${o.nivel}</span></td><td><div class="pp"><div class="pp-bar"><div class="prog-fill f-${sc}" style="width:${o.pct}%"></div></div><span class="pp-pct pct-${sc}">${o.pct}%</span></div></td><td><button class="row-btn" onclick="showOpDetail('${o.name}','#${o.id}','${o.dep}','${o.coord}')">Ver →</button></td></tr>`;
  }).join('');
}

function showOpDetail(name,id,dep,coord){
  const o=OPS.find(x=>x.name===name);
  if(!o) return;
  const sc=o.status==='ok'?'ok':o.status==='warn'?'warn':o.status==='risk'?'risk':'crit';
  const caps=o.pending.map(p=>{
    const barColor=p.s==='ok'?'var(--lima)':p.s==='warn'?'var(--lima2)':p.s==='risk'?'var(--risk)':'var(--crit)';
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid var(--mu3);"><span style="font-size:20px;">📋</span><div style="flex:1;"><div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);margin-bottom:4px;">${p.cap}</div><div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;max-width:100px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;"><div style="height:100%;border-radius:2px;width:${p.prog}%;background:${barColor};"></div></div><span style="font-size:12px;font-weight:600;color:${barColor};">${p.prog}%</span></div></div><div style="font-size:11px;color:var(--mu2);white-space:nowrap;">⏰ Vence en ${p.dl}</div><span class="badge b-${p.s}">${p.s==='ok'?'Al corriente':p.s==='warn'?'En progreso':p.s==='risk'?'En riesgo':p.s==='crit'?'Crítico':'Sin iniciar'}</span></div>`;
  }).join('');
  const statusLabel=o.status==='ok'?'Al corriente':o.status==='warn'?'En progreso':o.status==='risk'?'En riesgo':o.status==='nostart'?'Sin iniciar':'Crítico';
  document.getElementById('op-detail-content').innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;padding-bottom:14px;border-bottom:0.5px solid var(--mu3);">
      <div class="dp-av">😎</div>
      <div style="flex:1;"><div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:800;color:var(--blanco);">${o.name}</div><div style="font-size:12px;color:var(--mu2);margin-top:2px;">Operador #${o.id} · ${o.dep} · Coord: ${o.coord}</div><div style="display:inline-flex;align-items:center;gap:5px;background:rgba(208,223,0,0.08);border:0.5px solid var(--bdr);color:var(--lima);border-radius:5px;padding:3px 8px;font-size:11px;font-weight:700;margin-top:5px;">🎓 ${o.nivel} · ${o.pct}% cumplimiento</div></div>
      <div style="display:flex;gap:7px;">
        <button class="btn btn-primary" onclick="showToast('📱 Notificación enviada por WhatsApp a ${o.name}')">📱 Notificar</button>
        <button class="btn btn-ghost" onclick="showToast('📅 Extensión de 7 días aprobada para ${o.name}')">📅 Extender plazo</button>
        <button class="btn btn-ghost" style="padding:8px 10px;" onclick="document.getElementById('op-detail-panel').classList.add('hidden')">✕</button>
      </div>
    </div>
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--mu2);margin-bottom:10px;">Capacitaciones pendientes (${o.pending.length})</div>
    ${caps}`;
  document.getElementById('op-detail-panel').classList.remove('hidden');
  document.getElementById('content').scrollTop=0;
}

function drillCoord(dep){
  navTo('operadores');
  renderOps(dep);
  document.querySelectorAll('#op-filter-bar button').forEach(b=>b.className='btn btn-ghost');
}

/* ─── CAPS TABLE ─── */
const NB={'Piloto':'b-ok','Intermedio':'b-blue','Máster':'b-na'};
function renderCaps(){
  document.getElementById('caps-tbody').innerHTML=CAPS.map(c=>{
    const sc=c.cov>=90?'ok':c.cov>=70?'warn':c.cov>=50?'risk':'crit';
    const vc=c.venc===0?'b-na':c.venc<=5?'b-crit':c.venc<=15?'b-risk':'b-warn';
    return `<tr><td><b style="color:var(--blanco)">${c.name}</b></td><td><span class="badge ${NB[c.nivel]}">${c.nivel}</span></td><td>${c.ob}</td><td>${c.asig}</td><td style="color:var(--lima)">${c.comp}</td><td style="color:var(--lima2)">${c.prog}</td><td style="color:var(--crit)">${c.si}</td><td><span class="badge ${vc}">${c.venc}</span></td><td><div class="pp"><div class="pp-bar"><div class="prog-fill f-${sc}" style="width:${c.cov}%"></div></div><span class="pp-pct pct-${sc}">${c.cov}%</span></div></td><td><button class="row-btn" onclick="showToast('Abriendo detalle: ${c.name}')">Ver →</button><button class="row-btn" style="margin-left:5px;" onclick="showToast('📤 Asignando ${c.name} a todos los operadores pendientes...')">Asignar</button></td></tr>`;
  }).join('');
}

/* ─── ALERTAS ─── */
function renderAlertas(){
  const c={'crit':'rgba(232,90,10,0.3)','risk':'rgba(245,155,0,0.2)','warn':'rgba(227,233,53,0.15)','ok':'rgba(208,223,0,0.15)'};
  document.getElementById('alertas-list').innerHTML=ALERTAS.map(a=>`
    <div style="background:var(--s2);border:0.5px solid ${c[a.type]};border-radius:12px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start;">
      <span style="font-size:20px;flex-shrink:0;">${a.icon}</span>
      <div style="flex:1;"><div style="font-size:14px;font-weight:600;color:var(--blanco);margin-bottom:4px;">${a.title}</div><div style="font-size:12px;color:var(--mu);line-height:1.5;">${a.body}</div></div>
      <button class="row-btn" style="flex-shrink:0;white-space:nowrap;" onclick="navTo('${a.dest}')">${a.action} →</button>
    </div>`).join('');
}

/* ─── COURSE BUILDER ─── */
function goBStep(n,animate=true){
  for(let i=1;i<=5;i++){
    const t=document.getElementById('bst'+i);
    t.classList.remove('active','done');
    if(i<n) t.classList.add('done');
    else if(i===n) t.classList.add('active');
  }
  document.querySelectorAll('.bs-pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('bs'+n).classList.add('on');
  document.getElementById('builder-sidebar').classList.toggle('hidden',n!==2);
  const btn=document.getElementById('bld-next-btn');
  btn.textContent=n===5?'Publicar 🚀':'Siguiente →';
  const rvn=document.getElementById('rv-name');
  if(rvn) rvn.textContent=document.getElementById('ctitle').value||'(sin título)';
  document.querySelector('.builder-ed').scrollTop=0;
  currentBStep=n;
}
function nextBStep(){if(currentBStep===5){publishCourse();}else{goBStep(currentBStep+1);}}
function publishCourse(){
  const t=document.getElementById('ctitle').value||'Manejo defensivo en carretera federal';
  document.getElementById('bs5-review').style.display='none';
  document.getElementById('bs5-success').classList.add('on');
  document.getElementById('sw-name').textContent='"'+t+'"';
  document.getElementById('bld-next-btn').disabled=true;
  document.getElementById('bld-next-btn').textContent='✓ Publicado';
}
function resetBuilder(){
  document.getElementById('bs5-review').style.display='block';
  document.getElementById('bs5-success').classList.remove('on');
  document.getElementById('ctitle').value='';
  document.getElementById('builder-title').textContent='Sin título';
  document.getElementById('bld-next-btn').disabled=false;
  goBStep(1);
}

function toggleLesson(id){
  const b=document.getElementById(id);
  const c=document.getElementById(id+'-c');
  const open=b.classList.contains('open');
  b.classList.toggle('open',!open);
  c.textContent=open?'▸':'▾';
}

function markOpt(el){
  el.closest('.quiz-q').querySelectorAll('.q-opt').forEach(o=>o.classList.remove('ok'));
  el.classList.add('ok');
  showToast('Marcada como respuesta correcta: "'+el.querySelector('.q-txt').textContent+'"');
}

function toggleMod(el){el.classList.toggle('active');}
function selectLesson(el){el.closest('.les-list').querySelectorAll('.les-row').forEach(r=>r.classList.remove('active'));el.classList.add('active');}
function selRc(el){el.closest('.rg').querySelectorAll('.rc').forEach(c=>{c.classList.remove('sel');c.querySelector('.rc-chk').textContent='';});el.classList.add('sel');el.querySelector('.rc-chk').textContent='✓';}
function togAud(el){el.classList.toggle('sel');el.querySelector('.ac-chk').textContent=el.classList.contains('sel')?'✓':'';}

function openLessonModal(){
  document.getElementById('modal-content').innerHTML=`
    <div class="modal-t">Agregar lección</div>
    <div class="modal-s">Selecciona el tipo de contenido para esta lección.</div>
    <div class="lesson-type-grid">
      <div class="ltc sel" onclick="selLT(this)"><div class="ltc-i">🎥</div><div class="ltc-n">Video</div><div class="ltc-d">MP4, YouTube, Vimeo</div></div>
      <div class="ltc" onclick="selLT(this)"><div class="ltc-i">❓</div><div class="ltc-n">Quiz</div><div class="ltc-d">Opción múltiple</div></div>
      <div class="ltc" onclick="selLT(this)"><div class="ltc-i">📄</div><div class="ltc-n">Documento</div><div class="ltc-d">PDF, Word, PPT</div></div>
      <div class="ltc" onclick="selLT(this)"><div class="ltc-i">✅</div><div class="ltc-n">Tarea</div><div class="ltc-d">Sube evidencia</div></div>
      <div class="ltc" onclick="selLT(this)"><div class="ltc-i">🎙️</div><div class="ltc-n">Audio</div><div class="ltc-d">Solo audio / voz</div></div>
      <div class="ltc" onclick="selLT(this)"><div class="ltc-i">📦</div><div class="ltc-n">SCORM</div><div class="ltc-d">Paquete SCORM</div></div>
    </div>
    <div class="modal-ft">
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-primary" onclick="confirmLesson()">Agregar →</button>
    </div>`;
  document.getElementById('modal-bg').classList.remove('hidden');
}

function selLT(el){document.querySelectorAll('.ltc').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');}
function confirmLesson(){const t=document.querySelector('.ltc.sel .ltc-n').textContent;closeModal();showToast('✓ Lección de tipo '+t+' agregada. Sube el contenido.');}
function closeModal(){document.getElementById('modal-bg').classList.add('hidden');}
document.getElementById('modal-bg').addEventListener('click',function(e){if(e.target===this)closeModal();});

/* ─── MODE SWITCH ─── */
let mode='hr';
function switchMode(){
  mode=mode==='hr'?'op':'hr';
  document.getElementById('mode-toggle').textContent=mode==='hr'?'👔 Vista RRHH':'📱 App Operador';
  const userName = nexoUser ? nexoUser.nombre : (mode==='hr' ? 'Erika Vargas' : 'Carlos Mendoza');
  document.getElementById('mode-label').textContent=mode==='hr'?'Vista RRHH: '+userName:'Operador: '+userName;
  navTo(mode==='hr'?'dashboard':'app-operador');
}

/* ─── PHONE NAVIGATION ─── */
function phNav(pgId,nbId){
  document.querySelectorAll('.ph-pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.ph-nb').forEach(b=>b.classList.remove('on'));
  document.getElementById(pgId).classList.add('on');
  const nb=document.getElementById(nbId);
  if(nb) nb.classList.add('on');
  const scr=document.getElementById('ph-screen');
  if(scr) scr.scrollTop=0;
}

function swTab(el,group){
  el.closest('.itabs').querySelectorAll('.itab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
}

/* ─── LESSON QUIZ ─── */
function showQuiz(){
  document.getElementById('lesson-content').classList.add('hidden');
  document.getElementById('quiz-section').classList.remove('hidden');
}
function pickOpt(el,correct){
  document.querySelectorAll('.ph-opt').forEach(o=>{o.classList.remove('ok','no');o.style.pointerEvents='none';});
  if(correct) el.classList.add('ok');
  else{el.classList.add('no');document.getElementById('correct-opt').classList.add('ok');}
  setTimeout(()=>{
    document.getElementById('quiz-section').classList.add('hidden');
    document.getElementById('res-screen').classList.add('on');
  },900);
}
function resetLesson(){
  document.getElementById('lesson-content').classList.remove('hidden');
  document.getElementById('quiz-section').classList.add('hidden');
  document.getElementById('res-screen').classList.remove('on');
  document.querySelectorAll('.ph-opt').forEach(o=>{o.classList.remove('ok','no');o.style.pointerEvents='';});
}

/* ─── CHECKLIST ─── */
function togCk(el){
  el.classList.toggle('chk');
  const box=el.querySelector('.ck-box');
  const isChk=el.classList.contains('chk');
  box.textContent=isChk?'✓':'';
  phCkCount+=isChk?1:-1;
  document.getElementById('ck-count').textContent=phCkCount+' / '+phCkTotal+' ítems completados';
}
function submitChecklist(){
  if(phCkCount<phCkTotal){showToast('Aún tienes '+(phCkTotal-phCkCount)+' ítems pendientes. Completa todos primero.');}
  else{showToast('✅ Reporte enviado. +30 puntos ganados. ¡Tu unidad está lista para salir!');phNav('ph-home','ph-nb-home');}
}

/* ─── REWARDS ─── */
let phPts=1840;
function canjear(nombre,pts){
  if(pts>phPts){showToast('⚠️ Puntos insuficientes. Necesitas: '+pts+' pts · Tienes: '+phPts+' pts');}
  else{phPts-=pts;showToast('🎉 ¡Canje exitoso! '+nombre+' · -'+pts+' pts · Te quedan '+phPts+' pts');}
}

/* ─── CURSOS MOVIL ─── */
function renderCursosMovil(){
  document.getElementById('cursos-list').innerHTML=CURSOS_MOVIL.map(c=>{
    const sc=c.status==='ok'?'var(--lima)':c.status==='warn'?'var(--lima2)':c.status==='new'?'var(--gmd)':'rgba(255,255,255,0.2)';
    const bar=c.status==='ok'?'var(--lima)':c.status==='warn'?'var(--lima2)':'rgba(255,255,255,0.15)';
    const pctlbl=c.pct>0?c.pct+'%':c.status==='new'?'Nuevo':'0%';
    return `<div style="background:var(--s2);border:0.5px solid var(--bdr2);border-radius:14px;margin-bottom:10px;overflow:hidden;cursor:pointer;" onclick="phNav('ph-lesson','ph-nb-courses')">
      <div style="height:80px;background:linear-gradient(135deg,#0F1500,#1A2800);display:flex;align-items:center;justify-content:center;font-size:38px;position:relative;"><div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 55%);"></div><span style="position:relative;z-index:1;">${c.em}</span><div style="position:absolute;bottom:0;left:0;right:0;height:2.5px;background:linear-gradient(90deg,var(--oliva),var(--lima));"></div></div>
      <div style="padding:11px 13px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--lima);margin-bottom:3px;">${c.cat} · ${c.nivel}</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:var(--blanco);margin-bottom:7px;line-height:1.2;">${c.nm}</div><div style="display:flex;justify-content:space-between;align-items:center;"><div style="display:flex;gap:5px;flex-wrap:wrap;">${c.ob?'<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(208,223,0,0.12);color:var(--lima);">Obligatorio</span>':'<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,0.05);color:var(--gmd);">Opcional</span>'}<span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;background:rgba(255,255,255,0.05);color:var(--gmd);">${c.dur}</span></div><div><div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800;color:${sc};text-align:right;">${pctlbl}</div><div style="font-size:9px;color:var(--mu2);text-align:right;">${c.pct>0?'en progreso':c.status==='new'?'nuevo':'sin iniciar'}</div></div></div></div></div>`;
  }).join('');
}

/* ─── TOAST ─── */
let toastTimer;
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),3200);
}

/* ─── NEXO INTEGRATION ─── */
let nexoUser = null;

async function initNexo() {
  // 1. Leer sesión de NEXO desde localStorage
  try {
    const raw = localStorage.getItem('nexo_user');
    if (raw) nexoUser = JSON.parse(raw);
  } catch(e) { /* sin sesión */ }

  // 2. Actualizar nombre en topbar
  if (nexoUser) {
    const label = document.getElementById('mode-label');
    if (label) {
      const isAdmin = ['ADMIN','ADP','RL'].includes(nexoUser.rolCode);
      label.textContent = isAdmin
        ? 'Vista RRHH: ' + nexoUser.nombre
        : 'Coord: ' + nexoUser.nombre;
    }
  }

  // 3. Cargar operadores reales si hay nómina (coordinador)
  if (nexoUser && nexoUser.nomina) {
    try {
      const res = await fetch('/api/lms/operadores?nomina=' + encodeURIComponent(nexoUser.nomina));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          OPS = data;
          // Re-renderizar si ya está en la página de operadores
          if (currentPage === 'operadores') renderOps('all');
          // Actualizar KPIs del dashboard
          updateDashboardKPIs();
        }
      }
    } catch(e) { /* usar datos mock como fallback */ }
  }
}

function updateDashboardKPIs() {
  if (!OPS.length) return;
  const total  = OPS.length;
  const crit   = OPS.filter(o => o.status === 'crit' || o.status === 'nostart').length;
  const ok     = OPS.filter(o => o.status === 'ok').length;
  const avgPct = Math.round(OPS.reduce((s, o) => s + o.pct, 0) / total);

  // Intentar actualizar KPI cards si tienen los IDs esperados
  const setKpi = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setKpi('kpi-total',  total);
  setKpi('kpi-crit',   crit);
  setKpi('kpi-ok',     ok);
  setKpi('kpi-avg',    avgPct + '%');
}

/* ─── INIT ─── */
initNexo().then(() => navTo('dashboard'));