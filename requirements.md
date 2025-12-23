# Sistema Gestione Ordini - Macelleria Tumminello

## Problema Originale
La macelleria riceve ordini via telefono o di persona che vengono appuntati su fogli di carta. Questo sistema causa:
- Perdita di informazioni nella trascrizione
- Fogli che si perdono
- Difficoltà nel laboratorio a capire le date di consegna
- Ordini non organizzati per data di ritiro
- Errori nei dettagli (tipo di carne, quantità, numero persone)
- Distanza tra cassa/bancone e laboratorio

## Soluzione Implementata
Sistema web per gestione ordini con:

### Funzionalità Principali
1. **Login separati** per Banco/Cassa e Laboratorio
2. **Inserimento ordini** dal banco con:
   - Nome e telefono cliente (con ricerca clienti esistenti)
   - Selezione prodotti dal catalogo
   - Quantità e note per ogni prodotto
   - Data e fascia oraria di ritiro
3. **Dashboard Laboratorio** con:
   - Ordini organizzati per data/ora ritiro
   - Stati: Nuovo → In Lavorazione → Pronto → Consegnato
   - Notifiche sonore per nuovi ordini
   - Stampa comanda
4. **Storico** ordini e clienti
5. **Catalogo** prodotti modificabile

### Stack Tecnologico
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT

## Architettura

### Backend Endpoints (/api)
- `POST /api/auth/login` - Login utente
- `GET /api/auth/me` - Info utente corrente
- `GET/POST /api/products` - Gestione catalogo
- `GET/POST /api/customers` - Gestione clienti
- `GET/POST /api/orders` - Gestione ordini
- `PATCH /api/orders/{id}/status` - Aggiornamento stato
- `GET /api/dashboard/stats` - Statistiche

### Frontend Routes
- `/login` - Pagina login
- `/banco` - Interfaccia inserimento ordini (ruolo: banco)
- `/laboratorio` - Dashboard ordini (ruolo: laboratorio)
- `/catalogo` - Gestione prodotti (ruolo: banco)
- `/storico` - Storico ordini/clienti (tutti)

## Credenziali Default
- **Banco/Cassa**: `banco` / `banco123`
- **Laboratorio**: `laboratorio` / `lab123`

## Task Completati ✓
- [x] Autenticazione JWT con ruoli
- [x] CRUD Prodotti con categorie
- [x] CRUD Clienti con ricerca
- [x] CRUD Ordini completo
- [x] Dashboard laboratorio con statistiche
- [x] Notifiche sonore nuovi ordini
- [x] Stampa comande
- [x] Storico ordini/clienti con filtri
- [x] Design personalizzato (colori macelleria)
- [x] Interfaccia in italiano
- [x] Responsive design

## Prossimi Sviluppi (Suggeriti)
1. **App PWA** - Installabile su tablet del laboratorio
2. **Report settimanali/mensili** - Statistiche vendite
3. **Integrazione WhatsApp** - Notifica automatica al cliente quando l'ordine è pronto
4. **Sistema prenotazioni online** - I clienti possono prenotare direttamente
5. **Gestione magazzino** - Tracciamento scorte
