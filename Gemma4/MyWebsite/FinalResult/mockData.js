const products = [
  {
    id: 1,
    name: "Pro-Series Off-Road Bike",
    price: 2499.99,
    description: "A high-performance off-road bike designed for the most demanding terrains. Features include a powerful 250cc engine, advanced suspension, and durable frame.",
    category: "Dirt Bikes",
    image: "https://images.unsplash.com/photo-1558981806-36a69756f1e4?q=80&w=1000&auto=format&fit=crop",
    rating: 4.8,
    reviews: 124
  },
  {
    id: 2,
    name: "Electric Urban Cruiser",
    price: 1899.00,
    description: "Perfect for city commuting. This sleek electric bike offers a smooth ride with a 60-mile range on a single charge. Features a 750W motor and integrated lights.",
    category: "E-Bikes",
    image: "https://images.unsplash.com/photo-1591366091473-611947300372?q=80&w=1000&auto=format&fit=crop",
    rating: 4.7,
    reviews: 89
  },
  {
    id: 3,
    name: "Mountain Trail Beast",
    price: 3200.50,
    description: "Built for the toughest mountain trails. Features a full-suspension system, hydraulic disc brakes, and a lightweight aluminum frame.",
    category: "Mountain Bikes",
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d09e?q=80&w=1000&auto=format&fit=crop",
    rating: 4.9,
    reviews: 210
  },
  {
    id: 4,
    name: "Sport Street Bike",
    price: 5500.00,
    description: "Experience ultimate speed and agility on the open road. Aerodynamic design, premium components, and high-performance brakes.",
    category: "Street Bikes",
    image: "https://images.unsplash.com/photo-1568736035538-e31bce8e424b?q=80&w=1000&auto=format&fit=crop",
    rating: 4.6,
    reviews: 45
  },
  {
    id: 5,
    name: "Adventure Touring Bike",
    price: 4200.00,
    description: "Ready for any journey. Long-range fuel tank, comfortable seating for long rides, and heavy-duty luggage racks.",
    category: "Touring Bikes",
    image: "https://images.unsplash.com/photo-1591365331346-1e26712c9855?q=80&w=1000&auto=format&fit=crop",
    rating: 4.5,
    reviews: 67
  },
  {
    id: 6,
    name: "Compact Commuter",
    price: 950.00,
    description: "Simple, reliable, and easy to park. The ideal companion for your daily commute.",
    category: "E-Bikes",
    image: "https://images.unsplash.com/photo-1532298229694-c22a4634a2e0?q=80&w=1000&auto=format&fit=crop",
    rating: 4.3,
    reviews: 32
  }
];

export const getProducts = () => products;
export const getProductById = (id) => products.find(p => p.id === parseInt(id));
export const searchProducts = (query) => {
  if (!query) return products;
  const lowerQuery = query.toLowerCase();
  return products.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) || 
    p.description.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery)
  );
};
