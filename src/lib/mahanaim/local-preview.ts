type PreviewEnv = {
  NODE_ENV?: string
  MAHANAIM_LOCAL_PREVIEW?: string
}

export function isMahanaimLocalPreviewEnabled(env: PreviewEnv): boolean {
  return env.NODE_ENV === 'development' && env.MAHANAIM_LOCAL_PREVIEW === '1'
}
