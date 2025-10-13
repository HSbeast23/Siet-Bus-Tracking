export const DEFAULT_ROUTE_STOPS = [
  {
    id: 'stop-1',
    name: 'SIET College',
    latitude: 11.04104,
    longitude: 77.07738,
  },
//   {
//     id: 'stop-2',
//     name: 'Chinniyapalayam Cut',
//     latitude: 11.04104,
//     longitude: 77.07738,
//   },
  {
    id: 'stop-3',
    name: 'Chinniyapalayam',
    latitude: 11.055282,
    longitude: 77.065562,
  },
  {
    id: 'stop-4',
    name: '100 Feet',
    latitude: 11.024294,
    longitude: 76.959071,
  },
  {
    id: 'stop-5',
    name: 'Sivanantha Colony',
    latitude: 11.027139,
    longitude: 76.955725,
  },
  {
    id: 'stop-6',
    name: 'Pudhu Palam',
    latitude: 11.028487,
    longitude: 76.951412,
  },
  {
    id: 'stop-7',
    name: 'Saibaba Kovil',
    latitude: 11.036803,
    longitude: 76.950619,
  },
  {
    id: 'stop-8',
    name: 'Housing Unit',
    latitude: 11.038853,
    longitude: 76.949797,
  },
  {
    id: 'stop-9',
    name: 'Kavundampalayam',
    latitude: 11.044814,
    longitude: 76.947645,
  },
  {
    id: 'stop-10',
    name: 'Cheran Nagar',
    latitude: 11.051129,
    longitude: 76.946465,
  },
  {
    id: 'stop-11',
    name: 'GN Mills',
    latitude: 11.059732,
    longitude: 76.944896,
  },
  {
    id: 'stop-12',
    name: 'Food Testing Lab SIET',
    latitude: 11.065699,
    longitude: 76.942956,
  },
];

export const OSRM_ROUTE_COORDINATES = DEFAULT_ROUTE_STOPS.map((stop) => [
  stop.longitude,
  stop.latitude,
]);

export const ROUTE_POLYLINE_FIT_COORDINATES = DEFAULT_ROUTE_STOPS.map((stop) => ({
  latitude: stop.latitude,
  longitude: stop.longitude,
}));
