# 🚀 Guide de configuration rapide - Module de paiement

## ⚠️ PROBLÈME RÉSOLU

L'erreur `Cannot read properties of undefined (reading 'match')` était due à une variable d'environnement Stripe manquante.

## ✅ SOLUTION : Configuration de vos variables d'environnement

### 1. Vérifiez votre fichier `.env.local`

Ouvrez (ou créez si inexistant) le fichier `.env.local` à la racine du projet et assurez-vous qu'il contient **exactement** cette variable :

```bash
# STRIPE - Clé publique (OBLIGATOIRE pour le client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...votre_cle_ici...
```

### 2. Trouvez votre clé Stripe

1. Allez sur https://dashboard.stripe.com/test/apikeys
2. Copiez la **Publishable key** (commence par `pk_test_` en mode test)
3. Collez-la dans votre `.env.local`

### 3. Vérification complète des variables

Votre fichier `.env.local` doit contenir :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (TOUTES CES VARIABLES SONT OBLIGATOIRES)
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Redémarrez le serveur Next.js

**IMPORTANT** : Les variables d'environnement ne sont chargées qu'au démarrage.

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis redémarrez
npm run dev
```

### 5. Vérification dans le navigateur

Ouvrez la console du navigateur et tapez :

```javascript
console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
```

Vous devriez voir votre clé Stripe. Si vous voyez `undefined`, c'est que :
- Le fichier `.env.local` n'est pas à la racine du projet
- Le serveur n'a pas été redémarré
- La variable est mal nommée

## 🔧 Dépannage

### Erreur persiste après redémarrage ?

1. **Vérifiez l'emplacement du fichier** :
   ```bash
   # Le fichier doit être à la racine :
   /home/user/valet-saas/.env.local

   # PAS dans un sous-dossier comme src/
   ```

2. **Vérifiez les guillemets** :
   ```bash
   # ✅ CORRECT
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

   # ❌ INCORRECT (pas de guillemets)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51..."
   ```

3. **Vérifiez qu'il n'y a pas d'espaces** :
   ```bash
   # ✅ CORRECT
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

   # ❌ INCORRECT (espace après =)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= pk_test_51...
   ```

4. **Videz le cache Next.js** :
   ```bash
   rm -rf .next
   npm run dev
   ```

### Variables d'environnement non chargées ?

Si vous utilisez un service de déploiement (Vercel, Netlify, etc.), vous devez aussi ajouter les variables dans leur interface :

- **Vercel** : Settings → Environment Variables
- **Netlify** : Site settings → Environment variables
- **Railway** : Variables tab

## 📋 Checklist finale

- [ ] Fichier `.env.local` créé à la racine
- [ ] Variable `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` définie avec votre clé Stripe
- [ ] Serveur redémarré (`npm run dev`)
- [ ] Console browser affiche la clé (pas `undefined`)
- [ ] Erreur de paiement résolue

## 🎉 Résultat attendu

Après ces étapes, le bouton de paiement devrait fonctionner correctement et vous rediriger vers Stripe Checkout.

---

**Besoin d'aide ?**
- Documentation complète : `docs/PAYMENT_MODULE.md`
- Exemple complet : `.env.example`
