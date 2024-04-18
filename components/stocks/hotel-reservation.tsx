'use client'

import React from 'react';
import type { AI } from '@/lib/chat/actions';

interface Reservation {
 hotelName: string;
  streetAddress: string;
  imageUrl: string;
  bookingUrl: string;
}

export function HotelReservation({
  props: { hotelName, streetAddress, imageUrl, bookingUrl }
}: {
  props: Reservation
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-lg">
      <img src={imageUrl} alt={hotelName} className="h-40 w-full object-cover" />
      <h3 className="mt-2 text-lg font-semibold">{hotelName}</h3>
      <p className="text-md">{streetAddress}</p>
      <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
        Book Now
      </a>
    </div>
  );
}
