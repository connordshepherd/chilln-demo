import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: 'Explain technical concepts',
    message: `What is a "serverless function"?`
  },
  {
    heading: 'Summarize an article',
    message: 'Summarize the following article for a 2nd grader: \n'
  },
  {
    heading: 'Draft an email',
    message: `Draft an email to my boss about the following: \n`
  }
]

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">
          Welcome to the North Lake Tahoe AI Chatbot!
        </h1>
        <p className="leading-normal text-muted-foreground">
          This is an AI chatbot built with{' '}
          <ExternalLink href="https://gotahoenorth.com/">GoTahoeNorth.com</ExternalLink> to help you find the best of things to do, places to eat, and places to stay in beautiful North Lake Tahoe.
        </p>
      </div>
    </div>
  )
}
