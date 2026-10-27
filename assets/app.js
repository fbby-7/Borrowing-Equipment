/* Fullbright College Equipment Borrowing System */
const SUPABASE_URL = 'https://uaxfzmtpjcfwfoqhgfih.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_hsippBvYrIczvzTtI8cR2A_dV6eqcUj';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const MAX_BORROW_DAYS = 7;
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
let me=null, profile=null, charts=[], activePage="dashboard", pageLoadToken=0;

function toast(msg,bad=false){const t=$('#toast');t.textContent=msg;t.style.background=bad?'#7f1d1d':'#10212d';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)}
function ensureAppDialogStyles(){if(document.getElementById('app-dialog-styles'))return;const st=document.createElement('style');st.id='app-dialog-styles';st.textContent=`.app-dialog-backdrop{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(2,6,15,.76);backdrop-filter:blur(7px)}.app-dialog-card{width:min(100%,540px);max-height:min(86vh,760px);overflow:auto;background:#111827;color:#edf4ff;border:1px solid #29384c;border-radius:22px;box-shadow:0 28px 90px #0009;padding:28px}.app-dialog-kicker{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#60a5fa;margin-bottom:10px}.app-dialog-title{font-size:26px;line-height:1.2;font-weight:800;margin:0 42px 10px 0}.app-dialog-message{color:#a9b8cb;white-space:pre-wrap;line-height:1.55;margin:0 0 20px}.app-dialog-input{box-sizing:border-box;width:100%;min-height:48px;background:#0b1220;border:1px solid #304158;border-radius:12px;padding:12px 14px;color:#edf4ff;font:inherit;outline:none}.app-dialog-input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #3b82f633}.app-dialog-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px;flex-wrap:wrap}.app-dialog-btn{border:1px solid #33475f;border-radius:12px;padding:11px 17px;font:inherit;font-weight:750;cursor:pointer;color:#eaf2ff;background:#182638}.app-dialog-btn.primary{background:#2563eb;border-color:#3b82f6}.app-dialog-btn.danger{background:#7f1d1d;border-color:#b91c1c}@media(max-width:520px){.app-dialog-card{padding:22px;border-radius:18px}.app-dialog-title{font-size:23px}}.app-dialog-multi-card{width:min(100%,640px)}.app-dialog-multi-card .app-dialog-options input[type="checkbox"]{width:18px!important;min-width:18px!important;max-width:18px!important;height:18px!important;min-height:18px!important;padding:0!important;margin:2px 0 0!important;flex:none!important;align-self:start!important}.app-dialog-multi-card .app-dialog-unit-option:focus-within{outline:2px solid #60a5fa;outline-offset:2px}@media(max-width:520px){.app-dialog-multi-card{padding:20px}.app-dialog-multi-card .app-dialog-unit-option{padding:12px!important}}`;document.head.appendChild(st)}
function appDialog({title='Please confirm',message='',value='',placeholder='',inputType='text',confirmText='Continue',cancelText='Cancel',showInput=true,danger=false,required=false}={}){ensureAppDialogStyles();return new Promise(resolve=>{const backdrop=document.createElement('div');backdrop.className='app-dialog-backdrop';backdrop.innerHTML=`<section class="app-dialog-card" role="dialog" aria-modal="true"><div class="app-dialog-kicker">Fullbright College · Equipment Borrowing</div><h2 class="app-dialog-title"></h2><p class="app-dialog-message"></p>${showInput?`<input class="app-dialog-input" type="${inputType}" />`:''}<div class="app-dialog-actions"><button type="button" class="app-dialog-btn cancel"></button><button type="button" class="app-dialog-btn ${danger?'danger':'primary'} confirm"></button></div></section>`;const card=backdrop.querySelector('.app-dialog-card');card.querySelector('.app-dialog-title').textContent=title;card.querySelector('.app-dialog-message').textContent=message;card.querySelector('.cancel').textContent=cancelText;card.querySelector('.confirm').textContent=confirmText;const input=card.querySelector('input');if(input){input.value=value;input.placeholder=placeholder;input.required=required}const finish=result=>{document.removeEventListener('keydown',keyHandler);backdrop.remove();resolve(result)};const keyHandler=e=>{if(e.key==='Escape')finish(null);if(e.key==='Enter'&&input)finish(input.value)};card.querySelector('.cancel').addEventListener('click',()=>finish(null));card.querySelector('.confirm').addEventListener('click',()=>{if(input&&required&&!input.value.trim()){input.focus();input.setCustomValidity('Please fill out this field.');input.reportValidity();input.setCustomValidity('');return}finish(input?input.value:true)});backdrop.addEventListener('click',e=>{if(e.target===backdrop)finish(null)});document.addEventListener('keydown',keyHandler);document.body.appendChild(backdrop);if(input){input.focus();input.select()}})}
function appPrompt(message,defaultValue=''){return appDialog({title:'Enter details',message,value:defaultValue,confirmText:'Save',showInput:true})}
function appConfirm(message){return appDialog({title:'Are you sure?',message,showInput:false,confirmText:'Confirm',danger:true})}
function appAlert(message,title='Notice'){return appDialog({title,message,showInput:false,confirmText:'OK',cancelText:'Close'})}

function appChoicePrompt(message,options,defaultValue=''){
  ensureAppDialogStyles();
  return new Promise(resolve=>{
    const backdrop=document.createElement('div');backdrop.className='app-dialog-backdrop';
    backdrop.innerHTML=`<section class="app-dialog-card" role="dialog" aria-modal="true"><div class="app-dialog-kicker">Fullbright College · Equipment Borrowing</div><h2 class="app-dialog-title">Choose an option</h2><p class="app-dialog-message"></p><div class="app-dialog-options"></div><div class="app-dialog-actions"><button type="button" class="app-dialog-btn cancel">Cancel</button><button type="button" class="app-dialog-btn primary confirm">Save selection</button></div></section>`;
    const card=backdrop.querySelector('.app-dialog-card');card.querySelector('.app-dialog-message').textContent=message;
    const group=document.createElement('div');group.className='app-dialog-choice-list';group.style.cssText='display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:stretch;width:100%;margin-top:18px';
    if(!document.getElementById('app-choice-responsive-style')){const responsive=document.createElement('style');responsive.id='app-choice-responsive-style';responsive.textContent='@media(max-width:560px){.app-dialog-choice-list{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}.app-dialog-choice-list label{padding:10px!important;font-size:14px!important;min-height:52px!important}}';document.head.appendChild(responsive);}
    options.forEach((option,i)=>{const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;justify-content:center;gap:9px;min-width:0;min-height:58px;padding:12px 14px;border:1px solid #304158;border-radius:14px;background:#0b1220;cursor:pointer;font-weight:650;font-size:15px;line-height:1.35;text-align:center;transition:border-color .15s,background .15s;box-sizing:border-box';const radio=document.createElement('input');radio.type='radio';radio.name='app-choice';radio.value=option;radio.checked=option===defaultValue||(!defaultValue&&i===0);radio.style.cssText='accent-color:#3b82f6;flex:0 0 auto;margin:0;width:16px;height:16px';label.append(radio,document.createTextNode(option));label.addEventListener('mouseenter',()=>{if(!radio.checked)label.style.borderColor='#5276a2'});label.addEventListener('mouseleave',()=>{if(!radio.checked)label.style.borderColor='#304158'});radio.addEventListener('change',()=>{group.querySelectorAll('label').forEach(el=>{el.style.borderColor='#304158';el.style.background='#0b1220'});label.style.borderColor='#3b82f6';label.style.background='#101d32'});if(radio.checked){label.style.borderColor='#3b82f6';label.style.background='#101d32'}group.appendChild(label)});
    card.querySelector('.app-dialog-options').replaceWith(group);
    const finish=value=>{document.removeEventListener('keydown',keyHandler);backdrop.remove();resolve(value)};
    const keyHandler=e=>{if(e.key==='Escape')finish(null);if(e.key==='Enter')finish(group.querySelector('input:checked')?.value??null)};
    card.querySelector('.cancel').onclick=()=>finish(null);card.querySelector('.confirm').onclick=()=>finish(group.querySelector('input:checked')?.value??null);
    backdrop.addEventListener('click',e=>{if(e.target===backdrop)finish(null)});document.addEventListener('keydown',keyHandler);document.body.appendChild(backdrop);
  });
}
function appMultiChoicePrompt(message,options,selectedValues=[]){
  ensureAppDialogStyles();
  return new Promise(resolve=>{
    const backdrop=document.createElement('div');backdrop.className='app-dialog-backdrop';
    backdrop.innerHTML=`<section class="app-dialog-card app-dialog-multi-card" role="dialog" aria-modal="true" aria-labelledby="app-dialog-multi-title"><div class="app-dialog-kicker">Fullbright College · Equipment Borrowing</div><h2 id="app-dialog-multi-title" class="app-dialog-title">Select equipment</h2><p class="app-dialog-message"></p><div class="app-dialog-options"></div><div class="app-dialog-actions"><button type="button" class="app-dialog-btn cancel">Cancel</button><button type="button" class="app-dialog-btn primary confirm">Continue</button></div></section>`;
    const card=backdrop.querySelector('.app-dialog-card');card.querySelector('.app-dialog-message').textContent=message;
    const list=card.querySelector('.app-dialog-options');
    list.style.cssText='display:grid;grid-template-columns:minmax(0,1fr);gap:10px;max-height:42vh;overflow:auto;padding:2px 4px 2px 2px;min-width:0';
    options.forEach((rawOption,i)=>{
      const option=typeof rawOption==='string'?{label:rawOption}:rawOption;
      const label=document.createElement('label');label.className='app-dialog-unit-option';
      label.style.cssText='box-sizing:border-box;display:grid;grid-template-columns:20px 76px minmax(0,1fr);align-items:center;gap:14px;width:100%;min-width:0;padding:12px 14px;border:1px solid #304158;border-radius:13px;background:#0b1220;cursor:pointer;line-height:1.45;color:#edf4ff;overflow-wrap:anywhere;transition:border-color .15s,background .15s';
      const check=document.createElement('input');check.type='checkbox';check.value=String(i);check.checked=selectedValues.includes(i);check.setAttribute('aria-label',`Select ${option.label}`);
      check.style.cssText='appearance:auto;-webkit-appearance:checkbox;box-sizing:border-box;display:block;width:18px!important;min-width:18px!important;max-width:18px!important;height:18px!important;min-height:18px!important;margin:0!important;padding:0!important;flex:none;justify-self:center;accent-color:#3b82f6;cursor:pointer';
      const image=document.createElement('img');image.className='app-dialog-equipment-thumb';image.src=option.image||'/assets/equipment-generic.svg';image.alt='';image.loading='lazy';
      image.style.cssText='display:block;width:76px;height:64px;object-fit:contain;border-radius:9px;background:#111c2d;border:1px solid #26384f;padding:4px;box-sizing:border-box';
      image.onerror=()=>{image.onerror=null;image.src='/assets/equipment-generic.svg'};
      const text=document.createElement('span');text.textContent=option.label;text.style.cssText='display:block;min-width:0;width:auto;max-width:100%;white-space:normal;overflow-wrap:anywhere;word-break:normal;font-size:14px;font-weight:600';
      const sync=()=>{label.style.borderColor=check.checked?'#3b82f6':'#304158';label.style.background=check.checked?'#12213a':'#0b1220';label.style.boxShadow=check.checked?'inset 0 0 0 1px #3b82f633':'none'};
      check.addEventListener('change',sync);label.append(check,image,text);list.appendChild(label);sync();
    });
    const finish=value=>{document.removeEventListener('keydown',keyHandler);backdrop.remove();resolve(value)};
    const keyHandler=e=>{if(e.key==='Escape')finish(null);if(e.key==='Enter'&&!['BUTTON','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();const values=[...list.querySelectorAll('input[type="checkbox"]:checked')].map(x=>Number(x.value));if(values.length)finish(values)}};
    card.querySelector('.cancel').onclick=()=>finish(null);card.querySelector('.confirm').onclick=()=>{const values=[...list.querySelectorAll('input[type="checkbox"]:checked')].map(x=>Number(x.value));if(!values.length){toast('Select at least one equipment unit.',true);return}finish(values)};
    backdrop.addEventListener('click',e=>{if(e.target===backdrop)finish(null)});document.addEventListener('keydown',keyHandler);document.body.appendChild(backdrop);
  });
}

function esc(x){return String(x??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function formatLocalDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function today(){return formatLocalDate(new Date())}
function addDays(date,days){const d=new Date(date+'T00:00:00');d.setDate(d.getDate()+days);return formatLocalDate(d)}
function badge(x){const v=String(x||'');const c=['Available','Active','Completed','Excellent','Good'].includes(v)?'good':['Maintenance','Pending','Fair','Partially Returned','In Progress','Approved'].includes(v)?'warn':['Damaged','Lost','Overdue','Rejected','Cancelled','For Repair','Suspended'].includes(v)?'bad':'';return `<span class="badge ${c}">${esc(v)}</span>`}
function role(){return profile?.role?.role_name||'Student'}
function isAdmin(){return role()==='Administrator'}
function isStaff(){return ['Administrator','Equipment Officer'].includes(role())}
function canBorrow(){return ['Administrator','Equipment Officer','Student'].includes(role())}
function isOverdue(r){return ['Pending','Approved','Active','Partially Returned'].includes(r.status)&&r.expected_return_date<today()}
function effectiveStatus(r){return isOverdue(r)?'Overdue':r.status}
function daysOverdue(r){if(!isOverdue(r))return 0;return Math.max(1,Math.floor((new Date(today()+'T00:00:00')-new Date(r.expected_return_date+'T00:00:00'))/86400000))}
function dueLabel(r){if(isOverdue(r))return `${daysOverdue(r)} day${daysOverdue(r)===1?'':'s'} overdue`;const n=Math.round((new Date(r.expected_return_date+'T00:00:00')-new Date(today()+'T00:00:00'))/86400000);return n===0?'Due today':n===1?'Due tomorrow':`Due in ${n} days`}
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
  refreshDueNotifications().finally(updateNotifications); loadPage('dashboard');
}
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#loginForm').classList.toggle('hidden',b.dataset.tab!=='login');$('#signupForm').classList.toggle('hidden',b.dataset.tab!=='signup')});
$('#loginForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});if(error)return toast(error.message,true);await start()};
$('#studentId').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10)});
function validStudentId(value){return /^240101\d{4}$/.test(String(value||'').trim())}
$('#signupForm').onsubmit=async e=>{
  e.preventDefault();
  const studentId=$('#studentId').value.trim();
  if(!validStudentId(studentId))return toast('Enter a valid Student ID starting with 240101, such as 2401010000 or 2401010001.',true);
  const meta={first_name:$('#firstName').value.trim(),last_name:$('#lastName').value.trim(),employee_no:studentId,course_program:$('#signupCourse').value.trim(),year_level:null};
  const {data,error}=await sb.auth.signUp({email:$('#signupEmail').value.trim(),password:$('#signupPassword').value,options:{data:meta}});
  if(error)return toast(error.message,true);
  if(!data.session){toast('Account created. If email confirmation is enabled, confirm your email first.');return}
  toast('Account created successfully!');await start();
setInterval(()=>{if(profile){refreshDueNotifications().finally(updateNotifications)}},5*60*1000);
};

async function sendPasswordReset(source = 'profile') {
  let email = '';

  if (source === 'login') {
    email = document.getElementById('loginEmail')?.value.trim() || '';

    if (!email) {
      return toast('Enter your account email first.', true);
    }
  } else {
    const { data: { user }, error } = await sb.auth.getUser();

    if (error || !user?.email) {
      return toast('Please sign in again and retry.', true);
    }

    email = user.email;
  }

  const redirectTo =
    `${window.location.origin}/reset-password.html`;

  const { error } = await sb.auth.resetPasswordForEmail(
    email,
    { redirectTo }
  );

  if (error) {
    return toast(error.message, true);
  }

  toast('If an account exists for this email, password reset instructions will be sent. Check your inbox.');
}
function showPasswordRecoveryForm(){
  let backdrop=document.getElementById('passwordRecoveryBackdrop');
  if(!backdrop){
    backdrop=document.createElement('div');
    backdrop.id='passwordRecoveryBackdrop';
    backdrop.className='password-recovery-backdrop';
    backdrop.innerHTML=`<section id="passwordRecoveryBox" class="card password-recovery-box" role="dialog" aria-modal="true" aria-labelledby="passwordRecoveryTitle"><h3 id="passwordRecoveryTitle" class="section-title">Set a new password</h3><form id="passwordRecoveryForm" class="form"><div class="field"><label for="recoveryPassword">New password</label><div class="password-input-wrap"><input id="recoveryPassword" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters"><button type="button" class="password-toggle" data-target="recoveryPassword" aria-label="Show new password">Show</button></div></div><div class="field"><label for="recoveryPasswordConfirm">Confirm new password</label><div class="password-input-wrap"><input id="recoveryPasswordConfirm" type="password" minlength="8" required autocomplete="new-password" placeholder="Re-enter new password"><button type="button" class="password-toggle" data-target="recoveryPasswordConfirm" aria-label="Show password confirmation">Show</button></div></div><p class="muted password-help">Use at least 8 characters. Both password fields must match.</p><div class="actions"><button class="btn primary" type="submit">Update Password</button></div></form></section>`;
    document.body.appendChild(backdrop);
    backdrop.querySelectorAll('.password-toggle').forEach(toggle=>toggle.addEventListener('click',()=>{const input=document.getElementById(toggle.dataset.target);const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'Hide':'Show';toggle.setAttribute('aria-label',show?'Hide password':'Show password');input.focus()}));
    backdrop.querySelector('#passwordRecoveryForm').onsubmit=async e=>{
      e.preventDefault();
      const p=backdrop.querySelector('#recoveryPassword').value;
      const confirm=backdrop.querySelector('#recoveryPasswordConfirm').value;
      if(p.length<8)return toast('Your password must contain at least 8 characters.',true);
      if(p!==confirm)return toast('Passwords do not match.',true);
      const btn=backdrop.querySelector('button[type=submit]');btn.disabled=true;btn.textContent='Updating…';
      const {error}=await sb.auth.updateUser({password:p});
      btn.disabled=false;btn.textContent='Update Password';
      if(error)return toast(error.message,true);
      backdrop.remove();history.replaceState({},document.title,window.location.pathname);
      toast('Password updated successfully. Please sign in with your new password.');
      await sb.auth.signOut();showAuth();
    };
  }
  const first=backdrop.querySelector('#recoveryPassword');
  if(first) setTimeout(()=>first.focus(),50);
}
$('#logout').onclick=async()=>{await sb.auth.signOut();me=null;profile=null;showAuth()};
$$('.nav').forEach(b=>b.onclick=()=>{$$('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#notificationPanel').classList.add('hidden');loadPage(b.dataset.page)});
$('#notificationBtn').onclick=()=>{const panel=$('#notificationPanel');panel.classList.toggle('hidden');$('#notificationBtn').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')))};
sb.auth.onAuthStateChange(async(event)=>{if(event==='PASSWORD_RECOVERY'){if(!window.location.pathname.endsWith('/reset-password.html'))window.location.replace(`${window.location.origin}/reset-password.html`);return}if(me===null)await start()});
async function start(){try{await getProfile();if(profile)showApp();else showAuth()}catch(e){showAuth();toast(e.message,true)}}

async function loadPage(page){
  activePage=page;
  const token=++pageLoadToken;
  destroyCharts();
  $('#pageTitle').textContent=page==='profile'?'My Profile':page[0].toUpperCase()+page.slice(1);
  // Give immediate feedback and ignore stale responses if the user switches pages quickly.
  $('#content').innerHTML='<div class="page-loading"><span class="loading-spinner" aria-hidden="true"></span><span>Loading…</span></div>';
  try{
    if(page==='dashboard')return await dashboard(token);
    if(page==='equipment')return await equipment(token);
    if(page==='borrow')return await borrow(token);
    if(page==='transactions')return await transactions(token);
    if(page==='overdue')return await overduePage(token);
    if(page==='maintenance')return await maintenance(token);
    if(page==='users')return await users(token);
    if(page==='reports')return await reports(token);
    if(page==='profile')return await profilePage(token);
  } catch(e){
    if(token===pageLoadToken)$('#content').innerHTML=`<div class="card"><b>Error loading ${esc(page)}:</b> ${esc(e.message)} <button class="btn" onclick="loadPage('${esc(page)}')">Retry</button></div>`;
  }
}

async function dashboard(token){
  const [{count:units},{count:available},{count:borrowed},{count:maint},{count:damaged},{count:lost},{count:usersCount},{data:recent},{data:allBorrowings},{data:inv}]=await Promise.all([
    sb.from('equipment_units').select('*',{count:'exact',head:true}),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('availability_status','Available'),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('availability_status','Borrowed'),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('availability_status','Maintenance'),sb.from('equipment_units').select('*',{count:'exact',head:true}).eq('condition_status','Damaged'),sb.from('borrowing_items').select('*',{count:'exact',head:true}).eq('item_status','Lost'),
    isStaff()?sb.from('users').select('*',{count:'exact',head:true}):Promise.resolve({count:null}),
    (()=>{let q=sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name)').order('borrowing_id',{ascending:false}).limit(6);if(!isStaff())q=q.eq('borrower_id',profile.user_id);return q})(),
    isStaff()?sb.from('borrowings').select('borrowing_id,status,expected_return_date,borrower_id').limit(2000):sb.from('borrowings').select('borrowing_id,status,expected_return_date,borrower_id').eq('borrower_id',profile.user_id).limit(500),
    sb.from('v_equipment_inventory').select('*')
  ]);
  if(token!==pageLoadToken||activePage!=='dashboard')return;
  const overdue=(allBorrowings||[]).filter(isOverdue).length;
  const dueSoon=(allBorrowings||[]).filter(r=>!isOverdue(r)&&['Approved','Active','Partially Returned'].includes(r.status)&&r.expected_return_date>=today()&&r.expected_return_date<=addDays(today(),2)).length;
  const cat={};(inv||[]).forEach(x=>cat[x.category_name]=(cat[x.category_name]||0)+1);
  $('#content').innerHTML=`<div class="cards"><div class="card stat"><div class="label">Total Units</div><div class="num">${units??0}</div></div><div class="card stat"><div class="label">Available</div><div class="num">${available??0}</div></div><div class="card stat"><div class="label">Borrowed</div><div class="num">${borrowed??0}</div></div><div class="card stat"><div class="label">Overdue</div><div class="num">${overdue}</div></div><div class="card stat"><div class="label">Due in 2 Days</div><div class="num">${dueSoon}</div></div><div class="card stat"><div class="label">Damaged Units</div><div class="num">${damaged??0}</div></div><div class="card stat"><div class="label">Lost Items</div><div class="num">${lost??0}</div></div></div>
  <div class="chart-grid"><div class="card"><h3 class="section-title">Inventory by Category</h3><div class="chart-box"><canvas id="categoryChart"></canvas></div></div><div class="card"><h3 class="section-title">Current Equipment Status</h3><div class="chart-box"><canvas id="statusChart"></canvas></div></div></div>
  <div class="card" style="margin-top:14px"><h3 class="section-title">Recent Borrowing Activity</h3><div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Borrower</th><th>Purpose</th><th>Due</th><th>Status</th></tr></thead><tbody>${(recent||[]).map(r=>`<tr class="${isOverdue(r)?'overdue-row':''}"><td>#${r.borrowing_id}</td><td>${esc(r.borrower?.first_name+' '+r.borrower?.last_name||'')}</td><td>${esc(r.purpose)}</td><td><b>${esc(r.expected_return_date)}</b><br><small>${esc(dueLabel(r))}</small></td><td>${badge(effectiveStatus(r))}</td></tr>`).join('')||'<tr><td colspan="5" class="empty">No transactions yet.</td></tr>'}</tbody></table></div></div>`;
  const statusCounts={Available:available||0,Borrowed:borrowed||0,Maintenance:maint||0};
  charts.push(new Chart($('#categoryChart'),{type:'bar',data:{labels:Object.keys(cat),datasets:[{label:'Units',data:Object.values(cat),borderRadius:5,maxBarThickness:24}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.parsed.x} units`}}},scales:{x:{beginAtZero:true,ticks:{precision:0}},y:{ticks:{autoSkip:false}}}}}));
  charts.push(new Chart($('#statusChart'),{type:'doughnut',data:{labels:Object.keys(statusCounts),datasets:[{data:Object.values(statusCounts)}]},options:{responsive:true,maintainAspectRatio:false}}));
}

async function equipment(token){
  const {data,error}=await sb.from('v_equipment_inventory').select('*').order('asset_tag');if(token!==pageLoadToken||activePage!=='equipment')return;if(error)throw error;
  const groups={};(data||[]).forEach(r=>{const k=r.equipment_id;groups[k]??={...r,total:0,available:0};groups[k].total++;if(r.availability_status==='Available')groups[k].available++});
  const cats=[...new Set((data||[]).map(r=>r.category_name).filter(Boolean))].sort();
  const statuses=['Available','Borrowed','Reserved','Maintenance','Retired'];
  $('#content').innerHTML=`<div class="toolbar"><input id="eqSearch" class="search" placeholder="Search equipment, category, asset tag, serial number..."><select id="eqCategory" aria-label="Filter category"><option value="">All categories</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select id="eqStatus" aria-label="Filter availability"><option value="">All statuses</option>${statuses.map(c=>`<option>${c}</option>`).join('')}</select><button class="btn primary" ${isStaff()?'':'style="display:none"'} onclick="equipmentForm()">+ Add Equipment</button></div><div class="cards inventory-summary"><div class="card stat"><div class="label">Total units</div><div class="num">${(data||[]).length}</div></div><div class="card stat"><div class="label">Available</div><div class="num">${(data||[]).filter(x=>x.availability_status==='Available').length}</div></div><div class="card stat"><div class="label">Borrowed / reserved</div><div class="num">${(data||[]).filter(x=>['Borrowed','Reserved'].includes(x.availability_status)).length}</div></div><div class="card stat"><div class="label">Damaged / repair</div><div class="num">${(data||[]).filter(x=>['Damaged','For Repair'].includes(x.condition_status)||x.availability_status==='Maintenance').length}</div></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Equipment ID</th><th>Equipment</th><th>Category</th><th>Replacement Cost / Unit</th><th>Quantity</th><th>Available</th><th>Stock Alert</th><th>Condition</th><th>Status</th><th>Actions</th></tr></thead><tbody id="eqBody">${Object.values(groups).map(r=>`<tr data-search="${esc((r.equipment_id+' '+r.equipment_name+' '+(r.brand||'')+' '+(r.model||'')+' '+r.category_name+' '+(r.asset_tag||'')+' '+(r.serial_number||'')).toLowerCase())}" data-category="${esc(r.category_name||'')}" data-status="${esc(r.availability_status||'')}"><td><b>EQ-${String(r.equipment_id).padStart(4,'0')}</b></td><td>${esc(r.equipment_name)}<br><small>${esc(r.brand||'')} ${esc(r.model||'')}</small></td><td>${esc(r.category_name)}</td><td><b>${Number(r.replacement_cost||0)>0?`₱${Number(r.replacement_cost).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"Not set"}</b></td><td>${r.total}</td><td>${r.available}</td><td>${isStaff()&&r.available<=1?`<span class="badge warn">Low stock</span>`:`<span class="muted">—</span>`}</td><td>${badge(r.condition_status)}</td><td>${badge(r.availability_status)}</td><td>${isAdmin()?`<button class="btn small" onclick="addEquipmentQuantity(${r.equipment_id})">+ Add Qty</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="10" class="empty">No equipment found.</td></tr>'}</tbody></table></div>`;
  const filterInventory=()=>$$('#eqBody tr').forEach(r=>{const term=$('#eqSearch').value.toLowerCase(),cat=$('#eqCategory').value,status=$('#eqStatus').value;r.style.display=r.dataset.search.includes(term)&&(!cat||r.dataset.category===cat)&&(!status||r.dataset.status===status)?'':'none'});
  $('#eqSearch').oninput=filterInventory;$('#eqCategory').onchange=filterInventory;$('#eqStatus').onchange=filterInventory;
}
async function equipmentForm(){
  const {data:cats}=await sb.from('equipment_categories').select('*').order('category_name');
  $('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">Add Equipment</h3><form class="form" id="eqForm"><div class="grid2"><div class="field"><label>Equipment name</label><input id="en" required placeholder="Laptop"></div><div class="field"><label>Category</label><select id="ec">${(cats||[]).map(c=>`<option value="${c.category_id}">${esc(c.category_name)}</option>`).join('')}</select></div></div><div class="grid2"><div class="field"><label>Brand</label><input id="eb"></div><div class="field"><label>Model</label><input id="em"></div></div><div class="field"><label>Quantity</label><input id="eqty" type="number" min="1" value="1" required></div><div class="grid2"><div class="field"><label>Condition</label><select id="econd"><option>Excellent</option><option selected>Good</option><option>Fair</option><option>Damaged</option><option>For Repair</option></select></div><div class="field"><label>Replacement cost per unit</label><input id="cost" type="number" min="0" step="0.01" value="0"></div></div><div class="actions"><button type="button" class="btn" onclick="loadPage('equipment')">Cancel</button><button class="btn primary">Save Equipment</button></div></form></div>`;
  $('#eqForm').onsubmit=async e=>{e.preventDefault();const qty=Math.max(1,+$('#eqty').value||1);const r=await sb.from('equipment').insert({category_id:+$('#ec').value,equipment_name:$('#en').value.trim(),brand:$('#eb').value.trim()||null,model:$('#em').value.trim()||null,replacement_cost:+($('#cost').value||0)}).select().single();if(r.error)return toast(r.error.message,true);const rows=Array.from({length:qty},()=>({equipment_id:r.data.equipment_id,condition_status:$('#econd').value}));const u=await sb.from('equipment_units').insert(rows);if(u.error)return toast(u.error.message,true);toast(`Equipment added. ${qty} unit(s) received automatic IDs.`);loadPage('equipment')}
}


async function addEquipmentQuantity(equipmentId){
  if(!isAdmin())return toast('Only an Administrator can add equipment quantity.',true);
  const raw=await appPrompt('How many additional units do you want to add?','1');
  if(raw===null)return;
  const qty=Number.parseInt(raw,10);
  if(!Number.isInteger(qty)||qty<1||qty>500)return toast('Enter a whole number from 1 to 500.',true);
  const condition=await appChoicePrompt('Choose the condition for the new units.',['Excellent','Good','Fair','Damaged','For Repair'],'Good');
  if(condition===null)return;
  const allowed=['Excellent','Good','Fair','Damaged','For Repair'];
  if(!allowed.includes(condition.trim()))return toast('Please enter one of the listed condition values.',true);
  const rows=Array.from({length:qty},()=>({equipment_id:equipmentId,condition_status:condition.trim()}));
  const {error}=await sb.from('equipment_units').insert(rows);
  if(error)return toast(error.message,true);
  toast(`Added ${qty} unit(s).`);
  await loadPage('equipment');
}

function equipmentImage(unit){
  // Match the actual equipment name first. Never infer an item's image from its category,
  // because several unrelated items share categories such as Networking or Audio.
  const name=String(unit.equipment_name||'').toLowerCase().trim().replace(/[–—]/g,'-');
  const images=[
    [/^portable speaker\b|^speaker\b/,'Presentation_and_Audio/Portable_Speaker.png'],
    [/^wired microphone\b|^microphone\b/,'Presentation_and_Audio/Wired_Microphone.png'],
    [/^wireless microphone\b/,'Laptop_Presentation_Gear/Wireless_Microphone_Shure_BLX24.png'],
    [/^external hard drive\b|^external hard drive or ssd\b|^external hard drive\/ssd\b|^ssd\b/,'Computer_Accessories_and_Storage/External_Hard_Drive_or_SSD.png'],
    [/^usb hub\b/,'Computer_Accessories_and_Storage/USB_Hub.png'],
    [/^usb[- ]?c adapter\b/,'Computer_Accessories_and_Storage/USB-C_Adapter.png'],
    [/^hdmi adapter\b/,'Computer_Accessories_and_Storage/HDMI_Adapter.png'],
    [/^hdmi cable\b/,'Computer_Accessories_and_Storage/HDMI_Cable.png'],
    [/^laptop\b|^lenovo thinkpad\b|^notebook computer\b/,'Laptop_Presentation_Gear/Laptop_Lenovo_ThinkPad_E14.png'],
    [/^camera\b|^canon eos\b/,'Laptop_Presentation_Gear/Camera_Canon_EOS_250D.png'],
    [/^projector\b|^epson eb-x06\b/,'Laptop_Presentation_Gear/Projector_Epson_EB-X06.png'],
    [/^portable projection screen\b|^projection screen\b/,'Presentation_and_Audio/Portable_Projection_Screen.png'],
    [/^network switch\b|^cisco cbs110\b/,'Networking/Network_Switch_Cisco_CBS110-8T-D.png'],
    [/^router\b/,'Networking/Router.png'],
    [/^wireless access point\b|^access point\b/,'Networking/Wireless_Access_Point.png'],
    [/^ethernet cables?\b|^ethernet cable\b|\bcat5e\b|\bcat6\b/,'Networking/Ethernet_Cables_Cat5e_Cat6.png'],
    [/^rj45 crimping tool\b/,'Networking/RJ45_Crimping_Tool.png'],
    [/^cable stripper and cutter\b|^cable stripper\b|^cable cutter\b/,'Networking/Cable_Stripper_and_Cutter.png'],
    [/^punch[- ]down tool\b/,'Networking/Punch-Down_Tool.png'],
    [/^network cable tester\b/,'Networking/Network_Cable_Tester.png'],
    [/^soldering station\b/,'Electronics_and_Soldering/Soldering_Station.png'],
    [/^soldering iron stand\b/,'Electronics_and_Soldering/Soldering_Iron_Stand.png'],
    [/^electronic component kit\b/,'Electronics_and_Soldering/Electronic_Component_Kit.png'],
    [/^heat gun\b/,'Electronics_and_Soldering/Heat_Gun.png'],
    [/^wire stripper\b/,'Electronics_and_Soldering/Wire_Stripper.png'],
    [/^bulletin board\b/,'Classroom_and_Office/Bulletin_Board.png'],
    [/^extension cord\b/,'Classroom_and_Office/Extension_Cord.png'],
    [/^folding table\b/,'Classroom_and_Office/Folding_Table.png'],
    [/^paper cutter\b/,'Classroom_and_Office/Paper_Cutter.png'],
    [/^portable chairs?\b/,'Classroom_and_Office/Portable_Chairs.png'],
    [/^stapler\b/,'Classroom_and_Office/Stapler.png'],
    [/^whiteboard\b/,'Classroom_and_Office/Whiteboard.png'],
    [/^clamps?\b/,'Hand_Tools_and_Workshop/Clamps.png'],
    [/^hand drill\b/,'Hand_Tools_and_Workshop/Hand_Drill.png'],
    [/^hot glue gun\b/,'Hand_Tools_and_Workshop/Hot_Glue_Gun.png'],
    [/^measuring tools?\b/,'Hand_Tools_and_Workshop/Measuring_Tools.png'],
    [/^pliers set\b/,'Hand_Tools_and_Workshop/Pliers_Set.png'],
    [/^precision screwdriver set\b/,'Hand_Tools_and_Workshop/Precision_Screwdriver_Set.png'],
    [/^screwdriver set\b/,'Hand_Tools_and_Workshop/Screwdriver_Set.png']
  ];
  const match=images.find(([pattern])=>pattern.test(name));
  if(match)return '/assets/equipment-images/'+match[1];
  return '/assets/equipment-generic.svg';
}
function showBorrowingTermsModal(){
  return new Promise(resolve=>{
    const existing=document.getElementById('borrowingTermsModal');
    if(existing)existing.remove();
    const modal=document.createElement('div');
    modal.id='borrowingTermsModal';
    modal.className='terms-modal-backdrop';
    modal.innerHTML=`<section class="terms-modal" role="dialog" aria-modal="true" aria-labelledby="borrowingTermsTitle">
      <button type="button" class="terms-modal-close" aria-label="Close terms">×</button>
      <span class="eyebrow">PLEASE REVIEW</span><h2 id="borrowingTermsTitle">Borrowing Terms and Conditions</h2>
      <p class="hint">Please read and agree before submitting your borrowing request.</p>
      <div class="terms-modal-body">
        <p><b>1. Responsible use.</b> Use equipment carefully and only for approved school purposes.</p>
        <p><b>2. Safekeeping.</b> Protect borrowed equipment from damage, loss, and misuse.</p>
        <p><b>3. Return on time.</b> Return all equipment by the selected expected return date.</p>
        <p><b>4. Late returns.</b> Late returns may be subject to penalties under official Fullbright College policies.</p>
        <p><b>5. Damage or loss.</b> Report damage, missing parts, or loss promptly to the Equipment Officer.</p>
        <p><b>6. Return condition.</b> Return equipment and accessories in the condition received, allowing for normal wear and tear.</p>
      </div>
      <label class="terms-agreement"><input type="checkbox" id="acceptBorrowingTerms"><span>I have read and agree to the Borrowing Terms and Conditions.</span></label>
      <div class="actions terms-modal-actions"><button type="button" class="btn" id="cancelBorrowingTerms">Cancel</button><button type="button" class="btn primary" id="agreeBorrowingTerms" disabled>Agree and Continue</button></div>
    </section>`;
    document.body.appendChild(modal);
    const finish=value=>{modal.remove();resolve(value)};
    const checkbox=modal.querySelector('#acceptBorrowingTerms');
    const agree=modal.querySelector('#agreeBorrowingTerms');
    checkbox.addEventListener('change',()=>agree.disabled=!checkbox.checked);
    agree.addEventListener('click',()=>{if(checkbox.checked)finish(true)});
    modal.querySelector('#cancelBorrowingTerms').addEventListener('click',()=>finish(false));
    modal.querySelector('.terms-modal-close').addEventListener('click',()=>finish(false));
    modal.addEventListener('click',e=>{if(e.target===modal)finish(false)});
    const onKey=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',onKey);finish(false)}};
    document.addEventListener('keydown',onKey);
    agree.focus();
  });
}

async function borrow(token){
  if(!canBorrow())return loadPage('dashboard');
  const {data:units,error}=await sb.from('v_equipment_inventory').select('*').eq('availability_status','Available').order('asset_tag');if(token!==pageLoadToken||activePage!=='borrow')return;if(error)throw error;
  const groupedUnits=Object.values((units||[]).reduce((groups,u)=>{const key=String(u.equipment_id);if(!groups[key])groups[key]={...u,units:[],available:0};groups[key].units.push(u);groups[key].available++;return groups},{}));
  const min=today(), max=addDays(min,MAX_BORROW_DAYS);
  $('#content').innerHTML=`<div class="borrow-page"><div class="borrow-intro"><div><span class="eyebrow">EQUIPMENT CATALOG</span><h3 class="section-title">Choose equipment to borrow</h3><p class="hint">Select the item cards you need. You can choose more than one available unit.</p></div><div class="borrow-rule"><span class="rule-icon">↗</span><div><b>${MAX_BORROW_DAYS}-day maximum</b><small>Return equipment by your selected due date.</small></div></div></div>
  <div class="equipment-picker-toolbar"><input id="borrowSearch" class="search" placeholder="Search equipment or asset ID..." aria-label="Search available equipment"><div class="selection-tools"><button type="button" class="btn" id="selectAllEquipment">Select all</button><button type="button" class="btn" id="clearAllEquipment">Clear all</button><div class="selected-count"><span id="selectedCount">0</span> units selected</div></div></div>
  ${groupedUnits.length?`<div class="equipment-picker-grid" id="equipmentPicker">${groupedUnits.map(g=>`<label class="equipment-pick-card" data-equipment-id="${g.equipment_id}" data-search="${esc(`${g.equipment_name||''} ${g.brand||''} ${g.model||''} ${g.category_name||''}`.toLowerCase())}"><input class="equipment-check" type="checkbox" value="${g.equipment_id}" aria-label="Select ${esc(g.equipment_name)}"><span class="pick-checkmark" aria-hidden="true">✓</span><img class="equipment-photo" src="${equipmentImage(g)}" alt="${esc(g.equipment_name)} illustration" loading="lazy"><span class="equipment-pick-info"><span class="equipment-pick-name">${esc(g.equipment_name)}</span><span class="equipment-pick-model">${esc([g.brand,g.model].filter(Boolean).join(' ')||g.category_name||'College equipment')}</span><span class="equipment-pick-meta"><span>${esc(g.category_name||'')}</span></span><span class="available-label">${g.available} available</span><span class="equipment-replacement-cost">${Number(g.replacement_cost||0)>0?`Replacement value: ₱${Number(g.replacement_cost).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})} / unit`:"Replacement value not set"}</span><span class="quantity-row"><span>Quantity</span><input class="equipment-quantity" type="number" min="1" max="${g.available}" value="1" disabled aria-label="Quantity of ${esc(g.equipment_name)}"></span></span></label>`).join('')}</div>`:`<div class="card empty-equipment"><div class="empty-equipment-icon">▣</div><h3>No equipment available right now</h3><p>There are currently no available units to borrow. Please check again later.</p></div>`}
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
  let borrowingSubmitInProgress=false;
  $('#borrowForm').onsubmit=async e=>{
    e.preventDefault();
    if(borrowingSubmitInProgress)return;
    const form=e.currentTarget, submit=form.querySelector('button[type="submit"],button:not([type])');
    const selected=checks().filter(c=>c.checked);
    const ids=selected.flatMap(c=>{
      const card=c.closest('.equipment-pick-card');
      const qtyInput=card.querySelector('.equipment-quantity');
      const available=Number(qtyInput.max)||0;
      const raw=Number(qtyInput.value);
      if(!Number.isInteger(raw)||raw<1||raw>available)return [];
      const group=groupedUnits.find(g=>String(g.equipment_id)===c.value);
      return (group?.units||[]).slice(0,raw).map(u=>Number(u.unit_id));
    });
    if(!selected.length)return toast('Please select at least one equipment item.',true);
    const requested=selected.reduce((n,c)=>n+Number(c.closest('.equipment-pick-card').querySelector('.equipment-quantity').value),0);
    if(ids.length!==requested)return toast('One or more quantities are invalid. Please check the selected equipment.',true);
    if(new Set(ids).size!==ids.length)return toast('Duplicate equipment units were selected. Please clear your selection and try again.',true);
    const due=$('#due').value;
    if(!due||due<today()||due>addDays(today(),MAX_BORROW_DAYS))return toast(`Choose a return date within ${MAX_BORROW_DAYS} days.`,true);
    const purpose=$('#purpose').value.trim();
    if(!purpose)return toast('Please enter the purpose of borrowing.',true);
    const accepted=await showBorrowingTermsModal();
    if(!accepted)return;
    borrowingSubmitInProgress=true;
    if(submit){submit.disabled=true;submit.textContent='Submitting…'}
    try{
      const {data,error}=await sb.rpc('create_borrowing',{p_unit_ids:ids,p_expected_return_date:due,p_purpose:purpose,p_remarks:$('#remarks').value.trim()||null});
      if(error)throw error;
      toast(`Borrowing request #${data} created`);
      await updateNotifications();
      await loadPage('transactions');
    }catch(error){
      console.error('Borrowing request failed:',error);
      toast(error?.message||'Could not submit the borrowing request. Please try again.',true);
    }finally{
      borrowingSubmitInProgress=false;
      if(submit?.isConnected){submit.disabled=false;submit.textContent='Submit Borrowing Request'}
    }
  };
}

async function transactions(token){
  let q=sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no), approver:users!borrowings_approved_by_fkey(first_name,last_name)').order('borrowing_id',{ascending:false});
  // Scope student requests in the database query itself (faster and safer than fetching all rows).
  if(!isStaff())q=q.eq('borrower_id',profile.user_id);
  const {data,error}=await q;
  if(token!==pageLoadToken||activePage!=='transactions')return;
  if(error)throw error;
  const visible=data||[];
  const statuses=['Pending','Approved','Active','Partially Returned','Completed','Rejected','Cancelled','Overdue'];
  const countStatus=status=>visible.filter(r=>effectiveStatus(r)===status).length;
  const currentlyBorrowed=visible.filter(r=>['Approved','Active','Partially Returned'].includes(r.status)&&!['Completed','Rejected','Cancelled'].includes(r.status)).length;
  $('#content').innerHTML=`<div class="transaction-summary cards">
    <div class="card stat"><div class="stat-icon">▤</div><div class="label">Total Requests</div><div class="num">${visible.length}</div></div>
    <div class="card stat"><div class="stat-icon">◷</div><div class="label">Pending</div><div class="num">${countStatus('Pending')}</div></div>
    <div class="card stat"><div class="stat-icon">↗</div><div class="label">Currently Borrowed</div><div class="num">${currentlyBorrowed}</div></div>
    <div class="card stat"><div class="stat-icon">✓</div><div class="label">Completed</div><div class="num">${countStatus('Completed')}</div></div>
  </div>
  <div class="toolbar transaction-filters"><div class="hint" style="margin:0">${isStaff()?'All borrowing requests':'Your borrowing history'} · Maximum ${MAX_BORROW_DAYS} days</div><input id="txSearch" class="search" placeholder="Search request ID, borrower, purpose..." aria-label="Search transactions"><select id="txStatus" aria-label="Filter request status"><option value="">All statuses</option>${statuses.map(x=>`<option>${x}</option>`).join('')}</select></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>ID</th><th>Borrower</th><th>Purpose</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody id="txBody">${visible.map(r=>`<tr class="${isOverdue(r)?'overdue-row':''}" data-search="${esc((r.borrowing_id+' '+(r.borrower?.first_name||'')+' '+(r.borrower?.last_name||'')+' '+(r.purpose||'')).toLowerCase())}" data-status="${esc(effectiveStatus(r))}"><td><b>#${r.borrowing_id}</b></td><td>${esc(((r.borrower?.first_name||'')+' '+(r.borrower?.last_name||'')).trim()||'—')}<br><small>${esc(r.borrower?.employee_no||'')}</small></td><td>${esc(r.purpose||'—')}</td><td>${r.borrow_date?new Date(r.borrow_date+'T00:00:00').toLocaleDateString():'—'}</td><td class="${isOverdue(r)?'due-overdue':''}"><b>${esc(r.expected_return_date||'—')}</b><br><small>${esc(dueLabel(r))}</small></td><td>${badge(effectiveStatus(r))}</td><td class="transaction-actions"><button class="btn" onclick="printReceipt(${r.borrowing_id})">Receipt</button> <button class="btn" onclick="viewHistory(${r.borrowing_id})">Details</button>${isStaff()&&isOverdue(r)?` <button class="btn" onclick="recordFollowup(${r.borrowing_id},this)">Follow-up</button>`:''}${!isStaff()&&r.status==='Pending'?` <button class="btn danger" onclick="cancelBorrowing(${r.borrowing_id})">Cancel</button>`:''}${isStaff()&&r.status==='Pending'?` <button class="btn primary" onclick="approve(${r.borrowing_id},this)">Approve</button> <button class="btn danger" onclick="rejectBorrowing(${r.borrowing_id},this)">Reject</button>`:''}${isStaff()&&['Active','Approved','Partially Returned'].includes(r.status)?` <button class="btn" onclick="receive(${r.borrowing_id},this)">Receive Return</button>`:''}${isStaff()&&['Completed','Partially Returned'].includes(r.status)?` <button class="btn" onclick="printReturnReport(${r.borrowing_id})">Return Report</button>`:''}</td></tr>`).join('')||`<tr><td colspan="7" class="empty transaction-empty"><div class="empty-state-icon">▤</div><b>${isStaff()?'No borrowing requests yet':'No transactions yet'}</b><p>${isStaff()?'New student requests will appear here.':'Your borrowing requests and return history will appear here after you submit a request.'}</p>${!isStaff()?`<button class="btn primary" onclick="loadPage('borrow')">Browse Equipment</button>`:''}</td></tr>`}</tbody></table></div>`;
  const filterTx=()=>$$('#txBody tr[data-search]').forEach(r=>{const term=$('#txSearch').value.toLowerCase(),status=$('#txStatus').value;r.style.display=r.dataset.search.includes(term)&&(!status||r.dataset.status===status)?'':'none'});
  $('#txSearch').oninput=filterTx;$('#txStatus').onchange=filterTx;
}
const inFlightBorrowingActions=new Set();
async function runAction(button,label,action){
  if(button?.disabled)return;
  const old=button?.textContent;
  if(button){button.disabled=true;button.textContent=label}
  try{await action()}
  catch(error){console.error('Borrowing action failed:',error);toast(error?.message||'The action failed. Please refresh and try again.',true)}
  finally{if(button?.isConnected){button.disabled=false;button.textContent=old}}
}
async function approve(id,button){return runAction(button,'Approving…',async()=>{const {error}=await sb.rpc('approve_borrowing',{p_borrowing_id:id});if(error)throw error;toast('Borrowing approved');await updateNotifications();await loadPage('transactions')})}
async function rejectBorrowing(id,button){if(inFlightBorrowingActions.has(id))return;inFlightBorrowingActions.add(id);try{const reason=await appPrompt(`Reason for rejecting request #${id}:`);if(reason===null)return;if(!reason.trim())return toast('Please enter a rejection reason.',true);return await runAction(button,'Rejecting…',async()=>{const {error}=await sb.rpc('reject_borrowing',{p_borrowing_id:id,p_reason:reason.trim()});if(error)throw error;toast('Request rejected and units released');await updateNotifications();await loadPage('transactions')})}finally{inFlightBorrowingActions.delete(id)}}
async function cancelBorrowing(id){if(inFlightBorrowingActions.has(id))return;if(!await appConfirm(`Cancel your pending borrowing request #${id}? Reserved units will be released.`))return;inFlightBorrowingActions.add(id);try{const {error}=await sb.rpc('cancel_borrowing',{p_borrowing_id:id});if(error)throw error;toast('Request cancelled and units released');await updateNotifications();await loadPage('transactions')}catch(error){console.error('Cancel request failed:',error);toast(error?.message||'Could not cancel the request. Please try again.',true)}finally{inFlightBorrowingActions.delete(id)}}
async function receive(id,button){
  if(inFlightBorrowingActions.has(id))return;
  inFlightBorrowingActions.add(id);
  try{
    const {data:items,error:itemsError}=await sb.from('borrowing_items').select('borrowing_item_id,item_status,unit:equipment_units(asset_tag,equipment:equipment(equipment_name,replacement_cost))').eq('borrowing_id',id).eq('item_status','Borrowed');
    if(itemsError)throw itemsError;
    if(!items?.length){toast('No borrowed items remain to return.',true);return}

    // Select the units to return by clicking checkboxes instead of typing asset tags.
    const itemChoices=items.map(item=>{const equipmentName=item.unit?.equipment?.equipment_name||'Equipment';return {label:`${item.unit?.asset_tag||'No asset tag'} — ${equipmentName} (item #${item.borrowing_item_id})`,image:equipmentImage({equipment_name:equipmentName})};});
    const selectedIndexes=await appMultiChoicePrompt(`Choose the equipment units being returned for request #${id}. You can select one or several units.`,itemChoices,items.map((_,i)=>i));
    if(selectedIndexes===null)return;
    const selectedItems=selectedIndexes.map(i=>items[i]).filter(Boolean);
    if(!selectedItems.length){toast('Select at least one unit to return.',true);return}

    const itemConditions=[];
    for(const item of selectedItems){
      const label=`Condition for ${item.unit?.asset_tag||('item #'+item.borrowing_item_id)} (${item.unit?.equipment?.equipment_name||'equipment'}):\nExcellent, Good, Fair, Damaged, or For Repair`;
      const condition=await appChoicePrompt(label,['Excellent','Good','Fair','Damaged','For Repair'],'Good');
      if(condition===null)return;
      const normalized=condition.trim();
      if(!['Excellent','Good','Fair','Damaged','For Repair'].includes(normalized)){toast(`Invalid condition for ${item.unit?.asset_tag||'item'}.`,true);return}
      const conditionRecord={borrowing_item_id:item.borrowing_item_id,condition_in:normalized};
      if(['Damaged','For Repair'].includes(normalized)){
        const description=await appPrompt(`Describe the damage or repair needed for ${item.unit?.asset_tag||('item #'+item.borrowing_item_id)} (${item.unit?.equipment?.equipment_name||'equipment'}):`);
        if(description===null)return;
        if(!description.trim()){toast('Please describe the damage or repair needed.',true);return}
        const replacementCost=Number(item.unit?.equipment?.replacement_cost||0);
        const amountText=await appPrompt(
          `Enter the assessed damage/repair charge in PHP for ${item.unit?.asset_tag||('item #'+item.borrowing_item_id)}.\nReplacement value: ${replacementCost>0?'₱'+replacementCost.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}):'Not set'}\n\nEnter 0 if no charge is assessed. Do not automatically charge the full replacement value.`,
          '0'
        );
        if(amountText===null)return;
        const damageCost=Number(amountText);
        if(!amountText.trim()||!Number.isFinite(damageCost)||damageCost<0){toast('Enter a valid damage charge of ₱0 or more.',true);return}
        conditionRecord.damage_description=description.trim();
        conditionRecord.damage_cost=damageCost;
      }
      itemConditions.push(conditionRecord);
    }
    const remarks=await appPrompt(`Return remarks for ${selectedItems.length} selected unit(s) (optional):`,'Returned through web app');
    if(remarks===null)return;
    await runAction(button,'Recording…',async()=>{
      const {error}=await sb.rpc('receive_borrowing_return',{p_borrowing_id:id,p_remarks:remarks.trim()||null,p_item_conditions:itemConditions});
      if(error)throw error;
      const assessedItems=itemConditions.filter(item=>['Damaged','For Repair'].includes(item.condition_in)&&item.damage_description);
      for(const item of assessedItems){
        const {error:assessmentError}=await sb.rpc('assess_return_damage',{
          p_borrowing_id:id,
          p_borrowing_item_id:item.borrowing_item_id,
          p_damage_description:item.damage_description,
          p_damage_cost:item.damage_cost
        });
        if(assessmentError)throw new Error(`Return was recorded, but the damage assessment for item #${item.borrowing_item_id} was not saved: ${assessmentError.message}`);
      }
      toast(`Return recorded for ${selectedItems.length} unit(s). Damage assessments were saved where applicable.`);
      await updateNotifications();
      await loadPage('transactions');
    });
  }catch(error){console.error('Return recording failed:',error);toast(error?.message||'Could not record the return. Please try again.',true)}
  finally{inFlightBorrowingActions.delete(id)}
}
async function printReturnReport(id){const {data:r,error}=await sb.from('borrowings').select('borrowing_id,expected_return_date,borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no),returns(return_id,return_date,remarks,receiver:users!returns_received_by_fkey(first_name,last_name),return_items(condition_in,damage_description,damage_cost,missing_accessory,borrowing_item:borrowing_items(unit:equipment_units(asset_tag,equipment:equipment(equipment_name)))) )').eq('borrowing_id',id).single();if(error)return toast(error.message,true);const returns=r.returns||[];const rows=returns.flatMap(ret=>(ret.return_items||[]).map(it=>`<tr><td>${esc(it.borrowing_item?.unit?.asset_tag)}</td><td>${esc(it.borrowing_item?.unit?.equipment?.equipment_name)}</td><td>${esc(it.condition_in)}</td><td>${esc(it.damage_description||'—')}</td><td>${Number(it.damage_cost||0)>0?'₱'+Number(it.damage_cost).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}):'₱0.00'}</td><td>${esc(it.missing_accessory||'—')}</td><td>${esc(ret.return_date)}</td><td>${esc([ret.receiver?.first_name,ret.receiver?.last_name].filter(Boolean).join(' '))}</td></tr>`)).join('');const w=window.open('','_blank');if(!w)return toast('Please allow pop-ups to print the return report.',true);w.document.write(`<html><head><title>Return Inspection Report #${id}</title><style>body{font:13px Arial;padding:30px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #aaa;padding:7px;text-align:left}h1{margin-bottom:4px}</style></head><body><h1>Fullbright College</h1><h2>Equipment Return Inspection Report #${id}</h2><p>Borrower: ${esc([r.borrower?.first_name,r.borrower?.last_name].filter(Boolean).join(' '))} (${esc(r.borrower?.employee_no)})</p><p>Expected return: ${esc(r.expected_return_date)} · Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Asset</th><th>Equipment</th><th>Condition in</th><th>Damage / repair notes</th><th>Assessed charge</th><th>Missing accessories</th><th>Returned at</th><th>Received by</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No return inspection details available.</td></tr>'}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

async function viewHistory(id){const {data,error}=await sb.from('borrowing_status_history').select('old_status,new_status,changed_at,reason,actor:users!borrowing_status_history_changed_by_fkey(first_name,last_name)').eq('borrowing_id',id).order('changed_at',{ascending:false});if(error)return toast('Could not load history. Apply the workflow SQL update first. '+error.message,true);const lines=(data||[]).map(x=>`${new Date(x.changed_at).toLocaleString()} — ${x.old_status||'Created'} → ${x.new_status} by ${x.actor?x.actor.first_name+' '+x.actor.last_name:'System'}${x.reason?' | '+x.reason:''}`);appAlert(`Borrowing #${id} status history\n\n${lines.join('\n')||'No status changes recorded yet.'}`)}
async function printReceipt(id){
  const {data:r,error}=await sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no,department_id), borrowing_items(*, unit:equipment_units(asset_tag,serial_number,condition_status,location,equipment:equipment(equipment_name,brand,model)))').eq('borrowing_id',id).single();
  if(error)return toast(error.message,true);
  const items=r.borrowing_items||[];
  const rows=items.map((i,n)=>`<tr><td class="num">${n+1}</td><td><strong>${esc(i.unit?.equipment?.equipment_name||'Equipment')}</strong><small>${esc([i.unit?.equipment?.brand,i.unit?.equipment?.model].filter(Boolean).join(' ')||'—')}</small></td><td>${esc(i.unit?.asset_tag||i.unit?.serial_number||'—')}</td><td>${esc(i.item_condition_out||'Not recorded')}</td><td>${esc(i.unit?.location||'—')}</td></tr>`).join('');
  const status=effectiveStatus(r);
  const statusClass=String(status).toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const fmtDate=v=>v?new Date(v+'T00:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—';
  const borrower=[r.borrower?.first_name,r.borrower?.last_name].filter(Boolean).join(' ')||'—';
  const logoUrl=new URL('assets/fullbright-logo.jpg',window.location.href).href;
  const w=window.open('','_blank','width=1000,height=800');
  if(!w)return toast('Please allow pop-ups to view the digital receipt.',true);
  w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Digital Borrowing Receipt #${esc(r.borrowing_id)}</title><style>
  :root{color-scheme:light;--ink:#172033;--muted:#657187;--line:#e2e8f0;--blue:#1769aa;--pale:#f3f7fb}
  *{box-sizing:border-box}body{margin:0;background:#eef2f7;color:var(--ink);font:15px/1.5 Inter,Segoe UI,Arial,sans-serif}
  .toolbar{max-width:900px;margin:24px auto 14px;display:flex;justify-content:flex-end;gap:10px;padding:0 18px}
  button{border:0;border-radius:10px;padding:11px 17px;font-weight:700;cursor:pointer;font-size:14px}.print{background:#1769aa;color:#fff}.close{background:#fff;color:#263449;border:1px solid #d7e0ea}
  .paper{max-width:900px;margin:0 auto 30px;background:#fff;border:1px solid #e1e7ef;border-radius:18px;box-shadow:0 12px 35px #1e293b12;overflow:hidden}
  .topline{height:7px;background:linear-gradient(90deg,#145a91,#55a8e6)}.inner{padding:36px 42px}
  .brand{display:flex;align-items:center;gap:15px}.logo{width:66px;height:66px;object-fit:contain;border:1px solid var(--line);border-radius:14px;padding:4px;background:#fff}
  h1{font-size:22px;line-height:1.2;margin:0 0 5px;letter-spacing:.02em}.sub{margin:0;color:var(--muted);font-size:13px}
  .header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:25px;border-bottom:1px solid var(--line)}
  .receipt-tag{text-align:right}.eyebrow{font-size:11px;font-weight:800;color:var(--blue);letter-spacing:.13em;text-transform:uppercase}.receipt-no{font-size:21px;font-weight:800;margin:4px 0}.issued{font-size:12px;color:var(--muted)}
  .title-row{display:flex;justify-content:space-between;align-items:center;gap:15px;margin:25px 0 18px}.title-row h2{font-size:18px;margin:0}.status{display:inline-flex;align-items:center;border-radius:999px;padding:6px 11px;font-size:12px;font-weight:800;background:#eaf2ff;color:#1d5e9b}.status.overdue{background:#fff0f0;color:#b42332}.status.completed{background:#e8f8ef;color:#167548}.status.rejected,.status.cancelled{background:#f1f3f6;color:#596579}
  .details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:26px}.detail{background:var(--pale);border:1px solid #e9eef5;border-radius:11px;padding:13px 15px;min-width:0}.label{display:block;font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:800;margin-bottom:4px}.value{font-size:14px;font-weight:650;overflow-wrap:anywhere}
  .section-title{font-size:14px;font-weight:800;margin:0 0 10px}.table-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;border-collapse:collapse;min-width:620px}th{background:#f5f8fc;color:#536176;font-size:10px;text-transform:uppercase;letter-spacing:.07em;text-align:left;padding:12px 13px}td{padding:13px;border-top:1px solid var(--line);font-size:12px;vertical-align:top}td small{display:block;color:var(--muted);margin-top:3px}.num{color:var(--muted);width:35px}
  .notice{margin-top:23px;border:1px solid #d9e8f6;background:#f4f9ff;border-radius:12px;padding:15px 17px;font-size:12px;color:#42536a}.notice strong{display:block;color:#1c4d7b;margin-bottom:3px}
  .signatures{display:grid;grid-template-columns:1fr 1fr;gap:55px;margin:42px 0 15px}.signature{border-top:1px solid #9aa7b8;padding-top:9px;font-size:12px;color:#536176}.footer{border-top:1px solid var(--line);margin-top:28px;padding-top:16px;display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:10px}
  @media(max-width:650px){.toolbar{margin-top:12px}.paper{margin:0 8px 15px;border-radius:12px}.inner{padding:22px 17px}.header{flex-direction:column}.receipt-tag{text-align:left}.details{grid-template-columns:1fr 1fr}.signatures{gap:22px}.logo{width:52px;height:52px}h1{font-size:18px}}
  @media print{body{background:#fff}.toolbar{display:none}.paper{max-width:none;margin:0;border:0;border-radius:0;box-shadow:none}.inner{padding:12mm}.topline{-webkit-print-color-adjust:exact;print-color-adjust:exact}.detail,.notice,th,.status{-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{size:A4;margin:0}}
  </style></head><body><div class="toolbar"><button class="close" onclick="window.close()">Close</button><button class="print" onclick="downloadReceiptPdf()">Download PDF</button><button class="print" onclick="window.print()">Print</button></div>
  <main class="paper"><div class="topline"></div><div class="inner">
  <header class="header"><div class="brand"><img class="logo" src="${logoUrl}" alt="Fullbright College logo" onerror="this.style.display='none'"><div><h1>FULLBRIGHT COLLEGE</h1><p class="sub">Equipment Borrowing System</p><p class="sub">Official digital transaction record</p></div></div>
  <div class="receipt-tag"><div class="eyebrow">Digital receipt</div><div class="receipt-no">BR-${String(r.borrowing_id).padStart(6,'0')}</div><div class="issued">Issued ${new Date().toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'})}</div></div></header>
  <div class="title-row"><h2>Borrowing transaction</h2><span class="status ${statusClass}">${esc(status)}</span></div>
  <section class="details"><div class="detail"><span class="label">Borrower name</span><div class="value">${esc(borrower)}</div></div><div class="detail"><span class="label">Student ID</span><div class="value">${esc(r.borrower?.employee_no||'—')}</div></div><div class="detail"><span class="label">Borrow date</span><div class="value">${esc(fmtDate(r.borrow_date))}</div></div><div class="detail"><span class="label">Expected return date</span><div class="value">${esc(fmtDate(r.expected_return_date))}</div></div><div class="detail"><span class="label">Department</span><div class="value">${esc(r.borrower?.department_id||'—')}</div></div><div class="detail"><span class="label">Purpose</span><div class="value">${esc(r.purpose||'—')}</div></div></section>
  <h3 class="section-title">Equipment issued <span style="color:#657187;font-weight:500">(${items.length} item${items.length===1?'':'s'})</span></h3>
  <div class="table-wrap"><table><thead><tr><th>#</th><th>Equipment</th><th>Asset ID</th><th>Condition out</th><th>Location</th></tr></thead><tbody>${rows||'<tr><td colspan="5">No equipment items are listed for this transaction.</td></tr>'}</tbody></table></div>
  <div class="notice"><strong>Borrower responsibilities</strong>Please keep the equipment secure and return it by the expected return date in the condition recorded at issue. Report damage or missing accessories to the Equipment Officer. Any damage assessment must be reviewed by authorized staff according to college policy.</div>
  <div class="signatures"><div class="signature">Borrower signature / acknowledgement</div><div class="signature">Equipment Officer / authorized staff</div></div>
  <footer class="footer"><span>Receipt reference: BR-${String(r.borrowing_id).padStart(6,'0')}</span><span>Generated by Fullbright College Equipment Borrowing System</span></footer>
  </div></main>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
  async function downloadReceiptPdf(){
    const btn=[...document.querySelectorAll('.toolbar button')].find(b=>b.textContent.trim()==='Download PDF');
    const original=btn?btn.textContent:'Download PDF';
    try{
      if(typeof html2pdf!=='function') throw new Error('PDF generator could not load. Check your internet connection and try again.');
      if(btn){btn.disabled=true;btn.textContent='Generating PDF…';}
      const element=document.querySelector('.paper');
      const options={margin:[8,8,8,8],filename:'Fullbright-Borrowing-Receipt-BR-${String(r.borrowing_id).padStart(6,'0')}.pdf',image:{type:'jpeg',quality:0.98},html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}};
      await html2pdf().set(options).from(element).save();
    }catch(err){alert(err.message||'Could not generate the PDF. Please use Print and choose Save as PDF.');}
    finally{if(btn){btn.disabled=false;btn.textContent=original;}}
  }
  </script></body></html>`);
  w.document.close();
}

async function overduePage(token){
  if(!isStaff()) { $('#content').innerHTML='<div class="card">Only staff can access overdue tracking.</div>'; return; }
  const {data,error}=await sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no,email), borrowing_items(borrowing_item_id,item_status,unit:equipment_units(asset_tag,equipment:equipment(equipment_name)))').in('status',['Approved','Active','Partially Returned']).order('expected_return_date',{ascending:true});
  if(token!==pageLoadToken||activePage!=='overdue')return;
  if(error)throw error;
  const rows=(data||[]).filter(isOverdue);
  const openItems=r=>(r.borrowing_items||[]).filter(i=>!['Returned','Lost'].includes(i.item_status));
  const renderRows=arr=>arr.map(r=>`<tr class="overdue-row"><td><b>#${r.borrowing_id}</b></td><td>${esc([r.borrower?.first_name,r.borrower?.last_name].filter(Boolean).join(' '))}<br><small>${esc(r.borrower?.employee_no||'No Student ID')}</small><br><small>${esc(r.borrower?.email||'')}</small></td><td>${(openItems(r).map(i=>`${esc(i.unit?.equipment?.equipment_name||'Equipment')} · ${esc(i.unit?.asset_tag||'')}`).join('<br>'))||'Item details unavailable'}</td><td><b>${esc(r.expected_return_date)}</b></td><td><span class="badge bad">${daysOverdue(r)} day(s) overdue</span></td><td><button class="btn" onclick="printReceipt(${r.borrowing_id})">Receipt</button> <button class="btn" onclick="viewHistory(${r.borrowing_id})">Details</button> <button class="btn primary" onclick="recordFollowup(${r.borrowing_id},this)">Record Follow-up</button> <button class="btn" onclick="loadPage('transactions')">Open Transactions</button></td></tr>`).join('');
  const dueSoon=(data||[]).filter(r=>!isOverdue(r)&&r.expected_return_date>=today()&&r.expected_return_date<=addDays(today(),2));
  $('#content').innerHTML=`<div class="cards"><div class="card stat"><div class="label">Overdue Requests</div><div class="num">${rows.length}</div></div><div class="card stat"><div class="label">Due in 2 Days</div><div class="num">${dueSoon.length}</div></div><div class="card stat"><div class="label">Total Days Overdue</div><div class="num">${rows.reduce((sum,r)=>sum+daysOverdue(r),0)}</div></div></div><div class="card" style="margin-top:14px"><div class="section-heading"><div><h3 class="section-title">Overdue Borrowings</h3><p class="muted">Open requests past their expected return date. Returned and completed requests are excluded.</p></div><button class="btn" onclick="loadPage('overdue')">Refresh</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Request</th><th>Student</th><th>Outstanding equipment</th><th>Due date</th><th>Overdue</th><th>Actions</th></tr></thead><tbody>${renderRows(rows)||'<tr><td colspan="6" class="empty">No overdue borrowings. All tracked items are within their due dates.</td></tr>'}</tbody></table></div></div><div class="card" style="margin-top:14px"><h3 class="section-title">Due Soon</h3><div class="table-wrap"><table class="table"><thead><tr><th>Request</th><th>Student</th><th>Due date</th><th>Reminder</th></tr></thead><tbody>${dueSoon.map(r=>`<tr><td>#${r.borrowing_id}</td><td>${esc([r.borrower?.first_name,r.borrower?.last_name].filter(Boolean).join(' '))} (${esc(r.borrower?.employee_no||'')})</td><td>${esc(r.expected_return_date)}</td><td>${esc(dueLabel(r))}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">No items due within the next two days.</td></tr>'}</tbody></table></div></div>`;
}

async function maintenance(token){const {data,error}=await sb.from('maintenance_records').select('*, unit:equipment_units(asset_tag), reporter:users!maintenance_records_reported_by_fkey(first_name,last_name)').order('maintenance_id',{ascending:false});if(token!==pageLoadToken||activePage!=='maintenance')return;if(error)throw error;$('#content').innerHTML=`<div class="toolbar"><h3 class="section-title" style="flex:1">Maintenance Records</h3><button class="btn primary" onclick="maintenanceForm()">+ New Record</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Asset</th><th>Type</th><th>Issue</th><th>Start</th><th>Cost</th><th>Status</th></tr></thead><tbody>${(data||[]).map(r=>`<tr><td>${esc(r.unit?.asset_tag)}</td><td>${esc(r.maintenance_type)}</td><td>${esc(r.issue_description)}</td><td>${esc(r.start_date)}</td><td>₱${Number(r.maintenance_cost).toLocaleString()}</td><td>${badge(r.maintenance_status)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No maintenance records.</td></tr>'}</tbody></table></div>`}
async function maintenanceForm(){const {data:units}=await sb.from('equipment_units').select('unit_id,asset_tag').order('asset_tag');$('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">New Maintenance Record</h3><form class="form" id="mForm"><div class="field"><label>Equipment unit</label><select id="mu">${(units||[]).map(u=>`<option value="${u.unit_id}">${esc(u.asset_tag)}</option>`).join('')}</select></div><div class="grid2"><div class="field"><label>Type</label><select id="mt"><option>Preventive</option><option>Repair</option><option>Inspection</option><option>Cleaning</option></select></div><div class="field"><label>Start date</label><input id="ms" type="date" required value="${today()}"></div></div><div class="field"><label>Issue</label><textarea id="mi" rows="3" required></textarea></div><div class="grid2"><div class="field"><label>Action taken</label><input id="ma"></div><div class="field"><label>Cost</label><input id="mc" type="number" step="0.01" min="0"></div></div><div class="actions"><button class="btn primary">Save Record</button></div></form></div>`;$('#mForm').onsubmit=async e=>{e.preventDefault();const {error}=await sb.from('maintenance_records').insert({unit_id:+$('#mu').value,reported_by:profile.user_id,maintenance_type:$('#mt').value,start_date:$('#ms').value,issue_description:$('#mi').value,action_taken:$('#ma').value,maintenance_cost:+($('#mc').value||0)});if(error)return toast(error.message,true);await sb.from('equipment_units').update({availability_status:'Maintenance'}).eq('unit_id',+$('#mu').value);toast('Maintenance record saved');loadPage('maintenance')}}

async function users(token){
  if(!isAdmin())return loadPage('dashboard');
  const [{data,error},{data:roles},{data:deps}]=await Promise.all([sb.from('users').select('*,role:roles(role_name),department:departments(department_name)').order('user_id'),sb.from('roles').select('*').neq('role_name','Faculty').order('role_id'),sb.from('departments').select('*').order('department_name')]);if(token!==pageLoadToken||activePage!=='users')return;if(error)throw error;
  $('#content').innerHTML=`<div class="toolbar"><input id="userSearch" class="search" placeholder="Search name, ID, email, department..."><select id="userRoleFilter"><option value="">All roles</option>${roles.map(r=>`<option>${esc(r.role_name)}</option>`).join('')}</select><select id="userStatusFilter"><option value="">All account statuses</option><option>Active</option><option>Inactive</option><option>Suspended</option></select></div><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>ID</th><th>Email</th><th>Section / Year</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody id="userBody">${(data||[]).map(u=>`<tr data-search="${esc((u.first_name+' '+u.last_name+' '+u.employee_no+' '+u.email+' '+(u.department?.department_name||'')).toLowerCase())}" data-role="${esc(u.role?.role_name||'')}" data-status="${esc(u.user_status)}"><td>${esc(u.first_name+' '+u.last_name)}</td><td>${esc(u.employee_no)}</td><td>${esc(u.email)}</td><td>${esc([u.course_program,u.year_level].filter(Boolean).join(' '))}</td><td><select onchange="changeUser(${u.user_id},'role_id',this.value)">${roles.map(r=>`<option value="${r.role_id}" ${r.role_id===u.role_id?'selected':''}>${esc(r.role_name)}</option>`).join('')}</select></td><td><select onchange="changeUser(${u.user_id},'user_status',this.value)">${['Active','Inactive','Suspended'].map(s=>`<option ${s===u.user_status?'selected':''}>${s}</option>`).join('')}</select></td><td><button class="btn" onclick="editUser(${u.user_id})">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
  const filterUsers=()=>$$('#userBody tr').forEach(r=>r.style.display=(r.dataset.search.includes($('#userSearch').value.toLowerCase())&&(!$('#userRoleFilter').value||r.dataset.role===$('#userRoleFilter').value)&&(!$('#userStatusFilter').value||r.dataset.status===$('#userStatusFilter').value))?'':'none');$('#userSearch').oninput=filterUsers;$('#userRoleFilter').onchange=filterUsers;$('#userStatusFilter').onchange=filterUsers;
  window.__roles=roles;window.__deps=deps;
}
async function changeUser(id,field,value){const patch={};patch[field]=field==='role_id'?+value:value;const {error}=await sb.from('users').update(patch).eq('user_id',id);if(error)return toast(error.message,true);toast('User updated')}
async function editUser(id){const {data:u}=await sb.from('users').select('*').eq('user_id',id).single();if(!u)return;const deps=window.__deps||[];$('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">Edit User</h3><form class="form" id="uForm"><div class="grid2"><div class="field"><label>First name</label><input id="uf" value="${esc(u.first_name)}" required></div><div class="field"><label>Last name</label><input id="ul" value="${esc(u.last_name)}" required></div></div><div class="grid2"><div class="field"><label>Student ID</label><input id="uidno" type="text" inputmode="numeric" maxlength="10" minlength="10" pattern="240101[0-9]{4}" title="Enter a 10-digit Student ID starting with 240101." value="${esc(u.employee_no)}" required></div><div class="field"><label>Email</label><input value="${esc(u.email)}" disabled></div></div><div class="field"><label>Section / Year</label><input id="uc" value="${esc([u.course_program,u.year_level].filter(Boolean).join(' '))}" placeholder="e.g. IT1A"></div><div class="actions"><button type="button" class="btn" onclick="loadPage('users')">Cancel</button><button class="btn primary">Save Changes</button></div></form></div>`;$('#uidno').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10)});$('#uForm').onsubmit=async e=>{e.preventDefault();if(!validStudentId($('#uidno').value))return toast('Enter a valid Student ID starting with 240101.',true);const {error}=await sb.from('users').update({first_name:$('#uf').value,last_name:$('#ul').value,employee_no:$('#uidno').value,course_program:$('#uc').value.trim()||null,year_level:null,department_id:u.department_id}).eq('user_id',id);if(error)return toast(error.message,true);toast('User profile updated');loadPage('users')}}

async function reports(token){
  const [{data:inv,error:ie},{data:borrowings,error:be},{data:borrowedItems,error:bie}]=await Promise.all([sb.from('v_equipment_inventory').select('*'),sb.from('borrowings').select('*, borrower:users!borrowings_borrower_id_fkey(first_name,last_name,employee_no)'),sb.from('borrowing_items').select('unit:equipment_units(equipment:equipment(equipment_name))')]);if(token!==pageLoadToken||activePage!=='reports')return;if(ie)throw ie;if(be)throw be;if(bie)throw bie;
  const counts={};(inv||[]).forEach(x=>counts[x.category_name]=(counts[x.category_name]||0)+1);const value=(inv||[]).reduce((s,x)=>s+Number(x.replacement_cost||0),0);const overdue=(borrowings||[]).filter(isOverdue);const dueSoon=(borrowings||[]).filter(r=>!isOverdue(r)&&['Approved','Active','Partially Returned'].includes(r.status)&&r.expected_return_date>=today()&&r.expected_return_date<=addDays(today(),2));const bs={};(borrowings||[]).forEach(x=>{const k=effectiveStatus(x);bs[k]=(bs[k]||0)+1});const monthCounts={};(borrowings||[]).forEach(x=>{const k=String(x.borrow_date||'').slice(0,7);if(k)monthCounts[k]=(monthCounts[k]||0)+1});const popular={};(borrowedItems||[]).forEach(x=>{const name=x.unit?.equipment?.equipment_name;if(name)popular[name]=(popular[name]||0)+1});const topPopular=Object.entries(popular).sort((a,b)=>b[1]-a[1]).slice(0,5);window.__reportData={inv:inv||[],borrowings:borrowings||[]};
  $('#content').innerHTML=`<div class="toolbar"><button class="btn primary" onclick="exportReportCSV('inventory')">Export Inventory CSV</button><button class="btn primary" onclick="exportReportCSV('transactions')">Export Transactions CSV</button><button class="btn" onclick="printReports()">Print / Save PDF</button></div><div class="toolbar report-filters"><input id="reportFrom" type="date" aria-label="From date"><input id="reportTo" type="date" aria-label="To date"><input id="reportBorrower" class="search" placeholder="Filter borrower name / ID"><select id="reportStatusFilter"><option value="">All statuses</option>${['Pending','Approved','Active','Partially Returned','Completed','Rejected','Cancelled','Overdue'].map(x=>`<option>${x}</option>`).join('')}</select><select id="reportCategoryFilter"><option value="">All categories</option>${[...new Set((inv||[]).map(x=>x.category_name).filter(Boolean))].sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select><button class="btn" onclick="applyReportFilters()">Apply Filters</button><button class="btn" onclick="clearReportFilters()">Clear</button></div><div class="cards"><div class="card stat"><div class="label">Inventory Value</div><div class="num">₱${value.toLocaleString()}</div></div><div class="card stat"><div class="label">Equipment Units</div><div class="num">${inv?.length||0}</div></div><div class="card stat"><div class="label">Borrowing Records</div><div class="num">${borrowings?.length||0}</div></div><div class="card stat"><div class="label">Overdue</div><div class="num">${overdue.length}</div></div><div class="card stat"><div class="label">Due Soon</div><div class="num">${dueSoon.length}</div></div></div><div class="chart-grid"><div class="card"><h3 class="section-title">Units by Category</h3><div class="chart-box"><canvas id="reportCategory"></canvas></div></div><div class="card"><h3 class="section-title">Borrowing Status</h3><div class="chart-box"><canvas id="reportStatus"></canvas></div></div><div class="card"><h3 class="section-title">Monthly Borrowing Activity</h3><div class="chart-box"><canvas id="reportMonthly"></canvas></div></div><div class="card"><h3 class="section-title">Most Frequently Borrowed Equipment</h3><div class="chart-box"><canvas id="reportPopular"></canvas></div></div></div><div class="card" style="margin-top:14px"><h3 class="section-title">Overdue Follow-up List</h3><div class="table-wrap"><table class="table"><thead><tr><th>Request</th><th>Borrower</th><th>Due date</th><th>Overdue</th><th>Action</th></tr></thead><tbody>${overdue.map(r=>`<tr class="overdue-row"><td>#${r.borrowing_id}</td><td>${esc((r.borrower?.first_name||'')+' '+(r.borrower?.last_name||''))}</td><td>${esc(r.expected_return_date)}</td><td>${daysOverdue(r)} day(s)</td><td><button class="btn" onclick="recordFollowup(${r.borrowing_id},this)">Record Follow-up</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">No overdue borrowings.</td></tr>'}</tbody></table></div></div>`;
  charts.push(new Chart($('#reportCategory'),{type:'bar',data:{labels:Object.keys(counts),datasets:[{label:'Units',data:Object.values(counts)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}));charts.push(new Chart($('#reportStatus'),{type:'doughnut',data:{labels:Object.keys(bs),datasets:[{data:Object.values(bs)}]},options:{responsive:true,maintainAspectRatio:false}}));const months=Object.keys(monthCounts).sort();charts.push(new Chart($('#reportMonthly'),{type:'line',data:{labels:months,datasets:[{label:'Borrowings',data:months.map(k=>monthCounts[k])}]},options:{responsive:true,maintainAspectRatio:false}}));charts.push(new Chart($('#reportPopular'),{type:'bar',data:{labels:topPopular.map(x=>x[0]),datasets:[{label:'Borrowed units',data:topPopular.map(x=>x[1])}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}}}}));
}
function applyReportFilters(){const d=window.__reportData||{};const from=$('#reportFrom').value,to=$('#reportTo').value,term=$('#reportBorrower').value.toLowerCase(),status=$('#reportStatusFilter').value,category=$('#reportCategoryFilter').value;window.__filteredReportData={inv:(d.inv||[]).filter(x=>!category||x.category_name===category),borrowings:(d.borrowings||[]).filter(x=>{const name=[x.borrower?.first_name,x.borrower?.last_name,x.borrower?.employee_no].filter(Boolean).join(' ').toLowerCase();const date=String(x.borrow_date||'').slice(0,10);return (!from||date>=from)&&(!to||date<=to)&&(!term||name.includes(term))&&(!status||effectiveStatus(x)===status)})};const filtered=window.__filteredReportData;toast(`Filters applied: ${filtered.borrowings.length} borrowing records, ${filtered.inv.length} inventory rows. Export buttons use these filters.`)}
function clearReportFilters(){['reportFrom','reportTo','reportBorrower','reportStatusFilter','reportCategoryFilter'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});window.__filteredReportData=null;toast('Report filters cleared')}
function csvEscape(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function downloadCSV(filename,rows){const csv=rows.map(row=>row.map(csvEscape).join(',')).join('\r\n');const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
function exportReportCSV(kind){const d=window.__filteredReportData||window.__reportData||{};if(kind==='inventory'){const rows=[['Asset Tag','Equipment','Category','Brand','Model','Availability','Condition','Replacement Cost']];(d.inv||[]).forEach(x=>rows.push([x.asset_tag,x.equipment_name,x.category_name,x.brand,x.model,x.availability_status,x.condition_status,x.replacement_cost]));downloadCSV('fullbright-inventory-'+today()+'.csv',rows)}else{const rows=[['Borrowing ID','Borrower','Employee No','Purpose','Borrow Date','Expected Return','Calculated Status','Days Overdue','Remarks']];(d.borrowings||[]).forEach(x=>rows.push([x.borrowing_id,[x.borrower?.first_name,x.borrower?.last_name].filter(Boolean).join(' '),x.borrower?.employee_no,x.purpose,x.borrow_date,x.expected_return_date,effectiveStatus(x),daysOverdue(x),x.remarks]));downloadCSV('fullbright-transactions-'+today()+'.csv',rows)}}
function printReports(){const d=window.__filteredReportData||window.__reportData||{};const rows=(d.borrowings||[]).map(r=>`<tr><td>#${r.borrowing_id}</td><td>${esc([r.borrower?.first_name,r.borrower?.last_name].filter(Boolean).join(' '))}</td><td>${esc(r.expected_return_date)}</td><td>${esc(effectiveStatus(r))}</td><td>${isOverdue(r)?daysOverdue(r)+' day(s)':'—'}</td></tr>`).join('');const w=window.open('','_blank');if(!w)return toast('Please allow pop-ups to print reports.',true);w.document.write(`<html><head><title>Fullbright Borrowing Report</title><style>body{font:13px Arial;padding:25px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:7px;text-align:left}h1{margin-bottom:4px}</style></head><body><h1>Fullbright College</h1><h2>Borrowing and Overdue Report</h2><p>Generated: ${new Date().toLocaleString()}</p><table><thead><tr><th>Request</th><th>Borrower</th><th>Due date</th><th>Status</th><th>Overdue</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close()}

async function profilePage(token){$('#content').innerHTML=`<div class="card form-card"><h3 class="section-title">My Profile</h3><div class="profile-grid"><div class="profile-item"><span>Email</span>${esc(profile.email)}</div><div class="profile-item"><span>Role</span>${badge(role())}</div><div class="profile-item"><span>Account status</span>${badge(profile.user_status)}</div><div class="profile-item"><span>Maximum borrowing period</span>${MAX_BORROW_DAYS} days</div></div><form class="form" id="myProfileForm" style="margin-top:18px"><div class="grid2"><div class="field"><label>First name</label><input id="myFirstName" required value="${esc(profile.first_name)}"></div><div class="field"><label>Last name</label><input id="myLastName" required value="${esc(profile.last_name)}"></div></div><div class="grid2"><div class="field"><label>Student ID</label><input id="myEmployeeNo" type="text" inputmode="numeric" maxlength="10" minlength="10" pattern="240101[0-9]{4}" title="Enter a 10-digit Student ID starting with 240101." required value="${esc(profile.employee_no)}"></div><div class="field"><label>Section / Year</label><input id="myCourse" value="${esc([profile.course_program,profile.year_level].filter(Boolean).join(' '))}"></div></div><div class="actions"><button class="btn primary">Save Profile</button></div></form></div>`;$('#myEmployeeNo').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,10)});$('#myProfileForm').onsubmit=async e=>{e.preventDefault();if(!validStudentId($('#myEmployeeNo').value))return toast('Enter a valid Student ID starting with 240101.',true);const {error}=await sb.rpc('update_my_profile',{p_first_name:$('#myFirstName').value.trim(),p_last_name:$('#myLastName').value.trim(),p_employee_no:$('#myEmployeeNo').value.trim(),p_course_program:$('#myCourse').value.trim()||null});if(error)return toast(error.message,true);toast('Profile updated');await getProfile();showApp()}}

async function refreshDueNotifications(){if(!profile)return;const {error}=await sb.rpc('refresh_borrowing_notifications');if(error && !String(error.message||'').includes('Could not find the function'))console.warn('Notifications not refreshed:',error.message)}
async function updateNotifications(){
  if(!profile)return;
  const {data,error}=await sb.from('app_notifications').select('notification_id,title,message,notification_type,borrowing_id,created_at,read_at').order('created_at',{ascending:false}).limit(30);
  if(error){const panel=$('#notificationPanel');if(panel)panel.innerHTML='<div class="notice">Run overdue_notifications_admin.sql in Supabase to enable saved notifications.</div>';return}
  const notices=data||[];const unread=notices.filter(n=>!n.read_at).length;$('#notificationCount').textContent=unread;$('#notificationCount').style.display=unread?'block':'none';$('#notificationPanel').innerHTML=notices.length?`<div class="notice notice-actions"><b>Notifications</b><button class="btn" onclick="markAllNotificationsRead()">Mark all read</button></div>`+notices.slice(0,15).map(n=>`<div class="notice ${n.read_at?'notice-read':''}"><b>${esc(n.title)}</b><br><small>${esc(n.message)} · ${new Date(n.created_at).toLocaleString()}</small>${!n.read_at?`<div><button class="btn" onclick="markNotificationRead(${n.notification_id})">Mark read</button></div>`:''}</div>`).join(''):'<div class="notice">No notifications yet.</div>';
}
async function markNotificationRead(id){const {error}=await sb.rpc('mark_app_notification_read',{p_notification_id:id});if(error)return toast(error.message,true);updateNotifications()}
async function markAllNotificationsRead(){const {error}=await sb.rpc('mark_all_app_notifications_read');if(error)return toast(error.message,true);updateNotifications()}
async function recordFollowup(id,button){
  if(!isStaff())return toast('Only staff can record follow-ups.',true);
  if(document.getElementById('followupModal'))return;
  const wrap=document.createElement('div');wrap.id='followupModal';wrap.className='terms-modal-backdrop';
  wrap.innerHTML=`<section class="terms-modal followup-modal" role="dialog" aria-modal="true" aria-labelledby="followupTitle">
    <button type="button" class="terms-modal-close" id="followupClose" aria-label="Close">×</button>
    <div class="followup-eyebrow">OVERDUE MANAGEMENT · REQUEST #${Number(id)}</div>
    <h2 id="followupTitle">Record follow-up</h2>
    <p class="followup-intro">Log how the student was contacted and when the next follow-up should happen.</p>
    <form id="followupForm" class="form followup-form">
      <div class="field"><label for="followupMethod">Follow-up method</label><select id="followupMethod" required><option>Call</option><option>Email</option><option>In person</option><option>Other</option></select></div>
      <div class="field"><label for="followupNotes">Follow-up notes <span class="followup-required">Required</span></label><textarea id="followupNotes" rows="4" required placeholder="What was discussed? Include the student's response or agreed action."></textarea></div>
      <div class="field"><label for="followupDate">Next follow-up date <span class="followup-optional">Optional</span></label><input id="followupDate" type="date"></div>
      <div class="followup-actions"><button type="button" class="btn" id="followupCancel">Cancel</button><button type="submit" class="btn primary" id="followupSave">Save follow-up</button></div>
    </form></section>`;
  document.body.appendChild(wrap);
  const close=()=>wrap.remove();
  wrap.querySelector('#followupClose').onclick=close;wrap.querySelector('#followupCancel').onclick=close;
  wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
  wrap.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  wrap.querySelector('#followupNotes').focus();
  wrap.querySelector('#followupForm').onsubmit=async e=>{
    e.preventDefault();const method=wrap.querySelector('#followupMethod').value;
    const notes=wrap.querySelector('#followupNotes').value.trim();const next=wrap.querySelector('#followupDate').value||null;
    if(!notes){toast('Enter follow-up notes.',true);return}
    const save=wrap.querySelector('#followupSave');save.disabled=true;save.textContent='Saving…';
    try{const {error}=await sb.rpc('record_borrowing_followup',{p_borrowing_id:id,p_method:method,p_notes:notes,p_next_follow_up_date:next});if(error){toast(error.message,true);save.disabled=false;save.textContent='Save follow-up';return}close();toast('Follow-up recorded');if($('#pageTitle').textContent==='Reports')loadPage('reports');else loadPage('transactions')}
    catch(err){toast(err.message||'Unable to save follow-up.',true);save.disabled=false;save.textContent='Save follow-up'}
  };
}

async function markOverdue(){return refreshDueNotifications()}
start();
setInterval(()=>{if(profile){refreshDueNotifications().finally(updateNotifications)}},5*60*1000);

