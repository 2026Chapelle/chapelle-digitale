/**
 * Ancienne route « Nouveaux venus » (Lot V2.1B — démo/mock, désormais retirée).
 *
 * La vraie inbox « Nouveau Venu » (données réelles de public.newcomer_intakes)
 * est livrée en V2.1D-D sur /admin/nouveaux-venus. Pour éviter toute confusion
 * avec l'ancienne page fictive, cette route redirige (côté serveur) vers la
 * vraie page. La route est conservée : les liens existants du cockpit pastoral
 * continuent de fonctionner. Aucune donnée fictive n'est plus affichée ici.
 */
import { redirect } from 'next/navigation'

export default function NouveauxVenusRedirectPage() {
  redirect('/admin/nouveaux-venus')
}
