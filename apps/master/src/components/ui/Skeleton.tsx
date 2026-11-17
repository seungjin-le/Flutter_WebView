type SkeletonProps = {
  width?: string
  height?: string
  radius?: string
  className?: string
}

export const Skeleton = ({
  width = '100%',
  height = '16px',
  radius = '6px',
  className,
}: SkeletonProps) => (
  <span
    data-slot="skeleton"
    aria-hidden="true"
    className={['block animate-skeleton bg-muted', className].filter(Boolean).join(' ')}
    style={{ width, height, borderRadius: radius }}
  />
)
