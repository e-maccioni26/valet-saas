# Migrations de base de données

## Application des migrations

### Via Supabase Dashboard

1. Connectez-vous à votre projet Supabase : https://app.supabase.com
2. Allez dans **SQL Editor**
3. Créez une nouvelle query
4. Copiez le contenu du fichier de migration
5. Exécutez la query

### Via Supabase CLI

```bash
# Installation de la CLI
npm install -g supabase

# Login
supabase login

# Link vers votre projet
supabase link --project-ref <votre-project-ref>

# Appliquer la migration
supabase db push
```

### Via psql (PostgreSQL client)

```bash
# Connexion à votre base de données
psql "postgresql://postgres:[VOTRE-MOT-DE-PASSE]@[VOTRE-HOST]:5432/postgres"

# Exécuter la migration
\i migrations/20250115_add_refund_fields_to_payments.sql
```

## Historique des migrations

| Date | Fichier | Description |
|------|---------|-------------|
| 2025-01-15 | `20250115_add_refund_fields_to_payments.sql` | Ajout des champs de remboursement à la table payments |

## Vérification

Après avoir appliqué une migration, vérifiez qu'elle a réussi :

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('refunded_at', 'refund_amount', 'refund_reason');
```

Vous devriez voir :
```
   column_name   |          data_type
-----------------+-----------------------------
 refunded_at     | timestamp with time zone
 refund_amount   | numeric
 refund_reason   | character varying
```
