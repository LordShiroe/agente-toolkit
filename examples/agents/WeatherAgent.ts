import fetch from 'node-fetch';
import { Agent } from '../../src/core/agent/Agent';
import { Tool } from '../../src/core/tools/types/Tool';
import { MemoryManager } from '../../src/core/memory/memory';
import { Type } from '@sinclair/typebox';
import { AgentRegistration } from '../../src/core/agent/types/AgentMetadata';

export class WeatherAgent extends Agent {
  static readonly metadata: AgentRegistration = {
    metadata: {
      id: 'weather',
      name: 'Weather Agent',
      description: 'Provides current weather information for any location worldwide',
      categories: ['weather', 'location', 'environment'],
      keywords: [
        'weather',
        'temperature',
        'forecast',
        'climate',
        'rain',
        'sunny',
        'cloudy',
        'wind',
      ],
      priority: 5,
      enabled: true,
    },
    capabilities: {
      taskTypes: ['weather queries', 'location-based weather', 'current conditions'],
      examples: [
        'What is the weather in New York?',
        'How is the weather in London today?',
        'Tell me the current temperature in Tokyo',
        'Is it raining in Paris right now?',
      ],
      limitations: [
        'Only provides current weather',
        'Cannot provide extended forecasts',
        'Requires internet connection',
      ],
    },
  };

  constructor(memoryManager?: MemoryManager) {
    super(memoryManager);
    this.setupWeatherTools();
    this.setPrompt(
      `You are a helpful weather assistant. When users ask about weather, use the available tools to get current weather information for locations. Always be helpful and provide clear weather reports.`
    );
  }

  getMetadata(): AgentRegistration {
    return WeatherAgent.metadata;
  }

  private setupWeatherTools() {
    // Tool to geocode a location name to coordinates
    const geocodeSchema = Type.Object({
      location: Type.String({ description: 'The location name to geocode' }),
    });

    const geocodeTool: Tool<
      typeof geocodeSchema,
      {
        latitude: number;
        longitude: number;
        display_name: string;
      }
    > = {
      name: 'geocode_location',
      description: 'Convert a location name to latitude and longitude coordinates',
      paramsSchema: geocodeSchema,
      action: async params => {
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
            throw new Error('Failed to geocode location');
          }
          const data = await response.json();
          if (data.length === 0) {
            throw new Error(`Could not find coordinates for location: ${params.location}`);
          }

          return {
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
            display_name: String(data[0].display_name),
          };
        } catch (error) {
          throw new Error(
            `Error geocoding location: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    };

    // Tool to get weather data for specific coordinates
    const weatherSchema = Type.Object({
      latitude: Type.Number({ description: 'Latitude coordinate' }),
      longitude: Type.Number({ description: 'Longitude coordinate' }),
    });

    const getWeatherTool: Tool<
      typeof weatherSchema,
      {
        temperature: number;
        windspeed: number;
        weathercode: number;
        time: string;
      }
    > = {
      name: 'get_weather',
      description: 'Get current weather data for latitude and longitude coordinates',
      paramsSchema: weatherSchema,
      action: async params => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${params.latitude}&longitude=${params.longitude}&current_weather=true`;
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to fetch weather data');
          }
          const data = await response.json();
          const weather = data.current_weather;
          if (!weather) {
            throw new Error('No weather data available');
          }
          return {
            temperature: weather.temperature,
            windspeed: weather.windspeed,
            weathercode: weather.weathercode,
            time: weather.time,
          };
        } catch (error) {
          throw new Error(
            `Error fetching weather: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      },
    };

    this.addTool(geocodeTool);
    this.addTool(getWeatherTool);
  }
}
