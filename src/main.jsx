import React from "react";
import { createRoot } from "react-dom/client";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import "./styles.css";

// ===============================
// FIREBASE
// ===============================
// COPY konfigurasi Firebase Web App
// dari Firebase Console ke bagian ini.
const firebaseConfig = {
  apiKey: "ISI_API_KEY_DARI_FIREBASE",
  authDomain: "tubi-app.firebaseapp.com",
  projectId: "tubi-app",
  storageBucket: "tubi-app.firebasestorage.app",
  messagingSenderId: "ISI_MESSAGING_SENDER_ID",
  appId: "ISI_APP_ID",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();

const products = [
  ["Ayam Crispy Special", 18000, 4.8, "Ayam", "🍗"],
  ["Paket Hemat 1", 22000, 4.9, "Paket", "🍱"],
  ["Mie Pedas Level", 15000, 4.7, "Mie", "🍜"],
  ["Es Teh Jumbo", 7000, 4.8, "Minuman", "🥤"],
];

const cats = [
  ["🍗", "Ayam"],
  ["🍱", "Paket"],
  ["🍜", "Mie"],
  ["🥤", "Minuman"],
];

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function App() {
  const [cart, setCart] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("Semua");
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("Login Google gagal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const list = products.filter(
    (p) =>
      (cat === "Semua" || p[3] === cat) &&
      p[0].toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="app">
      <header>
        <div className="top">
          <button>☰</button>

          <b>tubi</b>

          <button>
            🛒
            <i>{cart.length}</i>
          </button>
        </div>

        <div className="copy">
          <small>Selamat datang di</small>
          <h1>Tubi</h1>
          <span>Temukan makanan favoritmu.</span>
        </div>

        <div className="food">🍗 🍜 🥤</div>
      </header>

      <main>
        <div className="search">
          ⌕
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lagi ngidam apa?"
          />
        </div>

        {/* LOGIN */}
        <section>
          <div className="login-box">
            {user ? (
              <>
                <div className="user-info">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="Foto profil" />
                  )}

                  <div>
                    <strong>{user.displayName || "Pengguna Tubi"}</strong>
                    <small>{user.email}</small>
                  </div>
                </div>

                <button className="logout-btn" onClick={logout}>
                  Keluar
                </button>
              </>
            ) : (
              <button className="google-btn" onClick={loginGoogle}>
                <span>G</span>
                {loading ? "Memproses..." : "Masuk dengan Google"}
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="title">
            <h2>Kategori</h2>

            <button onClick={() => setCat("Semua")}>
              Lihat semua
            </button>
          </div>

          <div className="cats">
            {cats.map((c) => (
              <button
                className={cat === c[1] ? "active" : ""}
                onClick={() => setCat(c[1])}
                key={c[1]}
              >
                <em>{c[0]}</em>
                <strong>{c[1]}</strong>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="title">
            <h2>Produk pilihan</h2>
            <span>{list.length} produk</span>
          </div>

          <div className="products">
            {list.map((p, i) => (
              <article key={i}>
                <div className="pic">{p[4]}</div>

                <div className="info">
                  <h3>{p[0]}</h3>

                  <small>★ {p[2]} · Siap dipesan</small>

                  <b>{rupiah(p[1])}</b>

                  <button onClick={() => setCart([...cart, p])}>
                    + Tambah
                  </button>
                </div>
              </article>
            ))}
          </div>

          {!list.length && (
            <p className="empty">Produk tidak ditemukan.</p>
          )}
        </section>
      </main>

      <nav>
        <button className="sel">
          ⌂
          <span>Beranda</span>
        </button>

        <button>
          ▣
          <span>Pesanan</span>
        </button>

        <button>
          ♡
          <span>Favorit</span>
        </button>

        <button>
          ◉
          <span>Akun</span>
        </button>
      </nav>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
