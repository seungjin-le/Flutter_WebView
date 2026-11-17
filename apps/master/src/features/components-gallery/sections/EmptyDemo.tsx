import { Empty } from '../../../components/ui/Empty'
import type { GallerySection } from '../ComponentsGalleryPage'

export const section: GallerySection = { id: 'empty', title: 'Empty', order: 54 }

export const Demo = () => (
  <Empty
    bordered
    icon="folder"
    title="아직 프로젝트가 없어요"
    description="아직 만든 프로젝트가 없습니다. 첫 프로젝트를 만들어 시작해 보세요."
    actionLabel="프로젝트 만들기"
    secondaryLabel="가져오기"
  />
)
