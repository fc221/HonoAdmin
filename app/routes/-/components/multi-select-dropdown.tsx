export interface MultiSelectOption {
  badge?: string
  label: string
  value: string | number
}

interface Props {
  emptyText?: string
  name: string
  options: MultiSelectOption[]
  placeholder?: string
  selectedValues: Array<string | number>
}

export default function MultiSelectDropdown({
  emptyText = '暂无可选项',
  name,
  options,
  placeholder = '请选择',
  selectedValues,
}: Props) {
  const selectedSet = new Set(selectedValues.map(String))
  const selectedLabels = options
    .filter((option) => selectedSet.has(String(option.value)))
    .map((option) => option.label)
  const summary = selectedLabels.length ? selectedLabels.join('、') : placeholder

  return (
    <details
      class="dropdown w-full min-w-0 max-w-full"
      data-controller="multi-select"
    >
      <summary class="btn btn-outline w-full min-w-0 justify-between font-normal">
        <span class="min-w-0 truncate" data-multi-select-target="summary">
          {summary}
        </span>
        <i class="icon-[ri--arrow-down-s-line]" aria-hidden="true" />
      </summary>
      <div
        class="dropdown-content z-40 mt-2 w-full max-w-full rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        data-multi-select-placeholder={placeholder}
      >
        <div class="max-h-56 overflow-auto">
          {options.length
            ? options.map((option) => {
                const checked = selectedSet.has(String(option.value))

                return (
                  <label
                    class={getOptionClass(checked)}
                    data-multi-select-target="option"
                    data-multi-select-value={option.value}
                    key={option.value}
                  >
                    <input
                      checked={checked}
                      class="checkbox checkbox-primary checkbox-sm"
                      data-action="change->multi-select#toggle"
                      data-multi-select-label={option.label}
                      data-multi-select-target="checkbox"
                      name={name}
                      type="checkbox"
                      value={option.value}
                    />
                    <span class="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.badge
                      ? (
                          <span class="badge badge-ghost badge-sm shrink-0">
                            {option.badge}
                          </span>
                        )
                      : null}
                    <i
                      class={`icon-[ri--check-line] text-primary ${checked ? '' : 'hidden'}`}
                      data-multi-select-target="check"
                      data-multi-select-value={option.value}
                    />
                  </label>
                )
              })
            : (
                <div class="px-3 py-2 text-sm text-base-content/60">
                  {emptyText}
                </div>
              )}
        </div>
      </div>
    </details>
  )
}

export function getMultiSelectOptionClass(checked: boolean): string {
  return getOptionClass(checked)
}

function getOptionClass(checked: boolean): string {
  if (checked) {
    return 'flex min-w-0 cursor-pointer items-center gap-3 rounded-field bg-primary/10 px-3 py-2 text-primary'
  }

  return 'flex min-w-0 cursor-pointer items-center gap-3 rounded-field px-3 py-2 hover:bg-base-200'
}
