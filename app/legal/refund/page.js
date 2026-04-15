'use client';
import { useRouter } from 'next/navigation';
import LegalLayout from '@/components/LegalLayout';

export default function RefundPage() {
  const router = useRouter();
  return (
    <LegalLayout title="Politique de remboursement" onBack={() => router.back()}>

      <h2>1. Abonnement sans engagement</h2>
      <p>
        L'abonnement Premium de Zainly est mensuel et sans engagement. Tu peux le résilier à tout moment depuis la page Réglages de ton compte, sans frais ni pénalité.
      </p>

      <h2>2. Résiliation et accès</h2>
      <p>
        Lorsque tu résilie ton abonnement, tu conserves ton accès Premium jusqu'à la fin de la période mensuelle déjà payée. La résiliation prend effet au prochain renouvellement.
      </p>

      <h2>3. Remboursements</h2>
      <p>
        Les paiements déjà effectués ne font pas l'objet d'un remboursement automatique. Chaque mois facturé correspond à une période d'accès Premium complète.
      </p>
      <p>
        Toutefois, si tu rencontres un problème technique grave ayant rendu le service inutilisable, ou en cas de double facturation, tu peux contacter notre support pour demander un remboursement exceptionnel. Nous examinerons ta demande dans un délai de 5 jours ouvrés.
      </p>

      <h2>4. Droit de rétractation</h2>
      <p>
        Conformément à la réglementation européenne, tu bénéficies d'un droit de rétractation de 14 jours à compter de la souscription à l'abonnement. Pour exercer ce droit, contacte-nous à l'adresse ci-dessous dans ce délai.
      </p>

      <h2>5. Contact</h2>
      <p>
        Pour toute demande de remboursement ou question, contacte-nous à : <strong>support@zainly.app</strong>
      </p>
      <p>
        Nous nous engageons à répondre dans les 48 heures ouvrées.
      </p>

    </LegalLayout>
  );
}
