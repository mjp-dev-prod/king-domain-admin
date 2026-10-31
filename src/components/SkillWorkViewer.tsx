import { ExternalLink, FileText } from 'lucide-react'
import type { SkillFile, SkillWork } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const ROLE_LABEL: Record<SkillFile['role'], string> = {
  output: 'Finished work',
  working: 'Working file',
  draft: 'Draft',
  walkthrough: 'Walkthrough',
}

function megabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

/** One file: pictures and videos play inline, anything else is a link that downloads. */
function FileView({ file }: { file: SkillFile }) {
  if (!file.url) return <p className="text-sm text-muted-foreground">{file.name} (link unavailable)</p>
  return (
    <figure className="space-y-1">
      {file.contentType.startsWith('image/') && <img src={file.url} alt={file.name} className="max-h-96 w-full rounded-lg border border-border object-contain" />}
      {file.contentType.startsWith('video/') && <video src={file.url} controls playsInline preload="metadata" className="max-h-96 w-full rounded-lg border border-border" />}
      <figcaption className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{ROLE_LABEL[file.role]}</Badge>
        <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
          {!file.contentType.startsWith('image/') && !file.contentType.startsWith('video/') && <FileText className="size-3" />}
          {file.name}
        </a>
        <span>{megabytes(file.sizeBytes)}</span>
      </figcaption>
    </figure>
  )
}

/** Everything a checker or reviewer looks at: each piece with its files, the walkthrough, and the declaration. */
export function SkillWorkViewer({ work }: { work: SkillWork }) {
  return (
    <div className="space-y-4">
      {work.pieces.map((p, i) => (
        <Card key={p.id} className="space-y-3 p-4">
          <div>
            <p className="font-display text-lg font-semibold">
              {i + 1}. {p.title || 'Untitled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {p.role || 'Role not given'} · {p.madeOn || 'Date not given'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">The brief</p>
            <p className="text-sm">{p.brief || 'Not given'}</p>
          </div>
          {p.liveLink && (
            <a href={p.liveLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm underline">
              <ExternalLink className="size-3" /> {p.liveLink}
            </a>
          )}
          <div className="space-y-3">
            {p.files.map((f) => (
              <FileView key={f.id} file={f} />
            ))}
            {p.files.length === 0 && <p className="text-sm text-muted-foreground">No files, only the live link.</p>}
          </div>
        </Card>
      ))}

      <Card className="space-y-3 p-4">
        <p className="font-medium">Walkthrough</p>
        {work.walkthrough.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
        {work.walkthrough.map((f) => (
          <FileView key={f.id} file={f} />
        ))}
      </Card>

      <Card className="space-y-1 p-4 text-sm">
        <p className="font-medium">Declaration</p>
        <p>{work.declaration.ownWork ? 'Says the work is their own.' : 'Has not declared the work is their own.'}</p>
        <p className="text-muted-foreground">{work.declaration.aiUsed ? `Used AI: ${work.declaration.aiNote ?? 'no note'}` : 'Says no AI was used.'}</p>
      </Card>
    </div>
  )
}
