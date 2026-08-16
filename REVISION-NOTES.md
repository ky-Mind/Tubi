# Tubi — Final Blueprint Revision

## Finalized
- Customer and Admin experiences separated; Admin has no cart/add-to-cart controls.
- Products are read from Firestore as the single source of truth; customer no longer falls back to hardcoded catalog when Firestore is empty.
- Admin CRUD supports category, attributes/taste, rating, description, image, and availability (Tersedia/Habis).
- Product images are compressed client-side and stored in Firestore for Firebase Spark compatibility; no Storage dependency.
- Smart search covers name, category, description, attributes/tags and fuzzy/synonym matching.
- Checkout writes orders to Firestore with `menunggu` status and includes recipient, phone, address, location, notes and item image references.
- Customer can cancel eligible orders; Admin controls the full status flow `Menunggu → Diproses → Siap → Selesai` plus `Dibatalkan`.
- Admin order view includes order ID, customer, recipient, phone, address/location, items, prices, totals, notes, time, status and print action.
- Admin notifications are stored in Firestore and shown with unread/read state.
- Omzet/reporting uses completed (`selesai`) orders only, with 1/7/30-day totals and a simple 7-day chart.
- Admin calculator, bug report management, FAQ/help, WhatsApp settings and printer/fallback print tools added.
- Customer help center, WhatsApp contact and bug reporting with optional screenshot added.
- Reviews can be submitted after completed orders.
- Modal/drawer background locking, dark/light support, responsive admin panels and PWA update prompt retained/improved.
- Service worker cache version bumped and supports `SKIP_WAITING` for in-app update flow.
- Firestore rules cover products, users, orders, admins, notifications, bug reports, reviews and public store settings.

## Firebase Spark image strategy
Product/profile/bug screenshots are compressed in-browser as JPEG data URLs and stored in Firestore. Firebase Storage is not required.

## Deployment
`package.json` remains dependency-free for the static Vercel deployment. `npm run build` is an intentional no-op build and does not require Vite.


## v5.1 — Account / Navigation Fixes
- Customer drawer now includes Akun, Pusat Bantuan, Laporkan masalah, WhatsApp Admin, and Pengaturan aplikasi.
- Customer Account now visibly shows the WhatsApp Admin number, contact name, operating hours, and direct chat button when configured in Firestore.
- Added app settings controls inside the customer Account screen.
- Fixed customer order cancellation compatibility for legacy `baru` orders and improved permission-denied guidance.
- Firestore rules now permit eligible cancellation of legacy `baru` orders as well as `menunggu`/`diproses`.
- Added missing drawer icons and preserved Firestore as the only product source of truth.


## v5.2 — Stability / Account / Update Fix
- Fixed the customer cancellation handler declaration so the cancel action is actually bound.
- Added a proper boot/loading screen and friendly boot error instead of leaving a blank white page when the module fails to initialize.
- Fixed the PWA update banner so it is hidden by default and only appears when a waiting service worker is detected.
- Update action now waits for the new service-worker controller before reloading, with a safe timeout fallback.
- Customer drawer now shows the configured WhatsApp Admin number directly.
- Customer Account explicitly shows Admin WhatsApp number, contact name, and operating hours.
- Store settings realtime listener now refreshes the app for both customer and admin views.
- Service-worker cache key bumped to force the corrected assets to refresh.


## v5.3 — Navigation & Account Cleanup
- Admin dashboard is simplified into a control hub with dedicated page buttons for Products, Orders, Revenue & Reports, Calculator, Notifications, Help & Bug, and Settings.
- Admin drawer now exposes those pages directly; admin no longer gets customer-style Favorites/Orders navigation.
- Customer Account no longer contains large stacked Help/FAQ/Bug/Settings forms.
- Customer Help, Bug Report, WhatsApp Admin, and App Settings are separate pages.
- WhatsApp Admin settings accept Indonesian numbers entered as `08...`, `8...`, `62...`, or `+62...` and normalize them for `wa.me`.
- Customer WhatsApp page shows the configured number, contact name, operating hours, and chat button.
- Profile support buttons now navigate to real pages instead of scroll-only sections.
- Service worker cache bumped to `tubi-v5-3-navigation-pages`.
- JavaScript module syntax checked successfully with Node.js `--check`.
