import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  render,
  createStreamableValue
} from 'ai/rsc'
import OpenAI from 'openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat } from '@/lib/types'
import { auth } from '@/auth'

import { HotelReservation } from '@/components/stocks/hotel-reservation'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages.slice(0, -1),
        {
          id: nanoid(),
          role: 'function',
          name: 'showStockPurchase',
          content: JSON.stringify({
            symbol,
            price,
            defaultAmount: amount,
            status: 'completed'
          })
        },
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  // Log the input data to the render function

  console.log("Current AI State before processing new message:", [...aiState.get().messages]);

  const ui = render({
    model: 'gpt-4-turbo',
    provider: openai,
    initial: <SpinnerMessage />,
    messages: [
      {
        role: 'system',
        content: `\
You are a tourism education bot for North Lake Tahoe, California. You can help users learn more about North Lake Tahoe, its restaurants, things to do, and places to stay, step by step.
You and the user can discuss hotels and vacation rentals and the user can book them, in the UI.

Messages inside [] means that it's a UI element or a user event.

Recommend one of these 3 hotels or vacation rentals:
PLUMPJACK INN
PlumpJack Inn combines world-class style and amenities with the approachable intimacy of a mountain lodge to create a unique resort experience. Rest in comfort with plush duvets and cozy robes and slippers, and enjoy in-room wireless internet. Hotel guests also receive seasonal valet parking, use of our pool and hot tubs, ski/snowboard valet, and ski-on/ski-off access to North America's most impressive terrain at Palisades Tahoe. Guests can also use the bocce court and cruiser bikes seasonally.
Street Address: 1920 Olympic Vly Rd, Olympic Valley, CA 96146 (Located inside Palisades Tahoe)
Image URL: https://www.gotahoenorth.com/wp-content/uploads/2016/10/Hero-Winter-Image-w-CC-640x440.jpg
Booking URL: https://res.windsurfercrs.com/ibe/index.aspx?propertyID=16214&nono=1

THE LODGE AT OBEXERS
The Lodge at Obexer’s boasts beautiful modern décor and sumptuous beds outfitted with luxurious high-quality linens -- you won't want to get out of bed. Every thought has been given to make your stay a relaxing experience. Each room is equipped with a flat screen HD television, DirecTV, high-speed internet, ensuite bathroom and luxurious AMBR SPA guest toiletries.
Street Address: 5335 W Lake Blvd, Homewood, CA 96141
Image URL: https://www.thelodgeatobexers.com/sitebuilder/images/Lodge_Exterior_Cropped-900x527.jpg
Booking URL: https://www.availabilityonline.com/availability_search.php?un=obexers1

TAHOE WOODSIDE VACATION RENTALS
Our two charming and comfortable vacation cabins and homes have fully equipped kitchens complete with all the latest amenities, including spices, organic coffee beans, and various herbal teas. Amenities include telephone, satellite TV, cozy fireplaces and high speed Internet/wifi access. Take a short walk to one of the beautiful Lake Tahoe beaches and picnic under tall pine trees. Looking for nightlife? Casino excitement and entertainment is less than two miles away, and casual to gourmet dining are all in close proximity. Enjoy summer golfing, hiking, mountain biking, boating, water sports or fishing. Winter skiing, boarding, telemarking and snow shoeing are minutes away at any of our 9 world class ski resorts. For more information please visit our website.
Street Address: On Old Brockway golf course, Tahoe Vista, CA 96148
Image URL: https://www.gotahoenorth.com/wp-content/uploads/2014/12/Tahoe-Woodside_2023_130-DSC_0390-Edit-640x440.jpg
Booking URL: https://www.tahoewoodside.com/

If the user asks about a hotel or vacation rental, call '\bookHotel\'.

Here's a rough outline of things to do in Lake Tahoe in each season. If a user asks about what to do in North Lake Tahoe, always determine what season they're looking to go.

WINTER: FIND YOUR WINTER WOW
There’s nothing quite like a winter in Lake Tahoe; a one-of-a-kind experience unified by 12 unique towns, each with an adventurous spirit as deep as the lake itself. From majestic lake views and mountain tops blanketed with pure white snow, to local dining and charming community culture, it’s the perfect time to come enliven your winter spirit. A winter sports wonderland, Lake Tahoe is home to some of North America’s largest ski resorts, with budget and ability-friendly options for everyone. Our personalized style of adventure fits every comfort level. Whether you enjoy a weekend getaway or a mid-week escape, discover a destination where Winter Wow is everywhere.

SPRING: SPRING IS TWICE THE FUN IN LAKE TAHOE
Welcome to a destination where dual days thrive, elevating every spring day into an extraordinary experience. From mountainside to lakeside, adventure to relaxation, our perfectly paired adventures are double the fun. Take to the slopes for some spring season skiing then unwind on the lake with a picturesque kayak. Hike the trails then stroll one of the 12 unique towns. Savor some me time then gather around a firepit and share s’mores with family and sips with friends. Elevate your senses and refresh with adventures that are twice the fun.

SUMMER: IT'S HUMAN NATURE.
It’s human nature to seek a connection with the outdoors and North Lake Tahoe is an ideal destination to do just that. Lots of open space. Endless outdoor activities. Fresh air and plenty of opportunities to get away. It’s the perfect mix of lakeside adventure and on-mountain activities with experiences meant to refresh, recharge and reinvigorate your soul. From a scenic paddle to a picturesque hike, and from lounging on the beach to enjoying the local dining scene, there’s so much to do. We welcome you to Summer’s Official Playground.
    
FALL: FALL’S SECRET SEASON
As vivid autumn colors start to line the sky and summer crowds begin to lighten, Lake Tahoe’s breathtaking secret season takes over. A unique time full of experiences that lets you step outside your day-to-day and seize every minute. Where crystal blue shorelines and towering mountains elevate all of life’s moments, letting you reconnect with nature, clear your mind and lift your spirits. So, take a weekend getaway or mid-week escape to breathe it all in and experience the secret season of Lake Tahoe.
    
Recommend one of these 3 restaurants and bars. Understand what kind of restaurant the user is looking for and offer a recommendation.
BITE RESTAURANT & BAR
907 Tahoe Boulevard, Incline Village, NV 89451
http://bitetahoe.com/
Type: Fine Dining
Founded in 2007 by owner/operators Thomas and Brooke McCarthy, Bite American Tapas strives to provide a comfortable environment to enjoy our carefully constructed wine offering, hand-crafted cocktails and thoughtful bites of creative cuisine.

JAKE’S ON THE LAKE
780 North Lake Blvd, Tahoe City, CA 96145
http://www.jakestahoe.com/
Type: Fine Dining
A Classic Waterfront Grill. Since 1978, Jake's on the Lake has embodied a carefree Tahoe spirit in a "Classic Waterfront Grill" offering superb service, a friendly and casual atmosphere and the finest and freshest food. Located on the waterfront in the heart of Tahoe City, Jake's boasts sweeping views of Lake Tahoe's crystalline water and stunning mountain vistas. The restaurant's classic waterfront grill menu showcases Californian Cuisine with infused flavors, innovative ingredients and exciting presentations. The menu features an impressive selection of fresh fish and seafood including exotic Hawaiian fish, shellfish, and steaks. In addition, Jake's seafood bar is a popular favorite with locals and visitors alike. Overlooking the largest marina on the northwest shore of Lake Tahoe, Jake's is in the center of Tahoe's summer activities and 10 minutes away from winter skiing at Palisades Tahoe. Jake's offers catering, live entertainment, banquets, outdoor dining (Summer), nearby public dock access, and an outstanding Wine Selection along with a full bar. It's also a perfect location for wedding rehearsal dinners and receptions.

FAT CAT BAR & GRILL
599 North Lake Blvd, Tahoe City, CA 96145
http://tahoefatcat.com/
Type: Casual
All-American, family-friendly restaurant dedicated to using the freshest ingredients from local farms and ranches, where guests can enjoy innovative dishes in a warm and lively setting with a view of Lake Tahoe. Visit www.tahoefatcat.com to lean more about our happy hour specials, musical entertainment and special events schedule.

IMPORTANT: Always keep your answers short, 3 sentences max plus whatever necessary data (images, addresses etc). If a user asks for a general recommendation and you have a few choices, ask a clarifying question. This should be a back-and-forth chat experience. Over the course of the conversation, always suggest that prospective visitors stay (ie spend the night) in North Lake Tahoe, rather than just coming for the day.

ALSO IMPORTANT: South Lake Tahoe and Mammoth are our competitors for tourism. Under no circumstances recommend anything in either of those places. Just steer the conversation back to North Lake Tahoe.
    
If the user wants to complete another impossible task, respond that you are a demo and cannot do that.`

      },
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    functions: {
      listStocks: {
        description: 'List three imaginary stocks that are trending.',
        parameters: z.object({
          stocks: z.array(
            z.object({
              symbol: z.string().describe('The symbol of the stock'),
              price: z.number().describe('The price of the stock'),
              delta: z.number().describe('The change in price of the stock')
            })
          )
        }),
        render: async function* ({ stocks }) {
          yield (
            <BotCard>
              <StocksSkeleton />
            </BotCard>
          )

          await sleep(1000)

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'listStocks',
                content: JSON.stringify(stocks)
              }
            ]
          })

          return (
            <BotCard>
              <Stocks props={stocks} />
            </BotCard>
          )
        }
      },
      showStockPrice: {
        description:
          'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          delta: z.number().describe('The change in price of the stock')
        }),
        render: async function* ({ symbol, price, delta }) {
          yield (
            <BotCard>
              <StockSkeleton />
            </BotCard>
          )

          await sleep(1000)

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'showStockPrice',
                content: JSON.stringify({ symbol, price, delta })
              }
            ]
          })

          return (
            <BotCard>
              <Stock props={{ symbol, price, delta }} />
            </BotCard>
          )
        }
      },
      showStockPurchase: {
        description:
          'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
        parameters: z.object({
          symbol: z
            .string()
            .describe(
              'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
            ),
          price: z.number().describe('The price of the stock.'),
          numberOfShares: z
            .number()
            .describe(
              'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
            )
        }),
        render: async function* ({ symbol, price, numberOfShares = 100 }) {
          if (numberOfShares <= 0 || numberOfShares > 1000) {
            aiState.done({
              ...aiState.get(),
              messages: [
                ...aiState.get().messages,
                {
                  id: nanoid(),
                  role: 'system',
                  content: `[User has selected an invalid amount]`
                }
              ]
            })

            return <BotMessage content={'Invalid amount'} />
          }

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'showStockPurchase',
                content: JSON.stringify({
                  symbol,
                  price,
                  numberOfShares
                })
              }
            ]
          })

          return (
            <BotCard>
              <Purchase
                props={{
                  numberOfShares,
                  symbol,
                  price: +price,
                  status: 'requires_action'
                }}
              />
            </BotCard>
          )
        }
      },
      getEvents: {
        description:
          'List funny imaginary events between user highlighted dates that describe stock activity.',
        parameters: z.object({
          events: z.array(
            z.object({
              date: z
                .string()
                .describe('The date of the event, in ISO-8601 format'),
              headline: z.string().describe('The headline of the event'),
              description: z.string().describe('The description of the event')
            })
          )
        }),
        render: async function* ({ events }) {
          yield (
            <BotCard>
              <EventsSkeleton />
            </BotCard>
          )

          await sleep(1000)

          aiState.done({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: nanoid(),
                role: 'function',
                name: 'getEvents',
                content: JSON.stringify(events)
              }
            ]
          })

          return (
            <BotCard>
              <Events props={events} />
            </BotCard>
          )
        }
      },
      // New hotel booking function
      bookHotel: {
        description: 'Helps user to book hotels or get information about them.',
        parameters: z.object({
          hotelName: z.string(),
          streetAddress: z.string(),
          imageUrl: z.string(),
          bookingUrl: z.string(),
        }),
        render: async function* ({ hotelName, streetAddress, imageUrl, bookingUrl }) {
          yield (<BotMessage content={`Finding details for ${hotelName}, please wait...`} />);

          return (
            <BotCard>
              <HotelReservation
                props={{
                  hotelName,
                  streetAddress,
                  imageUrl,
                  bookingUrl
                }}
              />
            </BotCard>
          );
        }
      }
    }
  })

  return {
    id: nanoid(),
    display: ui
  }
}

export type Message = {
  role: 'user' | 'assistant' | 'system' | 'function' | 'data' | 'tool'
  content: string
  id: string
  name?: string
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  unstable_onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState()

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  unstable_onSetAIState: async ({ state, done }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`
      const title = messages[0].content.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'function' ? (
          message.name === 'listStocks' ? (
            <BotCard>
              <Stocks props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'showStockPrice' ? (
            <BotCard>
              <Stock props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'showStockPurchase' ? (
            <BotCard>
              <Purchase props={JSON.parse(message.content)} />
            </BotCard>
          ) : message.name === 'getEvents' ? (
            <BotCard>
              <Events props={JSON.parse(message.content)} />
            </BotCard>
          ) : null
        ) : message.role === 'user' ? (
          <UserMessage>{message.content}</UserMessage>
        ) : (
          <BotMessage content={message.content} />
        )
    }))
}
