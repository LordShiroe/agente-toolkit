import fetch from 'node-fetch';
import { Agent, Tool } from '../agent';
import { ModelAdapter } from '../adapters/base';
import { Type } from '@sinclair/typebox';

export class WeatherAgent extends Agent {
  constructor() {
    super();
    this.setupWeatherTools();
    this.setPrompt(
      `You are a helpful weather assistant. When users ask about weather, use the available tools to get current weather information for locations. Always be helpful and provide clear weather reports.`
    );
  }

  private setupWeatherTools() {
    // Tool to geocode a location name to coordinates
    const geocodeTool: Tool = {
      name: 'geocode_location',
      description: 'Convert a location name to latitude and longitude coordinates',
      paramsSchema: Type.Object({
        location: Type.String({ description: 'The location name to geocode' }),
      }),
      action: async (params: { location: string }) => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            params.location
          )}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'agente-toolkitWeatherAgent/1.0',
            },
          });
          if (!response.ok) {
            return 'Failed to geocode location';
          }
          const data = await response.json();
          if (data.length === 0) {
            return `Could not find coordinates for location: ${params.location}`;
          }
          const result = {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            display_name: data[0].display_name,
          };
          return JSON.stringify(result);
        } catch (error) {
          return `Error geocoding location: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    };

    // Tool to get weather data for specific coordinates
    const getWeatherTool: Tool = {
      name: 'get_weather',
      description: 'Get current weather data for latitude and longitude coordinates',
      paramsSchema: Type.Object({
        latitude: Type.Number({ description: 'Latitude coordinate' }),
        longitude: Type.Number({ description: 'Longitude coordinate' }),
      }),
      action: async (params: { latitude: number; longitude: number }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${params.latitude}&longitude=${params.longitude}&current_weather=true`;
          const response = await fetch(url);
          if (!response.ok) {
            return 'Failed to fetch weather data';
          }
          const data = await response.json();
          const weather = data.current_weather;
          if (!weather) {
            return 'No weather data available';
          }
          return JSON.stringify({
            temperature: weather.temperature,
            windspeed: weather.windspeed,
            weathercode: weather.weathercode,
            time: weather.time,
          });
        } catch (error) {
          return `Error fetching weather: ${
            error instanceof Error ? error.message : String(error)
          }`;
        }
      },
    };

    this.addTool(geocodeTool);
    this.addTool(getWeatherTool);
  }
}
