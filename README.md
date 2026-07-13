# Nirvana Relay Proxy (alag/standalone repo)

Iska kaam sirf itna hai: **YouTube API key aur relay backend ka URL/key kabhi
bhi Android app/APK ke andar na jaaye.** App sirf ek `RELAY_BASE_URL` (is
Netlify site ka URL) jaanta hai aur har call me **koi bhi key nahi bhejta** —
yeh do Netlify Functions asli keys khud, server-side, apne environment
variables se add karke aage forward karte hain.

| Route (app isko call karta hai) | Kya karta hai |
|---|---|
| `/api/search?query=...&limit=...` | Pehle apne real relay backend ke `/search` ko `X-Relay-Key` header ke saath hit karta hai. Relay fail ho to YouTube Data API v3 se (server-side key ke saath) search karke wahi shape wapas deta hai. |
| `/api/resolve?video_id=...` | Real relay backend ke `/resolve` ko `X-Relay-Key` header ke saath hit karke `stream_url` wapas deta hai. |

---

## 1. Naya GitHub repo banao (phone se, GitHub app ya mobile browser)

1. GitHub app (ya `github.com` mobile browser) kholo, login karo.
2. **+ → New repository** dabao.
   - Name: `nirvana-relay-proxy` (ya kuch bhi)
   - **Private** rakhna better hai (chahe zaroori nahi, keys isme kahin
     commit nahi hoti, par phir bhi).
   - "Add a README" ✅ kar do (khaali repo se file-upload thoda aasan hota hai).
3. Repo create hone ke baad, us repo ke andar **Add file → Upload files**
   dabao. Neeche di gayi saari files (isi folder-structure ke saath: `netlify/functions/search.js`, `netlify/functions/resolve.js`, `netlify/functions/_util.js`, `public/index.html`, `netlify.toml`, `package.json`, `.env.example`, `.gitignore`) upload/drag-drop kar do.
   - Phone file manager me pehle ek folder bana ke sab files usme daal lo,
     phir GitHub ke upload screen pe poora folder select/drag karo — GitHub
     folder structure preserve kar leta hai jab aap ek hi baar me poore
     nested folder ko drop karte ho.
   - **Alternative (agar upload me structure preserve na ho):** GitHub app
     me har file individually **Add file → Create new file** se bhi bana
     sakte ho, path box me `netlify/functions/search.js` jaisa poora path
     type karke — GitHub khud sahi folders bana dega.
4. **Commit changes** dabao.

## 2. Netlify se connect karo (phone browser se)

1. [app.netlify.com](https://app.netlify.com) kholo, login karo (GitHub se
   sign in kar sakte ho — same account jisme repo bana).
2. **Add new site → Import an existing project → Deploy with GitHub**,
   apna naya `nirvana-relay-proxy` repo choose karo.
3. Site settings screen pe defaults hi rakho:
   - **Base directory:** khaali (poora repo hi root hai)
   - **Build command:** khaali
   - **Publish directory:** `public`
4. **Deploy site** dabao. Kuch second me live URL milega, jaisa
   `https://random-name-123.netlify.app`.

## 3. Real keys add karo (Netlify dashboard, phone browser se hi)

1. Site kholo → **Site configuration → Environment variables → Add a
   variable**.
2. Yeh 3 variables add karo:
   - `RELAY_BASE_URL` → apna asli relay backend ka URL, **trailing slash ke
     saath** (e.g. `https://your-relay-host.example.com/`)
   - `RELAY_API_KEY` → relay backend jo key `X-Relay-Key` header me maangta
     hai (agar relay ka koi auth nahi hai to khaali chhod do)
   - `YOUTUBE_API_KEY` → YouTube Data API v3 key (fallback ke liye) —
     [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
     se bana sakte ho ("YouTube Data API v3" enable karke)
3. **Deploys** tab me jaake **Trigger deploy → Deploy site** dabao (naye env
   vars sirf agle deploy se effective hote hain).

## 4. Test karo (bina kisi tool ke, seedha phone browser me)

- `https://your-site.netlify.app/api/search?query=blinding%20lights`
- `https://your-site.netlify.app/api/resolve?video_id=SOME_VIDEO_ID`

JSON response dikhna chahiye. 502 error aaye to env variables check karo aur
step 3 dobara redeploy karo.

## 5. Android app ko is proxy se point karo

Nirvana app repo ki `.env` (ya GitHub Actions repo secret `RELAY_BASE_URL`) me:

```
RELAY_BASE_URL=https://your-site.netlify.app/api/
```

(Trailing slash zaroori hai.) App sirf isi ek URL ko jaanta hai — koi YouTube
ya relay key app/APK ke andar kabhi nahi hoti.

## ⚠️ Ek zaroori note (audio bytes ka access)

`/api/resolve` upstream se jo `stream_url` wapas deta hai, ExoPlayer **seedha
usi URL ko** hit karta hai (proxy ke through nahi jaata — audio files badi
hoti hain, ek normal Netlify Function unhe stream karne ke liye theek nahi
hai). Iska matlab:

- Relay agar **public/signed CDN link** deta hai (jaise seedha
  googlevideo.com wala link, bina extra header ke fetch ho sakta hai) — sab
  kuch waise hi chalega.
- Relay agar audio bytes khud apne `/audio/...` route se serve karta hai jise
  wahi `X-Relay-Key` chahiye — to woh direct fetch fail hogi, kyunki app ke
  paas ab woh key nahi hai. Is case me ek teesra chhota Netlify Function
  (audio streaming proxy) add karna padega. Bata dena agar aisa hai.
