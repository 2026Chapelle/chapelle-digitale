const PRODUCTION_PROJECT_REF =
  'nvyuyffywnuollaxguen'

const PRODUCTION_APP_HOST =
  'citadelle.chapelleduroyaume.org'

const LOAD_SCENARIOS =
  new Set([
    'low',
    'medium',
    'burst',
  ])

function requiredString(
  value,
  label,
) {
  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    throw new Error(
      `${label} is required`,
    )
  }

  return value.trim()
}

function parseHttpsUrl(
  value,
  label,
) {
  const input =
    requiredString(
      value,
      label,
    )

  let parsed

  try {
    parsed =
      new URL(input)
  }
  catch {
    throw new Error(
      `${label} is invalid`,
    )
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    throw new Error(
      `${label} must use authorized HTTPS`,
    )
  }

  return parsed
}

export function validateLoadTarget(
  config,
) {
  if (
    !config ||
    typeof config !== 'object' ||
    Array.isArray(config)
  ) {
    throw new Error(
      'LIVE 4B test target configuration is required',
    )
  }

  if (config.go !== true) {
    throw new Error(
      'LIVE 4B test authorization GO is required',
    )
  }

  /* TASK14_LOCAL_TARGET_MODE_V3 */
  if (config.targetMode === 'local') {
    const projectRef =
      requiredString(
        config.projectRef,
        'project ref',
      )

    const expectedProjectRef =
      requiredString(
        config.expectedProjectRef,
        'authorized project ref',
      )

    if (
      projectRef ===
      PRODUCTION_PROJECT_REF
    ) {
      throw new Error(
        'production project ref is forbidden',
      )
    }

    if (
      projectRef !==
      expectedProjectRef
    ) {
      throw new Error(
        'project ref mismatch',
      )
    }

    const scenario =
      requiredString(
        config.scenario,
        'scenario',
      )

    if (
      !LOAD_SCENARIOS.has(
        scenario,
      )
    ) {
      throw new Error(
        'unknown load scenario',
      )
    }

    let appUrl
    let supabaseUrl

    try {
      appUrl =
        new URL(
          requiredString(
            config.appUrl,
            'app URL',
          ),
        )

      supabaseUrl =
        new URL(
          requiredString(
            config.supabaseUrl,
            'Supabase URL',
          ),
        )
    } catch {
      throw new Error(
        'local URL is invalid',
      )
    }

    const loopbackHosts =
      new Set([
        '127.0.0.1',
        'localhost',
        '[::1]',
        '::1',
      ])

    if (
      !loopbackHosts.has(
        appUrl.hostname,
      )
    ) {
      throw new Error(
        'local app URL must use loopback',
      )
    }

    if (
      !loopbackHosts.has(
        supabaseUrl.hostname,
      )
    ) {
      throw new Error(
        'local Supabase URL must use loopback',
      )
    }

    return {
      projectRef,
      scenario,
      appUrl,
      supabaseUrl,
    }
  }

  const projectRef =
    requiredString(
      config.projectRef,
      'project ref',
    )

  const expectedProjectRef =
    requiredString(
      config.expectedProjectRef,
      'authorized project ref',
    )

  if (
    projectRef ===
    PRODUCTION_PROJECT_REF
  ) {
    throw new Error(
      'production project ref is forbidden',
    )
  }

  if (
    projectRef !==
    expectedProjectRef
  ) {
    throw new Error(
      'project ref mismatch',
    )
  }

  const scenario =
    requiredString(
      config.scenario,
      'scenario',
    )

  if (
    !LOAD_SCENARIOS.has(
      scenario,
    )
  ) {
    throw new Error(
      'unknown load scenario',
    )
  }

  const appUrl =
    parseHttpsUrl(
      config.appUrl,
      'app URL',
    )

  if (
    appUrl.hostname.toLowerCase() ===
    PRODUCTION_APP_HOST
  ) {
    throw new Error(
      'production app host is forbidden',
    )
  }

  const supabaseUrl =
    parseHttpsUrl(
      config.supabaseUrl,
      'Supabase URL',
    )

  const expectedSupabaseHost =
    `${projectRef}.supabase.co`

  if (
    supabaseUrl.hostname.toLowerCase() !==
    expectedSupabaseHost.toLowerCase()
  ) {
    throw new Error(
      'Supabase project URL mismatch',
    )
  }

  return {
    go: true,
    projectRef,
    expectedProjectRef,
    appUrl:
      appUrl.origin,
    supabaseUrl:
      supabaseUrl.origin,
    scenario,
  }
}

function percentileNearestRank(
  sorted,
  percentile,
) {
  const rank =
    Math.ceil(
      percentile *
      sorted.length,
    )

  return sorted[
    Math.max(
      0,
      rank - 1,
    )
  ]
}

export function summarizeMeasurements(
  samples,
) {
  if (
    !Array.isArray(samples) ||
    samples.length === 0
  ) {
    throw new Error(
      'measurement samples are required',
    )
  }

  for (const sample of samples) {
    if (
      typeof sample !== 'number' ||
      !Number.isFinite(sample) ||
      sample < 0
    ) {
      throw new Error(
        'measurement sample must be a finite non-negative number',
      )
    }
  }

  const sorted =
    [...samples].sort(
      (left, right) =>
        left - right,
    )

  const total =
    sorted.reduce(
      (sum, value) =>
        sum + value,
      0,
    )

  return {
    count:
      sorted.length,
    min:
      sorted[0],
    max:
      sorted[
        sorted.length - 1
      ],
    average:
      total /
      sorted.length,
    p95:
      percentileNearestRank(
        sorted,
        0.95,
      ),
    p99:
      percentileNearestRank(
        sorted,
        0.99,
      ),
  }
}