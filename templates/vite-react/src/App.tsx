import { useState } from 'react'

export function App() {
  const [count, setCount] = useState(0)
  return (
    <main
      style={{ maxWidth: '44rem', margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}
    >
      <p>
        <a href="/">← web-playground</a>
      </p>
      <h1>__NAME__</h1>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        count is {count}
      </button>
      <p>
        Client-side routing: mount the router with <code>basename={import.meta.env.BASE_URL}</code>
        so deep links under <code>/__NAME__/</code> keep working after the CloudFront rewrite.
      </p>
    </main>
  )
}
