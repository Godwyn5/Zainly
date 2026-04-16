'use client';
import { useRouter } from 'next/navigation';
import LegalLayout from '@/components/LegalLayout';

export default function TermsPage() {
  const router = useRouter();
  return (
    <LegalLayout title="Conditions d'utilisation" onBack={() => router.back()}>

      <h2>1. Présentation du service</h2>
      <p>
        Zainly est une application web de mémorisation du Coran. Elle propose un parcours personnalisé basé sur la répétition espacée pour aider les utilisateurs à mémoriser et réviser les sourates du Coran à leur rythme.
      </p>

      <h2>2. Accès au service</h2>
      <p>
        Zainly est accessible depuis tout navigateur web moderne. Un compte utilisateur est nécessaire pour accéder aux fonctionnalités de mémorisation. L'inscription est gratuite et ouverte à tout utilisateur de plus de 13 ans.
      </p>
      <p>
        Une version gratuite est disponible avec un accès limité. L'abonnement Premium donne accès à toutes les fonctionnalités sans restriction.
      </p>

      <h2>3. Compte utilisateur</h2>
      <p>
        Tu es responsable de la sécurité de ton compte et de ton mot de passe. Toute activité effectuée depuis ton compte est sous ta responsabilité. En cas de suspicion d'accès non autorisé, contacte-nous immédiatement à l'adresse indiquée ci-dessous.
      </p>

      <h2>4. Abonnement Premium</h2>
      <p>
        L'abonnement Premium est proposé au tarif de <strong>2,99 € par mois</strong>. Il est sans engagement et se renouvelle automatiquement chaque mois à la même date.
      </p>
      <p>
        Tu peux résilier ton abonnement à tout moment depuis la page Réglages de l'application. La résiliation prend effet à la fin de la période en cours — tu gardes ton accès Premium jusqu'à cette date. Aucun remboursement n'est automatiquement émis pour la période restante.
      </p>
      <p>
        Les paiements sont traités de manière sécurisée par Stripe. Zainly ne stocke aucune information bancaire.
      </p>

      <h2>5. Utilisation acceptable</h2>
      <p>
        Tu t'engages à utiliser Zainly de manière personnelle et non commerciale. Il est interdit de tenter de contourner les mécanismes de protection, de reproduire ou distribuer le contenu de l'application, ou d'utiliser des outils automatisés pour interagir avec le service.
      </p>

      <h2>6. Limitation de responsabilité</h2>
      <p>
        Zainly est fourni "en l'état". Nous faisons notre possible pour assurer la disponibilité et la fiabilité du service, mais nous ne pouvons garantir un accès ininterrompu. Zainly ne pourra être tenu responsable de pertes de données ou d'interruptions de service indépendantes de notre volonté.
      </p>

      <h2>7. Modification du service</h2>
      <p>
        Nous nous réservons le droit de modifier, suspendre ou interrompre tout ou partie du service à tout moment. En cas de modification substantielle de ces conditions, nous t'en informerons par email.
      </p>

      <h2>8. Contact</h2>
      <p>
        Pour toute question, demande ou exercice de tes droits, contacte-nous à : <strong>zainlyapp@gmail.com</strong>
      </p>

    </LegalLayout>
  );
}
