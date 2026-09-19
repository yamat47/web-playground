// Shows what the form would submit, so the effect of an autofill is visible
// without a server. The output belongs to the form, so Clear resets it too.
const form = document.getElementById('form')
const result = document.getElementById('result')

form.addEventListener('submit', (event) => {
  event.preventDefault()
  result.value = [...new FormData(form)].map(([name, value]) => `${name} = ${value}`).join('\n')
})
