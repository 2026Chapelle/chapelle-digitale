import {
  getOrCreateGuestSessionId,
  type LivePresenceCrypto,
  type LivePresenceStorage,
} from '@/lib/live/live-presence-client'

export const LIVE_PUBLIC_URL =
  'https://citadelle.chapelleduroyaume.org/live'

export const LIVE_SHARE_TEXT =
  'Nous sommes en direct sur Citadelle. Rejoins-nous maintenant pour vivre le culte avec la Famille Royale.'

export type LiveShareActionKind =
  | 'native_share'
  | 'copy_link'

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

type Dependencies = {
  storage?: LivePresenceStorage
  cryptoApi?: LivePresenceCrypto
  fetcher?: FetchLike
}

export async function recordSuccessfulLiveShare(
  actionKind:
    LiveShareActionKind,
  dependencies:
    Dependencies = {},
): Promise<boolean> {
  try {
    const storage =
      dependencies.storage ??
      window.localStorage

    const cryptoApi =
      dependencies.cryptoApi ??
      window.crypto

    const fetcher =
      dependencies.fetcher ??
      fetch

    const guestSessionId =
      getOrCreateGuestSessionId(
        storage,
        cryptoApi,
      )

    const response =
      await fetcher(
        '/api/live/share',
        {
          method: 'POST',
          cache: 'no-store',
          credentials:
            'same-origin',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            actionKind,
            guestSessionId,
          }),
        },
      )

    if (!response.ok) {
      return false
    }

    const payload =
      await response
        .json()
        .catch(() => null)

    return (
      payload?.ok === true
    )
  } catch {
    return false
  }
}