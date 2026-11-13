import { useState, type ComponentType } from 'react'
import { FileText, Film, Image as ImageIcon, Link2, ScanSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The first piece of someone's finished work, as the server describes it. */
export type WorkPreviewData = {
  kind: 'image' | 'video' | 'document' | 'link'
  name: string
  pieceTitle: string
  url: string | null
}

const ICONS: Record<WorkPreviewData['kind'], ComponentType<{ className?: string }>> = {
  image: ImageIcon,
  video: Film,
  document: FileText,
  link: Link2,
}

/**
 * A square look at the work. A picture when it is an image and its link works; otherwise a type icon with the file
 * name or link host underneath. It is never blank: no preview at all shows the page's own icon. Links are short-lived,
 * so a picture that fails to load falls back to the icon instead of a broken image.
 */
export function WorkPreview({
  preview,
  fallbackIcon: Fallback = ScanSearch,
  className,
}: {
  preview?: WorkPreviewData | null
  fallbackIcon?: ComponentType<{ className?: string }>
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const box = 'grid shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-text-2'
  if (!preview) {
    return (
      <span className={cn(box, 'size-14', className)} aria-hidden>
        <Fallback className="size-6" />
      </span>
    )
  }
  const Icon = ICONS[preview.kind]
  if (preview.kind === 'image' && preview.url && !broken) {
    return (
      <span className={cn(box, 'size-14', className)}>
        <img src={preview.url} alt={preview.pieceTitle || preview.name} loading="lazy" onError={() => setBroken(true)} className="size-full object-cover" />
      </span>
    )
  }
  return (
    <span className={cn(box, 'size-14 gap-0.5 px-1', className)} title={preview.name}>
      <Icon className="size-5" aria-hidden />
      <span className="w-full truncate text-center text-[0.6rem] leading-none text-text-3">{preview.name}</span>
    </span>
  )
}
