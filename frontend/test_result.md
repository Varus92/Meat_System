#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Sistema di gestione ordini per macelleria con:
  1. Dashboard per banco (cassa) e laboratorio
  2. Creazione e modifica ordini
  3. Generazione PDF per comande
  4. Numerazione progressiva ordini (NUMERO/ANNO)
  5. Colonne ordinabili nelle tabelle
  6. Possibilità di modificare ordini esistenti aggiungendo prodotti

backend:
  - task: "User Authentication (JWT)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Login funziona per utenti banco e laboratorio"

  - task: "Order Management CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Creazione, lettura, modifica e cancellazione ordini funzionanti"

  - task: "Progressive Order Numbering"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Numero ordine generato nel formato NUM/ANNO (es. 3/2025). Verificato con nuovo ordine creato."

  - task: "Order Modification with History"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Modifica ordini salva storico modifiche con data e utente"

frontend:
  - task: "Login Page"
    implemented: true
    working: true
    file: "frontend/src/pages/LoginPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Login con logo macelleria funzionante"

  - task: "Banco Dashboard - New Order"
    implemented: true
    working: true
    file: "frontend/src/pages/BancoPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Creazione ordini con selezione cliente e prodotti funzionante"

  - task: "Laboratorio Dashboard"
    implemented: true
    working: true
    file: "frontend/src/pages/LaboratorioPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Dashboard mostra ordini attivi con numero ordine nelle card"

  - task: "Storico Ordini - Table with Sorting"
    implemented: true
    working: true
    file: "frontend/src/pages/StoricoPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Tabella con colonne ordinabili (N° Ordine, Data, Cliente, Stato). Freccia indica direzione ordinamento."

  - task: "Order Modification - Add Products"
    implemented: true
    working: true
    file: "frontend/src/pages/StoricoPage.jsx"
    stuck_count: 1
    priority: "high"
    needs_retesting: true
    status_history:
      - working: false
        agent: "user"
        comment: "Utente segnala: dropdown aggiungi prodotto non funziona"
      - working: true
        agent: "main"
        comment: "Bug risolto: implementata griglia di bottoni invece di Select. Verificato che cliccando su prodotto viene aggiunto all'ordine (contatore passa da 3 a 4 prodotti)."

  - task: "PDF Generation with Order Number"
    implemented: true
    working: true
    file: "frontend/src/pages/StoricoPage.jsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "PDF include numero ordine accanto al titolo COMANDA ORDINE"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Storico Ordini - Table with Sorting"
    - "Order Modification - Add Products"
    - "Progressive Order Numbering"
    - "PDF Generation with Order Number"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Ho implementato le seguenti funzionalità:
      1. RISOLTO BUG: Dropdown aggiungi prodotto ora funziona con griglia di bottoni cliccabili
      2. NUMERAZIONE ORDINI: Formato NUM/ANNO (es. 3/2025) visibile in tabella e card
      3. COLONNE ORDINABILI: Click su intestazione ordina ascendente/discendente con freccia indicatore
      4. PDF AGGIORNATO: Numero ordine mostrato nel PDF
      
      Da testare:
      - Verificare ordinamento colonne su StoricoPage
      - Verificare che aggiungendo prodotto a ordine esistente funzioni correttamente
      - Verificare numero ordine nel PDF generato
      - Verificare che modifiche ordine vengano salvate con storico
      
      Credenziali test:
      - banco/banco123 (ruolo banco)
      - laboratorio/lab123 (ruolo laboratorio)