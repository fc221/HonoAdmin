import type { Child } from 'hono/jsx'

interface RadioTabItem {
  label: string
  value: string
}

interface Props {
  activeValue?: string
  children: Child
  contentClass?: string
  name: string
  tabs: RadioTabItem[]
}

export default function RadioTabs({
  activeValue,
  children,
  contentClass = 'tab-content border-base-300 bg-base-100 p-6',
  name,
  tabs,
}: Props) {
  const childrenList = Array.isArray(children) ? children : [children]
  const currentValue = getCurrentValue(tabs, activeValue)

  return (
    <div class="tabs tabs-lift">
      {tabs.map((tab, index) => (
        <>
          <label class="tab z-1">
            <input
              name={name}
              type="radio"
              value={tab.value}
              // @ts-expect-error
              checked={currentValue === tab.value ? 'checked' : undefined}
            />
            {tab.label}
          </label>
          <div class={contentClass}>
            {childrenList[index]}
          </div>
        </>
      ))}
    </div>
  )
}

function getCurrentValue(tabs: RadioTabItem[], value: string | undefined) {
  if (value && tabs.some((tab) => tab.value === value)) {
    return value
  }

  return tabs[0]?.value ?? ''
}
