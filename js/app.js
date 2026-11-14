import { FridgePage } from "./pages/FridgePage.js";
import { RecipesPage } from "./pages/RecipesPage.js";
import { ShopPage } from "./pages/ShopPage.js";
import { SplitPage } from "./pages/SplitPage.js";
import { ImpactPage } from "./pages/ImpactPage.js";
import { PageRouter } from "./pages/PageRouter.js";
import { FoodCatalog } from "./data/FoodCatalog.js";
import { GroceryItem } from "./models/GroceryItem.js";
import { InventoryManager } from "./services/InventoryManager.js";
import { JsonRepository } from "./services/JsonRepository.js";

const catalog = await FoodCatalog.load();
const recipesResponse = await fetch("./data/recipes.json");
if (!recipesResponse.ok) throw new Error("Could not load recipe catalog.");
const RECIPES = await recipesResponse.json();

const FOODS = catalog.foods;
const FOOD = catalog.byKey;
const TIPS = catalog.tips;
const FREEZE = catalog.freezeDaysByKey;
const NO_FREEZE = catalog.cannotFreeze;
const THAW = catalog.thawDays;
const RX = catalog.receiptPatterns;
const findFood = text => catalog.findFood(text);
const freezeDays = (key, category) => catalog.freezeDays(key, category);
const noFreezeMsg = (key, category) => catalog.noFreezeMessage(key, category);
const CO2_PER_KG = 3;
function fmtDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"});
}


(function(){
"use strict";

/* ---------- Food knowledge: typical fridge shelf life, weight, price ---------- */
// d = days it usually keeps after purchase, kg = typical pack weight, p = typical price (CAD)
/* ---------- Photos (from the team's Figma design) ---------- */
const PHOTO = {"strawberries": "./assets/strawberries.jpg", "spinach": "./assets/spinach.jpg", "chicken": "./assets/chicken.jpg", "milk": "./assets/milk.jpg", "avocado": "./assets/avocado.jpg", "eggs": "./assets/eggs.jpg"};
const RPHOTO = {"Creamy chicken & spinach pasta": "./assets/recipe-creamy-chicken-spinach-pasta.jpg", "Yogurt fruit bowl": "./assets/recipe-yogurt-fruit-bowl.jpg", "Avocado & egg toast": "./assets/recipe-avocado-egg-toast.jpg"};
// Food photos: built-in photos first, then a matching photo from Wikipedia (free, no key needed).
// Results are saved on this device so each food is only looked up once.
const WIKI = {milk:"Milk", eggs:"Egg as food", cheese:"Cheddar cheese", yogurt:"Yogurt", butter:"Butter", cream:"Cream",
  bread:"Bread", tortilla:"Tortilla", spinach:"Spinach", lettuce:"Lettuce", tomato:"Tomato", pepper:"Bell pepper",
  broccoli:"Broccoli", mushroom:"Edible mushroom", cucumber:"Cucumber", carrot:"Carrot", potato:"Potato", onion:"Onion",
  garlic:"Garlic", banana:"Banana", apple:"Apple", strawberries:"Strawberry", avocado:"Avocado", chicken:"Chicken as food",
  beef:"Ground beef", salmon:"Salmon as food", rice:"Rice", pasta:"Pasta", oats:"Oat", beans:"Bean"};
const IMG_KEY="freshsplit-img-v1";
let IMG={}; try{ IMG=JSON.parse(localStorage.getItem(IMG_KEY))||{}; }catch(e){ IMG={}; }
const imgPending=new Set();
function thumb(k,e,name){
  if(k && PHOTO[k]) return `<img src="${PHOTO[k]}" alt="">`;
  const known = k && WIKI[k];
  const q = known ? WIKI[k] : String(name||"").replace(/\(.*?\)/g,"").replace(/\d+(\.\d+)?\s?(kg|g|ml|l|lb|pk)\b/gi,"").trim();
  if(!q || q.length<3) return e;
  const key=q.toLowerCase();
  if(IMG[key]) return `<img src="${esc(IMG[key])}" alt="" loading="lazy" data-fb="${esc(e)}">`;
  if(IMG[key]==="") return e;
  fetchFoodImage(q,key,!!known);
  return `<span data-img="${esc(key)}">${e}</span>`;
}
async function fetchFoodImage(q,key,exact){
  if(imgPending.has(key)) return;
  imgPending.add(key);
  try{
    const base="https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=240&redirects=1";
    const url = exact ? base+"&titles="+encodeURIComponent(q) : base+"&generator=search&gsrlimit=1&gsrsearch="+encodeURIComponent(q+" food");
    const res=await fetch(url);
    if(!res.ok) return;
    const data=await res.json();
    let src="";
    const pages=data && data.query && data.query.pages;
    if(pages){ for(const id in pages){ if(pages[id].thumbnail && pages[id].thumbnail.source){ src=pages[id].thumbnail.source; break; } } }
    IMG[key]=src;
    try{ localStorage.setItem(IMG_KEY,JSON.stringify(IMG)); }catch(e){}
    if(src) document.querySelectorAll("[data-img]").forEach(s=>{
      if(s.dataset.img!==key) return;
      const im=document.createElement("img"); im.src=src; im.alt=""; im.loading="lazy"; im.dataset.fb=s.textContent;
      s.replaceWith(im);
    });
  }catch(err){ /* offline or blocked: keep the emoji and try again next time */ }
  finally{ imgPending.delete(key); }
}
// If a photo fails to load, show the emoji instead.
document.addEventListener("error",ev=>{
  const t=ev.target;
  if(t && t.tagName==="IMG" && t.dataset && t.dataset.fb!=null) t.replaceWith(document.createTextNode(t.dataset.fb));
},true);
const SCAN_SVG='<svg viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/></svg>';
const CLOCK_SVG='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
function pageHead(eb,title,sub,cta){ return `<div class="hero"><div style="flex:1;min-width:0"><div class="eyebrow">${eb}</div><h1 class="page">${title}</h1><p class="sub">${sub}</p></div>${cta||""}</div>`; }

/* ---------- Recipes ---------- */


/* ---------- Dates ---------- */
const TODAY = (()=>{const d=new Date(); d.setHours(0,0,0,0); return d;})();
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addDays(n){const d=new Date(TODAY); d.setDate(d.getDate()+n); return iso(d);}
function daysLeft(s){const [y,m,dd]=s.split("-").map(Number); return Math.round((new Date(y,m-1,dd)-TODAY)/86400000);}
function fmtShort(d){return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});}
function mondayOf(d){const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x;}

/* ---------- Helpers ---------- */
const $ = s=>document.querySelector(s);
let _id = Date.now();
const uid = ()=>"i"+(_id++).toString(36);
const esc = s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = n=>"$"+(Math.round(n*100)/100).toFixed(2);
const kg = n=>(Math.round(n*10)/10).toFixed(1);
function initials(n){return n.trim().slice(0,1).toUpperCase();}

/* ---------- State ---------- */
const KEY="fridgewise-demo-v1";
function mkItem(k, offset, buyer, qty){
  const f=FOOD[k];
  return new GroceryItem({id:uid(), k:f.k, name:f.n, e:f.e, c:f.c, exp:addDays(offset), qty:qty||1, price:f.p, kg:f.kg, buyer});
}
function seed(){
  const people=["You","Sam","Priya"];
  const items=[
    mkItem("spinach",1,"Sam"), mkItem("chicken",1,"You"), mkItem("tomato",2,"Priya"),
    mkItem("banana",2,"Priya"), mkItem("bread",2,"You"), mkItem("milk",3,"Sam"),
    mkItem("yogurt",-1,"You"), mkItem("pepper",4,"Priya"), mkItem("tortilla",9,"Sam"),
    mkItem("carrot",12,"Priya"), mkItem("eggs",14,"You"), mkItem("cheese",20,"Sam"),
    mkItem("onion",25,"Priya"), mkItem("garlic",40,"Priya"), mkItem("pasta",200,"You"),
    mkItem("rice",300,"Sam"), mkItem("beans",500,"You",2),
    Object.assign(mkItem("beef",95,"Sam"),{loc:"freezer"})
  ];
  const purchases=items.map(i=>({id:uid(), name:i.name, price:i.price*i.qty, buyer:i.buyer, split:people.slice()}));
  const w=mondayOf(TODAY);
  const wk=n=>{const d=new Date(w); d.setDate(d.getDate()-7*n); return fmtShort(d);};
  return {
    people, items, purchases,
    shop:[{id:uid(),name:"Rolled oats",k:"oats",done:false},{id:uid(),name:"Lettuce",k:"lettuce",done:false}],
    impact:{rescuedKg:0, usedKg:0, tossedKg:0, saved:0, rescuedCount:0},
    history:[{label:wk(3),r:1.1,t:2.4},{label:wk(2),r:1.8,t:1.9},{label:wk(1),r:2.6,t:1.2}],
    weekLabel:fmtShort(w)
  };
}
const repository = new JsonRepository(KEY);
function load(){ return repository.load(); }
function save(){ repository.save(S); }
let S = load() || seed();
S.items = S.items.map(item => new GroceryItem(item));
const inventory = new InventoryManager(() => S.items);
const UI = {tab:"fridge", addMode:null, receipt:"", parsed:null, pref:"soon", cooking:null, shopWarn:null, check:null};

/* ---------- Status ---------- */
function status(d){
  if(d<0) return {cls:"bad", txt:d===-1?"Expired yesterday":"Expired "+(-d)+" days ago"};
  if(d===0) return {cls:"bad", txt:"Use today"};
  if(d===1) return {cls:"bad", txt:"1 day left"};
  if(d===2) return {cls:"bad", txt:"2 days left"};
  if(d<=3) return {cls:"warn", txt:d+" days left"};
  if(d>60) return {cls:"ok", txt:Math.round(d/30)+" months"};
  return {cls:"ok", txt:d+" days left"};
}
function sorted(){return inventory.getSortedByExpiry(daysLeft);}
function haveKey(k){return inventory.findAvailableByKey(k, daysLeft);}

/* ---------- Toast ---------- */
let tt;
function toast(msg, action){
  const t=$("#toast"); t.textContent=msg;
  if(action){
    const b=document.createElement("button"); b.className="toast-btn"; b.type="button"; b.textContent=action.label;
    b.addEventListener("click",()=>{ t.classList.remove("show"); action.fn(); });
    t.appendChild(b);
  }
  t.classList.toggle("has-action",!!action);
  t.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove("show"), action?6000:2600);
}

/* ---------- Impact accounting ---------- */
function finishItem(item, how){
  const d=daysLeft(item.exp);
  const w=item.kg*item.qty;
  if(how==="used"){
    S.impact.usedKg+=w; S.impact.usedCount=(S.impact.usedCount||0)+1;
    if(d<=3 && d>=-1 && !item.rescued){ S.impact.rescuedKg+=w; S.impact.saved+=item.price*item.qty; S.impact.rescuedCount++; }
  } else {
    S.impact.tossedKg+=w;
    if(item.rescued){ S.impact.rescuedKg-=w; S.impact.saved-=item.price*item.qty; S.impact.rescuedCount--; }
  }
  S.items=S.items.filter(i=>i.id!==item.id);
}

/* ---------- Tabs ---------- */
const ICONS={
  fridge:'<svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M5 10h14M8.5 6v1.5M8.5 13v2.5"/></svg>',
  recipes:'<svg viewBox="0 0 24 24"><path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M9 7c0-1.5 1-1.5 1-3M13 7c0-1.5 1-1.5 1-3"/></svg>',
  shop:'<svg viewBox="0 0 24 24"><path d="M3 4h2.5l2.2 11h10.6L20.5 7H7"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/></svg>',
  split:'<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19c.5-3 3-5 5.5-5s5 2 5.5 5M14 14.6c.8-.4 1.6-.6 2.5-.6 2.2 0 4 1.6 4.5 4.5"/></svg>',
  impact:'<svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19c3-4 6-6.5 9.5-8.5"/></svg>'
};
const TABS=[["fridge","Fridge"],["recipes","Recipes"],["shop","Shop"],["split","Split"],["impact","Impact"]];
function renderTabs(){
  const urgent=S.items.filter(i=>i.loc!=="freezer"&&daysLeft(i.exp)<=1).length;
  const open=S.shop.filter(s=>!s.done).length;
  $("#tabs").innerHTML=TABS.map(([k,l])=>{
    const b = k==="fridge"&&urgent ? `<span class="badge">${urgent}</span>` : (k==="shop"&&open?`<span class="badge" style="background:var(--muted)">${open}</span>`:"");
    return `<button data-act="tab" data-tab="${k}" ${UI.tab===k?'aria-current="page"':""}>${ICONS[k]}<span>${l}${b}</span></button>`;
  }).join("");
}

/* ---------- Fridge ---------- */
function peopleOptions(sel){return S.people.map(p=>`<option ${p===sel?"selected":""}>${esc(p)}</option>`).join("");}
function shareChips(id){
  return `<div class="pchips" id="${id}" role="group" aria-label="Shared with">${S.people.map((q,ix)=>`<button type="button" class="pchip" data-act="pickShare" data-pi="${ix}" aria-pressed="true"><span class="av">${esc(initials(q))}</span>${esc(q)}</button>`).join("")}</div>`;
}
function readShare(id){return [...document.querySelectorAll("#"+id+' .pchip[aria-pressed="true"]')].map(b=>S.people[+b.dataset.pi]);}
function itemRow(i){
  const d=daysLeft(i.exp), frozen=i.loc==="freezer";
  const base=status(d);
  const st=frozen ? {cls:d<0?"bad":"ice", txt:d<0?"Frozen too long":"Frozen · "+base.txt.replace(" left","")} : base;
  const urgent=!frozen && d<=2;
  const canFreeze=freezeDays(i.k,i.c)!=null;
  const tip = urgent && TIPS[i.c] ? `<div class="tip"><b>Save it:</b> ${TIPS[i.c]}</div>` : "";
  const moveBtn = frozen
    ? `<button class="btn sm ghost" data-act="thaw" data-id="${i.id}">Move to fridge</button>`
    : (canFreeze && d>=0 ? `<button class="btn sm ghost" data-act="freeze" data-id="${i.id}">❄ Freeze</button>` : "");
  return `<div class="item ${urgent?"urgent":""} ${frozen?"frozen":""}">
    <div class="emoji" aria-hidden="true">${thumb(i.k,i.e,i.name)}</div>
    <div style="min-width:0">
      <div class="head"><div class="name">${esc(i.name)}${i.qty>1?` <span class="muted">×${i.qty}</span>`:""}</div><span class="chip ${st.cls}">${st.txt}</span></div>
      <div class="meta"><span>${esc(i.buyer)} · ${money(i.price*i.qty)}</span><span>·</span>
        <label>${frozen?"Frozen until":"Use by"} <input type="date" value="${i.exp}" data-act="exp" data-id="${i.id}" aria-label="Use-by date for ${esc(i.name)}"></label></div>
      <div class="acts">
        <button class="btn sm" data-act="used" data-id="${i.id}">Used it</button>
        ${moveBtn}
        <button class="btn sm ghost" data-act="tossed" data-id="${i.id}">Threw it out</button>
        <button class="btn sm ghost rm" data-act="remove" data-id="${i.id}" aria-label="Remove ${esc(i.name)} (added by mistake)">Remove</button>
      </div>
    </div>
    ${tip}
  </div>`;
}
function freezerSection(frozen){
  if(!frozen.length) return "";
  return `<h2>In the freezer <span class="count">${frozen.length}</span></h2>
  <div class="stack">${frozen.map(itemRow).join("")}</div>`;
}
function addPanel(){
  if(UI.addMode==="type"){
    const opts=FOODS.map(f=>`<option value="${esc(f.n)}">`).join("");
    return `<form class="card stack" id="addForm" autocomplete="off">
      <label class="f">Item<input class="input" id="addName" list="foodList" placeholder="e.g. Milk, spinach, chicken" required></label>
      <datalist id="foodList">${opts}</datalist>
      <div class="grid3">
        <label class="f">Qty<input class="input" id="addQty" type="number" min="1" value="1"></label>
        <label class="f">Price<input class="input" id="addPrice" type="number" min="0" step="0.01" placeholder="0.00"></label>
        <label class="f">Paid by<select class="input" id="addBuyer">${peopleOptions("You")}</select></label>
      </div>
      <div class="f">Shared with (tap to change)${shareChips("addShare")}</div>
      <div class="grid2" style="align-items:end">
        <label class="f">Use-by date<input class="input" id="addExp" type="date" value="${addDays(7)}"></label>
        <label class="frz" style="justify-self:start;padding:9px 12px"><input type="checkbox" id="addFrz"> ❄ Put in freezer</label>
      </div>
      <div class="hint" id="addHint">Type an item and we'll estimate how long it keeps. Change the date if the package says otherwise.</div>
      <div class="row"><button class="btn primary" type="submit">Add to fridge</button><button class="btn ghost" type="button" data-act="mode" data-mode="">Cancel</button></div>
    </form>`;
  }
  if(UI.addMode==="receipt"){
    let res="";
    if(UI.parsed){
      const ok=UI.parsed.found, bad=UI.parsed.unknown;
      res=`<div class="stack">
        <div class="row"><strong class="grow">Found ${ok.length} grocery item${ok.length===1?"":"s"}</strong>
          <label class="f" style="flex-direction:row;align-items:center;gap:6px">Paid by <select class="input" id="rcBuyer" style="width:auto;padding:5px 8px">${peopleOptions("You")}</select></label></div>
        <div class="f">Shared with (tap to change)${shareChips("rcShare")}</div>
        <div class="small muted">We guessed each use-by date. Change any date to match the package, or tick ❄ Freezer for food you'll freeze.</div>
        <div>${ok.map((r,ix)=>{const canF=freezeDays(r.f.k,r.f.c)!=null; return `<div class="rc-row">
          <input type="checkbox" ${r.skip?"":"checked"} data-rc="${ix}" aria-label="Add ${esc(r.f.n)}">
          <span class="emoji" aria-hidden="true">${thumb(r.f.k,r.f.e)}</span>
          <div style="min-width:0">
            <div class="row" style="justify-content:space-between;gap:6px"><b>${esc(r.f.n)}</b><span class="tnum small">${r.price!=null?money(r.price):""}</span></div>
            <div class="small muted">"${esc(r.line)}"</div>
            <div class="rc-ctl">
              <label class="small muted">${r.frozen?"Frozen until":"Use by"} <input type="date" class="dt" data-rcexp="${ix}" value="${r.exp}" aria-label="Use-by date for ${esc(r.f.n)}"></label>
              ${canF?`<label class="frz"><input type="checkbox" data-rcfrz="${ix}" ${r.frozen?"checked":""}> ❄ Freezer</label>`:""}
            </div>
          </div>
        </div>`;}).join("")}</div>
        ${bad.length?`<div class="hint">Not recognized: ${bad.map(b=>`“${esc(b)}”`).join(", ")}. Add these by typing them in.</div>`:""}
        <button class="btn primary" data-act="rcAdd" ${ok.length?"":"disabled"}>Add checked items to fridge</button>
      </div>`;
    }
    const o=UI.ocr;
    let ocrBox="";
    if(o && o.status==="loading") ocrBox=`<div class="ocr">${o.thumb?`<img src="${o.thumb}" alt="Your receipt photo">`:""}
        <div class="grow stack" style="gap:6px"><b id="ocrMsg">${esc(o.msg||"Getting the photo reader ready…")}</b>
        <div class="bar"><i id="ocrBar" style="width:${Math.round((o.progress||0)*100)}%"></i></div>
        <span class="small muted">The first scan takes longer while the reader downloads.</span></div></div>`;
    if(o && o.status==="done") ocrBox=`<div class="ocr">${o.thumb?`<img src="${o.thumb}" alt="Your receipt photo">`:""}
        <div class="small">Here's what we read from your photo. If a line is wrong, fix it in the text box and tap <b>Read receipt</b> again.</div></div>`;
    if(o && o.status==="error") ocrBox=`<div class="alert warn"><div><b>We couldn't read that photo.</b> Check your internet connection and try again, or type the receipt text in the box below.</div></div>`;
    return `<div class="card stack">
      <label class="upload" for="rcPhoto">
        <svg class="up-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        <b>Take or upload a photo of your receipt</b>
        <span class="small muted">Lay it flat in good light and fit the whole receipt in the photo.</span>
      </label>
      <input class="vh" type="file" id="rcPhoto" accept="image/*" ${o&&o.status==="loading"?"disabled":""}>
      <button class="btn sm" data-act="rcSamplePhoto" style="align-self:center" ${o&&o.status==="loading"?"disabled":""}>Try a sample receipt photo</button>
      ${ocrBox}
      <div class="or">or type the text</div>
      <label class="f">Receipt text<textarea class="input" id="rcText" placeholder="Paste or type the lines from your grocery receipt">${esc(UI.receipt)}</textarea></label>
      <div class="row">
        <button class="btn primary" data-act="rcRead">Read receipt</button>
        <button class="btn" data-act="rcSample">Use sample text</button>
        <button class="btn ghost" data-act="mode" data-mode="">Cancel</button>
      </div>
      <div class="hint">Photos are read right here in your browser, so your receipt isn't uploaded anywhere (reader v3). FreshSplit then matches each line to a food and estimates its use-by date from typical shelf life.</div>
      ${res}
    </div>`;
  }
  return `<div class="seg" role="group" aria-label="Add groceries">
    <button data-act="mode" data-mode="type" aria-pressed="false">+ Type it in</button>
    <button data-act="mode" data-mode="receipt" aria-pressed="false">Scan a receipt</button>
  </div>`;
}
function renderFridge(){
  const items=sorted();
  const frozen=items.filter(i=>i.loc==="freezer"), cold=items.filter(i=>i.loc!=="freezer");
  const expired=cold.filter(i=>daysLeft(i.exp)<0).length;
  const soon=cold.filter(i=>{const d=daysLeft(i.exp);return d>=0&&d<=3;}).length;
  const useFirst=cold.filter(i=>daysLeft(i.exp)<=3), later=cold.filter(i=>daysLeft(i.exp)>3);
  return `${pageHead("Your kitchen, a little smarter","Good food.<br><em>Great potential.</em>","A full fridge is a good start. Let's make the most of it.",`<button class="scan-fab" data-act="mode" data-mode="receipt" aria-label="Scan a receipt">${SCAN_SVG}</button>`)}
  <div class="stats">
    <div class="stat s1"><span class="lbl">The good stuff</span><b>${later.length+frozen.length}</b><span class="unit">fresh items</span></div>
    <div class="stat s2"><span class="lbl">Use it, don't lose it</span><b>${soon}</b><span class="unit">expiring soon</span></div>
    <div class="stat s3"><span class="lbl">Little wins</span><b>${S.impact.usedCount||0}</b><span class="unit">items used up</span></div>
  </div>
  ${soon?`<button class="banner" data-act="tab" data-tab="recipes"><span class="b-ic">${CLOCK_SVG}</span><span style="flex:1;min-width:0"><b>Your next meal is already here.</b><span class="t">${soon} item${soon===1?" is":"s are"} best enjoyed in the next 3 days. That's ${money(cold.filter(i=>{const d=daysLeft(i.exp);return d>=0&&d<=3;}).reduce((a,i)=>a+i.price*i.qty,0))} worth saving. Tap for recipes.</span></span><span class="arr" aria-hidden="true">→</span></button>`:""}
  <h2>Add groceries</h2>
  ${addPanel()}
  <div class="key" aria-label="Freshness colour guide"><span><i class="kr"></i>Use first · 0–2 days</span><span><i class="kw"></i>Use soon · 3 days</span><span><i class="ko"></i>Staying fresh</span><span><i class="ki"></i>Frozen</span></div>
  <h2>Use these first <span class="count">${useFirst.length}</span></h2>
  <div class="stack">${useFirst.length?useFirst.map(itemRow).join(""):`<div class="empty">Nothing is about to expire. Nice work.</div>`}</div>
  
  <h2>Later <span class="count">${later.length}</span></h2>
  <div class="stack">${later.length?later.map(itemRow).join(""):`<div class="empty">Nothing else in the fridge.</div>`}</div>
  ${freezerSection(frozen)}
  <p class="disclaimer">Freshness dates are estimates, not a food-safety guarantee. Always check labels and how the food looks and smells. Some food photos come from Wikipedia (Wikimedia Commons).</p>`;
}

/* Receipt parsing */
const SAMPLE=`FRESH MART #204   EDMONTON AB
11/13/26  17:42
2% MILK 2L               5.49
BNLS SKNLS CHKN BRST    12.87
BABY SPINACH 312G        4.99
ROMA TOMATOES 0.62KG     3.12
LARGE EGGS 12PK          4.29
WW BREAD 675G            3.49
BANANAS 1.1KG            1.83
STRAWBERRIES 454G        4.99
DISH SOAP 740ML          3.99
SUBTOTAL                45.06
GST 5%                   0.20
TOTAL                   45.26
DEBIT                   45.26`;
// Lines that are never groceries (totals, tax, payment, store info) and common non-food buys.
const SKIP_LINE=/sub\s?total|total|date|time|member|invoice|reference|purchase|acct|transaction|amount|cashier|register|terminal|items sold|\btax\b|\bgst\b|\bpst\b|\bhst\b|change|cash|visa|master\s?card|amex|debit|credit|balance|discount|savings|you saved|tender|approved|auth|card\s?#|points|loyalty|thank|receipt|phone|\btel\b|www\.|\.com|^\d{1,2}\/\d{1,2}|#\d+/i;
const NON_FOOD=/soap|detergent|paper|towel|tissue|toilet|foil|bleach|clean|sponge|shampoo|toothpaste|batter(y|ies)|\bbags?\b|bag fee|deposit|\bdep\b|eco fee|env fee|enviro|lottery|tide|cascade|cloth|boxer|sock|essnce|essence|perfume|cologne|lotion|diaper|wipes|kleenex|charmin|bounty|candle|vitamin|multiple|\/\d/i;
function parseReceipt(text){
  const found=[], unknown=[];
  text.split(/\r?\n/).forEach(raw=>{
    const line=raw.replace(/[|\\]/g," ").replace(/\s+/g," ").trim();
    if(!line || SKIP_LINE.test(line)) return;
    // "name ... price", allowing reading slips like 4,99 / 3. 12 / 9:79 / 3.5O and up to 6 stray
    // characters after the price (tax codes like G or H, pen marks).
    const m=line.replace(/(\d[.,:]\s?\d)[oO]/g,"$10").match(/^(.*?[a-z]{2}.*?)\s+\$?\s?(\d{1,4})\s?[.,:]\s?(\d{2})(?!\d)(.{0,6})$/i);
    let name, price=null;
    if(m){
      if(/-/.test(m[4])) return;                       // discounts and coupons ("6.00-G")
      name=m[1]; price=parseFloat(m[2]+"."+m[3]);
    } else if(/^\W*\d{3,}\s+[a-z]/i.test(line)){
      name=line.replace(/\s+\S*\d\S*\s*$/,"");          // item line whose price couldn't be read
    } else return;
    name=name.replace(/^[^a-z0-9]+/i,"").replace(/^\d{3,}\s+/,"").replace(/^\d+\s*@\s*/,"").replace(/^\d+\s+(?=[a-z])/i,"")
      .replace(/[^a-z0-9%&.\- ]/gi," ").replace(/\s+/g," ").trim();
    if(name.length<3 || !/[a-z]{2}/i.test(name) || NON_FOOD.test(name)) return;
    if(price!==null && !(price>0)) return;
    const f=findFood(name);
    if(f) found.push({f, line:raw.trim(), price, exp:addDays(f.d), frozen:false});
    else if(price!==null) unknown.push(name);
  });
  return {found, unknown};
}

/* ---------- Receipt photos (OCR with Tesseract.js, runs in the browser) ---------- */
const SAMPLE_PHOTO="data:image/png;base64,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";
let tessLoading=null;
function loadTesseract(){
  if(window.Tesseract) return Promise.resolve();
  if(tessLoading) return tessLoading;
  tessLoading=new Promise((res,rej)=>{
    const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload=()=>res(); s.onerror=()=>{tessLoading=null; rej(new Error("Could not load OCR"));};
    document.head.appendChild(s);
  });
  return tessLoading;
}
// Shrink big phone photos and boost contrast so text is easier to read
// Finds the receipt paper in the photo so the table or countertop around it doesn't confuse the
// reader. Works in warm, cool, dim or bright light: it first balances the colours, then picks the
// biggest bright, colourless area. Returns {x,y,w,h} in image pixels, or null to use the whole photo.
function findPaper(img){
  try{
    const W=img.naturalWidth, H=img.naturalHeight, sw=160, sh=Math.max(1,Math.round(H*sw/W)), N=sw*sh;
    const c=document.createElement("canvas"); c.width=sw; c.height=sh;
    const x=c.getContext("2d"); x.drawImage(img,0,0,sw,sh);
    const p=x.getImageData(0,0,sw,sh).data;
    // 1. White balance: each colour channel's brightest 5% becomes white.
    const hi=[1,1,1];
    for(let ch=0;ch<3;ch++){
      const h=new Uint32Array(256); for(let i=0;i<N;i++) h[p[i*4+ch]]++;
      let acc=0; for(let v=0;v<256;v++){ acc+=h[v]; if(acc>=N*0.95){ hi[ch]=Math.max(1,v); break; } }
    }
    const gray=new Float32Array(N), chroma=new Float32Array(N), gh=new Uint32Array(256);
    for(let i=0;i<N;i++){
      const r=Math.min(255,p[i*4]*255/hi[0]), g=Math.min(255,p[i*4+1]*255/hi[1]), b=Math.min(255,p[i*4+2]*255/hi[2]);
      const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      gray[i]=(r+g+b)/3; chroma[i]=(mx-mn)/Math.max(mx,1); gh[Math.min(255,Math.round(gray[i]))]++;
    }
    // 2. Pick the brightness that best separates paper from background (Otsu's method).
    let total=0; for(let v=0;v<256;v++) total+=v*gh[v];
    let wb=0, sb=0, bestVar=0, t=128;
    for(let v=0;v<256;v++){
      wb+=gh[v]; if(!wb) continue;
      const wf=N-wb; if(!wf) break;
      sb+=v*gh[v];
      const mb=sb/wb, mf=(total-sb)/wf, s=wb*wf*(mb-mf)*(mb-mf);
      if(s>bestVar){ bestVar=s; t=v; }
    }
    t=Math.max(90,t);
    const raw=new Uint8Array(N); for(let i=0;i<N;i++) if(gray[i]>t && chroma[i]<0.22) raw[i]=1;
    // 3. Shave one pixel off every edge, so specks in the background don't join onto the receipt.
    const mask=new Uint8Array(N);
    for(let yy=1;yy<sh-1;yy++) for(let xx=1;xx<sw-1;xx++){
      const i=yy*sw+xx; if(raw[i]&&raw[i-1]&&raw[i+1]&&raw[i-sw]&&raw[i+sw]) mask[i]=1;
    }
    // 4. The biggest connected bright area is the receipt.
    const seen=new Uint8Array(N); let best=null;
    for(let s=0;s<N;s++){
      if(!mask[s]||seen[s]) continue;
      const q=[s]; seen[s]=1; let n=0, x0=sw, y0=sh, x1=0, y1=0;
      while(q.length){
        const v=q.pop(), cx=v%sw, cy=(v/sw)|0; n++;
        if(cx<x0)x0=cx; if(cx>x1)x1=cx; if(cy<y0)y0=cy; if(cy>y1)y1=cy;
        const nb=[cx>0?v-1:-1, cx<sw-1?v+1:-1, cy>0?v-sw:-1, cy<sh-1?v+sw:-1];
        for(const u of nb){ if(u>=0 && mask[u] && !seen[u]){ seen[u]=1; q.push(u); } }
      }
      if(!best||n>best.n) best={n,x0,y0,x1,y1};
    }
    if(!best || best.n<N*0.04) return null;                // no clear paper: use the whole photo
    const k=W/sw, pad=3;
    const bx=Math.max(0,(best.x0-pad)*k), by=Math.max(0,(best.y0-pad)*k);
    const bw=Math.min(W,(best.x1+1+pad)*k)-bx, bh=Math.min(H,(best.y1+1+pad)*k)-by;
    if(bw*bh>W*H*0.92) return null;                         // paper already fills the photo
    return {x:bx,y:by,w:bw,h:bh};
  }catch(e){ return null; }
}
function prepImage(src){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{
      const box=findPaper(img) || {x:0,y:0,w:img.naturalWidth,h:img.naturalHeight};
      // Receipt text needs to be big enough: aim for about 1600px wide, never more than 2000px tall (bigger makes the reader split names from prices).
      const sc=Math.min(1600/box.w, 2000/box.h, box.w<1600?3:1);
      const w=Math.round(box.w*sc), h=Math.round(box.h*sc);
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,w,h); x.drawImage(img,box.x,box.y,box.w,box.h,0,0,w,h);
      const d=x.getImageData(0,0,w,h), p=d.data;
      for(let i=0;i<p.length;i+=4){ let g=0.299*p[i]+0.587*p[i+1]+0.114*p[i+2]; g=(g-128)*1.5+128; g=g<0?0:g>255?255:g; p[i]=p[i+1]=p[i+2]=g; }
      x.putImageData(d,0,0);
      res({canvas:c, thumb:c.toDataURL("image/jpeg",0.6)});
    };
    img.onerror=()=>rej(new Error("Could not open image"));
    img.src=src;
  });
}
function setOcr(progress,msg){
  if(!UI.ocr) return;
  if(progress!=null) UI.ocr.progress=progress;
  UI.ocr.msg=msg;
  const b=$("#ocrBar"), t=$("#ocrMsg");
  if(b) b.style.width=Math.round((UI.ocr.progress||0)*100)+"%";
  if(t) t.textContent=msg+(progress!=null?" "+Math.round(progress*100)+"%":"");
}
async function scanPhoto(src, revoke){
  UI.ocr={status:"loading",progress:0,msg:"Getting the photo reader ready…",thumb:null};
  UI.parsed=null; render();
  try{
    const {canvas,thumb}=await prepImage(src);
    if(revoke) URL.revokeObjectURL(src);
    UI.ocr.thumb=thumb; render();
    await loadTesseract();
    const worker=await Tesseract.createWorker("eng",1,{logger:m=>{
      if(m.status==="recognizing text") setOcr(m.progress,"Reading your receipt…");
    }});
    // Read the receipt as one column of lines, keeping each item name next to its price.
    try{ await worker.setParameters({tessedit_pageseg_mode:"4", preserve_interword_spaces:"1"}); }catch(e){}
    const {data:{text}}=await worker.recognize(canvas);
    await worker.terminate();
    UI.receipt=(text||"").trim();
    UI.parsed=parseReceipt(UI.receipt);
    UI.ocr={status:"done",thumb};
    render();
    toast(UI.parsed.found.length>=2?`Found ${UI.parsed.found.length} grocery items. Check them below.`:"Only a little was readable. Try cropping the photo to just the receipt, in good light.");
  }catch(err){
    console.error(err);
    UI.ocr={status:"error"}; render();
  }
}

/* ---------- Recipes ---------- */
function scoreRecipe(r){
  const have=r.ing.filter(k=>haveKey(k));
  const missing=r.ing.filter(k=>!haveKey(k));
  const urgent=have.map(k=>haveKey(k)).filter(i=>daysLeft(i.exp)<=3);
  const score=urgent.length*3 + (have.length/r.ing.length)*4 - missing.length*0.6;
  return {r, have, missing, urgent, score};
}
function renderRecipes(){
  let list=RECIPES.map(scoreRecipe);
  if(UI.pref==="veg") list=list.filter(x=>x.r.veg);
  if(UI.pref==="quick") list=list.filter(x=>x.r.t<=20);
  if(UI.pref==="soon") list=list.filter(x=>x.urgent.length>0);
  list.sort((a,b)=>b.score-a.score);
  const chips=[["soon","Uses expiring food"],["all","All recipes"],["veg","Vegetarian"],["quick","20 min or less"]];
  return `${pageHead("Good food, already in your fridge","Something good <em>is cooking.</em>","Recipes that use your soon-to-expire food come first.")}
  <div class="chips" role="group" aria-label="Recipe filter">${chips.map(([k,l])=>`<button class="fchip" data-act="pref" data-pref="${k}" aria-pressed="${UI.pref===k}">${l}</button>`).join("")}</div>
  <div class="stack" style="margin-top:14px">
  ${list.length?list.map(recipeCard).join(""):`<div class="empty">No recipes match this filter. Try "All recipes".</div>`}
  </div>`;
}
function recipeCard(x){
  const {r,have,missing,urgent}=x;
  const inShop=k=>S.shop.some(s=>s.k===k && !s.done);
  const toAdd=missing.filter(k=>!inShop(k));
  const pct=Math.round(have.length/r.ing.length*100);
  const cooking=UI.cooking===r.n;
  const cook = cooking ? `<div class="cookpanel">
      <div class="small muted" style="margin-bottom:4px">Which items did you finish? Leftovers stay in your fridge.</div>
      ${have.map(k=>{const i=haveKey(k); const d=daysLeft(i.exp); return `<label class="check"><input type="checkbox" data-cook="${i.id}" ${d<=3?"checked":""}> ${i.e} ${esc(i.name)} <span class="chip ${status(d).cls}" style="margin-left:auto">${status(d).txt}</span></label>`;}).join("")}
      <div class="row" style="margin-top:6px"><button class="btn primary" data-act="cookDone">Done cooking</button><button class="btn ghost" data-act="cookCancel">Cancel</button></div>
    </div>` : "";
  return `<article class="card recipe stack">${RPHOTO[r.n]?`<img class="rphoto" src="${RPHOTO[r.n]}" alt="${esc(r.n)}">`:""}
    <div class="row"><h3 class="grow">${esc(r.n)}</h3><span class="chip neutral">${r.t} min${r.veg?" · veg":""}</span></div>
    ${urgent.length?`<div class="uses"><b>Uses ${urgent.length} expiring:</b> ${urgent.map(i=>esc(i.name)+" ("+status(daysLeft(i.exp)).txt.toLowerCase()+")").join(", ")}</div>`:""}
    <div class="row small"><span class="grow">You have <b>${have.length} of ${r.ing.length}</b> ingredients</span><span class="muted tnum">${pct}%</span></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="ing">${r.ing.map(k=>`<span class="${haveKey(k)?"":"miss"}">${FOOD[k].e} ${esc(FOOD[k].n.replace(/ \(.*\)/,""))}</span>`).join("")}</div>
    ${missing.length?`<div class="small muted">Need to buy: <b style="color:var(--ink)">${missing.map(k=>esc(FOOD[k].n.replace(/ \(.*\)/,""))).join(", ")}</b>. Only these go on your list, so you don't double-buy.</div>`:`<div class="small" style="color:var(--ok);font-weight:600">You have everything. Nothing to buy.</div>`}
    ${cooking?"":`<div class="row">
      <button class="btn primary sm" data-act="cook" data-r="${esc(r.n)}" ${have.length?"":"disabled"}>Cook this</button>
      ${missing.length?`<button class="btn sm" data-act="addMissing" data-r="${esc(r.n)}" ${toAdd.length?"":"disabled"}>${toAdd.length?"Add "+toAdd.length+" missing to list":"Missing items on list"}</button>`:""}
    </div>`}
    ${cook}
  </article>`;
}

/* ---------- Shop ---------- */
function renderShop(){
  const open=S.shop.filter(s=>!s.done), done=S.shop.filter(s=>s.done);
  let warn="";
  if(UI.shopWarn){
    const w=UI.shopWarn, d=daysLeft(w.item.exp);
    warn=`<div class="alert warn"><div>You already have <b>${esc(w.item.name)}</b>${w.item.qty>1?" ×"+w.item.qty:""}. It ${d<0?"expired":"keeps for "+status(d).txt.replace(" left","")}. Still add it?</div>
      <div class="row"><button class="btn sm" data-act="shopSkip">Skip it</button><button class="btn sm ghost" data-act="shopForce">Add anyway</button></div></div>`;
  }
  let check="";
  if(UI.check){
    const c=UI.check;
    check = c.item
      ? `<div class="alert ok"><div><b>Yes, you have ${esc(c.item.name)}${c.item.loc==="freezer"?" in the freezer":""}.</b> ${daysLeft(c.item.exp)<0?"But it has expired.":"It's good for "+status(daysLeft(c.item.exp)).txt.replace(" left","")+". Skip buying it."}</div></div>`
      : `<div class="alert info"><div><b>No ${esc(c.q)} at home.</b> Go ahead and buy it.</div><div><button class="btn sm" data-act="checkAdd">Add ${esc(c.q)} to list</button></div></div>`;
  }
  return `${pageHead("Buy what you need. Nothing more.","Shop <em>smarter.</em>","FreshSplit warns you before you buy something you already have.")}
  <h2>Already have it?</h2>
  <form class="row" id="checkForm" autocomplete="off">
    <input class="input grow" id="checkQ" placeholder="Standing in the store? Try milk or eggs" aria-label="Check if you already have an item">
    <button class="btn primary" type="submit">Check</button>
  </form>
  ${check?`<div style="margin-top:10px">${check}</div>`:""}
  <h2>To buy <span class="count">${open.length}</span></h2>
  <form class="row" id="shopForm" autocomplete="off" style="margin-bottom:10px">
    <input class="input grow" id="shopName" placeholder="Add an item" aria-label="Add to shopping list">
    <button class="btn" type="submit">Add</button>
  </form>
  ${warn?`<div style="margin-bottom:10px">${warn}</div>`:""}
  <div class="stack">
    ${open.length?open.map(shopRow).join(""):`<div class="empty">Your list is empty. Recipes can add missing ingredients for you.</div>`}
  </div>
  ${done.length?`<h2>In the cart <span class="count">${done.length}</span></h2>
    <div class="stack">${done.map(shopRow).join("")}</div>
    <button class="btn primary" style="margin-top:12px;width:100%" data-act="moveBought">Put ${done.length} bought item${done.length===1?"":"s"} in the fridge</button>`:""}`;
}
function shopRow(s){
  const f=s.k?FOOD[s.k]:null;
  return `<div class="shop-row ${s.done?"done":""}">
    <input type="checkbox" ${s.done?"checked":""} data-act="shopToggle" data-id="${s.id}" aria-label="Bought ${esc(s.name)}" style="width:20px;height:20px;accent-color:var(--accent)">
    <span aria-hidden="true">${f?f.e:"🛒"}</span>
    <span class="nm grow">${esc(s.name)}</span>
    ${s.from?`<span class="chip neutral">${esc(s.from)}</span>`:""}
    <button class="btn sm ghost" data-act="shopDel" data-id="${s.id}" aria-label="Remove ${esc(s.name)}">✕</button>
  </div>`;
}

/* ---------- Split ---------- */
function balances(){
  const net=Object.fromEntries(S.people.map(p=>[p,0]));
  S.purchases.forEach(p=>{
    if(!(p.buyer in net)) net[p.buyer]=0;
    net[p.buyer]+=p.price;
    const share=p.price/p.split.length;
    p.split.forEach(q=>{ if(!(q in net)) net[q]=0; net[q]-=share; });
  });
  return net;
}
function settleUp(net){
  const cred=[],debt=[];
  Object.entries(net).forEach(([p,v])=>{ if(v>0.005) cred.push([p,v]); else if(v<-0.005) debt.push([p,-v]); });
  cred.sort((a,b)=>b[1]-a[1]); debt.sort((a,b)=>b[1]-a[1]);
  const out=[]; let i=0,j=0;
  while(i<debt.length&&j<cred.length){
    const amt=Math.min(debt[i][1],cred[j][1]);
    out.push({from:debt[i][0],to:cred[j][0],amt});
    debt[i][1]-=amt; cred[j][1]-=amt;
    if(debt[i][1]<0.005) i++; if(cred[j][1]<0.005) j++;
  }
  return out;
}
function renderSplit(){
  const net=balances(), moves=settleUp(net);
  const total=S.purchases.reduce((a,p)=>a+p.price,0);
  return `${pageHead("Shared groceries. Simple math.","Good food. <em>Fair share.</em>","Housemates share one fridge and split the bill, down to the last cent. Everyone sees what's already at home, so nobody buys it twice.")}
  <h2>Housemates</h2>
  <div class="people">${S.people.map(p=>`<span class="person"><span class="av">${esc(initials(p))}</span>${esc(p)}</span>`).join("")}</div>
  <form class="row" id="personForm" autocomplete="off" style="margin-top:10px">
    <input class="input grow" id="personName" placeholder="Add a housemate" aria-label="Housemate name" maxlength="20">
    <button class="btn" type="submit">Add</button>
  </form>
  <h2>Who owes who</h2>
  <div class="card">
    ${moves.length?moves.map(m=>`<div class="settle"><span class="av">${esc(initials(m.from))}</span><b>${esc(m.from)}</b><span class="arrow">pays</span><b>${esc(m.to)}</b><b class="amt">${money(m.amt)}</b></div>`).join(""):`<div class="muted">Everyone is even.</div>`}
    <div class="small muted" style="margin-top:6px">${S.purchases.length} shared purchases · ${money(total)} total</div>
    ${S.purchases.length?`<button class="btn sm" style="margin-top:10px" data-act="settleAll">Mark everyone as paid</button>`:""}
  </div>
  <h2>Each person's balance</h2>
  <div class="card">${Object.entries(net).map(([p,v])=>`<div class="bal"><span class="row" style="gap:8px"><span class="av">${esc(initials(p))}</span>${esc(p)}</span><span class="chip ${v>0.005?"ok":v<-0.005?"bad":"neutral"}">${v>0.005?"gets back "+money(v):v<-0.005?"owes "+money(-v):"even"}</span></div>`).join("")}</div>
  <h2>Purchases <span class="count">${S.purchases.length}</span></h2>
  <p class="sub small" style="margin-top:-4px">Tap names to choose who shares each item. Only those people split its cost.</p>
  <div class="stack">${S.purchases.slice().reverse().map(purchaseRow).join("")||`<div class="empty">No purchases yet.</div>`}</div>`;
}
function purchaseRow(p){
  const n=p.split.length;
  const label = n===1 ? (p.split[0]===p.buyer ? "Personal" : "For "+p.split[0]) : money(p.price/n)+" each";
  return `<div class="buy">
    <div class="row"><span class="grow"><b>${esc(p.name)}</b><br><span class="small muted">Paid by ${esc(p.buyer)} · ${money(p.price)}</span></span>
      <span class="chip ${n===1?"neutral":"ok"}">${esc(label)}</span></div>
    <div class="pchips" role="group" aria-label="Who shares ${esc(p.name)}">${S.people.map((q,ix)=>`<button class="pchip" data-act="sharePerson" data-id="${p.id}" data-pi="${ix}" aria-pressed="${p.split.includes(q)}"><span class="av">${esc(initials(q))}</span>${esc(q)}</button>`).join("")}</div>
    <div class="quick"><button class="linkbtn" data-act="shareAll" data-id="${p.id}">Everyone</button><button class="linkbtn" data-act="shareOnly" data-id="${p.id}">Only ${esc(p.buyer)}</button></div>
  </div>`;
}

/* ---------- Impact ---------- */
function renderImpact(){
  const im=S.impact;
  const co2=im.rescuedKg*CO2_PER_KG;
  const weeks=S.history.concat([{label:S.weekLabel+" (now)",r:im.rescuedKg,t:im.tossedKg}]);
  const max=Math.max(3,...weeks.map(w=>Math.max(w.r,w.t)));
  const top=Math.ceil(max*1.15);
  const bars=weeks.map(w=>`<div class="wk"><i class="r" style="height:${w.r/top*100}%"><em>${kg(w.r)}</em></i><i class="t" style="height:${w.t/top*100}%"><em>${kg(w.t)}</em></i></div>`).join("");
  const rate = (im.usedKg+im.tossedKg)>0 ? Math.round(im.tossedKg/(im.usedKg+im.tossedKg)*100) : null;
  return `${pageHead("Every bite counts","Small bites. <em>Big impact.</em>",`Every kilogram of food you eat instead of throwing out avoids about ${CO2_PER_KG} kg of CO₂.`)}
  <div class="tiles">
    <div class="tile hero"><div class="v">${kg(co2)} kg CO₂</div><div class="l">avoided this week by rescuing food before it expired</div></div>
    <div class="tile"><div class="v">${kg(im.rescuedKg)} kg</div><div class="l">food rescued (${im.rescuedCount} item${im.rescuedCount===1?"":"s"})</div></div>
    <div class="tile"><div class="v">${money(im.saved)}</div><div class="l">groceries not wasted</div></div>
    <div class="tile"><div class="v">${kg(im.tossedKg)} kg</div><div class="l">food thrown out</div></div>
    <div class="tile"><div class="v">${rate==null?"—":rate+"%"}</div><div class="l">waste rate this week</div></div>
  </div>
  ${im.rescuedCount===0?`<div class="alert info" style="margin-top:12px"><div>Try it: go to <b>Recipes</b>, cook the omelette, and watch these numbers change.</div></div>`:""}
  <h2>Food rescued vs. thrown out (kg per week)</h2>
  <div class="card">
    <div class="chart" role="img" aria-label="Weekly kilograms of food rescued and thrown out">${bars}</div>
    <div class="xl">${weeks.map(w=>`<span>${esc(w.label)}</span>`).join("")}</div>
    <div class="legend"><span>Rescued</span><span class="t">Thrown out</span></div>
    <div class="small muted" style="margin-top:6px">Past weeks are sample data. This week updates live. Each gridline is ${+(top/4).toFixed(2)} kg.</div>
  </div>
  <h2>Why it matters</h2>
  <div class="card stack small">
    <div>Canadian households waste about <b>2.3 million tonnes</b> of edible food a year. That's equal to about <b>6.9 million tonnes of CO₂</b>, and it costs the average household <b>over $1,300 a year</b>.</div>
    <div class="src">Source: <a href="https://lovefoodhatewaste.ca/about/food-waste/" target="_blank" rel="noopener">Love Food Hate Waste Canada</a>, based on the National Zero Waste Council study. FreshSplit uses 6.9 ÷ 2.3 = ${CO2_PER_KG} kg CO₂ per kg of food.</div>
  </div>`;
}

/* ---------- Render ---------- */
const pageRouter = new PageRouter({
  fridge: new FridgePage(renderFridge),
  recipes: new RecipesPage(renderRecipes),
  shop: new ShopPage(renderShop),
  split: new SplitPage(renderSplit),
  impact: new ImpactPage(renderImpact)
});

function render(){
  const v=pageRouter.render(UI.tab);
  $("#view").innerHTML=v;
  renderTabs();
  if(UI.addMode==="type") bindAddForm();
  save();
}
function bindAddForm(){
  const n=$("#addName"), fz=$("#addFrz"); if(!n) return;
  const update=()=>{
    const f=findFood(n.value), name=n.value.trim();
    if(f && !$("#addPrice").value) $("#addPrice").placeholder=f.p.toFixed(2);
    if(fz.checked){
      const fd=freezeDays(f?f.k:null, f?f.c:null);
      if(fd==null){ fz.checked=false; $("#addHint").textContent=noFreezeMsg(f.k,f.c)+" We'll keep it in the fridge."; $("#addExp").value=addDays(f.d); return; }
      $("#addExp").value=addDays(fd);
      $("#addHint").innerHTML=`❄ In the freezer, ${f?`<b>${esc(f.n)}</b>`:"this"} keeps about <b>${Math.round(fd/30)} months</b>, until ${esc(fmtDate(addDays(fd)))}. Change the date if you like.`;
      return;
    }
    if(f){
      $("#addExp").value=addDays(f.d);
      $("#addHint").innerHTML=`${f.e} <b>${esc(f.n)}</b> usually keeps about <b>${f.d>60?Math.round(f.d/30)+" months":f.d+" days"}</b>. We set the use-by date to ${esc(fmtDate(addDays(f.d)))}. Change it to the date on the package if it's different.`;
    } else if(name){
      $("#addHint").textContent="We don't know this item yet, so we guessed 7 days. Set the date from the package.";
      $("#addExp").value=addDays(7);
    }
  };
  n.addEventListener("input",update);
  fz.addEventListener("change",update);
  n.focus();
}

/* ---------- Events ---------- */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return;
  const act=b.dataset.act, id=b.dataset.id;
  if(b.tagName==="INPUT") return; // handled on change
  switch(act){
    case "tab": UI.tab=b.dataset.tab; UI.cooking=null; UI.shopWarn=null; UI.check=null; render(); window.scrollTo(0,0); break;
    case "mode": UI.addMode=b.dataset.mode||null; UI.parsed=null; UI.ocr=null; render();
      if(b.classList.contains("scan-fab")) setTimeout(()=>{const c=$(".upload"); if(c) c.scrollIntoView({behavior:"smooth",block:"center"});},60);
      break;
    case "used": case "tossed": {
      const it=S.items.find(i=>i.id===id); if(!it) return;
      const d=daysLeft(it.exp);
      finishItem(it,act);
      toast(act==="used" ? (d<=3&&d>=-1 ? `Rescued ${it.name}: ${kg(it.kg*it.qty*CO2_PER_KG)} kg CO₂ avoided` : `Marked ${it.name} as used`) : `Logged ${it.name} as thrown out`);
      render(); break;
    }
    case "remove": {
      const idx=S.items.findIndex(i=>i.id===id); if(idx<0) return;
      const it=S.items[idx], total=it.price*it.qty;
      // also take it off the shared bill (the matching purchase, newest first)
      let pIdx=-1;
      for(let j=S.purchases.length-1;j>=0;j--){ const pu=S.purchases[j]; if(pu.name===it.name && pu.buyer===it.buyer && Math.abs(pu.price-total)<0.01){ pIdx=j; break; } }
      const pur = pIdx>=0 ? S.purchases.splice(pIdx,1)[0] : null;
      S.items.splice(idx,1);
      render();
      toast(`Removed ${it.name}. It won't count as waste.`, {label:"Undo", fn:()=>{
        S.items.splice(Math.min(idx,S.items.length),0,it);
        if(pur) S.purchases.splice(Math.min(pIdx,S.purchases.length),0,pur);
        render(); toast(`${it.name} is back in your fridge`);
      }});
      break;
    }
    case "freeze": {
      const it=S.items.find(i=>i.id===id); if(!it) return;
      const fd=freezeDays(it.k,it.c); if(fd==null){ toast(noFreezeMsg(it.k,it.c)); return; }
      const d=daysLeft(it.exp), w=it.kg*it.qty;
      let msg=`${it.name} is in the freezer. It keeps until ${fmtDate(addDays(fd))}.`;
      if(d>=0 && d<=3 && !it.rescued){
        S.impact.rescuedKg+=w; S.impact.saved+=it.price*it.qty; S.impact.rescuedCount++; it.rescued=true;
        if(S.log) S.log.push({d:iso(TODAY), r:w, t:0});
        msg+=` You rescued ${kg(w)} kg of food.`;
      }
      it.moveToFreezer(addDays(fd));
      toast(msg); render(); break;
    }
    case "thaw": {
      const it=S.items.find(i=>i.id===id); if(!it) return;
      const t=THAW[it.c]||2;
      it.moveToFridge(addDays(t));
      toast(`${it.name} is thawing in the fridge. Use it within ${t} days.`); render(); break;
    }
    case "rcSamplePhoto": scanPhoto(SAMPLE_PHOTO,false); break;
    case "rcSample": UI.ocr=null; UI.receipt=SAMPLE; UI.parsed=parseReceipt(SAMPLE); render(); break;
    case "rcRead": UI.receipt=$("#rcText").value; UI.parsed=parseReceipt(UI.receipt);
      if(!UI.receipt.trim()) toast("Paste receipt text first, or use the sample receipt");
      render(); break;
    case "rcAdd": {
      const buyer=$("#rcBuyer").value;
      const share=readShare("rcShare");
      const picks=[...document.querySelectorAll("[data-rc]")].filter(c=>c.checked).map(c=>UI.parsed.found[+c.dataset.rc]);
      picks.forEach(r=>{
        const it=new GroceryItem({id:uid(),k:r.f.k,name:r.f.n,e:r.f.e,c:r.f.c,exp:r.exp||addDays(r.f.d),loc:r.frozen?"freezer":"fridge",qty:1,price:r.price!=null?r.price:r.f.p,kg:r.f.kg,buyer});
        S.items.push(it);
        S.purchases.push({id:uid(),name:it.name,price:it.price,buyer,split:share.slice()});
      });
      UI.addMode=null; UI.parsed=null; UI.receipt=""; UI.ocr=null;
      toast(`Added ${picks.length} items with estimated use-by dates`); render(); break;
    }
    case "pref": UI.pref=b.dataset.pref; UI.cooking=null; render(); break;
    case "cook": UI.cooking=b.dataset.r; render(); break;
    case "cookCancel": UI.cooking=null; render(); break;
    case "cookDone": {
      const ids=[...document.querySelectorAll("[data-cook]")].filter(c=>c.checked).map(c=>c.dataset.cook);
      const before=S.impact.rescuedKg;
      ids.forEach(i=>{const it=S.items.find(x=>x.id===i); if(it) finishItem(it,"used");});
      const gained=S.impact.rescuedKg-before;
      UI.cooking=null;
      toast(gained>0?`Nice! You rescued ${kg(gained)} kg of food (${kg(gained*CO2_PER_KG)} kg CO₂)`:"Enjoy your meal!");
      render(); break;
    }
    case "addMissing": {
      const r=RECIPES.find(x=>x.n===b.dataset.r); if(!r) return;
      const miss=r.ing.filter(k=>!haveKey(k) && !S.shop.some(s=>s.k===k&&!s.done));
      miss.forEach(k=>S.shop.push({id:uid(),name:FOOD[k].n.replace(/ \(.*\)/,""),k,done:false,from:r.n}));
      toast(`Added ${miss.length} item${miss.length===1?"":"s"} to your shopping list`); render(); break;
    }
    case "shopDel": S.shop=S.shop.filter(s=>s.id!==id); render(); break;
    case "shopSkip": UI.shopWarn=null; toast("Skipped. You saved a duplicate buy."); render(); break;
    case "shopForce": { const w=UI.shopWarn; S.shop.push({id:uid(),name:w.name,k:w.k,done:false}); UI.shopWarn=null; render(); break; }
    case "checkAdd": { const c=UI.check; const f=findFood(c.q); S.shop.push({id:uid(),name:f?f.n.replace(/ \(.*\)/,""):c.q,k:f?f.k:null,done:false}); UI.check=null; toast("Added to your list"); render(); break; }
    case "moveBought": {
      const done=S.shop.filter(s=>s.done);
      done.forEach(s=>{
        const f=s.k?FOOD[s.k]:null;
        const it=new GroceryItem({id:uid(),k:f?f.k:null,name:f?f.n:s.name,e:f?f.e:"🛒",c:f?f.c:"other",exp:addDays(f?f.d:7),qty:1,price:f?f.p:0,kg:f?f.kg:0.5,buyer:"You"});
        S.items.push(it);
        if(it.price) S.purchases.push({id:uid(),name:it.name,price:it.price,buyer:"You",split:S.people.slice()});
      });
      S.shop=S.shop.filter(s=>!s.done);
      toast(`Moved ${done.length} item${done.length===1?"":"s"} into the fridge`); UI.tab="fridge"; render(); window.scrollTo(0,0); break;
    }
    case "pickShare": {
      const on=b.getAttribute("aria-pressed")==="true";
      if(on && b.parentElement.querySelectorAll('.pchip[aria-pressed="true"]').length===1){ toast("At least one person has to share it"); return; }
      b.setAttribute("aria-pressed",String(!on)); break;
    }
    case "sharePerson": {
      const p=S.purchases.find(x=>x.id===id), q=S.people[+b.dataset.pi]; if(!p||!q) return;
      if(p.split.includes(q)){
        if(p.split.length===1){ toast("At least one person has to share it"); return; }
        p.split=p.split.filter(x=>x!==q);
      } else p.split.push(q);
      render(); break;
    }
    case "shareAll": { const p=S.purchases.find(x=>x.id===id); if(p){ p.split=S.people.slice(); render(); } break; }
    case "shareOnly": { const p=S.purchases.find(x=>x.id===id); if(p){ p.split=[p.buyer]; render(); } break; }
    case "settleAll": S.purchases=[]; toast("Everyone is settled up"); render(); break;
    case "reset": try{repository.clear();}catch(err){} S=seed(); Object.assign(UI,{tab:"fridge",addMode:null,receipt:"",parsed:null,pref:"soon",cooking:null,shopWarn:null,check:null}); render(); toast("Demo reset to sample data"); window.scrollTo(0,0); break;
  }
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.id==="rcPhoto" && t.files && t.files[0]){
    if(!t.files[0].type.startsWith("image/")){ toast("Choose a photo (JPG or PNG) of your receipt"); t.value=""; return; }
    scanPhoto(URL.createObjectURL(t.files[0]),true); t.value=""; return;
  }
  if(t.dataset.rcfrz!=null && UI.parsed){
    const r=UI.parsed.found[+t.dataset.rcfrz]; if(!r) return;
    r.frozen=t.checked;
    r.exp=addDays(t.checked ? freezeDays(r.f.k,r.f.c) : r.f.d);
    const inp=document.querySelector(`[data-rcexp="${t.dataset.rcfrz}"]`);
    if(inp){ inp.value=r.exp; inp.parentElement.firstChild.textContent=t.checked?"Frozen until ":"Use by "; }
    return;
  }
  if(t.dataset.rcexp!=null && UI.parsed && t.value){ const r=UI.parsed.found[+t.dataset.rcexp]; if(r) r.exp=t.value; return; }
  if(t.dataset.rc!=null && UI.parsed){ const r=UI.parsed.found[+t.dataset.rc]; if(r) r.skip=!t.checked; return; }
  if(t.dataset.act==="exp" && t.value){ const it=inventory.findById(t.dataset.id); if(it){ it.updateExpiryDate(t.value); render(); toast("Use-by date updated"); } }
  if(t.dataset.act==="shopToggle"){ const s=S.shop.find(x=>x.id===t.dataset.id); if(s){ s.done=t.checked; render(); } }
});
document.addEventListener("submit",e=>{
  e.preventDefault();
  const f=e.target;
  if(f.id==="addForm"){
    const name=$("#addName").value.trim(); if(!name) return;
    const food=findFood(name);
    const qty=Math.max(1,parseInt($("#addQty").value)||1);
    const priceIn=$("#addPrice").value;
    const price=priceIn!==""?parseFloat(priceIn):(food?food.p:0);
    const buyer=$("#addBuyer").value;
    const share=readShare("addShare");
    const it=new GroceryItem({id:uid(),k:food?food.k:null,name:food&&food.n.toLowerCase().startsWith(name.toLowerCase().slice(0,3))?food.n:name,e:food?food.e:"🛒",c:food?food.c:"other",exp:$("#addExp").value||addDays(7),loc:$("#addFrz").checked?"freezer":"fridge",qty,price:qty?price/qty:price,kg:food?food.kg:0.5,buyer});
    S.items.push(it);
    if(price>0) S.purchases.push({id:uid(),name:it.name,price,buyer,split:share});
    UI.addMode=null; toast(`Added ${it.name}`); render();
  }
  if(f.id==="shopForm"){
    const name=$("#shopName").value.trim(); if(!name) return;
    const food=findFood(name);
    const have=food?S.items.find(i=>i.k===food.k && daysLeft(i.exp)>=1):null;
    const nm=food?food.n.replace(/ \(.*\)/,""):name;
    if(have){ UI.shopWarn={item:have,name:nm,k:food.k}; }
    else { S.shop.push({id:uid(),name:nm,k:food?food.k:null,done:false}); UI.shopWarn=null; }
    render(); setTimeout(()=>{const i=$("#shopName"); if(i) i.focus();},0);
  }
  if(f.id==="checkForm"){
    const q=$("#checkQ").value.trim(); if(!q) return;
    const food=findFood(q);
    const item=food?S.items.find(i=>i.k===food.k):S.items.find(i=>i.name.toLowerCase().includes(q.toLowerCase()));
    UI.check={q, item:item||null}; render();
  }
  if(f.id==="personForm"){
    const n=$("#personName").value.trim(); if(!n) return;
    if(S.people.some(p=>p.toLowerCase()===n.toLowerCase())){ toast(n+" is already a housemate"); return; }
    S.people.push(n); toast(`${n} joined the fridge. New purchases split ${S.people.length} ways.`); render();
  }
});

render();
})();
