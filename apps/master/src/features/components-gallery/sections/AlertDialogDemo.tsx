import { useState } from 'react'
import { AlertDialog, type AlertDialogProps } from '../../../components/ui/AlertDialog'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'alert-dialog', title: 'Alert Dialog', order: 51 }

const examples: { label: string; props: AlertDialogProps }[] = [
  { label: 'Basic', props: {} },
  {
    label: 'Small',
    props: {
      size: 'sm',
      title: '이 기기의 연결을 허용할까요?',
      description: '허용하면 이 기기가 계정에 접근할 수 있습니다.',
      cancelLabel: '허용 안 함',
      actionLabel: '허용',
    },
  },
  {
    label: 'Media',
    props: {
      media: 'share',
      triggerLabel: '프로젝트 공유',
      title: '이 프로젝트를 공유할까요?',
      description: '링크가 있는 사람은 누구나 이 프로젝트를 보고 편집할 수 있습니다.',
      actionLabel: '공유',
    },
  },
  {
    label: 'Small with Media',
    props: {
      size: 'sm',
      media: 'bluetooth',
      title: '액세서리 연결을 허용할까요?',
      description: '이 액세서리가 기기에 연결되도록 허용합니다.',
      cancelLabel: '허용 안 함',
      actionLabel: '허용',
    },
  },
  {
    label: 'Destructive',
    props: {
      size: 'sm',
      media: 'trash',
      destructive: true,
      triggerVariant: 'destructive',
      triggerLabel: '채팅 삭제',
      title: '채팅을 삭제할까요?',
      description: '이 채팅이 영구적으로 삭제되며 되돌릴 수 없습니다.',
      actionLabel: '삭제',
    },
  },
]

export const Demo = () => {
  // Hooks
  const [last, setLast] = useState('없음')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-8">
        {examples.map(({ label, props }) => (
          <div
            key={label}
            role="group"
            aria-label={label}
            className="flex flex-col items-start gap-3"
          >
            <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">
              {label}
            </span>
            <AlertDialog {...props} onAction={() => setLast(props.actionLabel ?? '계속')} />
          </div>
        ))}
      </div>
      <p
        aria-live="polite"
        className="m-0 text-sm text-muted-foreground"
      >{`마지막 동작: ${last}`}</p>
    </div>
  )
}
