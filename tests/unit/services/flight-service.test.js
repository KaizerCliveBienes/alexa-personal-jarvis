import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getNearestAirportIATACode, getFlightOffers, formatFlightOffers } from '../../../services/flight-service.js';
import fetch from 'node-fetch';

describe('Flight Service', () => {
  beforeEach(() => {
    vi.mock('node-fetch');
  })
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getNearestAirportIATACode', () => {
    it('should return the nearest IATA code for a given location', async () => {
      const mockLocation = 'Berlin';
      const mockResponse = [
        { lat: '52.5200', lon: '13.4050' }
      ];

      fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.mockResolvedValueOnce(mockResponse)
      });

      const result = await getNearestAirportIATACode(mockLocation);
      expect(result).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(mockLocation)}&format=json`, {
        method: 'GET',
      });
    });

    it('should throw an error if no location is found', async () => {
      const mockLocation = 'Unknown City';
      fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.mockResolvedValueOnce([])
      });

      await expect(getNearestAirportIATACode(mockLocation)).rejects.toThrow("No nearest place retrieved: " + mockLocation);
    });
  });

  describe('getFlightOffers', () => {
    it('should fetch flight offers and return the response', async () => {
      const mockOrigin = 'Berlin';
      const mockDestination = 'Munich';
      const mockDepartureDate = '2025-05-20';
      const mockReturnDate = '2025-05-27';
      const mockSerpApiKey = 'test_api_key';
      const mockFlightResponse = { best_flights: [], other_flights: [] };

      // Mocking the getJson function
      vi.mock('serpapi', () => ({
        getJson: vi.fn().mockResolvedValue({ best_flights: [], other_flights: [] }),
      }));

      const result = await getFlightOffers({
        origin: mockOrigin,
        destination: mockDestination,
        departureDate: mockDepartureDate,
        returnDate: mockReturnDate,
        serpApiKey: mockSerpApiKey,
        test: false,
      });

      expect(result).toEqual(mockFlightResponse);
    });
  });

  describe('formatFlightOffers', () => {
    it('should format flight offers correctly', () => {
      const mockFlightData = {
        best_flights: [
          {
            total_duration: '2h 30m',
            price: 100,
            layovers: [],
            flights: [
              {
                departure_airport: { name: 'Berlin Airport', time: '2025-05-20T10:00:00Z' },
                arrival_airport: { name: 'Munich Airport', time: '2025-05-20T12:30:00Z' },
                duration: '2h 30m',
                airline: 'Airline A',
                travel_class: 'Economy',
                often_delayed_by_over_30_mins: false,
              }
            ],
          }
        ],
      };

      const formattedOffers = formatFlightOffers(mockFlightData);
      expect(formattedOffers).toHaveLength(1);
      expect(formattedOffers[0].totalDuration).toBe('2h 30m');
      expect(formattedOffers[0].price).toBe(100);
    });

    it('should return an empty string if no flights are available', () => {
      const mockFlightData = {};
      const result = formatFlightOffers(mockFlightData);
      expect(result).toBe('');
    });
  });
});

