import { Package } from "lucide-react";

export default function CategoryCard({ name, image, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-black/8 shadow-sm hover:shadow-lg hover:shadow-primary/8 hover:border-primary/20 transition-all duration-300 text-left cursor-pointer"
    >
      <div className="relative aspect-4/3 bg-secondary/20 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-br-[5rem]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={36} className="text-primary/20" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-heading text-primary text-base sm:text-lg">{name}</h3>
      </div>
    </button>
  );
}
