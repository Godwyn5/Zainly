'use client';
import { useRouter } from 'next/navigation';
import LegalLayout from '@/components/LegalLayout';

export default function CookiesPage() {
  const router = useRouter();
  return (
    <LegalLayout title="Politique de cookies" onBack={() => router.back()}>

      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé sur ton appareil lorsque tu visites un site web. Il permet au site de mémoriser certaines informations pour améliorer ton expérience.
      </p>

      <h2>2. Les cookies que nous utilisons</h2>
      <p>Zainly utilise uniquement des cookies essentiels au fonctionnement du service :</p>
      <ul>
        <li>
          <strong>Cookie de session</strong> — maintient ta connexion active entre les pages. Sans ce cookie, tu devrais te reconnecter à chaque visite.
        </li>
        <li>
          <strong>Cookie d'authentification</strong> — fourni par Supabase, il vérifie ton identité de manière sécurisée et maintient ton état connecté.
        </li>
      </ul>

      <h2>3. Ce que nous n'utilisons pas</h2>
      <p>Zainly n'utilise <strong>pas</strong> de cookies :</p>
      <ul>
        <li>de tracking publicitaire</li>
        <li>de ciblage comportemental</li>
        <li>de partage de données avec des réseaux publicitaires</li>
        <li>d'analytics tiers intrusifs</li>
      </ul>

      <h2>4. Durée des cookies</h2>
      <p>
        Les cookies de session sont temporaires et expirés dès que tu fermes ton navigateur ou que ta session expire (généralement après quelques jours d'inactivité). Les cookies d'authentification persistent pour te garder connecté entre les visites.
      </p>

      <h2>5. Gérer les cookies</h2>
      <p>
        Tu peux à tout moment désactiver ou supprimer les cookies depuis les paramètres de ton navigateur. Note que désactiver les cookies essentiels empêchera le bon fonctionnement de l'application (connexion, progression, etc.).
      </p>
      <p>Voici comment accéder aux paramètres cookies des navigateurs courants :</p>
      <ul>
        <li><strong>Chrome</strong> — Paramètres → Confidentialité et sécurité → Cookies</li>
        <li><strong>Safari</strong> — Préférences → Confidentialité</li>
        <li><strong>Firefox</strong> — Options → Vie privée et sécurité</li>
      </ul>

      <h2>6. Contact</h2>
      <p>
        Pour toute question sur notre utilisation des cookies, contacte-nous à : <strong>support@zainly.app</strong>
      </p>

    </LegalLayout>
  );
}
