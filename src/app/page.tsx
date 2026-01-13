'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ============================================
// UPDATE THESE WITH YOUR n8n WEBHOOK URLs
// ============================================
const N8N_AVAILABILITY_URL = 'https://brickface.app.n8n.cloud/webhook/availability';
const N8N_BOOKING_URL = 'https://brickface.app.n8n.cloud/webhook/book-appointment';

// Types
interface TimeSlot {
  start: string;
  end: string;
  display: string;
}

interface BookingData {
  email: string;
  rep: string;
  calendarId: string;
  location: string;
  phone: string;
  projectType: string;
  scheduledBy: string;
  zip: string;
}

function BookingContent() {
  const searchParams = useSearchParams();
  
  // State
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [confirmedTime, setConfirmedTime] = useState<string>('');

  // Parse URL parameters on mount
  useEffect(() => {
    const email = searchParams.get('email');
    const rep = searchParams.get('rep');
    const calendarId = searchParams.get('calendarId');
    const location = searchParams.get('location');
    const phone = searchParams.get('phone');
    const projectType = searchParams.get('projectType');
    const scheduledBy = searchParams.get('scheduledBy');
    const zip = searchParams.get('zip');

    if (email && rep && calendarId) {
      setBookingData({
        email: email || '',
        rep: rep || '',
        calendarId: calendarId || '',
        location: location || '',
        phone: phone || '',
        projectType: projectType || '',
        scheduledBy: scheduledBy || '',
        zip: zip || ''
      });

      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [searchParams]);

  // Fetch availability when date changes
  useEffect(() => {
    if (selectedDate && bookingData?.calendarId) {
      fetchAvailability();
    }
  }, [selectedDate, bookingData?.calendarId]);

  const fetchAvailability = async () => {
    if (!bookingData) return;
    
    setLoading(true);
    setError(null);
    setAvailableSlots([]);
    setSelectedSlot(null);

    console.log('Fetching availability for:', bookingData.calendarId); // ADD THIS

    try {
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14); // Show 2 weeks of availability

      const params = new URLSearchParams({
        calendarId: bookingData.calendarId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      console.log('Request URL:', `${N8N_AVAILABILITY_URL}?${params}`);

      const response = await fetch(`${N8N_AVAILABILITY_URL}?${params}`);

      console.log('Response status:', response.status); // ADD THIS
      console.log('Response ok:', response.ok); // ADD THIS
      
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();

      console.log('Data received:', data); // ADD THIS
    console.log('Slots count:', data.slots?.length); // ADD THIS

      setAvailableSlots(data.slots || []);
    } catch (err) {
      console.error('Availability fetch error:', err); // ADD THIS
      setError('Unable to load available times. Please try again.');
      console.error('Availability fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !bookingData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(N8N_BOOKING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: bookingData.email,
          repName: bookingData.rep,
          calendarId: bookingData.calendarId,
          slotStart: selectedSlot.start,
          slotEnd: selectedSlot.end,
          location: bookingData.location,
          phone: bookingData.phone,
          projectType: bookingData.projectType,
          scheduledBy: bookingData.scheduledBy
        })
      });

      if (!response.ok) {
        throw new Error('Failed to book appointment');
      }

      setConfirmedTime(selectedSlot.display);
      setBookingComplete(true);
    } catch (err) {
      setError('Unable to complete booking. Please try again or call (908) 290-5611.');
      console.error('Booking error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group slots by date for better display
  const groupedSlots = availableSlots.reduce((acc, slot) => {
    const date = new Date(slot.start).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York'
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  // Error state - missing parameters
  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Booking Link</h1>
          <p className="text-gray-600 mb-4">
            This booking link is missing required information. Please contact us directly.
          </p>
          <a 
            href="tel:9082905611" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Call (908) 290-5611
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Confirmed!</h1>
          <p className="text-gray-600 mb-4">
            Your appointment with <strong>{bookingData.rep}</strong> has been scheduled for:
          </p>
          <p className="text-lg font-semibold text-blue-600 mb-6">{confirmedTime}</p>
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1"><strong>Location:</strong> {bookingData.location}</p>
            <p className="text-sm text-gray-600"><strong>Phone:</strong> {bookingData.phone}</p>
          </div>
          <p className="text-sm text-gray-500">
            If you need to reschedule, please call us at (908) 290-5611.
          </p>
        </div>
      </div>
    );
  }

  // Main booking interface
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Garden State Brickface & Siding</h1>
            <p className="text-gray-600 mt-1">Schedule Your Appointment</p>
          </div>
          
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Sales Representative</p>
              <p className="font-semibold text-gray-900">{bookingData.rep}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Project Type</p>
              <p className="font-semibold text-gray-900">{bookingData.projectType}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Project Location</p>
              <p className="font-semibold text-gray-900">{bookingData.location}</p>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select a Starting Date</h2>
          <p className="text-sm text-gray-600 mb-3">We&apos;ll show available times for the next 2 weeks from this date.</p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Available Time Slots */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Times</h2>
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-2">Loading available times...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && availableSlots.length === 0 && (
            <p className="text-gray-600 text-center py-4">
              No available times found. Please select a different date.
            </p>
          )}

          {!loading && Object.keys(groupedSlots).length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedSlots).map(([date, slots]) => (
                <div key={date}>
                  <h3 className="font-medium text-gray-700 mb-3 pb-2 border-b">{date}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map((slot, index) => {
                      const timeDisplay = new Date(slot.start).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/New_York'
                      });
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            selectedSlot?.start === slot.start
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          {timeDisplay}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Button */}
        {selectedSlot && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <p className="text-gray-700 mb-4">
                Selected time: <strong className="text-blue-600">{selectedSlot.display}</strong>
              </p>
              <button
                onClick={handleBooking}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          <p>Questions? Call us at <a href="tel:9082905611" className="text-blue-600 hover:underline">(908) 290-5611</a></p>
        </div>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}