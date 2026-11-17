import { useState } from 'react'
import { DropdownMenu, type MenuEntry } from '../../../components/ui/DropdownMenu'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'dropdown-menu', title: 'Dropdown Menu', order: 33 }

const optionItems: MenuEntry[] = [
  { value: 'new', label: '새로 만들기' },
  { value: 'copy', label: '복제', disabled: true },
  { type: 'checkbox', value: 'preview', label: '미리보기 표시' },
  { type: 'separator' },
  { value: 'delete', label: '삭제', variant: 'destructive' },
]

export const Demo = () => {
  // Hooks
  const [notify, setNotify] = useState(true)
  const [last, setLast] = useState('없음')

  // Computed
  const accountItems: MenuEntry[] = [
    { type: 'label', label: '내 계정' },
    { type: 'separator' },
    { value: 'profile', label: '프로필', shortcut: '⇧⌘P' },
    { value: 'settings', label: '설정', shortcut: '⌘S' },
    { type: 'checkbox', value: 'notify', label: '알림 받기', checked: notify },
    { type: 'separator' },
    { value: 'logout', label: '로그아웃', variant: 'destructive' },
  ]
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex flex-col items-start gap-2">
        <DropdownMenu
          ariaLabel="계정 메뉴"
          items={accountItems}
          onItemSelect={(value, checked) => {
            setLast(value)
            if (value === 'notify') setNotify(!!checked)
          }}
        />
        <p className="text-sm text-muted-foreground">마지막 실행: {last}</p>
        <p className="text-sm text-muted-foreground">알림: {notify ? '켜짐' : '꺼짐'}</p>
      </div>
      <DropdownMenu
        triggerVariant="outline"
        triggerLabel="옵션"
        align="start"
        items={optionItems}
      />
    </div>
  )
}
