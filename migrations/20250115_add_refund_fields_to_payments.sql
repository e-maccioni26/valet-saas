-- Migration: Ajout des champs de remboursement à la table payments
-- Date: 2025-01-15
-- Description: Ajoute les colonnes nécessaires pour gérer les remboursements

BEGIN;

-- Ajouter les colonnes de remboursement
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_reason varchar;

-- Créer un index sur payment_status pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- Créer un index sur stripe_payment_intent_id pour les webhooks
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);

-- Créer un index sur event_id pour les filtres
CREATE INDEX IF NOT EXISTS idx_payments_event_id ON public.payments(event_id);

-- Créer un index sur created_at pour les tris chronologiques
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Ajouter un commentaire sur la table
COMMENT ON TABLE public.payments IS 'Table des paiements Stripe pour les services de voiturier';

-- Ajouter des commentaires sur les nouvelles colonnes
COMMENT ON COLUMN public.payments.refunded_at IS 'Date et heure du remboursement';
COMMENT ON COLUMN public.payments.refund_amount IS 'Montant remboursé en euros (peut être partiel)';
COMMENT ON COLUMN public.payments.refund_reason IS 'Raison du remboursement (duplicate, fraudulent, requested_by_customer)';

-- Mettre à jour les statuts existants si nécessaire
-- Note: Cette partie est optionnelle et dépend de vos données existantes
-- UPDATE public.payments
-- SET payment_status = 'succeeded'
-- WHERE payment_status = 'completed';

COMMIT;

-- Vérification de la migration
DO $$
BEGIN
  -- Vérifier que les colonnes ont été ajoutées
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'refunded_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: refunded_at column not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'refund_amount'
  ) THEN
    RAISE EXCEPTION 'Migration failed: refund_amount column not added';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'refund_reason'
  ) THEN
    RAISE EXCEPTION 'Migration failed: refund_reason column not added';
  END IF;

  RAISE NOTICE 'Migration completed successfully!';
END $$;
