# Tubi v4.2 — Client Revision

## UX
- Drawer and modal overlays lock the background page.
- Mobile modal sizing uses dynamic viewport height.
- Touch/overscroll behavior is constrained to the active surface.
- Dark mode contrast was tightened across controls and surfaces.

## Product images
- Normalizes `assets/...` and `public/...` paths.
- Fallback images are selected from the bundled `assets/` catalog.
- Product, cart, detail, and admin previews use the same resolver.

## Smart search
- Natural-language intent expansion for pedas, manis, gurih, sambal, creamy, segar, ringan, and kenyang.
- Results are scored across name, category, description, tags, and synonyms.

## Firebase
- Existing Auth/Firestore integration retained.
- Checkout writes to `orders` and customer profile fields.
- Admin order subscription and product CRUD retained.
- `firestore.rules` included and must be published in Firebase Console.


## v4.2
- Admin dashboard separated from customer shopping flow; cart is hidden on the admin view.
- Admin CRUD strengthened: edit/delete actions, availability, menu category, taste tags, label, and immediate image preview.
- Added explicit Firestore catalog import flow when the database is empty.
- Unified image fallback behavior across product card/detail/cart/admin.
- Reworked categories into Roti, Dimsum, Tteokbokki, Kwetiau, Cilok, Minuman; taste attributes remain searchable through tags.
- Search scoring expanded for menu types and natural-language taste queries.
- Added `siap` order status.
