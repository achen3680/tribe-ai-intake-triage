import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
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
