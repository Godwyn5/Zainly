'use client';
import { useRouter } from 'next/navigation';
import LegalLayout from '@/components/LegalLayout';

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <LegalLayout title="Politique de confidentialité" onBack={() => router.back()}>

      <h2>1. Introduction</h2>
      <p>
        Chez Zainly, la protection de tes données personnelles est une priorité. Cette politique explique quelles données nous collectons, comment nous les utilisons, et quels sont tes droits.
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
      <ul>
        <li><strong>Adresse email</strong> — pour la création et la gestion de ton compte.</li>
        <li><strong>Progression de mémorisation</strong> — sourate en cours, ayats mémorisés, dates de session, streak.</li>
        <li><strong>Données d'utilisation</strong> — fréquence de connexion, réponses aux exercices de révision.</li>
        <li><strong>Prénom</strong> — si fourni lors de l'onboarding, pour personnaliser l'expérience.</li>
      </ul>
      <p>Nous ne collectons pas de données sensibles telles que le numéro de téléphone, l'adresse postale ou les informations bancaires.</p>

      <h2>3. Utilisation des données</h2>
      <p>Tes données sont utilisées pour :</p>
      <ul>
        <li>Faire fonctionner et personnaliser ton parcours de mémorisation.</li>
        <li>Envoyer des notifications de rappel (si tu les as activées).</li>
        <li>Améliorer l'application en analysant les tendances d'utilisation de manière anonyme.</li>
        <li>Gérer ton abonnement Premium.</li>
      </ul>
      <p>Nous ne vendons pas tes données à des tiers et ne les utilisons pas à des fins publicitaires.</p>

      <h2>4. Stockage et sécurité</h2>
      <p>
        Tes données sont hébergées sur <strong>Supabase</strong>, une plateforme sécurisée conforme aux standards du secteur. Les données sont stockées sur des serveurs situés en Europe (AWS eu-west).
      </p>
      <p>
        L'accès à tes données est protégé par authentification et les échanges sont chiffrés via HTTPS.
      </p>

      <h2>5. Paiements</h2>
      <p>
        Les paiements sont traités par <strong>Stripe</strong>, un prestataire de paiement sécurisé certifié PCI DSS. Zainly ne stocke jamais tes coordonnées bancaires. Seul un identifiant d'abonnement est conservé pour gérer ton accès Premium.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Zainly utilise des cookies essentiels pour maintenir ta session et assurer ton authentification. Consulte notre <a href="/legal/cookies">politique de cookies</a> pour plus de détails.
      </p>

      <h2>7. Tes droits (RGPD)</h2>
      <p>Conformément au Règlement Général sur la Protection des Données (RGPD), tu disposes des droits suivants :</p>
      <ul>
        <li><strong>Droit d'accès</strong> — obtenir une copie de tes données personnelles.</li>
        <li><strong>Droit de rectification</strong> — corriger des données inexactes.</li>
        <li><strong>Droit à l'effacement</strong> — demander la suppression de ton compte et de toutes tes données.</li>
        <li><strong>Droit à la portabilité</strong> — recevoir tes données dans un format structuré.</li>
        <li><strong>Droit d'opposition</strong> — t'opposer à certains traitements.</li>
      </ul>
      <p>Pour exercer ces droits, contacte-nous à : <strong>support@zainly.app</strong></p>

      <h2>8. Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte est actif. En cas de suppression de compte, tes données personnelles sont effacées dans un délai de 30 jours.
      </p>

      <h2>9. Contact</h2>
      <p>
        Pour toute question relative à la protection de tes données, contacte-nous à : <strong>support@zainly.app</strong>
      </p>

    </LegalLayout>
  );
}
