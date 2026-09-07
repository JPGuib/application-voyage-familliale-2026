import type { Role } from "./owner-policy";
import { isTripFinished, computeCurrentDay } from "./trip-day";

/**
 * Détermine si un profil a accès à la fonctionnalité album.
 *
 * Règles d'accès (story 30.2, AC1, AC2):
 * - Propriétaire : accès à tout moment
 * - Utilisateur (voyageur) : accès uniquement si le voyage est terminé
 * - Visiteur : jamais d'accès
 *
 * @param role Rôle du profil
 * @param currentDay Jour actuel du voyage
 * @param lastDefinedDay Dernier jour du voyage défini
 * @returns true si le profil peut accéder à l'album, false sinon
 */
export function canAccessAlbumComposition(
  role: Role | null,
  currentDay: number,
  lastDefinedDay: number | null
): boolean {
  if (role === "proprietaire") {
    return true; // Owner can always access
  }

  if (role === "utilisateur") {
    // User can only access after trip ends
    return isTripFinished(currentDay, lastDefinedDay);
  }

  // Visitor never has access
  return false;
}

/**
 * Obtient un message d'erreur approprié pour l'accès refusé à l'album.
 */
export function getAlbumAccessDeniedMessage(
  role: Role | null,
  currentDay: number,
  lastDefinedDay: number | null
): string {
  if (role === "visiteur") {
    return "Cette rubrique est réservée aux voyageurs.";
  }

  if (role === "utilisateur" && !isTripFinished(currentDay, lastDefinedDay)) {
    return "L'album souvenir sera disponible après la fin du voyage.";
  }

  return "Accès refusé: vous n'avez pas accès à l'album.";
}

/**
 * Détermine si le menu devrait afficher l'entrée "Album souvenir".
 * Cette fonction est utilisée par le composant de navigation.
 *
 * @param role Rôle du profil
 * @param currentDay Jour actuel du voyage
 * @param lastDefinedDay Dernier jour du voyage défini
 * @returns true si l'item doit être visible dans le menu
 */
export function shouldShowAlbumMenuItem(
  role: Role | null,
  currentDay: number,
  lastDefinedDay: number | null
): boolean {
  return canAccessAlbumComposition(role, currentDay, lastDefinedDay);
}
