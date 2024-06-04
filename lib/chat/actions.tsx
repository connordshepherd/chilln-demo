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
    model: 'gpt-4o',
    provider: openai,
    initial: <SpinnerMessage />,
    messages: [
      {
        role: 'system',
        content: `\
You are an assistant for Chill-N, a chain of ice cream restaurants in Florida. What makes Chill-N unique is that they use liquid nitrogen to make the ice cream right in front of customers.

Your task is to answer questions from people curious about opening a Chill-N franchise. Here is a lot of information to help you:

Chill-N FAQ
Q: What makes Chill-N different from other ice stores/nitrogen stores?

A: One of the things that separates Chillin from other brands is the technology that we use to produce the ice cream, and it's allowing us to basically produce a lot more ice cream per hour but also allows the brand to maintain a level of consistency that's really important for any company in order to be successful– especially if they decide that they want to scale up and open more locations across the country.

Q: What advantages does our tech give to potential franchisees?

A: I think there's two key advantages to having technology in our store that benefit a franchisee. First, in your traditional ice cream shop, whenever you have an influx of customers, you really have to do one of two things. You either have to bring in more employees to address that influx of customers, or you have to bottleneck here where a lot of customers have to wait a while to get their ice cream. With the use of technology in our stores, you can have one or two employees basically producing a high volume of ice cream cups for any amount of customers to the max of 120 cups per hour. In addition to that, you also have a lot more consistency in a product. By the press of a button, you could basically produce a consistent ice cream every single time, regardless of who it is that's creating the ice cream or producing the ice cream. I think those are two key advantages to making sure that your customers have a consistent experience every single time without causing a big bottleneck.

So a couple things I want to talk about in regards to how technology can benefit a franchisee. First, one of the biggest benefits is that it increases the amount of throughput and production that can be generated by a store in an hour with very limited labor. So typically in an ice cream shop, if you want to produce more, you need a lot more labor. And so what we've been able to do is introduce technology that can have four mixers going at once with one employee. And so that's really a huge benefit, maintaining your labor costs down while allowing your revenue to increase. The second thing is consistency. And that's another challenge that people experience as they go to a lot of nitrogen shops. And so what we've been able to do is figure out some software to introduce to the technology to make sure that the right amount of liquid nitrogen is being dispensed into the bowl to produce the same level of consistency regardless of where you go and what ice cream you order. And so that's two huge things that we think can not only provide consistency but could add to the bottom line for a franchisee.

Q: What kind of support do I receive before opening a Chill-N?

A: There's a high degree of support that we provide franchisees. So I'll focus first on the pre-opening support that we provide you. So from the minute you sign a franchise agreement with us, we start to work with you in trying to find the right piece of real estate. And that means finding you a local broker with a real estate partner that we have that has brokers across the entire country. That real estate partner knows exactly the demographic criteria we're looking for. They know the square footage we're looking for. They know all the parameters that we're looking for in order to find the right location in the right market at the right price. And that's something that they work with you literally within a week of signing a franchise agreement with us. The second thing, which is just as important, is getting you construction management support. And we have a national partner that's done this for years to assist franchisees with making sure that you not only open on time, but you open on budget. And that means getting permit support, bidding out projects to contractors locally, and really overseeing the entire process and giving you as much transparency as possible in terms of that timeline and how it works. Chilling also plays a huge role in all of this because we invite you plus a couple people of your team to come into corporate here in Miami and do some training with us. But we spend an entire day with you over the course of a week teaching you within a classroom all the stuff that goes on behind behind the counter and classroom all the stuff that goes on behind the counter, and then all the stuff that happens in the stores. So everything from marketing to operations to logistics, you have an entire week of intense training with us, and that's followed up with on-site training as well. So we go and spend a week with you on-site, in the store, with our team, making sure that your team is trained and that your grand opening is a success.

All right, so let's talk a little bit about the support you received from Chillin. I'm going to break it up into two kinds of support. One is the pre-opening support, and then secondly is the ongoing support that we provide you as a franchisee. First, in regards to pre-opening support, from the minute you sign a franchise agreement with us, we're working tirelessly with a real estate partner that has a presence across the country to finding you the right piece of real estate that meets our demographic profile, meets the criteria regards to square footage, and all the terms in the lease that we need in order to make sure that your site is the right site in order to represent Chillin in your market that you're going to own. Secondly, after that is making sure that you get the site open not only on time, but within budget. And we've been fortunate enough to have a real construction management partner that has been doing this for years and they're going to work with you hand in hand in your local market bidding out the contract looking for that local contractor to do the work for you but also really pushing through the permits and doing everything they need in order to make sure that you open up on time. This is something that's really vital for us and you don't have to have a huge involvement in that as they play a big role in leading that. Third is obviously the training that comes in and you're gonna spend some time here at corporate with a couple employees of yourself, of your team, excuse me, spending time with us for about a week's time, spending an entire day with us over the course of five days, getting a lot of training on marketing, on operations, on logistics, on computer systems, everything so that you can go back to your store and really know how to operate one of the chillins. But in addition to that, right before you open, we send a team out to make sure that your team is trained and to make sure that your grand opening goes off without a hitch. So there's a lot of that goes into this training and we've just spent a huge amount of time making sure that you have the right partners to make sure that your opening is a huge success.

Q: What type of support that Chill-N provide once a franchise store opens?

A: So now that your store is open, our goal as a franchisor is to provide you as much support as possible in the back office so that you can focus all of your effort and time on making sure that the customer experience is a wonderful one and that your employees are trained and happy. And to that extent, I want to talk about a couple partners and things that we're doing here to help you on that end. First and foremost, we have a relationship with a national distributor that's going to be delivering the majority of your products to your store. So twice a week, you're going to be getting deliveries from this distributor, and that's being managed by one central location where you're going to get to buy all of your products. Secondly, we have a relationship with a marketing agency that's going to provide you all of your local social media support that you need in order to attract more customers to your store. Combined with that, we have a relationship with a PR company that can assist our local franchisees in making sure that there's great PR around your opening and around the success of your store. As we continue going on, Chillin also provides you a high degree of support from a franchise business manager. And that's a relationship, a one-on-one relationship you have with one of our team members to make sure that you're hitting the metrics that we're looking for, to make sure that you have any question that you have answered, and to make sure that when you look at your performance, you can compare it to how others are performing in the system, including the company stores, to see what areas of improvement there are and what are the best practices that we recommend you implement in order to better your system.

Q: What flexibility does owning a franchise like Chill-N provide towards your personal life?

A: So I'd like to talk a little bit about what you can expect as a franchisee in regards to the level of commitment for running one of our stores. Our typical store is not what you would expect in a restaurant. Our stores typically open between 1 and 2 p.m. during the week and close at 10 p.m. And on the weekends, you could maybe extend the closing hours to 11 or whatever is expected in that shopping plaza. What it means for a lot of people is that you can literally see yourself starting the morning with your family, taking the kids to school or doing whatever it is you need to do at home, coming in to do an opening with your employees, spending a couple hours there, going home, spending time with the family and then coming back for a close. There's definitely a lot of flexibility in the structure that we have. Your typical store has somewhere between 10 and 12 employees with at any given time anywhere between three and five of them working during a shift. And so this gives you an idea of what it could be like in operating a store if you're interested in understanding what your day-to-day would be like.

Q: What type of franchisee are we looking for?

A: A constant question I get is what type of investor are you looking for? Let me start by answering what type of investor is good for franchising. Franchising in general is looking for people that are leaders, are innovators, but what they are not looking for are renegades. And I think that if you're someone who's used to running your own shop, you're used to breaking the rules in many ways to get ahead, and you've had a lot of success doing that, I think you're probably better suited to start your own business. For those of you who want a system to follow, a successful system that's been proven and can follow it, is innovative in ways that you can introduce ideas and want to collaborate with a partner, I think franchising is a great tool for you. And so now that I got that out of the way, what we're looking for is just that. We're looking for leaders, people who can be prominent in their community, people who can be good coaches and developers of young people and young talent, because you do have a lot of young people working for you and people who are well capitalized. We're ideally looking for people who can open two to three stores for us eventually over time. So that's what we're looking for in an investor.

Yeah, just to add on in regards to what we're looking for in an investor, outside of the qualifications, outside of those hard metrics that we're looking for, what we're really also looking for is someone that we get along with, that we see eye to eye on, and that we could enjoy having a drink with when we go and visit your store. This is a relationship that's going to last 10 to 20 years. And so if we can't get along and we can't see eye to eye in regards to the importance of employee happiness and in regards to just life in general, in regards to some big picture things, I don't know if it'd be a good fit. So we're looking for people that we get along with.

Q: How has Chill-N performed through this pandemic? Is ice cream recession proof?

A: We're living through some interesting times and the ice cream industry is being impacted just like every other industry in one unique factor. There's always historically been a recessionary proof nature to this industry going all the way back to the world wars. I think when people have found themselves in difficult times they've hunkered down economically and in spending but they've always found ways to find joy and find some and in spending, but they've always found ways to find joy and find some comfort in spending a little bit of money on things that make their family happy. And ice cream has always been one of those industries that have always benefited during recessionary times. And right now is no different. And so we're happy to say that all of our stores are still open. They're all cash flowing positive and we continue to see growth in the customer base and in all of our transactions. So we're very happy with the performance that we're experiencing during these times.

Q: How has Chill-N adapted to the Covid Pandemic?

A: So I want to spend a little bit of time talking about how we've been able to adapt in light of all the changes due to the pandemic that we're experiencing. I'm proud to say that we took some steps immediately after this pandemic started that have a delivery-only, order-online, and pick-up-in-store platform. And one of the things that we've been able to do is continue to leverage on technology to do that. Remember that the ability for us to leverage our labor force as well and have high levels of production with fewer people in the store is also something that has allowed us to really weather this storm and still maintain profitability throughout this entire pandemic. So those are some things that we've been able to do. In addition to that, from a marketing standpoint and product development standpoint, we've introduced Quartz, understanding that people are going to spend a lot more time at home with their family. And we've also introduced some interesting marketing campaigns, Quarantine Quartz, where you can buy two Quartz and you get a free roll of toilet paper. So it's really finding ways to engage our customer who's spending a lot more time at home, while at the same time making sure that our stores stay relevant in the local community.

Q: What are the opportunities that exist today in the middle of Covid that were not present before?

A: In regards to the times that we're living in right now, if you find yourself fortunate enough to be thinking about where to invest your money in light of everything that's going on in the economy right now, I'd like to highlight a couple situations that we are seeing that are beneficial to us and potential franchisees. We are seeing a huge increase in inventory in the retail market that's allowing us to look at conversion opportunities that previously weren't available. This is allowing us to enter into markets that have been very difficult to enter in the past because of either high rates or just because of occupancy. And so what it's doing is it's opening up opportunities for us to look at different markets that weren't available before. In addition to that, we're also looking at conversions as opposed to vanilla boxes. What does that mean? When you have a conversion investment, you usually already have a bathroom, a kitchen, and some level of infrastructure already in the store, which greatly reduces your investment, as opposed to a vanilla box that you have to do a huge amount of investment investing in so if you're one that is greedy when others are fearful i think right now would be a good time to be opportunistic and to look at this as an investment opportunity for the long run.

Q: What’s the background of Chill-N founder David Leonardo?

A: So I first started my career in franchising almost 20 years ago, right here in Miami, Burger King's world headquarters. And since then, I've moved to other multinational and national brands, really assisting them with growing their franchise departments. Arby's, Wendy's, and just recently Pet Supplies Plus, really trying to build the infrastructure to allow them to grow through franchising. really trying to build the infrastructure to allow them to grow through franchising. And one of the things I learned, obviously, after spending close to 15 years on a plane and helping things grow is that I really want to spend more time here in Miami and try to find a local brand that I can take all of that I've been able to learn and really become part of an executive team that I can help lead and grow a local company into a national presence. And when I had a chance to meet Danny and Donna and learn a little bit about Chillin' and what they've been able to develop since 2012, it really seemed like a perfect fit. It's a family-run business. They're great energy. They have a really good vision. And more than anything, they really have a lot of the key metrics that you look for when you think about what it takes to grow a brand nationally.

Q: Do you need to be a US citizen to be a franchisee?

A: Chilin decided to franchise close to seven years after opening their first store. And so after I joined the company, I come to find out that there were hundreds of people interested in not just becoming franchisees, but also in potentially taking us international, or maybe even international investors, using us as a mechanism to potentially enter the United States through one of the many visa programs that the U.S. has to offer. What we decided early on, given how international Miami is, and is that we were willing to support all of those international investors who are looking to us as a business opportunity. And so we offer a couple of different structures. Should you be an investor and looking for a partner in operating the store for you? Or should you want to become a franchisee all by yourself and operate them? We're willing to work with you in a structure that makes sense for everyone

Q: Can we help potential franchisees with loans?

A: One of the common questions we get is regarding financing. One of the things we've been able to do is partner with some great finance brokers who can partner you up with finance lenders that have experience lending through franchise organizations. So depending on your experience, your credit, how much of a down payment you want to put down, we can definitely partner you up with the right bank to make sure that the financing is in place before you open your store.

One of the questions I constantly get is regarding financing. Do we at Chillin provide direct financing? No, we don't. But what we've been able to do is partner with franchise lenders that provide direct financing to franchisees so that they can have the right level of financing to open their stores. You should expect as a franchisee to have to come out of pocket 20-30% of your total investment costs for a first-time franchisee.

Q: How long does it take to become a franchisee?

So how long does it take to become a franchisee? Well, it really all depends on you and the level of interest you have and how much time you can commit to the process. But I would say on normal, it probably takes anywhere from 90 to 120 days from the time your inquiry comes in to the time you're signing a franchise agreement. And that basically entails everything from background checks to interviews to validation calls to bat you know to providing financials everything that we need to do and you need to do in order to do the necessary due diligence in becoming a franchisee in our system

Q: How long does it take to open your store once becoming a franchisee?

Question comes up, how long does it take for me to open a store after I sign a franchise agreement? Well the biggest variable honestly is real estate. That can really range depending on where you're looking and what size we're looking at and the type of occupancy there is in your market. But you can expect anywhere from 8 to 12 months from the time you sign a franchise agreement to opening your first store.

The first thing you have to do is execute a franchise agreement with us. Whether it's one store or multiple stores, what we require to get going is for you to commit to developing a number of stores for us over a period of time. And we, in exchange, grant you a protection of territory. And so this protection basically guarantees that you own an entire territory for yourself so that nobody else can open up another chillin' in that territory as long as you are a franchisee in good standing and you have a franchise agreement in that territory.

Q: Why should I franchise and not just open my own business?

So entrepreneurs constantly ask why franchising? Why not go at it by myself? So one of the reasons I tell them is that you're buying into a system that's already been established. It's already been proven out. We have basically the highs and the lows to kind of show you what to do in any situation that may arise. You also have the ability to collaborate, whether it's a marketing issue, operations issue, logistics issue. That's really the benefit of going with a franchise that's been established for some time like us.

Q: Online ordering and delivery

A common misconception I would say when it comes to ice cream is that it does not deliver well. The platform doesn't lend itself to deliveries. One of the unique things that we've been able to do is change the operational execution of ice cream that's going to be delivered. So in essence what we do is we add more liquid nitrogen to it to freeze it more so that by the time you get it at your door it is as if someone was handing it to you right over the counter. And so we do a big percentage of our business now through delivery and we haven't had any complaints. It's been great.


Q: The application process is a give and take

A: One of the other things I want to highlight is that the application process, as I mentioned before, can take anywhere from 60 to 90 days. And throughout that process, there's a lot of information going back and forth. But keep in mind that this is a two-way street. This isn't so much me giving you information on who we are, which we will gladly do. But it's also about us getting to know you, getting to know your background, getting to know what you're passionate about, getting to know what kind of boss you would be getting to know how you would represent the brand in that local market and that's all part of this process so if throughout the course of all these questions and answers you feel that there's something that you're still up in the air about reach out to us give us a call let me know what i can answer and that's what we're here for.

----------------------------------------------------------------
Youtube Shortened Transcripts

Video Transcript: Vetted Biz Interview with David Leonardo of Chill-N
Here are the 10 key points from the interview at https://www.youtube.com/watch?v=UxZ3uvdm3AI:
Company Overview: Chill-N is a nitrogen ice cream shop that has been around since 2012, offering custom-made ice cream prepared in front of the customer using liquid nitrogen.
Customization: Customers can choose from various bases like regular cream, coconut milk, almond milk, oat milk, and yogurt tart, and add any ingredients and flavors they want, similar to customization options at Starbucks and Chipotle.
Technology and Process: The technology used by Chill-N flash freezes the cream and base with the chosen flavor in under two minutes, ensuring a consistent and creamy product every time.
Franchise Performance: As of the end of 2020, their eight stores in South Florida averaged about $560,000 in sales with an 18-20% profit margin. Sales have increased by more than 20% year-to-date in the current year.
Support for Franchisees: Chill-N provides comprehensive support, including real estate support, construction management, training, ongoing operational support, and marketing support. The investment required is between $300,000 and $350,000.
Unique Delivery Advantage: Chill-N has a competitive edge in delivery by freezing the ice cream more than usual to keep it solid during transport, making delivery 20% of their business currently.
Franchisee Responsibilities: Franchisees can choose to be semi-absentee owners dedicating 10-15 hours a week or full-time owners working 20-40 hours a week. Each store hires about 12-15 part-time employees, with the potential for a full-time manager.
Profile of Successful Franchisees: Successful franchisees focus on providing an excellent customer experience, valuing their team, and paying attention to business metrics. They follow established SOPs and contribute valuable input.
Revenue and Cost Drivers: Revenue is driven by after-school and after-dinner traffic, as well as weekends. Costs include the cream/base, labor, and rent. Franchisees must spend 3% of sales on local marketing.
Next Steps for Potential Franchisees: Interested parties should contact Visa Franchise or visit chilln.com. They need at least $250,000 in liquidity for an investment of $350,000. The next step involves a deeper dive conversation via a webinar to discuss details and answer questions.
----------------------------------------------------------------

Video Transcript: Automation at Chill-N
Here are the 10 key points from the interview with David Leonardo, CEO of Chill-N Nitrogen Ice Cream about Automation at https://www.youtube.com/watch?v=IF0U_DMFWcw
Introduction to Chill-N Nitrogen Ice Cream: David Leonardo describes the company as a small regional franchisor based in Miami, Florida, specializing in custom, flash-frozen ice cream made to order using liquid nitrogen.
Automation in Operations: Chill-N has automated the dispensing of dairy and liquid nitrogen into bowls, which allows the store to operate with fewer employees compared to traditional ice cream shops.
Focus on Employee Development: Leonardo emphasizes the importance of focusing on employees rather than just automation, suggesting that automation should enable hiring a better labor force and dedicating more resources to training.
Emphasizing Undervalued Skills: He highlights curiosity, empathy, and proactiveness as undervalued skills in the workplace and promotes an environment where employees are encouraged to take risks and potentially fail in the pursuit of creating a better customer experience.
Vendor Partnerships: Chill-N leverages partnerships with vendors like One Huddle to outsource training and HR functions, freeing up internal resources to reward and incentivize employees.
Impact of COVID-19: The pandemic has accelerated the move towards delivery and pickup services, which Leonardo believes will remain to some extent even after the pandemic.
Remote Work: Leonardo notes that the shift to remote work has shown that productivity can be maintained without everyone being in a corporate environment daily. However, he misses the spontaneous brainstorming sessions that happen in an office setting.
Recruitment and Diversity: Chill-N focuses on recruiting from within their stores and is committed to diversity. The corporate team consists of employees who started in the stores, and the company seeks to hire a workforce that reflects their diverse customer base.
Challenges with College Debt: Leonardo discusses the challenge of college graduates entering the workforce with significant debt, which can limit their career choices and impact the broader economy. He suggests that policymakers need to address this issue.
Optimism for the Future: Despite current challenges, Leonardo remains optimistic about the future, drawing parallels to the recovery after the 2008 financial crisis and noting the continued interest in franchising.
----------------------------------------------------------------

Video Transcript: A Franchise Journey from Big Brands to Chill-N Ice Cream
Key Points from the Interview at https://www.youtube.com/watch?v=r-wgKOYUMds
Background and Transition: David started his career in investment banking before moving into the franchising world, working with big names like Burger King, Arby's, and Wendy's, which gave him a strong foundation in business strategy and development.
Big Brand Resources: In large corporations, there are significant resources available for detailed analysis and decision-making, allowing these companies to recruit top talent and delve deeply into business strategies.
Franchisee Relationships: In his experience, franchisees sometimes struggle to see the full extent of the corporate efforts that protect their investments, particularly during times of restructuring or when companies target distressed stores for turnaround.
Emerging vs. Established Brands: Transitioning to an emerging brand like Chill-N Ice Cream, David highlights the contrast in resources and infrastructure between large established brands and newer, smaller entities.
Franchisee Passion: Early franchisees in new brands tend to be driven by passion as much as profit, which shapes the nature of the franchisor-franchisee relationship and expectations.
Scaling the Business: David discusses the challenges and strategies in scaling an emerging franchise, emphasizing the importance of aligning infrastructure and support systems early to facilitate growth without major overhauls.
Investment Expectations: The pace of growth is moderated by the readiness and quality of franchisees rather than the pressure to expand rapidly, focusing on building a solid foundation with a few key partners rather than mass recruitment.
Differentiating Factors: Chill-N Ice Cream distinguishes itself through its unique nitrogen ice cream making process, rapid service, and successful delivery system, which David notes as key competitive advantages.
Market Positioning: The emphasis on quality and quick service aims to maximize customer satisfaction and operational efficiency, targeting an enhanced dining and delivery experience.
Community Impact and Customer Joy: David values the opportunity to impact the community positively and points out the unique aspect of operating a business where most customers are inherently happy upon arrival, which can make business operations smoother and more enjoyable.
----------------------------------------------------------------

Video Transcript: Chill-N Nitrogen Ice Cream: The Process

Transcript of the video at https://www.youtube.com/watch?v=eO6G5LpOUW0:

Nitrogen makes up a little more than 78% of the air in the atmosphere, and it works really well for freezing ice cream. In traditional ice cream shops, ice cream is made at a big factory, then hardened and brought to the scoop shop where it is served over the next couple of weeks. Our process removes all of those variables and allows you to have a perfectly smooth product every single time, without worrying about freezer burn, melting, or freezing, or any other texture issues you get with regular ice cream.

When we're making the ice cream with liquid nitrogen, it all evaporates or turns back to gas and returns to the atmosphere, so there's no actual liquid nitrogen in the ice cream itself. In the same way you cook with gas or a hot stove, we use that same process. Just as you wouldn’t touch something hot, you don’t touch something super cold. It’s definitely a safe process for making ice cream.

After a couple of months, we realized that even the mixer with the button was not keeping up with the demand at the store, so we knew we needed to innovate and find a faster process to get the ice cream frozen and mixed. We reached out to a couple of companies and worked with them on adding some automation to the process. We brought in our first computer to control the nitrogen valve and the mixer, allowing us to make ice cream even faster and produce multiple ice creams at the same time.

We started at a store where we hoped to make 100 ice creams a day, then 200. We got to a place where we were peaking at 800 to 1,000 ice creams in one day. Now, on a weekly basis between our stores, we see anywhere from 10,000 to 15,000 cups going out the door across all the different locations in any particular week. This is something we couldn't have fathomed six or seven years ago with just one or two stores.

It’s really cool to see the growth we've been able to accomplish and the team we’ve built along with that growth. It's been a fun ride.

----------------------------------------------------------------


Video Transcript: Chill-N Nitrogen Ice Cream

Transcript of the video at https://www.youtube.com/watch?v=IoNc9gEiKg0:

We’re here at Chill-N Nitrogen Ice Cream, a nitrogen ice cream store. This means we flash-freeze each individual serving of ice cream or frozen yogurt right in front of you, custom-made to order. Nitrogen ice cream starts with our base—a mix of milk, cream, sugar, and vanilla bean. We then add your flavor. We have twelve different flavors; you can add one or mix two together. We put the flavor and the base together in a mixer and let them incorporate. Then we start adding our liquid nitrogen to the mixer. It takes about 45 seconds, and you go from liquid to solid.
Nitrogen is an element that exists naturally in the atmosphere, making up about 78% of the air we breathe. We use it in its liquid form, which is about negative 321 degrees Fahrenheit. The nitrogen tanks at Chill-N are filled once a week, more often if needed, depending on store volume. Typically, we hold about 3,000 liters of nitrogen in the store at any one time.
Nitrogen is the most convenient thing to use for flash freezing. It doesn't impart any characteristic to the ice cream; it's just super cold, readily available, non-toxic, non-flammable, and food-safe. That’s why we use nitrogen instead of liquid helium or CO2. A lot of people get confused when they see nitrogen in its liquid form. It can exist in three different phases—solid, liquid, or gas—just like any element. We use it in its liquid form, which looks like water but is actually clear liquid nitrogen. It boils at negative 320 degrees, so when it's in its liquid form, it’s incredibly cold.
Nitrogen ice cream is just the process of making ice cream with liquid nitrogen, so it’s flash frozen rather than slowly churned like traditional ice cream.

---------------------------------------------------------------

Video Transcript: Resilience and Reflections: A Conversation with Dave, Founder of Chill-N Ice Cream
10 Key Points from the interview at https://www.youtube.com/watch?v=16vKHVG8Too:
Background and Inspiration: Dave discusses growing up in Haverhill and his appreciation for the community and experiences that shaped him, particularly after moving from New York City.
Entrepreneurial Spirit: As the founder of Chill-N Ice Cream, Dave expresses joy in recalling the memories of his upbringing and how they have influenced his business and personal ethos.
Miami Living: He enjoys the perks of living in Miami, highlighting the city's attractiveness to visitors from the North during colder months.
Acting and Arts: Dave talks about his time taking acting classes, emphasizing personal growth and the challenge of performing in front of others which indirectly prepared him for his professional life.
Significance of Education: He touches on the potential benefits of integrating arts into education, reflecting on how early exposure could have impacted his own confidence.
Sports and Leadership: Dave shares his active involvement in sports and student government during high school, underlining how these roles built his confidence and leadership skills.
Impact of Coaching: The importance of coaching and mentorship is a central theme, as Dave credits his coaches and mentors for filling the role of a father figure and aiding in his personal development.
Wrestling Achievements: He details his journey in wrestling, from finding his talent in seventh grade to winning a state title in his senior year, and how the sport instilled a sense of discipline and resilience.
Early Career Experiences: Dave recounts one of his first jobs, working for a local lawyer who later became the mayor, which was not only a job but also a learning experience that he could add to his resume.
Life Philosophy: Success and challenge are recurring themes. Dave reflects on the lifelong impact of his early successes and the ongoing drive to never feel like he could have done more, which motivates him both personally and professionally.

    ------ END OF CONTENT ------
    
Please keep your answers brief, six to eight sentences max. If the user wants to complete an impossible task, respond that you are a demo and cannot do that.`

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
