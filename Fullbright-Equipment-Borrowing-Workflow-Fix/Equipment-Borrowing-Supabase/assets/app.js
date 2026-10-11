/* Fullbright College Equipment Borrowing System */
const SUPABASE_URL = 'https://uaxfzmtpjcfwfoqhgfih.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hsippBvYrIczvzTtI8cR2A_dV6eqcUj';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const MAX_BORROW_DAYS = 7;
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
let me=null, profile=null, charts=[];

function toast(msg,bad=false){const t=$('#toast');t.textContent=msg;t.style.background=bad?'#7f1d1d':'#10212d';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)}
function esc(x){return String(x??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function today(){return new Date().toISOString().slice(0,10)}
function addDays(date,days){const d=new Date(date+'T00:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function badge(x){const v=String(x||'');const c=['Available','Active','Completed','Excellent','Good'].includes(v)?'good':['Maintenance','Pending','Fair','Partially Returned','In Progress','Approved'].includes(v)?'warn':['Damaged','Lost','Overdue','Rejected','Cancelled','For Repair','Suspended'].includes(v)?'bad':'';return `<span class="badge ${c}">${esc(v)}</span>`}
function role(){return profile?.role?.role_name||'Student'}
function isAdmin(){return role()==='Administrator'}
function isStaff(){return ['Administrator','Equipment Officer'].includes(role())}
function canBorrow(){return ['Administrator','Equipment Officer','Staff','Student'].includes(role())}
function isOverdue(r){return ['Pending','Approved','Active','Partially Returned'].includes(r.status)&&r.expected_return_date<today()}
function effectiveStatus(r){return isOverdue(r)?'Overdue':r.status}
function destroyCharts(){charts.forEach(c=>c.destroy());charts=[]}

async function getProfile(){
  const {data:{user}}=await sb.auth.getUser(); me=user;
  if(!user){profile=null;return null}
  let {data,error}=await sb.from('users').select('*, role:roles(role_name), department:departments(department_name)').eq('auth_user_id',user.id).maybeSingle();
  if(error) throw error;
  if(!data){
    const {data:r,error:e}=await sb.rpc('ensure_my_profile');
    if(e) throw e;
    ({data,error}=await sb.from('users').select('*, role:roles(role_name), department:departments(department_name)').eq('auth_user_id',user.id).single());
    if(error) throw error;
  }
  profile=data; return data;
}
function showAuth(){ $('#authView').classList.remove('hidden');$('#appView').classList.add('hidden') }
function showApp(){
  $('#authView').classList.add('hidden');$('#appView').classList.remove('hidden');
  $$('.admin-only').forEach(x=>x.style.display=isAdmin()?'flex':'none');
  $$('.staff-only').forEach(x=>x.style.display=isStaff()?'flex':'none');
  $$('.borrower-only').forEach(x=>x.style.display=canBorrow()?'flex':'none');
  $('#userChip').textContent=`${profile.first_name} ${profile.last_name} · ${role()}`;
  $('#welcome').textContent=`Welcome back, ${profile.first_name}!`;
  updateNotifications(); loadPage('dashboard');
}
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#loginForm').classList.toggle('hidden',b.dataset.tab!=='login');$('#signupForm').classList.toggle('hidden',b.dataset.tab!=='signup')});
$('#loginForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error)return toast(error.message,true);await start()};
$('#signupForm').onsubmit=async e=>{
  e.preventDefault();
  const meta={first_name:$('#firstName').value.trim(),last_name:$('#lastName').value.trim(),employee_no:$('#studentId').value.trim(),course_program:$('#signupCourse').value.trim(),year_level:null};
  const {data,error}=await sb.auth.signUp({email:$('#signupEmail').value.trim(),password:$('#signupPassword').value,options:{data:meta}});
  if(error)return toast(error.message,true);
  if(!data.session){toast('Account created. If email confirmation is enabled, confirm your email first.');return}
  toast('Account created successfully!');await start();
};
$('#logout').onclick=async()=>{await sb.auth.signOut();me=null;profile=null;showAuth()};
$$('.nav').forEach(b=>b.onclick=()=>{$$('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#notificationPanel').classList.add('hidden');loadPage(b.dataset.page)});
$('#notificationBtn').onclick=()=>{const panel=$('#notificationPanel');panel.classList.toggle('hidden');$('#notificationBtn').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')))};
sb.auth.onAuthStateChange(async()=>{if(me===null)await start()});
async function start(){try{await getProfile();if(profile)showApp();else showAuth()}catch(e){showAuth();toast(e.message,true)}}

async function loadPage(page){
  destroyCharts(); $('#pageTitle').textContent=page==='profile'?'My Profile':page[0].toUpperCase()+page.slice(1);
  try{if(page==='dashboard')return dashboard();if(page==='equipment')return equipment();if(page==='borrow')return borrow();if(page==='transactions')return transactions();if(page==='maintenance')return maintenance();if(page==='users')return users();if(page==='reports')return reports();if(page==='profile')return profilePage()}catch(e){$('#content').innerHTML=`<div class="card"><b>Error:</b> ${esc(e.message)}</div>`}
}

async function dashboard(){
  const [{count:units},{count:available},{count:borrowed},{count:maint},{count:usersCount},{data:recent},{data:inv}]=await Promise.all([
    sb.from('equipment_units').select('*',{count:'exact',head:true}),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('availability_status','Available'),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('availability_status','Borrowed'),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('availability_status','Maintenance'),
    isStaff()?sb.from('users').select('*',{count:'exact',head:true}):Promise.resolve({count:null}),
    isStaff()?sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name)').order('borrowing_id',{ascending:false}).limit(6):sb.from('borrowings').select('*').order('borrowing_id',{ascending:false}).limit(6),
    sb.from('v_equipment_inventory').select('*')
  ]);
  const overdue=(recent||[]).filter(isOverdue).length;
  const cat={};(inv||[]).forEach(x=>cat[x.category_name]=(cat[x.category_name]||0)+1);
  $('#content').innerHTML=`<div class="cards"><div class="card stat"><div class="label">Total Units</div><div class="num">${units??0}</div></div><div class="card stat"><div class="label">Available</div><div class="num">${available??0}</div></div><div class="card stat"><div class="label">Borrowed</div><div class="num">${borrowed??0}</div></div><div class="card stat"><div class="label">Overdue</div><div class="num">${overdue}</div></div></div>
  <div class="chart-grid"><div class="card"><h3 class="section-title">Inventory by Category</h3><div class="chart-box"><canvas id="categoryChart"></canvas></div></div><div class="card"><h3 class="section-title">Current Equipment Status</h3><div class="chart-box"><canvas id="statusChart"></canvas></div></div></div>
  <div class="card" style="margin-top:14px"><h3 class="section-title">Recent Borrowing Activity</h3><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Borrower</th><th>Purpose</th><th>Due</th><th>Status</th></tr></thead><tbody>${(recent||[]).map(r=>`<tr class="${isOverdue(r)?'overdue-row':''}"><td>#${r.borrowing_id}</td><td>${esc(r.borrower?.first_name+' '+r.borrower?.last_name||'')}</td><td>${esc(r.purpose)}</td><td>${esc(r.expected_return_date)}</td><td>${badge(effectiveStatus(r))}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No transactions yet.</td></tr>'}</tbody></table></div></div>`;
  const statusCounts={Available:available||0,Borrowed:borrowed||0,Maintenance:maint||0};
  charts.push(new Chart($('#categoryChart'),{type:'bar',data:{labels:Object.keys(cat),datasets:[{label:'Units',data:Object.values(cat)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}));
  charts.push(new Chart($('#statusChart'),{type:'doughnut',data:{labels:Object.keys(statusCounts),datasets:[{data:Object.values(statusCounts)}]},options:{responsive:true,maintainAspectRatio:false}}));
}

async function equipment(){
  const {data,error}=await sb.from('v_equipment_inventory').select('*').order('asset_tag');if(error)throw error;
  const groups={};(data||[]).forEach(r=>{const k=r.equipment_id;groups[k]??={...r,total:0,available:0};groups[k].total++;if(r.availability_status==='Available')groups[k].available++});
  $('#content').innerHTML=`<div class="toolbar"><input id="eqSearch" class="search" placeholder="Search equipment, ID, category, location..."><button class="btn primary" ${isStaff()?'':'style="display:none"'} onclick="equipmentForm()">+ Add Equipment</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Equipment ID</th><th>Equipment</th><th>Category</th><th>Quantity</th><th>Available</th><th>Condition</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead><tbody id="eqBody">${Object.values(groups).map(r=>`<tr data-search="${esc((r.equipment_id+' '+r.equipment_name+' '+(r.brand||'')+' '+(r.model||'')+' '+r.category_name+' '+(r.location||'')).toLowerCase())}"><td><b>EQ-${String(r.equipment_id).padStart(4,'0')}</b></td><td>${esc(r.equipment_name)}<br><small>${esc(r.brand||'')} ${esc(r.model||'')}</small></td><td>${esc(r.category_name)}</td><td>${r.total}</td><td>${r.available}</td><td>${badge(r.condition_status)}</td><td>${esc(r.location||'')}</td><td>${badge(r.availability_status)}</td><td>${isAdmin()?`<button class="btn small" onclick="addEquipmentQuantity(${r.equipment_id})">+ Add Qty</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="9" class="empty">No equipment found.</td></tr>'}</tbody></table></div>`;
  $('#eqSearch').oninput=e=>$$('#eqBody tr').forEach(r=>r.style.display=r.dataset.search.includes(e.target.value.toLowerCase())?'':'none');
}
async function equipmentForm(){
  const {data:cats}=await sb.from('equipment_categories').select('*').order('category_name');
  $('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">Add Equipment</h3><form class="form" id="eqForm"><div class="grid2"><div class="field"><label>Equipment name</label><input id="en" required placeholder="Laptop"></div><div class="field"><label>Category</label><select id="ec">${(cats||[]).map(c=>`<option value="${c.category_id}">${esc(c.category_name)}</option>`).join('')}</select></div></div><div class="grid2"><div class="field"><label>Brand</label><input id="eb"></div><div class="field"><label>Model</label><input id="em"></div></div><div class="grid2"><div class="field"><label>Quantity</label><input id="eqty" type="number" min="1" value="1" required></div><div class="field"><label>Location</label><input id="eloc" placeholder="IT Office / Room 2"></div></div><div class="grid2"><div class="field"><label>Condition</label><select id="econd"><option>Excellent</option><option selected>Good</option><option>Fair</option><option>Damaged</option><option>For Repair</option></select></div><div class="field"><label>Replacement cost per unit</label><input id="cost" type="number" min="0" step="0.01" value="0"></div></div><div class="actions"><button type="button" class="btn" onclick="loadPage('equipment')">Cancel</button><button class="btn primary">Save Equipment</button></div></form></div>`;
  $('#eqForm').onsubmit=async e=>{e.preventDefault();const qty=Math.max(1,+$('#eqty').value||1);const r=await sb.from('equipment').insert({category_id:+$('#ec').value,equipment_name:$('#en').value.trim(),brand:$('#eb').value.trim()||null,model:$('#em').value.trim()||null,replacement_cost:+($('#cost').value||0)}).select().single();if(r.error)return toast(r.error.message,true);const rows=Array.from({length:qty},()=>({equipment_id:r.data.equipment_id,condition_status:$('#econd').value,location:$('#eloc').value.trim()||null}));const u=await sb.from('equipment_units').insert(rows);if(u.error)return toast(u.error.message,true);toast(`Equipment added. ${qty} unit(s) received automatic IDs.`);loadPage('equipment')}
}


async function addEquipmentQuantity(equipmentId){
  if(!isAdmin())return toast('Only an Administrator can add equipment quantity.',true);
  const raw=prompt('How many additional units do you want to add?','1');
  if(raw===null)return;
  const qty=Number.parseInt(raw,10);
  if(!Number.isInteger(qty)||qty<1||qty>500)return toast('Enter a whole number from 1 to 500.',true);
  const condition=prompt('Condition for the new units (Excellent, Good, Fair, Damaged, For Repair):','Good');
  if(condition===null)return;
  const allowed=['Excellent','Good','Fair','Damaged','For Repair'];
  if(!allowed.includes(condition.trim()))return toast('Please enter one of the listed condition values.',true);
  const location=prompt('Location for the new units (optional):','');
  if(location===null)return;
  const rows=Array.from({length:qty},()=>({equipment_id:equipmentId,condition_status:condition.trim(),location:location.trim()||null}));
  const {error}=await sb.from('equipment_units').insert(rows);
  if(error)return toast(error.message,true);
  toast(`Added ${qty} unit(s).`);
  await loadPage('equipment');
}

function equipmentImage(unit){
  const label=`${unit.equipment_name||''} ${unit.category_name||''}`.toLowerCase();
  if(/laptop|computer|notebook|pc|monitor/.test(label))return 'assets/equipment-laptop.svg';
  if(/projector|display|screen/.test(label))return 'assets/equipment-projector.svg';
  if(/camera|photo|video/.test(label))return 'assets/equipment-camera.svg';
  if(/speaker|microphone|audio|sound|amplifier/.test(label))return 'assets/equipment-audio.svg';
  return 'assets/equipment-generic.svg';
}

async function borrow(){
  if(!canBorrow())return loadPage('dashboard');
  const {data:units,error}=await sb.from('v_equipment_inventory').select('*').eq('availability_status','Available').order('asset_tag');if(error)throw error;
  const groupedUnits=Object.values((units||[]).reduce((groups,u)=>{const key=String(u.equipment_id);if(!groups[key])groups[key]={...u,units:[],available:0};groups[key].units.push(u);groups[key].available++;return groups},{}));
  const min=today(), max=addDays(min,MAX_BORROW_DAYS);
  $('#content').innerHTML=`<div class="borrow-page"><div class="borrow-intro"><div><span class="eyebrow">EQUIPMENT CATALOG</span><h3 class="section-title">Choose equipment to borrow</h3><p class="hint">Select the item cards you need. You can choose more than one available unit.</p></div><div class="borrow-rule"><span class="rule-icon">↗</span><div><b>${MAX_BORROW_DAYS}-day maximum</b><small>Return equipment by your selected due date.</small></div></div></div>
  <div class="equipment-picker-toolbar"><input id="borrowSearch" class="search" placeholder="Search equipment, asset ID, or location..." aria-label="Search available equipment"><div class="selection-tools"><button type="button" class="btn" id="selectAllEquipment">Select all</button><button type="button" class="btn" id="clearAllEquipment">Clear all</button><div class="selected-count"><span id="selectedCount">0</span> units selected</div></div></div>
  ${groupedUnits.length?`<div class="equipment-picker-grid" id="equipmentPicker">${groupedUnits.map(g=>`<label class="equipment-pick-card" data-equipment-id="${g.equipment_id}" data-search="${esc(`${g.equipment_name||''} ${g.brand||''} ${g.model||''} ${g.category_name||''} ${g.location||''}`.toLowerCase())}"><input class="equipment-check" type="checkbox" value="${g.equipment_id}" aria-label="Select ${esc(g.equipment_name)}"><span class="pick-checkmark" aria-hidden="true">✓</span><img class="equipment-photo" src="${equipmentImage(g)}" alt="${esc(g.equipment_name)} illustration" loading="lazy"><span class="equipment-pick-info"><span class="equipment-pick-name">${esc(g.equipment_name)}</span><span class="equipment-pick-model">${esc([g.brand,g.model].filter(Boolean).join(' ')||g.category_name||'College equipment')}</span><span class="equipment-pick-meta"><span>${esc(g.category_name||'')}</span><span>·</span><span>${esc(g.location||'Location not set')}</span></span><span class="available-label">${g.available} available</span><span class="quantity-row"><span>Quantity</span><input class="equipment-quantity" type="number" min="1" max="${g.available}" value="1" disabled aria-label="Quantity of ${esc(g.equipment_name)}"></span></span></label>`).join('')}</div>`:`<div class="card empty-equipment"><div class="empty-equipment-icon">▣</div><h3>No equipment available right now</h3><p>There are currently no available units to borrow. Please check again later.</p></div>`}
  <form class="card form borrow-details-card" id="borrowForm"><div class="borrow-details-heading"><div><h3 class="section-title">Borrowing details</h3><p class="hint">Complete the details to send your request.</p></div><span class="selected-pill"><span id="selectedSummary">No items selected</span></span></div><div class="grid2"><div class="field"><label for="due">Expected return date</label><input id="due" type="date" required min="${min}" max="${max}" value="${max}"><small class="field-hint">Within ${MAX_BORROW_DAYS} days from today.</small></div><div class="field"><label for="purpose">Purpose</label><input id="purpose" required placeholder="e.g. Class presentation"></div></div><div class="field"><label for="remarks">Remarks <span class="optional-label">(optional)</span></label><textarea id="remarks" rows="3" placeholder="Add any extra details for the equipment officer"></textarea></div><div class="actions"><button class="btn primary" ${units?.length?'':'disabled'}>Submit Borrowing Request</button></div></form></div>`;
  const checks=()=>Array.from(document.querySelectorAll('.equipment-check'));
  const updateSelected=()=>{let selectedTypes=0,totalUnits=0;checks().forEach(c=>{const card=c.closest('.equipment-pick-card'),qty=card.querySelector('.equipment-quantity');qty.disabled=!c.checked;const n=c.checked?Math.max(1,Math.min(+qty.value||1,+qty.max||1)):0;if(c.checked){selectedTypes++;totalUnits+=n}card.classList.toggle('selected',c.checked)});$('#selectedCount').textContent=totalUnits;$('#selectedSummary').textContent?$('#selectedSummary').textContent=totalUnits?`${selectedTypes} equipment type${selectedTypes===1?'':'s'} · ${totalUnits} unit${totalUnits===1?'':'s'}`:'No items selected':null};
  checks().forEach(c=>c.addEventListener('change',updateSelected));
  $$('.equipment-quantity').forEach(q=>q.addEventListener('input',()=>{const max=+q.max||1;if(+q.value>max)q.value=max;if(+q.value<1&&q.value!=='')q.value=1;updateSelected()}));
  $('#borrowSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();$$('#equipmentPicker .equipment-pick-card').forEach(card=>card.hidden=!card.dataset.search.includes(q))});
  const clearAllEquipment=()=>{checks().forEach(c=>c.checked=false);updateSelected()};
  $('#selectAllEquipment')?.addEventListener('click',()=>{checks().forEach(c=>c.checked=true);updateSelected()});
  $('#clearAllEquipment')?.addEventListener('click',clearAllEquipment);
  $('#clearEquipmentSelection')?.addEventListener('click',clearAllEquipment);
  $('#borrowForm').onsubmit=async e=>{e.preventDefault();const ids=checks().filter(c=>c.checked).flatMap(c=>{const card=c.closest('.equipment-pick-card'),qty=Math.max(1,Math.min(+card.querySelector('.equipment-quantity').value||1,+card.querySelector('.equipment-quantity').max||1));const group=groupedUnits.find(g=>String(g.equipment_id)===c.value);return (group?.units||[]).slice(0,qty).map(u=>+u.unit_id)});if(!ids.length)return toast('Please select at least one equipment item.',true);const due=$('#due').value;if(due<min||due>max)return toast(`Choose a return date within ${MAX_BORROW_DAYS} days.`,true);const submit=e.submitter;submit.disabled=true;submit.textContent='Submitting...';const {data,error}=await sb.rpc('create_borrowing',{p_unit_ids:ids,p_expected_return_date:due,p_purpose:$('#purpose').value.trim(),p_remarks:$('#remarks').value.trim()||null});if(error){submit.disabled=false;submit.textContent='Submit Borrowing Request';return toast(error.message,true)}toast(`Borrowing request #${data} created`);loadPage('transactions');updateNotifications()}
}

async function transactions(){
  const q=sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no), approver:users!borrowings_approved_by_fkey(first_name,last_name)').order('borrowing_id',{ascending:false});
  const {data,error}=await q;if(error)throw error;
  const visible=isStaff()?data:(data||[]).filter(r=>r.borrower_id===profile.user_id);
  $('#content').innerHTML=`<div class="toolbar"><div class="hint" style="margin:0">${isStaff()?'All borrowing requests':'Your borrowing history'} · Maximum ${MAX_BORROW_DAYS} days</div></div><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Borrower</th><th>Purpose</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>${(visible||[]).map(r=>`<tr class="${isOverdue(r)?'overdue-row':''}"><td>#${r.borrowing_id}</td><td>${esc(r.borrower?.first_name+' '+r.borrower?.last_name)}<br><small>${esc(r.borrower?.employee_no)}</small></td><td>${esc(r.purpose)}</td><td>${new Date(r.borrow_date).toLocaleDateString()}</td><td>${esc(r.expected_return_date)}</td><td>${badge(effectiveStatus(r))}</td><td><button class="btn" onclick="printReceipt(${r.borrowing_id})">Print Receipt</button>${isStaff()&&r.status==='Pending'?` <button class="btn primary" onclick="approve(${r.borrowing_id})">Approve</button> <button class="btn danger" onclick="rejectBorrowing(${r.borrowing_id})">Reject</button>`:''}${isStaff()&&['Active','Approved','Partially Returned'].includes(r.status)?` <button class="btn" onclick="receive(${r.borrowing_id})">Receive Return</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">No transactions.</td></tr>'}</tbody></table></div>`;
}
async function approve(id){const {error}=await sb.rpc('approve_borrowing',{p_borrowing_id:id});if(error)return toast(error.message,true);toast('Borrowing approved');await updateNotifications();loadPage('transactions')}
async function rejectBorrowing(id){if(!confirm(`Reject borrowing request #${id}? Its reserved units will be released.`))return;const {error}=await sb.rpc('reject_borrowing',{p_borrowing_id:id});if(error)return toast(error.message,true);toast('Request rejected and units released');await updateNotifications();loadPage('transactions')}
async function receive(id){if(!confirm(`Record the return for borrowing #${id}?`))return;const {error}=await sb.rpc('receive_borrowing_return',{p_borrowing_id:id,p_remarks:'Returned through web app'});if(error)return toast(error.message,true);toast('Return recorded');await updateNotifications();loadPage('transactions')}
async function printReceipt(id){
  const {data:r,error}=await sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no,department_id), borrowing_items(*, unit:equipment_units(asset_tag,serial_number,condition_status,location,equipment:equipment(equipment_name,brand,model)))').eq('borrowing_id',id).single();if(error)return toast(error.message,true);
  const rows=(r.borrowing_items||[]).map(i=>`<tr><td>${esc(i.unit?.asset_tag)}</td><td>${esc(i.unit?.equipment?.equipment_name)}</td><td>${esc(i.unit?.equipment?.brand||'')} ${esc(i.unit?.equipment?.model||'')}</td><td>${esc(i.item_condition_out)}</td></tr>`).join('');
  const w=window.open('','_blank','width=900,height=700');if(!w)return toast('Please allow pop-ups to print the receipt.',true);
  w.document.write(`<html><head><title>Borrowing Receipt #${r.borrowing_id}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111}h1{margin:0 0 4px}p{color:#444}.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:15px;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #bbb;padding:9px;text-align:left;font-size:13px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:70px}.sign div{border-top:1px solid #333;padding-top:7px}button{padding:10px 15px} @media print{button{display:none}}</style></head><body><div class="head"><div><h1>Fullbright College</h1><p>Equipment Borrowing System</p></div><div><b>Borrowing Receipt #${r.borrowing_id}</b><p>${new Date(r.borrow_date).toLocaleString()}</p></div></div><div class="meta"><div><b>Borrower:</b> ${esc(r.borrower?.first_name+' '+r.borrower?.last_name)}</div><div><b>ID:</b> ${esc(r.borrower?.employee_no)}</div><div><b>Purpose:</b> ${esc(r.purpose)}</div><div><b>Expected Return:</b> ${esc(r.expected_return_date)}</div><div><b>Status:</b> ${esc(effectiveStatus(r))}</div></div><table><thead><tr><th>Asset ID</th><th>Equipment</th><th>Brand / Model</th><th>Condition Out</th></tr></thead><tbody>${rows}</tbody></table><p><b>Note:</b> Equipment must be returned on or before the expected return date. Maximum borrowing period is ${MAX_BORROW_DAYS} days.</p><div class="sign"><div>Borrower's Signature</div><div>Equipment Officer Signature</div></div><button onclick="window.print()">Print</button><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()
}

async function maintenance(){const {data,error}=await sb.from('maintenance_records').select('*, unit:equipment_units(asset_tag), reporter:users!maintenance_records_reported_by_fkey(first_name,last_name)').order('maintenance_id',{ascending:false});if(error)throw error;$('#content').innerHTML=`<div class="toolbar"><h3 class="section-title" style="flex:1">Maintenance Records</h3><button class="btn primary" onclick="maintenanceForm()">+ New Record</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Asset</th><th>Type</th><th>Issue</th><th>Start</th><th>Cost</th><th>Status</th></tr></thead><tbody>${(data||[]).map(r=>`<tr><td>${esc(r.unit?.asset_tag)}</td><td>${esc(r.maintenance_type)}</td><td>${esc(r.issue_description)}</td><td>${esc(r.start_date)}</td><td>₱${Number(r.maintenance_cost).toLocaleString()}</td><td>${badge(r.maintenance_status)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No maintenance records.</td></tr>'}</tbody></table></div>`}
async function maintenanceForm(){const {data:units}=await sb.from('equipment_units').select('unit_id,asset_tag').order('asset_tag');$('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">New Maintenance Record</h3><form class="form" id="mForm"><div class="field"><label>Equipment unit</label><select id="mu">${(units||[]).map(u=>`<option value="${u.unit_id}">${esc(u.asset_tag)}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>Type</label><select id="mt"><option>Preventive</option><option>Repair</option><option>Inspection</option><option>Cleaning</option></select></div><div class="field"><label>Start date</label><input id="ms" type="date" required value="${today()}"></div></div><div class="field"><label>Issue</label><textarea id="mi" rows="3" required></textarea></div><div class="grid2"><div class="field"><label>Action taken</label><input id="ma"></div><div class="field"><label>Cost</label><input id="mc" type="number" step="0.01" min="0"></div></div><div class="actions"><button class="btn primary">Save Record</button></div></form></div>`;$('#mForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.from('maintenance_records').insert({unit_id:+$('#mu').value,reported_by:profile.user_id,maintenance_type:$('#mt').value,start_date:$('#ms').value,issue_description:$('#mi').value,action_taken:$('#ma').value,maintenance_cost:+($('#mc').value||0)});if(error)return toast(error.message,true);await sb.from('equipment_units').update({availability_status:'Maintenance'}).eq('unit_id',+$('#mu').value);toast('Maintenance record saved');loadPage('maintenance')}}

async function users(){
  if(!isAdmin())return loadPage('dashboard');
  const [{data,error},{data:roles},{data:deps}]=await Promise.all([sb.from('users').select('*,role:roles(role_name),department:departments(department_name)').order('user_id'),sb.from('roles').select('*').neq('role_name','Faculty').order('role_id'),sb.from('departments').select('*').order('department_name')]);if(error)throw error;
  $('#content').innerHTML=`<div class="toolbar"><input id="userSearch" class="search" placeholder="Search name, ID, email, department..."></div><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>ID</th><th>Email</th><th>Section / Year</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody id="userBody">${(data||[]).map(u=>`<tr data-search="${esc((u.first_name+' '+u.last_name+' '+u.employee_no+' '+u.email+' '+(u.department?.department_name||'')).toLowerCase())}"><td>${esc(u.first_name+' '+u.last_name)}</td><td>${esc(u.employee_no)}</td><td>${esc(u.email)}</td><td>${esc([u.course_program,u.year_level].filter(Boolean).join(' '))}</td><td><select onchange="changeUser(${u.user_id},'role_id',this.value)">${roles.map(r=>`<option value="${r.role_id}" ${r.role_id===u.role_id?'selected':''}>${esc(r.role_name)}</option>`).join('')}</select></td><td><select onchange="changeUser(${u.user_id},'user_status',this.value)">${['Active','Inactive','Suspended'].map(s=>`<option ${s===u.user_status?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn" onclick="editUser(${u.user_id})">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
  $('#userSearch').oninput=e=>$$('#userBody tr').forEach(r=>r.style.display=r.dataset.search.includes(e.target.value.toLowerCase())?'':'none');
  window.__roles=roles;window.__deps=deps;
}
async function changeUser(id,field,value){const patch={};patch[field]=field==='role_id'?+value:value;const {error}=await sb.from('users').update(patch).eq('user_id',id);if(error)return toast(error.message,true);toast('User updated')}
async function editUser(id){const {data:u}=await sb.from('users').select('*').eq('user_id',id).single();if(!u)return;const deps=window.__deps||[];$('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">Edit User</h3><form class="form" id="uForm"><div class="grid2"><div class="field"><label>First name</label><input id="uf" value="${esc(u.first_name)}" required></div><div class="field"><label>Last name</label><input id="ul" value="${esc(u.last_name)}" required></div></div><div class="grid2"><div class="field"><label>Student/Employee ID</label><input id="uidno" value="${esc(u.employee_no)}" required></div><div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div></div><div class="field"><label>Section / Year</label><input id="uc" value="${esc([u.course_program,u.year_level].filter(Boolean).join(' '))}" placeholder="e.g. IT1A"></div><div class="actions"><button type="button" class="btn" onclick="loadPage('users')">Cancel</button><button class="btn primary">Save Changes</button></div></form></div>`;$('#uForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.from('users').update({first_name:$('#uf').value,last_name:$('#ul').value,employee_no:$('#uidno').value,course_program:$('#uc').value.trim()||null,year_level:null,department_id:u.department_id}).eq('user_id',id);if(error)return toast(error.message,true);toast('User profile updated');loadPage('users')}}

async function reports(){const [{data:inv},{data:borrowings}]=await Promise.all([sb.from('v_equipment_inventory').select('*'),sb.from('borrowings').select('status,expected_return_date')]);const counts={};(inv||[]).forEach(x=>counts[x.category_name]=(counts[x.category_name]||0)+1);const value=(inv||[]).reduce((s,x)=>s+Number(x.replacement_cost||0),0);const overdue=(borrowings||[]).filter(isOverdue).length;$('#content').innerHTML=`<div class="cards"><div class="card stat"><div class="label">Inventory Value</div><div class="num">₱${value.toLocaleString()}</div></div><div class="card stat"><div class="label">Equipment Units</div><div class="num">${inv?.length||0}</div></div><div class="card stat"><div class="label">Borrowing Records</div><div class="num">${borrowings?.length||0}</div></div><div class="card stat"><div class="label">Overdue</div><div class="num">${overdue}</div></div></div><div class="chart-grid"><div class="card"><h3 class="section-title">Units by Category</h3><div class="chart-box"><canvas id="reportCategory"></canvas></div></div><div class="card"><h3 class="section-title">Borrowing Status</h3><div class="chart-box"><canvas id="reportStatus"></canvas></div></div></div>`;const bs={};(borrowings||[]).forEach(x=>{const k=effectiveStatus(x);bs[k]=(bs[k]||0)+1});charts.push(new Chart($('#reportCategory'),{type:'bar',data:{labels:Object.keys(counts),datasets:[{label:'Units',data:Object.values(counts)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}));charts.push(new Chart($('#reportStatus'),{type:'doughnut',data:{labels:Object.keys(bs),datasets:[{data:Object.values(bs)}]},options:{responsive:true,maintainAspectRatio:false}}))}

async function profilePage(){const {data:deps}=await sb.from('departments').select('*').order('department_name');$('#content').innerHTML=`<div class="card"><h3 class="section-title">My Profile</h3><div class="profile-grid"><div class="profile-item"><span>Name</span>${esc(profile.first_name+' '+profile.last_name)}</div><div class="profile-item"><span>Student / Employee ID</span>${esc(profile.employee_no)}</div><div class="profile-item"><span>Email</span>${esc(profile.email)}</div><div class="profile-item"><span>Section / Year</span>${esc([profile.course_program,profile.year_level].filter(Boolean).join(' '))}</div><div class="profile-item"><span>Role</span>${badge(role())}</div><div class="profile-item"><span>Account status</span>${badge(profile.user_status)}</div><div class="profile-item"><span>Maximum borrowing period</span>${MAX_BORROW_DAYS} days</div></div></div>`}

async function updateNotifications(){
  if(!profile)return;
  const {data:borrowings}=await sb.from('borrowings').select('borrowing_id,status,expected_return_date,purpose,borrower_id').eq('borrower_id',profile.user_id).order('borrowing_id',{ascending:false}).limit(30);
  const notices=[];for(const r of borrowings||[]){if(isOverdue(r))notices.push({title:`Borrowing #${r.borrowing_id} is overdue`,text:`Return was due ${r.expected_return_date}.`,date:r.expected_return_date,type:'bad'});else if(r.status==='Approved'||r.status==='Active')notices.push({title:`Borrowing #${r.borrowing_id} is ${r.status.toLowerCase()}`,text:r.purpose||'Equipment borrowing',date:r.expected_return_date,type:'warn'})}
  if(isStaff()){const {data:pending}=await sb.from('borrowings').select('borrowing_id,purpose').eq('status','Pending').order('borrowing_id',{ascending:false}).limit(10);(pending||[]).forEach(r=>notices.push({title:`New borrowing request #${r.borrowing_id}`,text:r.purpose||'Needs review',type:'warn'}))}
  $('#notificationCount').textContent=notices.length;$('#notificationCount').style.display=notices.length?'block':'none';$('#notificationPanel').innerHTML=notices.length?notices.slice(0,12).map(n=>`<div class="notice"><b>${esc(n.title)}</b><br><small>${esc(n.text)}${n.date?' · '+esc(n.date):''}</small></div>`).join(''):'<div class="notice">No new notifications.</div>';
}

async function markOverdue(){/* Display-level overdue detection keeps the site current without a cron job. */}
start();
