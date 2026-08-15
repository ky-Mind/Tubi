import { CONFIG } from "./firebase-config.js";

const PRODUCTS_SEED = [
  {id:"p1",name:"Ayam Crispy Special",price:18000,rating:4.8,category:"Ayam",description:"Ayam crispy renyah dengan bumbu gurih.",image:""},
  {id:"p2",name:"Paket Hemat 1",price:22000,rating:4.9,category:"Paket",description:"Paket praktis untuk makan kenyang.",image:""},
  {id:"p3",name:"Mie Pedas Level",price:15000,rating:4.7,category:"Mie",description:"Mie gurih dengan pilihan tingkat pedas.",image:""},
  {id:"p4",name:"Es Teh Jumbo",price:7000,rating:4.8,category:"Minuman",description:"Es teh segar ukuran jumbo.",image:""}
];
const CATEGORIES=["Semua","Ayam","Paket","Mie","Minuman"];
const ICONS={
 home:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"/></svg>`,
 orders:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>`,
 heart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/></svg>`,
 user:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21c.8-4.1 3.2-6 7.5-6s6.7 1.9 7.5 6"/></svg>`,
 menu:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
 cart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/></svg>`,
 search:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>`,
 moon:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>`,
 sun:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
 location:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
 edit:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m14.5 6 3.5 3.5"/></svg>`,
 trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></svg>`,
 plus:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>`,
 logout:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 16l4-4-4-4M19 12H9"/></svg>`,
 settings:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19 13 .1-1-.1-1 2-1.6-2-3.4-2.4 1a8.5 8.5 0 0 0-1.7-1L14.5 3h-5L9 6a8.5 8.5 0 0 0-1.7 1L5 6 3 9.4 5 11a8.5 8.5 0 0 0-.1 1L5 13l-2 1.6L5 18l2.3-1a8.5 8.5 0 0 0 1.7 1l.5 3h5l.4-3a8.5 8.5 0 0 0 1.7-1l2.4 1 2-3.4L19 13Z"/></svg>`,
 check:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>`,
 close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
 google:`<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.35 12.2c0-.7-.06-1.37-.18-2H12v3.79h5.22a4.47 4.47 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.15Z"/><path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.55 0-4.71-1.72-5.49-4.03H3.27v2.5A9.74 9.74 0 0 0 12 21.5Z"/><path fill="#FBBC05" d="M6.51 13.61A5.86 5.86 0 0 1 6.2 12c0-.56.1-1.1.31-1.61v-2.5H3.27A9.5 9.5 0 0 0 2.25 12c0 1.53.37 2.98 1.02 4.11l3.24-2.5Z"/><path fill="#EA4335" d="M12 6.36c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.83 3.42 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.73 5.39l3.24 2.5C7.29 8.08 9.45 6.36 12 6.36Z"/></svg>`
};
const icon=k=>ICONS[k]||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const uid=(p="id")=>p+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);

const state={
 page:"home",query:"",category:"Semua",theme:localStorage.getItem("tubi_theme")||"light",
 user:null,profile:null,cart:read("tubi_cart",[]),products:read("tubi_products",PRODUCTS_SEED),
 orders:read("tubi_orders",[]),favorites:read("tubi_favorites",[]),drawer:false,modal:null,editing:null,
 installEvent:null,toast:"",loading:false
};
function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
function saveLocal(){write("tubi_cart",state.cart);write("tubi_products",state.products);write("tubi_orders",state.orders);write("tubi_favorites",state.favorites);write("tubi_theme",state.theme)}

let fb=null,auth=null,db=null,storage=null,unsubscribeProducts=null,unsubscribeOrders=null;
const firebaseReady=()=>CONFIG.firebase.apiKey && !CONFIG.firebase.apiKey.startsWith("PASTE_");
async function initFirebase(){
  if(!firebaseReady()) return;
  try{
    const [{initializeApp},{getAuth,onAuthStateChanged,getRedirectResult},{getFirestore,collection,onSnapshot,query,orderBy,limit},{getStorage}]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"),
      import("https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js")
    ]);
    fb=initializeApp(CONFIG.firebase);auth=getAuth(fb);db=getFirestore(fb);storage=getStorage(fb);
    try{await getRedirectResult(auth)}catch(e){console.warn("redirect result",e)}
    onAuthStateChanged(auth,u=>{
      state.user=u?{uid:u.uid,email:u.email||"",name:u.displayName||((u.email||"").split("@")[0]),photo:u.photoURL||""}:null;
      state.profile=state.user?read("profile_"+state.user.uid,{name:state.user.name,photo:state.user.photo,email:state.user.email}):null;
      if(state.user){subscribeProducts();subscribeOrders()}
      else{unsubscribeProducts?.();unsubscribeOrders?.();unsubscribeProducts=null;unsubscribeOrders=null}
      render();
    });
  }catch(e){console.error(e);showToast("Firebase gagal dimuat. Aplikasi tetap bisa dipakai dalam mode lokal.")}
}
function isAdmin(){return !!state.user && CONFIG.admins.some(x=>x.trim().toLowerCase()===String(state.user.email).trim().toLowerCase())}
function isConfigured(){return firebaseReady()}
async function googleLogin(){
  if(!isConfigured()){openModal("info",{title:"Firebase belum terhubung",body:"Config Firebase pada firebase-config.js masih berupa placeholder. Setelah Web App Config yang benar dimasukkan dan Google Sign-In diaktifkan, tombol ini akan bekerja."});return}
  try{
    const {GoogleAuthProvider,signInWithRedirect}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
    await signInWithRedirect(auth,new GoogleAuthProvider());
  }catch(e){console.error(e);showToast("Login Google gagal. Periksa Google Sign-In dan Authorized domains di Firebase.")}
}
async function logout(){
  if(!confirm("Yakin ingin keluar dari akun Google?"))return;
  try{if(auth){const {signOut}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");await signOut(auth)}}catch(e){console.error(e)}
  state.user=null;state.profile=null;state.page="profile";render();showToast("Kamu sudah keluar.")
}
async function subscribeProducts(){
  if(!db)return;
  try{
    const {collection,onSnapshot}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    unsubscribeProducts?.();
    unsubscribeProducts=onSnapshot(collection(db,"products"),snap=>{
      if(snap.empty){state.products=[...PRODUCTS_SEED];for(const p of state.products) upsertProductCloud(p)}
      else state.products=snap.docs.map(d=>({id:d.id,...d.data()}));
      saveLocal();render();
    },e=>console.warn("products listener",e));
  }catch(e){console.warn(e)}
}
async function subscribeOrders(){
  if(!db||!state.user)return;
  try{
    const {collection,query,where,onSnapshot,orderBy}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    unsubscribeOrders?.();
    const ref=isAdmin()?collection(db,"orders"):query(collection(db,"orders"),where("uid","==",state.user.uid));
    unsubscribeOrders=onSnapshot(ref,snap=>{
      state.orders=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
      saveLocal();render();
    },e=>console.warn("orders listener",e));
  }catch(e){console.warn(e)}
}
async function upsertProductCloud(p){
  if(!db)return;
  try{
    const {doc,setDoc}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    await setDoc(doc(db,"products",p.id),p,{merge:true});
  }catch(e){console.warn("seed product",e)}
}
async function saveProductCloud(p){
  if(!db)return false;
  try{
    const {doc,setDoc}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    await setDoc(doc(db,"products",p.id),p,{merge:true});return true;
  }catch(e){console.error(e);showToast("Produk tersimpan lokal, tetapi gagal sinkron ke Firebase.");return false}
}
async function deleteProductCloud(id){
  if(!db)return;
  try{const {doc,deleteDoc}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");await deleteDoc(doc(db,"products",id))}catch(e){console.error(e)}
}
async function uploadImage(file,path){
  if(!file)return "";
  if(!storage)return await fileToDataURL(file);
  try{
    const {ref,uploadBytes,getDownloadURL}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js");
    const r=ref(storage,path);await uploadBytes(r,file,{contentType:file.type});return await getDownloadURL(r);
  }catch(e){console.warn("storage upload",e);return await fileToDataURL(file)}
}
function fileToDataURL(file){return new Promise((res,rej)=>{if(!file)return res("");const r=new FileReader;r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
async function saveOrderCloud(order){
  if(!db)return false;
  try{
    const {collection,addDoc,serverTimestamp}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    const {id,...data}=order;await addDoc(collection(db,"orders"),{...data,createdAt:serverTimestamp()});return true;
  }catch(e){console.error(e);showToast("Pesanan tersimpan lokal, tetapi sinkronisasi Firebase gagal.");return false}
}
async function updateOrderStatus(id,status){
  if(!isAdmin())return;
  if(db){
    try{const {doc,updateDoc}=await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");await updateDoc(doc(db,"orders",id),{status})}catch(e){console.error(e)}
  }
  state.orders=state.orders.map(o=>o.id===id?{...o,status}:o);saveLocal();render();
}
function productList(){
  return state.products.filter(p=>(state.category==="Semua"||p.category===state.category)&&p.name.toLowerCase().includes(state.query.toLowerCase()));
}
function currentName(){return state.profile?.name||state.user?.name||"Pengguna Tubi"}
function avatarHTML(user,large=false){
  const cls=large?"avatar-lg":"avatar-sm";const src=user?.photo||state.profile?.photo||"";
  return `<div class="${cls}">${src?`<img src="${esc(src)}" alt="">`:icon("user")}</div>`
}
function render(){
  document.documentElement.dataset.theme=state.theme;
  document.title=CONFIG.appName||"Tubi";
  const admin=isAdmin();
  document.querySelector("#app").innerHTML=`
  <div class="app">
    ${topbar(admin)}
    ${state.page==="home"?home():state.page==="orders"?ordersPage():state.page==="favorites"?favoritesPage():state.page==="profile"?profilePage():state.page==="cart"?cartPage():state.page==="admin"&&admin?adminPage():home()}
    ${bottomNav()}
    ${state.drawer?drawer(admin):""}
    ${state.modal?modalHTML():""}
    ${state.installEvent?installBanner():""}
    ${state.toast?`<div class="toast">${esc(state.toast)}</div>`:""}
  </div>`;
  bind();
}
function topbar(admin){
  return `<header class="topbar">
    <button class="icon-btn menu-mobile" data-action="drawer" aria-label="Menu">${icon("menu")}</button>
    <button class="brand" data-page="home"><img src="./assets/icon.svg" alt="Tubi"><span class="brand-copy">Tubi<small>Pesan dengan nyaman</small></span></button>
    <nav class="desktop-nav">
      ${navButton("home","Beranda")}
      ${navButton("orders","Pesanan")}
      ${navButton("favorites","Favorit")}
      ${navButton("profile","Akun")}
      ${admin?navButton("admin","Admin"): ""}
    </nav>
    <span class="spacer"></span>
    <button class="icon-btn" data-action="theme" title="Ganti mode">${icon(state.theme==="dark"?"sun":"moon")}</button>
    <button class="icon-btn" data-page="cart" aria-label="Keranjang">${icon("cart")}<span class="badge">${state.cart.reduce((a,x)=>a+(x.qty||1),0)}</span></button>
  </header>`;
}
function navButton(page,label){return `<button class="${state.page===page?"active":""}" data-page="${page}">${label}</button>`}
function bottomNav(){return `<nav class="bottom-nav">${[["home","Beranda"],["orders","Pesanan"],["favorites","Favorit"],["profile","Akun"]].map(([p,l])=>`<button class="nav-item ${state.page===p?"active":""}" data-page="${p}"><span class="nav-icon">${icon(p==="favorites"?"heart":p==="profile"?"user":p)}</span><span>${l}</span></button>`).join("")}</nav>`}
function home(){
  const list=productList();
  return `<main class="main">
    <section class="hero"><div class="hero-content"><span class="eyebrow">Selamat datang di</span><h1>Tubi</h1><p>Pesan makanan favoritmu dengan pengalaman yang rapi, cepat, dan nyaman.</p></div></section>
    <div class="search-wrap"><div class="search">${icon("search")}<input id="search" value="${esc(state.query)}" placeholder="Cari makanan atau minuman..."></div></div>
    <section class="section"><div class="section-head"><h2>Kategori</h2><button class="link" data-category="Semua">Lihat semua</button></div><div class="categories">${CATEGORIES.map(c=>categoryButton(c)).join("")}</div></section>
    <section class="section"><div class="section-head"><h2>Menu pilihan</h2><span class="muted">${list.length} produk</span></div><div class="products">${list.map(productCard).join("")||empty("Belum ada produk","Coba ganti pencarian atau kategori.")}</div></section>
  </main>`;
}
function categoryButton(c){
  const names={Semua:"Semua",Ayam:"Ayam",Paket:"Paket",Mie:"Mie",Minuman:"Minuman"};
  return `<button class="category ${state.category===c?"active":""}" data-category="${c}"><div class="category-icon">${c==="Semua"?icon("home"):icon("orders")}</div><b>${names[c]}</b></button>`
}
function productCard(p){
  const fav=state.favorites.includes(p.id);
  return `<article class="product"><div class="product-photo">${p.image?`<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<span class="placeholder-photo">${icon("orders")}</span>`}</div><div class="product-info"><h3>${esc(p.name)}</h3><div class="desc">${esc(p.description||"")}</div><div class="rating">★ ${esc(p.rating||"5.0")} · Siap dipesan</div><div class="price">${money(p.price)}</div><div class="actions"><button class="btn btn-primary" data-add="${esc(p.id)}">${icon("plus")} Tambah</button><button class="btn btn-ghost" data-fav="${esc(p.id)}" title="Favorit">${icon("heart")}</button></div></div></article>`
}
function empty(title,text){return `<div class="card empty"><div class="empty-icon">${icon("search")}</div><b>${esc(title)}</b><p class="muted">${esc(text)}</p></div>`}
function profilePage(){
  const u=state.user;
  return `<main class="main"><div class="page-title"><div><h1>Profil</h1><div class="muted">Kelola informasi akun Tubi.</div></div></div>
  <div class="profile-grid"><section class="card profile-card">${avatarHTML(u,true)}<p class="profile-name">${esc(currentName())}</p><p class="profile-email">${esc(u?.email||"Belum masuk")}</p><div class="actions" style="justify-content:center">${u?`<button class="btn btn-primary" data-action="editProfile">${icon("edit")} Edit profil</button><button class="btn btn-ghost" data-action="logout">${icon("logout")} Keluar</button>`:`<button class="btn btn-primary" data-action="login">${icon("google")} Masuk dengan Google</button>`}</div></section>
  <section class="card"><h3 style="margin-top:0">Akun & akses</h3>${u?`<div class="order-row"><span>Status</span><b>${isAdmin()?"Admin Tubi":"Pengguna"}</b></div><div class="order-row"><span>Pesanan</span><b>${state.orders.length}</b></div><div class="order-row"><span>Favorit</span><b>${state.favorites.length}</b></div><hr style="border:0;border-top:1px solid var(--line);margin:12px 0"><button class="btn btn-ghost" data-action="theme">${icon(state.theme==="dark"?"sun":"moon")} Mode ${state.theme==="dark"?"terang":"gelap"}</button>`:`<p class="muted">Masuk dengan Google untuk mengakses pesanan, favorit, profil, dan fitur akun.</p><button class="btn btn-primary" data-action="login">${icon("google")} Masuk dengan Google</button>`}</section></div></main>`
}
function favoritesPage(){
  const list=state.products.filter(p=>state.favorites.includes(p.id));
  return `<main class="main"><div class="page-title"><div><h1>Favorit</h1><div class="muted">Menu yang kamu simpan.</div></div></div><div class="products">${list.map(productCard).join("")||empty("Belum ada favorit","Tekan ikon hati pada menu yang kamu suka.")}</div></main>`
}
function cartPage(){
  const total=state.cart.reduce((a,x)=>a+x.price*x.qty,0);
  return `<main class="main"><div class="page-title"><div><h1>Keranjang</h1><div class="muted">${state.cart.length} jenis menu</div></div><button class="btn btn-ghost" data-page="home">Tambah menu</button></div>${state.cart.length?`<div class="order-list">${state.cart.map(cartItem).join("")}</div><section class="card" style="margin-top:14px"><div class="order-row"><span>Subtotal</span><b>${money(total)}</b></div><div class="order-row"><span>Biaya layanan</span><b>${money(0)}</b></div><hr style="border:0;border-top:1px solid var(--line);margin:8px 0"><div class="order-row"><b>Total</b><b>${money(total)}</b></div><button class="btn btn-primary" style="width:100%;margin-top:12px" data-action="checkout" ${state.user?"":"disabled"}>${state.user?"Lanjut ke konfirmasi":"Masuk Google untuk memesan"}</button>${!state.user?`<button class="btn btn-ghost" style="width:100%;margin-top:8px" data-action="login">${icon("google")} Masuk dengan Google</button>`:""}</section>`:empty("Keranjang masih kosong","Pilih menu di Beranda lalu tekan Tambah.")}</main>`
}
function cartItem(i){return `<section class="card"><div class="order-head"><b>${esc(i.name)}</b><b>${money(i.price*i.qty)}</b></div><div class="muted" style="font-size:12px;margin-top:4px">${money(i.price)} / item</div><div class="actions"><button class="btn btn-ghost" data-qty="${i.id}" data-delta="-1">−</button><span style="padding:10px 6px;font-weight:900">${i.qty}</span><button class="btn btn-ghost" data-qty="${i.id}" data-delta="1">+</button><button class="btn btn-danger" data-remove-cart="${i.id}">Hapus</button></div></section>`}
function ordersPage(){
  if(!state.user)return `<main class="main"><div class="page-title"><div><h1>Pesanan saya</h1><div class="muted">Masuk untuk melihat pesanan.</div></div></div><section class="card empty"><div class="empty-icon">${icon("orders")}</div><b>Belum masuk</b><p class="muted">Masuk dengan Google untuk membuat dan melihat pesanan.</p><button class="btn btn-primary" data-action="login">${icon("google")} Masuk dengan Google</button></section></main>`;
  const mine=isAdmin()?state.orders:state.orders.filter(o=>o.uid===state.user.uid||o.email===state.user.email);
  return `<main class="main"><div class="page-title"><div><h1>Pesanan saya</h1><div class="muted">${mine.length} pesanan</div></div></div><div class="order-list">${mine.map(orderCard).join("")||empty("Belum ada pesanan","Pesanan yang kamu buat akan muncul di sini.")}</div></main>`
}
function statusClass(s){return s==="Dibatalkan"?"cancelled":s==="Selesai"?"":"pending"}
function orderCard(o){
  return `<section class="card"><div class="order-head"><div><b>Pesanan #${esc(String(o.id).slice(-7))}</b><div class="muted" style="font-size:12px;margin-top:3px">${new Date(o.createdAt?.seconds?o.createdAt.seconds*1000:o.createdAt||Date.now()).toLocaleString("id-ID")}</div></div><span class="order-status ${statusClass(o.status)}">${esc(o.status||"Baru")}</span></div><div class="order-items">${(o.items||[]).map(i=>`<div class="order-row"><span>${esc(i.name)} × ${i.qty}</span><b>${money(i.price*i.qty)}</b></div>`).join("")}</div><div class="order-row"><span>Total</span><b>${money(o.total)}</b></div>${o.recipient?`<div class="location-box"><b>Penerima</b><span>${esc(o.recipient.name||"-")} · ${esc(o.recipient.phone||"Nomor tidak diisi")}</span></div>`:""}${o.location?`<div class="location-box"><b>Lokasi pengantaran</b><span>${esc(o.location.label||"Lokasi GPS pelanggan")}</span><br><a class="btn btn-soft" style="margin-top:9px;text-decoration:none" target="_blank" rel="noopener" href="${esc(o.location.maps)}">${icon("location")} Buka Google Maps</a></div>`:""}</section>`
}
function adminPage(){
  const total=state.orders.reduce((a,o)=>a+Number(o.total||0),0);
  return `<main class="main"><div class="page-title"><div><h1>Dashboard Admin</h1><div class="muted">Area khusus ${esc(state.user?.email||"admin")}.</div></div><button class="btn btn-primary" data-action="newProduct">${icon("plus")} Tambah produk</button></div>
  <div class="admin-stats"><div class="stat"><small>Produk</small><strong>${state.products.length}</strong></div><div class="stat"><small>Pesanan</small><strong>${state.orders.length}</strong></div><div class="stat"><small>Pesanan baru</small><strong>${state.orders.filter(o=>o.status==="Baru").length}</strong></div><div class="stat"><small>Nilai pesanan</small><strong>${money(total)}</strong></div></div>
  <div class="admin-grid"><section class="card"><div class="section-head"><h2>Produk</h2><span class="muted">${state.products.length}</span></div><div class="admin-products">${state.products.map(adminProduct).join("")}</div></section><section><div class="section-head"><h2>Pesanan masuk</h2><span class="muted">Realtime bila Firebase aktif</span></div><div class="order-list">${state.orders.map(adminOrder).join("")||empty("Belum ada pesanan","Pesanan pelanggan akan tampil di sini.")}</div></section></div></main>`
}
function adminProduct(p){
  return `<div class="admin-product"><img src="${esc(p.image||"./assets/icon.svg")}" alt=""><div class="admin-product-info"><b>${esc(p.name)}</b><span class="muted">${esc(p.category)} · ${money(p.price)}</span></div><button class="icon-btn" data-edit="${p.id}" title="Edit">${icon("edit")}</button><button class="icon-btn" data-delete="${p.id}" title="Hapus">${icon("trash")}</button></div>`
}
function adminOrder(o){
  return `<section class="card"><div class="order-head"><div><b>#${esc(String(o.id).slice(-7))}</b><div class="muted" style="font-size:12px">${esc(o.recipient?.name||o.name||o.email||"Pelanggan")}</div></div><span class="order-status ${statusClass(o.status)}">${esc(o.status||"Baru")}</span></div><div class="order-items">${(o.items||[]).map(i=>`<div class="order-row"><span>${esc(i.name)} × ${i.qty}</span><b>${money(i.price*i.qty)}</b></div>`).join("")}</div><div class="order-row"><b>Total</b><b>${money(o.total)}</b></div>${o.location?`<div class="location-box"><b>Lokasi pelanggan</b><a class="btn btn-soft" style="margin-top:7px;text-decoration:none" target="_blank" rel="noopener" href="${esc(o.location.maps)}">${icon("location")} Lihat titik</a></div>`:""}<div class="actions">${["Baru","Diproses","Siap diantar","Selesai","Dibatalkan"].map(s=>`<button class="btn ${o.status===s?"btn-primary":"btn-ghost"}" data-status="${o.id}" data-value="${s}">${s}</button>`).join("")}</div></section>`
}
function drawer(admin){
  return `<div class="drawer-back" data-action="closeDrawer"><aside class="drawer" data-stop><div class="drawer-head"><button class="brand" data-page="home"><img src="./assets/icon.svg" alt="Tubi"><span class="brand-copy">Tubi<small>Menu aplikasi</small></span></button><button class="icon-btn" data-action="closeDrawer">${icon("close")}</button></div>${state.user?`<div class="drawer-user">${avatarHTML(state.user)}<div style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(currentName())}</b><span class="muted" style="font-size:12px">${isAdmin()?"Admin Tubi":esc(state.user.email)}</span></div></div>`:""}<div class="drawer-list">${[["home","Beranda","home"],["orders","Pesanan saya","orders"],["favorites","Favorit","heart"],["profile","Profil","user"],["cart","Keranjang","cart"]].map(x=>`<button class="drawer-item" data-page="${x[0]}">${icon(x[2])}<span>${x[1]}</span></button>`).join("")}${admin?`<button class="drawer-item" data-page="admin">${icon("settings")}<span>Dashboard Admin</span></button>`:""}<button class="drawer-item" data-action="theme">${icon(state.theme==="dark"?"sun":"moon")}<span>Mode ${state.theme==="dark"?"terang":"gelap"}</span></button>${state.user?`<button class="drawer-item" data-action="logout">${icon("logout")}<span>Keluar dari Google</span></button>`:`<button class="drawer-item" data-action="login">${icon("google")}<span>Masuk dengan Google</span></button>`}</div></aside></div>`
}
function modalHTML(){
  if(state.modal.type==="info")return `<div class="modal-back"><div class="modal"><h2>${esc(state.modal.title)}</h2><p class="muted">${esc(state.modal.body)}</p><div class="modal-actions"><button class="btn btn-primary" data-action="closeModal">Mengerti</button></div></div></div>`;
  if(state.modal.type==="product"){
    const p=state.editing||{};
    return `<div class="modal-back"><div class="modal"><h2>${p.id?"Edit produk":"Tambah produk"}</h2><p class="muted">Foto, harga, kategori, dan deskripsi tersimpan bersama produk.</p><form id="product-form" class="form-grid"><div class="field"><label>Nama produk</label><input name="name" required value="${esc(p.name||"")}"></div><div class="two-col"><div class="field"><label>Harga</label><input name="price" type="number" min="0" required value="${p.price||""}"></div><div class="field"><label>Kategori</label><select name="category">${CATEGORIES.filter(x=>x!=="Semua").map(c=>`<option ${p.category===c?"selected":""}>${c}</option>`).join("")}</select></div></div><div class="field"><label>Deskripsi</label><textarea name="description" placeholder="Contoh: Ayam crispy dengan saus spesial.">${esc(p.description||"")}</textarea></div><div class="field"><label>Foto produk</label><input name="image" type="file" accept="image/*"><small class="muted">Foto akan diunggah ke Firebase Storage bila tersedia; jika tidak, diproses lokal.</small></div><div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="closeModal">Batal</button><button class="btn btn-primary" type="submit">Simpan produk</button></div></form></div></div>`
  }
  if(state.modal.type==="profile"){
    const p=state.profile||state.user||{};
    return `<div class="modal-back"><div class="modal"><h2>Edit profil</h2><form id="profile-form" class="form-grid"><div class="field"><label>Nama tampilan</label><input name="name" required value="${esc(p.name||"")}"></div><div class="field"><label>Foto profil</label><input name="photo" type="file" accept="image/*"></div><div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="closeModal">Batal</button><button class="btn btn-primary">Simpan profil</button></div></form></div></div>`
  }
  if(state.modal.type==="checkout"){
    const total=state.cart.reduce((a,x)=>a+x.price*x.qty,0);
    return `<div class="modal-back"><div class="modal"><h2>Konfirmasi pesanan</h2><p class="muted">Periksa nama penerima dan titik pengantaran sebelum membuat pesanan.</p><form id="checkout-form" class="form-grid"><div class="two-col"><div class="field"><label>Nama penerima</label><input name="recipient" required value="${esc(currentName())}"></div><div class="field"><label>Nomor telepon</label><input name="phone" inputmode="tel" placeholder="08xxxxxxxxxx"></div></div><div class="field"><label>Alamat / catatan lokasi</label><textarea name="address" placeholder="Contoh: rumah pagar putih, dekat minimarket..."></textarea></div><button type="button" class="btn btn-soft" id="location-btn">${icon("location")} Ambil titik lokasi GPS</button><div id="location-status" class="muted" style="font-size:12px">Lokasi belum diambil. Kamu tetap bisa menyimpan alamat manual.</div><div class="card"><div class="order-row"><span>Total pesanan</span><b>${money(total)}</b></div></div><div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="closeModal">Batal</button><button class="btn btn-primary" type="submit">Buat pesanan</button></div></form></div></div>`
  }
}
function installBanner(){return `<div class="install-banner"><img src="./assets/icon-192.png" width="44" height="44" style="border-radius:13px" alt=""><div class="copy"><b>Pasang Tubi di perangkat</b><span>Akses seperti aplikasi dari layar utama.</span></div><button class="btn btn-primary" data-action="install">Pasang</button><button class="icon-btn" data-action="dismissInstall">${icon("close")}</button></div>`}
function openModal(type,data={}){state.modal={type,...data};render()}
function showToast(t){state.toast=t;render();setTimeout(()=>{if(state.toast===t){state.toast="";render()}},2600)}
function addToCart(id){const p=state.products.find(x=>x.id===id);if(!p)return;const old=state.cart.find(x=>x.id===id);old?old.qty++:state.cart.push({...p,qty:1});saveLocal();render();showToast(`${p.name} ditambahkan ke keranjang.`)}
function toggleFav(id){state.favorites=state.favorites.includes(id)?state.favorites.filter(x=>x!==id):[...state.favorites,id];saveLocal();render()}
function changeQty(id,d){const item=state.cart.find(x=>x.id===id);if(!item)return;item.qty+=d;if(item.qty<=0)state.cart=state.cart.filter(x=>x.id!==id);saveLocal();render()}
function removeCart(id){state.cart=state.cart.filter(x=>x.id!==id);saveLocal();render()}
async function saveProduct(e){
  e.preventDefault();if(!isAdmin())return;
  const f=e.target,p=state.editing||{};
  const file=f.image.files[0];const image=file?await uploadImage(file,`products/${uid("product")}-${file.name.replace(/[^a-z0-9._-]/gi,"_")}`):(p.image||"");
  const product={id:p.id||uid("p"),name:f.name.value.trim(),price:Number(f.price.value),category:f.category.value,description:f.description.value.trim(),rating:p.rating||5,image};
  state.products=p.id?state.products.map(x=>x.id===p.id?product:x):[...state.products,product];
  saveLocal();await saveProductCloud(product);state.editing=null;state.modal=null;render();showToast("Produk berhasil disimpan.");
}
async function deleteProduct(id){
  if(!isAdmin())return;if(!confirm("Hapus produk ini dari katalog?"))return;
  state.products=state.products.filter(p=>p.id!==id);saveLocal();await deleteProductCloud(id);render();showToast("Produk dihapus.")
}
async function saveProfile(e){
  e.preventDefault();if(!state.user)return;
  const f=e.target,file=f.photo.files[0];const photo=file?await uploadImage(file,`profiles/${state.user.uid}-${Date.now()}`):(state.profile?.photo||state.user.photo||"");
  state.profile={name:f.name.value.trim(),photo,email:state.user.email};write("profile_"+state.user.uid,state.profile);state.modal=null;render();showToast("Profil diperbarui.");
}
function getGPS(){
  return new Promise(resolve=>{
    if(!navigator.geolocation)return resolve(null);
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude,lon=pos.coords.longitude;
      resolve({lat,lon,label:`Titik GPS ${lat.toFixed(5)}, ${lon.toFixed(5)}`,maps:`https://www.google.com/maps?q=${lat},${lon}`});
    },()=>resolve(null),{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  })
}
async function submitCheckout(e){
  e.preventDefault();if(!state.user||!state.cart.length)return;
  const f=e.target;const location=await getGPS();
  const total=state.cart.reduce((a,x)=>a+x.price*x.qty,0);
  const order={uid:state.user.uid,email:state.user.email,name:currentName(),recipient:{name:f.recipient.value.trim(),phone:f.phone.value.trim()},address:f.address.value.trim(),location,items:state.cart.map(x=>({id:x.id,name:x.name,price:x.price,qty:x.qty})),total,status:"Baru",createdAt:Date.now()};
  state.orders=[order,...state.orders];state.cart=[];saveLocal();await saveOrderCloud(order);state.modal=null;state.page="orders";render();showToast("Pesanan berhasil dibuat.");
}
function action(e){
  const a=e.currentTarget.dataset.action;
  if(a==="drawer")state.drawer=true;
  if(a==="closeDrawer")state.drawer=false;
  if(a==="theme"){state.theme=state.theme==="dark"?"light":"dark";saveLocal()}
  if(a==="login")googleLogin();
  if(a==="logout")logout();
  if(a==="closeModal")state.modal=null;
  if(a==="editProfile")openModal("profile");
  if(a==="newProduct"){state.editing=null;openModal("product")}
  if(a==="checkout")openModal("checkout");
  if(a==="install")installApp();
  if(a==="dismissInstall"){state.installEvent=null;render()}
  render();
}
function bind(){
  document.querySelectorAll("[data-page]").forEach(el=>el.addEventListener("click",()=>{state.page=el.dataset.page;state.drawer=false;render()}));
  document.querySelectorAll("[data-action]").forEach(el=>el.addEventListener("click",action));
  document.querySelectorAll("[data-category]").forEach(el=>el.addEventListener("click",()=>{state.category=el.dataset.category;render()}));
  document.querySelectorAll("[data-add]").forEach(el=>el.addEventListener("click",()=>addToCart(el.dataset.add)));
  document.querySelectorAll("[data-fav]").forEach(el=>el.addEventListener("click",()=>toggleFav(el.dataset.fav)));
  document.querySelectorAll("[data-qty]").forEach(el=>el.addEventListener("click",()=>changeQty(el.dataset.qty,Number(el.dataset.delta))));
  document.querySelectorAll("[data-remove-cart]").forEach(el=>el.addEventListener("click",()=>removeCart(el.dataset.removeCart)));
  document.querySelectorAll("[data-edit]").forEach(el=>el.addEventListener("click",()=>{state.editing=state.products.find(p=>p.id===el.dataset.edit);openModal("product")}));
  document.querySelectorAll("[data-delete]").forEach(el=>el.addEventListener("click",()=>deleteProduct(el.dataset.delete)));
  document.querySelectorAll("[data-status]").forEach(el=>el.addEventListener("click",()=>updateOrderStatus(el.dataset.status,el.dataset.value)));
  document.querySelector("#search")?.addEventListener("input",e=>{state.query=e.target.value;render()});
  document.querySelector("#product-form")?.addEventListener("submit",saveProduct);
  document.querySelector("#profile-form")?.addEventListener("submit",saveProfile);
  document.querySelector("#checkout-form")?.addEventListener("submit",submitCheckout);
  document.querySelector("#location-btn")?.addEventListener("click",async()=>{
    const status=document.querySelector("#location-status");status.textContent="Mengambil titik GPS...";
    const loc=await getGPS();status.textContent=loc?`Lokasi siap: ${loc.label}`:"Lokasi tidak tersedia. Pastikan izin lokasi diberikan.";
  });
  document.querySelector(".drawer-back")?.addEventListener("click",e=>{if(e.target.classList.contains("drawer-back")){state.drawer=false;render()}});
}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.installEvent=e;render()});
window.addEventListener("appinstalled",()=>{state.installEvent=null;render();showToast("Tubi berhasil dipasang.")});
async function installApp(){if(!state.installEvent)return;state.installEvent.prompt();await state.installEvent.userChoice;state.installEvent=null;render()}
window.addEventListener("error",e=>console.error("Tubi error",e.error||e.message));
window.addEventListener("unhandledrejection",e=>console.error("Tubi promise error",e.reason));

if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(e=>console.warn("SW",e));
render();
initFirebase();
