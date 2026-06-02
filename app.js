/**
 * Point d'entrée Passenger / N0C (PlanetHoster) pour le déploiement standalone.
 *
 * IMPORTANT — chargement des variables d'environnement :
 * Le serveur Next.js « standalone » (server.js) NE lit AUCUN fichier .env au
 * runtime (contrairement à `next dev`). Les variables non-NEXT_PUBLIC
 * (SUPABASE_SERVICE_ROLE_KEY, ADMIN_ACCESS_CODE, ADMIN_SESSION_TOKEN, …) ne sont
 * donc visibles QUE si l'hébergeur les injecte dans le process. Comme N0C/
 * Passenger ne le fait pas toujours, ce fichier charge lui-même un .env placé
 * À CÔTÉ de app.js (dans /home/<user>/citadelle/.env) AVANT de démarrer Next.
 *
 * → Crée un fichier `.env` dans le dossier de l'app avec toutes les variables
 *   (voir .env.exemple-production fourni). C'est la méthode fiable sur N0C.
 */
const fs = require('fs')
const path = require('path')

function loadEnvFile(file) {
  const full = path.join(__dirname, file)
  try {
    if (!fs.existsSync(full)) return
    const content = fs.readFileSync(full, 'utf8')
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq === -1) continue
      const key = line.slice(0, eq).trim()
      let val = line.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      // Ne pas écraser une variable déjà fournie par l'hôte.
      if (key && process.env[key] === undefined) process.env[key] = val
    }
    console.log('[app.js] Variables chargees depuis ' + file)
  } catch (e) {
    console.error('[app.js] Echec de lecture de ' + file + ':', e && e.message)
  }
}

// La 1re valeur trouvée gagne (host > .env > .env.local > .env.production).
loadEnvFile('.env')
loadEnvFile('.env.local')
loadEnvFile('.env.production')

process.env.NODE_ENV = process.env.NODE_ENV || 'production'
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

// Démarre le serveur Next.js standalone (présent à côté de ce fichier).
require('./server.js')
