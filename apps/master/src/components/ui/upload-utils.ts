export type UploadKind = 'image' | 'file'

type FileLike = { name: string; size: number; type: string }
type Rules = { kind: UploadKind; maxSizeMB: number; accept?: string }

const MB = 1024 * 1024

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

export const IMAGE_ACCEPT = [...IMAGE_EXTS, ...IMAGE_TYPES].join(',')

export const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

export const fileExt = ({ name, type }: Pick<FileLike, 'name' | 'type'>) => {
  const fromName = name.includes('.') ? (name.split('.').pop() ?? '').toUpperCase() : ''
  if (fromName && fromName.length <= 5) return fromName
  return (type.split('/')[1] || 'FILE').toUpperCase()
}

const matchesAccept = (accept: string, { name, type }: Pick<FileLike, 'name' | 'type'>) => {
  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return true
  const lowerName = name.toLowerCase()
  const lowerType = type.toLowerCase()
  return tokens.some((token) =>
    token.startsWith('.')
      ? lowerName.endsWith(token)
      : token.endsWith('/*')
        ? lowerType.startsWith(token.slice(0, -1))
        : lowerType === token,
  )
}

export const validateFile = ({ kind, maxSizeMB, accept }: Rules, file: FileLike) => {
  if (kind === 'image') {
    const lowerName = file.name.toLowerCase()
    if (
      !IMAGE_TYPES.includes(file.type.toLowerCase()) ||
      !IMAGE_EXTS.some((ext) => lowerName.endsWith(ext))
    )
      return '이미지 파일만 올릴 수 있습니다.'
  } else if (!matchesAccept(accept ?? '', file)) return '허용하지 않는 파일 형식입니다.'
  if (file.size > maxSizeMB * MB) return `${maxSizeMB}MB를 넘는 파일입니다.`
  return null
}
