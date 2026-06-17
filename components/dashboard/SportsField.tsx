'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Controlled sports multi-select that emits one hidden `<input name="sports">`
 * per selected sport, so it posts cleanly to a server action via FormData
 * (read with `formData.getAll('sports')`). Suggestions come from the
 * institution's configured sports; admins can add custom ones.
 */
export function SportsField({
  initial = [],
  suggestions = [],
}: {
  initial?: string[]
  suggestions?: string[]
}) {
  const [selected, setSelected] = useState<string[]>(initial)
  const [custom, setCustom] = useState('')

  function toggle(sport: string) {
    setSelected((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    )
  }

  function addCustom() {
    const s = custom.trim()
    if (s && !selected.includes(s)) setSelected((prev) => [...prev, s])
    setCustom('')
  }

  const options = Array.from(new Set([...suggestions, ...selected]))

  return (
    <div className="space-y-2">
      {selected.map((s) => (
        <input key={s} type="hidden" name="sports" value={s} />
      ))}

      <div className="flex flex-wrap gap-2">
        {options.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No sports configured yet — add one below.
          </p>
        )}
        {options.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggle(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm transition-colors',
              selected.includes(s)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-muted-foreground hover:border-primary/40'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Add a sport"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addCustom}>
          Add
        </Button>
      </div>
    </div>
  )
}
