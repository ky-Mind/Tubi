# Tubi — Production Revision

## Fixed
- Firebase Storage upload for profile/product photos.
- Firestore rules for customer/admin/order access.
- Storage rules for profile/product images.
- Admin dashboard CRUD remains separate from customer cart.
- Checkout error handling made actionable.
- Dark mode contrast across admin and modal surfaces.
- Background scroll/interactions locked while drawer or modal is active.
- Service worker changed to network-first for HTML to prevent stale GitHub/Vercel builds.
- No files/config from the separate reference project were copied into Tubi.

## Firebase one-time action
Enable Firebase Storage in project `tubi-app`, then deploy:
`firebase deploy --only firestore:rules,storage`

## Vercel
Keep the same Vercel project and production domain. Push to `main`; Vercel creates a new production deployment without changing the domain.


## REV4 — Firebase Spark $0
- Removed Firebase Storage SDK and all Cloud Storage dependencies.
- Product and profile uploads are compressed in-browser to JPEG data URLs and stored in Firestore.
- Image output is limited to 900px and guarded below 850 KB per image field to stay safely below Firestore's 1 MiB document limit.
- Removed `storage.rules` and the Storage section from `firebase.json`.
- Google Authentication and Firestore remain unchanged.
- This build does not require upgrading the Firebase project to Blaze for image uploads.
