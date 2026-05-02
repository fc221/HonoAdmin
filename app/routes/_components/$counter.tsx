import { useState } from 'hono/jsx'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p class="py-2 text-2xl">{count}</p>
      <button
        class="px-4 py-2 bg-primary text-white rounded cursor-pointer"
        onClick={() => setCount(count + 1)}
      >
        Increment
      </button>
      <button class="btn bg-secondary"></button>
      <button class="btn bg-accent"></button>
      <button class="btn bg-neutral"></button>
      <button class="btn bg-info"></button>
      <button class="btn bg-base-200"></button>
      <button class="btn bg-base-300"></button>
      <button class="btn bg-base-content"></button>

      <button
        class="btn"
        popovertarget="popover-2"
        style="anchor-name:--anchor-2"
      >
        Button
      </button>
      <ul
        class="dropdown dropdown-right menu w-52 rounded-box bg-base-100 ml-1"
        popover="auto"
        id="popover-2"
        style="position-anchor:--anchor-2"
      >
        <li>
          <a>Item 1</a>
        </li>
        <li>
          <a>Item 2</a>
        </li>
      </ul>

      <details class="dropdown">
        <summary class="btn m-1">open or close</summary>
        <ul class="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
          <li>
            <a>Item 1</a>
          </li>
          <li>
            <a>Item 2</a>
          </li>
        </ul>
      </details>
    </div>
  )
}
