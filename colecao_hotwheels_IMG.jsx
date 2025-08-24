import { useState } from "react";

// Lista de anos de 2025 até 1995
const years = Array.from({ length: 2025 - 1995 + 1 }, (_, i) => 2025 - i);

// Estrutura de dados das miniaturas
const miniaturesByYear = {
  2025: [
    { id: 1, name: "87 Audi Quattro", image: "2025\01s.jpg" },
    { id: 2, name: "Hiroata Merc", image: "2025\02s.jpg" },
    { id: 3, name: "Hi-Roller II", image: "2025\03s.jpg" },
    { id: 4, name: "75 Datsun Sunny Truck", image: "2025\04s.jpg" },
    { id: 5, name: "Aston Martin DB4GT", image: "2025\05s.jpg" },
    { id: 6, name: "20 Jeep Gladiator", image: "2025\06s.jpg" },
    { id: 7, name: "Porsche 911 Rallye", image: "2025\07s.jpg" },
    { id: 8, name: "71 Ford Mustang Funny Car", image: "2025\08s.jpg" },
    { id: 9, name: "62 Corvette Gasser", image: "2025\09s.jpg" },
    { id: 10, name: "MacLaren Speedtail", image: "2025\10s.jpg" },
    { id: 11, name: "Bugatti EB110", image: "2025\11s.jpg" },
    { id: 12, name: "73 Honda Civic Custom", image: "2025\12s.jpg" },
    { id: 13, name: "20 Dodge Charger Hellcat", image: "2025\13s.jpg" },
    { id: 14, name: "BMW M3 Wagon", image: "2025\14s.jpg" },
    { id: 15, name: "Ford RS200", image: "2025\15s.jpg" },
    
  ],
  2024: [
    { id: 1, name: "T-Hunt Muscle Car", image: "https://via.placeholder.com/150" },
  ],
  // ... você pode preencher até 1995
};

export default function App() {
  const [selectedYear, setSelectedYear] = useState(null);
  const [collection, setCollection] = useState(
    JSON.parse(localStorage.getItem("collection")) || {}
  );

  const toggleMiniature = (year, id) => {
    const updated = { ...collection };
    if (!updated[year]) updated[year] = {};
    updated[year][id] = !updated[year][id];
    setCollection(updated);
    localStorage.setItem("collection", JSON.stringify(updated));
  };

  if (!selectedYear) {
    // Tela inicial: lista de anos
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <h1 className="text-2xl font-bold text-center mb-6">
          Coleção HotWheels T-Hunt
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className="bg-white shadow rounded-xl p-6 text-xl font-semibold hover:bg-purple-100"
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Tela de miniaturas do ano selecionado
  const miniatures = miniaturesByYear[selectedYear] || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <button
        onClick={() => setSelectedYear(null)}
        className="mb-4 text-purple-600 font-semibold"
      >
        ← Voltar
      </button>
      <h2 className="text-xl font-bold mb-4">Coleção {selectedYear}</h2>

      {miniatures.length === 0 ? (
        <p className="text-gray-500">Nenhuma miniatura cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {miniatures.map((mini) => (
            <div
              key={mini.id}
              className="bg-white shadow rounded-xl p-3 flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-gray-200 rounded mb-2 flex items-center justify-center">
                {/* Espaço reservado para a imagem */}
                {mini.image ? (
                  <img
                    src={mini.image}
                    alt={mini.name}
                    className="object-cover w-full h-full rounded"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">Foto</span>
                )}
              </div>
              <p className="text-sm font-medium text-center mb-2">
                {mini.name || "Nome"}
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={collection[selectedYear]?.[mini.id] || false}
                  onChange={() => toggleMiniature(selectedYear, mini.id)}
                />
                Tenho
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
