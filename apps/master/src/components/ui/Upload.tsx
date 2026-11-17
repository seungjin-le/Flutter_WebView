import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import { XIcon } from './icons'
import { IMAGE_ACCEPT, fileExt, formatSize, validateFile } from './upload-utils'
import type { UploadKind } from './upload-utils'

export type UploadedFile = { name: string; size: number; type: string; url: string }

export type UploadProps = {
  kind?: UploadKind
  multiple?: boolean
  label?: string
  accept?: string
  maxFiles?: number
  maxSizeMB?: number
  onChange?: (files: UploadedFile[]) => void
}

type Item = {
  id: string
  name: string
  size: number
  type: string
  url: string
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

function release(item: Item) {
  if (item.url) URL.revokeObjectURL(item.url)
}

const cx = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ')

const Svg = ({ className, children }: { className: string; children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
)

const ImagePlusIcon = ({ className = 'size-5' }: { className?: string }) => (
  <Svg className={className}>
    <path d="M16 5h6" />
    <path d="M19 2v6" />
    <path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    <circle cx="9" cy="9" r="2" />
  </Svg>
)

const CloudUploadIcon = () => (
  <Svg className="size-5">
    <path d="M12 13v8" />
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="m8 17 4-4 4 4" />
  </Svg>
)

const FileIcon = () => (
  <Svg className="size-5">
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M10 9H8" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
  </Svg>
)

const AlertIcon = ({ className = 'size-5' }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </Svg>
)

const RefreshIcon = () => (
  <Svg className="size-3">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </Svg>
)

const focusRing = 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-primary/30'
const dragRing = 'border-primary ring-[3px] ring-primary/30'

const Bar = ({ progress, className }: { progress: number; className: string }) => (
  <span aria-hidden="true" className={cx('absolute overflow-hidden', className)}>
    <span
      className="block h-full bg-primary transition-[width] duration-[160ms] ease-linear"
      style={{ width: `${progress}%` }}
    />
  </span>
)

const RemoveButton = ({
  name,
  flat,
  onClick,
}: {
  name: string
  flat?: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    aria-label={`${name} 제거`}
    onClick={onClick}
    className={cx(
      'inline-flex items-center justify-center rounded-md border border-transparent p-0 outline-none transition-all duration-150',
      focusRing,
      flat
        ? 'size-7 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
        : 'size-6 bg-[rgba(255,255,255,.92)] text-foreground shadow-[0_1px_2px_rgba(0,0,0,.12)] hover:bg-surface',
    )}
  >
    <XIcon className="pointer-events-none size-3.5" />
  </button>
)

const ChangeChip = ({ outline, onClick }: { outline?: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      'inline-flex items-center gap-1 rounded-md border font-[inherit] text-xs font-medium text-foreground outline-none transition-all duration-150 hover:bg-muted',
      focusRing,
      outline
        ? 'h-7 border-border bg-surface px-2.5 shadow-control'
        : 'h-6 border-transparent bg-[rgba(255,255,255,.92)] px-2 shadow-[0_1px_2px_rgba(0,0,0,.12)]',
    )}
  >
    <RefreshIcon />
    변경
  </button>
)

const metaText = (item: Item) =>
  item.status === 'error'
    ? (item.error ?? '')
    : item.status === 'uploading'
      ? `업로드 중 · ${item.progress}%`
      : `${fileExt(item)} · ${formatSize(item.size)}`

const NameMeta = ({ item, narrow }: { item: Item; narrow?: boolean }) => (
  <>
    <p
      title={item.name}
      className={cx(
        'm-0 truncate text-sm leading-5 font-medium',
        item.status === 'uploading' &&
          'animate-upload-shimmer bg-[linear-gradient(90deg,#737373_0%,#737373_35%,#0a0a0a_50%,#737373_65%,#737373_100%)] bg-[length:200%_100%] bg-clip-text text-transparent motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-[#737373]',
        narrow && 'px-1',
      )}
    >
      {item.name}
    </p>
    <p
      className={cx(
        'm-0 truncate text-xs leading-4 tabular-nums',
        item.status === 'error' ? 'text-destructive-foreground' : 'text-muted-foreground',
        narrow && 'px-1 pb-1',
      )}
    >
      {metaText(item)}
    </p>
  </>
)

export const Upload = ({
  kind = 'image',
  multiple = true,
  label,
  accept,
  maxFiles = 5,
  maxSizeMB = kind === 'image' ? 5 : 10,
  onChange,
}: UploadProps) => {
  // Variables
  const isImage = kind === 'image'
  const unit = isImage ? '장' : '개'
  const limit = multiple ? maxFiles : 1

  // Hooks
  const uid = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef<Item[]>([])
  const counterRef = useRef(0)
  const onChangeRef = useRef(onChange)
  const [files, setFiles] = useState<Item[]>([])
  const [drag, setDrag] = useState(false)
  const [message, setMessage] = useState('')
  const [live, setLive] = useState('')

  const commit = useCallback((next: Item[], notify = true) => {
    filesRef.current = next
    setFiles(next)
    if (notify)
      onChangeRef.current?.(
        next
          .filter((f) => f.status === 'done')
          .map(({ name, size, type, url }) => ({ name, size, type, url })),
      )
  }, [])

  // Computed
  const descId = `${uid}-desc`
  const count = files.filter((f) => f.status !== 'error').length
  const full = multiple && count >= limit
  const hasUploading = files.some((f) => f.status === 'uploading')
  const heading =
    label ??
    (isImage ? (multiple ? '이미지' : '대표 이미지') : multiple ? '첨부 파일' : '첨부 파일 (1개)')
  const typeText = isImage
    ? 'PNG, JPG, GIF, WEBP'
    : accept
      ? accept
          .split(',')
          .map((x) => x.trim().replace(/^\./, '').toUpperCase())
          .join(', ')
      : '모든 형식'
  const hint = `${typeText} · ${
    multiple
      ? `${isImage ? '장당' : '파일당'} 최대 ${maxSizeMB}MB · 최대 ${maxFiles}${unit}`
      : `최대 ${maxSizeMB}MB · 1${unit}`
  }`
  const one = !multiple ? files[0] : undefined
  const showDrop = multiple || (!isImage && !one)
  const showBox = isImage && !multiple && !one
  const dropTitle = full
    ? '최대 개수에 도달했습니다'
    : drag
      ? '여기에 놓으세요'
      : multiple
        ? `클릭하거나 ${isImage ? '이미지를' : '파일을'} 끌어다 놓으세요`
        : '파일 선택 또는 끌어다 놓기'
  const dropSub = multiple ? `${count} / ${limit}${unit}` : `최대 ${maxSizeMB}MB`
  const idleHover = !drag && 'hover:border-placeholder hover:bg-subtle'
  const dragFill = drag && 'border-solid border-primary bg-primary-soft'
  const iconBox = cx(
    'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
    drag ? 'bg-primary-soft-border text-primary-hover' : 'bg-muted text-foreground',
  )

  // Watchers
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (!hasUploading) return
    const timer = setInterval(() => {
      const finishedNames: string[] = []
      const next = filesRef.current.map((f): Item => {
        if (f.status !== 'uploading') return f
        const progress = Math.min(100, f.progress + 8 + Math.round(Math.random() * 12))
        if (progress < 100) return { ...f, progress }
        finishedNames.push(f.name)
        return { ...f, progress, status: 'done' }
      })
      commit(next, finishedNames.length > 0)
      if (finishedNames.length) setLive(`${finishedNames.join(', ')} 업로드를 마쳤습니다.`)
    }, 160)
    return () => clearInterval(timer)
  }, [hasUploading, commit])

  useEffect(
    () => () => {
      filesRef.current.forEach(release)
    },
    [],
  )

  // Functions
  function make(file: File): Item {
    const base = {
      id: `${uid}-${++counterRef.current}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: '',
    }
    const error = validateFile({ kind, maxSizeMB, accept }, file)
    if (error) return { ...base, status: 'error', progress: 0, error }
    return {
      ...base,
      url: isImage ? URL.createObjectURL(file) : '',
      status: 'uploading',
      progress: 0,
    }
  }

  function addFiles(list: File[]) {
    if (!list.length) return
    const current = filesRef.current
    let added: Item[]
    let next: Item[]
    let note = ''
    if (!multiple) {
      current.forEach(release)
      added = [make(list[0])]
      next = added
      if (list.length > 1) note = `1${unit}만 올릴 수 있어 첫 번째 파일만 사용했습니다.`
    } else {
      let room = limit - count
      let skipped = 0
      added = []
      list.forEach((file) => {
        const item = make(file)
        if (item.status !== 'error') {
          if (room <= 0) {
            skipped++
            release(item)
            return
          }
          room--
        }
        added.push(item)
      })
      next = [...current, ...added]
      if (skipped) note = `최대 ${limit}${unit}까지 올릴 수 있어 ${skipped}개는 제외했습니다.`
    }
    setMessage(note)
    setLive(`${added.length}개 파일을 추가했습니다.`)
    commit(next)
  }

  // Handlers
  const handleRemove = (item: Item) => {
    release(item)
    setMessage('')
    setLive(`${item.name}을(를) 제거했습니다.`)
    commit(filesRef.current.filter((f) => f.id !== item.id))
  }

  const handleBrowse = () => inputRef.current?.click()

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault()
    setDrag(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)))
      setDrag(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (!full) addFiles(Array.from(e.dataTransfer.files))
  }

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 font-sans text-foreground">
      <div className="flex flex-col gap-1.5">
        {heading && <p className="m-0 text-sm leading-snug font-medium">{heading}</p>}
        <p id={descId} className="m-0 text-sm leading-5 text-muted-foreground">
          {hint}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={isImage ? IMAGE_ACCEPT : accept}
        multiple={multiple}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleFileChange}
      />

      {showDrop && (
        <button
          type="button"
          aria-describedby={descId}
          disabled={full}
          onClick={handleBrowse}
          {...dragProps}
          className={cx(
            'flex w-1/2 min-w-[min(100%,240px)] cursor-pointer items-center rounded-[10px] border border-dashed border-input-strong bg-surface text-foreground outline-none transition-[border-color,background-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50',
            focusRing,
            multiple
              ? 'flex-col justify-center gap-2 px-4 py-7 text-center'
              : 'justify-start gap-3 px-4 py-3 text-left',
            idleHover,
            dragFill,
          )}
        >
          <span aria-hidden="true" className={iconBox}>
            {isImage ? <ImagePlusIcon /> : <CloudUploadIcon />}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{dropTitle}</span>
            <span className="text-xs text-muted-foreground">{dropSub}</span>
          </span>
        </button>
      )}

      {showBox && (
        <button
          type="button"
          aria-describedby={descId}
          onClick={handleBrowse}
          {...dragProps}
          className={cx(
            'relative flex aspect-[4/3] w-[220px] max-w-full cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[10px] border border-dashed border-input-strong bg-surface p-3 text-center text-foreground outline-none transition-[border-color,background-color,box-shadow] duration-150',
            focusRing,
            idleHover,
            dragFill,
          )}
        >
          <span aria-hidden="true" className={iconBox}>
            <ImagePlusIcon />
          </span>
          <span className="text-sm font-medium">{drag ? '여기에 놓으세요' : '이미지 선택'}</span>
          <span className="text-xs text-muted-foreground">또는 끌어다 놓기</span>
        </button>
      )}

      {isImage && one && (
        <div className="flex flex-col items-start gap-2">
          <div
            aria-busy={one.status === 'uploading'}
            {...dragProps}
            className={cx(
              'relative flex aspect-[4/3] w-[220px] max-w-full flex-col items-center justify-center overflow-hidden rounded-[10px] border transition-[border-color,background-color,box-shadow] duration-150',
              one.status === 'error'
                ? 'border-destructive/40 bg-destructive/[.06] text-destructive-foreground'
                : 'border-border bg-muted text-foreground',
              drag && dragRing,
            )}
          >
            {one.url && one.status !== 'error' && (
              <img
                src={one.url}
                alt={one.name}
                className={cx(
                  'block size-full object-cover transition-opacity duration-200',
                  one.status === 'uploading' && 'opacity-60',
                )}
              />
            )}
            {one.status === 'error' && <AlertIcon className="size-7" />}
            {one.status === 'uploading' && (
              <Bar
                progress={one.progress}
                className="inset-x-0 bottom-0 h-1 bg-[rgba(0,0,0,.08)]"
              />
            )}
            <div className="absolute top-2 right-2 flex gap-1">
              <ChangeChip onClick={handleBrowse} />
              <RemoveButton name={one.name} onClick={() => handleRemove(one)} />
            </div>
          </div>
          <div className="flex w-[220px] max-w-full flex-col gap-0.5">
            <NameMeta item={one} />
          </div>
        </div>
      )}

      {message && (
        <p role="alert" className="m-0 text-sm leading-5 text-destructive-foreground">
          {message}
        </p>
      )}

      {isImage && multiple && files.length > 0 && (
        <div
          role="group"
          aria-label="첨부한 이미지"
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-0.5 pt-0.5 pb-1.5 [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]"
        >
          {files.map((f) => (
            <div
              key={f.id}
              aria-busy={f.status === 'uploading'}
              className={cx(
                'relative flex w-40 shrink-0 snap-start flex-col gap-2 rounded-[10px] border bg-surface p-2 transition-colors duration-150',
                f.status === 'error' ? 'border-destructive/40' : 'border-border',
              )}
            >
              <div
                className={cx(
                  'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md',
                  f.status === 'error'
                    ? 'bg-destructive/10 text-destructive-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {f.url && f.status !== 'error' && (
                  <img
                    src={f.url}
                    alt={f.name}
                    className={cx(
                      'block size-full object-cover transition-opacity duration-200',
                      f.status === 'uploading' && 'opacity-60',
                    )}
                  />
                )}
                {f.status === 'error' && <AlertIcon className="size-7" />}
              </div>
              <NameMeta item={f} narrow />
              <span className="absolute top-3 right-3 flex">
                <RemoveButton name={f.name} onClick={() => handleRemove(f)} />
              </span>
            </div>
          ))}
        </div>
      )}

      {!isImage && files.length > 0 && (
        <ul aria-label="첨부한 파일" className="m-0 flex list-none flex-col gap-2 p-0">
          {files.map((f) => (
            <li
              key={f.id}
              aria-busy={f.status === 'uploading'}
              {...(multiple ? {} : dragProps)}
              className={cx(
                'relative flex min-w-0 items-center gap-3 rounded-[10px] border bg-surface p-2 transition-[border-color,box-shadow] duration-150',
                f.status === 'error' ? 'border-destructive/40' : 'border-border',
                !multiple && drag && dragRing,
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'flex size-10 shrink-0 items-center justify-center rounded-md',
                  f.status === 'error'
                    ? 'bg-destructive/10 text-destructive-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {f.status === 'error' ? <AlertIcon /> : <FileIcon />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <NameMeta item={f} />
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {!multiple && <ChangeChip outline onClick={handleBrowse} />}
                <RemoveButton flat name={f.name} onClick={() => handleRemove(f)} />
              </span>
              {f.status === 'uploading' && (
                <Bar
                  progress={f.progress}
                  className="inset-x-2 -bottom-px h-0.5 rounded-sm bg-[rgba(0,0,0,.06)]"
                />
              )}
            </li>
          ))}
        </ul>
      )}
      <span className="sr-only" aria-live="polite">
        {live}
      </span>
    </div>
  )
}
