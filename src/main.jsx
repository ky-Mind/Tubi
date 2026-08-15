import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";

const ADMIN_EMAILS = ["hilmykia@gmail.com"];
const productsSeed = [
  {id:"p1",name:"Ayam Crispy Special",price:18000,cat:"Ayam",desc:"Ayam crispy renyah dengan bumbu spesial.",image:"🍗"},
  {id:"p2",name:"Paket Hemat 1",price:22000,cat:"Paket",desc:"Paket praktis untuk makan kenyang.",image:"🍱"},
  {id:"p3",name:"Mie Pedas Level",price:15000,cat:"Mie",desc:"Mie gurih dengan pilihan level pedas.",image:"🍜"},
  {id:"p4",name:"Es Teh Jumbo",price:7000,cat:"Minuman",desc:"Es teh segar ukuran jumbo.",image:"🥤"}
];
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n);

function App(){
 const [user,setUser]=useState(null), [page,setPage]=useState("home"), [dark,setDark]=useState(false);
 const [cart,setCart]=useState([]), [products,setProducts]=useState(()=>JSON.parse(localStorage.getItem("tubi-products")||"null")||productsSeed);
 const [orders,setOrders]=useState(()=>JSON.parse(localStorage.getItem("tubi-orders")||"[]"));
 const [q,setQ]=useState(""), [cat,setCat]=useState("Semua"), [toast,setToast]=useState("");
 const admin=!!user && ADMIN_EMAILS.includes(user.email.toLowerCase());
 useEffect(()=>localStorage.setItem("tubi-products",JSON.stringify(products)),[products]);
 useEffect(()=>localStorage.setItem("tubi-orders",JSON.stringify(orders)),[orders]);
 const list=useMemo(()=>products.filter(p=>(cat==="Semua"||p.cat===cat)&&p.name.toLowerCase().includes(q.toLowerCase())),[products,cat,q]);
 const notify=m=>{setToast(m);setTimeout(()=>setToast(""),2200)};
 const login=()=>{const email=prompt("Demo login — masukkan email Google:","Hilmykia@gmail.com"); if(!email)return; const name=email.split("@")[0]; setUser({email,name}); notify("Berhasil masuk");};
 const logout=()=>{if(confirm("Yakin ingin keluar dari akun?")){setUser(null);setPage("home");notify("Anda sudah keluar");}};
 const add=p=>{setCart(c=>[...c,p]);notify(p.name+" ditambahkan");};
 const checkout=()=>{if(!cart.length)return; if(!user){notify("Masuk dulu untuk membuat pesanan");setPage("profile");return}
   const recipient=prompt("Nama penerima pesanan:",user.name||""); if(!recipient)return;
   const address=prompt("Alamat pengantaran:",""); if(!address)return;
   const order={id:Date.now(),recipient,address,user:user.email,items:cart,total:cart.reduce((s,p)=>s+p.price,0),status:"Baru",created:new Date().toISOString()};
   setOrders(o=>[order,...o]);setCart([]);notify("Pesanan berhasil dibuat");setPage("orders");
 };
 const addProduct=()=>{if(!admin)return;const name=prompt("Nama produk:");if(!name)return;const price=Number(prompt("Harga:","15000"));if(!price)return;const desc=prompt("Deskripsi:","Produk Tubi");const c=prompt("Kategori:","Lainnya");setProducts(p=>[...p,{id:"p"+Date.now(),name,price,cat:c||"Lainnya",desc:desc||"",image:"🍽️"}]);notify("Produk ditambahkan")};
 return <div className={dark?"app dark":"app"}>
  <header><div className="brand"><div className="logo">∞</div><b>Tubi</b></div><div className="actions"><button onClick={()=>setDark(!dark)} aria-label="mode">{dark?"☀":"☾"}</button><button onClick={()=>setPage("cart")}>🛒 <small>{cart.length}</small></button></div></header>
  <main>
   {page==="home"&&<><section className="hero"><span>Selamat datang di</span><h1>Tubi</h1><p>Pesan makanan favorit dengan mudah.</p><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari makanan..." /></section>
    <div className="chips"><button className={cat==="Semua"?"on":""} onClick={()=>setCat("Semua")}>Semua</button>{["Ayam","Paket","Mie","Minuman"].map(c=><button className={cat===c?"on":""} onClick={()=>setCat(c)} key={c}>{c}</button>)}</div>
    <section><div className="section-title"><h2>Produk pilihan</h2>{admin&&<button className="primary" onClick={addProduct}>+ Tambah produk</button>}</div><div className="grid">{list.map(p=><article className="card" key={p.id}><div className="photo">{p.image}</div><div className="cardbody"><small>{p.cat}</small><h3>{p.name}</h3><p>{p.desc}</p><strong>{money(p.price)}</strong><button className="primary full" onClick={()=>add(p)}>Tambah</button>{admin&&<button className="danger full" onClick={()=>confirm("Hapus produk ini?")&&setProducts(x=>x.filter(y=>y.id!==p.id))}>Hapus</button>}</div></article>)}</div></section>
   </>}
   {page==="profile"&&<section className="panel"><div className="profile-logo">∞</div><h2>Profil</h2>{user?<><h3>{user.name}</h3><p>{user.email}</p>{admin&&<span className="badge">ADMIN</span>}<button className="danger full" onClick={logout}>Keluar dari akun</button></>:<><p>Masuk untuk menyimpan profil dan membuat pesanan.</p><button className="google full" onClick={login}><span className="g">G</span> Masuk dengan Google</button></>}</section>}
   {page==="cart"&&<section className="panel"><h2>Keranjang</h2>{cart.length? <>{cart.map((p,i)=><div className="row" key={i}><span>{p.name}</span><b>{money(p.price)}</b></div>)}<hr/><div className="row"><b>Total</b><b>{money(cart.reduce((s,p)=>s+p.price,0))}</b></div><button className="primary full" onClick={checkout}>Konfirmasi pesanan</button></>:<p>Keranjang masih kosong.</p>}</section>}
   {page==="orders"&&<section className="panel"><h2>Pesanan saya</h2>{orders.filter(o=>!user||o.user===user.email).map(o=><div className="order" key={o.id}><b>{o.recipient}</b><span>{o.status}</span><p>{o.address}</p><strong>{money(o.total)}</strong></div>)}</section>}
   {page==="admin"&&admin&&<section className="panel"><h2>Dashboard Admin</h2><p>{orders.length} pesanan masuk</p>{orders.map(o=><div className="order" key={o.id}><b>{o.recipient}</b><small>{o.user}</small><p>{o.address}</p><strong>{money(o.total)}</strong><select value={o.status} onChange={e=>setOrders(x=>x.map(y=>y.id===o.id?{...y,status:e.target.value}:y))}><option>Baru</option><option>Diproses</option><option>Siap diantar</option><option>Selesai</option><option>Dibatalkan</option></select></div>)}</section>}
  </main>
  {toast&&<div className="toast">{toast}</div>}
  <nav>{<button className={page==="home"?"sel":""} onClick={()=>setPage("home")}>⌂<span>Beranda</span></button>}<button className={page==="orders"?"sel":""} onClick={()=>setPage("orders")}>▣<span>Pesanan</span></button><button onClick={()=>setPage("cart")}>🛒<span>Keranjang</span></button><button className={page==="profile"?"sel":""} onClick={()=>setPage("profile")}>◉<span>Profil</span></button>{admin&&<button className={page==="admin"?"sel":""} onClick={()=>setPage("admin")}>▦<span>Admin</span></button>}</nav>
 </div>
}
createRoot(document.getElementById("root")).render(<App/>);
