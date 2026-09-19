// Shows what the form would submit, so the effect of an autofill is visible
// without a server.
const form = document.getElementById('form')
const result = document.getElementById('result')

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = new FormData(form)
  result.textContent = [...data.entries()].map(([name, value]) => `${name} = ${value}`).join('\n')
})

form.addEventListener('reset', () => {
  result.textContent = ''
})
