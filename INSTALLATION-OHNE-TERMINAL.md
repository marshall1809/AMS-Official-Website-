# AMS Plattform installieren und veröffentlichen, ohne Terminal

Diese Anleitung beschreibt die Veröffentlichung über Browser-Oberflächen:

- GitHub
- Supabase
- Vercel

Es sind keine Terminal-Befehle nötig.

## 1. Voraussetzungen

Du brauchst:

- ein GitHub-Konto
- ein Supabase-Konto
- ein Vercel-Konto
- Zugriff auf dieses Projekt als GitHub Repository

Empfohlene Browser:

- Chrome
- Safari
- Edge

## 2. Projekt zu GitHub bringen

Wenn das Projekt noch nicht in GitHub liegt:

1. Öffne GitHub.
2. Erstelle ein neues Repository, zum Beispiel `ams-platform`.
3. Lade die Projektdateien über die GitHub-Weboberfläche hoch.
4. Achte darauf, dass diese Dateien im Repository liegen:
   - `package.json`
   - `app/`
   - `components/`
   - `lib/`
   - `content/`
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/seed.sql`

Wichtig: Lade keine echten geheimen Schlüssel hoch.

## 3. Supabase-Projekt erstellen

1. Öffne Supabase.
2. Klicke auf **New project**.
3. Wähle eine Organization.
4. Gib einen Projektnamen ein, zum Beispiel `ams-platform`.
5. Lege ein sicheres Datenbankpasswort fest.
6. Wähle eine Region nahe deiner Zielgruppe.
7. Klicke auf **Create new project**.

Warte, bis Supabase das Projekt vollständig erstellt hat.

## 4. Datenbankstruktur einrichten

1. Öffne dein Supabase-Projekt.
2. Gehe zu **SQL Editor**.
3. Klicke auf **New query**.
4. Öffne im GitHub-Projekt die Datei:
   `supabase/migrations/0001_initial_schema.sql`
5. Kopiere den gesamten Inhalt.
6. Füge ihn im Supabase SQL Editor ein.
7. Klicke auf **Run**.

Wenn keine Fehlermeldung erscheint, ist die Datenbankstruktur angelegt.

## 5. Startdaten einfügen

1. Bleibe im Supabase SQL Editor.
2. Klicke auf **New query**.
3. Öffne im GitHub-Projekt die Datei:
   `supabase/seed.sql`
4. Kopiere den gesamten Inhalt.
5. Füge ihn im SQL Editor ein.
6. Klicke auf **Run**.

Danach sind die AMS-Startseite, Season One, Default-Theme, Teams und Standardseiten angelegt.

## 6. Supabase API-Werte kopieren

1. Gehe in Supabase zu **Project Settings**.
2. Öffne **API**.
3. Kopiere:
   - Project URL
   - anon public key

Diese Werte werden gleich in Vercel eingetragen.

## 7. Admin-User erstellen

1. Gehe in Supabase zu **Authentication**.
2. Öffne **Users**.
3. Klicke auf **Add user**.
4. Erstelle einen User mit E-Mail und Passwort.

Merke dir die User-ID des angelegten Users.

## 8. Admin-Rolle vergeben

1. Gehe zu **SQL Editor**.
2. Erstelle eine neue Query.
3. Füge folgenden SQL-Code ein.
4. Ersetze `USER_ID_HIER_EINFÜGEN` durch die User-ID aus Supabase.

```sql
insert into public.profiles (id, display_name)
values ('USER_ID_HIER_EINFÜGEN', 'AMS Admin')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.user_roles (user_id, role)
values ('USER_ID_HIER_EINFÜGEN', 'super_admin')
on conflict do nothing;
```

5. Klicke auf **Run**.

Dieser User kann sich später unter `/admin` einloggen.

## 9. Vercel-Projekt erstellen

1. Öffne Vercel.
2. Klicke auf **Add New Project**.
3. Wähle dein GitHub Repository aus.
4. Vercel erkennt automatisch, dass es ein Next.js-Projekt ist.
5. Öffne den Bereich **Environment Variables**.

Trage diese Variablen ein:

| Name | Wert |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `NEXT_PUBLIC_SITE_URL` | spätere Website-URL, zum Beispiel `https://ams.example.com` |

Wichtig:

- `SUPABASE_SERVICE_ROLE_KEY` wird für diese Version nicht in Vercel benötigt.
- Falls du ihn später nutzt, darf er niemals im Client verwendet werden.

6. Klicke auf **Deploy**.

## 10. Domain verbinden

1. Öffne in Vercel dein Projekt.
2. Gehe zu **Settings**.
3. Öffne **Domains**.
4. Füge deine Domain hinzu.
5. Folge den DNS-Hinweisen von Vercel.
6. Sobald die Domain aktiv ist, aktualisiere in Vercel die Variable:
   `NEXT_PUBLIC_SITE_URL`

Danach erneut deployen.

## 11. Admin-Bereich testen

1. Öffne deine Website.
2. Öffne `/admin`.
3. Logge dich mit dem in Supabase erstellten Admin-User ein.
4. Prüfe:
   - Season Manager
   - Design Manager
   - Page Builder
   - Navigation Manager
   - Team Manager
   - Match/Schedule Manager
   - Bracket Manager
   - News Manager
   - Rules Manager
   - Sponsor Manager
   - Media Manager
   - Settings

## 12. Erste Inhalte anpassen

Empfohlene Reihenfolge:

1. Settings: Website-Name, Kontakt, Footer, SEO Defaults
2. Design Manager: Farben, Logo-Text, Theme-Tokens
3. Season Manager: Season prüfen oder neue Season erstellen
4. Navigation Manager: Menü prüfen
5. Page Builder: Startseite und Season-Seiten anpassen
6. Team Manager: echte Teams eintragen
7. Match Manager: Spielplan eintragen
8. Bracket Manager: Gewinner testen
9. News Manager: erste News veröffentlichen

## 13. Medien hochladen

1. Öffne Supabase.
2. Gehe zu **Storage**.
3. Öffne den passenden Bucket:
   - `global`
   - `seasons`
   - `teams`
   - `players`
   - `news`
   - `sponsors`
   - `documents`
4. Lade die Datei hoch.
5. Kopiere den öffentlichen Pfad oder die Public URL.
6. Trage die Datei im Admin-Bereich unter **Media Manager** ein.

## 14. Veröffentlichung prüfen

Vor dem finalen Teilen der Domain prüfen:

- Startseite lädt
- `/admin` verlangt Login
- `/sitemap.xml` lädt
- `/robots.txt` lädt
- Navigation funktioniert
- alte Pfade wie `/teams` leiten korrekt weiter
- mobile Ansicht ist lesbar
- Supabase RLS ist aktiviert
- Admin-User hat korrekte Rolle
- keine geheimen Schlüssel im GitHub Repository

## 15. Wartung ohne Codeänderungen

Nach der Veröffentlichung sollten diese Aufgaben im Admin erledigt werden:

- neue Seasons erstellen
- Designs ändern
- Seiten erstellen
- Navigation ändern
- Teams und Spieler pflegen
- Matches eintragen
- Gewinner weiterleiten
- News veröffentlichen
- Regeln ändern
- Sponsoren pflegen
- Medien verwalten

Codeänderungen sind nur noch nötig, wenn neue Funktionsarten entstehen, zum Beispiel:

- komplett neuer Blocktyp
- neue externe Integration
- stark veränderte Bracket-Logik
- neues Statistiksystem
- neue API-Version
