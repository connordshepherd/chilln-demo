'use client'

import { useId, useState } from 'react';
import { useActions, useAIState, useUIState } from 'ai/rsc';
import { formatNumber } from '@/lib/utils';

import type { AI } from '@/lib/chat/actions';

interface Reservation {
  nights: number;
  hotelName: string;
  pricePerNight: number;
  imageUrl: string;
  bookingUrl: string;
  status: 'requires_action' | 'completed' | 'expired';
}

export function HotelReservation({
  props: { nights = 1, hotelName, pricePerNight, imageUrl, bookingUrl, status = 'requires_action' }
}: {
  props: Reservation
}) {
  const [value, setValue] = useState(nights);
  const [reservationUI, setReservationUI] = useState<null | React.ReactNode>(null);
  const [aiState, setAIState] = useAIState<typeof AI>();
  const [, setMessages] = useUIState<typeof AI>();
  const { confirmReservation } = useActions(); // This needs to be implemented in the AI actions similarly to confirmPurchase

  const id = useId();

  function onNightsChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = Number(e.target.value);
    setValue(newValue);

    const message = {
      role: 'system' as const,
      content: `[User has changed nights to ${newValue} at ${hotelName}. Total cost: $${(newValue * pricePerNight).toFixed(2)}]`,
      id // This ensures the message isn't duplicated unnecessarily in the UI
    };

    // Update or append the new message in the chat history
    if (aiState.messages[aiState.messages.length - 1]?.id === id) {
      setAIState({
        ...aiState,
        messages: [...aiState.messages.slice(0, -1), message]
      });
    } else {
      setAIState({ ...aiState, messages: [...aiState.messages, message] });
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-lg">
      <img src={imageUrl} alt={hotelName} className="h-40 w-full object-cover" />
      <h3 className="mt-2 text-lg font-semibold">{hotelName}</h3>
      <p className="text-md">${pricePerNight} per night</p>
      {reservationUI ? (
        <div>{reservationUI}</div>
      ) : status === 'requires_action' ? (
        <>
          <p>Nights to stay</p>
          <input
            type="range"
            value={value}
            onChange={onNightsChange}
            min="1"
            max="30"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-center mt-4">
            Total cost: <strong>${formatNumber(value * pricePerNight)}</strong>
          </div>
          <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center bg-blue-500 text-white p-2 rounded hover:bg-blue-600">Book Now</a>
        </>
      ) : status === 'completed' ? (
        <p>You have successfully booked your stay at {hotelName}. Total cost: {formatNumber(value * pricePerNight)}</p>
      ) : status === 'expired' ? (
        <p>Your booking session has expired!</p>
      ) : null}
    </div>
  );
}
