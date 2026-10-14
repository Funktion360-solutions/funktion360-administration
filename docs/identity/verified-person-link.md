# Administration ↔ Funktion360 ID: personkobling

Denne pakke kobler en eksisterende CRM-person til en eksisterende personlig Funktion360 ID-konto. Den opretter ingen brugere, organisationer eller produktadgang og ændrer ingen lokale produktbruger-ID'er.

## 1. Administration

Kør administration-person-id.sql i Vores Kok-projektets SQL Editor.

Fra funktion360-administration-mappen:

```bash
python3 ~/Downloads/opdater-funktion360-administration-person-id.py &&
npm run lint && npm run build &&
git add . &&
git commit -m "Add verified Funktion360 ID person linking" &&
git pull --rebase origin main && git push origin main
```

## 2. ID-opslags-API

Fra Funktion360-id-mappen:

```bash
python3 ~/Downloads/opdater-funktion360-id-personopslag.py &&
npx --yes pnpm@11.25.0 --filter @funktion360/id-web typecheck &&
npx --yes pnpm@11.25.0 build
```

Hvis scriptet ændrer en fil, commit og push ændringen fra denne mappe:

```bash
git add apps/web/app/api/administration/identity-lookup/route.ts &&
git commit -m "Add protected administration identity lookup" &&
git pull --rebase origin main && git push origin main
```

## 3. Miljøvariabler i Vercel

### funktion360-administration

- FUNKTION360_ID_BASE_URL = https://id.funktion360.dk
- FUNKTION360_ID_ISSUER = https://fthalqavjmsydmqszvkk.supabase.co/auth/v1
- SUPABASE_SECRET_KEY = eksisterende CRM-servernøgle fra Vores Kok-projektet.

### funktion360-id

- ADMINISTRATION_SUPABASE_URL = https://tgqwyheqhquwncyloond.supabase.co
- ADMINISTRATION_SUPABASE_PUBLISHABLE_KEY = samme publishable nøgle, som administrationen bruger til Vores Kok CRM.
- ID_ADMIN_SUPABASE_SECRET_KEY = servernøglen fra Funktion360 ID-projektet fthalqavjmsydmqszvkk.
- SUPABASE_URL = https://fthalqavjmsydmqszvkk.supabase.co (eksisterende ID-opsætning).

Bevar øvrige miljøvariabler. Servernøgler må ikke have NEXT_PUBLIC_-præfiks. Gem privat i Vercel, ikke i Git eller chat. Redeploy begge projekter efter miljøændringer.

## 4. Test

Åbn Administration → Personer → den rigtige person → Personens fælles ID-konto.

Indtast UUID fra Funktion360 ID-projektets Authentication → Users. Klik Kontrollér ID-brugeren. Sammenhold bruger-ID og den returnerede email med den konto, personen faktisk ejer. En email-lighed alene foretager ingen kobling. Kontoen skal have bekræftet email hos ID.

Bekræft personen og klik Kobl Funktion360 ID. Gemmehandlingen kræver people.update, people.read og den eksisterende MFA-politik. Serveren slår ID'et op igen og gemmer issuer, subject og verificeringstidspunkt. Browseren kan ikke selv skrive en verificeret kobling.

Samme issuer/subject kan kun tilhøre én CRM-person. Eksisterende eller modstridende aktive/historiske koblinger kræver særskilt kontrol; der foretages ingen automatisk sammenlægning.

## Grænser

Et serververificeret link er et historisk kontrolresultat, ikke en aktiv login-session eller produktlicens. Senere adgangskontrol skal stadig verificere brugerens aktuelle session og konkrete produktrettigheder. Generiske external_identities-poster bliver ikke automatisk opgraderet til verificerede links.

Organisationer, roller og synlig adgang i ID bliver næste integrationspakke. Det er fortsat kun Favn360, der har organisationer. Kundens eksisterende bruger-ID'er og opskriftsejerskab bevares.
