import { Component, type ComponentType, type ReactNode } from 'react'

export type GallerySection = { id: string; title: string; order: number }

type GalleryModule = { section: GallerySection; Demo: ComponentType }

// Whole modules are bundled into this lazily loaded route chunk (one glob, no dynamic import).
const entries = Object.values(import.meta.glob<GalleryModule>('./sections/*.tsx', { eager: true }))
  .map(({ section, Demo }) => ({ section, Demo }))
  .sort((a, b) => a.section.order - b.section.order)

type BoundaryProps = { children: ReactNode }

// Error boundaries can only be class components; isolates a broken demo from the other sections.
class SectionErrorBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <p role="alert" className="text-sm text-destructive-foreground">
        이 섹션을 불러오지 못했어.
      </p>
    ) : (
      this.props.children
    )
  }
}

export const ComponentsGalleryPage = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-10 p-6 text-foreground">
    <h1 className="text-2xl leading-[1.3] font-semibold">컴포넌트</h1>
    {entries.map(({ section, Demo }) => (
      <section
        key={section.id}
        aria-labelledby={`section-${section.id}`}
        className="flex flex-col gap-4"
      >
        <h2 id={`section-${section.id}`} className="text-base font-semibold">
          {section.title}
        </h2>
        <SectionErrorBoundary>
          <Demo />
        </SectionErrorBoundary>
      </section>
    ))}
  </main>
)
