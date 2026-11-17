import { useId, useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Textarea } from '../../../components/ui/Textarea'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'textarea', title: 'Textarea', order: 23 }

const placeholder = '메시지를 입력하세요.'

const Case = ({
  title,
  tight = false,
  children,
}: {
  title: string
  tight?: boolean
  children: ReactNode
}) => {
  // Hooks
  const id = useId()

  return (
    <div role="group" aria-labelledby={id} className={`flex flex-col ${tight ? 'gap-0' : 'gap-3'}`}>
      <span id={id} className="text-xs font-medium text-muted-foreground">
        {title}
      </span>
      {children}
    </div>
  )
}

export const Demo = () => {
  // Hooks
  const [message, setMessage] = useState('')

  return (
    <div className="grid items-start gap-x-8 gap-y-10 md:grid-cols-3">
      <Case title="Demo">
        <Textarea aria-label="데모 메시지" placeholder={placeholder} />
      </Case>
      <Case title="Field">
        <Textarea
          label="메시지"
          description="아래에 메시지를 입력하세요."
          placeholder={placeholder}
        />
      </Case>
      <Case title="Disabled">
        <Textarea label="메시지" disabled placeholder={placeholder} />
      </Case>
      <Case title="Invalid" tight>
        <Textarea
          label="메시지"
          invalid
          description="올바른 메시지를 입력하세요."
          placeholder={placeholder}
        />
      </Case>
      <Case title="Button">
        <div className="grid gap-2">
          <Textarea
            aria-label="보낼 메시지"
            placeholder={placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button onClick={() => setMessage('')}>메시지 보내기</Button>
        </div>
      </Case>
    </div>
  )
}
