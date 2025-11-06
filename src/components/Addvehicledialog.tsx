'use client'

import { useState } from 'react'
import { supabase } from '../app/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Car, Loader2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AddVehicleDialogProps {
  onVehicleAdded?: () => void
}

export function AddVehicleDialog({ onVehicleAdded }: AddVehicleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [ticketNumber, setTicketNumber] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [color, setColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [parkingLocation, setParkingLocation] = useState('')
  const [vehicleCondition, setVehicleCondition] = useState('')
  const [notes, setNotes] = useState('')

  const resetForm = () => {
    setTicketNumber('')
    setBrand('')
    setModel('')
    setColor('')
    setLicensePlate('')
    setParkingLocation('')
    setVehicleCondition('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!ticketNumber) {
      toast({
        title: 'Erreur',
        description: 'Le numéro de ticket est requis',
        type: 'error',
      })
      return
    }

    setLoading(true)

    try {
      // 1. Trouver le ticket par son short_code
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select('id')
        .eq('short_code', ticketNumber)
        .single()

      if (ticketError) {
        console.error('Erreur Supabase (ticket):', ticketError)
        toast({
          title: 'Erreur de recherche',
          description: `Erreur: ${ticketError.message || 'Impossible de chercher le ticket'}`,
          type: 'error',
        })
        setLoading(false)
        return
      }

      if (!ticket) {
        toast({
          title: 'Ticket introuvable',
          description: `Le ticket #${ticketNumber} n'existe pas dans la base de données.`,
          type: 'error',
        })
        setLoading(false)
        return
      }

      console.log('✅ Ticket trouvé:', ticket)

      // 2. Vérifier si un véhicule existe déjà pour ce ticket
      const { data: existingVehicle, error: checkError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('ticket_id', ticket.id)
        .maybeSingle()

      if (checkError) {
        console.error('Erreur lors de la vérification:', checkError)
        toast({
          title: 'Erreur de vérification',
          description: `Erreur: ${checkError.message}`,
          type: 'error',
        })
        setLoading(false)
        return
      }

      if (existingVehicle) {
        console.log('🔄 Mise à jour du véhicule existant:', existingVehicle.id)
        
        // Mise à jour du véhicule existant
        const { data: updatedData, error: updateError } = await supabase
          .from('vehicles')
          .update({
            brand: brand || null,
            model: model || null,
            color: color || null,
            license_plate: licensePlate || null,
            parking_location: parkingLocation || null,
            vehicle_condition: vehicleCondition || null,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingVehicle.id)
          .select()

        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour:', updateError)
          toast({
            title: 'Erreur de mise à jour',
            description: `Code: ${updateError.code} - ${updateError.message}`,
            type: 'error',
          })
          setLoading(false)
          return
        }

        console.log('✅ Véhicule mis à jour:', updatedData)
        
        toast({
          title: '✅ Véhicule mis à jour',
          description: `Les informations du véhicule pour le ticket #${ticketNumber} ont été mises à jour.`,
          type: 'success',
        })
      } else {
        console.log('➕ Création d\'un nouveau véhicule')
        
        // Création d'un nouveau véhicule
        const { data: insertedData, error: insertError } = await supabase
          .from('vehicles')
          .insert({
            ticket_id: ticket.id,
            brand: brand || null,
            model: model || null,
            color: color || null,
            license_plate: licensePlate || null,
            parking_location: parkingLocation || null,
            vehicle_condition: vehicleCondition || null,
            notes: notes || null,
          })
          .select()

        if (insertError) {
          console.error('❌ Erreur lors de l\'insertion:', insertError)
          console.error('Code erreur:', insertError.code)
          console.error('Détails:', insertError.details)
          console.error('Hint:', insertError.hint)
          
          toast({
            title: 'Erreur d\'enregistrement',
            description: `Code: ${insertError.code} - ${insertError.message}${insertError.hint ? ` (${insertError.hint})` : ''}`,
            type: 'error',
          })
          setLoading(false)
          return
        }

        console.log('✅ Véhicule créé:', insertedData)

        toast({
          title: '✅ Véhicule enregistré',
          description: `Le véhicule pour le ticket #${ticketNumber} a été enregistré avec succès.`,
          type: 'success',
        })
      }

      // Fermer le dialog et réinitialiser
      setOpen(false)
      resetForm()
      
      // Callback pour rafraîchir le dashboard
      if (onVehicleAdded) {
        onVehicleAdded()
      }
    } catch (error: any) {
      console.error('❌ Erreur inattendue:', error)
      console.error('Type:', typeof error)
      console.error('Keys:', Object.keys(error))
      
      toast({
        title: 'Erreur inattendue',
        description: error?.message || JSON.stringify(error) || 'Une erreur est survenue',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un véhicule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Ajouter des informations véhicule
          </DialogTitle>
          <DialogDescription>
            Enregistrez les détails d&apos;un véhicule pour un ticket client. Tous les champs sont optionnels sauf le numéro de ticket.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Numéro de ticket - REQUIS */}
          <div className="space-y-2">
            <Label htmlFor="ticketNumber" className="text-red-600">
              Numéro de ticket *
            </Label>
            <Input
              id="ticketNumber"
              placeholder="Ex: 0007"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Le numéro du ticket client (ex: 0007)
            </p>
          </div>

          {/* Marque et Modèle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                placeholder="Ex: Renault"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input
                id="model"
                placeholder="Ex: Clio 5"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Couleur et Plaque */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Couleur</Label>
              <Input
                id="color"
                placeholder="Ex: Noir"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Plaque d&apos;immatriculation</Label>
              <Input
                id="licensePlate"
                placeholder="Ex: AB-123-CD"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </div>
          </div>

          {/* Emplacement de parking */}
          <div className="space-y-2">
            <Label htmlFor="parkingLocation">Emplacement de parking</Label>
            <Input
              id="parkingLocation"
              placeholder="Ex: Zone A - Place 12"
              value={parkingLocation}
              onChange={(e) => setParkingLocation(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Où avez-vous garé le véhicule ?
            </p>
          </div>

          {/* État du véhicule */}
          <div className="space-y-2">
            <Label htmlFor="vehicleCondition">État du véhicule</Label>
            <Textarea
              id="vehicleCondition"
              placeholder="Ex: Rayure sur le pare-choc avant gauche"
              value={vehicleCondition}
              onChange={(e) => setVehicleCondition(e.target.value)}
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Notez les rayures, bosses ou autres dommages
            </p>
          </div>

          {/* Notes supplémentaires */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes supplémentaires</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Clés dans le vide-poche"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetForm()
              }}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}