import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

test('shows an empty state when the database has no intakes', async () => {
  const fetchMock = vi.fn(() => Promise.resolve(Response.json([])))
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)

  expect(await screen.findByRole('heading', { name: 'No intakes yet' })).toBeVisible()
  expect(screen.getByText('New submissions will appear here as soon as they’re saved.')).toBeVisible()
  expect(screen.getByText('0 records shown')).toBeVisible()
  expect(screen.queryByRole('button', { name: /^View / })).not.toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith('/api/intakes', expect.objectContaining({ signal: expect.any(AbortSignal) }))
})

test('saves an intake and shows a visible warning when AI triage is unavailable', async () => {
  const user = userEvent.setup()
  let finishPost!: (response: Response) => void
  const pendingPost = new Promise<Response>((resolve) => { finishPost = resolve })
  const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input) === '/api/intakes' && options?.method === 'POST') return pendingPost
    if (String(input) === '/api/intakes') return Promise.resolve(Response.json([]))
    throw new Error(`Unexpected request: ${input}`)
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'New intake' }))
  await user.type(screen.getByRole('textbox', { name: 'Project title' }), 'Support pilot')
  await user.type(screen.getByRole('textbox', { name: 'Description' }), 'Answer common customer questions.')
  await user.type(screen.getByRole('textbox', { name: 'Budget range' }), '$25k-$50k')
  await user.type(screen.getByRole('textbox', { name: 'Timeline' }), '3 months')
  await user.type(screen.getByRole('textbox', { name: 'Industry' }), 'Retail')
  await user.click(screen.getByRole('button', { name: 'Create intake' }))

  expect(screen.getByRole('status')).toHaveTextContent('waiting for AI triage to finish')
  expect(screen.getByRole('button', { name: 'Creating and generating summary…' })).toBeDisabled()
  expect(fetchMock).toHaveBeenCalledWith('/api/intakes', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      title: 'Support pilot',
      description: 'Answer common customer questions.',
      budget_range: '$25k-$50k',
      timeline: '3 months',
      industry: 'Retail',
    }),
  }))

  finishPost(Response.json({
    id: 1,
    title: 'Support pilot',
    description: 'Answer common customer questions.',
    budget_range: '$25k-$50k',
    timeline: '3 months',
    industry: 'Retail',
    created_at: '2026-10-13T18:00:00Z',
    summary: null,
    tags: null,
    risks: null,
    triage_status: 'unavailable',
  }, { status: 201 }))

  const dialog = await screen.findByRole('dialog', { name: 'Support pilot' })
  expect(window.location.pathname).toBe('/')
  expect(screen.getByRole('button', { name: 'View Support pilot' })).toHaveTextContent('Needs review')
  expect(within(dialog).getByRole('alert')).toHaveTextContent('AI triage unavailable')
  expect(within(dialog).getByRole('alert')).toHaveTextContent('This intake was saved')
  expect(screen.getByText(/“Support pilot” was saved\. AI triage is unavailable/)).toBeVisible()
})

test('confirms deletion and removes the intake from the list', async () => {
  const user = userEvent.setup()
  const intake = {
    id: 7, title: 'Support pilot', description: 'Answer questions',
    budget_range: '$25k-$50k', timeline: '3 months', industry: 'Retail',
    created_at: '2026-10-13T18:00:00Z', summary: null, tags: null, risks: null,
    triage_status: 'unavailable',
  }
  const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input) === '/api/intakes/7' && options?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }))
    if (String(input) === '/api/intakes') return Promise.resolve(Response.json([intake]))
    throw new Error(`Unexpected request: ${input}`)
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'View Support pilot' }))
  const dialog = screen.getByRole('dialog', { name: 'Support pilot' })
  await user.click(within(dialog).getByRole('button', { name: 'Delete intake' }))
  expect(within(dialog).getByText('Delete this intake permanently?')).toBeVisible()
  expect(fetchMock).not.toHaveBeenCalledWith('/api/intakes/7', expect.anything())
  await user.click(within(dialog).getByRole('button', { name: 'Delete intake' }))

  expect(await screen.findByText('“Support pilot” was deleted.')).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'No intakes yet' })).toBeVisible()
  expect(fetchMock).toHaveBeenCalledWith('/api/intakes/7', { method: 'DELETE' })
})

test('keeps the intake visible when deletion fails', async () => {
  const user = userEvent.setup()
  const intake = {
    id: 7, title: 'Support pilot', description: 'Answer questions',
    budget_range: '$25k-$50k', timeline: '3 months', industry: 'Retail',
    created_at: '2026-10-13T18:00:00Z', summary: null, tags: null, risks: null,
    triage_status: 'unavailable',
  }
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input) === '/api/intakes/7' && options?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 500 }))
    if (String(input) === '/api/intakes') return Promise.resolve(Response.json([intake]))
    throw new Error(`Unexpected request: ${input}`)
  }))

  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'View Support pilot' }))
  const dialog = screen.getByRole('dialog', { name: 'Support pilot' })
  await user.click(within(dialog).getByRole('button', { name: 'Delete intake' }))
  await user.click(within(dialog).getByRole('button', { name: 'Delete intake' }))

  expect(await within(dialog).findByText('The intake could not be deleted (500).')).toBeVisible()
  expect(screen.getByRole('button', { name: 'View Support pilot' })).toBeVisible()
})

test('edits an intake and shows the updated details', async () => {
  const user = userEvent.setup()
  const original = {
    id: 7, title: 'Support pilot', description: 'Answer questions',
    budget_range: '$25k-$50k', timeline: '3 months', industry: 'Retail',
    created_at: '2026-10-13T18:00:00Z', summary: 'Old summary',
    tags: { industry: 'retail', budget: 'medium', timeline: 'near-term' },
    risks: ['Old risk'], triage_status: 'complete',
  }
  const updated = { ...original, title: 'Corrected pilot', description: 'Answer billing questions', summary: null, tags: null, risks: null, triage_status: 'unavailable' }
  const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input) === '/api/intakes/7' && options?.method === 'PUT') return Promise.resolve(Response.json(updated))
    if (String(input) === '/api/intakes') return Promise.resolve(Response.json([original]))
    throw new Error(`Unexpected request: ${input}`)
  })
  vi.stubGlobal('fetch', fetchMock)

  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'View Support pilot' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit intake' }))
  expect(window.location.pathname).toBe('/intakes/7/edit')
  const title = screen.getByRole('textbox', { name: 'Project title' })
  expect(title).toHaveValue('Support pilot')
  await user.clear(title)
  await user.type(title, 'Corrected pilot')
  const description = screen.getByRole('textbox', { name: 'Description' })
  await user.clear(description)
  await user.type(description, 'Answer billing questions')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))

  expect(fetchMock).toHaveBeenCalledWith('/api/intakes/7', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({
      title: 'Corrected pilot', description: 'Answer billing questions',
      budget_range: '$25k-$50k', timeline: '3 months', industry: 'Retail',
    }),
  }))
  expect(await screen.findByRole('dialog', { name: 'Corrected pilot' })).toBeVisible()
  expect(window.location.pathname).toBe('/')
  expect(screen.getByRole('button', { name: 'View Corrected pilot' })).toHaveTextContent('Needs review')
  expect(screen.getByText(/“Corrected pilot” was updated\. AI triage is unavailable/)).toBeVisible()
})

test('keeps corrected form values when an update fails', async () => {
  const user = userEvent.setup()
  const intake = {
    id: 7, title: 'Support pilot', description: 'Answer questions',
    budget_range: '$25k-$50k', timeline: '3 months', industry: 'Retail',
    created_at: '2026-10-13T18:00:00Z', summary: null, tags: null, risks: null,
    triage_status: 'unavailable',
  }
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
    if (String(input) === '/api/intakes/7' && options?.method === 'PUT') return Promise.resolve(new Response(null, { status: 500 }))
    if (String(input) === '/api/intakes') return Promise.resolve(Response.json([intake]))
    throw new Error(`Unexpected request: ${input}`)
  }))

  render(<App />)
  await user.click(await screen.findByRole('button', { name: 'View Support pilot' }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Edit intake' }))
  const title = screen.getByRole('textbox', { name: 'Project title' })
  await user.clear(title)
  await user.type(title, 'Corrected pilot')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('The intake could not be updated (500).')
  expect(title).toHaveValue('Corrected pilot')
  expect(window.location.pathname).toBe('/intakes/7/edit')
})
