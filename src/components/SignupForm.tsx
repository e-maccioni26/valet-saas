"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../app/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        type: "error",
      })
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        type: "error",
      })
      setLoading(false)
      return
    }

    toast({
      title: "Inscription réussie 🎉",
      description: "Un email de confirmation vous a été envoyé.",
    })

    router.push("/auth/login")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSignup}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center mb-6">
                <h1 className="text-2xl font-bold">Créer un compte</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Entrez votre email pour créer votre compte
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemple@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirmer le mot de passe
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Field>
              </Field>

              <Field>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Création..." : "Créer un compte"}
                </Button>
              </Field>

              <FieldDescription className="text-center">
                Déjà un compte ?{" "}
                <a
                  href="/auth/login"
                  className="underline underline-offset-2 hover:text-primary"
                >
                  Connectez-vous
                </a>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.3] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}