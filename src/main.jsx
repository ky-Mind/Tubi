import React from "react";
import { createRoot } from "react-dom/client";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from "firebase/storage";
import {
  auth,
  db,
  storage,
  googleProvider,
  ADMIN_EMAIL
} from "./firebase";
import "./styles.css";

const FALLBACK_PRODUCTS = [
  { id: "demo-1", name: "Ayam Crispy Special", price: 18000, rating: 4.8, category: "Ayam", emoji: "🍗", imageUrl: "" },
  { id: "demo-2", name: "Paket Hemat 1", price: 22000, rating: 4.9, category: "Paket", emoji: "🍱", imageUrl: "" },
  { id: "demo-3", name: "Mie Pedas Level", price: 15000, rating: 4.7, category: "Mie", emoji: "🍜", imageUrl: "" },
  { id: "demo-4", name: "Es Teh Jumbo", price: 7000, rating: 4.8, category: "Minuman", emoji: "🥤", imageUrl: "" }
];

const CATS = [
  ["🍗", "Ayam"],
  ["🍱", "Paket"],
  ["🍜", "Mie"],
  ["🥤", "Minuman"]
];

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n || 0));

function App() {
  const [page, setPage] = React.useState("home");
  const [products, setProducts] = React.useState(FALLBACK_PRODUCTS);
  const [cart, setCart] = React.useState([]);
  const [favorites, setFavorites] = React.useState(() => JSON.parse(localStorage.getItem("tubi-favorites") || "[]"));
  const [orders, setOrders] = React.useState(() => JSON.parse(localStorage.getItem("tubi-orders") || "[]"));
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("Semua");
  const [user, setUser] = React.useState(null);
  const [role, setRole] = React.useState("");
  const [authLoading, setAuthLoading] = React.useState(true);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [selectedProduct, setSelectedProduct] = React.useState(null);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        setRole("");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        const isAdmin = currentUser.email?.toLowerCase() === ADMIN_EMAIL;
        setRole(isAdmin ? "admin" : (snap.exists() ? snap.data().role || "user" : "user"));

        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            uid: currentUser.uid,
            name: currentUser.displayName || "Pengguna Tubi",
            email: currentUser.email || "",
            photoURL: currentUser.photoURL || "",
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch {
        setRole(currentUser.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "user");
      }
    });

    return () => unsub();
  }, []);

  React.useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc")),
      (snap) => {
        if (!snap.empty) {
          setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  React.useEffect(() => {
    localStorage.setItem("tubi-favorites", JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
    localStorage.setItem("tubi-orders", JSON.stringify(orders));
  }, [orders]);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setPage("profile");
      setToast("Berhasil masuk dengan Google.");
    } catch (e) {
      console.error(e);
      setToast(`Login gagal: ${e.code || e.message}`);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setPage("home");
    setToast("Kamu sudah keluar.");
  };

  const addToCart = (product) => {
    setCart((prev) => [...prev, product]);
    setToast(`${product.name} ditambahkan ke keranjang.`);
  };

  const toggleFavorite = (product) => {
    setFavorites((prev) =>
      prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  const checkout = () => {
    if (!user) {
      setCartOpen(false);
      setPage("profile");
      setToast("Masuk dulu untuk membuat pesanan.");
      return;
    }
    if (!cart.length) {
      setToast("Keranjang masih kosong.");
      return;
    }

    const order = {
      id: `TUBI-${Date.now().toString().slice(-8)}`,
      items: cart,
      total: cart.reduce((s, p) => s + Number(p.price), 0),
      date: new Date().toISOString(),
      status: "Menunggu diproses"
    };
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    setCartOpen(false);
    setPage("orders");
    setToast("Pesanan berhasil dibuat.");
  };

  const filtered = products.filter((p) => {
    const matchesCat = cat === "Semua" || p.category === cat;
    const matchesSearch = p.name?.toLowerCase().includes(q.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const favoriteProducts = products.filter((p) => favorites.some((f) => f.id === p.id));

  if (authLoading) {
    return <div className="splash"><div className="logo">tubi</div><span>Memuat...</span></div>;
  }

  return (
    <div className="app">
      <Header cartCount={cart.length} onCart={() => setCartOpen(true)} onMenu={() => setPage("profile")} />

      {page === "home" && (
        <Home
          q={q}
          setQ={setQ}
          cat={cat}
          setCat={setCat}
          products={filtered}
          onAdd={addToCart}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onOpen={setSelectedProduct}
        />
      )}

      {page === "orders" && <Orders orders={orders} />}
      {page === "favorites" && (
        <ProductGridPage
          title="Favorit saya"
          subtitle={`${favoriteProducts.length} produk tersimpan`}
          products={favoriteProducts}
          favorites={favorites}
          onAdd={addToCart}
          onFavorite={toggleFavorite}
          onOpen={setSelectedProduct}
          empty="Belum ada produk favorit."
        />
      )}
      {page === "profile" && (
        <Profile
          user={user}
          role={role}
          onLogin={login}
          onLogout={logout}
          onAdmin={() => setPage("admin")}
          onHome={() => setPage("home")}
        />
      )}
      {page === "admin" && role === "admin" && (
        <AdminDashboard products={products} onToast={setToast} />
      )}
      {page === "admin" && role !== "admin" && (
        <Profile user={user} role={role} onLogin={login} onLogout={logout} onAdmin={() => {}} onHome={() => setPage("home")} />
      )}

      <BottomNav page={page} setPage={setPage} role={role} />

      {cartOpen && (
        <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onRemove={(i) => setCart((c) => c.filter((_, idx) => idx !== i))} onCheckout={checkout} />
      )}

      {selectedProduct && (
        <ProductModal product={selectedProduct} favorite={favorites.some((p) => p.id === selectedProduct.id)} onClose={() => setSelectedProduct(null)} onAdd={() => { addToCart(selectedProduct); setSelectedProduct(null); }} onFavorite={() => toggleFavorite(selectedProduct)} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Header({ cartCount, onCart, onMenu }) {
  return (
    <header className="hero">
      <div className="hero-top">
        <button className="circle-btn" onClick={onMenu} aria-label="Menu">☰</button>
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>tubi</button>
        <button className="circle-btn cart-btn" onClick={onCart} aria-label="Keranjang">🛒<i>{cartCount}</i></button>
      </div>
      <div className="hero-copy">
        <small>Selamat datang di</small>
        <h1>Tubi</h1>
        <p>Temukan makanan favoritmu.</p>
      </div>
      <div className="hero-food">🍗 <span>🍜</span> 🥤</div>
    </header>
  );
}

function Home({ q, setQ, cat, setCat, products, onAdd, onFavorite, favorites, onOpen }) {
  return (
    <main className="content">
      <div className="search-box"><span>⌕</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lagi ngidam apa?" /></div>

      <section>
        <div className="section-head"><h2>Kategori</h2><button onClick={() => setCat("Semua")}>Lihat semua</button></div>
        <div className="categories">
          {CATS.map(([emoji, name]) => (
            <button key={name} className={`category ${cat === name ? "active" : ""}`} onClick={() => setCat(name)}>
              <span>{emoji}</span><b>{name}</b>
            </button>
          ))}
        </div>
      </section>

      <ProductGridPage
        title="Produk pilihan"
        subtitle={`${products.length} produk`}
        products={products}
        favorites={favorites}
        onAdd={onAdd}
        onFavorite={onFavorite}
        onOpen={onOpen}
        empty="Produk tidak ditemukan."
        embedded
      />
    </main>
  );
}

function ProductGridPage({ title, subtitle, products, favorites, onAdd, onFavorite, onOpen, empty, embedded = false }) {
  return (
    <main className={embedded ? "" : "content page-content"}>
      <section>
        <div className="section-head"><h2>{title}</h2><span className="muted">{subtitle}</span></div>
        <div className="products">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} favorite={favorites.some((f) => f.id === p.id)} onAdd={() => onAdd(p)} onFavorite={() => onFavorite(p)} onOpen={() => onOpen(p)} />
          ))}
        </div>
        {!products.length && <div className="empty-state"><span>♡</span><b>{empty}</b><small>Coba cari produk lain atau lihat semua kategori.</small></div>}
      </section>
    </main>
  );
}

function ProductCard({ product, favorite, onAdd, onFavorite, onOpen }) {
  return (
    <article className="product-card">
      <button className="product-media" onClick={onOpen} aria-label={`Lihat ${product.name}`}>
        {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>{product.emoji || "🍽️"}</span>}
        <button className={`fav-btn ${favorite ? "liked" : ""}`} onClick={(e) => { e.stopPropagation(); onFavorite(); }} aria-label="Favorit">♥</button>
      </button>
      <div className="product-info">
        <button className="product-name" onClick={onOpen}>{product.name}</button>
        <small>★ {product.rating || "5.0"} · Siap dipesan</small>
        <div className="product-bottom"><b>{rupiah(product.price)}</b><button onClick={onAdd}>+ Tambah</button></div>
      </div>
    </article>
  );
}

function Profile({ user, role, onLogin, onLogout, onAdmin, onHome }) {
  return (
    <main className="content page-content profile-page">
      <div className="page-title"><span>Akun</span><h1>Profil kamu</h1><p>Kelola akun dan akses Tubi dari sini.</p></div>

      {!user ? (
        <div className="profile-card login-card">
          <div className="profile-avatar">G</div>
          <h2>Masuk ke Tubi</h2>
          <p>Login untuk menyimpan pesanan, favorit, dan profil kamu.</p>
          <button className="google-btn" onClick={onLogin}><span>G</span> Masuk dengan Google</button>
        </div>
      ) : (
        <>
          <div className="profile-card">
            <div className="profile-main">
              {user.photoURL ? <img className="avatar-img" src={user.photoURL} alt="Profil" /> : <div className="profile-avatar">{(user.displayName || "P")[0]}</div>}
              <div><h2>{user.displayName || "Pengguna Tubi"}</h2><p>{user.email}</p><span className="role-pill">{role === "admin" ? "Administrator" : "Pengguna"}</span></div>
            </div>
            <button className="outline-btn" onClick={onLogout}>Keluar</button>
          </div>

          {role === "admin" && (
            <button className="admin-banner" onClick={onAdmin}>
              <span>⚙️</span><div><b>Dashboard Admin</b><small>Tambah foto, produk, harga, kategori & kelola katalog.</small></div><strong>›</strong>
            </button>
          )}

          <div className="quick-actions">
            <button onClick={onHome}>⌂<span>Beranda</span></button>
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>👤<span>Profil</span></button>
            {role === "admin" && <button onClick={onAdmin}>⚙️<span>Admin</span></button>}
          </div>
        </>
      )}
    </main>
  );
}

function Orders({ orders }) {
  return (
    <main className="content page-content">
      <div className="page-title"><span>Pesanan</span><h1>Riwayat pesanan</h1><p>Semua pesanan yang kamu buat di Tubi.</p></div>
      {!orders.length ? <div className="empty-state"><span>▣</span><b>Belum ada pesanan.</b><small>Tambahkan makanan ke keranjang lalu checkout.</small></div> : (
        <div className="orders">
          {orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div><b>{o.id}</b><span>{new Date(o.date).toLocaleString("id-ID")}</span></div>
              <div className="order-items">{o.items.map((p, i) => <span key={i}>{p.emoji || "🍽️"} {p.name}</span>)}</div>
              <footer><span>{o.status}</span><b>{rupiah(o.total)}</b></footer>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function CartDrawer({ cart, onClose, onRemove, onCheckout }) {
  const total = cart.reduce((s, p) => s + Number(p.price), 0);
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><div><small>Keranjang</small><h2>{cart.length} item</h2></div><button onClick={onClose}>×</button></div>
        <div className="cart-list">
          {cart.map((p, i) => <div className="cart-row" key={`${p.id}-${i}`}><div className="mini-media">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : p.emoji}</div><div><b>{p.name}</b><span>{rupiah(p.price)}</span></div><button onClick={() => onRemove(i)}>×</button></div>)}
          {!cart.length && <div className="empty-state small"><span>🛒</span><b>Keranjang kosong</b></div>}
        </div>
        <div className="drawer-foot"><div><span>Total</span><b>{rupiah(total)}</b></div><button className="primary-btn" onClick={onCheckout} disabled={!cart.length}>Checkout</button></div>
      </aside>
    </div>
  );
}

function ProductModal({ product, favorite, onClose, onAdd, onFavorite }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-media">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span>{product.emoji || "🍽️"}</span>}</div>
        <span className="category-tag">{product.category}</span>
        <h2>{product.name}</h2>
        <p>★ {product.rating || "5.0"} · Siap dipesan</p>
        <strong className="modal-price">{rupiah(product.price)}</strong>
        <div className="modal-actions"><button className={`outline-btn ${favorite ? "liked-outline" : ""}`} onClick={onFavorite}>♥ Favorit</button><button className="primary-btn" onClick={onAdd}>+ Tambah ke keranjang</button></div>
      </div>
    </div>
  );
}

function AdminDashboard({ products, onToast }) {
  const [form, setForm] = React.useState({ name: "", price: "", category: "Ayam", rating: "5.0", emoji: "🍽️" });
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.price) return onToast("Nama dan harga wajib diisi.");
    setSaving(true);
    try {
      let imageUrl = "";
      let imagePath = "";
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        imagePath = `products/${Date.now()}-${safeName}`;
        const storageRef = ref(storage, imagePath);
        await uploadBytes(storageRef, file);
        imageUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "products"), {
        name: form.name.trim(),
        price: Number(form.price),
        rating: Number(form.rating || 5),
        category: form.category,
        emoji: form.emoji || "🍽️",
        imageUrl,
        imagePath,
        createdAt: serverTimestamp()
      });
      setForm({ name: "", price: "", category: "Ayam", rating: "5.0", emoji: "🍽️" });
      setFile(null);
      setPreview("");
      onToast("Produk berhasil ditambahkan.");
    } catch (err) {
      console.error(err);
      onToast(`Gagal menambah produk: ${err.code || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (product) => {
    if (!window.confirm(`Hapus ${product.name}?`)) return;
    try {
      await deleteDoc(doc(db, "products", product.id));
      if (product.imagePath) {
        try { await deleteObject(ref(storage, product.imagePath)); } catch {}
      }
      onToast("Produk dihapus.");
    } catch (err) {
      console.error(err);
      onToast(`Gagal menghapus: ${err.code || err.message}`);
    }
  };

  return (
    <main className="content page-content admin-page">
      <div className="page-title"><span>Administrator</span><h1>Dashboard Admin</h1><p>Kelola katalog Tubi secara langsung.</p></div>

      <div className="admin-grid">
        <form className="admin-form" onSubmit={addProduct}>
          <div className="form-head"><h2>Tambah produk</h2><span>Publikasi langsung</span></div>
          <label>Foto produk
            <label className="upload-box">
              {preview ? <img src={preview} alt="Preview" /> : <><span>＋</span><b>Pilih foto</b><small>JPG, PNG, WEBP</small></>}
              <input type="file" accept="image/*" onChange={handleFile} />
            </label>
          </label>
          <label>Nama produk<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Ayam Geprek" /></label>
          <div className="two-cols">
            <label>Harga (Rp)<input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="18000" /></label>
            <label>Rating<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></label>
          </div>
          <div className="two-cols">
            <label>Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map(([, c]) => <option key={c}>{c}</option>)}</select></label>
            <label>Emoji fallback<input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></label>
          </div>
          <button className="primary-btn full" disabled={saving}>{saving ? "Menyimpan..." : "＋ Tambahkan produk"}</button>
        </form>

        <div className="admin-catalog">
          <div className="form-head"><h2>Katalog ({products.length})</h2><span>Data Firestore</span></div>
          <div className="admin-list">
            {products.map((p) => (
              <div className="admin-product" key={p.id}>
                <div className="admin-thumb">{p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span>{p.emoji || "🍽️"}</span>}</div>
                <div><b>{p.name}</b><small>{p.category} · {rupiah(p.price)}</small></div>
                <button className="delete-btn" onClick={() => removeProduct(p)}>Hapus</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function BottomNav({ page, setPage, role }) {
  const items = [
    ["home", "⌂", "Beranda"],
    ["orders", "▣", "Pesanan"],
    ["favorites", "♡", "Favorit"],
    ["profile", "◉", "Akun"]
  ];
  return (
    <nav className="bottom-nav">
      {items.map(([id, icon, label]) => <button key={id} className={page === id ? "sel" : ""} onClick={() => setPage(id)}><span>{icon}</span><small>{label}</small></button>)}
      {role === "admin" && page === "admin" && <span className="admin-nav-badge">ADMIN</span>}
    </nav>
  );
}

createRoot(document.getElementById("root")).render(<App />);